/** إعدادات Supabase — anon key عامة (آمنة للمتصفح) */
const DEFAULT_SUPABASE_URL = "https://jhlyjcdfxprendfdnuoe.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpobHlqY2RmeHByZW5kZmRudW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NzIxMjIsImV4cCI6MjEwMDI0ODEyMn0.eRUA1jLkLNbTb_2x4v7TML8UDvcZevMZRuCR-AlAVJc";

const SUPABASE_URL_ENV_KEYS = [
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
] as const;

const SUPABASE_KEY_ENV_KEYS = [
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

  if (!url && !anonKey) {
    return {
      url: DEFAULT_SUPABASE_URL,
      anonKey: DEFAULT_SUPABASE_ANON_KEY,
    };
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
  presence["supabase_defaults"] = !(
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  );
  return presence;
}
