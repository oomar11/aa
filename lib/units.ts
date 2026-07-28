export type LengthUnit = "mm" | "cm";

export const UNIT_STORAGE_KEY = "upvc-unit";

export function loadUnit(): LengthUnit {
  if (typeof window === "undefined") return "mm";
  const stored = localStorage.getItem(UNIT_STORAGE_KEY);
  return stored === "cm" ? "cm" : "mm";
}

export function saveUnit(unit: LengthUnit) {
  localStorage.setItem(UNIT_STORAGE_KEY, unit);
}

/** يحول قيمة مخزّنة بالمليمتر لعرضها حسب الوحدة المختارة */
export function formatLength(mm: number, unit: LengthUnit): string {
  if (unit === "cm") {
    const cm = mm / 10;
    const text = Number.isInteger(cm) ? String(cm) : cm.toFixed(1);
    return text;
  }
  return String(Math.round(mm));
}

export function unitLabel(unit: LengthUnit): string {
  return unit === "cm" ? "سم" : "مم";
}

/** يحول قيمة معروضة (مم أو سم) إلى مليمتر للتخزين */
export function toMm(value: number, unit: LengthUnit): number {
  if (unit === "cm") return Math.round(value * 10);
  return Math.round(value);
}

/** يحول من مليمتر إلى رقم للعرض/التعديل حسب الوحدة */
export function fromMm(mm: number, unit: LengthUnit): number {
  if (unit === "cm") {
    const cm = mm / 10;
    return Number.isInteger(cm) ? cm : Math.round(cm * 10) / 10;
  }
  return Math.round(mm);
}

/** أقل مقاس مسموح بالوحدة الحالية */
export function minLengthInUnit(unit: LengthUnit): number {
  return unit === "cm" ? 5 : 50;
}

export function formatSizePair(
  widthMm: number,
  heightMm: number,
  unit: LengthUnit
): string {
  return `${formatLength(widthMm, unit)} × ${formatLength(heightMm, unit)} ${unitLabel(unit)}`;
}
