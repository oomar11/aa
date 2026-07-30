import {
  isExhaustPane,
  itemUnitAreaSqm,
  normalizePaneConfig,
  resolvePaneGlass,
  resolvePaneMeshKind,
  type DesignItem,
  type MeshKind,
  type PaneConfig,
  type PaneOpening,
  type SlidingSashDepth,
} from "@/lib/design-items";
import { getGridCells, gridLines } from "@/lib/pane-grid";
import type { LayoutNode } from "@/lib/window-layout";
import {
  calcPaneGlassCostPerSqm,
  calcCutSizes,
  defaultMeshTypeForKind,
  findGlassBottle,
  findMeshType,
  findSystem,
  getProfileBrandRate,
  loadMaterialCatalog,
  meshCategoryCalcProfile,
  meshKindLabel,
  paneGlassHasPricing,
  profileBarPricePerM,
  profileBrandHasPricing,
  profilePriceCategoryLabel,
  resolveProfileBrandForSystem,
  type MaterialCatalog,
  type ProfileBrand,
  type ProfileDeductions,
  type ProfilePriceCategory,
} from "@/lib/material-systems";

/** نوع الحلق حسب فتح الضلفة */
export type FrameKind = "hinged" | "sliding";

/** نوع خط التقسيم بين جزئين */
export type JunctionKind =
  | "mullion"
  | "coupling"
  | "bouclier"
  | "none";

export type MaterialsBreakdown = {
  /** مساحة القطعة الواحدة م² */
  areaSqm: number;
  /** حلق مفصلي — متر طولي للقطعة */
  frameHingedM: number;
  /** حلق جرار — متر طولي للقطعة */
  frameSlidingM: number;
  /** كوبلن تجميع بين مفصلي وجرار — متر طولي */
  couplingM: number;
  /** سكينة — قطعة واحدة لكل ضلفة جرار (متر طولي) */
  knifeM: number;
  /** بوكلير (مقابض في وش بعض) — متر طولي */
  bouclierM: number;
  /** طبة بوكلير — عدد القطع */
  bouclierCapQty: number;
  /** طبة بوكلير — متر طولي (ارتفاع الضلفة) */
  bouclierCapM: number;
  /** سوقاس بيقسم الحلق (خطوط التقسيم في اللليآوت) */
  mullionFrameM: number;
  /** سوقاس بيقسم الضلفة (تقسيم داخلي / عوائد) */
  mullionSashM: number;
  /** ضلفة مفصلي — متر طولي (محيط كل ضلفة متحركة) */
  sashHingedM: number;
  /** ضلفة باب — متر طولي */
  sashDoorM: number;
  /** ضلفة جرار — متر طولي (إجمالي) */
  sashSlidingM: number;
  /** باكتة سنجل مفصلي — متر طولي */
  beadSingleHingedM: number;
  /** باكتة سنجل جرار — متر طولي */
  beadSingleSlidingM: number;
  /** باكتة دبل مفصلي — متر طولي (ومنها البنل) */
  beadDoubleHingedM: number;
  /** باكتة دبل جرار — متر طولي (ومنها البنل) */
  beadDoubleSlidingM: number;
  /** إجمالي الباكتة */
  beadM: number;
  /** مساحة الزجاج الفعلية م² (بدون بنل) */
  glassAreaSqm: number;
  /** مساحة السلك م² */
  meshAreaSqm: number;
  /** قطاع ضلفة سلك جرار — متر طولي (نفس مقاس ضلفة الجرار) */
  meshSlidingProfileM: number;
  /** عدد ضلف السلك الجرار */
  meshSlidingSashCount: number;
  /** عجل سلك جرار — ٢ لكل ضلفة */
  meshSlidingWheelQty: number;
  /** مقبض سلك لطش — ١ لكل ضلفة */
  meshPushHandleQty: number;
  /** تقابل ٤ ضلفة جرار — عدد القطع */
  fourLeafMeetingQty: number;
  /** تقابل ٤ ضلفة — متر طولي (ارتفاع الضلفة) */
  fourLeafMeetingM: number;
  /** تقابل سلك جرار — عدد القطع */
  meshMeetingQty: number;
  /** تقابل سلك جرار — متر طولي */
  meshMeetingM: number;
  /** إجمالي الحلق */
  frameTotalM: number;
  /** إجمالي السوقاس */
  mullionTotalM: number;
  /** هل الشباك فيه مفصلي وجرار معاً */
  isMixedFrame: boolean;
  /** ملخص نوع الحلق للعرض */
  frameLabel: string;
};

type PaneBox = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: FrameKind;
  opening: PaneOpening;
  bouclier: boolean;
};

type EdgeKey = string;

type JunctionTotals = {
  mullionMm: number;
  couplingMm: number;
  bouclierMm: number;
};

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

function mmToM(mm: number) {
  return Math.max(0, mm) / 1000;
}

function roundM(m: number) {
  return Math.round(m * 1000) / 1000;
}

function emptyBreakdown(areaSqm: number): MaterialsBreakdown {
  return {
    areaSqm,
    frameHingedM: 0,
    frameSlidingM: 0,
    couplingM: 0,
    knifeM: 0,
    bouclierM: 0,
    bouclierCapQty: 0,
    bouclierCapM: 0,
    mullionFrameM: 0,
    mullionSashM: 0,
    sashHingedM: 0,
    sashDoorM: 0,
    sashSlidingM: 0,
    beadSingleHingedM: 0,
    beadSingleSlidingM: 0,
    beadDoubleHingedM: 0,
    beadDoubleSlidingM: 0,
    beadM: 0,
    glassAreaSqm: 0,
    meshAreaSqm: 0,
    meshSlidingProfileM: 0,
    meshSlidingSashCount: 0,
    meshSlidingWheelQty: 0,
    meshPushHandleQty: 0,
    fourLeafMeetingQty: 0,
    fourLeafMeetingM: 0,
    meshMeetingQty: 0,
    meshMeetingM: 0,
    frameTotalM: 0,
    mullionTotalM: 0,
    isMixedFrame: false,
    frameLabel: "مفصلي",
  };
}

/** جرار/سحاب → حلق جرار، الباقي → حلق مفصلي */
export function frameKindForOpening(opening: PaneOpening): FrameKind {
  if (
    opening === "sliding-left" ||
    opening === "sliding-right" ||
    opening === "drawer-left" ||
    opening === "drawer-right"
  ) {
    return "sliding";
  }
  return "hinged";
}

function isOpeningSash(opening: PaneOpening): boolean {
  return opening !== "fixed" && opening !== "exhaust";
}

function isHingedOpening(opening: PaneOpening): boolean {
  return frameKindForOpening(opening) === "hinged" && isOpeningSash(opening);
}

function panePerimeterMm(w: number, h: number): number {
  return 2 * (w + h);
}

function cellPerimeterMm(cell: { w: number; h: number }): number {
  return 2 * (cell.w + cell.h);
}

type BeadTotalsMm = {
  singleHingedMm: number;
  singleSlidingMm: number;
  doubleHingedMm: number;
  doubleSlidingMm: number;
};

