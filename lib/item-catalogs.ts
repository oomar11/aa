import {
  catalogOptionsFor,
  getDefaultCatalog,
  type MaterialCategory,
} from "@/lib/material-systems";

export type DiscountId = "none" | "d1" | "d3" | "d5";

/** معرفات اختيارية — الأنظمة الفعلية تُدار من شاشة الخامات */
export type SystemId = string;
export type AccessoryId = string;
export type GlassId = string;
export type IronId = string;

export const DISCOUNT_OPTIONS: {
  id: DiscountId;
  label: string;
  percent: number;
}[] = [
  { id: "none", label: "تجاهل", percent: 0 },
  { id: "d1", label: "خصم 1%", percent: 1 },
  { id: "d3", label: "خصم 3%", percent: 3 },
  { id: "d5", label: "خصم 5%", percent: 5 },
];

/** احتياطي SSR / قبل تحميل localStorage */
const defaults = getDefaultCatalog();

function fallbackOptions(category: MaterialCategory): { id: string; label: string }[] {
  return [
    { id: "none", label: "تجاهل" },
    ...defaults[category].map((s) => ({
      id: s.id,
      label: s.isDefault ? `${s.name} (افتراضي)` : s.name,
    })),
  ];
}

/** قطاعات — نظام البروفيل */
export const SYSTEM_OPTIONS: { id: string; label: string }[] =
  fallbackOptions("profiles");

export const ACCESSORY_OPTIONS: { id: string; label: string }[] =
  fallbackOptions("accessories");

export const GLASS_OPTIONS: { id: string; label: string }[] =
  fallbackOptions("glass");

export const IRON_OPTIONS: { id: string; label: string }[] =
  fallbackOptions("iron");

/** تحميل اختيارات حية من localStorage (عميل فقط) */
export function loadSystemOptions(): { id: string; label: string }[] {
  return catalogOptionsFor("profiles");
}

export function loadAccessoryOptions(): { id: string; label: string }[] {
  return catalogOptionsFor("accessories");
}

export function loadGlassOptions(): { id: string; label: string }[] {
  return catalogOptionsFor("glass");
}

export function loadIronOptions(): { id: string; label: string }[] {
  return catalogOptionsFor("iron");
}

export function discountPercent(id?: string | null): number {
  return DISCOUNT_OPTIONS.find((d) => d.id === id)?.percent ?? 0;
}

/** تطبيق نسبة الخصم على مبلغ خامات أو بيع */
export function applyDiscountAmount(
  amount: number,
  discountId?: string | null
): number {
  const percent = discountPercent(discountId);
  if (percent <= 0 || !Number.isFinite(amount)) return amount;
  return amount * (1 - percent / 100);
}

export function discountLabel(discountId?: string | null): string | null {
  const opt = DISCOUNT_OPTIONS.find((d) => d.id === discountId);
  if (!opt || opt.percent <= 0) return null;
  return opt.label;
}
