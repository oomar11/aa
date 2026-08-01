"use client";

import {
  getLayoutPreviewSize,
  type LayoutNode,
} from "@/lib/window-layout";

type Props = {
  layout: LayoutNode;
  className?: string;
  width?: number;
  height?: number;
};

type Rect = { x: number; y: number; w: number; h: number };

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

function collectPanes(node: LayoutNode, rect: Rect, out: Rect[]) {
  if (node.type === "empty") return;
  if (node.type === "pane") {
    out.push(rect);
    return;
  }

  const total = sum(node.ratios) || 1;
  let offset = 0;
  node.children.forEach((child, i) => {
    const portion = node.ratios[i]! / total;
    if (node.dir === "v") {
      const w = rect.w * portion;
      collectPanes(child, { x: rect.x + offset, y: rect.y, w, h: rect.h }, out);
      offset += w;
    } else {
      const h = rect.h * portion;
      collectPanes(child, { x: rect.x, y: rect.y + offset, w: rect.w, h }, out);
      offset += h;
    }
  });
}

/** خطوط التقسيم بين الأطفال (mullions) — تتخطى المناطق الفاضية */
function collectMullions(
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

    collectMullions(child, childRect, thickness, out);

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

export function TemplatePreview({
  layout,
  className = "",
  width,
  height,
}: Props) {
  const auto = getLayoutPreviewSize(layout);
  const vbW = width ?? auto.width;
  const vbH = height ?? auto.height;

  const FRAME = "#ffffff";
  const GLASS = "#9ec8e8";
  const GLASS_ALT = "#8ebadf";
  const OUTER = "#8a96a5";
  const STROKE = "#c5d0dc";

  const pad = 6;
  const profile = 5;
  const mullion = 3.2;
  const area: Rect = {
    x: pad,
    y: pad,
    w: vbW - pad * 2,
    h: vbH - pad * 2,
  };

  const panes: Rect[] = [];
  const mullions: Rect[] = [];
  collectPanes(layout, area, panes);
  collectMullions(layout, area, mullion, mullions);

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <rect width={vbW} height={vbH} fill="transparent" />

      {panes.map((p, i) => (
        <rect
          key={`f-${i}`}
          x={p.x}
          y={p.y}
          width={Math.max(p.w, 0.5)}
          height={Math.max(p.h, 0.5)}
          fill={FRAME}
          stroke={OUTER}
          strokeWidth={1}
        />
      ))}

      {panes.map((p, i) => (
        <rect
          key={`g-${i}`}
          x={p.x + profile * 0.55}
          y={p.y + profile * 0.55}
          width={Math.max(p.w - profile * 1.1, 0.5)}
          height={Math.max(p.h - profile * 1.1, 0.5)}
          fill={i % 2 === 0 ? GLASS : GLASS_ALT}
        />
      ))}

      {mullions.map((m, i) => (
        <rect
          key={`m-${i}`}
          x={m.x}
          y={m.y}
          width={Math.max(m.w, 0.5)}
          height={Math.max(m.h, 0.5)}
          fill={FRAME}
          stroke={STROKE}
          strokeWidth={0.4}
        />
      ))}
    </svg>
  );
}