function addBeadMm(
  totals: BeadTotalsMm,
  isSliding: boolean,
  isDouble: boolean,
  mm: number
) {
  if (mm <= 0) return;
  if (isDouble) {
    if (isSliding) totals.doubleSlidingMm += mm;
    else totals.doubleHingedMm += mm;
  } else {
    if (isSliding) totals.singleSlidingMm += mm;
    else totals.singleHingedMm += mm;
  }
}

/** باكتة حسب نوع الزجاج (سنجل/دبل) ونوع الضلفة — البنل باكتة دبل */
function beadTotalsMm(
  boxes: PaneBox[],
  panes: Record<string, PaneConfig> | undefined,
  item: DesignItem,
  catalog?: MaterialCatalog
): BeadTotalsMm {
  const cat =
    catalog ??
    (typeof window !== "undefined" ? loadMaterialCatalog() : undefined);
  const totals: BeadTotalsMm = {
    singleHingedMm: 0,
    singleSlidingMm: 0,
    doubleHingedMm: 0,
    doubleSlidingMm: 0,
  };

  for (const box of boxes) {
    const cfg = normalizePaneConfig(panes?.[box.id]);
    if (isExhaustPane(box.opening)) continue;
    if (meshReplacesPaneGlass(cfg, box.opening, cat)) continue;

    const isSliding = box.kind === "sliding";
    const isDoubleGlass = Boolean(resolvePaneGlass(cfg, item, cat).pane2Id);
    const grid = cfg.grid ?? "solid";
    const cells = getGridCells(grid, 0, 0, box.w, box.h);
    const panelSet = new Set(cfg.panelCells ?? []);
    const hasPanels = Boolean(cfg.sandwichPanels);
    const isLouver =
      box.opening === "panel-h" || box.opening === "panel-v";

    if (isLouver) {
      addBeadMm(totals, isSliding, true, panePerimeterMm(box.w, box.h));
      continue;
    }

    const solidFullPanel =
      hasPanels &&
      (grid === "solid" || grid === "diamond") &&
      panelSet.has(0);
    const allCellsPanel =
      hasPanels && cells.every((_, i) => panelSet.has(i));

    if (solidFullPanel || allCellsPanel) {
      addBeadMm(totals, isSliding, true, panePerimeterMm(box.w, box.h));
      continue;
    }

    if (hasPanels && cells.length > 1) {
      cells.forEach((cell, i) => {
        const peri = cellPerimeterMm(cell);
        if (panelSet.has(i)) {
          addBeadMm(totals, isSliding, true, peri);
        } else {
          addBeadMm(totals, isSliding, isDoubleGlass, peri);
        }
      });
      continue;
    }

    addBeadMm(
      totals,
      isSliding,
      isDoubleGlass,
      panePerimeterMm(box.w, box.h)
    );
  }

  return totals;
}

/** ضلفة باب — من العلامة أو نوع الفتح door-left / door-right */
export function isDoorPane(opening: PaneOpening, cfg: PaneConfig): boolean {
  if (cfg.isDoor) return true;
  return opening === "door-left" || opening === "door-right";
}

/**
 * ضلفتين المقابض في وش بعض:
 * يمين-يفتح-لليمين على شمال جهة اليسار + شمال-يفتح-للشمال على يمين جهة اليمين
 * (مفصلي/باب/قلب وضلفة)
 */
export function areFacingHandles(
  leftOpening: PaneOpening,
  rightOpening: PaneOpening
): boolean {
  const leftFacesIn =
    leftOpening === "casement-right" ||
    leftOpening === "door-right" ||
    leftOpening === "tilt-turn";
  const rightFacesIn =
    rightOpening === "casement-left" ||
    rightOpening === "door-left" ||
    rightOpening === "tilt-turn-left";
  return leftFacesIn && rightFacesIn;
}

function paneOpening(
  id: string,
  panes: Record<string, PaneConfig> | undefined
): PaneOpening {
  return (panes?.[id]?.opening ?? "fixed") as PaneOpening;
}

function paneBouclier(
  id: string,
  panes: Record<string, PaneConfig> | undefined
): boolean {
  return Boolean(normalizePaneConfig(panes?.[id]).bouclier);
}

function collectPaneBoxes(
  node: LayoutNode,
  x: number,
  y: number,
  w: number,
  h: number,
  panes: Record<string, PaneConfig> | undefined,
  out: PaneBox[]
) {
  if (node.type === "empty") return;
  if (node.type === "pane") {
    const opening = paneOpening(node.id, panes);
    out.push({
      id: node.id,
      x,
      y,
      w,
      h,
      kind: frameKindForOpening(opening),
      opening,
      bouclier: paneBouclier(node.id, panes),
    });
    return;
  }

  const total = sum(node.ratios) || 1;
  let offset = 0;
  node.children.forEach((child, i) => {
    const portion = node.ratios[i]! / total;
    if (node.dir === "v") {
      const cw = w * portion;
      collectPaneBoxes(child, x + offset, y, cw, h, panes, out);
      offset += cw;
    } else {
      const ch = h * portion;
      collectPaneBoxes(child, x, y + offset, w, ch, panes, out);
      offset += ch;
    }
  });
}

/** طول التماس المشترك بين صندوقين (إن وُجد) */
function sharedEdgeMm(
  a: PaneBox,
  b: PaneBox
): { len: number; vertical: boolean } | null {
  const eps = 0.5;

  const aRight = a.x + a.w;
  const bRight = b.x + b.w;
  if (Math.abs(aRight - b.x) < eps || Math.abs(bRight - a.x) < eps) {
    const y1 = Math.max(a.y, b.y);
    const y2 = Math.min(a.y + a.h, b.y + b.h);
    const overlap = y2 - y1;
    if (overlap > eps) return { len: overlap, vertical: true };
  }

  const aBottom = a.y + a.h;
  const bBottom = b.y + b.h;
  if (Math.abs(aBottom - b.y) < eps || Math.abs(bBottom - a.y) < eps) {
    const x1 = Math.max(a.x, b.x);
    const x2 = Math.min(a.x + a.w, b.x + b.w);
    const overlap = x2 - x1;
    if (overlap > eps) return { len: overlap, vertical: false };
  }

  return null;
}

function edgeKey(
  a: PaneBox,
  b: PaneBox,
  vertical: boolean,
  len: number
): EdgeKey {
  if (vertical) {
    const x = Math.round(Math.min(a.x + a.w, b.x + b.w, Math.max(a.x, b.x)));
    const y1 = Math.round(Math.max(a.y, b.y));
    return `v:${x}:${y1}:${Math.round(len)}`;
  }
  const y = Math.round(Math.min(a.y + a.h, b.y + b.h, Math.max(a.y, b.y)));
  const x1 = Math.round(Math.max(a.x, b.x));
  return `h:${y}:${x1}:${Math.round(len)}`;
}

