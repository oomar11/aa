import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";
import {
  SHARED_STORAGE_KEYS,
  type SharedStorageKey,
} from "@/lib/storage/keys";

export type WorkshopStoreSnapshot = {
  revision: number;
  updatedAt: string;
  data: Record<SharedStorageKey, string | null>;
  backend: "postgres" | "file";
  /** false على Vercel بدون DATABASE_URL — التخزين مؤقت وغير مشترك بين السيرفرات */
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

function resolveStorePaths() {
  // على Vercel نظام الملفات للقراءة فقط ما عدا /tmp
  if (isVercelRuntime() && !getDatabaseUrl()) {
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

function getDatabaseUrl(): string | undefined {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL;
  return url?.trim() || undefined;
}

type SqlClient = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
};

async function ensurePostgresSchema(sql: SqlClient) {
  await sql`
    CREATE TABLE IF NOT EXISTS workshop_kv (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS workshop_meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      revision BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    INSERT INTO workshop_meta (id, revision, updated_at)
    VALUES (1, 0, NOW())
    ON CONFLICT (id) DO NOTHING
  `;
}

async function readPostgresStore(): Promise<WorkshopStoreSnapshot> {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL missing");
  }
  const sql = neon(databaseUrl) as unknown as SqlClient;
  await ensurePostgresSchema(sql);

  const metaRows = (await sql`
    SELECT revision, updated_at FROM workshop_meta WHERE id = 1
  `) as Array<{ revision: string | number; updated_at: string | Date }>;

  const kvRows = (await sql`
    SELECT key, value FROM workshop_kv
  `) as Array<{ key: string; value: string | null }>;

  const raw: Record<string, string | null> = {};
  for (const row of kvRows) {
    raw[row.key] = row.value;
  }

  const meta = metaRows[0];
  return {
    revision: Number(meta?.revision ?? 0) || 0,
    updatedAt: meta?.updated_at
      ? new Date(meta.updated_at).toISOString()
      : new Date(0).toISOString(),
    data: normalizeData(raw),
    backend: "postgres",
    durable: true,
  };
}

async function writePostgresStore(
  patch: Record<string, string | null>
): Promise<WorkshopStoreSnapshot> {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL missing");
  }
  const sql = neon(databaseUrl) as unknown as SqlClient;
  await ensurePostgresSchema(sql);

  for (const [key, value] of Object.entries(patch)) {
    if (!(SHARED_STORAGE_KEYS as readonly string[]).includes(key)) continue;
    if (value === null) {
      await sql`DELETE FROM workshop_kv WHERE key = ${key}`;
    } else {
      await sql`
        INSERT INTO workshop_kv (key, value, updated_at)
        VALUES (${key}, ${value}, NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value, updated_at = NOW()
      `;
    }
  }

  await sql`
    UPDATE workshop_meta
    SET revision = revision + 1, updated_at = NOW()
    WHERE id = 1
  `;

  return readPostgresStore();
}

/**
 * قراءة لقطة بيانات الورشة المشتركة.
 * يستخدم Postgres عند توفر DATABASE_URL، وإلا ملف data/workshop-kv.json.
 */
export async function readWorkshopStore(): Promise<WorkshopStoreSnapshot> {
  if (getDatabaseUrl()) {
    return readPostgresStore();
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

/**
 * دمج تحديثات مفاتيح في مخزن الورشة (last-write-wins لكل مفتاح).
 */
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

  if (getDatabaseUrl()) {
    return writePostgresStore(filtered);
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
  return getDatabaseUrl() ? "postgres" : "file";
}

export function isWorkshopStoreDurable(): boolean {
  return Boolean(getDatabaseUrl()) || !isVercelRuntime();
}
