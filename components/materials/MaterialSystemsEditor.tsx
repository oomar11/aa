"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  defaultAccessoryDetails,
  defaultGlassRates,
  defaultIronDetails,
  defaultProfileDetails,
  deleteSystem,
  findProfileBrand,
  getCategoryMeta,
  getGlassBottlePrice,
  glassPaneKindLabel,
  ironDeductionSummary,
  loadMaterialCatalog,
  newSystemId,
  profileBrandOptions,
  saveMaterialCatalog,
  setDefaultSystem,
  upsertSystem,
  espagnoletteCatalogSummary,
  type GlassRates,
  type MaterialCatalog,
  type MaterialCategory,
  type MaterialSystem,
} from "@/lib/material-systems";
import { ROUTES } from "@/lib/routes";

type Props = {
  category: MaterialCategory;
};

function systemDetailHref(category: MaterialCategory, id: string): string {
  if (category === "profiles") return ROUTES.materials.profileSystem(id);
  if (category === "accessories") return ROUTES.materials.accessorySystem(id);
  if (category === "glass") return ROUTES.materials.glassSystem(id);
  return ROUTES.materials.ironSystem(id);
}

function systemSummary(
  category: MaterialCategory,
  system: MaterialSystem,
  catalog: MaterialCatalog
): string {
  if (category === "profiles") {
    const brand = system.profileBrandId
      ? findProfileBrand(system.profileBrandId, catalog)?.name
      : null;
    const pieces = system.profile?.pieces.length ?? 0;
    const parts = [
      brand ? `براند ${brand}` : "بدون براند",
      pieces > 0 ? `${pieces} عود` : "مفيش عيدان لسه",
    ];
    return parts.join(" · ");
  }
  if (category === "accessories" && system.accessory) {
    const a = system.accessory;
    return `مفصلات ${a.hingesPerSash}/${a.hingesPerDoor} · سبلونة ${espagnoletteCatalogSummary(a.espagnoletteCatalog)} · تراك ${a.tracksPerFrame}`;
  }
  if (category === "glass" && system.glass) {
    const price = getGlassBottlePrice(system);
    const kind = glassPaneKindLabel(system.glass.pane1.kind);
    const thick = `${system.glass.pane1.thicknessMm} مم`;
    return price > 0
      ? `${kind} · ${thick} · ${price} ج.م/م²`
      : `${kind} · ${thick} · السعر مش متحدد`;
  }
  if (category === "iron" && system.iron) {
    const n = system.iron.pieces.filter((p) => p.enabled).length;
    return `${n} نوع مفعّل · ${ironDeductionSummary(system.iron.deductions)}`;
  }
  return "اضغط تفاصيل للضبط";
}

