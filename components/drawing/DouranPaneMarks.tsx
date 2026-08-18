"use client";

type Props = {
  x: number;
  y: number;
  w: number;
  h: number;
  stroke: string;
  /** سُمك خط السوقاس السفلي */
  strokeWidth?: number;
  /** لون نص «دوران» */
  labelFill?: string;
  /** إظهار كلمة دوران داخل الضلفة */
  showLabel?: boolean;
  /** طباعة PDF — تباين أعلى */
  printContrast?: boolean;
};

/**
 * رسم تمييزي للضلفة الثابتة العلوية (دوران):
 * شريط سوقاس سفلي + علامة ثابت في الجزء العلوي + تسمية «دوران».
 */
export function DouranPaneMarks({
  x,
  y,
  w,
  h,
  stroke,
  strokeWidth = 1.4,
  labelFill = "#111",
  showLabel = true,
  printContrast = false,
}: Props) {
  const inset = Math.max(2.5, Math.min(w, h) * 0.07);
  const bottomY = y + h - inset;
  const mullionW = Math.max(strokeWidth * 2.2, printContrast ? 2.4 : 1.8);
  const glassTop = y + inset;
  const glassBottom = bottomY - mullionW * 2.2;
  const glassH = Math.max(glassBottom - glassTop, 4);
  const cx = x + w / 2;
  const cy = glassTop + glassH / 2;
  const labelSize = Math.max(
    printContrast ? 9 : 7,
    Math.min(w, h) * (printContrast ? 0.16 : 0.13)
  );
  const fixedOpacity = printContrast ? 0.55 : 0.32;

  return (
    <>
      {/* زجاج ثابت — علامة X خفيفة في الجزء العلوي فقط */}
      <line
        x1={x + inset}
        y1={glassTop}
        x2={x + w - inset}
        y2={glassBottom}
        stroke={stroke}
        strokeWidth={strokeWidth * 0.9}
        opacity={fixedOpacity}
      />
      <line
        x1={x + w - inset}
        y1={glassTop}
        x2={x + inset}
        y2={glassBottom}
        stroke={stroke}
        strokeWidth={strokeWidth * 0.9}
        opacity={fixedOpacity}
      />

      {/* سوقاس / كوبلن — شريط أفقي بارز أسفل الدوران */}
      <rect
        x={x + inset}
        y={bottomY - mullionW}
        width={w - inset * 2}
        height={mullionW}
        fill={stroke}
        opacity={printContrast ? 1 : 0.82}
        rx={0.4}
      />
      <line
        x1={x + inset - 1}
        y1={bottomY - mullionW - 1.5}
        x2={x + inset - 1}
        y2={bottomY + 1}
        stroke={stroke}
        strokeWidth={strokeWidth * 0.85}
        opacity={0.9}
      />
      <line
        x1={x + w - inset + 1}
        y1={bottomY - mullionW - 1.5}
        x2={x + w - inset + 1}
        y2={bottomY + 1}
        stroke={stroke}
        strokeWidth={strokeWidth * 0.85}
        opacity={0.9}
      />

      {showLabel && w >= 28 && h >= 16 ? (
        <text
          x={cx}
          y={cy + labelSize * 0.35}
          textAnchor="middle"
          fontSize={labelSize}
          fontWeight={700}
          fill={labelFill}
          opacity={printContrast ? 1 : 0.88}
          style={{ fontFamily: 'Cairo, "Noto Sans Arabic", Tahoma, sans-serif' }}
        >
          دوران
        </text>
      ) : null}
    </>
  );
}

/** أيقونة صغيرة لقائمة نوع الفتح */
export function DouranOpeningIcon({ className = "h-full w-full text-primary" }: { className?: string }) {
  const s = "currentColor";
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden>
      <rect x="5" y="5" width="30" height="30" stroke={s} strokeWidth="1.8" />
      <line x1="8" y1="14" x2="32" y2="22" stroke={s} strokeWidth="1.2" opacity="0.45" />
      <line x1="32" y1="14" x2="8" y2="22" stroke={s} strokeWidth="1.2" opacity="0.45" />
      <rect x="7" y="26" width="26" height="4" fill={s} opacity="0.85" rx="0.5" />
      <text
        x="20"
        y="21"
        textAnchor="middle"
        fontSize="7"
        fontWeight="700"
        fill={s}
      >
        دوران
      </text>
    </svg>
  );
}
