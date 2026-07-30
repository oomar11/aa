"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PROFILE_BRANDS_UPDATED,
  PROFILE_PRICE_CATEGORIES,
  defaultProfileBrandRates,
  defaultProfileBrands,
  loadMaterialCatalog,
  makeProfileBarRate,
  newProfileBrandId,
  notifyProfileBrandsUpdated,
  profileBarPricePerM,
  profilePriceCategoryLabel,
  saveMaterialCatalog,
  type MaterialCatalog,
  type ProfileBarRate,
  type ProfileBrand,
  type ProfilePriceCategory,
} from "@/lib/material-systems";

type Props = {
  embedded?: boolean;
};

function rateSummary(rate: ProfileBarRate | undefined): string | null {
  if (!rate || rate.barPrice <= 0 || rate.barLengthM <= 0) return null;
  const perM = profileBarPricePerM(rate.barPrice, rate.barLengthM);
  return `${rate.barPrice} ج.م/عود · ${rate.barLengthM} م ← ${perM} ج.م/م`;
}

export function ProfileBrandsEditor({ embedded = false }: Props) {
  const [brands, setBrands] = useState<ProfileBrand[]>(defaultProfileBrands());
  const [flash, setFlash] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProfileBrand | null>(null);

  const reload = useCallback(() => {
    const cat = loadMaterialCatalog();
    setBrands(cat.profileBrands ?? defaultProfileBrands());
  }, []);

  useEffect(() => {
    queueMicrotask(reload);
  }, [reload]);

  useEffect(() => {
    window.addEventListener(PROFILE_BRANDS_UPDATED, reload);
    return () => window.removeEventListener(PROFILE_BRANDS_UPDATED, reload);
  }, [reload]);

  const showFlash = useCallback((msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 1800);
  }, []);

  function persist(nextBrands: ProfileBrand[]) {
    const cat = loadMaterialCatalog();
    const next: MaterialCatalog = { ...cat, profileBrands: nextBrands };
    const saved = saveMaterialCatalog(next);
    setBrands(saved.profileBrands ?? []);
    notifyProfileBrandsUpdated();
  }

  function openCreate() {
    setDraft({
      id: newProfileBrandId(),
      name: "",
      rates: defaultProfileBrandRates(),
    });
  }

  function openEdit(brand: ProfileBrand) {
    setDraft({
      ...brand,
      rates: { ...defaultProfileBrandRates(), ...brand.rates },
    });
  }

  function setDraftRate(
    category: ProfilePriceCategory,
    field: "barPrice" | "barLengthM",
    raw: string
  ) {
    if (!draft) return;
    const n = Number(raw);
    const prev = draft.rates[category] ?? makeProfileBarRate(0, 6);
    const nextVal = Number.isFinite(n) && n >= 0 ? n : 0;
    const next: ProfileBarRate = {
      ...prev,
      [field]: field === "barLengthM" ? (nextVal > 0 ? nextVal : 6) : nextVal,
    };
    setDraft({
      ...draft,
      rates: { ...draft.rates, [category]: next },
    });
  }

  function saveDraft() {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      showFlash("اكتب اسم البراند");
      return;
    }
    const item: ProfileBrand = {
      ...draft,
      name,
      notes: draft.notes?.trim() || undefined,
      rates: { ...draft.rates },
    };
    const exists = brands.some((b) => b.id === item.id);
    const next = exists
      ? brands.map((b) => (b.id === item.id ? item : b))
      : [...brands, item];
    persist(next);
    showFlash(exists ? "تم التعديل" : "تمت الإضافة");
    setDraft(null);
  }

  function remove(id: string) {
    if (!window.confirm("حذف هذا البراند؟")) return;
    persist(brands.filter((b) => b.id !== id));
    if (draft?.id === id) setDraft(null);
    showFlash("تم الحذف");
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-3">
      {embedded ? (
        <div>
          <h3 className="text-xs font-bold text-foreground">قائمة أسعار البراندات</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            اكتب سعر العود وطوله — السعر للمتر = سعر العود ÷ الطول. بعد الحفظ،
            اربط البراند من تبويب «أنظمة القطع».
          </p>
        </div>
      ) : (
        <div>
          <h3 className="text-xs font-bold text-foreground">براندات القطاعات</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            التسعير بالعود: اكتب سعر العود وطول العود بالمتر — السعر للمتر
            بيتحسب تلقائي (سعر العود ÷ الطول). سيتي بريمير من قائمة فبراير 2025.
          </p>
        </div>
      )}

      {flash ? (
        <p
          className="rounded-lg border border-primary/30 bg-primary-soft px-2 py-1.5 text-center text-[11px] font-semibold text-primary"
          role="status"
        >
          {flash}
        </p>
      ) : null}

      <button
        type="button"
        onClick={openCreate}
        className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
      >
        + براند جديد
      </button>

      {brands.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted">مفيش براندات لسه</p>
      ) : (
        <ul className="space-y-2">
          {brands.map((brand) => {
            const priced = PROFILE_PRICE_CATEGORIES.filter((c) => {
              const r = brand.rates[c.id];
              return r && r.barPrice > 0 && r.barLengthM > 0;
            });
            return (
              <li
                key={brand.id}
                className="rounded-xl border border-border/80 bg-background/50 p-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {brand.name}
                    </p>
                    {brand.notes ? (
                      <p className="mt-0.5 text-[10px] text-muted">{brand.notes}</p>
                    ) : null}
                    <p className="mt-1 text-[10px] text-muted">
                      {priced.length > 0
                        ? priced
                            .slice(0, 3)
                            .map((c) => {
                              const r = brand.rates[c.id]!;
                              return `${c.label}: ${r.barPrice}/${r.barLengthM}م`;
                            })
                            .join(" · ")
                        : "مفيش أسعار"}
                      {priced.length > 3 ? ` · +${priced.length - 3}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(brand)}
                      className="rounded-md border border-border px-2 py-0.5 text-[10px] text-foreground"
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(brand.id)}
                      className="rounded-md border border-border px-2 py-0.5 text-[10px] text-red-600"
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

      {draft ? (
        <div className="space-y-3 rounded-xl border border-primary/40 bg-card p-3">
          <p className="text-xs font-bold text-primary">
            {brands.some((b) => b.id === draft.id) ? "تعديل براند" : "براند جديد"}
          </p>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="اسم البراند (مثلاً: سيتي بريمير)"
            autoFocus
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            type="text"
            value={draft.notes ?? ""}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="ملاحظات (اختياري)"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />

          <div>
            <p className="mb-1 text-[11px] font-semibold text-foreground">
              قائمة الأسعار بالعود
            </p>
            <p className="mb-2 text-[10px] leading-relaxed text-muted">
              لكل صنف: سعر العود (ج.م) + طول العود (م) — المتر = السعر ÷ الطول
            </p>
            <div className="space-y-2">
              {PROFILE_PRICE_CATEGORIES.map((cat) => {
                const rate = draft.rates[cat.id] ?? makeProfileBarRate(0, 6);
                const summary = rateSummary(
                  rate.barPrice > 0 ? rate : undefined
                );
                return (
                  <div
                    key={cat.id}
                    className="rounded-xl border border-border/70 bg-background/60 p-2"
                  >
                    <p className="text-[11px] font-semibold text-foreground">
                      {profilePriceCategoryLabel(cat.id)}
                    </p>
                    {rate.productName ? (
                      <p className="mt-0.5 text-[10px] text-muted">
                        {rate.productName}
                      </p>
                    ) : null}
                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                      <label className="block text-[10px] text-muted">
                        سعر العود (ج.م)
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={rate.barPrice || ""}
                          onChange={(e) =>
                            setDraftRate(cat.id, "barPrice", e.target.value)
                          }
                          placeholder="0"
                          className="mt-0.5 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                        />
                      </label>
                      <label className="block text-[10px] text-muted">
                        طول العود (م)
                        <input
                          type="number"
                          min={0.1}
                          step={0.1}
                          value={rate.barLengthM || ""}
                          onChange={(e) =>
                            setDraftRate(cat.id, "barLengthM", e.target.value)
                          }
                          placeholder="6"
                          className="mt-0.5 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                        />
                      </label>
                    </div>
                    {summary ? (
                      <p className="mt-1 text-[10px] font-medium text-primary">
                        {summary}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="h-10 rounded-xl border border-border text-sm font-semibold"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={saveDraft}
              className="h-10 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
            >
              حفظ
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
