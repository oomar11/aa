import type { LayoutNode } from "@/lib/window-layout";

/**
 * Unified dimension system for the drawing canvas.
 *
 * Rules:
 * 1. All width dims live on TOP; all height dims live on LEFT.
 * 2. Lanes are anchored to the OUTER FRAME (never to a local child rect).
 * 3. Depth 0 (root split) is closest to the frame; deeper splits step outward.
 * 4. Overall W/H is always the outermost lane.
 * 5. Margins grow to fit every lane — we never clamp lanes into each other.
 */

export const DIM = {
  /** Innermost split lane distance from the frame edge. */
  LANE_BASE: 26,
  /** Extra distance between nested split lanes. */
  LANE_STEP: 32,
  /** Gap from deepest split lane to overall W/H. */
  OVERALL_GAP: 32,
  /** Padding past the outermost lane to the canvas edge. */
  EDGE_PAD: 20,
  /** Content box used to fit the window (viewBox grows around it). */
  CONTENT_W: 300,
  CONTENT_H: 340,
  /** Invisible hit slop around dim lines. */
  HIT_SLOP: 12,
} as const;

export type DimRect = { x: number; y: number; w: number; h: number };

export type DimSegmentPlan = {
  id: string;
  path: number[];
  childIndex: number;
  /** Split direction that produced this segment. */
  orient: "h" | "v";
  valueMm: number;
  totalMm: number;
  depth: number;
  placement: "top" | "left";
  /** Label center */
  x: number;
  y: number;
  /** Dimension line span */
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  /** Where the extension tick meets the frame/child edge */
  tickFromX: number;
  tickFromY: number;
  tickToX: number;
  tickToY: number;
};

export type DimPlan = {
  viewBoxW: number;
  viewBoxH: number;
  margin: { top: number; right: number; bottom: number; left: number };
  frame: DimRect;
  overallWidthY: number;
  overallHeightX: number;
  widthSegments: DimSegmentPlan[];
  heightSegments: DimSegmentPlan[];
  maxSegDepth: number;
};

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

export function maxSplitDepth(node: LayoutNode): number {
  if (node.type !== "split") return 0;
  let deepest = 1;
  for (const child of node.children) {
    deepest = Math.max(deepest, 1 + maxSplitDepth(child));
  }
  return deepest;
}

/** Lane offset from the frame edge for a split at `depth` (0 = root). */
export function splitLane(depth: number) {
  return DIM.LANE_BASE + depth * DIM.LANE_STEP;
}

/** Overall W/H lane — always outside every split lane. */
export function overallLane(maxSegDepth: number, hasSplits: boolean) {
  if (!hasSplits) return 30;
  return splitLane(maxSegDepth) + DIM.OVERALL_GAP;
}

export function requiredMargins(maxSegDepth: number, hasSplits: boolean) {
  const outer = overallLane(maxSegDepth, hasSplits);
  return {
    top: outer + DIM.EDGE_PAD,
    left: outer + DIM.EDGE_PAD,
    right: DIM.EDGE_PAD,
    bottom: DIM.EDGE_PAD,
  };
}

function fitFrame(
  content: DimRect,
  widthMm: number,
  heightMm: number
): DimRect {
  const aspect =
    widthMm > 0 && heightMm > 0 ? widthMm / heightMm : content.w / content.h;
  let w = content.w;
  let h = w / aspect;
  if (h > content.h) {
    h = content.h;
    w = h * aspect;
  }
  return {
    x: content.x + (content.w - w) / 2,
    y: content.y + (content.h - h) / 2,
    w,
    h,
  };
}

/**
 * Build a complete dimension layout for the given window.
 * ViewBox size grows with nesting so lanes never collapse.
 */
export function buildDimPlan(
  layout: LayoutNode,
  widthMm: number,
  heightMm: number
): DimPlan {
  const dimDepth = maxSplitDepth(layout);
  const hasSplits = dimDepth > 0;
  const maxSegDepth = Math.max(0, dimDepth - 1);
  const margin = requiredMargins(maxSegDepth, hasSplits);

  const viewBoxW = margin.left + DIM.CONTENT_W + margin.right;
  const viewBoxH = margin.top + DIM.CONTENT_H + margin.bottom;

  const content: DimRect = {
    x: margin.left,
    y: margin.top,
    w: DIM.CONTENT_W,
    h: DIM.CONTENT_H,
  };
  const frame = fitFrame(content, widthMm, heightMm);

  const outer = overallLane(maxSegDepth, hasSplits);
  const overallWidthY = frame.y - outer;
  const overallHeightX = frame.x - outer;

  const widthSegments: DimSegmentPlan[] = [];
  const heightSegments: DimSegmentPlan[] = [];

  function walk(
    node: LayoutNode,
    rect: DimRect,
    wMm: number,
    hMm: number,
    path: number[]
  ) {
    if (node.type !== "split") return;

    const total = sum(node.ratios) || 1;
    let offset = 0;
    const depth = path.length;
    const lane = splitLane(depth);

    if (node.dir === "v") {
      // Vertical mullions → horizontal (width) dimensions on TOP.
      const y = frame.y - lane;
      node.ratios.forEach((r, i) => {
        const w = (rect.w * r) / total;
        const childRect = { x: rect.x + offset, y: rect.y, w, h: rect.h };
        const childMm = (wMm * r) / total;
        const x1 = childRect.x;
        const x2 = childRect.x + childRect.w;
        const midX = (x1 + x2) / 2;

        widthSegments.push({
          id: `w-${path.join(".") || "r"}-${i}`,
          path: [...path],
          childIndex: i,
          orient: "v",
          valueMm: Math.round(childMm),
          totalMm: wMm,
          depth,
          placement: "top",
          x: midX,
          y,
          x1,
          x2,
          y1: y,
          y2: y,
          tickFromX: midX,
          tickFromY: frame.y,
          tickToX: midX,
          tickToY: y,
        });

        walk(node.children[i]!, childRect, childMm, hMm, [...path, i]);
        offset += w;
      });
      return;
    }

    // Horizontal mullions → vertical (height) dimensions on LEFT.
    const x = frame.x - lane;
    node.ratios.forEach((r, i) => {
      const h = (rect.h * r) / total;
      const childRect = { x: rect.x, y: rect.y + offset, w: rect.w, h };
      const childMm = (hMm * r) / total;
      const y1 = childRect.y;
      const y2 = childRect.y + childRect.h;
      const midY = (y1 + y2) / 2;

      heightSegments.push({
        id: `h-${path.join(".") || "r"}-${i}`,
        path: [...path],
        childIndex: i,
        orient: "h",
        valueMm: Math.round(childMm),
        totalMm: hMm,
        depth,
        placement: "left",
        x,
        y: midY,
        x1: x,
        x2: x,
        y1,
        y2,
        tickFromX: frame.x,
        tickFromY: midY,
        tickToX: x,
        tickToY: midY,
      });

      walk(node.children[i]!, childRect, wMm, childMm, [...path, i]);
      offset += h;
    });
  }

  walk(layout, frame, widthMm, heightMm, []);

  return {
    viewBoxW,
    viewBoxH,
    margin,
    frame,
    overallWidthY,
    overallHeightX,
    widthSegments,
    heightSegments,
    maxSegDepth,
  };
}