function aabbOf(
  boxes: PaneBox[]
): { x: number; y: number; w: number; h: number } | null {
  if (boxes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function isFullyEmpty(node: LayoutNode): boolean {
  if (node.type === "empty") return true;
  if (node.type === "pane") return false;
  return node.children.every(isFullyEmpty);
}

/** أنواع الحلق داخل عقدة */
function kindsInNode(
  node: LayoutNode,
  panes: Record<string, PaneConfig> | undefined,
  out: Set<FrameKind>
) {
  if (node.type === "empty") return;
  if (node.type === "pane") {
    out.add(frameKindForOpening(paneOpening(node.id, panes)));
    return;
  }
  for (const child of node.children) kindsInNode(child, panes, out);
}

function regionKind(
  node: LayoutNode,
  panes: Record<string, PaneConfig> | undefined
): FrameKind | "mixed" | "empty" {
  const kinds = new Set<FrameKind>();
  kindsInNode(node, panes, kinds);
  if (kinds.size === 0) return "empty";
  if (kinds.size > 1) return "mixed";
  return [...kinds][0]!;
}

/** أقصى يمين/شمال/فوق/تحت ضلفة ورقة داخل عقدة */
function edgePaneId(
  node: LayoutNode,
  side: "left" | "right" | "top" | "bottom"
): string | undefined {
  if (node.type === "empty") return undefined;
  if (node.type === "pane") return node.id;
  if (node.children.length === 0) return undefined;

  if (side === "left" || side === "right") {
    if (node.dir === "v") {
      const idx = side === "left" ? 0 : node.children.length - 1;
      return edgePaneId(node.children[idx]!, side);
    }
    for (const child of node.children) {
      const id = edgePaneId(child, side);
      if (id) return id;
    }
    return undefined;
  }

  if (node.dir === "h") {
    const idx = side === "top" ? 0 : node.children.length - 1;
    return edgePaneId(node.children[idx]!, side);
  }
  for (const child of node.children) {
    const id = edgePaneId(child, side);
    if (id) return id;
  }
  return undefined;
}

/**
 * تصنيف خط التقسيم بين جزئين متجاورين.
 * - مقابض في وش بعض → بوكلير (مش سوقاس)
 * - ضلفة بوكلير ثابتة على الحافة → بوكلير
 * - مفصلي×جرار → كوبلن
 * - غير كده → سوقاس
 *
 * ملاحظة: السكينة تُحسب لكل ضلفة جرار على حدة (مش عند خط التقسيم).
 */
export function classifyJunction(
  left: LayoutNode,
  right: LayoutNode,
  dir: "v" | "h",
  panes: Record<string, PaneConfig> | undefined
): JunctionKind {
  if (isFullyEmpty(left) || isFullyEmpty(right)) return "none";

  if (dir === "v") {
    const leftId = edgePaneId(left, "right");
    const rightId = edgePaneId(right, "left");
    if (leftId && rightId) {
      const leftOp = paneOpening(leftId, panes);
      const rightOp = paneOpening(rightId, panes);

      if (areFacingHandles(leftOp, rightOp)) {
        return "bouclier";
      }

      // ضلفة ثابتة بوكلير بين مفصليين — الخطوط حواليها بوكلير مش سوقاس
      if (paneBouclier(leftId, panes) || paneBouclier(rightId, panes)) {
        return "bouclier";
      }
    }
  }

  const leftKind = regionKind(left, panes);
  const rightKind = regionKind(right, panes);
  if (
    (leftKind === "hinged" && rightKind === "sliding") ||
    (leftKind === "sliding" && rightKind === "hinged")
  ) {
    return "coupling";
  }

  return "mullion";
}

/**
 * يمشي على شجرة التقسيم ويجمع أطوال:
 * سوقاس / بوكلير / كوبلن
 *
 * ملاحظة: لو في ضلفة بوكلير ثابتة، بنحسب ارتفاعها مرة واحدة
 * ومش بنضاعف الخطوط على جنبيها.
 */
function collectJunctions(
  node: LayoutNode,
  w: number,
  h: number,
  panes: Record<string, PaneConfig> | undefined,
  out: JunctionTotals,
  countedBouclierPanes: Set<string>
) {
  if (node.type !== "split") return;

  const total = sum(node.ratios) || 1;
  const sizes = node.ratios.map(
    (r) => ((node.dir === "v" ? w : h) * r) / total
  );

  node.children.forEach((child, i) => {
    const size = sizes[i]!;
    const childW = node.dir === "v" ? size : w;
    const childH = node.dir === "h" ? size : h;
    collectJunctions(child, childW, childH, panes, out, countedBouclierPanes);

    // ضلفة بوكلير ثابتة → طولها = ارتفاعها (مرة واحدة)
    if (child.type === "pane" && paneBouclier(child.id, panes)) {
      if (!countedBouclierPanes.has(child.id)) {
        countedBouclierPanes.add(child.id);
        out.bouclierMm += childH;
      }
    }

    if (i >= node.children.length - 1) return;
    const next = node.children[i + 1]!;
    const kind = classifyJunction(child, next, node.dir, panes);
    if (kind === "none") return;

    const span = node.dir === "v" ? h : w;

    if (kind === "mullion") {
      out.mullionMm += span;
      return;
    }
    if (kind === "coupling") {
      out.couplingMm += span;
      return;
    }
    if (kind === "bouclier") {
      // لو الخط على جنب ضلفة بوكلير ثابتة، الطول اتحسب من الضلفة نفسها
      const touchesFixedBouclier =
        (child.type === "pane" && paneBouclier(child.id, panes)) ||
        (next.type === "pane" && paneBouclier(next.id, panes));
      if (!touchesFixedBouclier) {
        out.bouclierMm += span;
      }
    }
  });
}

/** سوقاس داخل الضلفة من التقسيم الداخلي */
function sashMullionMm(
  boxes: PaneBox[],
  panes: Record<string, PaneConfig> | undefined
): number {
  let total = 0;
  for (const box of boxes) {
    if (isExhaustPane(box.opening)) continue;
    // ضلفة البوكلير الثابتة مش بتتقسم بسوقاس داخلي للخامات دي
    if (box.bouclier) continue;
    const grid = normalizePaneConfig(panes?.[box.id]).grid ?? "solid";
    if (grid === "solid") continue;
    const lines = gridLines(grid, 0, 0, box.w, box.h);
    for (const line of lines) {
      const dx = line.x2 - line.x1;
      const dy = line.y2 - line.y1;
      total += Math.hypot(dx, dy);
    }
  }
  return total;
}

/** مقاسات القطع بعد تخصيم نظام القطاعات */
function profileCutsFor(
  w: number,
  h: number,
  deductions?: ProfileDeductions | null
): { frameW: number; frameH: number; sashW: number; sashH: number } {
  if (!deductions) {
    return { frameW: w, frameH: h, sashW: w, sashH: h };
  }
  const cuts = calcCutSizes(w, h, deductions);
  return {
    frameW: cuts.frameWidthMm,
    frameH: cuts.frameHeightMm,
    sashW: cuts.sashWidthMm,
    sashH: cuts.sashHeightMm,
  };
}

/** طول سكينة ضلفة جرار واحدة — بعد تخصيم ارتفاع الضلفة */
function knifeLengthForSlidingSash(
  box: PaneBox,
  deductions?: ProfileDeductions | null
): number {
  if (!deductions) return box.h;
  return profileCutsFor(box.w, box.h, deductions).sashH;
}

/** سكينة — قطعة واحدة لكل ضلفة جرار متحركة */
function slidingKnifeProfileMm(
  boxes: PaneBox[],
  deductions?: ProfileDeductions | null
): number {
  let total = 0;
  for (const box of boxes) {
    if (box.kind !== "sliding") continue;
    if (!isOpeningSash(box.opening)) continue;
    total += knifeLengthForSlidingSash(box, deductions);
  }
  return total;
}

function isSlidingOpening(opening: PaneOpening): boolean {
  return frameKindForOpening(opening) === "sliding" && isOpeningSash(opening);
}

/** بارز/غاطس الافتراضي حسب موقع الضلفة في صف الجرار */
export function defaultSlidingSashDepth(
  rowLength: number,
  indexInRow: number
): SlidingSashDepth {
  if (rowLength === 1) return "recessed";
  return indexInRow % 2 === 0 ? "protruding" : "recessed";
}

/** يحدد بارز/غاطس لضلفة جرار — يدوي أو تلقائي من الصف */
export function resolveSlidingSashDepth(
  box: { id: string; opening: PaneOpening },
  rowLength: number,
  indexInRow: number,
  panes?: Record<string, PaneConfig>
): SlidingSashDepth {
  const cfg = normalizePaneConfig(panes?.[box.id]);
  if (cfg.sashDepthManual && cfg.sashDepth) {
    return cfg.sashDepth;
  }
  return defaultSlidingSashDepth(rowLength, indexInRow);
}

/** خريطة بارز/غاطس لكل ضلفة جرار في البند */
export function slidingSashDepthMap(
  boxes: PaneBox[],
  panes?: Record<string, PaneConfig>
): Map<string, SlidingSashDepth> {
  const map = new Map<string, SlidingSashDepth>();
  for (const row of slidingRowGroups(boxes)) {
    row.forEach((box, i) => {
      map.set(box.id, resolveSlidingSashDepth(box, row.length, i, panes));
    });
  }
  return map;
}

/** مجموعات ضلف الجرار المتجاورة أفقياً في نفس الصف */
function slidingRowGroups(boxes: PaneBox[]): PaneBox[][] {
  const sliding = boxes
    .filter((b) => isSlidingOpening(b.opening))
    .sort((a, b) => a.y - b.y || a.x - b.x);
  if (sliding.length === 0) return [];

  const rows: PaneBox[][] = [];
  for (const box of sliding) {
    const row = rows.find(
      (r) => Math.abs(r[0]!.y - box.y) < 2 && Math.abs(r[0]!.h - box.h) < 2
    );
    if (row) row.push(box);
    else rows.push([box]);
  }
  return rows.map((r) => r.sort((a, b) => a.x - b.x));
}

/** مجموعات سلك جرار في نفس الفتحة (صف أفقي) */
function meshSlidingRowGroups(
  boxes: PaneBox[],
  panes: Record<string, PaneConfig> | undefined,
  catalog?: MaterialCatalog
): PaneBox[][] {
  const meshBoxes: PaneBox[] = [];
  for (const box of boxes) {
    const cfg = normalizePaneConfig(panes?.[box.id]);
    if (!cfg.mesh) continue;
    const kind = resolvePaneMeshKind(cfg, box.opening, catalog);
    if (!meshCategoryCalcProfile(kind, catalog)) continue;
    meshBoxes.push(box);
  }

  meshBoxes.sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: PaneBox[][] = [];
  for (const box of meshBoxes) {
    const row = rows.find(
      (r) => Math.abs(r[0]!.y - box.y) < 2 && Math.abs(r[0]!.h - box.h) < 2
    );
    if (row) row.push(box);
    else rows.push([box]);
  }
  return rows.map((r) => r.sort((a, b) => a.x - b.x));
}

/** طبة بوكلير — قطعة واحدة بارتفاع الضلفة (بعد التخصيم) لكل بوكلير صالح */
function bouclierCapStats(
  boxes: PaneBox[],
  deductions?: ProfileDeductions | null
): { qty: number; lengthMm: number } {
  const hinged = boxes.filter((b) => isHingedOpening(b.opening));
  const boucliers = boxes.filter((b) => b.bouclier && b.opening === "fixed");
  let qty = 0;
  let lengthMm = 0;

  for (const mid of boucliers) {
    const left = hinged
      .filter(
        (b) =>
          Math.abs(b.y - mid.y) < 2 &&
          Math.abs(b.h - mid.h) < 2 &&
          Math.abs(b.x + b.w - mid.x) < 3
      )
      .sort((a, b) => b.x - a.x)[0];
    const right = hinged
      .filter(
        (b) =>
          Math.abs(b.y - mid.y) < 2 &&
          Math.abs(b.h - mid.h) < 2 &&
          Math.abs(mid.x + mid.w - b.x) < 3
      )
      .sort((a, b) => a.x - b.x)[0];

    if (!left || !right) continue;
    if (!areFacingHandles(left.opening, right.opening)) continue;
    qty += 1;
    const cuts = profileCutsFor(mid.w, mid.h, deductions);
    lengthMm += cuts.sashH > 0 ? cuts.sashH : mid.h;
  }
  return { qty, lengthMm };
}

/** تقابل ٤ ضلفة جرار — قطعة واحدة بارتفاع الضلفة (بعد التخصيم) لكل صف فيه ٤+ ضلف */
function fourLeafMeetingStats(
  boxes: PaneBox[],
  deductions?: ProfileDeductions | null
): {
  qty: number;
  lengthMm: number;
} {
  let qty = 0;
  let lengthMm = 0;
  for (const row of slidingRowGroups(boxes)) {
    if (row.length < 4) continue;
    qty += 1;
    const first = row[0]!;
    const cuts = profileCutsFor(first.w, first.h, deductions);
    lengthMm += cuts.sashH > 0 ? cuts.sashH : first.h;
  }
  return { qty, lengthMm };
}

/** تقابل سلك جرار — ضلفتين سلك في نفس الفتحة */
function meshMeetingStats(
  boxes: PaneBox[],
  panes: Record<string, PaneConfig> | undefined,
  catalog?: MaterialCatalog
): { qty: number; lengthMm: number } {
  let qty = 0;
  let lengthMm = 0;
  for (const row of meshSlidingRowGroups(boxes, panes, catalog)) {
    if (row.length < 2) continue;
    qty += 1;
    lengthMm += row[0]!.h;
  }
  return { qty, lengthMm };
}

/** محيط قطاع الضلفة لكل ضلفة متحركة — بعد تخصيم الضلفة من نظام القطاعات */
function sashProfileMm(
  boxes: PaneBox[],
  panes: Record<string, PaneConfig> | undefined,
  catalog?: MaterialCatalog,
  deductions?: ProfileDeductions | null
): {
  hinged: number;
  sliding: number;
  door: number;
} {
  const cat =
    catalog ??
    (typeof window !== "undefined" ? loadMaterialCatalog() : undefined);
  let hinged = 0;
  let sliding = 0;
  let door = 0;
  for (const box of boxes) {
    if (!isOpeningSash(box.opening)) continue;
    const cfg = normalizePaneConfig(panes?.[box.id]);
    if (meshReplacesPaneGlass(cfg, box.opening, cat)) continue;
    const cuts = profileCutsFor(box.w, box.h, deductions);
    const peri = panePerimeterMm(cuts.sashW, cuts.sashH);
    if (box.kind === "sliding") {
      sliding += peri;
      continue;
    }
    if (isDoorPane(box.opening, cfg)) door += peri;
    else hinged += peri;
  }
  return { hinged, sliding, door };
}

/** مساحة ملء الضلفة (زجاج أو سلك) بدون بنل — مم² */
function paneFillAreaMm2(
  w: number,
  h: number,
  opening: PaneOpening,
  cfg: PaneConfig
): number {
  if (isExhaustPane(opening)) return 0;
  if (opening === "panel-h" || opening === "panel-v") return 0;
  const norm = normalizePaneConfig(cfg);
  const grid = norm.grid ?? "solid";
  const cells = getGridCells(grid, 0, 0, w, h);
  const panelSet = new Set(norm.panelCells ?? []);

  let mm2 = 0;
  cells.forEach((cell, i) => {
    if (norm.sandwichPanels && panelSet.has(i)) return;
    mm2 += cell.w * cell.h;
  });
  return mm2;
}

/** ضلفة سلك جرار (قطاع) — السلك يستبدل الزجاج. باقي الأنواع سلك فوق الزجاج */
export function meshReplacesPaneGlass(
  cfg: PaneConfig,
  opening: PaneOpening,
  catalog?: MaterialCatalog
): boolean {
  const norm = normalizePaneConfig(cfg);
  if (!norm.mesh) return false;
  const cat =
    catalog ??
    (typeof window !== "undefined" ? loadMaterialCatalog() : undefined);
  const kind = resolvePaneMeshKind(norm, opening, cat);
  return meshCategoryCalcProfile(kind, cat);
}

/** مساحة الزجاج الفعلية داخل الضلفة (مم²) — بدون بنل */
function paneGlassAreaMm2(
  w: number,
  h: number,
  opening: PaneOpening,
  cfg: PaneConfig,
  catalog?: MaterialCatalog
): number {
  if (isExhaustPane(opening)) return 0;
  if (meshReplacesPaneGlass(cfg, opening, catalog)) return 0;
  return paneFillAreaMm2(w, h, opening, cfg);
}

/** مساحة السلك داخل الضلفة (مم²) */
function paneMeshAreaMm2(
  w: number,
  h: number,
  opening: PaneOpening,
  cfg: PaneConfig
): number {
  const norm = normalizePaneConfig(cfg);
  if (!norm.mesh) return 0;
  return paneFillAreaMm2(w, h, opening, cfg);
}

/** قطاع ضلفة سلك جرار — محيط الضلفة لما السلك نوعه جرار */
const MESH_SLIDING_WHEELS_PER_SASH = 2;
const MESH_PUSH_HANDLE_PER_SASH = 1;

function slidingMeshSashStats(
  boxes: PaneBox[],
  panes: Record<string, PaneConfig> | undefined,
  catalog?: MaterialCatalog
): { sashCount: number; profileMm: number } {
  const cat =
    catalog ??
    (typeof window !== "undefined" ? loadMaterialCatalog() : undefined);
  let sashCount = 0;
  let profileMm = 0;
  for (const box of boxes) {
    const cfg = normalizePaneConfig(panes?.[box.id]);
    if (!cfg.mesh) continue;
    const kind = resolvePaneMeshKind(cfg, box.opening, cat);
    if (!meshCategoryCalcProfile(kind, cat)) continue;
    sashCount += 1;
    profileMm += panePerimeterMm(box.w, box.h);
  }
  return { sashCount, profileMm };
}

function meshSlidingProfileMm(
  boxes: PaneBox[],
  panes: Record<string, PaneConfig> | undefined,
  catalog?: MaterialCatalog
): number {
  return slidingMeshSashStats(boxes, panes, catalog).profileMm;
}

function totalMeshAreaSqm(
  boxes: PaneBox[],
  panes: Record<string, PaneConfig> | undefined
): number {
  let mm2 = 0;
  for (const box of boxes) {
    const cfg = normalizePaneConfig(panes?.[box.id]);
    if (!cfg.mesh) continue;
    mm2 += paneMeshAreaMm2(box.w, box.h, box.opening, cfg);
  }
  return roundM(mm2 / 1_000_000);
}

function totalGlassAreaSqm(
  boxes: PaneBox[],
  panes: Record<string, PaneConfig> | undefined
): number {
  let mm2 = 0;
  for (const box of boxes) {
    const cfg = normalizePaneConfig(panes?.[box.id]);
    mm2 += paneGlassAreaMm2(box.w, box.h, box.opening, cfg);
  }
  return roundM(mm2 / 1_000_000);
}

function frameLabelFor(
  hingedM: number,
  slidingM: number,
  couplingM: number
): string {
  const hasH = hingedM > 0.0005;
  const hasS = slidingM > 0.0005;
  if (hasH && hasS) {
    return couplingM > 0.0005 ? "مفصلي + جرار (كوبلن)" : "مفصلي + جرار";
  }
  if (hasS) return "جرار";
  return "مفصلي";
}

/**
 * حساب خامات البند (للقطعة الواحدة — بدون ضرب الكمية).
 * الحلق: مفصلي أو جرار، ولو الاتنين موجودين يتحسب كوبلن عند خط الالتقاء.
 * السكينة: قطعة واحدة لكل ضلفة جرار متحركة.
 * مقابض في وش بعض: بوكلير (مش سوقاس).
 * السوقاس: باقي تقسيم الحلق + تقسيم الضلفة.
 *
 * أطوال الحلق/الضلفة/السكينة/التقابل تُحسب بعد تخصيم نظام القطاعات
 * (نفس معادلات مقاس القطع) عشان التسعير يطابق الاستهلاك الفعلي.
 */
export function calcItemMaterials(
  item: DesignItem,
  catalog?: MaterialCatalog
): MaterialsBreakdown {
  const widthMm = Math.max(0, item.widthMm || 0);
  const heightMm = Math.max(0, item.heightMm || 0);
  const areaSqm = itemUnitAreaSqm(item);
  const layout: LayoutNode =
    item.layout ?? ({ type: "pane", id: "root" } as LayoutNode);
  const panes = item.panes;

  const boxes: PaneBox[] = [];
  collectPaneBoxes(layout, 0, 0, widthMm, heightMm, panes, boxes);

  if (boxes.length === 0 || widthMm <= 0 || heightMm <= 0) {
    return emptyBreakdown(areaSqm);
  }

  const cat =
    catalog ??
    (typeof window !== "undefined" ? loadMaterialCatalog() : undefined);
  const profileDetails =
    item.systemId && item.systemId !== "none"
      ? findSystem("profiles", item.systemId, cat)?.profile
      : undefined;
  const deductions = profileDetails?.deductions ?? null;

  const hingedBoxes = boxes.filter((b) => b.kind === "hinged");
  const slidingBoxes = boxes.filter((b) => b.kind === "sliding");
  const hasHinged = hingedBoxes.length > 0;
  const hasSliding = slidingBoxes.length > 0;
  const isMixedFrame = hasHinged && hasSliding;

  let frameHingedMm = 0;
  let frameSlidingMm = 0;

  const junctions: JunctionTotals = {
    mullionMm: 0,
    couplingMm: 0,
    bouclierMm: 0,
  };
  collectJunctions(
    layout,
    widthMm,
    heightMm,
    panes,
    junctions,
    new Set()
  );

  // كوبلن إضافي من تماس الصناديق (لو التقسيم أعقد من split مباشر)
  if (isMixedFrame) {
    const seen = new Set<EdgeKey>();
    let boxCoupling = 0;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        if (a.kind === b.kind) continue;
        const shared = sharedEdgeMm(a, b);
        if (!shared) continue;
        const key = edgeKey(a, b, shared.vertical, shared.len);
        if (seen.has(key)) continue;
        seen.add(key);
        boxCoupling += shared.len;
      }
    }
    // خُد الأكبر عشان متعملش نقص لو الـ walk غطّى نفس الخط
    junctions.couplingMm = Math.max(junctions.couplingMm, boxCoupling);
  }

  if (!isMixedFrame) {
    const cuts = profileCutsFor(widthMm, heightMm, deductions);
    const peri = 2 * (cuts.frameW + cuts.frameH);
    if (hasSliding) frameSlidingMm = peri;
    else frameHingedMm = peri;
  } else {
    const hingedAabb = aabbOf(hingedBoxes);
    const slidingAabb = aabbOf(slidingBoxes);
    const couplingMm = junctions.couplingMm;
    if (hingedAabb) {
      const hCuts = profileCutsFor(hingedAabb.w, hingedAabb.h, deductions);
      frameHingedMm = 2 * (hCuts.frameW + hCuts.frameH) - couplingMm;
    }
    if (slidingAabb) {
      const sCuts = profileCutsFor(slidingAabb.w, slidingAabb.h, deductions);
      frameSlidingMm = 2 * (sCuts.frameW + sCuts.frameH) - couplingMm;
    }
    frameHingedMm = Math.max(0, frameHingedMm);
    frameSlidingMm = Math.max(0, frameSlidingMm);
  }

  // سوقاس/بوكلير/كوبلن: أطوال التقسيم من اللليآوت (مقاس الفتحة).
  // الحلق والضلفة والسكينة والتقابل بتاخد مقاس القطع بعد التخصيم.

  const mullionSashMm = sashMullionMm(boxes, panes);
  const sashMm = sashProfileMm(boxes, panes, cat, deductions);
  const beadMm = beadTotalsMm(boxes, panes, item, cat);
  const glassAreaSqm = totalGlassAreaSqm(boxes, panes);
  const meshAreaSqm = totalMeshAreaSqm(boxes, panes);
  const slidingMesh = slidingMeshSashStats(boxes, panes, cat);
  const meshSlidingProfileM = roundM(mmToM(slidingMesh.profileMm));
  const meshSlidingSashCount = slidingMesh.sashCount;
  const meshSlidingWheelQty = meshSlidingSashCount * MESH_SLIDING_WHEELS_PER_SASH;
  const meshPushHandleQty = meshSlidingSashCount * MESH_PUSH_HANDLE_PER_SASH;
  const fourLeafMeeting = fourLeafMeetingStats(boxes, deductions);
  const meshMeeting = meshMeetingStats(boxes, panes, cat);
  const fourLeafMeetingM = roundM(mmToM(fourLeafMeeting.lengthMm));
  const meshMeetingM = roundM(mmToM(meshMeeting.lengthMm));
  const bouclierCap = bouclierCapStats(boxes, deductions);
  const bouclierCapM = roundM(mmToM(bouclierCap.lengthMm));

  const frameHingedM = roundM(mmToM(frameHingedMm));
  const frameSlidingM = roundM(mmToM(frameSlidingMm));
  const couplingM = roundM(mmToM(junctions.couplingMm));
  const knifeM = roundM(mmToM(slidingKnifeProfileMm(boxes, deductions)));
  const bouclierM = roundM(mmToM(junctions.bouclierMm));
  const mullionFrameM = roundM(mmToM(junctions.mullionMm));
  const mullionSashM = roundM(mmToM(mullionSashMm));
  const sashHingedM = roundM(mmToM(sashMm.hinged));
  const sashDoorM = roundM(mmToM(sashMm.door));
  const sashSlidingM = roundM(mmToM(sashMm.sliding));
  const beadSingleHingedM = roundM(mmToM(beadMm.singleHingedMm));
  const beadSingleSlidingM = roundM(mmToM(beadMm.singleSlidingMm));
  const beadDoubleHingedM = roundM(mmToM(beadMm.doubleHingedMm));
  const beadDoubleSlidingM = roundM(mmToM(beadMm.doubleSlidingMm));
  const beadM = roundM(
    beadSingleHingedM +
      beadSingleSlidingM +
      beadDoubleHingedM +
      beadDoubleSlidingM
  );
  const frameTotalM = roundM(frameHingedM + frameSlidingM);
  const mullionTotalM = roundM(mullionFrameM + mullionSashM);

  return {
    areaSqm: roundM(areaSqm),
    frameHingedM,
    frameSlidingM,
    couplingM,
    knifeM,
    bouclierM,
    bouclierCapQty: bouclierCap.qty,
    bouclierCapM,
    mullionFrameM,
    mullionSashM,
    sashHingedM,
    sashDoorM,
    sashSlidingM,
    beadSingleHingedM,
    beadSingleSlidingM,
    beadDoubleHingedM,
    beadDoubleSlidingM,
    beadM,
    glassAreaSqm,
    meshAreaSqm,
    meshSlidingProfileM,
    meshSlidingSashCount,
    meshSlidingWheelQty,
    meshPushHandleQty,
    fourLeafMeetingQty: fourLeafMeeting.qty,
    fourLeafMeetingM,
    meshMeetingQty: meshMeeting.qty,
    meshMeetingM,
    frameTotalM,
    mullionTotalM,
    isMixedFrame,
    frameLabel: frameLabelFor(frameHingedM, frameSlidingM, couplingM),
  };
}

