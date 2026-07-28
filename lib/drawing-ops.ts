import {
  normalizePaneConfig,
  type PaneConfig,
  type PaneOpening,
} from "@/lib/design-items";
import {
  buildDimPlan,
  overallLane as overallDimLane,
  splitLane as splitDimLane,
  DIM as DIM_SYSTEM,
} from "@/lib/dim-system";
import {
  listPaneIds,
  pane,
  type LayoutNode,
} from "@/lib/window-layout";

export type Rect = { x: number; y: number; w: number; h: number };

export type PaneRect = Rect & { id: string };

export type DimSegment = {
  id: string;
  /** مسار في الشجرة للوصول لنسبة التقسيم */
  path: number[];
  childIndex: number;
  orient: "h" | "v";
  valueMm: number;
  /** إجمالي البعد الأب بالمليمتر */
  totalMm: number;
  /** موضع نص البعد على الكانفس */
  x: number;
  y: number;
  /** حدود خط البعد الأفقي */
  x1?: number;
  x2?: number;
  /** حدود خط البعد الرأسي */
  y1?: number;
  y2?: number;
  /** أين يُرسم البعد (أقرب حافة) */
  placement: "top" | "bottom" | "left" | "right";
  depth: number;
};

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

export function collectPaneRects(
  node: LayoutNode,
  rect: Rect,
  out: PaneRect[]
) {
  if (node.type === "empty") return;
  if (node.type === "pane") {
    out.push({ ...rect, id: node.id });
    return;
  }
  const total = sum(node.ratios) || 1;
  let offset = 0;
  node.children.forEach((child, i) => {
    const portion = node.ratios[i]! / total;
    if (node.dir === "v") {
      const w = rect.w * portion;
      collectPaneRects(
        child,
        { x: rect.x + offset, y: rect.y, w, h: rect.h },
        out
      );
      offset += w;
    } else {
      const h = rect.h * portion;
      collectPaneRects(
        child,
        { x: rect.x, y: rect.y + offset, w: rect.w, h },
        out
      );
      offset += h;
    }
  });
}

export function collectMullionRects(
  node: LayoutNode,
  rect: Rect,
  thickness: number,
  out: Rect[]
) {
  if (node.type !== "split") return;
  const total = sum(node.ratios) || 1;
  const sizes = node.ratios.map(
    (r) => ((node.dir === "v" ? rect.w : rect.h) * r) / total
  );
  let offset = 0;
  node.children.forEach((child, i) => {
    const size = sizes[i]!;
    const childRect =
      node.dir === "v"
        ? { x: rect.x + offset, y: rect.y, w: size, h: rect.h }
        : { x: rect.x, y: rect.y + offset, w: rect.w, h: size };
    collectMullionRects(child, childRect, thickness, out);
    if (i < node.children.length - 1) {
      const next = node.children[i + 1]!;
      if (!isFullyEmpty(child) && !isFullyEmpty(next)) {
        if (node.dir === "v") {
          out.push({
            x: rect.x + offset + size - thickness / 2,
            y: rect.y,
            w: thickness,
            h: rect.h,
          });
        } else {
          out.push({
            x: rect.x,
            y: rect.y + offset + size - thickness / 2,
            w: rect.w,
            h: thickness,
          });
        }
      }
    }
    offset += size;
  });
}

function isFullyEmpty(node: LayoutNode): boolean {
  if (node.type === "empty") return true;
  if (node.type === "pane") return false;
  return node.children.every(isFullyEmpty);
}

/** يقسم ضلفة مختارة رأسياً أو أفقياً إلى n أجزاء */
export function splitPane(
  node: LayoutNode,
  paneId: string,
  dir: "v" | "h",
  parts = 2
): { layout: LayoutNode; newIds: string[] } | null {
  const newIds: string[] = [];

  function walk(n: LayoutNode): LayoutNode {
    if (n.type === "empty") return n;
    if (n.type === "pane") {
      if (n.id !== paneId) return n;
      const children = Array.from({ length: parts }, () => {
        const p = pane();
        newIds.push(p.type === "pane" ? p.id : "");
        return p;
      });
      return {
        type: "split",
        dir,
        ratios: Array.from({ length: parts }, () => 1),
        children,
      };
    }
    return {
      type: "split",
      dir: n.dir,
      ratios: [...n.ratios],
      children: n.children.map(walk),
    };
  }

  const layout = walk(node);
  if (newIds.length === 0) return null;
  return { layout, newIds: newIds.filter(Boolean) };
}

export function setPaneOpening(
  panes: Record<string, PaneConfig>,
  paneId: string,
  opening: PaneOpening
): Record<string, PaneConfig> {
  return {
    ...panes,
    [paneId]: {
      ...normalizePaneConfig(panes[paneId]),
      opening,
    },
  };
}

export function setPaneConfig(
  panes: Record<string, PaneConfig>,
  paneId: string,
  config: PaneConfig
): Record<string, PaneConfig> {
  return {
    ...panes,
    [paneId]: normalizePaneConfig(config),
  };
}

export function syncPanesMap(
  layout: LayoutNode,
  panes: Record<string, PaneConfig> = {}
): Record<string, PaneConfig> {
  const next: Record<string, PaneConfig> = {};
  for (const id of listPaneIds(layout)) {
    next[id] = normalizePaneConfig(panes[id]);
  }
  return next;
}

/**
 * يحذف خط التقسيم بعد الطفل leftChildIndex (يدمج الطفلين في واحد).
 * يرجع null لو مفيش تقسيم صالح.
 */
