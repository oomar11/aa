"use client";

import { useId } from "react";
import {
  FRAME_COLORS,
  PANEL_STRIPE_MM,
  normalizeFrameColor,
  normalizePaneConfig,
  type DesignItem,
  type FrameColorId,
  type PaneConfig,
  type PaneOpening,
  type WindowStyle,
} from "@/lib/design-items";
import {
  collectMullionRects,
  collectPaneRects,
  type PaneRect,
  type Rect,
} from "@/lib/drawing-ops";
import { exhaustFanGeom } from "@/lib/exhaust-fan";
import { getGridCells, gridLines } from "@/lib/pane-grid";
import { panelStripeDivider, panelStripeLayout } from "@/lib/panel-stripes";
import {
  ensurePaneIds,
  getLayoutPreviewSize,
  type LayoutNode,
} from "@/lib/window-layout";
import { getTemplateById } from "@/lib/window-templates";
import { formatLength, type LengthUnit } from "@/lib/units";
import { DouranFrameRing, douranGlassRect } from "@/components/drawing/DouranPaneMarks";

type Props = {
  style: WindowStyle;
  templateId?: string;
  layout?: LayoutNode;
  panes?: DesignItem["panes"];
  frameColor?: FrameColorId;
  widthMm?: number;
  heightMm?: number;
  className?: string;
  /** إظهار مقاسات العرض/الارتفاع على الرسم (للتقرير) */
  showDimensions?: boolean;
  /** وحدة عرض المقاسات */
  unit?: LengthUnit;
  /** رسم عالي التباين لطباعة المقايسة أبيض وأسود */
  printContrast?: boolean;
};

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

function collectEmptyRects(node: LayoutNode, rect: Rect, out: Rect[]) {
  if (node.type === "empty") {
    out.push(rect);
    return;
  }
  if (node.type === "pane") return;
  const total = sum(node.ratios) || 1;
  let offset = 0;
  node.children.forEach((child, i) => {
    const portion = node.ratios[i]! / total;
    if (node.dir === "v") {
      const w = rect.w * portion;
      collectEmptyRects(
        child,
        { x: rect.x + offset, y: rect.y, w, h: rect.h },
        out
      );
      offset += w;
    } else {
      const h = rect.h * portion;
      collectEmptyRects(
        child,
        { x: rect.x, y: rect.y + offset, w: rect.w, h },
        out
      );
      offset += h;
    }
  });
}

