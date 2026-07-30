"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { NumericInput } from "@/components/ui/NumericInput";
import {
  calcCutSizes,
  defaultUnifiedCutDeductions,
  getCutCalculationSteps,
  loadMaterialCatalog,
  saveCutDeductions,
  type UnifiedCutDeductions,
} from "@/lib/material-systems";

function mmToCm(mm: number): number {
  return Math.round((mm / 10) * 100) / 100;
}

function cmToMm(cm: number): number {
  return Math.round(cm * 10);
}

export function CutDeductionsEditor() {
  const [deductions, setDeductions] = useState<UnifiedCutDeductions>(
    defaultUnifiedCutDeductions
  );
  const [previewW, setPreviewW] = useState(120);
  const [previewH, setPreviewH] = useState(140);
  const [flash, setFlash] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const showFlash = useCallback((msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 1800);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      const cat = loadMaterialCatalog();
      setDeductions(
        cat.cutDeductions
          ? { ...cat.cutDeductions }
          : defaultUnifiedCutDeductions()
      );
      setReady(true);
    });
  }, []);

  function save(e: FormEvent) {
    e.preventDefault();
    const cat = loadMaterialCatalog();
    const saved = saveCutDeductions(cat, deductions);
    setDeductions(
      saved.cutDeductions
        ? { ...saved.cutDeductions }
        : defaultUnifiedCutDeductions()
    );
    showFlash("تم حفظ التخصيمات");
  }

  function resetDefaults() {
    const next = defaultUnifiedCutDeductions();
    setDeductions(next);
    const cat = loadMaterialCatalog();
    saveCutDeductions(cat, next);
    showFlash("تم الرجوع للافتراضي");
  }

  if (!ready) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted">
        جاري التحميل…
      </div>
    );
  }

  const previewCuts = calcCutSizes(
    cmToMm(previewW),
    cmToMm(previewH),
    deductions
  );
  const steps = getCutCalculationSteps(
    cmToMm(previewW),
    cmToMm(previewH),
    deductions
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="px-1">
        <h2 className="text-lg font-bold text-foreground">التخصيمات الموحدة</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          أرقام بسيطة لحساب تقديري الخامات — الحلق والضلفة والباكتة والزجاج.
          أسعار القطاعات والاكسسوار والزجاج من صفحاتهم.
        </p>
      </div>

      {flash ? (
        <p className="rounded-xl border border-primary/30 bg-primary-soft/40 px-3 py-2 text-center text-xs font-semibold text-primary">
          {flash}
        </p>
      ) : null}

      <form
        onSubmit={save}
        className="space-y-3 rounded-2xl border border-border bg-card p-3"
      >
        <div className="rounded-xl border border-primary/25 bg-primary-soft/30 px-3 py-2.5 text-[11px] leading-relaxed text-muted">
          <p className="font-bold text-primary">بالبلدي كده</p>
          <ol className="mt-1.5 list-inside list-decimal space-y-1">
            <li>
              <span className="text-foreground">الحلق</span> أكبر من الفتحة
            </li>
            <li>
              <span className="text-foreground">الضلفة</span> أصغر من الحلق
            </li>
            <li>
              <span className="text-foreground">الباكتة والزجاج</span> أصغر من
              الضلفة (نفس الرقم)
            </li>
          </ol>
        </div>

        <DeductField
          label="الحلق أكبر من الفتحة"
          hint="مثال: ١١ سم"
          valueCm={mmToCm(deductions.frameAddMm)}
          onChangeCm={(cm) =>
            setDeductions((d) => ({ ...d, frameAddMm: cmToMm(cm) }))
          }
        />
        <DeductField
          label="الضلفة أصغر من الحلق"
          hint="مثال: ١٣ سم"
          valueCm={mmToCm(deductions.sashLessMm)}
          onChangeCm={(cm) =>
            setDeductions((d) => ({ ...d, sashLessMm: cmToMm(cm) }))
          }
        />
        <DeductField
          label="الباكتة والزجاج أصغر من الضلفة"
          hint="نفس التخصيم للاتنين"
          valueCm={mmToCm(deductions.beadGlassLessMm)}
          onChangeCm={(cm) =>
            setDeductions((d) => ({ ...d, beadGlassLessMm: cmToMm(cm) }))
          }
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={resetDefaults}
            className="h-10 rounded-xl border border-border bg-background text-sm font-semibold text-foreground"
          >
            افتراضي
          </button>
          <button
            type="submit"
            className="h-10 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            حفظ
          </button>
        </div>
      </form>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-3">
        <h3 className="text-xs font-bold text-foreground">جرّب على مقاس فتحة</h3>
        <p className="text-[10px] leading-relaxed text-muted">
          اكتب مقاس الفتحة بالسنتيمتر وشوف النتيجة.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[11px] text-muted">
            عرض الفتحة (سم)
            <NumericInput
              min={0}
              value={previewW}
              onChange={setPreviewW}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block text-[11px] text-muted">
            ارتفاع الفتحة (سم)
            <NumericInput
              min={0}
              value={previewH}
              onChange={setPreviewH}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>

        <ul className="space-y-1 rounded-xl border border-border bg-background px-3 py-2 text-[11px] text-muted">
          {steps.map((s) => (
            <li key={s.step}>
              <span className="font-semibold text-foreground">{s.label}:</span>{" "}
              {s.formula} →{" "}
              <span className="tabular-nums text-primary">
                {mmToCm(s.resultMm)} سم
              </span>
            </li>
          ))}
        </ul>

        <div className="overflow-hidden rounded-xl border border-border bg-background text-sm">
          <div className="grid grid-cols-3 border-b border-border text-center text-[11px] font-semibold text-muted">
            <span className="px-2 py-2">الجزء</span>
            <span className="px-2 py-2">العرض</span>
            <span className="px-2 py-2">الارتفاع</span>
          </div>
          <ResultRow
            label="الفتحة"
            w={previewCuts.openingWidthMm}
            h={previewCuts.openingHeightMm}
          />
          <ResultRow
            label="الحلق"
            w={previewCuts.frameWidthMm}
            h={previewCuts.frameHeightMm}
            emphasize
          />
          <ResultRow
            label="الضلفة"
            w={previewCuts.sashWidthMm}
            h={previewCuts.sashHeightMm}
            emphasize
          />
          <ResultRow
            label="باكتة / زجاج"
            w={previewCuts.beadGlassWidthMm}
            h={previewCuts.beadGlassHeightMm}
            emphasize
            last
          />
        </div>
      </section>
    </div>
  );
}