/** يضرب القيم الطولية والمساحة في كمية البند */
export function scaleMaterials(
  m: MaterialsBreakdown,
  qty: number
): MaterialsBreakdown {
  const q = Math.max(1, qty || 1);
  if (q === 1) return m;
  return {
    ...m,
    areaSqm: roundM(m.areaSqm * q),
    frameHingedM: roundM(m.frameHingedM * q),
    frameSlidingM: roundM(m.frameSlidingM * q),
    couplingM: roundM(m.couplingM * q),
    knifeM: roundM(m.knifeM * q),
    bouclierM: roundM(m.bouclierM * q),
    bouclierCapQty: m.bouclierCapQty * q,
    bouclierCapM: roundM(m.bouclierCapM * q),
    mullionFrameM: roundM(m.mullionFrameM * q),
    mullionSashM: roundM(m.mullionSashM * q),
    sashHingedM: roundM(m.sashHingedM * q),
    sashDoorM: roundM(m.sashDoorM * q),
    sashSlidingM: roundM(m.sashSlidingM * q),
    beadSingleHingedM: roundM(m.beadSingleHingedM * q),
    beadSingleSlidingM: roundM(m.beadSingleSlidingM * q),
    beadDoubleHingedM: roundM(m.beadDoubleHingedM * q),
    beadDoubleSlidingM: roundM(m.beadDoubleSlidingM * q),
    beadM: roundM(m.beadM * q),
    glassAreaSqm: roundM(m.glassAreaSqm * q),
    meshAreaSqm: roundM(m.meshAreaSqm * q),
    meshSlidingProfileM: roundM(m.meshSlidingProfileM * q),
    meshSlidingSashCount: m.meshSlidingSashCount * q,
    meshSlidingWheelQty: m.meshSlidingWheelQty * q,
    meshPushHandleQty: m.meshPushHandleQty * q,
    fourLeafMeetingQty: m.fourLeafMeetingQty * q,
    fourLeafMeetingM: roundM(m.fourLeafMeetingM * q),
    meshMeetingQty: m.meshMeetingQty * q,
    meshMeetingM: roundM(m.meshMeetingM * q),
    frameTotalM: roundM(m.frameTotalM * q),
    mullionTotalM: roundM(m.mullionTotalM * q),
  };
}