export function removeMullionAfter(
  node: LayoutNode,
  path: number[],
  leftChildIndex: number
): LayoutNode | null {
  if (node.type !== "split") return null;

  if (path.length === 0) {
    if (
      leftChildIndex < 0 ||
      leftChildIndex >= node.children.length - 1
    ) {
      return null;
    }
    const left = node.children[leftChildIndex]!;
    const right = node.children[leftChildIndex + 1]!;
    const mergedRatio =
      node.ratios[leftChildIndex]! + node.ratios[leftChildIndex + 1]!;

    let merged: LayoutNode;
    if (left.type === "pane" && right.type === "pane") {
      merged = left;
    } else if (left.type === "empty" && right.type !== "empty") {
      merged = right;
    } else if (right.type === "empty") {
      merged = left;
    } else {
      merged = left;
    }

    const children = [
      ...node.children.slice(0, leftChildIndex),
      merged,
      ...node.children.slice(leftChildIndex + 2),
    ];
    const ratios = [
      ...node.ratios.slice(0, leftChildIndex),
      mergedRatio,
      ...node.ratios.slice(leftChildIndex + 2),
    ];

    if (children.length === 1) return children[0]!;
    return { type: "split", dir: node.dir, ratios, children };
  }

  const [head, ...rest] = path;
  if (head == null || head < 0 || head >= node.children.length) return null;
  const child = removeMullionAfter(node.children[head]!, rest, leftChildIndex);
  if (!child) return null;
  return {
    ...node,
    children: node.children.map((c, i) => (i === head ? child : c)),
  };
}

/** يوزّع نسب التقسيم بالتساوي على كل الأطفال في مسار معيّن */
export function equalizeSplitRatios(
  node: LayoutNode,
  path: number[]
): LayoutNode {
  if (node.type !== "split") return node;
  if (path.length === 0) {
    return {
      ...node,
      ratios: node.ratios.map(() => 1),
    };
  }
  const [head, ...rest] = path;
  return {
    ...node,
    children: node.children.map((c, i) =>
      i === head ? equalizeSplitRatios(c, rest) : c
    ),
  };
}

/** يحدّث نسبة طفل في مسار معيّن مع الحفاظ على مجموع النسب */
export function updateSplitRatio(
  node: LayoutNode,
  path: number[],
  childIndex: number,
  newRatioShare: number
): LayoutNode {
  if (node.type !== "split") return node;

  if (path.length === 0) {
    const ratios = [...node.ratios];
    const others = ratios.reduce(
      (s, r, i) => (i === childIndex ? s : s + r),
      0
    );
    const clamped = Math.max(0.08, Math.min(0.92, newRatioShare));
    const rest = 1 - clamped;
    const scale = others > 0 ? rest / others : 0;
    const next = ratios.map((r, i) =>
      i === childIndex ? clamped : r * scale
    );
    // لو باقي الأطفال صفر، وزّع بالتساوي
    if (others === 0) {
      const each = rest / Math.max(ratios.length - 1, 1);
      return {
        ...node,
        ratios: ratios.map((_, i) => (i === childIndex ? clamped : each)),
      };
    }
    return { ...node, ratios: next };
  }

  const [head, ...rest] = path;
  return {
    ...node,
    children: node.children.map((c, i) =>
      i === head ? updateSplitRatio(c, rest, childIndex, newRatioShare) : c
    ),
  };
}

/** @deprecated use DIM from @/lib/dim-system */
export const DIM_LANE_BASE = DIM_SYSTEM.LANE_BASE;
/** @deprecated use DIM from @/lib/dim-system */
export const DIM_LANE_STEP = DIM_SYSTEM.LANE_STEP;
/** @deprecated use DIM from @/lib/dim-system */
export const DIM_OVERALL_GAP = DIM_SYSTEM.OVERALL_GAP;

export { splitDimLane, overallDimLane };

/**
 * Collects split dimensions using the unified dim system
 * (fixed top/left lanes anchored to the outer frame).
 */
export function collectAllSplitDims(
  layout: LayoutNode,
  widthMm: number,
  heightMm: number,
  _frame?: Rect,
  _canvasW?: number,
  _canvasH?: number
): { widthSegments: DimSegment[]; heightSegments: DimSegment[] } {
  const plan = buildDimPlan(layout, widthMm, heightMm);
  const toSeg = (
    seg: (typeof plan.widthSegments)[number]
  ): DimSegment => ({
    id: seg.id,
    path: seg.path,
    childIndex: seg.childIndex,
    orient: seg.orient,
    valueMm: seg.valueMm,
    totalMm: seg.totalMm,
    x: seg.x,
    y: seg.y,
    x1: seg.x1,
    x2: seg.x2,
    y1: seg.y1,
    y2: seg.y2,
    placement: seg.placement,
    depth: seg.depth,
  });
  return {
    widthSegments: plan.widthSegments.map(toSeg),
    heightSegments: plan.heightSegments.map(toSeg),
  };
}

/** @deprecated استخدم collectAllSplitDims */
export function collectTopLevelDims(
  layout: LayoutNode,
  widthMm: number,
  heightMm: number,
  _frame: Rect
): {
  widthSegments: DimSegment[];
  heightSegments: DimSegment[];
} {
  return collectAllSplitDims(layout, widthMm, heightMm);
}

export function ratioFromMm(
  valueMm: number,
  totalMm: number,
  currentRatios: number[],
  childIndex: number
): number {
  const total = sum(currentRatios) || 1;
  const clampedMm = Math.max(50, Math.min(totalMm - 50 * (currentRatios.length - 1), valueMm));
  return clampedMm / totalMm;
}

export function getSplitRatiosAtPath(
  node: LayoutNode,
  path: number[]
): number[] {
  if (node.type !== "split") return [1];
  if (path.length === 0) return node.ratios;
  const [head, ...rest] = path;
  return getSplitRatiosAtPath(node.children[head]!, rest);
}