export function WindowPreview({
  style,
  templateId,
  layout,
  panes,
  frameColor = "white",
  widthMm,
  heightMm,
  className = "",
  showDimensions = false,
  unit = "mm",
  printContrast = false,
}: Props) {
  const uid = useId().replace(/:/g, "");

  const resolved =
    layout ??
    (templateId ? getTemplateById(templateId)?.layout : undefined);

  if (!resolved) {
    return (
      <LegacyStylePreview
        style={style}
        className={className}
        printContrast={printContrast}
      />
    );
  }

  const tree = ensurePaneIds(resolved);
  const auto = getLayoutPreviewSize(tree);
  let winW = auto.width;
  let winH = auto.height;
  if (widthMm && heightMm && widthMm > 0 && heightMm > 0) {
    const aspect = widthMm / heightMm;
    const maxW = showDimensions ? (printContrast ? 260 : 150) : 140;
    const maxH = showDimensions ? (printContrast ? 260 : 140) : 150;
    if (aspect >= 1) {
      winW = maxW;
      winH = Math.max(56, Math.round(maxW / aspect));
    } else {
      winH = maxH;
      winW = Math.max(48, Math.round(maxH * aspect));
    }
  }

  const showDims =
    showDimensions &&
    Boolean(widthMm && heightMm && widthMm > 0 && heightMm > 0);
  // مساحة كافية لمقاس العرض/الارتفاع فقط — بدون مقاسات تقسيم عشان متتداخلش
  const dimPadTop = showDims ? (printContrast ? 42 : 22) : 5;
  const dimPadLeft = showDims ? (printContrast ? 64 : 28) : 5;
  const dimPadRight = showDims ? (printContrast ? 16 : 8) : 5;
  const dimPadBottom = showDims ? (printContrast ? 16 : 8) : 5;
  const vbW = showDims ? dimPadLeft + winW + dimPadRight : winW;
  const vbH = showDims ? dimPadTop + winH + dimPadBottom : winH;
  const frame: Rect = showDims
    ? { x: dimPadLeft, y: dimPadTop, w: winW, h: winH }
    : { x: 5, y: 5, w: winW - 10, h: winH - 10 };

  const paneRects: PaneRect[] = [];
  const svgPerMm =
    widthMm && widthMm > 0 ? frame.w / widthMm : 0;
  const emptyRects: Rect[] = [];
  const mullions: Rect[] = [];
  collectPaneRects(tree, frame, paneRects);
  collectEmptyRects(tree, frame, emptyRects);
  collectMullionRects(tree, frame, Math.max(2.4, Math.min(frame.w, frame.h) * 0.035), mullions);

  const frameMeta = FRAME_COLORS[normalizeFrameColor(frameColor)];
  const frameFill = printContrast
    ? printFrameFill(frameMeta.hex)
    : frameMeta.hex;
  const isWood = Boolean(frameMeta.wood);
  const glass = printContrast ? "#ffffff" : "#9ec8e8";
  const openStroke = printContrast ? "#111111" : "#2b7de9";
  const hardware = printContrast ? "#111111" : "#6b7585";
  const frameStroke = printContrast ? "#111111" : "#8a96a5";
  const emptyFill = printContrast ? "#ffffff" : "#f4f6f9";
  const emptyStroke = printContrast ? "#555555" : "#c5d0dc";
  const profile = Math.max(2.8, Math.min(frame.w, frame.h) * 0.045);
  const frameStrokeW = printContrast ? 2.2 : 0.9;
  const paneStrokeW = printContrast ? 2 : 0.6;
  const mullionStrokeW = printContrast ? 2 : 0.4;
  const woodId = `wood-${uid}`;
  const meshId = `mesh-${uid}`;
  const emptyPatId = `empty-${uid}`;

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        {isWood && (
          <pattern
            id={woodId}
            patternUnits="userSpaceOnUse"
            width="10"
            height="10"
          >
            <rect width="10" height="10" fill={frameFill} />
            <path
              d="M0 2.5 H10 M0 6 H10 M0 9.5 H10"
              stroke={printContrast ? "#5a3d18" : "#a88752"}
              strokeWidth={printContrast ? 1.1 : 0.7}
              opacity={printContrast ? 0.9 : 0.55}
            />
          </pattern>
        )}
        <pattern
          id={meshId}
          patternUnits="userSpaceOnUse"
          width="5"
          height="5"
        >
          <path
            d="M0 0 L5 5 M5 0 L0 5"
            stroke={printContrast ? "#333333" : "#6b7c8f"}
            strokeWidth={printContrast ? 0.9 : 0.55}
            opacity={printContrast ? 1 : 0.65}
          />
        </pattern>
        <pattern
          id={emptyPatId}
          patternUnits="userSpaceOnUse"
          width="6"
          height="6"
        >
          <path
            d="M0 6 L6 0"
            stroke={emptyStroke}
            strokeWidth={printContrast ? 1 : 0.7}
            opacity={printContrast ? 0.9 : 0.55}
          />
        </pattern>
      </defs>

      <rect width={vbW} height={vbH} fill="transparent" />

      {/* مساحات فاضية */}
      {emptyRects.map((r, i) => (
        <g key={`e-${i}`}>
          <rect
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            fill={emptyFill}
            stroke={emptyStroke}
            strokeWidth={printContrast ? 1.2 : 0.7}
            strokeDasharray="3 2"
          />
          <rect
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            fill={`url(#${emptyPatId})`}
            opacity={0.7}
          />
        </g>
      ))}

      {/* إطار الضلف */}
      {paneRects.map((p) => (
        <rect
          key={`outer-${p.id}`}
          x={p.x}
          y={p.y}
          width={p.w}
          height={p.h}
          fill={isWood ? `url(#${woodId})` : frameFill}
          stroke={frameStroke}
          strokeWidth={frameStrokeW}
        />
      ))}

      {/* حلق الدوران */}
      {paneRects.map((p) => {
        const cfg = normalizePaneConfig(panes?.[p.id]);
        if (cfg.opening !== "fixed" || !cfg.douran) return null;
        return (
          <DouranFrameRing
            key={`douran-ring-${p.id}`}
            x={p.x}
            y={p.y}
            w={p.w}
            h={p.h}
            ringW={profile}
            fill={frameFill}
            stroke={frameStroke}
            strokeWidth={frameStrokeW}
            woodPatternId={isWood ? woodId : undefined}
          />
        );
      })}

      {/* محتوى الضلفة */}
      {paneRects.map((p) => {
        const cfg = normalizePaneConfig(panes?.[p.id]);
        const isDouran =
          cfg.opening === "fixed" && Boolean(cfg.douran);
        const glassBox = isDouran
          ? douranGlassRect(p.x, p.y, p.w, p.h, profile)
          : {
              x: p.x + profile,
              y: p.y + profile,
              w: Math.max(p.w - profile * 2, 1.5),
              h: Math.max(p.h - profile * 2, 1.5),
            };
        const { x: gx, y: gy, w: gw, h: gh } = glassBox;
        const isLouver =
          cfg.opening === "panel-h" || cfg.opening === "panel-v";
        const isExhaust = cfg.opening === "exhaust";

        return (
          <g key={p.id}>
            <rect
              x={gx}
              y={gy}
              width={gw}
              height={gh}
              fill={isLouver || isExhaust ? frameFill : glass}
              stroke={frameStroke}
              strokeWidth={paneStrokeW}
            />
            {!isExhaust && !isDouran && (
              <PaneDetailFill
                config={cfg}
                x={gx}
                y={gy}
                w={gw}
                h={gh}
                frameFill={frameFill}
                meshId={meshId}
                svgPerMm={svgPerMm}
                printContrast={printContrast}
              />
            )}
            <OpeningMarks
              opening={cfg.opening}
              bouclier={Boolean(cfg.bouclier)}
              douran={Boolean(cfg.douran)}
              x={gx}
              y={gy}
              w={gw}
              h={gh}
              openStroke={openStroke}
              hardware={hardware}
              frameFill={frameFill}
              svgPerMm={svgPerMm}
              printContrast={printContrast}
            />
          </g>
        );
      })}

      {mullions.map((m, i) => (
        <rect
          key={`m-${i}`}
          x={m.x}
          y={m.y}
          width={m.w}
          height={m.h}
          fill={isWood ? `url(#${woodId})` : frameFill}
          stroke={frameStroke}
          strokeWidth={mullionStrokeW}
        />
      ))}

      {showDims && widthMm && heightMm ? (
        <PreviewDimensions
          frame={frame}
          widthMm={widthMm}
          heightMm={heightMm}
          unit={unit}
          color={printContrast ? "#111111" : "#2b7de9"}
          printContrast={printContrast}
        />
      ) : null}
    </svg>
  );
}