export function MaterialSystemsEditor({ category }: Props) {
  const meta = getCategoryMeta(category);
  const [catalog, setCatalog] = useState<MaterialCatalog | null>(null);
  const [editing, setEditing] = useState<MaterialSystem | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [asDefault, setAsDefault] = useState(false);
  const [profileBrandId, setProfileBrandId] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [glassRates, setGlassRates] = useState<GlassRates>(defaultGlassRates());

  useEffect(() => {
    queueMicrotask(() => {
      const cat = loadMaterialCatalog();
      setCatalog(cat);
      setGlassRates(cat.glassRates ?? defaultGlassRates());
    });
  }, []);

  const systems = catalog?.[category] ?? [];
  const isProfiles = category === "profiles";
  const isGlass = category === "glass";
  const isIron = category === "iron";
  const itemLabel = isGlass ? "زجاجة" : "نظام";

  const showFlash = useCallback((msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 1800);
  }, []);

  function persist(next: MaterialCatalog) {
    const saved = saveMaterialCatalog(next);
    setCatalog(saved);
    setGlassRates(saved.glassRates ?? defaultGlassRates());
  }

  function saveGlassRates(patch: Partial<GlassRates>) {
    if (!catalog) return;
    const nextRates = { ...glassRates, ...patch };
    setGlassRates(nextRates);
    persist({ ...catalog, glassRates: nextRates });
    showFlash("تم حفظ أسعار التدبيل والجورجيا");
  }

  function openCreate() {
    setEditing(null);
    setCreating(true);
    setName("");
    setNotes("");
    setProfileBrandId("");
    setAsDefault(category === "iron" && systems.length === 0);
  }

  function openEdit(system: MaterialSystem) {
    setCreating(false);
    setEditing(system);
    setName(system.name);
    setNotes(system.notes ?? "");
    setProfileBrandId(system.profileBrandId ?? "");
    setAsDefault(Boolean(system.isDefault));
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setName("");
    setNotes("");
    setProfileBrandId("");
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
      profileBrandId:
        category === "profiles" && profileBrandId.trim()
          ? profileBrandId.trim()
          : undefined,
      profile:
        category === "profiles"
          ? editing?.profile ?? defaultProfileDetails()
          : undefined,
      glass:
        category === "glass"
          ? {
              glazing: "single",
              pane1: {
                label: trimmed,
                thicknessMm: 4,
                kind: "clear",
              },
              georgian: false,
            }
          : undefined,
      accessory:
        category === "accessories"
          ? editing?.accessory ?? defaultAccessoryDetails()
          : undefined,
      iron:
        category === "iron"
          ? editing?.iron ?? defaultIronDetails()
          : undefined,
    };

    persist(upsertSystem(catalog, category, system));
    showFlash(editing ? "تم التعديل" : "تمت الإضافة");
    closeForm();
  }

  function handleDelete(id: string) {
    if (!catalog) return;
    if (!window.confirm(`حذف هذا ال${itemLabel}؟`)) return;
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
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="text-sm font-bold text-foreground">
          {isGlass ? "قائمة الزجاجات" : "قائمة الأنظمة"}
        </h2>
        <button
          type="button"
          onClick={openCreate}
          className="shrink-0 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          + {isGlass ? "زجاجة جديدة" : "نظام جديد"}
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

      {isIron ? (
        <p className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs leading-relaxed text-muted">
          من «تفاصيل» حدّد أنواع الحديد للحلق والضلفة والسوقاس — مفصلي وجرار.
        </p>
      ) : null}

      {isGlass ? (
        <section className="space-y-2 rounded-2xl border border-border bg-card p-3">
          <h3 className="text-xs font-bold text-foreground">
            أسعار عامة — تدبيل وجورجيا
          </h3>
          <p className="text-[11px] text-muted">
            بتتضاف لما الضلفة تبقى دبل أو فيها جورجيا
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] text-muted">
              تدبيل (ج.م/م²)
              <input
                type="number"
                min={0}
                step={0.01}
                value={glassRates.doublingCostPerSqm}
                onChange={(e) =>
                  saveGlassRates({
                    doublingCostPerSqm: Math.max(
                      0,
                      Number(e.target.value) || 0
                    ),
                  })
                }
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block text-[11px] text-muted">
              جورجيا (ج.م/م²)
              <input
                type="number"
                min={0}
                step={0.01}
                value={glassRates.georgianCostPerSqm}
                onChange={(e) =>
                  saveGlassRates({
                    georgianCostPerSqm: Math.max(
                      0,
                      Number(e.target.value) || 0
                    ),
                  })
                }
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
          </div>
        </section>
      ) : null}

      {formOpen ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-2xl border border-primary/40 bg-card p-3 shadow-sm"
        >
          <p className="text-xs font-bold text-primary">
            {editing
              ? isGlass
                ? "تعديل الزجاجة"
                : "تعديل النظام"
              : isGlass
                ? "زجاجة جديدة"
                : "نظام جديد"}
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isGlass ? "اسم الزجاجة" : `اسم نظام ال${meta.label}`}
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
          {isProfiles ? (
            <label className="block text-[11px] text-muted">
              براند القطاعات (قائمة الأسعار)
              <select
                value={profileBrandId}
                onChange={(e) => setProfileBrandId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="">بدون براند</option>
                {profileBrandOptions(catalog).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={asDefault}
              onChange={(e) => setAsDefault(e.target.checked)}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            جعله الافتراضي
            {isIron ? (
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
            مفيش {isGlass ? "زجاجات" : "أنظمة"} لسه — اضغط «+{" "}
            {isGlass ? "زجاجة جديدة" : "نظام جديد"}»
          </li>
        ) : (
          systems.map((system, i) => (
            <li
              key={system.id}
              className={`px-3 py-3 ${i > 0 ? "border-t border-border" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
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
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">
                    {systemSummary(category, system, catalog)}
                  </p>

                  <div className="mt-2.5 flex flex-wrap justify-end gap-1.5">
                    <Link
                      href={systemDetailHref(category, system.id)}
                      className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      تفاصيل
                    </Link>
                    {!system.isDefault ? (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(system.id)}
                        className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted transition-colors hover:bg-primary-soft hover:text-primary"
                      >
                        افتراضي
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => openEdit(system)}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-primary-soft"
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(system.id)}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>

      <p className="px-1 text-center text-[11px] text-muted">
        {isGlass
          ? "الزجاجات دي بتظهر في خصائص الضلفة وقت التصميم"
          : "الأنظمة دي بتظهر في تفاصيل البند وقت التصميم"}
      </p>
    </div>
  );
}
