"use client";

import type { MouseEvent } from "react";
import { useRef } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { useUnit } from "@/components/UnitProvider";
import {
  FRAME_COLORS,
  PANEL_STRIPE_MM,
  normalizePaneConfig,
  type DesignItem,
  type FrameColorId,
  type PaneConfig,
  type PaneOpening,
} from "@/lib/design-items";
import {
  collectAllSplitDims,
  collectMullionRects,
  collectPaneRects,
  type DimSegment,
  type PaneRect,
} from "@/lib/drawing-ops";
import { exhaustFanGeom } from "@/lib/exhaust-fan";
import { getGridCells, gridLines } from "@/lib/pane-grid";
import { panelStripeDivider, panelStripeLayout } from "@/lib/panel-stripes";
import { formatLength } from "@/lib/units";
import { ensurePaneIds, type LayoutNode } from "@/lib/window-layout";

type DimTarget =
  | { kind: "width" }
  | { kind: "height" }
  | { kind: "segment"; segment: DimSegment };

type EqualizeTarget =
  | { kind: "width" }
  | { kind: "height" }
  | { kind: "segment"; path: number[] };

export type DeleteMullionTarget = {
  path: number[];
  /** فهرس الطفل قبل خط التقسيم */
  leftChildIndex: number;
};

type Props = {
  item: DesignItem;
  selectedPaneId: string | null;
  onSelectPane: (id: string | null) => void;
  onOpenPaneProperties: (id: string) => void;
  onEditDimension: (target: DimTarget) => void;
  onRequestEqualize: (target: EqualizeTarget) => void;
  onRequestDeleteMullion: (target: DeleteMullionTarget) => void;
};

export type { EqualizeTarget };

const VB_W = 400;
const VB_H = 460;

type DimColors = {
  line: string;
  fill: string;
  stroke: string;
  text: string;
  /** نقط أطراف المقاس (تساوي / طرف الضلفة) */
  edgeDot: string;
  /** نقط التقسيم الداخلي بين الضلف */
  jointDot: string;
  jointStroke: string;
};

export type { DimTarget };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function maxLayoutSplitDepth(node: LayoutNode): number {
  if (node.type !== "split") return 0;
  let deepest = 1;
  for (const child of node.children) {
    deepest = Math.max(deepest, 1 + maxLayoutSplitDepth(child));
  }
  return deepest;
}