export function formatMeters(m: number): string {
  if (m < 0.0005) return "—";
  return `${m.toFixed(2)} م`;
}

export function formatArea(sqm: number): string {
  if (sqm < 0.0005) return "—";
  return `${sqm.toFixed(2)} م²`;
}

export function formatCount(n: number): string {
  if (n < 0.5) return "—";
  return String(Math.round(n));
}

// ─── حساب تكلفة الزجاج لكل ضلفة ────────────────────────────────

export type PaneGlassLine = {
  paneId: string;
  /** مساحة الضلفة الواحدة م² */
  areaSqm: number;
  /** نوع الزجاج المطبق (مفرد/دبل) */
  glazing: "single" | "double";
  /** جورجيا */
  georgian: boolean;
  /** وصف الزجاج */
  label: string;
  /** تكلفة متر مربع الزجاج لهذه الضلفة */
  costPerSqm: number;
  /** إجمالي تكلفة زجاج الضلفة */
  totalCost: number;
};

export type GlassBreakdown = {
  /** هل يوجد أسعار مُدخَلة في النظام */
  hasPricing: boolean;
  /** تفاصيل كل ضلفة */
  lines: PaneGlassLine[];
  /** إجمالي تكلفة الزجاج للقطعة الواحدة */
  totalUnitCost: number;
  /** إجمالي تكلفة الزجاج مضروبة في الكمية */
  totalCost: number;
};