function DeductField({
  label,
  hint,
  valueCm,
  onChangeCm,
}: {
  label: string;
  hint: string;
  valueCm: number;
  onChangeCm: (cm: number) => void;
}) {
  return (
    <label className="block rounded-xl border border-border bg-background px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-bold text-foreground">{label}</span>
        <span className="text-[10px] text-muted">{hint}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <NumericInput
          min={0}
          value={valueCm}
          onChange={onChangeCm}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold tabular-nums outline-none focus:border-primary"
        />
        <span className="shrink-0 text-xs font-semibold text-muted">سم</span>
      </div>
    </label>
  );
}

function ResultRow({
  label,
  w,
  h,
  emphasize,
  last,
}: {
  label: string;
  w: number;
  h: number;
  emphasize?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-3 text-center tabular-nums ${
        last ? "" : "border-b border-border"
      }`}
    >
      <span
        className={`px-2 py-2.5 text-start text-xs font-semibold ${
          emphasize ? "text-primary" : ""
        }`}
      >
        {label}
      </span>
      <span
        className={`px-2 py-2.5 ${emphasize ? "font-semibold text-primary" : ""}`}
      >
        {mmToCm(w)}
      </span>
      <span
        className={`px-2 py-2.5 ${emphasize ? "font-semibold text-primary" : ""}`}
      >
        {mmToCm(h)}
      </span>
    </div>
  );
}