export function DrawingCanvas({
  item,
  selectedPaneId,
  onSelectPane,
  onOpenPaneProperties,
  onEditDimension,
  onRequestEqualize,
  onRequestDeleteMullion,
}: Props) {
  const { unit } = useUnit();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const layout: LayoutNode = ensurePaneIds(
    item.layout ?? { type: "pane", id: "root" }
  );
  const colorId = (item.frameColor ?? "white") as FrameColorId;
  const frameMeta = FRAME_COLORS[colorId];
  const frameFill = frameMeta.hex;
  const isWood = Boolean(frameMeta.wood);

  const glass = isDark ? "#3a6180" : "#b7d6f0";
  const openStroke = isDark ? "#6babf5" : "#2b7de9";
  const hardware = isDark ? "#a8b2c0" : "#8a93a0";
  const frameStroke = isDark ? "#8b97a8" : "#9aa3ad";
  const paneStroke = isDark ? "#9aa8b8" : "#7a8796";
  const dimColors: DimColors = isDark
    ? {
        line: "#d5deea",
        fill: "#243247",
        stroke: "#4a5d78",
        text: "#eef2f7",
        edgeDot: "#eef2f7",
        jointDot: "#38bdf8",
        jointStroke: "#0ea5e9",
      }
    : {
        line: "#222",
        fill: "#fff",
        stroke: "#b0b8c2",
        text: "#111",
        edgeDot: "#ffffff",
        jointDot: "#0284c7",
        jointStroke: "#0369a1",
      };

  const dimDepth = maxLayoutSplitDepth(layout);
  const maxSegDepth = Math.max(0, dimDepth - 1);
  // Keep the window large — only reserve a slim band for split dim labels.
  const hasSplitDims = dimDepth > 0;
  const marginL = hasSplitDims ? Math.min(52, 22 + maxSegDepth * 10) : 18;
  const marginR = hasSplitDims ? Math.min(40, 18 + maxSegDepth * 8) : 18;
  const marginT = hasSplitDims ? Math.min(48, 20 + maxSegDepth * 10) : 16;
  const marginB = hasSplitDims ? Math.min(40, 16 + maxSegDepth * 8) : 16;
  const availW = Math.max(120, VB_W - marginL - marginR);
  const availH = Math.max(140, VB_H - marginT - marginB);
  const aspect =
    item.widthMm > 0 && item.heightMm > 0
      ? item.widthMm / item.heightMm
      : availW / availH;
  let frameW = availW;
  let frameH = frameW / aspect;
  if (frameH > availH) {
    frameH = availH;
    frameW = frameH * aspect;
  }
  const frame: PaneRect = {
    id: "frame",
    x: marginL + (availW - frameW) / 2,
    y: marginT + (availH - frameH) / 2,
    w: frameW,
    h: frameH,
  };
  const svgPerMm =
    item.widthMm > 0 ? frameW / item.widthMm : 0;

  const panes: PaneRect[] = [];
  const mullions: { x: number; y: number; w: number; h: number }[] = [];
  collectPaneRects(layout, frame, panes);
  collectMullionRects(layout, frame, 8, mullions);

  const { widthSegments, heightSegments } = collectAllSplitDims(
    layout,
    item.widthMm,
    item.heightMm,
    frame,
    VB_W,
    VB_H
  );
  const safeWidthSegments = widthSegments.map((seg) => ({
    ...seg,
    y: clamp(seg.y, 10, VB_H - 10),
  }));
  const safeHeightSegments = heightSegments.map((seg) => ({
    ...seg,
    x: clamp(seg.x, 16, VB_W - 16),
  }));

  const profile = 10;
  const lastTap = useRef<{ id: string; at: number } | null>(null);

  function handlePanePointer(paneId: string) {
    const now = Date.now();
    const prev = lastTap.current;
    if (prev && prev.id === paneId && now - prev.at < 320) {
      lastTap.current = null;
      onSelectPane(paneId);
      onOpenPaneProperties(paneId);
      return;
    }
    lastTap.current = { id: paneId, at: now };
    onSelectPane(paneId);
  }

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="h-full w-full max-h-[min(66dvh,560px)] overflow-hidden touch-manipulation"
      role="img"
      aria-label="رسم الشباك"
      onClick={() => onSelectPane(null)}
    >
      <defs>
        {isWood && (
          <pattern
            id="wood-grain"
            patternUnits="userSpaceOnUse"
            width="12"
            height="12"
          >
            <rect width="12" height="12" fill={frameFill} />
            <path
              d="M0 3 H12 M0 7 H12 M0 11 H12"
              stroke="#a88752"
              strokeWidth="0.8"
              opacity="0.55"
            />
          </pattern>
        )}
        <pattern
          id="mesh-pattern"
          patternUnits="userSpaceOnUse"
          width="6"
          height="6"
        >
          <path
            d="M0 0 L6 6 M6 0 L0 6"
            stroke="#6b7c8f"
            strokeWidth="0.6"
            opacity="0.55"
          />
        </pattern>
        {panes.map((p) => {
          const gx = p.x + profile;
          const gy = p.y + profile;
          const gw = Math.max(p.w - profile * 2, 2);
          const gh = Math.max(p.h - profile * 2, 2);
          return (
            <clipPath key={`clip-${p.id}`} id={`pane-clip-${p.id}`}>
              <rect x={gx} y={gy} width={gw} height={gh} />
            </clipPath>
          );
        })}
      </defs>

      <rect width={VB_W} height={VB_H} fill="transparent" />

      {/* أبعاد التقسيم فقط — العرض/الارتفاع الكلي يتعملوا من شريط المقاسات تحت الرسم */}
      {safeWidthSegments.map((seg, _idx, all) => {
        const roles = segmentEndRoles(seg, all, "h");
        return (
          <DimensionLine
            key={seg.id}
            x1={seg.x1 ?? seg.x - 20}
            x2={seg.x2 ?? seg.x + 20}
            y={seg.y}
            label={formatLength(seg.valueMm, unit)}
            size="sm"
            colors={dimColors}
            startRole={roles.start}
            endRole={roles.end}
            onClick={(e) => {
              e.stopPropagation();
              onEditDimension({ kind: "segment", segment: seg });
            }}
            onEqualize={(e) => {
              e.stopPropagation();
              onRequestEqualize({ kind: "segment", path: seg.path });
            }}
            onDeleteJoint={(e, side) => {
              e.stopPropagation();
              const leftIndex =
                side === "start" ? seg.childIndex - 1 : seg.childIndex;
              if (leftIndex < 0) return;
              onRequestDeleteMullion({
                path: seg.path,
                leftChildIndex: leftIndex,
              });
            }}
          />
        );
      })}

      {safeHeightSegments.map((seg, _idx, all) => {
        const roles = segmentEndRoles(seg, all, "v");
        return (
          <DimensionLineVertical
            key={seg.id}
            y1={seg.y1 ?? seg.y - 20}
            y2={seg.y2 ?? seg.y + 20}
            x={seg.x}
            label={formatLength(seg.valueMm, unit)}
            size="sm"
            colors={dimColors}
            startRole={roles.start}
            endRole={roles.end}
            onClick={(e) => {
              e.stopPropagation();
              onEditDimension({ kind: "segment", segment: seg });
            }}
            onEqualize={(e) => {
              e.stopPropagation();
              onRequestEqualize({ kind: "segment", path: seg.path });
            }}
            onDeleteJoint={(e, side) => {
              e.stopPropagation();
              const leftIndex =
                side === "start" ? seg.childIndex - 1 : seg.childIndex;
              if (leftIndex < 0) return;
              onRequestDeleteMullion({
                path: seg.path,
                leftChildIndex: leftIndex,
              });
            }}
          />
        );
      })}

      {/* إطار خارجي */}
      {panes.map((p) => (
        <rect
          key={`outer-${p.id}`}
          x={p.x}
          y={p.y}
          width={p.w}
          height={p.h}
          fill={isWood ? "url(#wood-grain)" : frameFill}
          stroke={frameStroke}
          strokeWidth={1}
        />
      ))}

      {/* زجاج + فتح */}
      {panes.map((p) => {
        const cfg = normalizePaneConfig(item.panes?.[p.id]);
        const selected = selectedPaneId === p.id;
        const gx = p.x + profile;
        const gy = p.y + profile;
        const gw = Math.max(p.w - profile * 2, 2);
        const gh = Math.max(p.h - profile * 2, 2);

        return (
          <g
            key={p.id}
            onClick={(e) => {
              e.stopPropagation();
              handlePanePointer(p.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onSelectPane(p.id);
              onOpenPaneProperties(p.id);
            }}
            className="cursor-pointer"
            clipPath={`url(#pane-clip-${p.id})`}
          >
            <rect
              x={gx}
              y={gy}
              width={gw}
              height={gh}
              fill={
                cfg.opening === "panel-h" || cfg.opening === "panel-v"
                  ? frameFill
                  : glass
              }
              stroke={selected ? openStroke : paneStroke}
              strokeWidth={selected ? 2.2 : 1}
            />
            <PaneInnerFill
              config={cfg}
              x={gx}
              y={gy}
              w={gw}
              h={gh}
              frameFill={frameFill}
              svgPerMm={svgPerMm}
            />
            <OpeningOverlay
              opening={cfg.opening}
              bouclier={Boolean(cfg.bouclier)}
              isDoor={Boolean(cfg.isDoor)}
              x={gx}
              y={gy}
              w={gw}
              h={gh}
              openStroke={openStroke}
              hardware={hardware}
              frameFill={frameFill}
              svgPerMm={svgPerMm}
            />
          </g>
        );
      })}

      {/* mullions */}
      {mullions.map((m, i) => (
        <rect
          key={`m-${i}`}
          x={m.x}
          y={m.y}
          width={m.w}
          height={m.h}
          fill={isWood ? "url(#wood-grain)" : frameFill}
          stroke={frameStroke}
          strokeWidth={0.5}
        />
      ))}
    </svg>
  );
}

