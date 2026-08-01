"use client";

import { FormEvent, useEffect, useState } from "react";
import { NumericInput } from "@/components/ui/NumericInput";
import {
  DEFAULT_PRICING,
  loadPricingSettings,
  savePricingSettings,
  type PricingSettings,
} from "@/lib/pricing";

export function PricingForm() {
  const [enabled, setEnabled] = useState(DEFAULT_PRICING.enabled);
  const [marginPercent, setMarginPercent] = useState(
    DEFAULT_PRICING.marginPercent
  );
  const [laborPerSqm, setLaborPerSqm] = useState(DEFAULT_PRICING.laborPerSqm);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const current = loadPricingSettings();
    setEnabled(current.enabled);
    setMarginPercent(current.marginPercent);
    setLaborPerSqm(current.laborPerSqm);
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: PricingSettings = {
      enabled,
      marginPercent,
      laborPerSqm,
    };
    savePricingSettings(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  const fieldClass =
    "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <p className="rounded-2xl border border-primary/20 bg-primary-soft/40 px-3.5 py-3 text-xs leading-relaxed text-foreground">
        سعر البيع = تكلفة الخامات × (1 + الهامش) + المصنعية × المساحة.
        أي شباك أقل من متر يُحسب متر كامل في المصنعية.
      </p>

      <label className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <span className="text-sm font-medium">تفعيل التسعير التلقائي</span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            setSaved(false);
          }}
          className="h-5 w-5 accent-primary"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">هامش الربح على الخامات (%)</span>
        <NumericInput
          value={marginPercent}
          onChange={(v) => {
            setMarginPercent(v);
            setSaved(false);
          }}
          min={0}
          max={500}
          blankZero={false}
          className={`${fieldClass} text-left`}
          dir="ltr"
        />
        <span className="text-[11px] text-muted">المقترح: 25–35٪</span>
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">المصنعية (ج.م / م²)</span>
        <NumericInput
          value={laborPerSqm}
          onChange={(v) => {
            setLaborPerSqm(v);
            setSaved(false);
          }}
          min={0}
          blankZero={false}
          className={`${fieldClass} text-left`}
          dir="ltr"
        />
        <span className="text-[11px] text-muted">
          أقل من 1 م² يُحسب كـ 1 م²
        </span>
      </label>

      {saved ? (
        <p className="text-sm font-medium text-emerald-600">تم حفظ التسعير</p>
      ) : null}

      <button
        type="submit"
        className="mt-1 flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98]"
      >
        حفظ التسعير
      </button>
    </form>
  );
}
