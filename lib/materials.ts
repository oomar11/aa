import {
  gridCellCount,
  isExhaustPane,
  itemUnitAreaSqm,
  normalizePaneConfig,
  resolvePaneGlass,
  resolvePaneMeshKind,
  type DesignItem,
  type MeshKind,
  type PaneConfig,
  type PaneOpening,
} from "@/lib/design-items";
import { getGridCells, gridLines } from "@/lib/pane-grid";
import type { LayoutNode } from "@/lib/window-layout";
import {
  calcPaneGlassCostPerSqm,
  defaultMeshTypeForKind,
  findGlassBottle,
  findMeshType,
  loadMaterialCatalog,
  meshCategoryCalcProfile,
  meshKindLabel,
  paneGlassHasPricing,
  type MaterialCatalog,
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
  /** سوقاس بيقسم الحلق (خطوط التقسيم في اللليآوت) */
  mullionFrameM: number;
  /** سوقاس بيقسم الضلفة (تقسيم داخلي / عوائد) */
  mullionSashM: number;
  /** ضلفة مفصلي — متر طولي (محيط كل ضلفة متحركة) */
  sashHingedM: number;
  /** ضلفة باب — متر طولي */
  sashDoorM: number;
  /** ضلفة جرار — متر طولي */
  sashSlidingM: number;
  /** باكتة تثبيت الزجاج — متر طولي */
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
    mullionFrameM: 0,
    mullionSashM: 0,
    sashHingedM: 0,
    sashDoorM: 0,
    sashSlidingM: 0,
    beadM: 0,
    glassAreaSqm: 0,
    meshAreaSqm: 0,
    meshSlidingProfileM: 0,
    meshSlidingSashCount: 0,
    meshSlidingWheelQty: 0,
    meshPushHandleQty: 0,
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

function panePerimeterMm(w: number, h: number): number {
  return 2 * (w + h);
}

/** ضلفة باب — من العلامة أو نوع الفتح door-left / door-right */
export function isDoorPane(opening: PaneOpening, cfg: PaneConfig): boolean {
  if (cfg.isDoor) return true;
  return opening === "door-left" || opening === "door-right";
}

/** هل الضلفة فيها زجاج يحتاج باكتة */
function paneNeedsBead(
  opening: PaneOpening,
  cfg: PaneConfig,
  catalog?: MaterialCatalog
): boolean {
  if (isExhaustPane(opening)) return false;
  if (opening === "panel-h" || opening === "panel-v") return false;
  if (meshReplacesPaneGlass(cfg, opening, catalog)) return false;
  const norm = normalizePaneConfig(cfg);
  if (norm.sandwichPanels) {
    const count = gridCellCount(norm.grid);
    const panelCells = norm.panelCells ?? [];
    if (panelCells.length >= count) return false;
  }
  return true;
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

/** طول سكينة ضلفة جرار واحدة — على الحافة الرأسية للسحب الأفقي */
function knifeLengthForSlidingSash(box: PaneBox): number {
  return box.h;
}

/** سكينة — قطعة واحدة لكل ضلفة جرار متحركة */
function slidingKnifeProfileMm(boxes: PaneBox[]): number {
  let total = 0;
  for (const box of boxes) {
    if (box.kind !== "sliding") continue;
    if (!isOpeningSash(box.opening)) continue;
    total += knifeLengthForSlidingSash(box);
  }
  return total;
}

/** محيط قطاع الضلفة لكل ضلفة متحركة */
function sashProfileMm(
  boxes: PaneBox[],
  panes: Record<string, PaneConfig> | undefined,
  catalog?: MaterialCatalog
): { hinged: number; sliding: number; door: number } {
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
    const peri = panePerimeterMm(box.w, box.h);
    if (box.kind === "sliding") {
      sliding += peri;
      continue;
    }
    if (isDoorPane(box.opening, cfg)) door += peri;
    else hinged += peri;
  }
  return { hinged, sliding, door };
}

/** باكتة تثبيت الزجاج — محيط كل ضلفة فيها زجاج */
function beadProfileMm(
  boxes: PaneBox[],
  panes: Record<string, PaneConfig> | undefined,
  catalog?: MaterialCatalog
): number {
  let total = 0;
  for (const box of boxes) {
    const cfg = normalizePaneConfig(panes?.[box.id]);
    if (!paneNeedsBead(box.opening, cfg, catalog)) continue;
    total += panePerimeterMm(box.w, box.h);
  }
  return total;
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
 */
export function calcItemMaterials(item: DesignItem): MaterialsBreakdown {
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
    const peri = 2 * (widthMm + heightMm);
    if (hasSliding) frameSlidingMm = peri;
    else frameHingedMm = peri;
  } else {
    const hingedAabb = aabbOf(hingedBoxes);
    const slidingAabb = aabbOf(slidingBoxes);
    const couplingMm = junctions.couplingMm;
    if (hingedAabb) {
      frameHingedMm = 2 * (hingedAabb.w + hingedAabb.h) - couplingMm;
    }
    if (slidingAabb) {
      frameSlidingMm = 2 * (slidingAabb.w + slidingAabb.h) - couplingMm;
    }
    frameHingedMm = Math.max(0, frameHingedMm);
    frameSlidingMm = Math.max(0, frameSlidingMm);
  }

  const mullionSashMm = sashMullionMm(boxes, panes);
  const sashMm = sashProfileMm(boxes, panes);
  const beadMm = beadProfileMm(boxes, panes);
  const glassAreaSqm = totalGlassAreaSqm(boxes, panes);
  const meshAreaSqm = totalMeshAreaSqm(boxes, panes);
  const slidingMesh = slidingMeshSashStats(boxes, panes);
  const meshSlidingProfileM = roundM(mmToM(slidingMesh.profileMm));
  const meshSlidingSashCount = slidingMesh.sashCount;
  const meshSlidingWheelQty = meshSlidingSashCount * MESH_SLIDING_WHEELS_PER_SASH;
  const meshPushHandleQty = meshSlidingSashCount * MESH_PUSH_HANDLE_PER_SASH;

  const frameHingedM = roundM(mmToM(frameHingedMm));
  const frameSlidingM = roundM(mmToM(frameSlidingMm));
  const couplingM = roundM(mmToM(junctions.couplingMm));
  const knifeM = roundM(mmToM(slidingKnifeProfileMm(boxes)));
  const bouclierM = roundM(mmToM(junctions.bouclierMm));
  const mullionFrameM = roundM(mmToM(junctions.mullionMm));
  const mullionSashM = roundM(mmToM(mullionSashMm));
  const sashHingedM = roundM(mmToM(sashMm.hinged));
  const sashDoorM = roundM(mmToM(sashMm.door));
  const sashSlidingM = roundM(mmToM(sashMm.sliding));
  const beadM = roundM(mmToM(beadMm));
  const frameTotalM = roundM(frameHingedM + frameSlidingM);
  const mullionTotalM = roundM(mullionFrameM + mullionSashM);

  return {
    areaSqm: roundM(areaSqm),
    frameHingedM,
    frameSlidingM,
    couplingM,
    knifeM,
    bouclierM,
    mullionFrameM,
    mullionSashM,
    sashHingedM,
    sashDoorM,
    sashSlidingM,
    beadM,
    glassAreaSqm,
    meshAreaSqm,
    meshSlidingProfileM,
    meshSlidingSashCount,
    meshSlidingWheelQty,
    meshPushHandleQty,
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
    mullionFrameM: roundM(m.mullionFrameM * q),
    mullionSashM: roundM(m.mullionSashM * q),
    sashHingedM: roundM(m.sashHingedM * q),
    sashDoorM: roundM(m.sashDoorM * q),
    sashSlidingM: roundM(m.sashSlidingM * q),
    beadM: roundM(m.beadM * q),
    glassAreaSqm: roundM(m.glassAreaSqm * q),
    meshAreaSqm: roundM(m.meshAreaSqm * q),
    meshSlidingProfileM: roundM(m.meshSlidingProfileM * q),
    meshSlidingSashCount: m.meshSlidingSashCount * q,
    meshSlidingWheelQty: m.meshSlidingWheelQty * q,
    meshPushHandleQty: m.meshPushHandleQty * q,
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
