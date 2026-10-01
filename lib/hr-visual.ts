/**
 * ألوان وتسميات موحّدة لقسم الموظفين — مكان واحد بدل تكرار hex يدوي
 * في كل مكوّن. نفس فكرة WORKFLOW_VISUAL في lib/workshop.ts لكن بقيم
 * عربية ثابتة (بدون لمس app/globals.css العام).
 */

import type { AttendanceStatus, Employee } from "@/lib/hr";
import { formatCurrency } from "@/lib/utils";

/** لون هوية قسم الموظفين — يُستخدم في الهيرو والأيقونات المميزة للقسم */
export const HR_ACCENT = "#5B6ABF";
export const HR_ACCENT_SHADOW = "0 8px 24px rgba(91,106,191,0.28)";

export const HR_DANGER = "#b5543f";
export const HR_SUCCESS = "#2F9B7A";
export const HR_WARNING = "#C47A12";

type AttendanceVisual = {
  label: string;
  /** الزرار وهو مُفعّل */
  active: string;
  /** نقطة صغيرة (شريط آخر ٧ أيام) */
  dot: string;
};

export const ATTENDANCE_VISUAL: Record<AttendanceStatus, AttendanceVisual> = {
  present: {
    label: "حاضر",
    active: "bg-[#2F9B7A] text-white",
    dot: "bg-[#2F9B7A]",
  },
  absent: {
    label: "غايب",
    active: "bg-[#b5543f] text-white",
    dot: "bg-[#b5543f]",
  },
  off: {
    label: "أجازة",
    active: "bg-[#C47A12] text-white",
    dot: "bg-[#C47A12]",
  },
  holiday: {
    label: "إجازة رسمية",
    active: "border border-border bg-card text-foreground",
    dot: "bg-muted",
  },
};

export type LedgerKind = "advance" | "bonus";

type LedgerVisual = {
  label: string;
  /** فعل الحركة — يُستخدم في نصوص التأكيد وعنوان الفورم */
  verb: string;
  text: string;
  soft: string;
  border: string;
};

/** نص الأجر المختصر لكارت الموظف: "٥٠ ج.م" أو "١٥٪" أو "بدون ثابت" */
export function payRateLabel(employee: Employee): string {
  if (employee.payType === "manual") return "بدون ثابت";
  if (employee.payType === "percent") {
    const pct = Number(employee.commissionPercent) || 0;
    return `${pct}%`;
  }
  return `${formatCurrency(employee.wage)} ج.م`;
}

export const LEDGER_VISUAL: Record<LedgerKind, LedgerVisual> = {
  advance: {
    label: "سلفة",
    verb: "تسجيل سلفة",
    text: "text-[#b5543f]",
    soft: "bg-[#b5543f]/10",
    border: "border-[#b5543f]/30",
  },
  bonus: {
    label: "مكافأة",
    verb: "تسجيل مكافأة",
    text: "text-[#2F9B7A]",
    soft: "bg-[#2F9B7A]/10",
    border: "border-[#2F9B7A]/30",
  },
};
