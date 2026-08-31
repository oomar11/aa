import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import {
  SHARED_STORAGE_KEYS,
  type SharedStorageKey,
} from "@/lib/storage/keys";
import {
  patchPostgresKv,
  readPostgresKv,
} from "@/lib/storage/postgres-kv";
import {
  getSupabaseConfig,
  getSupabaseEnvPresence,
  hasSupabaseConfig,
} from "@/lib/storage/supabase-config";
import {
  patchSupabaseKv,
  readSupabaseKv,
} from "@/lib/storage/supabase-kv";

export type WorkshopStoreSnapshot = {
  revision: number;
  updatedAt: string;
  data: Record<SharedStorageKey, string | null>;
  backend: "postgres" | "file";
  /** false على Vercel بدون قاعدة — التخزين مؤقت وغير مشترك بين السيرفرات */
  durable: boolean;
};

type StoreFile = {
  revision: number;
  updatedAt: string;
  data: Record<string, string | null>;
};

function isVercelRuntime() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

/** أسماء شائعة لرابط Postgres (Supabase / Vercel) */
const DATABASE_URL_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
] as const;

function getDatabaseUrl(): string | undefined {
  for (const key of DATABASE_URL_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

/** أي متغيرات قاعدة موجودة؟ (بدون كشف القيمة) */
export function getDatabaseEnvPresence(): Record<string, boolean> {
  const presence: Record<string, boolean> = {};
  for (const key of DATABASE_URL_ENV_KEYS) {
    presence[key] = Boolean(process.env[key]?.trim());
  }
  return { ...presence, ...getSupabaseEnvPresence() };
}

function usesRemoteStore(): boolean {
  return hasSupabaseConfig() || Boolean(getDatabaseUrl());
}

function resolveStorePaths() {
  if (isVercelRuntime() && !usesRemoteStore()) {
    const dir = path.join("/tmp", "upvc-workshop");
    return {
      dir,
      file: path.join(dir, "workshop-kv.json"),
    };
  }
  const dir = path.join(process.cwd(), "data");
  return {
    dir,
    file: path.join(dir, "workshop-kv.json"),
  };
}

function emptyData(): Record<SharedStorageKey, string | null> {
  const data = {} as Record<SharedStorageKey, string | null>;
  for (const key of SHARED_STORAGE_KEYS) {
    data[key] = null;
  }
  return data;
}

function normalizeData(
  input: Record<string, string | null> | null | undefined
): Record<SharedStorageKey, string | null> {
  const data = emptyData();
  if (!input) return data;
  for (const key of SHARED_STORAGE_KEYS) {
    if (key in input) {
      const value = input[key];
      data[key] = value === undefined ? null : value;
    }
  }
  return data;
}

function hasAnySharedData(
  data: Record<SharedStorageKey, string | null>
): boolean {
  return SHARED_STORAGE_KEYS.some((key) => {
    const value = data[key];
    return typeof value === "string" && value.length > 0;
  });
}

function readFileStore(): StoreFile {
  const { file } = resolveStorePaths();
  if (!existsSync(file)) {
    return {
      revision: 0,
      updatedAt: new Date(0).toISOString(),
      data: emptyData(),
    };
  }
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as StoreFile;
    return {
      revision: Number(parsed.revision) || 0,
      updatedAt: parsed.updatedAt || new Date(0).toISOString(),
      data: normalizeData(parsed.data),
    };
  } catch {
    return {
      revision: 0,
      updatedAt: new Date(0).toISOString(),
      data: emptyData(),
    };
  }
}

function writeFileStore(store: StoreFile) {
  const { dir, file } = resolveStorePaths();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(
    file,
    JSON.stringify(
      {
        revision: store.revision,
        updatedAt: store.updatedAt,
        data: normalizeData(store.data),
      },
      null,
      2
    ),
    "utf8"
  );
}

async function readRemoteStore(): Promise<WorkshopStoreSnapshot> {
  if (hasSupabaseConfig()) {
    try {
      const snapshot = await readSupabaseKv(getSupabaseConfig()!);
      return {
        revision: snapshot.revision,
        updatedAt: snapshot.updatedAt,
        data: snapshot.data,
        backend: "postgres",
        durable: true,
      };
    } catch (err) {
      console.error("[workshop-store] Supabase read failed", err);
      if (!getDatabaseUrl()) throw err;
    }
  }

  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("Remote store unavailable");
  }
  const snapshot = await readPostgresKv(databaseUrl);
  return {
    revision: snapshot.revision,
    updatedAt: snapshot.updatedAt,
    data: snapshot.data,
    backend: "postgres",
    durable: true,
  };
}

