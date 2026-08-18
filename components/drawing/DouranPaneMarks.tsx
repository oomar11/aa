"use client";

type Props = {
  x: number;
  y: number;
  w: number;
  h: number;
  stroke: string;
  strokeWidth?: number;
  printContrast?: boolean;
};

/**
 * رسم الدوران: قوس علوي + سوقاس/كوبلن سفلي (بدون نص).
 */
export function DouranPaneMarks({
  x,
  y,
  w,
  h,
  stroke,
  strokeWidth = 1.4,
  printContrast = false,
}: Props) {
  const inset = Math.max(2.5, Math.min(w, h) * 0.07);
  const bottomY = y + h - inset;
  const mullionW = Math.max(strokeWidth * 2.2, printContrast ? 2.4 : 1.8);
  const cx = x + w / 2;
  const leftX = x + inset;
  const rightX = x + w - inset;

  // قاعدة القوس — فوق السوقاس
  const archBaseY = bottomY - mullionW * 2.8;
  const archTopY = y + inset;
  const archDepth = Math.max(archBaseY - archTopY, 4);
  const archPeakY = archTopY + archDepth * 0.08;

  // قوس الدوران (قوس علوي بارز)
  const arcPath = `M ${leftX} ${archBaseY} Q ${cx} ${archPeakY} ${rightX} ${archBaseY}`;

  // قوس فتح ثانوي — من الزاوية للمنتصف (اتجاه الدوران)
  const swingPath = `M ${leftX} ${archBaseY} Q ${cx} ${archBaseY - archDepth * 0.55} ${rightX} ${archBaseY}`;

  const arcSw = Math.max(strokeWidth * 1.35, printContrast ? 2 : 1.5);
  const swingSw = Math.max(strokeWidth * 0.95, printContrast ? 1.4 : 1.1);
  const arcOpacity = printContrast ? 1 : 0.92;
  const swingOpacity = printContrast ? 0.75 : 0.5;

  return (
    <>
      {/* القوس الرئيسي */}
      <path
        d={arcPath}
        fill="none"
        stroke={stroke}
        strokeWidth={arcSw}
        strokeLinecap="round"
        opacity={arcOpacity}
      />

      {/* قوس الدوران الداخلي (مسار الفتح) */}
      <path
        d={swingPath}
        fill="none"
        stroke={stroke}
        strokeWidth={swingSw}
        strokeLinecap="round"
        strokeDasharray={printContrast ? "4 3" : "3 2.5"}
        opacity={swingOpacity}
      />

      {/* جانبا القوس */}
      <line
        x1={leftX}
        y1={archBaseY}
        x2={leftX}
        y2={bottomY - mullionW}
        stroke={stroke}
        strokeWidth={strokeWidth * 0.85}
        opacity={0.55}
      />
      <line
        x1={rightX}
        y1={archBaseY}
        x2={rightX}
        y2={bottomY - mullionW}
        stroke={stroke}
        strokeWidth={strokeWidth * 0.85}
        opacity={0.55}
      />

      {/* سوقاس / كوبلن */}
      <rect
        x={leftX}
        y={bottomY - mullionW}
        width={w - inset * 2}
        height={mullionW}
        fill={stroke}
        opacity={printContrast ? 1 : 0.82}
        rx={0.4}
      />
      <line
        x1={leftX - 1}
        y1={bottomY - mullionW - 1.5}
        x2={leftX - 1}
        y2={bottomY + 1}
        stroke={stroke}
        strokeWidth={strokeWidth * 0.85}
        opacity={0.9}
      />
      <line
        x1={rightX + 1}
        y1={bottomY - mullionW - 1.5}
        x2={rightX + 1}
        y2={bottomY + 1}
        stroke={stroke}
        strokeWidth={strokeWidth * 0.85}
        opacity={0.9}
      />
    </>
  );
}

/** أيقونة قوس الدوران لقائمة نوع الفتح */
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
        d="M 8 22 Q 20 7 32 22"
        stroke={s}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M 8 22 Q 20 13 32 22"
        stroke={s}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeDasharray="3 2"
        opacity="0.55"
      />
      <rect x="7" y="26" width="26" height="4" fill={s} opacity="0.85" rx="0.5" />
    </svg>
  );
}