/**
 * يحسب تكلفة الزجاج لكل ضلفة على حدة بناءً على:
 * — الزجاجات المختارة لكل ضلفة
 * — أسعار التدبيل والجورجيا العامة
 * — مساحة كل ضلفة المحسوبة من اللآيوت والأبعاد
 */
export function calcGlassBreakdown(
  item: DesignItem,
  catalog?: MaterialCatalog
): GlassBreakdown {
  const cat = catalog ?? (typeof window !== "undefined" ? loadMaterialCatalog() : undefined);
  const empty: GlassBreakdown = {
    hasPricing: false,
    lines: [],
    totalUnitCost: 0,
    totalCost: 0,
  };

  const widthMm = Math.max(0, item.widthMm || 0);
  const heightMm = Math.max(0, item.heightMm || 0);
  if (widthMm <= 0 || heightMm <= 0) return empty;

  const layout: LayoutNode =
    item.layout ?? ({ type: "pane", id: "root" } as LayoutNode);
  const panes = item.panes ?? {};

  const boxes: PaneBox[] = [];
  collectPaneBoxes(layout, 0, 0, widthMm, heightMm, panes, boxes);

  const lines: PaneGlassLine[] = [];

  for (const box of boxes) {
    if (isExhaustPane(box.opening)) continue;
    const cfg = normalizePaneConfig(panes[box.id]);
    const glass = resolvePaneGlass(cfg, item, cat);
    if (!paneGlassHasPricing(glass.pane1Id, cat)) continue;

    const glazing: "single" | "double" = glass.pane2Id ? "double" : "single";
    const georgian = glass.georgian;
    const costPerSqm = calcPaneGlassCostPerSqm(
      glass.pane1Id,
      glass.pane2Id,
      georgian,
      cat
    );
    const bottle1 = findGlassBottle(glass.pane1Id, cat);
    const bottle2 = glass.pane2Id
      ? findGlassBottle(glass.pane2Id, cat)
      : undefined;
    let label = bottle1?.name ?? "زجاج";
    if (bottle2) {
      label = `${label} + ${bottle2.name}`;
      if (georgian) label += " · جورجيا";
    }

    const areaSqm = roundM(
      paneGlassAreaMm2(box.w, box.h, box.opening, cfg, cat) / 1_000_000
    );
    if (areaSqm < 0.0005) continue;
    lines.push({
      paneId: box.id,
      areaSqm,
      glazing,
      georgian,
      label,
      costPerSqm,
      totalCost: roundM(areaSqm * costPerSqm),
    });
  }

  if (lines.length === 0) return empty;

  const totalUnitCost = roundM(lines.reduce((s, l) => s + l.totalCost, 0));
  const qty = Math.max(1, item.qty || 1);

  return {
    hasPricing: true,
    lines,
    totalUnitCost,
    totalCost: roundM(totalUnitCost * qty),
  };
}

