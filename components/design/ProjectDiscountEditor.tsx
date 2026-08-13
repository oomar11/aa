"use client";

import { FormEvent, useEffect, useState } from "react";
import type { ProjectMoneySummary } from "@/lib/project-money";
import { upsertProjectOverride, type Project } from "@/lib/projects";
import { formatCurrency } from "@/lib/utils";

type Props = {
  project: Project;
  money: ProjectMoneySummary;
};

export function ProjectDiscountEditor({ project, money }: Props) {
  const [value, setValue] = useState(
    project.agreedSale && project.agreedSale > 0
      ? String(project.agreedSale)
      : money.sale > 0
        ? String(money.sale)
        : ""
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValue(
      project.agreedSale && project.agreedSale > 0
        ? String(project.agreedSale)
        : money.sale > 0
          ? String(money.sale)
          : ""
    );
  }, [project.id, project.agreedSale, money.sale]);

  function persist(nextSale: number | undefined) {
    upsertProjectOverride({
      ...project,
      agreedSale: nextSale && nextSale > 0 ? nextSale : undefined,
      discountType: undefined,
      discountValue: undefined,
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = Number(value);
    persist(Number.isFinite(parsed) && parsed > 0 ? parsed : undefined);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  function handleClear() {
    setValue(money.subtotal > 0 ? String(money.subtotal) : "");
    persist(undefined);
  }

  const parsed = Number(value);
  const preview =
    Number.isFinite(parsed) && parsed > 0 ? parsed : money.subtotal;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">سعر الشغلانة</h3>
          <p className="mt-0.5 text-[11px] text-muted">
            البنود {formatCurrency(money.subtotal)} ج.م — الرقم ده يترحل للمحل
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-muted">
            الحساب المتفق عليه
          </span>
          <input
            type="number"
            min={0}
            step={1}
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="مثال 40000"
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold tabular-nums text-foreground outline-none focus:border-primary"
          />
        </label>

        <p className="text-[11px] text-muted">
          هيظهر في المحل{" "}
          <span className="font-bold tabular-nums text-foreground">
            {formatCurrency(preview)} ج.م
          </span>
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="submit"
            className="flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            {saved ? "تم — المحل بيتحدث" : "حفظ وترحيل للمحل"}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="flex h-11 items-center justify-center rounded-xl border border-border text-sm font-bold text-muted transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            من البنود
          </button>
        </div>
      </form>
    </section>
  );
}
