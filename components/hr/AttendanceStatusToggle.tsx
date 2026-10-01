"use client";

import { ATTENDANCE_VISUAL } from "@/lib/hr-visual";
import type { AttendanceStatus } from "@/lib/hr";

const STATUSES: AttendanceStatus[] = ["present", "absent", "off", "holiday"];

/**
 * صف الأزرار الأربعة لحالة الحضور — مستخدم في شبكة الحضور الجماعية
 * (كروت الموبايل) وفي صفحة تفاصيل الموظف (حضور اليوم).
 */
export function AttendanceStatusToggle({
  current,
  onChange,
  className = "",
}: {
  current: AttendanceStatus | undefined;
  onChange: (status: AttendanceStatus | null) => void;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-4 gap-1.5 ${className}`}>
      {STATUSES.map((status) => {
        const visual = ATTENDANCE_VISUAL[status];
        const selected = current === status;
        return (
          <button
            key={status}
            type="button"
            onClick={() => onChange(selected ? null : status)}
            className={`rounded-xl px-1.5 py-2 text-[11px] font-bold transition-all active:scale-[0.98] ${
              selected
                ? visual.active
                : "border border-border bg-background text-muted"
            }`}
          >
            {visual.label}
          </button>
        );
      })}
    </div>
  );
}
