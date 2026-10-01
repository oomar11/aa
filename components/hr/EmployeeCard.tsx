import Link from "next/link";
import {
  EMPLOYEE_STATUS_LABELS,
  PAY_TYPE_LABELS,
  type AttendanceStatus,
  type Employee,
} from "@/lib/hr";
import { ATTENDANCE_VISUAL, payRateLabel } from "@/lib/hr-visual";
import { ROUTES } from "@/lib/routes";
import { formatCurrency } from "@/lib/utils";

/** كارت موظف في القائمة الرئيسية — يودّي لصفحة تفاصيله. */
export function EmployeeCard({
  employee,
  balance,
  openAdvances,
  todayStatus,
}: {
  employee: Employee;
  balance: number;
  openAdvances: number;
  todayStatus?: AttendanceStatus;
}) {
  return (
    <Link
      href={ROUTES.hr.employeeDetail(employee.id)}
      className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-primary-soft/40"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-foreground">
          {employee.name}
          {employee.status === "left" ? (
            <span className="ms-2 text-[11px] font-semibold text-muted">
              {EMPLOYEE_STATUS_LABELS.left}
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {employee.role} · {PAY_TYPE_LABELS[employee.payType]}{" "}
          {payRateLabel(employee)}
        </p>
        {balance > 0.004 || openAdvances > 0.004 ? (
          <p className="mt-1 flex flex-wrap gap-x-2 text-[11px] font-semibold">
            {balance > 0.004 ? (
              <span className="text-primary">
                مستحق {formatCurrency(balance)} ج.م
              </span>
            ) : null}
            {openAdvances > 0.004 ? (
              <span className="text-[#b5543f]">
                سلف {formatCurrency(openAdvances)} ج.م
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {todayStatus ? (
          <span
            className={`h-2 w-2 rounded-full ${ATTENDANCE_VISUAL[todayStatus].dot}`}
            aria-hidden
            title={ATTENDANCE_VISUAL[todayStatus].label}
          />
        ) : null}
        <span className="text-muted" aria-hidden>
          ‹
        </span>
      </div>
    </Link>
  );
}
