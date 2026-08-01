/**
 * ربط Neon من المتصفح مباشرة (بدون Environment Variables على Vercel).
 * يُحفظ رابط الاتصال محلياً على الجهاز ويُستخدم لكل عمليات المزامنة.
 */

export const NEON_URL_STORAGE_KEY = "upvc-neon-database-url";

export function normalizeNeonConnectionString(raw: string): string {
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

export function isLikelyNeonConnectionString(raw: string): boolean {
  const value = normalizeNeonConnectionString(raw);
  return (
    value.startsWith("postgres://") || value.startsWith("postgresql://")
  );
}

export function getSavedNeonConnectionString(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(NEON_URL_STORAGE_KEY);
    if (!raw) return null;
    const normalized = normalizeNeonConnectionString(raw);
    return normalized || null;
  } catch {
    return null;
  }
}

export function saveNeonConnectionString(raw: string): string {
  if (typeof window === "undefined") {
    throw new Error("unavailable");
  }
  const normalized = normalizeNeonConnectionString(raw);
  if (!isLikelyNeonConnectionString(normalized)) {
    throw new Error(
      "الرابط غير صالح — لازم يبدأ بـ postgres:// أو postgresql://"
    );
  }
  localStorage.setItem(NEON_URL_STORAGE_KEY, normalized);
  return normalized;
}

export function clearSavedNeonConnectionString() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(NEON_URL_STORAGE_KEY);
}

/** إخفاء كلمة السر في العرض */
export function maskNeonConnectionString(raw: string): string {
  const value = normalizeNeonConnectionString(raw);
  try {
    const url = new URL(value);
    if (url.password) url.password = "••••••••";
    return url.toString();
  } catch {
    return value.slice(0, 28) + "…";
  }
}
