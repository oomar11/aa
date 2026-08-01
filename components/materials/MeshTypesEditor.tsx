"use client";

import { useCallback, useEffect, useState } from "react";
import { NumericInput } from "@/components/ui/NumericInput";
import {
  defaultMeshCategories,
  defaultMeshTypes,
  loadMaterialCatalog,
  MESH_CATALOG_UPDATED,
  saveMaterialCatalog,
  type MaterialCatalog,
  type MeshType,
} from "@/lib/material-systems";

function newMeshId(): string {
  return `mesh-${Date.now().toString(36)}`;
}

export function MeshTypesEditor() {
  const [types, setTypes] = useState<MeshType[]>(defaultMeshTypes());
  const [categoryOpts, setCategoryOpts] = useState(
    defaultMeshCategories().map((c) => ({ id: c.id, label: c.label }))
  );
  const [flash, setFlash] = useState<string | null>(null);
  const [draft, setDraft] = useState<MeshType | null>(null);

  const reload = useCallback(() => {
    const cat = loadMaterialCatalog();
    setTypes(cat.meshTypes ?? defaultMeshTypes());
    setCategoryOpts(
      (cat.meshCategories ?? defaultMeshCategories()).map((c) => ({
        id: c.id,
        label: c.label,
      }))
    );
  }, []);

  useEffect(() => {
    queueMicrotask(reload);
  }, [reload]);

  useEffect(() => {
    window.addEventListener(MESH_CATALOG_UPDATED, reload);
    return () => window.removeEventListener(MESH_CATALOG_UPDATED, reload);
  }, [reload]);

  const showFlash = useCallback((msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 1800);
  }, []);

  function persist(nextTypes: MeshType[]) {
    const cat = loadMaterialCatalog();
    const next: MaterialCatalog = { ...cat, meshTypes: nextTypes };
    const saved = saveMaterialCatalog(next);
    setTypes(saved.meshTypes ?? []);
    setCategoryOpts(
      (saved.meshCategories ?? defaultMeshCategories()).map((c) => ({
        id: c.id,
        label: c.label,
      }))
    );
  }

  function openCreate(kind: string) {
    setDraft({
      id: newMeshId(),
      name: "",
      kind,
      pricePerSqm: 0,
    });
  }

  function openEdit(t: MeshType) {
    setDraft({ ...t });
  }

  function saveDraft() {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      showFlash("اكتب اسم السلك");
      return;
    }
    const price = Math.max(0, Number(draft.pricePerSqm) || 0);
    const item: MeshType = {
      ...draft,
      name,
      pricePerSqm: price,
      kind: categoryOpts.some((c) => c.id === draft.kind)
        ? draft.kind
        : categoryOpts[0]?.id ?? "fixed",
    };
    const exists = types.some((t) => t.id === item.id);
    const next = exists
      ? types.map((t) => (t.id === item.id ? item : t))
      : [...types, item];
    persist(next);
    showFlash(exists ? "تم التعديل" : "تمت الإضافة");
    setDraft(null);
  }

  function remove(id: string) {
    if (!window.confirm("حذف نوع السلك؟")) return;
    persist(types.filter((t) => t.id !== id));
    if (draft?.id === id) setDraft(null);
    showFlash("تم الحذف");
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-3">
      <div>
        <h3 className="text-xs font-bold text-foreground">أنواع السلك</h3>
        <p className="mt-0.5 text-[11px] text-muted">
          كل تصنيف له أنواعه — السعر بالمتر المربع.
        </p>
      </div>

      {categoryOpts.length === 0 ? (
        <p className="rounded-lg border border-border bg-background px-2 py-2 text-center text-[11px] text-muted">
          أضف تصنيف سلك الأول
        </p>
      ) : null}

      {flash ? (
        <p className="rounded-lg border border-primary/30 bg-primary-soft px-2 py-1.5 text-center text-[11px] font-semibold text-primary">
          {flash}
        </p>
      ) : null}

      <div className="space-y-3">
        {categoryOpts.map((cat) => {
          const catTypes = types.filter((t) => t.kind === cat.id);
          return (
            <div
              key={cat.id}
              className="rounded-xl border border-border bg-background p-2.5"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-foreground">
                    {cat.label}
                  </p>
                  <p className="text-[10px] text-muted">
                    {catTypes.length} نوع
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openCreate(cat.id)}
                  className="shrink-0 rounded-lg border border-primary/40 bg-primary-soft px-2.5 py-1 text-[10px] font-semibold text-primary"
                >
                  + نوع
                </button>
              </div>

              {catTypes.length === 0 ? (
                <p className="text-center text-[10px] text-muted">
                  لا توجد أنواع — اضغط «+ نوع»
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {catTypes.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-2 py-1.5"
                    >
                      <div className="min-w-0 text-start">
                        <p className="truncate text-[12px] font-semibold text-foreground">
                          {t.name}
                        </p>
                        <p className="text-[10px] text-muted">
                          {t.pricePerSqm} ج.م/م²
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(t)}
                          className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold"
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(t.id)}
                          className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold text-red-600"
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

      {draft ? (
        <div className="space-y-2 rounded-xl border border-primary/30 bg-background p-2.5">
          <p className="text-[11px] font-bold text-primary">
            {types.some((t) => t.id === draft.id) ? "تعديل" : "نوع جديد"}
            {" · "}
            {categoryOpts.find((c) => c.id === draft.kind)?.label ?? draft.kind}
          </p>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="اسم السلك"
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <label className="block text-[11px] text-muted">
            السعر (ج.م/م²)
            <NumericInput
              min={0}
              step={0.01}
              value={draft.pricePerSqm}
              onChange={(pricePerSqm) =>
                setDraft({ ...draft, pricePerSqm })
              }
              className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
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
