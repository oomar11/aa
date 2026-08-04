import type { LayoutNode } from "@/lib/window-layout";
import {
  cloneLayout,
  defaultSizeForLayout,
  ensurePaneIds,
  listPaneIds,
} from "@/lib/window-layout";
import {
  defaultMeshTypeForKind,
  findMeshType,
  getDefaultGlassBottleId,
  getDefaultSystemId,
  getIronSystemId,
  getMeshCategories,
  loadMaterialCatalog,
  resolveGlassBottleId,
  type MaterialCatalog,
} from "@/lib/material-systems";
import {
  projectUsesCustomAccessory,
  type ProjectMaterialDefaults,
} from "@/lib/project-materials";
import { applyDiscountAmount } from "@/lib/item-catalogs";
import { suggestItemName } from "@/lib/item-naming";
import type { Project } from "@/lib/projects";

export type WindowStyle =
  | "casement-1"
  | "casement-2"
  | "sliding-2"
  | "sliding-3"
  | "fixed"
  | "door";

export type PaneOpening =
  | "fixed"
  /** شفاط مطبخ / حمام — ضلفة ثابتة بفتحة مروحة */
  | "exhaust"
  | "casement-left"
  | "casement-right"
  | "tilt"
  | "tilt-inverted"
  | "tilt-turn"
  | "tilt-turn-left"
  | "sliding-left"
  | "sliding-right"
  | "door-left"
  | "door-right"
  | "drawer-left"
  | "drawer-right"
  | "panel-h"
  | "panel-v";

/** عرض شريحة البنل بالملليمتر (15 سم) */
export const PANEL_STRIPE_MM = 150;

/** التقسيم الداخلي داخل الضلفة (العوائد / تقسيم الزجاج) */
export type PaneGrid =
  | "solid"
  | "2v"
  | "2h"
  | "3v"
  | "3h"
  | "4v"
  | "4h"
  | "2x2"
  | "3x2"
  | "2x3"
  | "3x3"
  | "top-2v"
  | "bot-2v"
  | "diamond";

/** معرّف تصنيف السلك (من كتالوج الخامات) */
export type MeshKind = string;

/** ضلفة جرار بارزة أو غاطسة — الغاطسة تحمل مقبض غاطس */
export type SlidingSashDepth = "protruding" | "recessed";

export function slidingSashDepthLabel(depth: SlidingSashDepth): string {
  return depth === "protruding" ? "بارز" : "غاطس";
}

/** ضلفة جرار متحركة (سحاب أو جرار) */
export function isSlidingSashOpening(opening: PaneOpening): boolean {
  return (
    opening === "drawer-left" ||
    opening === "drawer-right" ||
    opening === "sliding-left" ||
    opening === "sliding-right"
  );
}

/**
 * كان بيفعّل السلك تلقائياً للقلاب/الجرار — اتقفل.
 * السلك بيتفعّل يدوي بس؛ النوع بيتحدد تلقائي لما المستخدم يفعّله.
 */

/** يحدد تصنيف السلك الافتراضي من نوع الفتح */
export function inferMeshKind(
  opening: PaneOpening,
  catalog?: MaterialCatalog
): MeshKind {
  const tag = openingMeshDefaultTag(opening);
  const cats = getMeshCategories(catalog);
  const match = cats.find((c) => c.defaultFor === tag);
  if (match) return match.id;
  if (tag === "sliding") return "sliding";
  if (tag === "tilt") return "tilt";
  if (tag === "hinged") return "hinged";
  return "fixed";
}

function openingMeshDefaultTag(
  opening: PaneOpening
): "sliding" | "hinged" | "fixed" | "tilt" {
  if (
    opening === "tilt" ||
    opening === "tilt-inverted" ||
    opening === "tilt-turn" ||
    opening === "tilt-turn-left"
  ) {
    return "tilt";
  }
  if (
    opening === "drawer-left" ||
    opening === "drawer-right" ||
    opening === "sliding-left" ||
    opening === "sliding-right"
  ) {
    return "sliding";
  }
  if (
    opening === "casement-left" ||
    opening === "casement-right" ||
    opening === "door-left" ||
    opening === "door-right"
  ) {
    return "hinged";
  }
  return "fixed";
}

