"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PROFILE_BRANDS_UPDATED,
  PROFILE_PRICE_CATEGORIES,
  defaultProfileBrandPrices,
  defaultProfileBrands,
  loadMaterialCatalog,
  newProfileBrandId,
  notifyProfileBrandsUpdated,
  profilePriceCategoryLabel,
  saveMaterialCatalog,
  type MaterialCatalog,
  type ProfileBrand,
  type ProfilePriceCategory,
} from "@/lib/material-systems";

type Props = {
  embedded?: boolean;
};

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
      prices: defaultProfileBrandPrices(),
    });
  }

  function openEdit(brand: ProfileBrand) {
    setDraft({
      ...brand,
      prices: { ...defaultProfileBrandPrices(), ...brand.prices },
    });
  }

  function setDraftPrice(category: ProfilePriceCategory, raw: string) {
    if (!draft) return;
    const n = Number(raw);
    const price = Number.isFinite(n) && n >= 0 ? n : 0;
    setDraft({
      ...draft,
      prices: { ...draft.prices, [category]: price },
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
      prices: { ...draft.prices },
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
      {!embedded ? (
        <div>
          <h3 className="text-xs font-bold text-foreground">براندات القطاعات</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            أضف براند (سيتي · بريمير · …) وحدد سعر المتر لكل نوع: حلق، ضلفة،
            باكتة، سوقاس، …
          </p>
        </div>
      ) : null}

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
            const priced = PROFILE_PRICE_CATEGORIES.filter(
              (c) => (brand.prices[c.id] ?? 0) > 0
            );
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
                            .slice(0, 4)
                            .map(
                              (c) =>
                                `${c.label}: ${brand.prices[c.id]} ج.م/م`
                            )
                            .join(" · ")
                        : "مفيش أسعار"}
                      {priced.length > 4 ? ` · +${priced.length - 4}` : ""}
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
            placeholder="اسم البراند (مثلاً: سيتي)"
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
            <p className="mb-2 text-[11px] font-semibold text-foreground">
              قائمة الأسعار (ج.م/متر طولي)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PROFILE_PRICE_CATEGORIES.map((cat) => (
                <label
                  key={cat.id}
                  className="block text-[10px] text-muted"
                >
                  {profilePriceCategoryLabel(cat.id)}
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={draft.prices[cat.id] ?? ""}
                    onChange={(e) => setDraftPrice(cat.id, e.target.value)}
                    placeholder="0"
                    className="mt-0.5 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                  />
                </label>
              ))}
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
