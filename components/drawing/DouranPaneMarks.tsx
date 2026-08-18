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
 * قوس دائري: القمة في أعلى الصندوق، والطرفان على خط السوقاس السفلي.
 * large-arc لو الارتفاع أكبر من نصف العرض (أكثر من نصف دائرة).
 */
export function douranArchPath(
  x: number,
  y: number,
  w: number,
  h: number
): string {
  const chord = Math.max(w, 2);
  const sagitta = Math.max(h, 2);
  const r = (sagitta * sagitta + (chord / 2) * (chord / 2)) / (2 * sagitta);
  const largeArc = sagitta > chord / 2 ? 1 : 0;
  const left = x;
  const right = x + w;
  const bottom = y + h;
  return `M ${left} ${bottom} A ${r} ${r} 0 ${largeArc} 1 ${right} ${bottom} Z`;
}

export function douranInnerArch(
  px: number,
  py: number,
  pw: number,
  ph: number,
  ringW: number
) {
  const rw = ringWidth(pw, ph, ringW);
  return {
    x: px + rw,
    y: py + rw,
    w: Math.max(pw - rw * 2, 2),
    h: Math.max(ph - rw, 2),
    path: douranArchPath(
      px + rw,
      py + rw,
      Math.max(pw - rw * 2, 2),
      Math.max(ph - rw, 2)
    ),
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
      <path
        d="M 8 28 A 12 12 0 0 1 32 28 Z"
        fill={s}
        fillRule="evenodd"
        opacity="0.9"
      />
      <path d="M 12 27 A 8 8 0 0 1 28 27 Z" fill="var(--card, #fff)" />
      <rect x="7" y="28" width="26" height="3.5" fill={s} opacity="0.7" rx="0.4" />
    </svg>
  );
}
