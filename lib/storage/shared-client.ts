/**
 * طبقة تخزين العميل للبيانات المشتركة.
 * تقرأ/تكتب بشكل متزامن (متوافق مع الـ libs الحالية) وتدفع للسيرفر في الخلفية.
 */

import {
  SHARED_KEY_EVENTS,
  SHARED_STORAGE_KEYS,
  isSharedStorageKey,
  type SharedStorageKey,
} from "@/lib/storage/keys";

export const WORKSHOP_SYNC_EVENT = "upvc-workshop-sync";

export type WorkshopSyncStatus = {
  ready: boolean;
  syncing: boolean;
  backend: "postgres" | "file" | "unknown";
  revision: number;
  updatedAt: string | null;
  hasData: boolean;
  error: string | null;
  lastPulledAt: string | null;
};

type StoreResponse = {
  ok: boolean;
  revision?: number;
  updatedAt?: string;
  backend?: "postgres" | "file";
  hasData?: boolean;
  data?: Record<string, string | null>;
  error?: string;
};

const memory = new Map<string, string | null>();
const pending = new Map<string, string | null>();

let revision = 0;
let backend: WorkshopSyncStatus["backend"] = "unknown";
let updatedAt: string | null = null;
let hasData = false;
let ready = false;
let syncing = false;
let error: string | null = null;
let lastPulledAt: string | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let bootPromise: Promise<void> | null = null;

function notifySyncStatus() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WORKSHOP_SYNC_EVENT));
}

function notifyKeyEvents(keys: Iterable<string>) {
  if (typeof window === "undefined") return;
  const events = new Set<string>();
  for (const key of keys) {
    if (!isSharedStorageKey(key)) continue;
    for (const eventName of SHARED_KEY_EVENTS[key]) {
      events.add(eventName);
    }
  }
  for (const eventName of events) {
    window.dispatchEvent(new Event(eventName));
  }
}

function applyToLocalStorage(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  if (value === null) localStorage.removeItem(key);
  else localStorage.setItem(key, value);
}

function collectLocalSharedData(): Record<string, string | null> {
  const data: Record<string, string | null> = {};
  if (typeof window === "undefined") return data;
  for (const key of SHARED_STORAGE_KEYS) {
    data[key] = localStorage.getItem(key);
  }
  return data;
}

function localHasSharedData(): boolean {
  if (typeof window === "undefined") return false;
  return SHARED_STORAGE_KEYS.some((key) => {
    const value = localStorage.getItem(key);
    return typeof value === "string" && value.length > 0;
  });
}

function hydrateFromSnapshot(
  snapshot: StoreResponse,
  options?: { silent?: boolean }
) {
  if (!snapshot.data) return;
  const changed: string[] = [];
  for (const key of SHARED_STORAGE_KEYS) {
    const next = key in snapshot.data ? snapshot.data[key] : null;
    const prev = memory.has(key)
      ? memory.get(key)
      : typeof window !== "undefined"
        ? localStorage.getItem(key)
        : null;
    memory.set(key, next ?? null);
    applyToLocalStorage(key, next ?? null);
    if (prev !== (next ?? null)) changed.push(key);
  }
  revision = Number(snapshot.revision ?? revision) || 0;
  updatedAt = snapshot.updatedAt ?? updatedAt;
  backend = snapshot.backend ?? backend;
  hasData = Boolean(snapshot.hasData);
  lastPulledAt = new Date().toISOString();
  ready = true;
  error = null;
  if (!options?.silent && changed.length > 0) {
    notifyKeyEvents(changed);
  }
  notifySyncStatus();
}

async function pushPending(): Promise<void> {
  if (pending.size === 0 || typeof window === "undefined") return;
  const data: Record<string, string | null> = {};
  for (const [key, value] of pending.entries()) {
    data[key] = value;
  }
  pending.clear();
  syncing = true;
  notifySyncStatus();
  try {
    const res = await fetch("/api/store", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
      cache: "no-store",
    });
    const json = (await res.json()) as StoreResponse;
    if (!res.ok || !json.ok) {
      // أعد الطابور عند الفشل
      for (const [key, value] of Object.entries(data)) {
        if (!pending.has(key)) pending.set(key, value);
      }
      error = json.error || "تعذر مزامنة الحفظ مع السيرفر";
      return;
    }
    hydrateFromSnapshot(json, { silent: true });
  } catch {
    for (const [key, value] of Object.entries(data)) {
      if (!pending.has(key)) pending.set(key, value);
    }
    error = "تعذر الاتصال بقاعدة بيانات الورشة";
  } finally {
    syncing = false;
    notifySyncStatus();
    if (pending.size > 0) scheduleFlush(400);
  }
}

function scheduleFlush(delayMs = 250) {
  if (typeof window === "undefined") return;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void pushPending();
  }, delayMs);
}

