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
 * قوس الدوران: القمة (cx, y) فوق صراحة، والقاعدة على السوقاس.
 * Quadratic مش SVG arc — أعلام A بتنقلب مع y-down.
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

/**
 * حلق الدوران كقطاع: قوس خارجي بلون الإطار، والزجاج قوس داخلي نظيف.
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
  const outer = douranArchPath(x, y, w, h);
  const inner = douranInnerArch(x, y, w, h, ringW);

  return (
    <path
      d={`${outer} ${inner.path}`}
      fill={framePaint}
      fillRule="evenodd"
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}

/** أيقونة قوس الدوران (حلق مقوّس + سوقاس) */
export function DouranOpeningIcon({
  className = "h-full w-full text-primary",
}: {
  className?: string;
}) {
  const s = "currentColor";
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden>
      <rect x="5" y="5" width="30" height="30" stroke={s} strokeWidth="1.8" />
      <path d="M 8 28 Q 20 -8 32 28 Z" fill={s} opacity="0.9" />
      <path d="M 12 27 Q 20 8 28 27 Z" fill="var(--card, #fff)" />
      <rect x="7" y="28" width="26" height="3.5" fill={s} opacity="0.7" rx="0.4" />
    </svg>
  );
}
