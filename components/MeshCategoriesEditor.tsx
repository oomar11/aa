"use client";

import { useCallback, useEffect, useState } from "react";
import {
  defaultMeshCategories,
  loadMaterialCatalog,
  saveMaterialCatalog,
  type MaterialCatalog,
  type MeshCategory,
} from "@/lib/material-systems";

const DEFAULT_FOR_OPTIONS: {
  value: MeshCategory["defaultFor"] | "";
  label: string;
}[] = [
  { value: "", label: "بدون اختيار تلقائي" },
  { value: "sliding", label: "تلقائي لضلف الجرار" },
  { value: "tilt", label: "تلقائي للقلاب" },
  { value: "hinged", label: "تلقائي للمفصلي/الباب" },
  { value: "fixed", label: "تلقائي للثابت" },
];

function newCategoryId(): string {
  return `mesh-cat-${Date.now().toString(36)}`;
}

export function MeshCategoriesEditor() {
  const [categories, setCategories] = useState<MeshCategory[]>(
    defaultMeshCategories()
  );
  const [typesCount, setTypesCount] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [draft, setDraft] = useState<MeshCategory | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const cat = loadMaterialCatalog();
      setCategories(cat.meshCategories ?? defaultMeshCategories());
      setTypesCount(cat.meshTypes?.length ?? 0);
    });
  }, []);

  const showFlash = useCallback((msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 1800);
  }, []);

  function persist(nextCategories: MeshCategory[]) {
    const cat = loadMaterialCatalog();
    const cleared = nextCategories.map((c) => ({
      ...c,
      defaultFor: c.defaultFor || undefined,
    }));
    const next: MaterialCatalog = { ...cat, meshCategories: cleared };
    const saved = saveMaterialCatalog(next);
    setCategories(saved.meshCategories ?? defaultMeshCategories());
    setTypesCount(saved.meshTypes?.length ?? 0);
  }

  function openCreate() {
    setDraft({
      id: newCategoryId(),
      label: "",
      calcProfile: false,
    });
  }

  function openEdit(c: MeshCategory) {
    setDraft({ ...c });
  }

  function saveDraft() {
    if (!draft) return;
    const label = draft.label.trim();
    if (!label) {
      showFlash("اكتب اسم التصنيف");
      return;
    }

    const defaultFor = draft.defaultFor || undefined;
    const others = categories.filter((c) => c.id !== draft.id);
    const nextOthers = defaultFor
      ? others.map((c) =>
          c.defaultFor === defaultFor ? { ...c, defaultFor: undefined } : c
        )
      : others;
    const item: MeshCategory = {
      ...draft,
      label,
      defaultFor,
    };
    const exists = categories.some((c) => c.id === item.id);
    const next = exists
      ? nextOthers.map((c) => (c.id === item.id ? item : c))
      : [...nextOthers, item];
    persist(next);
    showFlash(exists ? "تم التعديل" : "تمت الإضافة");
    setDraft(null);
  }

  function remove(id: string) {
    const used = (loadMaterialCatalog().meshTypes ?? []).filter(
      (t) => t.kind === id
    ).length;
    if (used > 0) {
      window.alert(`التصنيف مستخدم في ${used} نوع سلك — انقلهم الأول`);
      return;
    }
    if (!window.confirm("حذف التصنيف؟")) return;
    persist(categories.filter((c) => c.id !== id));
    if (draft?.id === id) setDraft(null);
    showFlash("تم الحذف");
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold text-foreground">تصنيفات السلك</h3>
          <p className="mt-0.5 text-[11px] text-muted">
            التصنيف اللي فيه «قطاع ضلفة» بيتحسب ضلفة سلك جرار + مساحة السلك +
            عجل (٢/ضلفة) + مقبض لطش (١/ضلفة).
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground"
        >
          + تصنيف
        </button>
      </div>

      {flash ? (
        <p className="rounded-lg border border-primary/30 bg-primary-soft px-2 py-1.5 text-center text-[11px] font-semibold text-primary">
          {flash}
        </p>
      ) : null}

      <ul className="space-y-1.5">
        {categories.map((c) => {
          const used = (loadMaterialCatalog().meshTypes ?? []).filter(
            (t) => t.kind === c.id
          ).length;
          return (
            <li
              key={c.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-2.5 py-2"
            >
              <div className="min-w-0 text-start">
                <p className="truncate text-[12px] font-semibold text-foreground">
                  {c.label}
                </p>
                <p className="text-[10px] text-muted">
                  {c.calcProfile
                    ? "ضلفة + سلك + عجل + مقبض"
                    : "مساحة سلك فقط"}
                  {c.defaultFor
                    ? ` · تلقائي: ${
                        DEFAULT_FOR_OPTIONS.find((o) => o.value === c.defaultFor)
                          ?.label ?? c.defaultFor
                      }`
                    : ""}
                  {used > 0 ? ` · ${used} نوع` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold"
                >
                  تعديل
                </button>
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold text-red-600"
                >
                  حذف
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {typesCount > 0 ? (
        <p className="text-center text-[10px] text-muted">
          {typesCount} نوع سلك مربوط بالتصنيفات
        </p>
      ) : null}

      {draft ? (
        <div className="space-y-2 rounded-xl border border-primary/30 bg-background p-2.5">
          <p className="text-[11px] font-bold text-primary">
            {categories.some((c) => c.id === draft.id) ? "تعديل" : "تصنيف جديد"}
          </p>
          <input
            type="text"
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            placeholder="اسم التصنيف (مثلاً: سلك جرار)"
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <label className="flex cursor-pointer items-center gap-2 text-[11px] text-foreground">
            <input
              type="checkbox"
              checked={draft.calcProfile}
              onChange={(e) =>
                setDraft({ ...draft, calcProfile: e.target.checked })
              }
              className="h-4 w-4 accent-[var(--primary)]"
            />
            يتحسب ضلفة سلك جرار + عجل ومقبض (زي الجرار)
          </label>
          <label className="block text-[11px] text-muted">
            الاختيار التلقائي من نوع الفتح
            <select
              value={draft.defaultFor ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  defaultFor:
                    (e.target.value as MeshCategory["defaultFor"] | "") ||
                    undefined,
                })
              }
              className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {DEFAULT_FOR_OPTIONS.map((o) => (
                <option key={o.value || "none"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
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