/** خط ثابت للـ SVG — متغيرات CSS غالباً متتحلش صح وقت تصوير PDF */
const PREVIEW_DIM_FONT =
  'Cairo, "Noto Sans Arabic", "Segoe UI", Tahoma, sans-serif';

/** مقاسات العرض والارتفاع الكلية فقط على معاينة التقرير */
function PreviewDimensions({
  frame,
  widthMm,
  heightMm,
  unit,
  color,
  printContrast = false,
}: {
  frame: Rect;
  widthMm: number;
  heightMm: number;
  unit: LengthUnit;
  color: string;
  printContrast?: boolean;
}) {
  const widthY = frame.y - (printContrast ? 24 : 12);
  const heightX = frame.x - (printContrast ? 30 : 14);
  const fontSize = printContrast ? 18 : 9;

  return (
    <g aria-hidden>
      <PreviewDimH
        x1={frame.x}
        x2={frame.x + frame.w}
        y={widthY}
        frameY={frame.y}
        label={formatLength(widthMm, unit)}
        color={color}
        fontSize={fontSize}
        strong
        printContrast={printContrast}
      />
      <PreviewDimV
        y1={frame.y}
        y2={frame.y + frame.h}
        x={heightX}
        frameX={frame.x}
        label={formatLength(heightMm, unit)}
        color={color}
        fontSize={fontSize}
        strong
        printContrast={printContrast}
      />
    </g>
  );
}

