import { STORAGE_KEYS } from "@/lib/storage/keys";
import { sharedGetItem, sharedSetItem } from "@/lib/storage/shared-client";

/** وضع تسعير البيع */
export type PricingMode = "hybrid" | "per_sqm";

/** إعدادات تسعير البيع */
export type PricingSettings = {
  /** نظام التسعير المختار */
  mode: PricingMode;
  /**
   * توافق قديم: true = هجين، false = بالمتر.
   * يُشتق من mode عند التطبيع.
   */
  enabled: boolean;
  /** هامش الربح على تكلفة الخامات (%) — للهجين */
  marginPercent: number;
  /** مصنعية بالمتر المربع (ج.م) — للهجين؛ أقل من متر يُحسب متر */
  laborPerSqm: number;
  /** زيادة الدبل ج.م/م² — لوضع بالمتر حسب القطاع */
  doubleExtraPerSqm: number;
};

export const DEFAULT_PRICING: PricingSettings = {
  mode: "hybrid",
  enabled: true,
  marginPercent: 30,
  laborPerSqm: 200,
  doubleExtraPerSqm: 0,
};

export const PRICING_UPDATED_EVENT = "upvc-pricing-updated";

export const PRICING_MODE_OPTIONS: {
  id: PricingMode;
  label: string;
  description: string;
}[] = [
  {
    id: "hybrid",
    label: "هجين (خامات + هامش + مصنعية)",
    description:
      "سعر البيع = تكلفة الخامات × (1 + الهامش) + المصنعية × المساحة. أقل من متر يُحسب متر في المصنعية.",
  },
  {
    id: "per_sqm",
    label: "بالمتر حسب القطاع",
    description:
      "سعر ثابت للمتر لكل نظام قطاع (شامل زجاج مفرد). أقل من متر يُحسب متر. الدبل يضيف زيادة ثابتة للمتر.",
  },
];

type PricingInput = Partial<PricingSettings> & {
  mode?: PricingMode | string;
  enabled?: boolean;
};

export function loadPricingSettings(): PricingSettings {
  if (typeof window === "undefined") return { ...DEFAULT_PRICING };
  try {
    const raw = sharedGetItem(STORAGE_KEYS.pricing);
    if (!raw) return { ...DEFAULT_PRICING };
    const parsed = JSON.parse(raw) as PricingInput;
    return normalizePricingSettings(parsed);
  } catch {
    return { ...DEFAULT_PRICING };
  }
}

function resolveMode(input: PricingInput | null | undefined): PricingMode {
  if (input?.mode === "hybrid" || input?.mode === "per_sqm") {
    return input.mode;
  }
  // ترحيل: enabled:false → بالمتر، غير ذلك → هجين
  if (input?.enabled === false) return "per_sqm";
  return "hybrid";
}

export function normalizePricingSettings(
  input: PricingInput | null | undefined
): PricingSettings {
  const mode = resolveMode(input);
  const margin = Number(input?.marginPercent);
  const labor = Number(input?.laborPerSqm);
  const doubleExtra = Number(input?.doubleExtraPerSqm);
  return {
    mode,
    enabled: mode === "hybrid",
    marginPercent: Number.isFinite(margin)
      ? Math.min(500, Math.max(0, margin))
      : DEFAULT_PRICING.marginPercent,
    laborPerSqm: Number.isFinite(labor)
      ? Math.max(0, labor)
      : DEFAULT_PRICING.laborPerSqm,
    doubleExtraPerSqm: Number.isFinite(doubleExtra)
      ? Math.max(0, doubleExtra)
      : DEFAULT_PRICING.doubleExtraPerSqm,
  };
}

export function savePricingSettings(settings: PricingSettings | PricingInput) {
  if (typeof window === "undefined") return;
  const next = normalizePricingSettings(settings);
  sharedSetItem(STORAGE_KEYS.pricing, JSON.stringify(next));
  window.dispatchEvent(new Event(PRICING_UPDATED_EVENT));
}

