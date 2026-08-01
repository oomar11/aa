import { STORAGE_KEYS } from "@/lib/storage/keys";
import { sharedGetItem, sharedSetItem } from "@/lib/storage/shared-client";

/** إعدادات تسعير البيع الهجين */
export type PricingSettings = {
  /** تفعيل: سعر البيع من تكلفة الخامات + هامش + مصنعية */
  enabled: boolean;
  /** هامش الربح على تكلفة الخامات (%) */
  marginPercent: number;
  /** مصنعية بالمتر المربع (ج.م) — أقل من متر يُحسب متر */
  laborPerSqm: number;
};

export const DEFAULT_PRICING: PricingSettings = {
  enabled: true,
  marginPercent: 30,
  laborPerSqm: 200,
};

export const PRICING_UPDATED_EVENT = "upvc-pricing-updated";

export function loadPricingSettings(): PricingSettings {
  if (typeof window === "undefined") return { ...DEFAULT_PRICING };
  try {
    const raw = sharedGetItem(STORAGE_KEYS.pricing);
    if (!raw) return { ...DEFAULT_PRICING };
    const parsed = JSON.parse(raw) as Partial<PricingSettings>;
    return normalizePricingSettings(parsed);
  } catch {
    return { ...DEFAULT_PRICING };
  }
}

export function normalizePricingSettings(
  input: Partial<PricingSettings> | null | undefined
): PricingSettings {
  const margin = Number(input?.marginPercent);
  const labor = Number(input?.laborPerSqm);
  return {
    enabled: input?.enabled !== false,
    marginPercent: Number.isFinite(margin)
      ? Math.min(500, Math.max(0, margin))
      : DEFAULT_PRICING.marginPercent,
    laborPerSqm: Number.isFinite(labor)
      ? Math.max(0, labor)
      : DEFAULT_PRICING.laborPerSqm,
  };
}

export function savePricingSettings(settings: PricingSettings) {
  if (typeof window === "undefined") return;
  const next = normalizePricingSettings(settings);
  sharedSetItem(STORAGE_KEYS.pricing, JSON.stringify(next));
  window.dispatchEvent(new Event(PRICING_UPDATED_EVENT));
}

/**
 * مساحة المصنعية للقطعة الواحدة:
 * أي مساحة أقل من 1 م² تُحسب متر كامل.
 */
export function billableLaborAreaSqm(unitAreaSqm: number): number {
  const area = Math.max(0, unitAreaSqm);
  if (area <= 0) return 1;
  return Math.max(1, area);
}

/**
 * سعر بيع القطعة الواحدة (قبل الكمية والخصم):
 * تكلفة خامات القطعة × (1 + هامش) + مصنعية × max(1, م²)
 */
export function hybridUnitSalePrice(
  materialsUnitCost: number,
  unitAreaSqm: number,
  settings: PricingSettings = loadPricingSettings()
): number {
  const materials = Math.max(0, materialsUnitCost);
  const withMargin = materials * (1 + settings.marginPercent / 100);
  const labor =
    Math.max(0, settings.laborPerSqm) * billableLaborAreaSqm(unitAreaSqm);
  return Math.round((withMargin + labor) * 100) / 100;
}

export function hybridSaleBreakdown(
  materialsUnitCost: number,
  unitAreaSqm: number,
  settings: PricingSettings = loadPricingSettings()
) {
  const materials = Math.max(0, materialsUnitCost);
  const marginAmount =
    Math.round(materials * (settings.marginPercent / 100) * 100) / 100;
  const laborArea = billableLaborAreaSqm(unitAreaSqm);
  const laborAmount =
    Math.round(settings.laborPerSqm * laborArea * 100) / 100;
  const unitSale = hybridUnitSalePrice(materials, unitAreaSqm, settings);
  return {
    materials,
    marginPercent: settings.marginPercent,
    marginAmount,
    laborPerSqm: settings.laborPerSqm,
    laborArea,
    laborAmount,
    unitSale,
  };
}
