const SUPABASE_URL_ENV_KEYS = [
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
] as const;

// Server-side only. Prefer a secret/service key so `workshop_kv` can stay
// closed to the public anon key (RLS enabled, no anon policies).
const SUPABASE_KEY_ENV_KEYS = [
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

export function getSupabaseConfig(): SupabaseConfig | null {
  let url: string | undefined;
  for (const key of SUPABASE_URL_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value) {
      url = value;
      break;
    }
  }

  let anonKey: string | undefined;
  for (const key of SUPABASE_KEY_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value) {
      anonKey = value;
      break;
    }
  }

  if (!url || !anonKey) return null;
  return { url: url.replace(/\/$/, ""), anonKey };
}

export function hasSupabaseConfig(): boolean {
  return getSupabaseConfig() !== null;
}

export function getSupabaseEnvPresence(): Record<string, boolean> {
  const presence: Record<string, boolean> = {};
  for (const key of [...SUPABASE_URL_ENV_KEYS, ...SUPABASE_KEY_ENV_KEYS]) {
    presence[key] = Boolean(process.env[key]?.trim());
  }
  return presence;
}