function PaneInnerFill({
  config,
  x,
  y,
  w,
  h,
  frameFill,
  svgPerMm = 0,
}: {
  config: PaneConfig;
  x: number;
  y: number;
  w: number;
  h: number;
  frameFill: string;
  svgPerMm?: number;
}) {
  const grid = config.grid ?? "solid";
  const cells = getGridCells(grid, x, y, w, h);
  const panelSet = new Set(config.panelCells ?? []);
  const mullion = 3.2;

  return (
    <g>
      {cells.map((cell, i) => {
        const isPanel =
          Boolean(config.sandwichPanels) &&
          ((grid === "solid" || grid === "diamond")
            ? true
            : panelSet.has(i));
        if (!isPanel && !config.mesh) return null;
        return (
          <g key={i}>
            {isPanel && (
              <SandwichPanelCell
                x={cell.x}
                y={cell.y}
                w={cell.w}
                h={cell.h}
                frameFill={frameFill}
                svgPerMm={svgPerMm}
              />
            )}
            {config.mesh && !isPanel && (
              <rect
                x={cell.x}
                y={cell.y}
                width={cell.w}
                height={cell.h}
                fill="url(#mesh-pattern)"
              />
            )}
          </g>
        );
      })}

      {/* خطوط التقسيم الداخلي */}
      {gridLines(grid, x, y, w, h).map((line, i) => (
        <line
          key={`g-${i}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={frameFill}
          strokeWidth={mullion}
        />
      ))}
    </g>
  );
}

function SandwichPanelCell({
  x,
  y,
  w,
  h,
  frameFill,
  svgPerMm = 0,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  frameFill: string;
  svgPerMm?: number;
}) {
  const { gap, positions } = panelStripeLayout(h, svgPerMm);
  const divider = panelStripeDivider(frameFill);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={frameFill} />
      {positions.map((pos, i) => (
        <line
          key={i}
          x1={x + 0.5}
          y1={y + pos}
          x2={x + w - 0.5}
          y2={y + pos}
          stroke={divider}
          strokeWidth={gap}
        />
      ))}
    </g>
  );
}

function OpeningOverlay({
  opening,
  bouclier = false,
  isDoor = false,
  x,
  y,
  w,
  h,
  openStroke,
  hardware,
  frameFill,
  svgPerMm = 0,
}: {
  opening: PaneOpening;
  bouclier?: boolean;
  isDoor?: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  openStroke: string;
  hardware: string;
  frameFill: string;
  svgPerMm?: number;
}) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const inset = 3;
  const doorHinges =
    isDoor || opening === "door-left" || opening === "door-right" ? 3 : 2;

  if (opening === "fixed" && bouclier) {
    return (
      <>
        <Handle x={x + inset + 4} y={cy} vertical hardware={hardware} />
        <Handle x={x + w - inset - 4} y={cy} vertical hardware={hardware} />
      </>
    );
  }

  if (opening === "fixed") {
    return (
      <>
        <line
          x1={x + inset}
          y1={y + inset}
          x2={x + w - inset}
          y2={y + h - inset}
          stroke={openStroke}
          strokeWidth={1.1}
          opacity={0.35}
        />
        <line
          x1={x + w - inset}
          y1={y + inset}
          x2={x + inset}
          y2={y + h - inset}
          stroke={openStroke}
          strokeWidth={1.1}
          opacity={0.35}
        />
      </>
    );
  }

  if (opening === "exhaust") {
    const fan = exhaustFanGeom(cx, cy, Math.min(w, h), 1.35);
    return (
      <>
        <circle
          cx={fan.cx}
          cy={fan.cy}
          r={fan.outerR}
          fill="none"
          stroke={openStroke}
          strokeWidth={fan.strokeWidth}
        />
        {fan.blades.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={openStroke}
            strokeWidth={fan.strokeWidth * 0.95}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        <circle cx={fan.cx} cy={fan.cy} r={fan.hubR} fill={openStroke} />
      </>
    );
  }

  if (opening === "casement-left" || opening === "door-left") {
    return (
      <>
        <path
          d={`M ${x + w - inset} ${y + inset} L ${x + inset} ${cy} L ${x + w - inset} ${y + h - inset}`}
          fill="none"
          stroke={openStroke}
          strokeWidth={1.4}
        />
        <Handle x={x + inset + 4} y={cy} vertical hardware={hardware} />
        <Hinges
          side="right"
          x={x}
          y={y}
          w={w}
          h={h}
          count={doorHinges}
          hardware={hardware}
        />
      </>
    );
  }

  if (opening === "casement-right" || opening === "door-right") {
    return (
      <>
        <path
          d={`M ${x + inset} ${y + inset} L ${x + w - inset} ${cy} L ${x + inset} ${y + h - inset}`}
          fill="none"
          stroke={openStroke}
          strokeWidth={1.4}
        />
        <Handle x={x + w - inset - 4} y={cy} vertical hardware={hardware} />
        <Hinges
          side="left"
          x={x}
          y={y}
          w={w}
          h={h}
          count={doorHinges}
          hardware={hardware}
        />
      </>
    );
  }

  if (opening === "tilt") {
    return (
      <>
        <path
          d={`M ${x + inset} ${y + h - inset} L ${cx} ${y + inset} L ${x + w - inset} ${y + h - inset}`}
          fill="none"
          stroke={openStroke}
          strokeWidth={1.4}
        />
        <Handle x={cx} y={y + inset + 5} vertical={false} hardware={hardware} />
      </>
    );
  }

  if (opening === "tilt-inverted") {
    return (
      <>
        <path
          d={`M ${x + inset} ${y + inset} L ${cx} ${y + h - inset} L ${x + w - inset} ${y + inset}`}
          fill="none"
          stroke={openStroke}
          strokeWidth={1.4}
        />
        <Handle
          x={cx}
          y={y + h - inset - 5}
          vertical={false}
          hardware={hardware}
        />
      </>
    );
  }

  if (opening === "tilt-turn") {
    return (
      <>
        <path
          d={`M ${x + inset} ${y + h - inset} L ${cx} ${y + inset} L ${x + w - inset} ${y + h - inset}`}
          fill="none"
          stroke={openStroke}
          strokeWidth={1.3}
        />
        <path
          d={`M ${x + w - inset} ${y + inset} L ${x + inset} ${cy} L ${x + w - inset} ${y + h - inset}`}
          fill="none"
          stroke={openStroke}
          strokeWidth={1.1}
          opacity={0.75}
        />
        <Handle x={x + inset + 4} y={cy} vertical hardware={hardware} />
        <Hinges side="right" x={x} y={y} w={w} h={h} hardware={hardware} />
      </>
    );
  }

  if (opening === "tilt-turn-left") {
    return (
      <>
        <path
          d={`M ${x + inset} ${y + h - inset} L ${cx} ${y + inset} L ${x + w - inset} ${y + h - inset}`}
          fill="none"
          stroke={openStroke}
          strokeWidth={1.3}
        />
        <path
          d={`M ${x + inset} ${y + inset} L ${x + w - inset} ${cy} L ${x + inset} ${y + h - inset}`}
          fill="none"
          stroke={openStroke}
          strokeWidth={1.1}
          opacity={0.75}
        />
        <Handle x={x + w - inset - 4} y={cy} vertical hardware={hardware} />
        <Hinges side="left" x={x} y={y} w={w} h={h} hardware={hardware} />
      </>
    );
  }

  if (opening === "sliding-left") {
    return (
      <>
        <line
          x1={x + w * 0.7}
          y1={cy}
          x2={x + inset + 8}
          y2={cy}
          stroke={openStroke}
          strokeWidth={1.4}
        />
        <path
          d={`M ${x + inset + 14} ${cy - 6} L ${x + inset + 6} ${cy} L ${x + inset + 14} ${cy + 6}`}
          fill="none"
          stroke={openStroke}
          strokeWidth={1.4}
        />
        <Handle x={cx} y={cy} vertical={false} hardware={hardware} />
      </>
    );
  }

  if (opening === "sliding-right") {
    return (
      <>
        <line
          x1={x + w * 0.3}
          y1={cy}
          x2={x + w - inset - 8}
          y2={cy}
          stroke={openStroke}
          strokeWidth={1.4}
        />
        <path
          d={`M ${x + w - inset - 14} ${cy - 6} L ${x + w - inset - 6} ${cy} L ${x + w - inset - 14} ${cy + 6}`}
          fill="none"
          stroke={openStroke}
          strokeWidth={1.4}
        />
        <Handle x={cx} y={cy} vertical={false} hardware={hardware} />
      </>
    );
  }

  if (opening === "drawer-left") {
    const len = Math.min(w * 0.55, 72);
    const tipX = cx - len / 2;
    const tailX = cx + len / 2;
    const head = Math.min(12, len * 0.22);
    const drop = Math.min(14, h * 0.12);
    return (
      <path
        d={`M ${tipX + head} ${cy - head * 0.7} L ${tipX} ${cy} L ${tipX + head} ${cy + head * 0.7} M ${tipX} ${cy} L ${tailX} ${cy} L ${tailX} ${cy + drop}`}
        fill="none"
        stroke={openStroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }

  if (opening === "drawer-right") {
    const len = Math.min(w * 0.55, 72);
    const tipX = cx + len / 2;
    const tailX = cx - len / 2;
    const head = Math.min(12, len * 0.22);
    const drop = Math.min(14, h * 0.12);
    return (
      <path
        d={`M ${tipX - head} ${cy - head * 0.7} L ${tipX} ${cy} L ${tipX - head} ${cy + head * 0.7} M ${tipX} ${cy} L ${tailX} ${cy} L ${tailX} ${cy + drop}`}
        fill="none"
        stroke={openStroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }

  if (opening === "panel-h") {
    const gap = svgPerMm > 0 ? Math.max(1.2, svgPerMm * 2) : 3.6;
    const stripe =
      svgPerMm > 0
        ? PANEL_STRIPE_MM * svgPerMm
        : Math.max(h * 0.15, gap * 5);
    const divider = luminance(frameFill) < 0.45 ? "#ffffff66" : "#00000040";
    const lines: number[] = [];
    for (let pos = stripe; pos < h - 0.5; pos += stripe) {
      lines.push(pos);
    }
    return (
      <>
        <rect x={x} y={y} width={w} height={h} fill={frameFill} />
        {lines.map((pos, i) => (
          <line
            key={i}
            x1={x + 0.5}
            y1={y + pos}
            x2={x + w - 0.5}
            y2={y + pos}
            stroke={divider}
            strokeWidth={gap}
          />
        ))}
      </>
    );
  }

  if (opening === "panel-v") {
    const gap = svgPerMm > 0 ? Math.max(1.2, svgPerMm * 2) : 3.6;
    const stripe =
      svgPerMm > 0
        ? PANEL_STRIPE_MM * svgPerMm
        : Math.max(w * 0.15, gap * 5);
    const divider = luminance(frameFill) < 0.45 ? "#ffffff66" : "#00000040";
    const lines: number[] = [];
    for (let pos = stripe; pos < w - 0.5; pos += stripe) {
      lines.push(pos);
    }
    return (
      <>
        <rect x={x} y={y} width={w} height={h} fill={frameFill} />
        {lines.map((pos, i) => (
          <line
            key={i}
            x1={x + pos}
            y1={y + 0.5}
            x2={x + pos}
            y2={y + h - 0.5}
            stroke={divider}
            strokeWidth={gap}
          />
        ))}
      </>
    );
  }

  return null;
}

function Handle({
  x,
  y,
  vertical,
  hardware,
}: {
  x: number;
  y: number;
  vertical: boolean;
  hardware: string;
}) {
  if (vertical) {
    return (
      <rect
        x={x - 2}
        y={y - 8}
        width={4}
        height={16}
        rx={1}
        fill={hardware}
      />
    );
  }
  return (
    <rect x={x - 8} y={y - 2} width={16} height={4} rx={1} fill={hardware} />
  );
}

function Hinges({
  side,
  x,
  y,
  w,
  h,
  count = 2,
  hardware,
}: {
  side: "left" | "right";
  x: number;
  y: number;
  w: number;
  h: number;
  count?: number;
  hardware: string;
}) {
  const hx = side === "left" ? x + 1 : x + w - 5;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const hy = y + ((i + 1) * h) / (count + 1) - 5;
        return (
          <rect
            key={i}
            x={hx}
            y={hy}
            width={4}
            height={10}
            rx={0.5}
            fill={hardware}
          />
        );
      })}
    </>
  );
}

function pathKey(path: number[]): string {
  return path.join(".") || "r";
}

function sameDimGroup(a: DimSegment, b: DimSegment): boolean {
  return (
    pathKey(a.path) === pathKey(b.path) &&
    a.placement === b.placement &&
    a.depth === b.depth &&
    (a.orient === "v"
      ? Math.abs(a.y - b.y) < 0.5
      : Math.abs(a.x - b.x) < 0.5)
  );
}

/** طرف الضلفة = edge، نقطة التقسيم بين ضلفتين = joint (على الطرف اليمين/تحت فقط لتفادي التكرار) */
function segmentEndRoles(
  seg: DimSegment,
  all: DimSegment[],
  _axis: "h" | "v"
): { start: DimEndRole; end: DimEndRole } {
  const group = all
    .filter((s) => sameDimGroup(s, seg))
    .sort((a, b) => a.childIndex - b.childIndex);
  const minIdx = group[0]?.childIndex ?? seg.childIndex;
  const maxIdx = group[group.length - 1]?.childIndex ?? seg.childIndex;
  return {
    start: seg.childIndex === minIdx ? "edge" : "hidden",
    end: seg.childIndex === maxIdx ? "edge" : "joint",
  };
}

type DimEndRole = "plain" | "edge" | "joint" | "hidden";

function DimensionLine({
  x1,
  x2,
  y,
  label,
  size = "lg",
  colors,
  onClick,
  onEqualize,
  onDeleteJoint,
  startRole = "plain",
  endRole = "plain",
}: {
  x1: number;
  x2: number;
  y: number;
  label: string;
  size?: "lg" | "sm";
  colors: DimColors;
  onClick: (e: MouseEvent) => void;
  onEqualize?: (e: MouseEvent) => void;
  onDeleteJoint?: (e: MouseEvent, side: "start" | "end") => void;
  startRole?: DimEndRole;
  endRole?: DimEndRole;
}) {
  const mid = (x1 + x2) / 2;
  const fontSize = size === "lg" ? 12 : 10;
  const padX = size === "lg" ? 10 : 7;
  const bw = Math.max(label.length * (fontSize * 0.62) + padX * 2, 28);
  const bh = size === "lg" ? 15 : 13;

  return (
    <g className="cursor-pointer">
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={colors.line} strokeWidth={1} />
      <DimEndDot
        cx={x1}
        cy={y}
        role={startRole}
        size={size}
        colors={colors}
        onClick={(e) => {
          if (startRole === "joint") onDeleteJoint?.(e, "start");
          else if (startRole === "edge" && onEqualize) onEqualize(e);
          else onClick(e);
        }}
      />
      <DimEndDot
        cx={x2}
        cy={y}
        role={endRole}
        size={size}
        colors={colors}
        onClick={(e) => {
          if (endRole === "joint") onDeleteJoint?.(e, "end");
          else if (endRole === "edge" && onEqualize) onEqualize(e);
          else onClick(e);
        }}
      />
      <g onClick={onClick}>
        <rect
          x={mid - bw / 2}
          y={y - bh / 2}
          width={bw}
          height={bh}
          rx={bh / 2}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={0.8}
        />
        <text
          x={mid}
          y={y + 0.5}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={colors.text}
          style={{ fontSize, fontWeight: size === "lg" ? 700 : 600 }}
        >
          {label}
        </text>
      </g>
    </g>
  );
}

function DimensionLineVertical({
  y1,
  y2,
  x,
  label,
  size = "lg",
  colors,
  onClick,
  onEqualize,
  onDeleteJoint,
  startRole = "plain",
  endRole = "plain",
}: {
  y1: number;
  y2: number;
  x: number;
  label: string;
  size?: "lg" | "sm";
  colors: DimColors;
  onClick: (e: MouseEvent) => void;
  onEqualize?: (e: MouseEvent) => void;
  onDeleteJoint?: (e: MouseEvent, side: "start" | "end") => void;
  startRole?: DimEndRole;
  endRole?: DimEndRole;
}) {
  const mid = (y1 + y2) / 2;
  const fontSize = size === "lg" ? 12 : 10;
  const padX = size === "lg" ? 10 : 7;
  const bw = Math.max(label.length * (fontSize * 0.62) + padX * 2, 28);
  const bh = size === "lg" ? 15 : 13;

  return (
    <g className="cursor-pointer">
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={colors.line} strokeWidth={1} />
      <DimEndDot
        cx={x}
        cy={y1}
        role={startRole}
        size={size}
        colors={colors}
        onClick={(e) => {
          if (startRole === "joint") onDeleteJoint?.(e, "start");
          else if (startRole === "edge" && onEqualize) onEqualize(e);
          else onClick(e);
        }}
      />
      <DimEndDot
        cx={x}
        cy={y2}
        role={endRole}
        size={size}
        colors={colors}
        onClick={(e) => {
          if (endRole === "joint") onDeleteJoint?.(e, "end");
          else if (endRole === "edge" && onEqualize) onEqualize(e);
          else onClick(e);
        }}
      />
      <g onClick={onClick}>
        <rect
          x={x - bw / 2}
          y={mid - bh / 2}
          width={bw}
          height={bh}
          rx={bh / 2}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={0.8}
        />
        <text
          x={x}
          y={mid + 0.5}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={colors.text}
          style={{ fontSize, fontWeight: size === "lg" ? 700 : 600 }}
        >
          {label}
        </text>
      </g>
    </g>
  );
}

function DimEndDot({
  cx,
  cy,
  role,
  size,
  colors,
  onClick,
}: {
  cx: number;
  cy: number;
  role: DimEndRole;
  size: "lg" | "sm";
  colors: DimColors;
  onClick: (e: MouseEvent) => void;
}) {
  if (role === "hidden") return null;
  const hitR = size === "lg" ? 7 : 6;
  if (role === "plain") {
    return (
      <g onClick={onClick}>
        <circle cx={cx} cy={cy} r={hitR} fill="transparent" />
        <circle cx={cx} cy={cy} r={2.2} fill={colors.line} />
      </g>
    );
  }
  if (role === "edge") {
    return (
      <g onClick={onClick}>
        <circle cx={cx} cy={cy} r={hitR} fill="transparent" />
        <circle
          cx={cx}
          cy={cy}
          r={3.2}
          fill={colors.edgeDot}
          stroke={colors.line}
          strokeWidth={1.6}
        />
      </g>
    );
  }
  return (
    <g onClick={onClick}>
      <circle cx={cx} cy={cy} r={hitR + 1} fill="transparent" />
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={colors.jointDot}
        stroke={colors.jointStroke}
        strokeWidth={1.8}
      />
    </g>
  );
}

function luminance(hex: string): number {
  const raw = hex.replace("#", "");
  if (raw.length < 6) return 0.5;
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
