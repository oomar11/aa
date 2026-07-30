/** تحويل نص الحقل لرقم عند الحفظ أو فقدان التركيز */
export function parseNumericInput(
  raw: string,
  fallback: number,
  options?: { min?: number; max?: number; round?: boolean }
): number {
  if (raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  let v = options?.round ? Math.round(n) : n;
  if (options?.min !== undefined) v = Math.max(options.min, v);
  if (options?.max !== undefined) v = Math.min(options.max, v);
  return v;
}

/** عرض الرقم في الحقل — الصفر يظهر فاضي لو blankZero */
export function numericDisplayValue(value: number, blankZero = true): string {
  if (blankZero && value === 0) return "";
  return String(value);
}
