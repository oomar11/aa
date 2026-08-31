import {
  SHARED_STORAGE_KEYS,
  type SharedStorageKey,
} from "@/lib/storage/keys";
import { getSupabaseConfig, type SupabaseConfig } from "@/lib/storage/supabase-config";

export type SupabaseKvSnapshot = {
  revision: number;
  updatedAt: string;
  data: Record<SharedStorageKey, string | null>;
  hasData: boolean;
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

function headers(config: SupabaseConfig, extra?: HeadersInit): HeadersInit {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${config.anonKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function supabaseFetch(
  config: SupabaseConfig,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: headers(config, init?.headers),
    cache: "no-store",
  });
  return res;
}

/** قراءة لقطة الورشة من Supabase REST */
export async function readSupabaseKv(
  config?: SupabaseConfig
): Promise<SupabaseKvSnapshot> {
  const cfg = config ?? getSupabaseConfig();
  if (!cfg) throw new Error("Supabase config missing");

  const metaRes = await supabaseFetch(cfg, "workshop_meta?id=eq.1&select=revision,updated_at");
  if (!metaRes.ok) {
    throw new Error(`Supabase meta read failed (${metaRes.status})`);
  }
  const metaRows = (await metaRes.json()) as Array<{
    revision: number | string;
    updated_at: string;
  }>;

  const kvRes = await supabaseFetch(cfg, "workshop_kv?select=key,value");
  if (!kvRes.ok) {
    throw new Error(`Supabase kv read failed (${kvRes.status})`);
  }
  const kvRows = (await kvRes.json()) as Array<{
    key: string;
    value: string | null;
  }>;

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
export async function patchSupabaseKv(
  patch: Record<string, string | null>,
  config?: SupabaseConfig
): Promise<SupabaseKvSnapshot> {
  const cfg = config ?? getSupabaseConfig();
  if (!cfg) throw new Error("Supabase config missing");

  const now = new Date().toISOString();

  for (const [key, value] of Object.entries(patch)) {
    if (!(SHARED_STORAGE_KEYS as readonly string[]).includes(key)) continue;
    if (value === null) {
      const delRes = await supabaseFetch(
        cfg,
        `workshop_kv?key=eq.${encodeURIComponent(key)}`,
        { method: "DELETE" }
      );
      if (!delRes.ok && delRes.status !== 404) {
        throw new Error(`Supabase delete failed for ${key} (${delRes.status})`);
      }
    } else {
      const upsertRes = await supabaseFetch(cfg, "workshop_kv", {
        method: "POST",
        headers: {
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({ key, value, updated_at: now }),
      });
      if (!upsertRes.ok) {
        throw new Error(`Supabase upsert failed for ${key} (${upsertRes.status})`);
      }
    }
  }

  const current = await readSupabaseKv(cfg);
  const nextRevision = current.revision + 1;
  const patchMetaRes = await supabaseFetch(cfg, "workshop_meta?id=eq.1", {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ revision: nextRevision, updated_at: now }),
  });
  if (!patchMetaRes.ok) {
    throw new Error(`Supabase meta update failed (${patchMetaRes.status})`);
  }

  return readSupabaseKv(cfg);
}

/** استبدال كامل */
export async function replaceSupabaseKv(
  data: Record<string, string | null>,
  config?: SupabaseConfig
): Promise<SupabaseKvSnapshot> {
  const normalized = normalizeData(data);
  const patch: Record<string, string | null> = {};
  for (const key of SHARED_STORAGE_KEYS) {
    patch[key] = normalized[key];
  }
  return patchSupabaseKv(patch, config);
}
