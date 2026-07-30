"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  EXPENSE_CATEGORIES,
  todayIsoDate,
  upsertExpense,
} from "@/lib/accounting";
import { ROUTES } from "@/lib/routes";
import { NumericInput } from "@/components/ui/NumericInput";

export function ExpenseForm() {
  const router = useRouter();
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayIsoDate());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setError("اكتب وصف المصروف");
      return;
    }
    if (amount <= 0) {
      setError("ادخل مبلغ أكبر من صفر");
      return;
    }

    upsertExpense({
      id: `exp-${Date.now()}`,
      category,
      description: description.trim(),
      amount,
      date,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    router.replace(ROUTES.accounting.expenses);
  }

  const fieldClass =
    "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
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
          placeholder="مثال: شراء زجاج / إيجار المخزن"
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
          rows={3}
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
