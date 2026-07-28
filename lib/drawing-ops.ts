import {
  normalizePaneConfig,
  type PaneConfig,
  type PaneOpening,
} from "@/lib/design-items";
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
    [paneId]: normalizePaneConfig({
      ...normalizePaneConfig(panes[paneId]),
      opening,
    }),
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

/** يجمع أبعاد كل التقسيمات ويضعها على أقرب حافة */
export function collectAllSplitDims(
  layout: LayoutNode,
  widthMm: number,
  heightMm: number,
  frame: Rect,
  canvasW: number,
  canvasH: number
): { widthSegments: DimSegment[]; heightSegments: DimSegment[] } {
  const widthSegments: DimSegment[] = [];
  const heightSegments: DimSegment[] = [];

  function walk(
    node: LayoutNode,
    rect: Rect,
    wMm: number,
    hMm: number,
    path: number[]
  ) {
    if (node.type !== "split") return;

    const total = sum(node.ratios) || 1;
    let offset = 0;
    const depth = path.length;

    if (node.dir === "v") {
      node.ratios.forEach((r, i) => {
        const w = (rect.w * r) / total;
        const childRect = {
          x: rect.x + offset,
          y: rect.y,
          w,
          h: rect.h,
        };
        const childMm = (wMm * r) / total;
        const distTop = rect.y;
        const distBottom = canvasH - (rect.y + rect.h);
        const placement: DimSegment["placement"] =
          distTop <= distBottom ? "top" : "bottom";
        const lane = Math.min(
          14 + depth * 16,
          placement === "top" ? Math.max(12, distTop - 10) : Math.max(12, distBottom - 10)
        );
        const y =
          placement === "top"
            ? Math.max(10, rect.y - lane)
            : Math.min(canvasH - 10, rect.y + rect.h + lane);

        widthSegments.push({
          id: `w-${path.join(".") || "r"}-${i}`,
          path: [...path],
          childIndex: i,
          orient: "v",
          valueMm: Math.round(childMm),
          totalMm: wMm,
          x: childRect.x + w / 2,
          y,
          x1: childRect.x,
          x2: childRect.x + w,
          placement,
          depth,
        });

        walk(node.children[i]!, childRect, childMm, hMm, [...path, i]);
        offset += w;
      });
      return;
    }

    node.ratios.forEach((r, i) => {
      const h = (rect.h * r) / total;
      const childRect = {
        x: rect.x,
        y: rect.y + offset,
        w: rect.w,
        h,
      };
      const childMm = (hMm * r) / total;
      const distLeft = rect.x;
      const distRight = canvasW - (rect.x + rect.w);
      const placement: DimSegment["placement"] =
        distLeft <= distRight ? "left" : "right";
      const lane = Math.min(
        16 + depth * 16,
        placement === "left" ? Math.max(14, distLeft - 16) : Math.max(14, distRight - 16)
      );
      const x =
        placement === "left"
          ? Math.max(16, rect.x - lane)
          : Math.min(canvasW - 16, rect.x + rect.w + lane);

      heightSegments.push({
        id: `h-${path.join(".") || "r"}-${i}`,
        path: [...path],
        childIndex: i,
        orient: "h",
        valueMm: Math.round(childMm),
        totalMm: hMm,
        x,
        y: childRect.y + h / 2,
        y1: childRect.y,
        y2: childRect.y + h,
        placement,
        depth,
      });

      walk(node.children[i]!, childRect, wMm, childMm, [...path, i]);
      offset += h;
    });
  }

  walk(layout, frame, widthMm, heightMm, []);
  return { widthSegments, heightSegments };
}

/** @deprecated استخدم collectAllSplitDims */
export function collectTopLevelDims(
  layout: LayoutNode,
  widthMm: number,
  heightMm: number,
  frame: Rect
): {
  widthSegments: DimSegment[];
  heightSegments: DimSegment[];
} {
  return collectAllSplitDims(layout, widthMm, heightMm, frame, 360, 420);
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
