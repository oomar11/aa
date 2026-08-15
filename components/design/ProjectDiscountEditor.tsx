"use client";

import { FormEvent, useMemo, useState } from "react";
import { NumericInput } from "@/components/ui/NumericInput";
import {
  applyProjectDiscount,
  type ProjectMoneySummary,
} from "@/lib/project-money";
import {
  upsertProjectOverride,
  type Project,
  type ProjectDiscountType,
} from "@/lib/projects";
import { formatCurrency } from "@/lib/utils";

type Props = {
  project: Project;
  money: ProjectMoneySummary;
};

function storedDiscount(
  project: Project,
  money: ProjectMoneySummary
): { type: ProjectDiscountType; value: number } {
  if (
    (project.discountType === "percent" || project.discountType === "amount") &&
    (Number(project.discountValue) || 0) > 0
  ) {
    return {
      type: project.discountType,
      value: Number(project.discountValue) || 0,
    };
  }
  if (money.discountAmount > 0) {
    return { type: "amount", value: money.discountAmount };
  }
  return { type: "amount", value: 0 };
}

export function ProjectDiscountEditor({ project, money }: Props) {
  const initial = storedDiscount(project, money);
  const [discountType, setDiscountType] = useState<ProjectDiscountType>(
    initial.type
  );
  const [discountValue, setDiscountValue] = useState(initial.value);
  const [saved, setSaved] = useState(false);

  const preview = useMemo(() => {
    if (discountValue > 0) {
      return applyProjectDiscount(money.subtotal, discountType, discountValue);
    }
    return {
      discountAmount: money.discountAmount,
      sale: money.sale,
    };
  }, [
    discountType,
    discountValue,
    money.discountAmount,
    money.sale,
    money.subtotal,
  ]);

  function persist(type: ProjectDiscountType, value: number) {
    const hasDiscount = value > 0;
    upsertProjectOverride({
      ...project,
      discountType: hasDiscount ? type : undefined,
      discountValue: hasDiscount ? value : undefined,
      agreedSale: undefined,
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    persist(discountType, discountValue);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  function handleClear() {
    setDiscountValue(0);
    persist("amount", 0);
  }

  function handleTypeChange(next: ProjectDiscountType) {
    setDiscountType(next);
    if (next === "percent" && discountValue > 100) {
      setDiscountValue(100);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">خصم المشروع</h3>
          <p className="mt-0.5 text-[11px] text-muted">
            البنود {formatCurrency(money.subtotal)} ج.م — الخصم ينقص الحساب في
            المقايسة وعلى العميل
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-muted">نوع الخصم</span>
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border">
            <button
              type="button"
              onClick={() => handleTypeChange("amount")}
              className={`h-9 px-3 text-xs font-bold ${
                discountType === "amount"
                  ? "bg-primary text-white"
                  : "bg-background text-muted"
              }`}
            >
              مبلغ ج.م
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("percent")}
              className={`h-9 px-3 text-xs font-bold ${
                discountType === "percent"
                  ? "bg-primary text-white"
                  : "bg-background text-muted"
              }`}
            >
              نسبة %
            </button>
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-muted">
            {discountType === "percent" ? "نسبة الخصم" : "مبلغ الخصم"}
          </span>
          <NumericInput
            min={0}
            max={discountType === "percent" ? 100 : undefined}
            blankZero
            value={discountValue}
            onChange={setDiscountValue}
            placeholder={discountType === "percent" ? "مثال 5" : "مثال 2000"}
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold tabular-nums text-foreground outline-none focus:border-primary"
            dir="ltr"
            inputMode="decimal"
          />
        </label>

        <div className="rounded-xl bg-background px-3 py-2.5 text-[11px] text-muted">
          <div className="flex items-center justify-between">
            <span>البنود</span>
            <span className="tabular-nums font-semibold text-foreground">
              {formatCurrency(money.subtotal)} ج.م
            </span>
          </div>
          {preview.discountAmount > 0 ? (
            <div className="mt-1 flex items-center justify-between">
              <span>
                الخصم
                {discountType === "percent" && discountValue > 0
                  ? ` ${discountValue}%`
                  : ""}
              </span>
              <span className="tabular-nums font-semibold text-[#E85A8A]">
                −{formatCurrency(preview.discountAmount)} ج.م
              </span>
            </div>
          ) : null}
          <div className="mt-1.5 flex items-center justify-between border-t border-border pt-1.5">
            <span className="font-semibold text-foreground">بعد الخصم</span>
            <span className="text-sm font-bold tabular-nums text-foreground">
              {formatCurrency(preview.sale)} ج.م
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="submit"
            className="flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            {saved ? "تم الحفظ" : "حفظ الخصم"}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="flex h-11 items-center justify-center rounded-xl border border-border text-sm font-bold text-muted transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            بدون خصم
          </button>
        </div>
      </form>
    </section>
  );
}
