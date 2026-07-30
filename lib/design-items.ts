import type { LayoutNode } from "@/lib/window-layout";
import {
  cloneLayout,
  defaultSizeForLayout,
  ensurePaneIds,
  listPaneIds,
} from "@/lib/window-layout";
import { suggestItemName } from "@/lib/item-naming";

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

/** تصنيف السلك — الجرار بس اللي بياخد قطاع زي ضلفة جرار */
export type MeshKind = "sliding" | "fixed" | "roll" | "hinged";

export const MESH_KINDS: { id: MeshKind; label: string }[] = [
  { id: "sliding", label: "سلك جرار" },
  { id: "fixed", label: "سلك ثابت" },
  { id: "roll", label: "سلك رول" },
  { id: "hinged", label: "سلك مفصلي" },
];

export function meshKindLabel(kind: MeshKind): string {
  return MESH_KINDS.find((k) => k.id === kind)?.label ?? kind;
}

/** يحدد سلك جرار تلقائياً لو الضلفة جرار/سحاب */
export function inferMeshKind(opening: PaneOpening): MeshKind {
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
    opening === "door-right" ||
    opening === "tilt-turn" ||
    opening === "tilt-turn-left"
  ) {
    return "hinged";
  }
  return "fixed";
}

export function resolvePaneMeshKind(
  cfg: PaneConfig,
  opening: PaneOpening
): MeshKind {
  if (cfg.meshKind) return cfg.meshKind;
  return inferMeshKind(opening);
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
  /** باب بدل شباك عادي */
  isDoor?: boolean;
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

export function normalizePaneConfig(
  config?: PaneConfig
): PaneConfig {
  const base = defaultPaneConfig(config);
  const count = gridCellCount(base.grid);
  const cells = (base.panelCells ?? []).filter((i) => i >= 0 && i < count);
  return { ...base, panelCells: cells };
}

/** زجاج الضلفة: override على مستوى الضلفة أو الافتراضي من البند */
export function resolvePaneGlass(
  cfg: PaneConfig,
  item: Pick<DesignItem, "glassPane1Id" | "glassPane2Id" | "glassGeorgian">
): {
  pane1Id?: string;
  pane2Id?: string;
  georgian: boolean;
} {
  if (cfg.glassPane1Id) {
    return {
      pane1Id: cfg.glassPane1Id,
      pane2Id: cfg.glassPane2Id,
      georgian: Boolean(cfg.glassGeorgian && cfg.glassPane2Id),
    };
  }
  return {
    pane1Id: item.glassPane1Id,
    pane2Id: item.glassPane2Id,
    georgian: Boolean(item.glassGeorgian && item.glassPane2Id),
  };
}

export type FrameColorId =
  | "white"
  | "wood"
  | "gray"
  | "anthracite"
  | "cream";

export const FRAME_COLORS: Record<
  FrameColorId,
  { label: string; hex: string; wood?: boolean }
> = {
  white: { label: "أبيض", hex: "#f4f6f8" },
  wood: { label: "خشبي", hex: "#c4a06a", wood: true },
  gray: { label: "رمادي", hex: "#9aa3ad" },
  anthracite: { label: "أنثراسيت", hex: "#3d4450" },
  cream: { label: "كريمي", hex: "#efe6d5" },
};

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
  /** سعر المتر المربع */
  pricePerSqm: number;
  /** مذكرة / ملاحظات البند */
  notes?: string;
  /** سعر خاص للقطعة الواحدة (بدل حساب المتر) */
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

export function itemTotalPrice(item: DesignItem): number {
  const qty = Math.max(1, item.qty || 1);
  const hasSpecial =
    item.specialPrice != null &&
    Number.isFinite(item.specialPrice) &&
    item.specialPrice > 0;
  const base = hasSpecial
    ? (item.specialPrice as number) * qty
    : itemUnitAreaSqm(item) * item.pricePerSqm * qty;
  const percent =
    item.discountId === "d1"
      ? 1
      : item.discountId === "d3"
        ? 3
        : item.discountId === "d5"
          ? 5
          : 0;
  return base * (1 - percent / 100);
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
  _index: number
): DesignItem {
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
    notes: "",
    specialPrice: null,
    discountId: "none",
    systemId: "none",
    accessoryId: "none",
    /** الحديد ثابت غالباً — يُملأ بالافتراضي عند فتح الإعدادات إن لزم */
    ironId: "iron-std",
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
