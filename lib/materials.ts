import {
  itemUnitAreaSqm,
  normalizePaneConfig,
  type DesignItem,
  type PaneConfig,
  type PaneOpening,
} from "@/lib/design-items";
import { gridLines } from "@/lib/pane-grid";
import type { LayoutNode } from "@/lib/window-layout";

/** نوع الحلق حسب فتح الضلفة */
export type FrameKind = "hinged" | "sliding";

export type MaterialsBreakdown = {
  /** مساحة القطعة الواحدة م² */
  areaSqm: number;
  /** حلق مفصلي — متر طولي للقطعة */
  frameHingedM: number;
  /** حلق جرار — متر طولي للقطعة */
  frameSlidingM: number;
  /** كوبلن تجميع بين مفصلي وجرار — متر طولي */
  couplingM: number;
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
};

type EdgeKey = string;

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

function mmToM(mm: number) {
  return Math.max(0, mm) / 1000;
}

function roundM(m: number) {
  return Math.round(m * 1000) / 1000;
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

function paneKind(
  id: string,
  panes: Record<string, PaneConfig> | undefined
): FrameKind {
  const opening = (panes?.[id]?.opening ?? "fixed") as PaneOpening;
  return frameKindForOpening(opening);
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
    out.push({
      id: node.id,
      x,
      y,
      w,
      h,
      kind: paneKind(node.id, panes),
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
function sharedEdgeMm(a: PaneBox, b: PaneBox): { len: number; vertical: boolean } | null {
  const eps = 0.5;

  // حافة رأسية مشتركة (جنب بعض أفقياً)
  const aRight = a.x + a.w;
  const bRight = b.x + b.w;
  if (Math.abs(aRight - b.x) < eps || Math.abs(bRight - a.x) < eps) {
    const y1 = Math.max(a.y, b.y);
    const y2 = Math.min(a.y + a.h, b.y + b.h);
    const overlap = y2 - y1;
    if (overlap > eps) return { len: overlap, vertical: true };
  }

  // حافة أفقية مشتركة (فوق/تحت)
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

function edgeKey(a: PaneBox, b: PaneBox, vertical: boolean, len: number): EdgeKey {
  if (vertical) {
    const x = Math.round(Math.min(a.x + a.w, b.x + b.w, Math.max(a.x, b.x)));
    const y1 = Math.round(Math.max(a.y, b.y));
    return `v:${x}:${y1}:${Math.round(len)}`;
  }
  const y = Math.round(Math.min(a.y + a.h, b.y + b.h, Math.max(a.y, b.y)));
  const x1 = Math.round(Math.max(a.x, b.x));
  return `h:${y}:${x1}:${Math.round(len)}`;
}

function aabbOf(boxes: PaneBox[]): { x: number; y: number; w: number; h: number } | null {
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

/** أنواع الحلق الموجودة داخل عقدة (للتمييز بين سوقاس وكوبلن) */
function kindsInNode(
  node: LayoutNode,
  panes: Record<string, PaneConfig> | undefined,
  out: Set<FrameKind>
) {
  if (node.type === "empty") return;
  if (node.type === "pane") {
    out.add(paneKind(node.id, panes));
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

/**
 * سوقاس تقسيم الحلق من شجرة اللليآوت.
 * خط الالتقاء بين مفصلي وجرار = كوبلن مش سوقاس.
 */
function frameMullionMm(
  node: LayoutNode,
  w: number,
  h: number,
  panes: Record<string, PaneConfig> | undefined
): number {
  if (node.type !== "split") return 0;
  const total = sum(node.ratios) || 1;
  const sizes = node.ratios.map(
    (r) => ((node.dir === "v" ? w : h) * r) / total
  );
  let length = 0;

  node.children.forEach((child, i) => {
    const size = sizes[i]!;
    const childW = node.dir === "v" ? size : w;
    const childH = node.dir === "h" ? size : h;
    length += frameMullionMm(child, childW, childH, panes);

    if (i < node.children.length - 1) {
      const next = node.children[i + 1]!;
      if (isFullyEmpty(child) || isFullyEmpty(next)) return;

      const leftKind = regionKind(child, panes);
      const rightKind = regionKind(next, panes);
      // مفصلي يقابل جرار → كوبلن تجميع، مش سوقاس
      if (
        (leftKind === "hinged" && rightKind === "sliding") ||
        (leftKind === "sliding" && rightKind === "hinged")
      ) {
        return;
      }

      // mullion رأسي طوله = ارتفاع الأب، أفقي = عرض الأب
      length += node.dir === "v" ? h : w;
    }
  });

  return length;
}

function isFullyEmpty(node: LayoutNode): boolean {
  if (node.type === "empty") return true;
  if (node.type === "pane") return false;
  return node.children.every(isFullyEmpty);
}

/** سوقاس داخل الضلفة من التقسيم الداخلي */
function sashMullionMm(boxes: PaneBox[], panes: Record<string, PaneConfig> | undefined): number {
  let total = 0;
  for (const box of boxes) {
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
 * السوقاس: تقسيم الحلق + تقسيم الضلفة.
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
    return {
      areaSqm,
      frameHingedM: 0,
      frameSlidingM: 0,
      couplingM: 0,
      mullionFrameM: 0,
      mullionSashM: 0,
      frameTotalM: 0,
      mullionTotalM: 0,
      isMixedFrame: false,
      frameLabel: "مفصلي",
    };
  }

  const hingedBoxes = boxes.filter((b) => b.kind === "hinged");
  const slidingBoxes = boxes.filter((b) => b.kind === "sliding");
  const hasHinged = hingedBoxes.length > 0;
  const hasSliding = slidingBoxes.length > 0;
  const isMixedFrame = hasHinged && hasSliding;

  let frameHingedMm = 0;
  let frameSlidingMm = 0;
  let couplingMm = 0;

  if (!isMixedFrame) {
    const peri = 2 * (widthMm + heightMm);
    if (hasSliding) frameSlidingMm = peri;
    else frameHingedMm = peri;
  } else {
    // كوبلن عند كل تماس بين ضلفة مفصلي وضلفة جرار
    const seen = new Set<EdgeKey>();
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
        couplingMm += shared.len;
      }
    }

    // كل نوع حلق: محيط صندوقه ناقص ضلع الكوبلن (يبقى شكل U عند الالتقاء)
    const hingedAabb = aabbOf(hingedBoxes);
    const slidingAabb = aabbOf(slidingBoxes);
    if (hingedAabb) {
      frameHingedMm = 2 * (hingedAabb.w + hingedAabb.h) - couplingMm;
    }
    if (slidingAabb) {
      frameSlidingMm = 2 * (slidingAabb.w + slidingAabb.h) - couplingMm;
    }
    frameHingedMm = Math.max(0, frameHingedMm);
    frameSlidingMm = Math.max(0, frameSlidingMm);
  }

  const mullionFrameMm = frameMullionMm(layout, widthMm, heightMm, panes);
  const mullionSashMm = sashMullionMm(boxes, panes);

  const frameHingedM = roundM(mmToM(frameHingedMm));
  const frameSlidingM = roundM(mmToM(frameSlidingMm));
  const couplingM = roundM(mmToM(couplingMm));
  const mullionFrameM = roundM(mmToM(mullionFrameMm));
  const mullionSashM = roundM(mmToM(mullionSashMm));
  const frameTotalM = roundM(frameHingedM + frameSlidingM);
  const mullionTotalM = roundM(mullionFrameM + mullionSashM);

  return {
    areaSqm: roundM(areaSqm),
    frameHingedM,
    frameSlidingM,
    couplingM,
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
