"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  EXPENSE_CATEGORIES,
  todayIsoDate,
  upsertExpense,
} from "@/lib/accounting";
import { getProjectById } from "@/lib/projects";
import { getProjectMoneySummary } from "@/lib/project-money";
import { ROUTES } from "@/lib/routes";
import { formatCurrency } from "@/lib/utils";
import { NumericInput } from "@/components/ui/NumericInput";
import { PaymentProjectPicker } from "@/components/accounting/PaymentProjectPicker";

/**
 * تسجيل مصروف: اختر المشروع + المبلغ والوصف.
 * سهل وسريع — نفس أسلوب استلام الدفعة.
 */
export function ExpenseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetProjectId = searchParams.get("project") ?? "";

  const [projectId, setProjectId] = useState(presetProjectId);
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayIsoDate());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [projectError, setProjectError] = useState(false);

  const selectedProject = projectId ? getProjectById(projectId) : undefined;
  const money = selectedProject
    ? getProjectMoneySummary(selectedProject.id)
    : null;

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
    router.replace(ROUTES.design.editor(selectedProject.customerId, selectedProject.id));
  }

  const fieldClass =
    "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <p className="rounded-2xl border border-[#E8956F]/30 bg-[#E8956F]/10 px-3.5 py-3 text-xs leading-relaxed text-foreground">
        سجّل مصروف المشروع: خامات، نقل، أجور… يظهر ضمن حساب المشروع مباشرة.
      </p>

      <PaymentProjectPicker
        value={projectId}
        onChange={(id) => {
          setProjectId(id);
          setProjectError(false);
          setError("");
        }}
        error={projectError}
      />

      {money ? (
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-3">
          <div className="text-center">
            <p className="text-[10px] text-muted">مصروفات سابقة</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-[#E8956F]">
              {formatCurrency(money.expenses)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted">المحصّل</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-[#2F9B7A]">
              {formatCurrency(money.paid)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted">المتبقي</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-[#E85A8A]">
              {formatCurrency(money.remaining)}
            </p>
          </div>
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
        className="mt-2 flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98]"
      >
        حفظ المصروف
      </button>
    </form>
  );
}
