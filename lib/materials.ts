import {
  itemUnitAreaSqm,
  normalizePaneConfig,
  type DesignItem,
  type PaneConfig,
  type PaneOpening,
} from "@/lib/design-items";
import { gridLines } from "@/lib/pane-grid";
import type { LayoutNode } from "@/lib/window-layout";
import {
  calcPaneGlassCostPerSqm,
  findGlassBottle,
  loadMaterialCatalog,
  paneGlassHasPricing,
  type MaterialCatalog,
} from "@/lib/material-systems";

/** نوع الحلق حسب فتح الضلفة */
export type FrameKind = "hinged" | "sliding";

/** نوع خط التقسيم بين جزئين */
export type JunctionKind =
  | "mullion"
  | "coupling"
  | "knife"
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
  /** سكينة بين ضلف الجرار — متر طولي */
  knifeM: number;
  /** بوكلير (مقابض في وش بعض) — متر طولي */
  bouclierM: number;
  /** سوقاس بيقسم الحلق (خطوط التقسيم في اللليآوت) */
  mullionFrameM: number;
  /** سوقاس بيقسم الضلفة (تقسيم داخلي / عوائد) */
  mullionSashM: number;
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
  knifeMm: number;
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

function isSlidingOpening(opening: PaneOpening): boolean {
  return frameKindForOpening(opening) === "sliding";
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
 * - جرار×جرار → سكينة (مش سوقاس)
 * - مقابض في وش بعض → بوكلير (مش سوقاس)
 * - ضلفة بوكلير ثابتة على الحافة → بوكلير
 * - مفصلي×جرار → كوبلن
 * - غير كده → سوقاس
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

      if (isSlidingOpening(leftOp) && isSlidingOpening(rightOp)) {
        return "knife";
      }

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
 * سوقاس / سكينة / بوكلير / كوبلن
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
    if (kind === "knife") {
      out.knifeMm += span;
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
 * بين ضلف الجرار: سكينة (مش سوقاس).
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
    knifeMm: 0,
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

  const frameHingedM = roundM(mmToM(frameHingedMm));
  const frameSlidingM = roundM(mmToM(frameSlidingMm));
  const couplingM = roundM(mmToM(junctions.couplingMm));
  const knifeM = roundM(mmToM(junctions.knifeMm));
  const bouclierM = roundM(mmToM(junctions.bouclierMm));
  const mullionFrameM = roundM(mmToM(junctions.mullionMm));
  const mullionSashM = roundM(mmToM(mullionSashMm));
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
    const cfg = normalizePaneConfig(panes[box.id]);
    if (!cfg.glassPane1Id) continue;
    if (!paneGlassHasPricing(cfg.glassPane1Id, cat)) continue;

    const glazing: "single" | "double" = cfg.glassPane2Id ? "double" : "single";
    const georgian = Boolean(cfg.glassGeorgian && cfg.glassPane2Id);
    const costPerSqm = calcPaneGlassCostPerSqm(
      cfg.glassPane1Id,
      cfg.glassPane2Id,
      georgian,
      cat
    );
    const bottle1 = findGlassBottle(cfg.glassPane1Id, cat);
    const bottle2 = cfg.glassPane2Id
      ? findGlassBottle(cfg.glassPane2Id, cat)
      : undefined;
    let label = bottle1?.name ?? "زجاج";
    if (bottle2) {
      label = `${label} + ${bottle2.name}`;
      if (georgian) label += " · جورجيا";
    }

    const areaSqm = roundM((box.w * box.h) / 1_000_000);
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