/**
 * مساحة الفوترة للقطعة الواحدة:
 * أي مساحة أقل من 1 م² تُحسب متر كامل.
 */
export function billableLaborAreaSqm(unitAreaSqm: number): number {
  const area = Math.max(0, unitAreaSqm);
  if (area <= 0) return 1;
  return Math.max(1, area);
}

/** نفس حد أدنى المتر لوضع البيع بالمتر */
export function billableSaleAreaSqm(unitAreaSqm: number): number {
  return billableLaborAreaSqm(unitAreaSqm);
}

/**
 * هل البند دبل؟ زجاجة ثانية على مستوى البند أو أي ضلفة.
 */
export function itemIsDoubleGlazing(item: {
  glassPane2Id?: string | null;
  panes?: Record<string, { glassPane2Id?: string | null } | undefined> | null;
}): boolean {
  if (item.glassPane2Id) return true;
  const panes = item.panes;
  if (!panes) return false;
  for (const pane of Object.values(panes)) {
    if (pane?.glassPane2Id) return true;
  }
  return false;
}

/**
 * سعر بيع القطعة الواحدة (قبل الكمية والخصم) — الوضع الهجين:
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
    mode: "hybrid" as const,
    materials,
    marginPercent: settings.marginPercent,
    marginAmount,
    laborPerSqm: settings.laborPerSqm,
    laborArea,
    laborAmount,
    unitSale,
  };
}

/**
 * سعر بيع القطعة بالمتر حسب القطاع:
 * max(1, م²) × سعر_القطاع + لو دبل: max(1, م²) × زيادة_الدبل
 */
export function perSqmUnitSalePrice(
  salePricePerSqm: number,
  unitAreaSqm: number,
  isDouble: boolean,
  settings: PricingSettings = loadPricingSettings()
): number {
  const area = billableSaleAreaSqm(unitAreaSqm);
  const base = Math.max(0, salePricePerSqm) * area;
  const doubleExtra = isDouble
    ? Math.max(0, settings.doubleExtraPerSqm) * area
    : 0;
  return Math.round((base + doubleExtra) * 100) / 100;
}

export function perSqmSaleBreakdown(
  salePricePerSqm: number,
  unitAreaSqm: number,
  isDouble: boolean,
  settings: PricingSettings = loadPricingSettings()
) {
  const area = billableSaleAreaSqm(unitAreaSqm);
  const baseAmount =
    Math.round(Math.max(0, salePricePerSqm) * area * 100) / 100;
  const doubleExtraPerSqm = Math.max(0, settings.doubleExtraPerSqm);
  const doubleAmount = isDouble
    ? Math.round(doubleExtraPerSqm * area * 100) / 100
    : 0;
  const unitSale = perSqmUnitSalePrice(
    salePricePerSqm,
    unitAreaSqm,
    isDouble,
    settings
  );
  return {
    mode: "per_sqm" as const,
    salePricePerSqm: Math.max(0, salePricePerSqm),
    billableArea: area,
    baseAmount,
    isDouble,
    doubleExtraPerSqm,
    doubleAmount,
    unitSale,
  };
}

/** قراءة سعر بيع المتر لنظام قطاع مع رجوع لسعر البند */
export function resolveProfileSalePricePerSqm(
  systemId: string | undefined | null,
  fallbackPricePerSqm: number
): number {
  if (typeof window === "undefined") {
    return Math.max(0, fallbackPricePerSqm);
  }
  try {
    const { findSystem, loadMaterialCatalog } =
      require("@/lib/material-systems") as typeof import("@/lib/material-systems");
    const system = findSystem("profiles", systemId, loadMaterialCatalog());
    const fromSystem = system?.profile?.salePricePerSqm;
    if (
      fromSystem != null &&
      Number.isFinite(fromSystem) &&
      fromSystem > 0
    ) {
      return fromSystem;
    }
  } catch {
    // رجوع لسعر البند
  }
  return Math.max(0, fallbackPricePerSqm);
}
