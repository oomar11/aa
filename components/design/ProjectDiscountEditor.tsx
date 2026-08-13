"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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

export function ProjectDiscountEditor({ project, money }: Props) {
  const [type, setType] = useState<ProjectDiscountType>(
    project.discountType === "percent" ? "percent" : "amount"
  );
  const [value, setValue] = useState(
    project.discountValue && project.discountValue > 0
      ? String(project.discountValue)
      : ""
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setType(project.discountType === "percent" ? "percent" : "amount");
    setValue(
      project.discountValue && project.discountValue > 0
        ? String(project.discountValue)
        : ""
    );
  }, [project.id, project.discountType, project.discountValue]);

  const preview = useMemo(() => {
    const parsed = Number(value);
    return applyProjectDiscount(
      money.subtotal,
      type,
      Number.isFinite(parsed) ? parsed : 0
    );
  }, [money.subtotal, type, value]);

  function persist(nextType: ProjectDiscountType | undefined, nextValue: number) {
    const applied = applyProjectDiscount(money.subtotal, nextType, nextValue);
    upsertProjectOverride({
      ...project,
      discountType: applied.discountAmount > 0 ? nextType : undefined,
      discountValue: applied.discountAmount > 0 ? nextValue : undefined,
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = Number(value);
    persist(type, Number.isFinite(parsed) ? parsed : 0);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  function handleClear() {
    setValue("");
    persist(undefined, 0);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">خصم المشروع</h3>
          <p className="mt-0.5 text-[11px] text-muted">
            على إجمالي البنود {formatCurrency(money.subtotal)} ج.م
          </p>
        </div>
        {money.discountAmount > 0 ? (
          <p className="text-sm font-bold tabular-nums text-[#E85A8A]">
            −{formatCurrency(money.discountAmount)}
          </p>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-1.5">
          <TypeChip
            active={type === "amount"}
            onClick={() => setType("amount")}
            label="مبلغ"
          />
          <TypeChip
            active={type === "percent"}
            onClick={() => setType("percent")}
            label="نسبة %"
          />
        </div>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-muted">
            {type === "percent" ? "النسبة" : "المبلغ"}
          </span>
          <input
            type="number"
            min={0}
            max={type === "percent" ? 100 : undefined}
            step={type === "percent" ? 0.1 : 1}
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={type === "percent" ? "مثال 10" : "مثال 500"}
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold tabular-nums text-foreground outline-none focus:border-primary"
          />
        </label>

        <p className="text-[11px] text-muted">
          الحساب بعد الخصم{" "}
          <span className="font-bold tabular-nums text-foreground">
            {formatCurrency(preview.sale)} ج.م
          </span>
          {preview.discountAmount > 0 ? (
            <>
              {" "}
              · خصم{" "}
              <span className="font-bold tabular-nums text-[#E85A8A]">
                {formatCurrency(preview.discountAmount)}
              </span>
            </>
          ) : null}
        </p>

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
            disabled={money.discountAmount <= 0 && !value}
            className="flex h-11 items-center justify-center rounded-xl border border-border text-sm font-bold text-muted transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
          >
            إلغاء الخصم
          </button>
        </div>
      </form>
    </section>
  );
}

function TypeChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 items-center justify-center rounded-xl border text-sm font-bold transition-all ${
        active
          ? "border-primary bg-primary text-white"
          : "border-border bg-background text-muted"
      }`}
    >
      {label}
    </button>
  );
}
