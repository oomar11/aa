"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  EMPLOYEE_STATUS_LABELS,
  HR_UPDATED_EVENT,
  PAY_TYPE_LABELS,
  employeeOpenAdvancesTotal,
  loadEmployees,
  type Employee,
} from "@/lib/hr";
import { ROUTES } from "@/lib/routes";
import { formatCurrency, smartSearchMatch } from "@/lib/utils";

export function EmployeesBrowser() {
  const [employees, setEmployees] = useState<Employee[]>(() =>
    typeof window === "undefined" ? [] : loadEmployees()
  );
  const [query, setQuery] = useState("");
  const [showLeft, setShowLeft] = useState(false);

  useEffect(() => {
    function refresh() {
      setEmployees(loadEmployees());
    }
    refresh();
    window.addEventListener(HR_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(HR_UPDATED_EVENT, refresh);
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="بحث بالاسم أو الوظيفة"
          className="h-11 min-w-0 flex-1 rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <Link
          href={ROUTES.hr.newEmployee}
          className="flex h-11 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-white"
        >
          موظف جديد
        </Link>
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
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card lg:block">
            <table className="w-full min-w-[720px] text-start text-sm">
              <thead className="bg-background text-[11px] text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">الاسم</th>
                  <th className="px-3 py-2.5 font-semibold">الوظيفة</th>
                  <th className="px-3 py-2.5 font-semibold">نوع الأجر</th>
                  <th className="px-3 py-2.5 text-end font-semibold">الأجر</th>
                  <th className="px-3 py-2.5 font-semibold">الهاتف</th>
                  <th className="px-3 py-2.5 text-end font-semibold">سلف</th>
                  <th className="px-4 py-2.5 font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((employee) => {
                  const open = employeeOpenAdvancesTotal(employee.id);
                  return (
                    <tr
                      key={employee.id}
                      className="border-t border-border hover:bg-primary-soft/30"
                    >
                      <td className="px-4 py-2.5">
                        <Link
                          href={ROUTES.hr.editEmployee(employee.id)}
                          className="font-bold text-primary hover:underline"
                        >
                          {employee.name}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted">
                        {employee.role}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted">
                        {PAY_TYPE_LABELS[employee.payType]}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-end font-bold tabular-nums">
                        {formatCurrency(employee.wage)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted" dir="ltr">
                        {employee.phone || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-end tabular-nums">
                        {open > 0 ? (
                          <span className="font-semibold text-[#E85A8A]">
                            {formatCurrency(open)}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                        {EMPLOYEE_STATUS_LABELS[employee.status]}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="overflow-hidden rounded-2xl border border-border bg-card lg:hidden">
            {filtered.map((employee, i) => {
              const open = employeeOpenAdvancesTotal(employee.id);
              return (
                <li
                  key={employee.id}
                  className={i > 0 ? "border-t border-border" : undefined}
                >
                  <Link
                    href={ROUTES.hr.editEmployee(employee.id)}
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
                        {employee.role}
                        {" · "}
                        {PAY_TYPE_LABELS[employee.payType]}{" "}
                        {formatCurrency(employee.wage)} ج.م
                        {employee.phone ? ` · ${employee.phone}` : ""}
                      </p>
                      {open > 0 ? (
                        <p className="mt-0.5 text-[11px] font-semibold text-[#E85A8A]">
                          سلف مفتوحة {formatCurrency(open)} ج.م
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-muted" aria-hidden>
                      ‹
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
