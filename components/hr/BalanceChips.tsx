import type { BalancePreview } from "@/lib/hr";
import { formatCurrency } from "@/lib/utils";

type Tone = "neutral" | "success" | "danger";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-background text-muted",
  success: "bg-[#2F9B7A]/10 text-[#2F9B7A]",
  danger: "bg-[#b5543f]/10 text-[#b5543f]",
};

/**
 * تفصيل الرصيد كعناصر صغيرة منفصلة بدل جملة نصية طويلة مدمجة
 * (أساسي · مكافآت · سلف) — الأرقام الثلاثة غير متداخلة، بعكس
 * accruedAmount اللي أصلاً شامل bonusAmount جواه.
 */
export function BalanceChips({
  row,
  className = "",
}: {
  row: BalancePreview;
  className?: string;
}) {
  const base = Math.max(0, row.accruedAmount - row.bonusAmount);
  const chips: { label: string; amount: number; tone: Tone }[] = [];

  if (base > 0.004) chips.push({ label: "أساسي", amount: base, tone: "neutral" });
  if (row.bonusAmount > 0.004)
    chips.push({ label: "مكافآت", amount: row.bonusAmount, tone: "success" });
  if (row.openAdvances > 0.004)
    chips.push({ label: "سلف", amount: -row.openAdvances, tone: "danger" });

  if (chips.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {chips.map((chip) => (
        <span
          key={chip.label}
          className={`rounded-lg px-2 py-1 text-[11px] font-semibold tabular-nums ${TONE_CLASS[chip.tone]}`}
        >
          {chip.label} {chip.amount < 0 ? "−" : ""}
          {formatCurrency(Math.abs(chip.amount))}
        </span>
      ))}
    </div>
  );
}
