"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { NumericInput } from "@/components/ui/NumericInput";
import { todayIsoDate } from "@/lib/accounting";
import {
  bonusOpenAmount,
  deleteBonus,
  HR_UPDATED_EVENT,
  isBonusOpen,
  listActiveEmployees,
  loadBonuses,
  loadEmployees,
  registerBonus,
  type Bonus,
  type Employee,
} from "@/lib/hr";
import { listAllProjects, type Project } from "@/lib/projects";
import { formatCurrency, formatDate } from "@/lib/utils";
import { WORKFLOW_LABELS } from "@/lib/workshop";

const FIELD =
  "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export function BonusesBoard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayIsoDate);
  const [note, setNote] = useState("");
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterOpen, setFilterOpen] = useState(true);

  useEffect(() => {
    function refresh() {
      const list = listActiveEmployees();
      setEmployees(list);
      setBonuses(loadBonuses());
      setProjects(listAllProjects());
      setEmployeeId((current) => current || list[0]?.id || "");
    }
    refresh();
    window.addEventListener(HR_UPDATED_EVENT, refresh);
    window.addEventListener("upvc-projects-updated", refresh);
    return () => {
      window.removeEventListener(HR_UPDATED_EVENT, refresh);
      window.removeEventListener("upvc-projects-updated", refresh);
    };
  }, []);

  const employeeById = new Map<string, Employee>();
  for (const row of loadEmployees()) employeeById.set(row.id, row);
  const projectById = new Map<string, Project>();
  for (const row of projects) projectById.set(row.id, row);

  const visible = useMemo(() => {
    return [...bonuses]
      .filter((row) => (filterOpen ? isBonusOpen(row) : true))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [bonuses, filterOpen]);

  const openTotal = useMemo(
    () => bonuses.reduce((sum, row) => sum + bonusOpenAmount(row), 0),
    [bonuses]
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!employeeId) {
      setError("اختر الموظف");
      return;
    }
    if (!(amount > 0)) {
      setError("أدخل مبلغ المكافأة");
      return;
    }
    setError("");
    setSaving(true);
    try {
      registerBonus({
        employeeId,
        amount,
        date,
        note: note.trim() || undefined,
        projectId: projectId || undefined,
      });
      setAmount(0);
      setNote("");
      setBonuses(loadBonuses());
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تسجيل المكافأة");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(bonus: Bonus) {
    if (!window.confirm("حذف المكافأة؟")) return;
    setError("");
    try {
      deleteBonus(bonus.id);
      setBonuses(loadBonuses());
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حذف المكافأة");
    }
  }

  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 lg:sticky lg:top-4"
      >
        <h2 className="text-sm font-bold">تسجيل مكافأة</h2>
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
          <span className="text-sm font-medium">شغلانة (اختياري)</span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className={FIELD}
          >
            <option value="">غير مربوطة بشغلانة</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
                {project.workflow !== "quote"
                  ? ` · ${WORKFLOW_LABELS[project.workflow]}`
                  : ""}
              </option>
            ))}
          </select>
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
          disabled={saving}
          className="flex h-11 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "جاري الحفظ…" : "حفظ المكافأة"}
        </button>
        <p className="text-[11px] text-muted">
          المكافأة بتدخل المستحق التراكمي ومش بتسحب من الخزنة غير لما تصرف
          الراتب أو المبلغ.
        </p>
      </form>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="text-sm font-bold">
            مكافآت مفتوحة {formatCurrency(openTotal)} ج.م
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
            مفيش مكافآت
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
                  {visible.map((bonus) => {
                    const open = bonusOpenAmount(bonus);
                    const name =
                      employeeById.get(bonus.employeeId)?.name ?? "موظف";
                    const projectName = bonus.projectId
                      ? projectById.get(bonus.projectId)?.name
                      : undefined;
                    return (
                      <tr
                        key={bonus.id}
                        className="border-t border-border hover:bg-primary-soft/20"
                      >
                        <td className="px-4 py-2.5 font-bold">{name}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-muted">
                          {formatDate(bonus.date)}
                        </td>
                        <td className="max-w-[16rem] truncate px-3 py-2.5 text-muted">
                          {bonus.note || "—"}
                          {projectName ? (
                            <span className="ms-1 text-[11px]">
                              · {projectName}
                            </span>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-end font-bold tabular-nums">
                          {formatCurrency(open)}
                          {open < bonus.amount - 0.004 ? (
                            <span className="ms-1 text-[11px] font-medium text-muted">
                              / {formatCurrency(bonus.amount)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5 text-end">
                          {isBonusOpen(bonus) &&
                          (bonus.settledAmount ?? 0) < 0.004 ? (
                            <button
                              type="button"
                              onClick={() => handleDelete(bonus)}
                              className="text-xs font-semibold text-[#E85A8A]"
                            >
                              حذف
                            </button>
                          ) : (
                            <span className="text-xs text-muted">اتصرفت</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="flex flex-col gap-2 lg:hidden">
              {visible.map((bonus) => {
                const open = bonusOpenAmount(bonus);
                const name =
                  employeeById.get(bonus.employeeId)?.name ?? "موظف";
                const projectName = bonus.projectId
                  ? projectById.get(bonus.projectId)?.name
                  : undefined;
                return (
                  <li
                    key={bonus.id}
                    className="rounded-2xl border border-border bg-card px-3.5 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold">{name}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {formatDate(bonus.date)}
                          {bonus.note ? ` · ${bonus.note}` : ""}
                          {projectName ? ` · ${projectName}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-end">
                        <p className="text-sm font-bold tabular-nums">
                          {formatCurrency(open)} ج.م
                        </p>
                        {open < bonus.amount - 0.004 ? (
                          <p className="text-[11px] text-muted">
                            من أصل {formatCurrency(bonus.amount)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {isBonusOpen(bonus) && (bonus.settledAmount ?? 0) < 0.004 ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(bonus)}
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
