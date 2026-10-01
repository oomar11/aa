"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmployeeCard } from "@/components/hr/EmployeeCard";
import { ScreenBack } from "@/components/layout/ScreenBack";
import { todayIsoDate } from "@/lib/accounting";
import {
  employeeOpenAdvancesTotal,
  HR_UPDATED_EVENT,
  hrHubSummary,
  loadAttendance,
  loadEmployees,
  previewEmployeeBalance,
  type AttendanceStatus,
  type Employee,
} from "@/lib/hr";
import { ROUTES } from "@/lib/routes";
import { formatCurrency, smartSearchMatch } from "@/lib/utils";

const DEFAULT_SUMMARY = {
  activeCount: 0,
  presentToday: 0,
  openAdvances: 0,
  openBonuses: 0,
  openAccrued: 0,
  monthPaid: 0,
  monthPayrollCount: 0,
  periodFrom: "",
  periodTo: "",
};

export function HrHub() {
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<
    Map<string, AttendanceStatus>
  >(() => new Map());
  const [query, setQuery] = useState("");
  const [showLeft, setShowLeft] = useState(false);

  useEffect(() => {
    function refresh() {
      setSummary(hrHubSummary());
      setEmployees(loadEmployees());
      const today = todayIsoDate();
      const map = new Map<string, AttendanceStatus>();
      for (const row of loadAttendance()) {
        if (row.date === today) map.set(row.employeeId, row.status);
      }
      setAttendanceToday(map);
    }
    refresh();
    window.addEventListener(HR_UPDATED_EVENT, refresh);
    window.addEventListener("upvc-accounting-updated", refresh);
    return () => {
      window.removeEventListener(HR_UPDATED_EVENT, refresh);
      window.removeEventListener("upvc-accounting-updated", refresh);
    };
  }, []);

  const filtered = useMemo(() => {
    return [...employees]
      .filter((row) => (showLeft ? true : row.status !== "left"))
      .filter((row) =>
        smartSearchMatch(query, [row.name, row.phone, row.role, row.note])
      )
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [employees, query, showLeft]);

  return (
    <div className="flex flex-col gap-5">
      <ScreenBack href={ROUTES.more} className="lg:hidden">
        المزيد
      </ScreenBack>
      <section className="rounded-2xl bg-[#5B6ABF] px-4 py-5 text-white shadow-[0_8px_24px_rgba(91,106,191,0.28)] lg:px-6 lg:py-6">
        <p className="text-xs font-medium opacity-85">الموارد البشرية</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">الموظفين</h1>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <HubStat label="شغالين" value={String(summary.activeCount)} />
          <HubStat
            label="مستحقات"
            value={`${formatCurrency(summary.openAccrued)} ج.م`}
          />
          <HubStat
            label="سلف مفتوحة"
            value={`${formatCurrency(summary.openAdvances)} ج.م`}
          />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <QuickAction href={ROUTES.hr.attendance} label="حضور اليوم" />
        <QuickAction href={ROUTES.hr.payroll} label="صرف رواتب" />
        <QuickAction href={ROUTES.hr.newEmployee} label="موظف جديد" primary />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث بالاسم أو الوظيفة"
            className="h-11 min-w-0 flex-1 rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <label className="flex items-center gap-2 px-1 text-xs text-muted">
          <input
            type="checkbox"
            checked={showLeft}
            onChange={(e) => setShowLeft(e.target.checked)}
          />
          إظهار اللي سابوا
        </label>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
            مفيش موظفين — أضف العامل من «موظف جديد»
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-border bg-card lg:grid lg:grid-cols-2 lg:gap-3 lg:overflow-visible lg:rounded-none lg:border-none lg:bg-transparent">
            {filtered.map((employee, i) => (
              <li
                key={employee.id}
                className={`lg:rounded-2xl lg:border lg:border-border lg:bg-card ${
                  i > 0 ? "border-t border-border lg:border-t-0" : ""
                }`}
              >
                <EmployeeCard
                  employee={employee}
                  balance={previewEmployeeBalance(employee).netAmount}
                  openAdvances={employeeOpenAdvancesTotal(employee.id)}
                  todayStatus={attendanceToday.get(employee.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function HubStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 px-3 py-2.5">
      <p className="text-[11px] opacity-80">{label}</p>
      <p className="mt-0.5 text-sm font-bold tabular-nums lg:text-lg">{value}</p>
    </div>
  );
}

function QuickAction({
  href,
  label,
  primary = false,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex h-16 flex-col items-center justify-center rounded-2xl text-xs font-bold transition-all active:scale-[0.98] ${
        primary
          ? "bg-primary text-white shadow-[0_6px_18px_rgba(13,106,107,0.28)]"
          : "border border-border bg-card text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}
