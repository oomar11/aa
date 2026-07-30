"use client";

import { useId } from "react";
import { useTheme } from "@/components/settings/ThemeProvider";
import {
  FRAME_COLORS,
  PANEL_STRIPE_MM,
  normalizePaneConfig,
  type DesignItem,
  type FrameColorId,
  type PaneConfig,
  type PaneOpening,
  type WindowStyle,
} from "@/lib/design-items";
import { meshReplacesPaneGlass } from "@/lib/materials";
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

type Props = {
  style: WindowStyle;
  templateId?: string;
  layout?: LayoutNode;
  panes?: DesignItem["panes"];
  frameColor?: FrameColorId;
  widthMm?: number;
  heightMm?: number;
  className?: string;
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
}: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const uid = useId().replace(/:/g, "");

  const resolved =
    layout ??
    (templateId ? getTemplateById(templateId)?.layout : undefined);

  if (!resolved) {
    return <LegacyStylePreview style={style} className={className} />;
  }

  const tree = ensurePaneIds(resolved);
  const auto = getLayoutPreviewSize(tree);
  let vbW = auto.width;
  let vbH = auto.height;
  if (widthMm && heightMm && widthMm > 0 && heightMm > 0) {
    const aspect = widthMm / heightMm;
    const maxW = 140;
    const maxH = 150;
    if (aspect >= 1) {
      vbW = maxW;
      vbH = Math.max(56, Math.round(maxW / aspect));
    } else {
      vbH = maxH;
      vbW = Math.max(48, Math.round(maxH * aspect));
    }
  }

  const pad = 5;
  const frame: Rect = {
    x: pad,
    y: pad,
    w: vbW - pad * 2,
    h: vbH - pad * 2,
  };

  const paneRects: PaneRect[] = [];
  const svgPerMm =
    widthMm && widthMm > 0 ? frame.w / widthMm : 0;
  const emptyRects: Rect[] = [];
  const mullions: Rect[] = [];
  collectPaneRects(tree, frame, paneRects);
  collectEmptyRects(tree, frame, emptyRects);
  collectMullionRects(tree, frame, Math.max(2.4, Math.min(frame.w, frame.h) * 0.035), mullions);

  const frameMeta = FRAME_COLORS[frameColor] ?? FRAME_COLORS.white;
  const frameFill = frameMeta.hex;
  const isWood = Boolean(frameMeta.wood);
  const glass = isDark ? "#3a6180" : "#9ec8e8";
  const openStroke = isDark ? "#7eb6f5" : "#2b7de9";
  const hardware = isDark ? "#c5ced8" : "#6b7585";
  const frameStroke = isDark ? "#8b97a8" : "#8a96a5";
  const emptyFill = isDark ? "#1a2230" : "#f4f6f9";
  const emptyStroke = isDark ? "#3d4f66" : "#c5d0dc";
  const profile = Math.max(2.8, Math.min(frame.w, frame.h) * 0.045);
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
              stroke="#a88752"
              strokeWidth="0.7"
              opacity="0.55"
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
            stroke={isDark ? "#8aa0b5" : "#6b7c8f"}
            strokeWidth="0.55"
            opacity="0.65"
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
            strokeWidth="0.7"
            opacity="0.55"
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
            strokeWidth={0.7}
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
          strokeWidth={0.9}
        />
      ))}

      {/* محتوى الضلفة */}
      {paneRects.map((p) => {
        const cfg = normalizePaneConfig(panes?.[p.id]);
        const gx = p.x + profile;
        const gy = p.y + profile;
        const gw = Math.max(p.w - profile * 2, 1.5);
        const gh = Math.max(p.h - profile * 2, 1.5);
        const isLouver =
          cfg.opening === "panel-h" || cfg.opening === "panel-v";
        const isExhaust = cfg.opening === "exhaust";
        const screenSash = meshReplacesPaneGlass(cfg, cfg.opening);

        return (
          <g key={p.id}>
            <rect
              x={gx}
              y={gy}
              width={gw}
              height={gh}
              fill={
                isLouver || isExhaust
                  ? frameFill
                  : screenSash
                    ? isDark
                      ? "#3d4f5f"
                      : "#dce6ee"
                    : glass
              }
              stroke={frameStroke}
              strokeWidth={0.6}
            />
            {!isExhaust && (
              <PaneDetailFill
                config={cfg}
                x={gx}
                y={gy}
                w={gw}
                h={gh}
                frameFill={frameFill}
                meshId={meshId}
                svgPerMm={svgPerMm}
              />
            )}
            <OpeningMarks
              opening={cfg.opening}
              bouclier={Boolean(cfg.bouclier)}
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

      {mullions.map((m, i) => (
        <rect
          key={`m-${i}`}
          x={m.x}
          y={m.y}
          width={m.w}
          height={m.h}
          fill={isWood ? `url(#${woodId})` : frameFill}
          stroke={frameStroke}
          strokeWidth={0.4}
        />
      ))}
    </svg>
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
}: {
  config: PaneConfig;
  x: number;
  y: number;
  w: number;
  h: number;
  frameFill: string;
  meshId: string;
  svgPerMm?: number;
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
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  frameFill: string;
  svgPerMm?: number;
}) {
  const { gap, positions } = panelStripeLayout(h, svgPerMm, Math.min(w, h) * 0.045);
  const divider = panelStripeDivider(frameFill);
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
  bouclier: boolean;
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
  const inset = Math.max(1.5, Math.min(w, h) * 0.06);
  const sw = Math.max(0.9, Math.min(w, h) * 0.035);

  if (opening === "fixed" && bouclier) {
    return (
      <>
        <rect x={x + inset} y={cy - 4} width={2.2} height={8} rx={0.6} fill={hardware} />
        <rect x={x + w - inset - 2.2} y={cy - 4} width={2.2} height={8} rx={0.6} fill={hardware} />
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
          strokeWidth={sw}
          opacity={0.4}
        />
        <line
          x1={x + w - inset}
          y1={y + inset}
          x2={x + inset}
          y2={y + h - inset}
          stroke={openStroke}
          strokeWidth={sw}
          opacity={0.4}
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
          opacity={0.75}
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
          opacity={0.75}
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
    const divider = previewLuminance(frameFill) < 0.45 ? "#ffffff66" : "#00000040";
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
    const divider = previewLuminance(frameFill) < 0.45 ? "#ffffff66" : "#00000040";
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

function LegacyStylePreview({
  style,
  className,
}: {
  style: WindowStyle;
  className: string;
}) {
  const frame = "#7a8fa8";
  const glass = "#c5dcf5";
  const glassDark = "#9ec4ea";

  if (style === "casement-1") {
    return (
      <svg viewBox="0 0 80 100" className={className} aria-hidden>
        <rect x="6" y="6" width="68" height="88" rx="2" fill={frame} />
        <rect x="12" y="12" width="56" height="76" fill={glass} />
        <line x1="40" y1="12" x2="40" y2="88" stroke={frame} strokeWidth="4" />
        <line x1="16" y1="16" x2="64" y2="84" stroke="#2b7de9" strokeWidth="1.2" opacity="0.4" />
        <line x1="64" y1="16" x2="16" y2="84" stroke="#2b7de9" strokeWidth="1.2" opacity="0.4" />
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
        <path d="M35 16 L14 50 L35 84" fill="none" stroke="#2b7de9" strokeWidth="1.3" />
        <path d="M45 16 L66 50 L45 84" fill="none" stroke="#2b7de9" strokeWidth="1.3" />
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
        <line x1="30" y1="50" x2="16" y2="50" stroke="#2b7de9" strokeWidth="1.3" />
        <line x1="50" y1="50" x2="64" y2="50" stroke="#2b7de9" strokeWidth="1.3" />
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
        <path d="M54 12 L16 55 L54 98" fill="none" stroke="#2b7de9" strokeWidth="1.4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 70" className={className} aria-hidden>
      <rect x="6" y="6" width="88" height="58" rx="2" fill={frame} />
      <rect x="12" y="12" width="76" height="46" fill={glass} />
      <line x1="16" y1="16" x2="84" y2="54" stroke="#2b7de9" strokeWidth="1.2" opacity="0.4" />
      <line x1="84" y1="16" x2="16" y2="54" stroke="#2b7de9" strokeWidth="1.2" opacity="0.4" />
    </svg>
  );
}
