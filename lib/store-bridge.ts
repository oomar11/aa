import { STORAGE_KEYS } from "@/lib/storage/keys";
import { sharedGetItem, sharedSetItem } from "@/lib/storage/shared-client";
import type { StoreBridgeMeta } from "@/lib/accounting";

/**
 * ربط خزنة المتجر (store-system) — مصدر الحقيقة للنقد.
 * الدفعات = إيداع · المصروفات = سحب.
 */

export const STORE_BRIDGE_STORAGE_KEY = STORAGE_KEYS.storeBridge;

export type StoreBridgeConfig = {
  /** مثال: https://store-system-rho.vercel.app */
  baseUrl: string;
  /** نفس WORKSHOP_BRIDGE_SECRET على المتجر */
  secret: string;
  /** خزنة افتراضية للدفعات/المصروفات */
  safeId: string;
  safeName?: string;
  enabled: boolean;
  updatedAt: string;
};

export type StoreSafeRow = {
  id: string;
  name: string;
  balance: number;
  is_active?: boolean;
};

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

export function loadStoreBridgeConfig(): StoreBridgeConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sharedGetItem(STORE_BRIDGE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoreBridgeConfig>;
    if (!parsed.baseUrl || !parsed.secret) return null;
    return {
      baseUrl: normalizeBaseUrl(String(parsed.baseUrl)),
      secret: String(parsed.secret),
      safeId: String(parsed.safeId || ""),
      safeName: parsed.safeName ? String(parsed.safeName) : undefined,
      enabled: parsed.enabled !== false,
      updatedAt: String(parsed.updatedAt || new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

export function saveStoreBridgeConfig(config: StoreBridgeConfig) {
  if (typeof window === "undefined") return;
  const next: StoreBridgeConfig = {
    ...config,
    baseUrl: normalizeBaseUrl(config.baseUrl),
    secret: config.secret.trim(),
    safeId: config.safeId.trim(),
    enabled: config.enabled !== false,
    updatedAt: new Date().toISOString(),
  };
  sharedSetItem(STORE_BRIDGE_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("upvc-store-bridge-updated"));
}

export function clearStoreBridgeConfig() {
  if (typeof window === "undefined") return;
  sharedSetItem(STORE_BRIDGE_STORAGE_KEY, "");
  try {
    localStorage.removeItem(STORE_BRIDGE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("upvc-store-bridge-updated"));
}

export function isStoreBridgeActive(
  config: StoreBridgeConfig | null = loadStoreBridgeConfig()
): boolean {
  return Boolean(
    config?.enabled && config.baseUrl && config.secret && config.safeId
  );
}

async function bridgeFetch(
  config: StoreBridgeConfig,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const url = `${normalizeBaseUrl(config.baseUrl)}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.secret}`,
      "x-workshop-bridge-secret": config.secret,
      ...(init?.headers || {}),
    },
  });
}

export async function fetchStoreSafes(
  config: Pick<StoreBridgeConfig, "baseUrl" | "secret">
): Promise<StoreSafeRow[]> {
  const res = await bridgeFetch(config as StoreBridgeConfig, "/api/workshop/safes");
  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    safes?: StoreSafeRow[];
  };
  if (!res.ok) {
    throw new Error(json.error || `فشل تحميل الخزن (${res.status})`);
  }
  return json.safes || [];
}

export type StoreSyncResult = {
  ok: true;
  reference_id: string;
  applied: number;
  safe_id: string;
  balance: number | null;
};

export type StoreMoneySyncInput = {
  kind: "payment" | "expense";
  externalKey: string;
  amount: number;
  description: string;
  notes?: string;
  occurredAt?: string;
  /** override default safe */
  safeId?: string;
};

/** amount 0 = حذف/إلغاء التأثير على الخزنة */
export async function syncMoneyToStore(
  input: StoreMoneySyncInput,
  config: StoreBridgeConfig | null = loadStoreBridgeConfig()
): Promise<StoreSyncResult> {
  if (!config?.enabled || !config.baseUrl || !config.secret) {
    throw new Error("ربط خزنة المتجر غير مفعّل");
  }
  const safeId = (input.safeId || config.safeId || "").trim();
  const amount = Number(input.amount) || 0;
  if (amount > 0 && !safeId) {
    throw new Error("اختر خزنة المتجر من الإعدادات");
  }

  const reference_type =
    input.kind === "payment" ? "workshop_payment" : "workshop_expense";
  const type = input.kind === "payment" ? "deposit" : "withdrawal";

  const res = await bridgeFetch(config, "/api/workshop/safe-movement", {
    method: "POST",
    body: JSON.stringify({
      external_key: input.externalKey,
      reference_type,
      type,
      amount,
      safe_id: safeId,
      description: input.description,
      notes: input.notes || `workshop:${input.externalKey}`,
      occurred_at: input.occurredAt || null,
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    reference_id?: string;
    applied?: number;
    safe_id?: string;
    balance?: number | null;
  };

  if (!res.ok || !json.ok) {
    throw new Error(json.error || `فشل مزامنة الخزنة (${res.status})`);
  }

  return {
    ok: true,
    reference_id: String(json.reference_id || ""),
    applied: Number(json.applied) || 0,
    safe_id: String(json.safe_id || safeId),
    balance: typeof json.balance === "number" ? json.balance : null,
  };
}

export type { StoreBridgeMeta };

export function withStoreBridgeMeta(
  amount: number,
  safeId: string,
  referenceId?: string
): StoreBridgeMeta {
  return {
    safeId,
    syncedAmount: amount,
    syncedAt: new Date().toISOString(),
    referenceId,
  };
}