async function writeRemoteStore(
  patch: Record<string, string | null>
): Promise<WorkshopStoreSnapshot> {
  if (hasSupabaseConfig()) {
    try {
      const snapshot = await patchSupabaseKv(patch, getSupabaseConfig()!);
      return {
        revision: snapshot.revision,
        updatedAt: snapshot.updatedAt,
        data: snapshot.data,
        backend: "postgres",
        durable: true,
      };
    } catch (err) {
      console.error("[workshop-store] Supabase write failed", err);
      if (!getDatabaseUrl()) throw err;
    }
  }

  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("Remote store unavailable");
  }
  const snapshot = await patchPostgresKv(databaseUrl, patch);
  return {
    revision: snapshot.revision,
    updatedAt: snapshot.updatedAt,
    data: snapshot.data,
    backend: "postgres",
    durable: true,
  };
}

/** قراءة لقطة بيانات الورشة المشتركة */
export async function readWorkshopStore(): Promise<WorkshopStoreSnapshot> {
  if (usesRemoteStore()) {
    return readRemoteStore();
  }
  const file = readFileStore();
  return {
    revision: file.revision,
    updatedAt: file.updatedAt,
    data: normalizeData(file.data),
    backend: "file",
    durable: !isVercelRuntime(),
  };
}

/** دمج تحديثات مفاتيح في مخزن الورشة */
export async function patchWorkshopStore(
  patch: Record<string, string | null>
): Promise<WorkshopStoreSnapshot> {
  const filtered: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (!(SHARED_STORAGE_KEYS as readonly string[]).includes(key)) continue;
    filtered[key] = value === undefined ? null : value;
  }
  if (Object.keys(filtered).length === 0) {
    return readWorkshopStore();
  }

  if (usesRemoteStore()) {
    return writeRemoteStore(filtered);
  }

  const current = readFileStore();
  const nextData = { ...normalizeData(current.data) };
  for (const [key, value] of Object.entries(filtered)) {
    nextData[key as SharedStorageKey] = value;
  }
  const next: StoreFile = {
    revision: current.revision + 1,
    updatedAt: new Date().toISOString(),
    data: nextData,
  };
  writeFileStore(next);
  return {
    revision: next.revision,
    updatedAt: next.updatedAt,
    data: normalizeData(next.data),
    backend: "file",
    durable: !isVercelRuntime(),
  };
}

/** استبدال كامل لبيانات الورشة المشتركة */
export async function replaceWorkshopStore(
  data: Record<string, string | null>
): Promise<WorkshopStoreSnapshot> {
  const normalized = normalizeData(data);
  const patch: Record<string, string | null> = {};
  for (const key of SHARED_STORAGE_KEYS) {
    patch[key] = normalized[key];
  }
  return patchWorkshopStore(patch);
}

export function workshopStoreHasData(
  snapshot: WorkshopStoreSnapshot
): boolean {
  return hasAnySharedData(snapshot.data);
}

export function getWorkshopStoreBackend(): "postgres" | "file" {
  return usesRemoteStore() ? "postgres" : "file";
}

export function isWorkshopStoreDurable(): boolean {
  return usesRemoteStore() || !isVercelRuntime();
}