/**
 * متفعّلش السلك لوحده.
 * لو السلك مفعّل بالفعل: حدّث التصنيف/النوع حسب الفتحة (ما لم يختاره المستخدم يدوياً).
 */
export function applyOpeningMeshDefaults(
  config: PaneConfig,
  catalog?: MaterialCatalog
): PaneConfig {
  if (isExhaustPane(config.opening)) {
    return exhaustPaneConfig(config);
  }
  if (!config.mesh) {
    return config;
  }

  const kind = config.meshKindManual
    ? (config.meshKind ?? inferMeshKind(config.opening, catalog))
    : inferMeshKind(config.opening, catalog);

  const current = config.meshTypeId
    ? findMeshType(config.meshTypeId, catalog)
    : undefined;
  const meshTypeId =
    current?.kind === kind
      ? current.id
      : defaultMeshTypeForKind(kind, catalog)?.id ?? config.meshTypeId;

  return {
    ...config,
    mesh: true,
    meshKind: kind,
    meshTypeId,
  };
}

export function resolvePaneMeshKind(
  cfg: PaneConfig,
  opening: PaneOpening,
  catalog?: MaterialCatalog
): MeshKind {
  if (cfg.meshKind) return cfg.meshKind;
  return inferMeshKind(opening, catalog);
}

export type PaneConfig = {
  opening: PaneOpening;
  /** بوكلير — ثابت بين مفصليين والمقابض باتجاه بعض */
  bouclier?: boolean;
  /** المستخدم اختار يدوياً سوقاس/بوكلير */
  bouclierManual?: boolean;
  /** تقسيم داخلي */
  grid?: PaneGrid;
  /** تفعيل البنل (ساندوتش) */
  sandwichPanels?: boolean;
  /** فهارس الخلايا اللي بنل (0-based) لما الضلفة متجزّئة */
  panelCells?: number[];
  /** شبكة / سلك */
  mesh?: boolean;
  /** نوع السلك من كتالوج الخامات */
  meshTypeId?: string;
  /** تصنيف السلك: جرار (قطاع) أو مساحة فقط */
  meshKind?: MeshKind;
  /** المستخدم غيّر التصنيف يدوياً — متعملش auto من نوع الفتح */
  meshKindManual?: boolean;
  /** المستخدم أوقف السلك يدوياً (قديم — السلك مبقاش بيتفعّل أوتوماتيك) */
  meshOffManual?: boolean;
  /** باب بدل شباك عادي */
  isDoor?: boolean;
  /** ضلفة جرار بارز أو غاطس — يُستنتج تلقائياً من موقع الضلفة إن لم يُحدَّد */
  sashDepth?: SlidingSashDepth;
  /** المستخدم اختار يدوياً بارز/غاطس */
  sashDepthManual?: boolean;
  /** الزجاجة الأولى — مفرد */
  glassPane1Id?: string;
  /** الزجاجة الثانية — لو موجودة يبقى دبل */
  glassPane2Id?: string;
  /** جورجيا — للدبل فقط */
  glassGeorgian?: boolean;
};

export function defaultPaneConfig(
  partial?: Partial<PaneConfig>
): PaneConfig {
  return {
    opening: "fixed",
    bouclier: false,
    bouclierManual: false,
    grid: "solid",
    sandwichPanels: false,
    panelCells: [],
    mesh: false,
    isDoor: false,
    ...partial,
  };
}

export function gridCellCount(grid: PaneGrid = "solid"): number {
  switch (grid) {
    case "solid":
    case "diamond":
      return 1;
    case "2v":
    case "2h":
      return 2;
    case "3v":
    case "3h":
    case "top-2v":
    case "bot-2v":
      return 3;
    case "4v":
    case "4h":
    case "2x2":
      return 4;
    case "3x2":
    case "2x3":
      return 6;
    case "3x3":
      return 9;
  }
}

/** ضلفة شفاط — بدون زجاج أو باكتة */
export function isExhaustPane(opening: PaneOpening): boolean {
  return opening === "exhaust";
}

