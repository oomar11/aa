"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ACCESSORY_BRAND_CATEGORIES,
  ACCESSORY_BRANDS_UPDATED,
  accessoryBrandCategoryLabel,
  defaultAccessoryBrands,
  loadMaterialCatalog,
  newAccessoryBrandId,
  notifyAccessoryBrandsUpdated,
  saveMaterialCatalog,
  type AccessoryBrand,
  type AccessoryBrandCategory,
  type MaterialCatalog,
} from "@/lib/material-systems";

const GROUP_LABELS: Record<"hinged" | "bouclier" | "sliding", string> = {
  hinged: "مفصلي",
  bouclier: "بوكلير",
  sliding: "جرار",
};

type Props = {
  /** إخفاء العنوان عند استخدام المحرر داخل صفحة مخصصة */
  embedded?: boolean;
};

export function AccessoryBrandsEditor({ embedded = false }: Props) {
  const [brands, setBrands] = useState<AccessoryBrand[]>(defaultAccessoryBrands());
  const [flash, setFlash] = useState<string | null>(null);
  const [draft, setDraft] = useState<AccessoryBrand | null>(null);

  const reload = useCallback(() => {
    const cat = loadMaterialCatalog();
    setBrands(cat.accessoryBrands ?? defaultAccessoryBrands());
  }, []);

  useEffect(() => {
    queueMicrotask(reload);
  }, [reload]);

  useEffect(() => {
    window.addEventListener(ACCESSORY_BRANDS_UPDATED, reload);
    return () => window.removeEventListener(ACCESSORY_BRANDS_UPDATED, reload);
  }, [reload]);

  const showFlash = useCallback((msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 1800);
  }, []);

  function persist(nextBrands: AccessoryBrand[]) {
    const cat = loadMaterialCatalog();
    const next: MaterialCatalog = { ...cat, accessoryBrands: nextBrands };
    const saved = saveMaterialCatalog(next);
    setBrands(saved.accessoryBrands ?? []);
    notifyAccessoryBrandsUpdated();
  }

  function openCreate(category: AccessoryBrandCategory) {
    setDraft({
      id: newAccessoryBrandId(),
      name: "",
      category,
    });
  }

  function openEdit(brand: AccessoryBrand) {
    setDraft({ ...brand });
  }

  function saveDraft() {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      showFlash("اكتب اسم البراند");
      return;
    }
    const item: AccessoryBrand = {
      ...draft,
      name,
      unitPrice:
        draft.unitPrice != null && draft.unitPrice >= 0
          ? draft.unitPrice
          : undefined,
      sizePrices: draft.sizePrices,
      notes: draft.notes?.trim() || undefined,
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

  const groups: ("hinged" | "bouclier" | "sliding")[] = [
    "hinged",
    "bouclier",
    "sliding",
  ];

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-3">
      {!embedded ? (
        <div>
          <h3 className="text-xs font-bold text-foreground">براندات الاكسسوار</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            أضف البراندات لكل فئة مع سعر الوحدة — وبعدين اختارها داخل تفاصيل نظام
            الاكسسوار عشان تظهر العدد والتكلفة في الشباك.
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

      {groups.map((group) => {
        const cats = ACCESSORY_BRAND_CATEGORIES.filter((c) => c.group === group);
        return (
          <div
            key={group}
            className="space-y-2 rounded-xl border border-border/80 bg-background/50 p-2.5"
          >
            <p className="text-[11px] font-bold text-foreground">
              {GROUP_LABELS[group]}
            </p>
            {cats.map((cat) => {
              const list = brands.filter((b) => b.category === cat.id);
              return (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-muted">
                      {cat.label}
                    </p>
                    <button
                      type="button"
                      onClick={() => openCreate(cat.id)}
                      className="rounded-md border border-primary/40 bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary"
                    >
                      + براند
                    </button>
                  </div>
                  {list.length === 0 ? (
                    <p className="text-[10px] text-muted/80">مفيش براندات</p>
                  ) : (
                    <ul className="space-y-1">
                      {list.map((brand) => (
                        <li
                          key={brand.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-card px-2 py-1.5"
                        >
                          <div className="min-w-0 text-right">
                            <p className="truncate text-xs font-semibold text-foreground">
                              {brand.name}
                            </p>
                            <p className="truncate text-[10px] text-muted">
                              {brand.sizePrices &&
                              Object.keys(brand.sizePrices).length > 0
                                ? `أسعار حسب المقاس (${Object.keys(brand.sizePrices).length} مقاس)`
                                : brand.unitPrice != null && brand.unitPrice > 0
                                  ? `${brand.unitPrice} ج.م/وحدة`
                                  : "السعر مش متحدد"}
                              {brand.notes ? ` · ${brand.notes}` : ""}
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
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {draft ? (
        <div className="space-y-2 rounded-xl border border-primary/40 bg-card p-3">
          <p className="text-xs font-bold text-primary">
            {brands.some((b) => b.id === draft.id) ? "تعديل براند" : "براند جديد"}
          </p>
          <p className="text-[11px] text-muted">
            الفئة: {accessoryBrandCategoryLabel(draft.category)}
          </p>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="اسم البراند"
            autoFocus
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          {draft.sizePrices && Object.keys(draft.sizePrices).length > 0 ? (
            <p className="rounded-lg border border-border/70 bg-background px-2 py-1.5 text-[10px] text-muted">
              أسعار السبلونة حسب المقاس مفعّلة (
              {Object.entries(draft.sizePrices)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([size, price]) => `${size}سم: ${price}`)
                .join(" · ")}
              )
            </p>
          ) : null}
          <label className="block text-[11px] text-muted">
            سعر الوحدة (ج.م) — قطعة أو متر حسب الفئة
            <input
              type="number"
              min={0}
              step={1}
              value={draft.unitPrice ?? ""}
              onChange={(e) => {
                const n = Number(e.target.value);
                setDraft({
                  ...draft,
                  unitPrice:
                    e.target.value === ""
                      ? undefined
                      : Number.isFinite(n) && n >= 0
                        ? n
                        : draft.unitPrice,
                });
              }}
              placeholder="مثلاً: 25"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <input
            type="text"
            value={draft.notes ?? ""}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="ملاحظات (اختياري)"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
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
