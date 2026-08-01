"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  deleteExpense,
  todayIsoDate,
  upsertExpense,
  type Expense,
} from "@/lib/accounting";
import { listProjectExpenses, projectExpenseTotal } from "@/lib/project-money";
import { getProjectById } from "@/lib/projects";
import { formatCurrency, formatDate } from "@/lib/utils";
import { NumericInput } from "@/components/ui/NumericInput";

/** التصنيفات الأكثر استخداماً لمصروف المشروع */
const PROJECT_CATEGORIES = ["خامات", "أجور", "نقل", "صيانة", "مصروفات عامة"] as const;

type Props = {
  customerId: string;
  projectId: string;
};

/**
 * مصروفات المشروع من داخل المشروع فقط:
 * إجمالي → تسجيل سريع → سجل واضح.
 */
export function ProjectExpenses({ customerId, projectId }: Props) {
  const project = getProjectById(projectId);

  const [expenses, setExpenses] = useState<Expense[]>(() =>
    typeof window === "undefined" ? [] : listProjectExpenses(projectId)
  );
  const [total, setTotal] = useState(() =>
    typeof window === "undefined" ? 0 : projectExpenseTotal(projectId)
  );
  const [justSavedId, setJustSavedId] = useState<string | null>(null);

  const [category, setCategory] = useState<string>(PROJECT_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayIsoDate());
  const [note, setNote] = useState("");
  const [showExtra, setShowExtra] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function refresh() {
      setExpenses(listProjectExpenses(projectId));
      setTotal(projectExpenseTotal(projectId));
    }
    refresh();
    window.addEventListener("upvc-accounting-updated", refresh);
    return () => window.removeEventListener("upvc-accounting-updated", refresh);
  }, [projectId]);

  useEffect(() => {
    if (!justSavedId) return;
    const t = window.setTimeout(() => setJustSavedId(null), 1600);
    return () => window.clearTimeout(t);
  }, [justSavedId]);

  function resetForm() {
    setDescription("");
    setAmount(0);
    setNote("");
    setDate(todayIsoDate());
    setCategory(PROJECT_CATEGORIES[0]);
    setShowExtra(false);
    setError("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!project) {
      setError("المشروع غير موجود");
      return;
    }
    if (amount <= 0) {
      setError("أدخل المبلغ");
      return;
    }
    if (!description.trim()) {
      setError("أدخل وصف المصروف");
      return;
    }

    setSaving(true);
    const id = `exp-${Date.now()}`;
    upsertExpense({
      id,
      category,
      description: description.trim(),
      amount,
      date,
      projectId,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    resetForm();
    setJustSavedId(id);
    setSaving(false);
  }

  if (!project || project.customerId !== customerId) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
        المشروع غير موجود
      </p>
    );
  }

  const fieldClass =
    "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-[#E8956F] focus:ring-2 focus:ring-[#E8956F]/20";

  return (
    <div className="flex flex-col gap-5">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#C45C26] to-[#E8956F] px-4 py-5 text-white shadow-[0_8px_24px_rgba(196,92,38,0.28)]">
        <p className="text-xs font-medium opacity-90">إجمالي مصروف المشروع</p>
        <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
          {formatCurrency(total)}
          <span className="mr-1.5 text-sm font-semibold opacity-85">ج.م</span>
        </p>
        <p className="mt-2 truncate text-xs opacity-85">
          {project.name}
          {expenses.length > 0 ? ` · ${expenses.length} قيد` : ""}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="px-0.5 text-sm font-bold text-foreground">
          تسجيل مصروف جديد
        </h2>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3.5 rounded-2xl border border-border bg-card p-4"
        >
          <label className="flex flex-col gap-1.5 text-right">
            <span className="text-xs font-medium text-muted">المبلغ (ج.م)</span>
            <NumericInput
              value={amount}
              onChange={(value) => {
                setAmount(value);
                setError("");
              }}
              min={0}
              blankZero
              autoFocus
              className={`${fieldClass} text-left text-xl font-bold tabular-nums`}
              dir="ltr"
              inputMode="decimal"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-right">
            <span className="text-xs font-medium text-muted">الوصف</span>
            <input
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setError("");
              }}
              placeholder="مثال: زجاج / نقل / أجرة فني"
              className={fieldClass}
            />
          </label>

          <div className="flex flex-col gap-1.5 text-right">
            <span className="text-xs font-medium text-muted">التصنيف</span>
            <div className="flex flex-wrap gap-2">
              {PROJECT_CATEGORIES.map((item) => {
                const active = category === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                      active
                        ? "bg-[#E8956F] text-white"
                        : "border border-border bg-background text-foreground"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowExtra((v) => !v)}
            className="self-start text-xs font-semibold text-[#C45C26]"
          >
            {showExtra ? "إخفاء التاريخ والملاحظة" : "تاريخ وملاحظة…"}
          </button>

          {showExtra ? (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-right">
                <span className="text-xs font-medium text-muted">التاريخ</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`${fieldClass} text-left`}
                  dir="ltr"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-right">
                <span className="text-xs font-medium text-muted">ملاحظة</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="اختياري"
                  className={`${fieldClass} resize-none`}
                />
              </label>
            </div>
          ) : null}

          {error ? (
            <p className="text-sm font-medium text-[#E85A8A]">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#C45C26] text-sm font-bold text-white transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? "جاري الحفظ…" : "إضافة إلى السجل"}
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2 px-0.5">
          <h2 className="text-sm font-bold text-foreground">سجل المصروفات</h2>
          <span className="text-xs text-muted">{expenses.length}</span>
        </div>

        {expenses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm leading-relaxed text-muted">
            لا توجد مصروفات بعد.
            <br />
            سجّل أول مصروف أعلاه.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {expenses.map((expense) => {
              const highlight = expense.id === justSavedId;
              return (
                <li
                  key={expense.id}
                  className={`rounded-2xl border bg-card p-3.5 transition-all duration-500 ${
                    highlight
                      ? "border-[#E8956F] shadow-[0_0_0_3px_rgba(232,149,111,0.25)]"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">
                        {expense.description}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-lg bg-[#E8956F]/15 px-2 py-0.5 text-[10px] font-semibold text-[#C45C26]">
                          {expense.category}
                        </span>
                        <span className="text-[11px] text-muted">
                          {formatDate(expense.date)}
                        </span>
                      </div>
                      {expense.note ? (
                        <p className="mt-1.5 text-xs text-muted">{expense.note}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <p className="text-base font-bold tabular-nums text-[#C45C26]">
                        {formatCurrency(expense.amount)}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm("حذف هذا المصروف؟")) return;
                          deleteExpense(expense.id);
                        }}
                        className="text-[11px] font-semibold text-[#E85A8A]"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