function exhaustPaneConfig(config: PaneConfig): PaneConfig {
  return {
    ...config,
    grid: "solid",
    sandwichPanels: false,
    panelCells: [],
    mesh: false,
    meshTypeId: undefined,
    meshKind: undefined,
    meshKindManual: undefined,
    meshOffManual: undefined,
    isDoor: false,
    glassPane1Id: undefined,
    glassPane2Id: undefined,
    glassGeorgian: undefined,
  };
}

export function normalizePaneConfig(
  config?: PaneConfig
): PaneConfig {
  const base = defaultPaneConfig(config);
  if (isExhaustPane(base.opening)) {
    return exhaustPaneConfig(base);
  }
  const count = gridCellCount(base.grid);
  const cells = (base.panelCells ?? []).filter((i) => i >= 0 && i < count);
  return { ...base, panelCells: cells };
}

/** زجاج الضلفة — من إعداد الضلفة أو الافتراضي على البند */
export function resolvePaneGlass(
  cfg: PaneConfig,
  item: Pick<DesignItem, "glassPane1Id" | "glassPane2Id" | "glassGeorgian">,
  catalog?: MaterialCatalog
): {
  pane1Id: string;
  pane2Id?: string;
  georgian: boolean;
} {
  const pane1Id =
    resolveGlassBottleId(cfg.glassPane1Id) ??
    resolveGlassBottleId(item.glassPane1Id) ??
    getDefaultGlassBottleId(catalog);
  const pane2Id =
    resolveGlassBottleId(cfg.glassPane2Id) ??
    resolveGlassBottleId(item.glassPane2Id);
  const georgianFlag = cfg.glassGeorgian ?? item.glassGeorgian;
  return {
    pane1Id,
    pane2Id,
    georgian: Boolean(georgianFlag && pane2Id),
  };
}

export type FrameColorId =
  | "white"
  | "beige"
  | "gray"
  | "wood"
  | "black";

export const FRAME_COLORS: Record<
  FrameColorId,
  { label: string; hex: string; wood?: boolean }
> = {
  white: { label: "أبيض", hex: "#f4f6f8" },
  beige: { label: "بيج", hex: "#d2c2a4" },
  gray: { label: "رمادي", hex: "#9aa3ad" },
  wood: { label: "خشبي", hex: "#c4a06a", wood: true },
  black: { label: "أسود", hex: "#1f2329" },
};

/** ترتيب عرض ألوان الإطار في الواجهة */
export const FRAME_COLOR_IDS = Object.keys(FRAME_COLORS) as FrameColorId[];

/** ترحيل ألوان قديمة محفوظة (أنثراسيت/كريمي) للقائمة الحالية */
export function normalizeFrameColor(
  value: string | null | undefined
): FrameColorId {
  if (value === "anthracite") return "black";
  if (value === "cream") return "beige";
  if (value && value in FRAME_COLORS) return value as FrameColorId;
  return "white";
}

export type DesignItem = {
  id: string;
  name: string;
  /** المستخدم ثبّت اسم مخصص — متعملش تسمية ذكية تلقائي */
  nameIsCustom?: boolean;
  style: WindowStyle;
  /** تمبلت WinStudio المختار */
  templateId?: string;
  /** شجرة التقسيم الفعلية للرسم */
  layout?: LayoutNode;
  /** لون الإطار/الضلفة */
  frameColor?: FrameColorId;
  /** إعداد كل ضلفة بالمعرّف */
  panes?: Record<string, PaneConfig>;
  /** العرض بالمليمتر */
  widthMm: number;
  /** الارتفاع بالمليمتر */
  heightMm: number;
  qty: number;
  /** سعر المتر المربع — رجوع قديم لو مفيش سعر نظام/مخصص */
  pricePerSqm: number;
  /**
   * سعر متر مخصص لهذا الشباك فقط (ج.م/م²).
   * فارغ/null = استخدم سعر نظام القطاع الموحد.
   * أقل من متر يُحسب متر في وضع التسعير بالمتر.
   */
  customSalePricePerSqm?: number | null;
  /** مذكرة / ملاحظات البند */
  notes?: string;
  /** سعر خاص للقطعة الواحدة (بدل حساب المتر أو سعر المتر) */
  specialPrice?: number | null;
  /** مخطط مالي / خصم */
  discountId?: string;
  /** نظام القطاعات (بروفيل) */
  systemId?: string;
  /** نظام الاكسسوار */
  accessoryId?: string;
  /** الزجاجة الافتراضية للبند — تُطبَّق على الضلف اللي مالهاش اختيار خاص */
  glassPane1Id?: string;
  glassPane2Id?: string;
  glassGeorgian?: boolean;
  /** نظام الحديد (غالباً ثابت/افتراضي) */
  ironId?: string;
};

