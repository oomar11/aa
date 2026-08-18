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

/**
 * حلق الدوران: 3 جهات (علوي + جانبين بارتفاع كامل).
 * السفلي = سوقاس عند خط التقسيم (يُرسم منفصل في الكانفس).
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
  const rw = Math.max(1, Math.min(ringW, w / 3, h / 3));
  const framePaint = woodPatternId ? `url(#${woodPatternId})` : fill;

  return (
    <>
      {/* علوي */}
      <rect
        x={x}
        y={y}
        width={w}
        height={rw}
        fill={framePaint}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {/* يسار — ارتفاع كامل */}
      <rect
        x={x}
        y={y}
        width={rw}
        height={h}
        fill={framePaint}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {/* يمين — ارتفاع كامل */}
      <rect
        x={x + w - rw}
        y={y}
        width={rw}
        height={h}
        fill={framePaint}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </>
  );
}

/** inset الزجاج داخل حلق الدوران */
export function douranGlassRect(
  px: number,
  py: number,
  pw: number,
  ph: number,
  ringW: number
) {
  const rw = Math.max(1, Math.min(ringW, pw / 3, ph / 3));
  return {
    x: px + rw,
    y: py + rw,
    w: Math.max(pw - rw * 2, 2),
    h: Math.max(ph - rw, 2),
  };
}

/** أيقونة حلق الدوران (U + سوقاس) */
export function DouranOpeningIcon({
  className = "h-full w-full text-primary",
}: {
  className?: string;
}) {
  const s = "currentColor";
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden>
      <rect x="5" y="5" width="30" height="30" stroke={s} strokeWidth="1.8" />
      <rect x="7" y="7" width="26" height="5" fill={s} opacity="0.85" />
      <rect x="7" y="7" width="5" height="22" fill={s} opacity="0.85" />
      <rect x="28" y="7" width="5" height="22" fill={s} opacity="0.85" />
      <rect x="7" y="27" width="26" height="4" fill={s} opacity="0.55" rx="0.5" />
    </svg>
  );
}