function PreviewDimH({
  x1,
  x2,
  y,
  frameY,
  label,
  color,
  fontSize,
  strong = false,
  printContrast = false,
}: {
  x1: number;
  x2: number;
  y: number;
  frameY: number;
  label: string;
  color: string;
  fontSize: number;
  strong?: boolean;
  printContrast?: boolean;
}) {
  const mid = (x1 + x2) / 2;
  const bw = Math.max(label.length * fontSize * 0.62 + 6, 18);
  const bh = fontSize + 3;
  const extW = printContrast ? 1.6 : 0.7;
  const dimW = printContrast ? (strong ? 2.2 : 1.8) : strong ? 1.1 : 0.85;
  const chipW = printContrast ? 1.6 : 0.7;
  const dotR = printContrast ? (strong ? 2.6 : 2.1) : strong ? 1.4 : 1.1;
  return (
    <g>
      <line
        x1={x1}
        y1={frameY}
        x2={x1}
        y2={y}
        stroke={color}
        strokeWidth={extW}
        opacity={printContrast ? 1 : 0.55}
      />
      <line
        x1={x2}
        y1={frameY}
        x2={x2}
        y2={y}
        stroke={color}
        strokeWidth={extW}
        opacity={printContrast ? 1 : 0.55}
      />
      <line
        x1={x1}
        y1={y}
        x2={x2}
        y2={y}
        stroke={color}
        strokeWidth={dimW}
      />
      <circle cx={x1} cy={y} r={dotR} fill={color} />
      <circle cx={x2} cy={y} r={dotR} fill={color} />
      <rect
        x={mid - bw / 2}
        y={y - bh / 2}
        width={bw}
        height={bh}
        rx={2}
        fill="#ffffff"
        stroke={color}
        strokeWidth={chipW}
      />
      <text
        x={mid}
        y={y + fontSize * 0.35}
        textAnchor="middle"
        fill={color}
        fontSize={fontSize}
        fontWeight={strong ? 700 : 600}
        fontFamily={PREVIEW_DIM_FONT}
      >
        {label}
      </text>
    </g>
  );
}

function PreviewDimV({
  y1,
  y2,
  x,
  frameX,
  label,
  color,
  fontSize,
  strong = false,
  printContrast = false,
}: {
  y1: number;
  y2: number;
  x: number;
  frameX: number;
  label: string;
  color: string;
  fontSize: number;
  strong?: boolean;
  printContrast?: boolean;
}) {
  const mid = (y1 + y2) / 2;
  const bw = Math.max(label.length * fontSize * 0.62 + 6, 18);
  const bh = fontSize + 3;
  const extW = printContrast ? 1.6 : 0.7;
  const dimW = printContrast ? (strong ? 2.2 : 1.8) : strong ? 1.1 : 0.85;
  const chipW = printContrast ? 1.6 : 0.7;
  const dotR = printContrast ? (strong ? 2.6 : 2.1) : strong ? 1.4 : 1.1;
  return (
    <g>
      <line
        x1={frameX}
        y1={y1}
        x2={x}
        y2={y1}
        stroke={color}
        strokeWidth={extW}
        opacity={printContrast ? 1 : 0.55}
      />
      <line
        x1={frameX}
        y1={y2}
        x2={x}
        y2={y2}
        stroke={color}
        strokeWidth={extW}
        opacity={printContrast ? 1 : 0.55}
      />
      <line
        x1={x}
        y1={y1}
        x2={x}
        y2={y2}
        stroke={color}
        strokeWidth={dimW}
      />
      <circle cx={x} cy={y1} r={dotR} fill={color} />
      <circle cx={x} cy={y2} r={dotR} fill={color} />
      <rect
        x={x - bw / 2}
        y={mid - bh / 2}
        width={bw}
        height={bh}
        rx={2}
        fill="#ffffff"
        stroke={color}
        strokeWidth={chipW}
      />
      <text
        x={x}
        y={mid + fontSize * 0.35}
        textAnchor="middle"
        fill={color}
        fontSize={fontSize}
        fontWeight={strong ? 700 : 600}
        fontFamily={PREVIEW_DIM_FONT}
      >
        {label}
      </text>
    </g>
  );
}