export function itemAreaSqm(item: DesignItem): number {
  return (item.widthMm * item.heightMm * item.qty) / 1_000_000;
}

export function itemUnitAreaSqm(item: DesignItem): number {
  return (item.widthMm * item.heightMm) / 1_000_000;
}

export function itemTotalPrice(
  item: DesignItem,
  project?: Project | ProjectMaterialDefaults | null
): number {
  const qty = Math.max(1, item.qty || 1);
  const hasSpecial =
    item.specialPrice != null &&
    Number.isFinite(item.specialPrice) &&
    item.specialPrice > 0;
  if (hasSpecial) {
    return applyDiscountAmount(
      (item.specialPrice as number) * qty,
      item.discountId
    );
  }

  if (typeof window !== "undefined") {
    try {
      // تحميل كسول لتفادي الاعتماد الدائري بين التسعير وحساب الخامات
      const {
        loadPricingSettings,
        hybridUnitSalePrice,
        perSqmUnitSalePrice,
        itemIsDoubleGlazing,
        resolveItemSalePricePerSqm,
        billableSaleAreaSqm,
        hasCustomSalePricePerSqm,
      } = require("@/lib/pricing") as typeof import("@/lib/pricing");
      const settings = loadPricingSettings();
      const unitArea = itemUnitAreaSqm(item);
      const projectSystemId = (
        project as ProjectMaterialDefaults | null | undefined
      )?.systemId;

      // سعر متر مخصص على الشباك يفعّل التسعير بالمتر لهذا البند
      if (settings.mode === "per_sqm" || hasCustomSalePricePerSqm(item)) {
        const salePerSqm = resolveItemSalePricePerSqm(item, projectSystemId);
        const unitSale = perSqmUnitSalePrice(
          salePerSqm,
          unitArea,
          itemIsDoubleGlazing(item),
          settings
        );
        return applyDiscountAmount(unitSale * qty, item.discountId);
      }

      if (settings.mode === "hybrid") {
        const { calcItemMaterialsCost } =
          require("@/lib/project-estimated-cost") as typeof import("@/lib/project-estimated-cost");
        const cost = calcItemMaterialsCost(item, project as Project | null);
        if (cost.hasCost && cost.beforeDiscount > 0) {
          const materialsUnit = cost.beforeDiscount / cost.qty;
          const unitSale = hybridUnitSalePrice(
            materialsUnit,
            unitArea,
            settings
          );
          return applyDiscountAmount(unitSale * qty, item.discountId);
        }
      }

      // رجوع: سعر متر البند × حد أدنى متر
      const salePerSqm = resolveItemSalePricePerSqm(item, projectSystemId);
      const base =
        billableSaleAreaSqm(unitArea) * salePerSqm * qty;
      return applyDiscountAmount(base, item.discountId);
    } catch {
      // الرجوع لسعر المتر على البند
    }
  }

  const unitArea = itemUnitAreaSqm(item);
  const area = unitArea > 0 ? Math.max(1, unitArea) : 1;
  const base = area * item.pricePerSqm * qty;
  return applyDiscountAmount(base, item.discountId);
}