// ─── حساب السلك لكل ضلفة ────────────────────────────────────────

export type PaneMeshLine = {
  paneId: string;
  meshKind: MeshKind;
  /** اسم نوع السلك */
  label: string;
  /** مساحة السلك م² */
  areaSqm: number;
  /** سعر المتر المربع */
  costPerSqm: number;
  /** قطاع ضلفة سلك جرار — متر (٠ للأنواع التانية) */
  profileM: number;
  /** عجل سلك جرار — ٢ لكل ضلفة جرار */
  wheelQty: number;
  /** مقبض سلك لطش — ١ لكل ضلفة جرار */
  handleQty: number;
  /** تكلفة قماش السلك */
  totalCost: number;
};

export type MeshBreakdown = {
  hasPricing: boolean;
  lines: PaneMeshLine[];
  totalAreaSqm: number;
  totalSlidingProfileM: number;
  totalSlidingSashCount: number;
  totalWheelQty: number;
  totalHandleQty: number;
  totalUnitCost: number;
  totalCost: number;
};

export function calcMeshBreakdown(
  item: DesignItem,
  catalog?: MaterialCatalog
): MeshBreakdown {
  const cat = catalog ?? (typeof window !== "undefined" ? loadMaterialCatalog() : undefined);
  const empty: MeshBreakdown = {
    hasPricing: false,
    lines: [],
    totalAreaSqm: 0,
    totalSlidingProfileM: 0,
    totalSlidingSashCount: 0,
    totalWheelQty: 0,
    totalHandleQty: 0,
    totalUnitCost: 0,
    totalCost: 0,
  };

  const widthMm = Math.max(0, item.widthMm || 0);
  const heightMm = Math.max(0, item.heightMm || 0);
  if (widthMm <= 0 || heightMm <= 0) return empty;

  const layout: LayoutNode =
    item.layout ?? ({ type: "pane", id: "root" } as LayoutNode);
  const panes = item.panes ?? {};

  const boxes: PaneBox[] = [];
  collectPaneBoxes(layout, 0, 0, widthMm, heightMm, panes, boxes);

  const lines: PaneMeshLine[] = [];

  for (const box of boxes) {
    const cfg = normalizePaneConfig(panes[box.id]);
    if (!cfg.mesh) continue;

    const meshKind = resolvePaneMeshKind(cfg, box.opening, cat);
    const meshType =
      findMeshType(cfg.meshTypeId, cat) ??
      defaultMeshTypeForKind(meshKind, cat);
    const costPerSqm = meshType?.pricePerSqm ?? 0;

    const areaSqm = roundM(
      paneMeshAreaMm2(box.w, box.h, box.opening, cfg) / 1_000_000
    );
    const isSlidingMesh = meshCategoryCalcProfile(meshKind, cat);
    const profileM = isSlidingMesh
      ? roundM(panePerimeterMm(box.w, box.h) / 1000)
      : 0;
    const wheelQty = isSlidingMesh ? MESH_SLIDING_WHEELS_PER_SASH : 0;
    const handleQty = isSlidingMesh ? MESH_PUSH_HANDLE_PER_SASH : 0;
    const label = meshType
      ? `${meshType.name} · ${meshKindLabel(meshKind, cat)}`
      : meshKindLabel(meshKind, cat);

    lines.push({
      paneId: box.id,
      meshKind,
      label,
      areaSqm,
      costPerSqm,
      profileM,
      wheelQty,
      handleQty,
      totalCost: roundM(areaSqm * costPerSqm),
    });
  }

  if (lines.length === 0) return empty;

  const totalAreaSqm = roundM(lines.reduce((s, l) => s + l.areaSqm, 0));
  const totalSlidingProfileM = roundM(
    lines.reduce((s, l) => s + l.profileM, 0)
  );
  const totalSlidingSashCount = lines.filter((l) => l.profileM > 0.0005).length;
  const totalWheelQty = lines.reduce((s, l) => s + l.wheelQty, 0);
  const totalHandleQty = lines.reduce((s, l) => s + l.handleQty, 0);
  const totalUnitCost = roundM(lines.reduce((s, l) => s + l.totalCost, 0));
  const qty = Math.max(1, item.qty || 1);

  return {
    hasPricing: lines.some((l) => l.costPerSqm > 0),
    lines,
    totalAreaSqm,
    totalSlidingProfileM,
    totalSlidingSashCount,
    totalWheelQty,
    totalHandleQty,
    totalUnitCost,
    totalCost: roundM(totalUnitCost * qty),
  };
}