function PaneDetailFill({
  config,
  x,
  y,
  w,
  h,
  frameFill,
  meshId,
  svgPerMm = 0,
  printContrast = false,
}: {
  config: PaneConfig;
  x: number;
  y: number;
  w: number;
  h: number;
  frameFill: string;
  meshId: string;
  svgPerMm?: number;
  printContrast?: boolean;
}) {
  const grid = config.grid ?? "solid";
  const cells = getGridCells(grid, x, y, w, h);
  const panelSet = new Set(config.panelCells ?? []);
  const mullion = Math.max(2.2, Math.min(w, h) * 0.055);

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
                printContrast={printContrast}
              />
            )}
            {config.mesh && !isPanel && (
              <rect
                x={cell.x}
                y={cell.y}
                width={cell.w}
                height={cell.h}
                fill={`url(#${meshId})`}
              />
            )}
          </g>
        );
      })}
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
  printContrast = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  frameFill: string;
  svgPerMm?: number;
  printContrast?: boolean;
}) {
  const { gap, positions } = panelStripeLayout(h, svgPerMm, Math.min(w, h) * 0.045);
  const divider = panelStripeDivider(frameFill, printContrast);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={frameFill} />
      {positions.map((pos, i) => (
        <line
          key={i}
          x1={x}
          y1={y + pos}
          x2={x + w}
          y2={y + pos}
          stroke={divider}
          strokeWidth={gap}
        />
      ))}
    </g>
  );
}

