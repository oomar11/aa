import { neon } from "@neondatabase/serverless";
import {
  SHARED_STORAGE_KEYS,
  type SharedStorageKey,
} from "@/lib/storage/keys";

export type PostgresKvSnapshot = {
  revision: number;
  updatedAt: string;
  data: Record<SharedStorageKey, string | null>;
  hasData: boolean;
};

type SqlClient = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
};

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

async function ensureSchema(sql: SqlClient) {
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

function client(databaseUrl: string): SqlClient {
  return neon(databaseUrl) as unknown as SqlClient;
}

/** قراءة لقطة الورشة من Postgres (Supabase) */
export async function readPostgresKv(
  databaseUrl: string
): Promise<PostgresKvSnapshot> {
  const sql = client(databaseUrl);
  await ensureSchema(sql);

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

  const data = normalizeData(raw);
  const meta = metaRows[0];
  return {
    revision: Number(meta?.revision ?? 0) || 0,
    updatedAt: meta?.updated_at
      ? new Date(meta.updated_at).toISOString()
      : new Date(0).toISOString(),
    data,
    hasData: hasAnySharedData(data),
  };
}

/** دمج تحديثات مفاتيح */
export async function patchPostgresKv(
  databaseUrl: string,
  patch: Record<string, string | null>
): Promise<PostgresKvSnapshot> {
  const sql = client(databaseUrl);
  await ensureSchema(sql);

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

  return readPostgresKv(databaseUrl);
}

/** استبدال كامل */
export async function replacePostgresKv(
  databaseUrl: string,
  data: Record<string, string | null>
): Promise<PostgresKvSnapshot> {
  const normalized = normalizeData(data);
  const patch: Record<string, string | null> = {};
  for (const key of SHARED_STORAGE_KEYS) {
    patch[key] = normalized[key];
  }
  return patchPostgresKv(databaseUrl, patch);
}

/** اختبار سريع للاتصال */
export async function testPostgresKv(databaseUrl: string): Promise<{
  ok: boolean;
  error?: string;
  revision?: number;
}> {
  try {
    const snapshot = await readPostgresKv(databaseUrl);
    return { ok: true, revision: snapshot.revision };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر الاتصال بقاعدة Postgres";
    return { ok: false, error: message };
  }
}
