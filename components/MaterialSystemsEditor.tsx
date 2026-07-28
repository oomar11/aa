"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  defaultProfileDetails,
  deleteSystem,
  frameHeightFormula,
  frameWidthFormula,
  getCategoryMeta,
  loadMaterialCatalog,
  newSystemId,
  profileRoleLabel,
  sashHeightFormula,
  sashWidthFormula,
  saveMaterialCatalog,
  setDefaultSystem,
  upsertSystem,
  type MaterialCatalog,
  type MaterialCategory,
  type MaterialSystem,
} from "@/lib/material-systems";

type Props = {
  category: MaterialCategory;
};

export function MaterialSystemsEditor({ category }: Props) {
  const meta = getCategoryMeta(category);
  const [catalog, setCatalog] = useState<MaterialCatalog | null>(null);
  const [editing, setEditing] = useState<MaterialSystem | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [asDefault, setAsDefault] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => setCatalog(loadMaterialCatalog()));
  }, []);

  const systems = catalog?.[category] ?? [];
  const isProfiles = category === "profiles";

  const showFlash = useCallback((msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 1800);
  }, []);

  function persist(next: MaterialCatalog) {
    const saved = saveMaterialCatalog(next);
    setCatalog(saved);
  }

  function openCreate() {
    setEditing(null);
    setCreating(true);
    setName("");
    setNotes("");
    setAsDefault(category === "iron" && systems.length === 0);
  }

  function openEdit(system: MaterialSystem) {
    setCreating(false);
    setEditing(system);
    setName(system.name);
    setNotes(system.notes ?? "");
    setAsDefault(Boolean(system.isDefault));
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setName("");
    setNotes("");
    setAsDefault(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!catalog) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    const system: MaterialSystem = {
      id: editing?.id ?? newSystemId(category),
      name: trimmed,
      notes: notes.trim() || undefined,
      isDefault: asDefault || (category === "iron" && systems.length === 0),
      profile:
        category === "profiles"
          ? editing?.profile ?? defaultProfileDetails()
          : undefined,
    };

    persist(upsertSystem(catalog, category, system));
    showFlash(editing ? "تم التعديل" : "تمت الإضافة");
    closeForm();
  }

  function handleDelete(id: string) {
    if (!catalog) return;
    if (!window.confirm("حذف هذا النظام؟")) return;
    persist(deleteSystem(catalog, category, id));
    if (editing?.id === id) closeForm();
    showFlash("تم الحذف");
  }

  function handleSetDefault(id: string) {
    if (!catalog) return;
    persist(setDefaultSystem(catalog, category, id));
    showFlash("صار الافتراضي");
  }

  if (!catalog) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted">
        جاري التحميل…
      </div>
    );
  }

  const formOpen = creating || editing != null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0 text-right">
          <h2 className="text-lg font-bold text-foreground">{meta.label}</h2>
          <p className="mt-0.5 text-xs text-muted">{meta.description}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="shrink-0 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          + نظام جديد
        </button>
      </div>

      {flash ? (
        <p
          className="rounded-xl border border-primary/30 bg-primary-soft px-3 py-2 text-center text-xs font-semibold text-primary"
          role="status"
        >
          {flash}
        </p>
      ) : null}

      {category === "iron" ? (
        <p className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs leading-relaxed text-muted">
          الحديد غالباً ثابت — اختَر نظاماً افتراضياً وهيتحط تلقائي على
          التصميمات الجديدة.
        </p>
      ) : null}

      {isProfiles ? (
        <p className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs leading-relaxed text-muted">
          اضغط «تفاصيل» عشان تدخل العيدان ومعادلات التخصيم بصيغة إكسل (مثل{" "}
          <span className="font-mono text-foreground">=W-10</span> أو{" "}
          <span className="font-mono text-foreground">=FW-2*60</span>).
        </p>
      ) : null}

      {formOpen ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-2xl border border-primary/40 bg-card p-3 shadow-sm"
        >
          <p className="text-xs font-bold text-primary">
            {editing ? "تعديل النظام" : "نظام جديد"}
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`اسم نظام ال${meta.label}`}
            required
            autoFocus
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ملاحظات (اختياري)"
            rows={2}
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={asDefault}
              onChange={(e) => setAsDefault(e.target.checked)}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            جعله الافتراضي
            {category === "iron" ? (
              <span className="text-xs text-muted">(موصى به للحديد)</span>
            ) : null}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={closeForm}
              className="h-11 rounded-xl border border-border bg-background text-sm font-semibold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
            >
              حفظ
            </button>
          </div>
        </form>
      ) : null}

      <ul className="overflow-hidden rounded-2xl border border-border bg-card">
        {systems.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-muted">
            مفيش أنظمة لسه — اضغط «نظام جديد»
          </li>
        ) : (
          systems.map((system, i) => {
            const profile = system.profile;
            const pieceCount = profile?.pieces.length ?? 0;
            return (
              <li
                key={system.id}
                className={`px-3 py-3 ${i > 0 ? "border-t border-border" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="mt-1 h-3 w-3 shrink-0 rounded-full"
                    style={{ background: meta.accent }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {system.name}
                      </p>
                      {system.isDefault ? (
                        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">
                          افتراضي
                        </span>
                      ) : null}
                    </div>
                    {system.notes ? (
                      <p className="mt-0.5 text-xs text-muted">{system.notes}</p>
                    ) : null}

                    {isProfiles && profile ? (
                      <div className="mt-2 space-y-1.5 rounded-xl border border-border/80 bg-background/70 p-2.5 text-[11px] text-muted">
                        <p className="font-semibold text-foreground">
                          {pieceCount} عود
                          {pieceCount > 0 ? ":" : ""}
                        </p>
                        {profile.pieces.slice(0, 4).map((p) => (
                          <p key={p.id}>
                            {p.name || profileRoleLabel(p.role)} — مقطع{" "}
                            {p.sectionWidthMm} مم · طول {p.barLengthM} م
                          </p>
                        ))}
                        {pieceCount > 4 ? (
                          <p>… و {pieceCount - 4} تانيين</p>
                        ) : null}
                        <div className="border-t border-border/70 pt-1.5 leading-relaxed">
                          <p className="font-semibold text-foreground">
                            التخصيمات
                          </p>
                          <p>{frameWidthFormula(profile.deductions)}</p>
                          <p>{frameHeightFormula(profile.deductions)}</p>
                          <p>{sashWidthFormula(profile.deductions)}</p>
                          <p>{sashHeightFormula(profile.deductions)}</p>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                      {isProfiles ? (
                        <Link
                          href={`/materials/profiles/${system.id}`}
                          className="rounded-lg border border-primary/40 bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:brightness-105"
                        >
                          تفاصيل
                        </Link>
                      ) : null}
                      {!system.isDefault ? (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(system.id)}
                          className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-primary-soft hover:text-primary"
                        >
                          جعله افتراضي
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => openEdit(system)}
                        className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-primary-soft"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(system.id)}
                        className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <p className="px-1 text-center text-[11px] text-muted">
        الأنظمة دي بتظهر في تفاصيل البند وقت التصميم
      </p>

      <Link
        href="/materials"
        className="mx-auto text-sm font-medium text-primary"
      >
        ← رجوع للخامات
      </Link>
    </div>
  );
}