function OpeningMarks({
  opening,
  bouclier,
  douran = false,
  x,
  y,
  w,
  h,
  openStroke,
  hardware,
  frameFill,
  svgPerMm = 0,
  printContrast = false,
}: {
  opening: PaneOpening;
  bouclier: boolean;
  douran?: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  openStroke: string;
  hardware: string;
  frameFill: string;
  svgPerMm?: number;
  printContrast?: boolean;
}) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const inset = Math.max(1.5, Math.min(w, h) * 0.06);
  const sw = Math.max(
    printContrast ? 1.3 : 0.9,
    Math.min(w, h) * (printContrast ? 0.045 : 0.035)
  );

  if (opening === "fixed" && bouclier) {
    return (
      <>
        <rect x={x + inset} y={cy - 4} width={2.2} height={8} rx={0.6} fill={hardware} />
        <rect x={x + w - inset - 2.2} y={cy - 4} width={2.2} height={8} rx={0.6} fill={hardware} />
      </>
    );
  }

  if (opening === "fixed" && douran) {
    return null;
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
          strokeWidth={sw}
          opacity={printContrast ? 1 : 0.4}
        />
        <line
          x1={x + w - inset}
          y1={y + inset}
          x2={x + inset}
          y2={y + h - inset}
          stroke={openStroke}
          strokeWidth={sw}
          opacity={printContrast ? 1 : 0.4}
        />
      </>
    );
  }

  if (opening === "exhaust") {
    const fan = exhaustFanGeom(
      cx,
      cy,
      Math.min(w, h),
      Math.max(0.9, sw * 0.95)
    );
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
          strokeWidth={sw}
        />
        <rect x={x + inset} y={cy - 4} width={2.2} height={8} rx={0.6} fill={hardware} />
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
          strokeWidth={sw}
        />
        <rect x={x + w - inset - 2.2} y={cy - 4} width={2.2} height={8} rx={0.6} fill={hardware} />
      </>
    );
  }

  if (opening === "tilt") {
    return (
      <path
        d={`M ${x + inset} ${y + h - inset} L ${cx} ${y + inset} L ${x + w - inset} ${y + h - inset}`}
        fill="none"
        stroke={openStroke}
        strokeWidth={sw}
      />
    );
  }

  if (opening === "tilt-inverted") {
    return (
      <path
        d={`M ${x + inset} ${y + inset} L ${cx} ${y + h - inset} L ${x + w - inset} ${y + inset}`}
        fill="none"
        stroke={openStroke}
        strokeWidth={sw}
      />
    );
  }

  if (opening === "tilt-turn") {
    return (
      <>
        <path
          d={`M ${x + inset} ${y + h - inset} L ${cx} ${y + inset} L ${x + w - inset} ${y + h - inset}`}
          fill="none"
          stroke={openStroke}
          strokeWidth={sw}
        />
        <path
          d={`M ${x + w - inset} ${y + inset} L ${x + inset} ${cy} L ${x + w - inset} ${y + h - inset}`}
          fill="none"
          stroke={openStroke}
          strokeWidth={sw * 0.85}
          opacity={printContrast ? 1 : 0.75}
        />
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
          strokeWidth={sw}
        />
        <path
          d={`M ${x + inset} ${y + inset} L ${x + w - inset} ${cy} L ${x + inset} ${y + h - inset}`}
          fill="none"
          stroke={openStroke}
          strokeWidth={sw * 0.85}
          opacity={printContrast ? 1 : 0.75}
        />
      </>
    );
  }

  if (opening === "sliding-left") {
    return (
      <>
        <line
          x1={x + w * 0.72}
          y1={cy}
          x2={x + inset + 4}
          y2={cy}
          stroke={openStroke}
          strokeWidth={sw}
        />
        <path
          d={`M ${x + inset + 8} ${cy - 3.5} L ${x + inset + 3} ${cy} L ${x + inset + 8} ${cy + 3.5}`}
          fill="none"
          stroke={openStroke}
          strokeWidth={sw}
        />
      </>
    );
  }

  if (opening === "sliding-right") {
    return (
      <>
        <line
          x1={x + w * 0.28}
          y1={cy}
          x2={x + w - inset - 4}
          y2={cy}
          stroke={openStroke}
          strokeWidth={sw}
        />
        <path
          d={`M ${x + w - inset - 8} ${cy - 3.5} L ${x + w - inset - 3} ${cy} L ${x + w - inset - 8} ${cy + 3.5}`}
          fill="none"
          stroke={openStroke}
          strokeWidth={sw}
        />
      </>
    );
  }

  if (opening === "drawer-left") {
    const len = Math.min(w * 0.55, 40);
    const tipX = cx - len / 2;
    const tailX = cx + len / 2;
    const head = Math.min(7, len * 0.22);
    const drop = Math.min(8, h * 0.12);
    return (
      <path
        d={`M ${tipX + head} ${cy - head * 0.7} L ${tipX} ${cy} L ${tipX + head} ${cy + head * 0.7} M ${tipX} ${cy} L ${tailX} ${cy} L ${tailX} ${cy + drop}`}
        fill="none"
        stroke={openStroke}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }

  if (opening === "drawer-right") {
    const len = Math.min(w * 0.55, 40);
    const tipX = cx + len / 2;
    const tailX = cx - len / 2;
    const head = Math.min(7, len * 0.22);
    const drop = Math.min(8, h * 0.12);
    return (
      <path
        d={`M ${tipX - head} ${cy - head * 0.7} L ${tipX} ${cy} L ${tipX - head} ${cy + head * 0.7} M ${tipX} ${cy} L ${tailX} ${cy} L ${tailX} ${cy + drop}`}
        fill="none"
        stroke={openStroke}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }

  if (opening === "panel-h") {
    const gap =
      svgPerMm > 0
        ? Math.max(1, svgPerMm * 2)
        : Math.max(1.8, Math.min(w, h) * 0.045);
    const stripe =
      svgPerMm > 0
        ? PANEL_STRIPE_MM * svgPerMm
        : Math.max(h * 0.15, gap * 4);
    const divider = panelStripeDivider(frameFill, printContrast);
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
            x1={x}
            y1={y + pos}
            x2={x + w}
            y2={y + pos}
            stroke={divider}
            strokeWidth={gap}
          />
        ))}
      </>
    );
  }

  if (opening === "panel-v") {
    const gap =
      svgPerMm > 0
        ? Math.max(1, svgPerMm * 2)
        : Math.max(1.8, Math.min(w, h) * 0.045);
    const stripe =
      svgPerMm > 0
        ? PANEL_STRIPE_MM * svgPerMm
        : Math.max(w * 0.15, gap * 4);
    const divider = panelStripeDivider(frameFill, printContrast);
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
            y1={y}
            x2={x + pos}
            y2={y + h}
            stroke={divider}
            strokeWidth={gap}
          />
        ))}
      </>
    );
  }

  return null;
}