/** سعر البيع المقترح للقطعة (بدون خصم) حسب نظام التسعير المختار */
export function itemSuggestedUnitSale(
  item: DesignItem,
  project?: Project | null
): number | null {
  if (typeof window === "undefined") return null;
  try {
    const {
      loadPricingSettings,
      hybridUnitSalePrice,
      perSqmUnitSalePrice,
      itemIsDoubleGlazing,
      resolveItemSalePricePerSqm,
      hasCustomSalePricePerSqm,
    } = require("@/lib/pricing") as typeof import("@/lib/pricing");
    const settings = loadPricingSettings();
    const unitArea = itemUnitAreaSqm(item);
    const projectSystemId = (
      project as ProjectMaterialDefaults | null | undefined
    )?.systemId;

    if (settings.mode === "per_sqm" || hasCustomSalePricePerSqm(item)) {
      const salePerSqm = resolveItemSalePricePerSqm(item, projectSystemId);
      return perSqmUnitSalePrice(
        salePerSqm,
        unitArea,
        itemIsDoubleGlazing(item),
        settings
      );
    }

    const { calcItemMaterialsCost } =
      require("@/lib/project-estimated-cost") as typeof import("@/lib/project-estimated-cost");
    const cost = calcItemMaterialsCost({ ...item, qty: 1 }, project);
    if (!cost.hasCost || cost.beforeDiscount <= 0) return null;
    return hybridUnitSalePrice(cost.beforeDiscount, unitArea, settings);
  } catch {
    return null;
  }
}

export function defaultPanesForLayout(
  layout: LayoutNode
): Record<string, PaneConfig> {
  const panes: Record<string, PaneConfig> = {};
  for (const id of listPaneIds(layout)) {
    panes[id] = defaultPaneConfig();
  }
  return panes;
}

export function createItemFromTemplate(
  templateId: string,
  layout: LayoutNode,
  _index: number,
  project?: ProjectMaterialDefaults | null
): DesignItem {
  const catalog =
    typeof window !== "undefined" ? loadMaterialCatalog() : undefined;
  const projectDefaults = project ?? {};
  const cloned = ensurePaneIds(cloneLayout(layout));
  const size = defaultSizeForLayout(cloned);
  const draft: DesignItem = {
    id: `d-${Date.now()}`,
    name: "",
    nameIsCustom: false,
    style: "fixed",
    templateId,
    layout: cloned,
    frameColor: "white",
    panes: defaultPanesForLayout(cloned),
    widthMm: size.widthMm,
    heightMm: size.heightMm,
    qty: 1,
    pricePerSqm: 2600,
    customSalePricePerSqm: null,
    notes: "",
    specialPrice: null,
    discountId: "none",
    systemId:
      projectDefaults.systemId ?? getDefaultSystemId("profiles", catalog),
    accessoryId: projectUsesCustomAccessory(projectDefaults)
      ? undefined
      : (projectDefaults.accessoryId ??
        getDefaultSystemId("accessories", catalog)),
    glassPane1Id:
      projectDefaults.glassPane1Id ?? getDefaultGlassBottleId(catalog),
    glassPane2Id: projectDefaults.glassPane2Id,
    glassGeorgian: projectDefaults.glassGeorgian,
    /** الحديد سيستم واحد — كل البنود بتتسلح منه */
    ironId: getIronSystemId(catalog),
  };
  return { ...draft, name: suggestItemName(draft) };
}

export const sampleDesignItems: DesignItem[] = [
  {
    id: "d1",
    name: "شباك غرفة النوم",
    style: "casement-2",
    templateId: "t02-2v",
    frameColor: "white",
    widthMm: 1200,
    heightMm: 1400,
    qty: 2,
    pricePerSqm: 2800,
  },
  {
    id: "d2",
    name: "شباك المطبخ",
    style: "sliding-2",
    templateId: "t02-2v",
    frameColor: "wood",
    widthMm: 1500,
    heightMm: 1200,
    qty: 1,
    pricePerSqm: 2600,
  },
  {
    id: "d3",
    name: "باب بلكونة",
    style: "door",
    templateId: "t13-step-low-left",
    frameColor: "white",
    widthMm: 900,
    heightMm: 2100,
    qty: 1,
    pricePerSqm: 3200,
  },
  {
    id: "d4",
    name: "شباك ثابت صالة",
    style: "fixed",
    templateId: "t01-single",
    frameColor: "white",
    widthMm: 1800,
    heightMm: 1000,
    qty: 3,
    pricePerSqm: 2200,
  },
];
