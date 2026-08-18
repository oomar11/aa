"use client";

type FrameRingProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  ringW: number;
  fill: string;
  stroke: string;
  strokeWidth?: number;
  woodPatternId?: string;
};

function ringWidth(w: number, h: number, ringW: number) {
  return Math.max(1, Math.min(ringW, w / 3, h / 3));
}

/**
 * قوس الدوران: القمة (cx, y) فوق، والقاعدة على خط السوقاس (مش داخله).
 */
export function douranArchPath(
  x: number,
  y: number,
  w: number,
  h: number
): string {
  const left = x;
  const right = x + w;
  const bottom = y + h;
  const cx = x + w / 2;
  const peakY = y;
  const ctrlY = 2 * peakY - bottom;
  return `M ${left} ${bottom} Q ${cx} ${ctrlY} ${right} ${bottom} Z`;
}

export function douranInnerArch(
  px: number,
  py: number,
  pw: number,
  ph: number,
  ringW: number
) {
  const rw = ringWidth(pw, ph, ringW);
  const x = px + rw;
  const y = py + rw;
  const w = Math.max(pw - rw * 2, 2);
  const h = Math.max(ph - rw, 2);
  return {
    x,
    y,
    w,
    h,
    path: douranArchPath(x, y, w, h),
  };
}

/** ارتفاع شريط السوقاس تحت القوس */
function barHeight(h: number, ringW: number) {
  return Math.max(ringW, Math.min(h * 0.2, ringW * 1.15));
}

/**
 * القوس في المساحة فوق السوقاس، والشريط السفلي سوقاس منفصل.
 */
export function douranLayout(
  x: number,
  y: number,
  w: number,
  h: number,
  ringW: number
) {
  const barH = Math.min(barHeight(h, ringW), Math.max(h * 0.28, 2));
  const archH = Math.max(h - barH, 4);
  return {
    barH,
    archH,
    bar: { x, y: y + archH, w, h: barH },
    outerPath: douranArchPath(x, y, w, archH),
    inner: douranInnerArch(x, y, w, archH, ringW),
  };
}

/**
 * حلق الدوران: قوس فوق السوقاس + شريط سوقاس أسفله (القوس مش جوّاه).
 */
export function DouranFrameRing({
  x,
  y,
  w,
  h,
  ringW,
  fill,
  stroke,
  strokeWidth = 0.5,
  woodPatternId,
}: FrameRingProps) {
  const framePaint = woodPatternId ? `url(#${woodPatternId})` : fill;
  const { bar, outerPath, inner } = douranLayout(x, y, w, h, ringW);

  return (
    <>
      <path
        d={`${outerPath} ${inner.path}`}
        fill={framePaint}
        fillRule="evenodd"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <rect
        x={bar.x}
        y={bar.y}
        width={bar.w}
        height={bar.h}
        fill={framePaint}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </>
  );
}

/** أيقونة قوس الدوران فوق السوقاس */
export function DouranOpeningIcon({
  className = "h-full w-full text-primary",
}: {
  className?: string;
}) {
  const s = "currentColor";
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden>
      <rect x="5" y="5" width="30" height="30" stroke={s} strokeWidth="1.8" />
      <path d="M 8 24 Q 20 -2 32 24 Z" fill={s} opacity="0.9" />
      <path d="M 12 23 Q 20 8 28 23 Z" fill="var(--card, #fff)" />
      <rect x="7" y="24" width="26" height="6" fill={s} opacity="0.75" rx="0.4" />
    </svg>
  );
}