function previewLuminance(hex: string): number {
  const raw = hex.replace("#", "");
  if (raw.length < 6) return 0.5;
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** تغميق خفيف للإطار الأبيض جداً عشان ميندمجش مع الورق في الطباعة */
function printFrameFill(hex: string): string {
  if (previewLuminance(hex) < 0.88) return hex;
  const raw = hex.replace("#", "");
  const r = Math.round(parseInt(raw.slice(0, 2), 16) * 0.85);
  const g = Math.round(parseInt(raw.slice(2, 4), 16) * 0.85);
  const b = Math.round(parseInt(raw.slice(4, 6), 16) * 0.85);
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function LegacyStylePreview({
  style,
  className,
  printContrast = false,
}: {
  style: WindowStyle;
  className: string;
  printContrast?: boolean;
}) {
  const frame = printContrast ? "#6a7380" : "#7a8fa8";
  const glass = printContrast ? "#ffffff" : "#c5dcf5";
  const glassDark = printContrast ? "#e8e8e8" : "#9ec4ea";
  const mark = printContrast ? "#111111" : "#2b7de9";
  const markOpacity = printContrast ? 1 : 0.4;
  const markW = printContrast ? 1.8 : 1.2;

  if (style === "casement-1") {
    return (
      <svg viewBox="0 0 80 100" className={className} aria-hidden>
        <rect x="6" y="6" width="68" height="88" rx="2" fill={frame} />
        <rect x="12" y="12" width="56" height="76" fill={glass} />
        <line x1="40" y1="12" x2="40" y2="88" stroke={frame} strokeWidth="4" />
        <line x1="16" y1="16" x2="64" y2="84" stroke={mark} strokeWidth={markW} opacity={markOpacity} />
        <line x1="64" y1="16" x2="16" y2="84" stroke={mark} strokeWidth={markW} opacity={markOpacity} />
      </svg>
    );
  }

  if (style === "casement-2") {
    return (
      <svg viewBox="0 0 80 100" className={className} aria-hidden>
        <rect x="6" y="6" width="68" height="88" rx="2" fill={frame} />
        <rect x="12" y="12" width="25" height="76" fill={glass} />
        <rect x="43" y="12" width="25" height="76" fill={glassDark} />
        <rect x="37" y="12" width="6" height="76" fill={frame} />
        <path d="M35 16 L14 50 L35 84" fill="none" stroke={mark} strokeWidth={printContrast ? 1.8 : 1.3} />
        <path d="M45 16 L66 50 L45 84" fill="none" stroke={mark} strokeWidth={printContrast ? 1.8 : 1.3} />
      </svg>
    );
  }

  if (style === "sliding-2") {
    return (
      <svg viewBox="0 0 80 100" className={className} aria-hidden>
        <rect x="6" y="6" width="68" height="88" rx="2" fill={frame} />
        <rect x="12" y="12" width="28" height="76" fill={glass} />
        <rect x="40" y="12" width="28" height="76" fill={glassDark} />
        <rect x="37" y="12" width="6" height="76" fill={frame} />
        <line x1="30" y1="50" x2="16" y2="50" stroke={mark} strokeWidth={printContrast ? 1.8 : 1.3} />
        <line x1="50" y1="50" x2="64" y2="50" stroke={mark} strokeWidth={printContrast ? 1.8 : 1.3} />
      </svg>
    );
  }

  if (style === "sliding-3") {
    return (
      <svg viewBox="0 0 100 90" className={className} aria-hidden>
        <rect x="6" y="6" width="88" height="78" rx="2" fill={frame} />
        <rect x="12" y="12" width="24" height="66" fill={glass} />
        <rect x="38" y="12" width="24" height="66" fill={glassDark} />
        <rect x="64" y="12" width="24" height="66" fill={glass} />
        <rect x="35" y="12" width="4" height="66" fill={frame} />
        <rect x="61" y="12" width="4" height="66" fill={frame} />
      </svg>
    );
  }

  if (style === "door") {
    return (
      <svg viewBox="0 0 70 110" className={className} aria-hidden>
        <rect x="8" y="4" width="54" height="102" rx="2" fill={frame} />
        <rect x="14" y="10" width="42" height="55" fill={glass} />
        <rect x="14" y="70" width="42" height="30" fill={frame} />
        <path d="M54 12 L16 55 L54 98" fill="none" stroke={mark} strokeWidth={printContrast ? 1.8 : 1.4} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 70" className={className} aria-hidden>
      <rect x="6" y="6" width="88" height="58" rx="2" fill={frame} />
      <rect x="12" y="12" width="76" height="46" fill={glass} />
      <line x1="16" y1="16" x2="84" y2="54" stroke={mark} strokeWidth={markW} opacity={markOpacity} />
      <line x1="84" y1="16" x2="16" y2="54" stroke={mark} strokeWidth={markW} opacity={markOpacity} />
    </svg>
  );
}
