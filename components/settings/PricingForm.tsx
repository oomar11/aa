"use client";

import { FormEvent, useEffect, useState } from "react";
import { NumericInput } from "@/components/ui/NumericInput";
import {
  DEFAULT_PRICING,
  loadPricingSettings,
  PRICING_MODE_OPTIONS,
  savePricingSettings,
  type PricingMode,
  type PricingSettings,
} from "@/lib/pricing";
import {
  defaultProfileDetails,
  getSystemsForCategory,
  loadMaterialCatalog,
  MATERIAL_CATALOG_UPDATED,
  saveMaterialCatalog,
  upsertSystem,
  type MaterialSystem,
} from "@/lib/material-systems";

export function PricingForm() {
  const [mode, setMode] = useState<PricingMode>(DEFAULT_PRICING.mode);
  const [marginPercent, setMarginPercent] = useState(
    DEFAULT_PRICING.marginPercent
  );
  const [laborPerSqm, setLaborPerSqm] = useState(DEFAULT_PRICING.laborPerSqm);
  const [doubleExtraPerSqm, setDoubleExtraPerSqm] = useState(
    DEFAULT_PRICING.doubleExtraPerSqm
  );
  const [profileSystems, setProfileSystems] = useState<MaterialSystem[]>([]);
  const [salePrices, setSalePrices] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);

  function refreshProfiles() {
    const catalog = loadMaterialCatalog();
    const systems = getSystemsForCategory("profiles", catalog);
    setProfileSystems(systems);
    const prices: Record<string, number> = {};
    for (const s of systems) {
      const v = s.profile?.salePricePerSqm;
      prices[s.id] =
        v != null && Number.isFinite(v) && v > 0 ? v : 0;
    }
    setSalePrices(prices);
  }

  useEffect(() => {
    const current = loadPricingSettings();
    setMode(current.mode);
    setMarginPercent(current.marginPercent);
    setLaborPerSqm(current.laborPerSqm);
    setDoubleExtraPerSqm(current.doubleExtraPerSqm);
    refreshProfiles();
    function onCatalog() {
      refreshProfiles();
    }
    window.addEventListener(MATERIAL_CATALOG_UPDATED, onCatalog);
    return () => window.removeEventListener(MATERIAL_CATALOG_UPDATED, onCatalog);
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: PricingSettings = {
      mode,
      enabled: mode === "hybrid",
      marginPercent,
      laborPerSqm,
      doubleExtraPerSqm,
    };
    savePricingSettings(next);

    if (mode === "per_sqm") {
      let catalog = loadMaterialCatalog();
      for (const system of profileSystems) {
        const raw = salePrices[system.id] ?? 0;
        const salePricePerSqm =
          Number.isFinite(raw) && raw > 0 ? raw : undefined;
        const prevSale = system.profile?.salePricePerSqm;
        const prevNorm =
          prevSale != null && Number.isFinite(prevSale) && prevSale > 0
            ? prevSale
            : undefined;
        if (salePricePerSqm === prevNorm) continue;
        catalog = upsertSystem(catalog, "profiles", {
          ...system,
          profile: {
            ...(system.profile ?? defaultProfileDetails()),
            salePricePerSqm,
          },
        });
      }
      saveMaterialCatalog(catalog);
      refreshProfiles();
    }

    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  const modeMeta =
    PRICING_MODE_OPTIONS.find((o) => o.id === mode) ?? PRICING_MODE_OPTIONS[0]!;

  const fieldClass =
    "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <p className="rounded-2xl border border-primary/20 bg-primary-soft/40 px-3.5 py-3 text-xs leading-relaxed text-foreground">
        {modeMeta.description}
        {" "}
        السعر الخاص على أي بند يلغي التسعير التلقائي في كل الأوضاع.
      </p>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">نظام التسعير</legend>
        {PRICING_MODE_OPTIONS.map((opt) => (
          <label
            key={opt.id}
            className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-colors ${
              mode === opt.id
                ? "border-primary bg-primary-soft/50"
                : "border-border bg-card"
            }`}
          >
            <input
              type="radio"
              name="pricing-mode"
              checked={mode === opt.id}
              onChange={() => {
                setMode(opt.id);
                setSaved(false);
              }}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span className="flex flex-col gap-0.5 text-right">
              <span className="text-sm font-medium">{opt.label}</span>
              <span className="text-[11px] leading-relaxed text-muted">
                {opt.description}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {mode === "hybrid" ? (
        <>
          <label className="flex flex-col gap-1.5 text-right">
            <span className="text-sm font-medium">
              هامش الربح على الخامات (%)
            </span>
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
        </>
      ) : null}

      {mode === "per_sqm" ? (
        <>
          <label className="flex flex-col gap-1.5 text-right">
            <span className="text-sm font-medium">
              زيادة الدبل (ج.م / م²)
            </span>
            <NumericInput
              value={doubleExtraPerSqm}
              onChange={(v) => {
                setDoubleExtraPerSqm(v);
                setSaved(false);
              }}
              min={0}
              blankZero={false}
              className={`${fieldClass} text-left`}
              dir="ltr"
            />
            <span className="text-[11px] text-muted">
              سعر القطاع شامل زجاج مفرد — الزيادة دي بس للدبل، ثابتة للمتر
            </span>
          </label>

          <div className="rounded-2xl border border-border bg-card p-3.5">
            <p className="text-sm font-medium">سعر المتر لكل نظام قطاع</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              شامل زجاج مفرد. أقل من متر يُحسب متر. يمكن التعديل أيضاً من صفحة
              تفاصيل القطاع.
            </p>
            <div className="mt-3 space-y-2">
              {profileSystems.length === 0 ? (
                <p className="text-xs text-muted">لا توجد أنظمة قطاعات</p>
              ) : (
                profileSystems.map((system) => (
                  <label
                    key={system.id}
                    className="flex flex-col gap-1 rounded-xl border border-border/70 bg-background/60 px-3 py-2"
                  >
                    <span className="text-[12px] font-semibold text-foreground">
                      {system.name}
                    </span>
                    <NumericInput
                      value={salePrices[system.id] ?? 0}
                      onChange={(v) => {
                        setSalePrices((prev) => ({
                          ...prev,
                          [system.id]: v,
                        }));
                        setSaved(false);
                      }}
                      min={0}
                      blankZero
                      className={`${fieldClass} text-left`}
                      dir="ltr"
                      placeholder="ج.م / م²"
                    />
                  </label>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}

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
