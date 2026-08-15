"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { NumericInput } from "@/components/ui/NumericInput";
import { todayIsoDate } from "@/lib/accounting";
import {
  advanceOpenAmount,
  deleteAdvance,
  HR_UPDATED_EVENT,
  isAdvanceOpen,
  listActiveEmployees,
  loadAdvances,
  loadEmployees,
  upsertAdvance,
  type Advance,
  type Employee,
} from "@/lib/hr";
import { formatCurrency, formatDate } from "@/lib/utils";

const FIELD =
  "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export function AdvancesBoard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayIsoDate);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [filterOpen, setFilterOpen] = useState(true);

  useEffect(() => {
    function refresh() {
      const list = listActiveEmployees();
      setEmployees(list);
      setAdvances(loadAdvances());
      setEmployeeId((current) => current || list[0]?.id || "");
    }
    refresh();
    window.addEventListener(HR_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(HR_UPDATED_EVENT, refresh);
  }, []);

  const employeeById = new Map<string, Employee>();
  for (const row of loadEmployees()) employeeById.set(row.id, row);

  const visible = useMemo(() => {
    return [...advances]
      .filter((row) => (filterOpen ? isAdvanceOpen(row) : true))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [advances, filterOpen]);

  const openTotal = useMemo(
    () =>
      advances.reduce((sum, row) => sum + advanceOpenAmount(row), 0),
    [advances]
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!employeeId) {
      setError("اختر الموظف");
      return;
    }
    if (!(amount > 0)) {
      setError("أدخل مبلغ السلفة");
      return;
    }
    setError("");
    upsertAdvance({
      id: `adv-${Date.now()}`,
      employeeId,
      amount,
      date,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    setAmount(0);
    setNote("");
    setAdvances(loadAdvances());
  }

  function handleDelete(advance: Advance) {
    if (!window.confirm("حذف السلفة؟")) return;
    try {
      deleteAdvance(advance.id);
      setAdvances(loadAdvances());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حذف السلفة");
    }
  }

  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 lg:sticky lg:top-4"
      >
        <h2 className="text-sm font-bold">تسجيل سلفة</h2>
        <label className="flex flex-col gap-1.5 text-right">
          <span className="text-sm font-medium">الموظف</span>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className={FIELD}
          >
            {employees.length === 0 ? (
              <option value="">أضف موظفاً أولاً</option>
            ) : null}
            {employees.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-right">
          <span className="text-sm font-medium">المبلغ</span>
          <NumericInput
            value={amount}
            onChange={setAmount}
            min={0}
            className={FIELD}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-right">
          <span className="text-sm font-medium">التاريخ</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={FIELD}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-right">
          <span className="text-sm font-medium">ملاحظة</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={FIELD}
          />
        </label>
        {error ? (
          <p className="text-sm font-medium text-[#E85A8A]">{error}</p>
        ) : null}
        <button
          type="submit"
          className="flex h-11 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-white"
        >
          حفظ السلفة
        </button>
      </form>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="text-sm font-bold">
            سلف مفتوحة {formatCurrency(openTotal)} ج.م
          </p>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={filterOpen}
              onChange={(e) => setFilterOpen(e.target.checked)}
            />
            المفتوحة فقط
          </label>
        </div>
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
            مفيش سلف
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card lg:block">
              <table className="w-full min-w-[640px] text-start text-sm">
                <thead className="bg-background text-[11px] text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">الموظف</th>
                    <th className="px-3 py-2.5 font-semibold">التاريخ</th>
                    <th className="px-3 py-2.5 font-semibold">ملاحظة</th>
                    <th className="px-3 py-2.5 text-end font-semibold">المتبقي</th>
                    <th className="px-4 py-2.5 text-end font-semibold">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((advance) => {
                    const open = advanceOpenAmount(advance);
                    const name =
                      employeeById.get(advance.employeeId)?.name ?? "موظف";
                    return (
                      <tr
                        key={advance.id}
                        className="border-t border-border hover:bg-primary-soft/20"
                      >
                        <td className="px-4 py-2.5 font-bold">{name}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-muted">
                          {formatDate(advance.date)}
                        </td>
                        <td className="max-w-[16rem] truncate px-3 py-2.5 text-muted">
                          {advance.note || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-end font-bold tabular-nums">
                          {formatCurrency(open)}
                          {open < advance.amount - 0.004 ? (
                            <span className="ms-1 text-[11px] font-medium text-muted">
                              / {formatCurrency(advance.amount)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5 text-end">
                          {isAdvanceOpen(advance) &&
                          (advance.settledAmount ?? 0) < 0.004 ? (
                            <button
                              type="button"
                              onClick={() => handleDelete(advance)}
                              className="text-xs font-semibold text-[#E85A8A]"
                            >
                              حذف
                            </button>
                          ) : (
                            <span className="text-xs text-muted">اتخصمت</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="flex flex-col gap-2 lg:hidden">
            {visible.map((advance) => {
              const open = advanceOpenAmount(advance);
              const name =
                employeeById.get(advance.employeeId)?.name ?? "موظف";
              return (
                <li
                  key={advance.id}
                  className="rounded-2xl border border-border bg-card px-3.5 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold">{name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatDate(advance.date)}
                        {advance.note ? ` · ${advance.note}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-end">
                      <p className="text-sm font-bold tabular-nums">
                        {formatCurrency(open)} ج.م
                      </p>
                      {open < advance.amount - 0.004 ? (
                        <p className="text-[11px] text-muted">
                          من أصل {formatCurrency(advance.amount)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {isAdvanceOpen(advance) && (advance.settledAmount ?? 0) < 0.004 ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(advance)}
                      className="mt-2 text-[11px] font-semibold text-[#E85A8A]"
                    >
                      حذف
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
          </>
        )}
      </section>
    </div>
  );
}