// ─── حساب تكلفة القطاعات حسب البراند ───────────────────────────

export type ProfileCostLine = {
  category: string;
  label: string;
  /** bar = بالعود/المتر · kit = طقم (طبة بوكلير) */
  billing: "bar" | "kit";
  lengthM: number;
  /** عدد الأطقم — لطبة البوكلير */
  qty?: number;
  /** سعر العود من القائمة (أو 0 للطقم) */
  barPrice: number;
  /** طول العود بالمتر (أو 0 للطقم) */
  barLengthM: number;
  /** سعر المتر المشتق = barPrice ÷ barLengthM */
  pricePerM: number;
  /** سعر الوحدة للطقم */
  unitPrice?: number;
  totalCost: number;
  productName?: string;
};

export type ProfileCostBreakdown = {
  hasPricing: boolean;
  brandName: string | null;
  lines: ProfileCostLine[];
  totalUnitCost: number;
  totalCost: number;
};

type ProfileCostEntry = {
  category: ProfilePriceCategory;
  lengthM: number;
};

function profileCostEntries(m: MaterialsBreakdown): ProfileCostEntry[] {
  const entries: ProfileCostEntry[] = [
    { category: "frame-hinged", lengthM: m.frameHingedM },
    { category: "frame-sliding", lengthM: m.frameSlidingM },
    { category: "coupling", lengthM: m.couplingM },
    { category: "knife", lengthM: m.knifeM },
    { category: "bouclier", lengthM: m.bouclierM },
    { category: "sash-hinged", lengthM: m.sashHingedM },
    { category: "sash-door", lengthM: m.sashDoorM },
    { category: "sash-sliding", lengthM: m.sashSlidingM },
    { category: "bead-single-hinged", lengthM: m.beadSingleHingedM },
    { category: "bead-single-sliding", lengthM: m.beadSingleSlidingM },
    { category: "bead-double-hinged", lengthM: m.beadDoubleHingedM },
    { category: "bead-double-sliding", lengthM: m.beadDoubleSlidingM },
    { category: "mesh-sliding-profile", lengthM: m.meshSlidingProfileM },
    { category: "four-leaf-meeting", lengthM: m.fourLeafMeetingM },
    { category: "mesh-meeting", lengthM: m.meshMeetingM },
    { category: "mullion", lengthM: m.mullionTotalM },
  ];
  return entries.filter((e) => e.lengthM > 0.0005);
}

export function calcProfileCostBreakdown(
  item: DesignItem,
  materials: MaterialsBreakdown,
  catalog?: MaterialCatalog
): ProfileCostBreakdown {
  const empty: ProfileCostBreakdown = {
    hasPricing: false,
    brandName: null,
    lines: [],
    totalUnitCost: 0,
    totalCost: 0,
  };

  const cat =
    catalog ?? (typeof window !== "undefined" ? loadMaterialCatalog() : undefined);
  if (!cat || !item.systemId || item.systemId === "none") return empty;

  const system = findSystem("profiles", item.systemId, cat);
  const brand: ProfileBrand | undefined = resolveProfileBrandForSystem(system, cat);
  const kitPrice = system?.profile?.bouclierCapKitPrice ?? 0;
  const hasBarPricing = brand != null && profileBrandHasPricing(brand);
  const hasKitPricing = kitPrice > 0 && materials.bouclierCapQty > 0;
  if (!hasBarPricing && !hasKitPricing) return empty;

  const lines: ProfileCostLine[] = [];
  if (hasBarPricing && brand) {
    for (const entry of profileCostEntries(materials)) {
      const rate = getProfileBrandRate(brand, entry.category);
      if (!rate) continue;
      const pricePerM = profileBarPricePerM(rate.barPrice, rate.barLengthM);
      if (pricePerM <= 0) continue;
      lines.push({
        category: entry.category,
        label: profilePriceCategoryLabel(entry.category),
        billing: "bar",
        lengthM: entry.lengthM,
        barPrice: rate.barPrice,
        barLengthM: rate.barLengthM,
        pricePerM,
        totalCost: roundM(entry.lengthM * pricePerM),
        productName: rate.productName,
      });
    }
  }

  // طبة بوكلير = طقم لكل حتة بوكلير (سعر على السيستم، مش بالعود)
  if (hasKitPricing) {
    const qty = materials.bouclierCapQty;
    lines.push({
      category: "bouclier-cap",
      label: "طبة بوكلير",
      billing: "kit",
      lengthM: 0,
      qty,
      barPrice: 0,
      barLengthM: 0,
      pricePerM: 0,
      unitPrice: kitPrice,
      totalCost: roundM(qty * kitPrice),
      productName: "طقم لكل حتة بوكلير",
    });
  }

  if (lines.length === 0) return empty;

  const totalUnitCost = roundM(lines.reduce((s, l) => s + l.totalCost, 0));
  const qty = Math.max(1, item.qty || 1);

  return {
    hasPricing: true,
    brandName: brand?.name ?? system?.name ?? null,
    lines,
    totalUnitCost,
    totalCost: roundM(totalUnitCost * qty),
  };
}
