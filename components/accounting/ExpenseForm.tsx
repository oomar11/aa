"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  EXPENSE_CATEGORIES,
  loadExpenses,
  todayIsoDate,
  upsertExpense,
} from "@/lib/accounting";
import { getProjectById } from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import { formatCurrency } from "@/lib/utils";
import { NumericInput } from "@/components/ui/NumericInput";
import { PaymentProjectPicker } from "@/components/accounting/PaymentProjectPicker";

type Props = {
  /** مشروع محدد مسبقاً — بدون اختيار مشروع */
  fixedProjectId?: string;
  /** بعد الحفظ يعود لسجل المصروفات بدل المحرر */
  returnToLog?: boolean;
  /** بدون زر حفظ كبير في الأسفل عند التضمين */
  compact?: boolean;
  /** إخفاء بطاقة إجمالي المصروف داخل النموذج */
  hideTotal?: boolean;
};

/**
 * تسجيل مصروف: اختر المشروع + المبلغ والوصف.
 * بدون حساب المشروع — إجمالي المصروف فقط.
 */
export function ExpenseForm({
  fixedProjectId,
  returnToLog = false,
  compact = false,
  hideTotal = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetProjectId = fixedProjectId ?? searchParams.get("project") ?? "";

  const [projectId, setProjectId] = useState(presetProjectId);
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayIsoDate());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [projectError, setProjectError] = useState(false);
  const [expenseTotal, setExpenseTotal] = useState(0);

  const lockedProject = presetProjectId ? getProjectById(presetProjectId) : undefined;
  const selectedProject = lockedProject ?? (projectId ? getProjectById(projectId) : undefined);

  const activeProjectId = lockedProject?.id ?? projectId;

  useEffect(() => {
    function refresh() {
      if (!activeProjectId) {
        setExpenseTotal(0);
        return;
      }
      const sum = loadExpenses()
        .filter((e) => e.projectId === activeProjectId)
        .reduce((s, e) => s + e.amount, 0);
      setExpenseTotal(sum);
    }
    refresh();
    window.addEventListener("upvc-accounting-updated", refresh);
    return () => window.removeEventListener("upvc-accounting-updated", refresh);
  }, [activeProjectId]);

  const showProjectPicker = !lockedProject;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedProject || selectedProject.workflow === "done") {
      setError("اختر المشروع");
      setProjectError(true);
      return;
    }
    if (!description.trim()) {
      setError("أدخل وصف المصروف");
      return;
    }
    if (amount <= 0) {
      setError("أدخل مبلغاً أكبر من صفر");
      return;
    }

    upsertExpense({
      id: `exp-${Date.now()}`,
      category,
      description: description.trim(),
      amount,
      date,
      projectId: selectedProject.id,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    });

    if (returnToLog || lockedProject) {
      router.replace(
        `${ROUTES.accounting.expenses}?project=${selectedProject.id}`
      );
      return;
    }
    router.replace(ROUTES.design.editor(selectedProject.customerId, selectedProject.id));
  }

  const fieldClass =
    "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      {!compact ? (
        <p className="rounded-2xl border border-[#E8956F]/30 bg-[#E8956F]/10 px-3.5 py-3 text-xs leading-relaxed text-foreground">
          سجّل مصروف المشروع: خامات، نقل، أجور… يُضاف إلى سجل المصروفات.
        </p>
      ) : null}

      {showProjectPicker ? (
        <PaymentProjectPicker
          value={projectId}
          onChange={(id) => {
            setProjectId(id);
            setProjectError(false);
            setError("");
          }}
          error={projectError}
          variant="expense"
        />
      ) : lockedProject ? (
        <div className="rounded-2xl border border-primary/35 bg-card p-3.5">
          <p className="text-sm font-bold text-foreground">{lockedProject.name}</p>
          {lockedProject.location ? (
            <p className="mt-0.5 text-xs text-muted">{lockedProject.location}</p>
          ) : null}
        </div>
      ) : null}

      {activeProjectId && !hideTotal ? (
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted">إجمالي المصروف</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-[#E8956F]">
            {formatCurrency(expenseTotal)} ج.م
          </p>
        </div>
      ) : null}

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">التصنيف</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={fieldClass}
        >
          {EXPENSE_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">
          الوصف <span className="text-[#E85A8A]">*</span>
        </span>
        <input
          type="text"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setError("");
          }}
          placeholder="مثال: شراء زجاج / نقل تركيب"
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">
          المبلغ (ج.م) <span className="text-[#E85A8A]">*</span>
        </span>
        <NumericInput
          value={amount}
          onChange={(value) => {
            setAmount(value);
            setError("");
          }}
          min={0}
          blankZero
          className={`${fieldClass} text-left`}
          dir="ltr"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">التاريخ</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`${fieldClass} text-left`}
          dir="ltr"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">
          ملاحظة <span className="font-normal text-muted">(اختياري)</span>
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className={`${fieldClass} resize-none`}
        />
      </label>

      {error ? (
        <p className="text-sm font-medium text-[#E85A8A]">{error}</p>
      ) : null}

      <button
        type="submit"
        className={`flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98] ${
          compact ? "" : "mt-2"
        }`}
      >
        حفظ المصروف
      </button>
    </form>
  );
}