async function pullFromServer(options?: {
  migrateIfEmpty?: boolean;
}): Promise<void> {
  if (typeof window === "undefined") return;
  syncing = true;
  notifySyncStatus();
  try {
    const res = await fetch("/api/store", {
      method: "GET",
      headers: revision > 0 ? { "If-None-Match": String(revision) } : undefined,
      cache: "no-store",
    });

    if (res.status === 304) {
      lastPulledAt = new Date().toISOString();
      ready = true;
      error = null;
      return;
    }

    const json = (await res.json()) as StoreResponse;
    if (!res.ok || !json.ok) {
      error = json.error || "تعذر تحميل بيانات الورشة";
      ready = true;
      return;
    }

    const serverEmpty = !json.hasData;
    if (serverEmpty && options?.migrateIfEmpty && localHasSharedData()) {
      const localData = collectLocalSharedData();
      const putRes = await fetch("/api/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: localData }),
        cache: "no-store",
      });
      const putJson = (await putRes.json()) as StoreResponse;
      if (!putRes.ok || !putJson.ok) {
        error = putJson.error || "تعذر رفع بيانات الجهاز للورشة";
        ready = true;
        return;
      }
      hydrateFromSnapshot(putJson);
      return;
    }

    hydrateFromSnapshot(json);
  } catch {
    error = "تعذر الاتصال بقاعدة بيانات الورشة";
    ready = true;
  } finally {
    syncing = false;
    notifySyncStatus();
  }
}

/** تهيئة المزامنة مرة واحدة + polling */
export function startWorkshopSync(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  if (!bootPromise) {
    bootPromise = pullFromServer({ migrateIfEmpty: true });
  }

  if (!pollTimer) {
    pollTimer = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      if (pending.size > 0) return;
      void pullFromServer({ migrateIfEmpty: false });
    }, 8000);
  }

  const onVisible = () => {
    if (document.visibilityState === "visible") {
      void pullFromServer({ migrateIfEmpty: false });
    }
  };
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  };
}

export function getWorkshopSyncStatus(): WorkshopSyncStatus {
  return {
    ready,
    syncing,
    backend,
    revision,
    updatedAt,
    hasData,
    error,
    lastPulledAt,
  };
}

export function sharedGetItem(key: string): string | null {
  if (isSharedStorageKey(key) && memory.has(key)) {
    return memory.get(key) ?? null;
  }
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}

export function sharedSetItem(key: string, value: string) {
  if (typeof window === "undefined") return;
  if (isSharedStorageKey(key)) {
    memory.set(key, value);
    pending.set(key, value);
    applyToLocalStorage(key, value);
    scheduleFlush();
    return;
  }
  localStorage.setItem(key, value);
}

export function sharedRemoveItem(key: string) {
  if (typeof window === "undefined") return;
  if (isSharedStorageKey(key)) {
    memory.set(key, null);
    pending.set(key, null);
    applyToLocalStorage(key, null);
    scheduleFlush();
    return;
  }
  localStorage.removeItem(key);
}

/** رفع بيانات الجهاز الحالية كمصدر للورشة (استبدال كامل) */
export async function uploadLocalWorkshopData(): Promise<WorkshopSyncStatus> {
  if (typeof window === "undefined") return getWorkshopSyncStatus();
  syncing = true;
  notifySyncStatus();
  try {
    const data = collectLocalSharedData();
    const res = await fetch("/api/store", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
      cache: "no-store",
    });
    const json = (await res.json()) as StoreResponse;
    if (!res.ok || !json.ok) {
      error = json.error || "تعذر رفع البيانات";
      return getWorkshopSyncStatus();
    }
    hydrateFromSnapshot(json);
  } catch {
    error = "تعذر رفع البيانات";
  } finally {
    syncing = false;
    notifySyncStatus();
  }
  return getWorkshopSyncStatus();
}

/** سحب أحدث نسخة من السيرفر الآن */
export async function refreshWorkshopData(): Promise<WorkshopSyncStatus> {
  await pullFromServer({ migrateIfEmpty: false });
  return getWorkshopSyncStatus();
}

/** مسح المفاتيح التجارية على السيرفر + الجهاز */
export async function clearSharedBusinessKeys(
  keys: readonly string[]
): Promise<void> {
  if (typeof window === "undefined") return;
  const data: Record<string, string | null> = {};
  for (const key of keys) {
    if (!isSharedStorageKey(key)) continue;
    data[key] = null;
    memory.set(key, null);
    pending.delete(key);
    applyToLocalStorage(key, null);
  }
  if (Object.keys(data).length === 0) return;
  syncing = true;
  notifySyncStatus();
  try {
    const res = await fetch("/api/store", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
      cache: "no-store",
    });
    const json = (await res.json()) as StoreResponse;
    if (res.ok && json.ok) {
      hydrateFromSnapshot(json);
    } else {
      error = json.error || "تعذر مسح بيانات الورشة على السيرفر";
    }
  } catch {
    error = "تعذر مسح بيانات الورشة على السيرفر";
  } finally {
    syncing = false;
    notifySyncStatus();
  }
}

export function listSharedStorageKeys(): readonly SharedStorageKey[] {
  return SHARED_STORAGE_KEYS;
}
