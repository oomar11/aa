"use client";

import { ScreenBack } from "@/components/ScreenBack";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  GLASS_PANE_KINDS,
  defaultGlassDetails,
  defaultGlassPane,
  findSystem,
  glassCompositionLabel,
  glassPaneKindLabel,
  glassTotalThicknessMm,
  loadMaterialCatalog,
  saveMaterialCatalog,
  upsertSystem,
  type GlassGlazing,
  type GlassPaneKind,
  type GlassPaneSpec,
  type GlassSystemDetails,
  type MaterialCatalog,
  type MaterialSystem,
} from "@/lib/material-systems";

type Props = {
  systemId: string;
};

export function GlassSystemDetailEditor({ systemId }: Props) {
  const [catalog, setCatalog] = useState<MaterialCatalog | null>(null);
  const [system, setSystem] = useState<MaterialSystem | null>(null);
  const [systemName, setSystemName] = useState("");
  const [systemNotes, setSystemNotes] = useState("");
  const [glass, setGlass] = useState<GlassSystemDetails>(() =>
    defaultGlassDetails("double")
  );
  const [flash, setFlash] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  const showFlash = useCallback((msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 1800);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      const cat = loadMaterialCatalog();
      setCatalog(cat);
      const found = findSystem("glass", systemId, cat);
      if (!found) {
        setMissing(true);
        return;
      }
      setSystem(found);
      setSystemName(found.name);
      setSystemNotes(found.notes ?? "");
      setGlass(found.glass ?? defaultGlassDetails("double"));
    });
  }, [systemId]);

  function persist(nextGlass: GlassSystemDetails, name = systemName, notes = systemNotes) {
    if (!catalog || !system) return;
    const nextSystem: MaterialSystem = {
      ...system,
      name: name.trim() || system.name,
      notes: notes.trim() || undefined,
      glass: nextGlass,
    };
    const saved = saveMaterialCatalog(
      upsertSystem(catalog, "glass", nextSystem)
    );
    setCatalog(saved);
    const refreshed = findSystem("glass", systemId, saved);
    if (refreshed) {
      setSystem(refreshed);
      setSystemName(refreshed.name);
      setSystemNotes(refreshed.notes ?? "");
      setGlass(refreshed.glass ?? defaultGlassDetails("double"));
    }
  }

  function saveAll(e: FormEvent) {
    e.preventDefault();
    const next: GlassSystemDetails =
      glass.glazing === "single"
        ? {
            glazing: "single",
            pane1: glass.pane1,
            georgian: false,
          }
        : {
            glazing: "double",
            pane1: glass.pane1,
            pane2: glass.pane2 ?? defaultGlassPane({ thicknessMm: 4 }),
            spacerMm: glass.spacerMm ?? 6,
            georgian: glass.georgian,
            georgianNote: glass.georgian
              ? glass.georgianNote?.trim() || undefined
              : undefined,
          };
    setGlass(next);
    persist(next);
    showFlash("تم حفظ تفاصيل الزجاج");
  }

  function setGlazing(glazing: GlassGlazing) {
    if (glazing === "single") {
      setGlass({
        glazing: "single",
        pane1: glass.pane1,
        georgian: false,
      });
    } else {
      setGlass({
        glazing: "double",
        pane1: glass.pane1,
        pane2: glass.pane2 ?? defaultGlassPane({ thicknessMm: 4 }),
        spacerMm: glass.spacerMm ?? 6,
        georgian: glass.georgian,
        georgianNote: glass.georgianNote,
      });
    }
  }

  function updatePane1(patch: Partial<GlassPaneSpec>) {
    setGlass((g) => ({ ...g, pane1: { ...g.pane1, ...patch } }));
  }

  function updatePane2(patch: Partial<GlassPaneSpec>) {
    setGlass((g) => ({
      ...g,
      pane2: { ...(g.pane2 ?? defaultGlassPane()), ...patch },
    }));
  }

  if (missing) {
    return (
      <div className="space-y-3">
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted">
          النظام مش موجود
        </p>
        <ScreenBack href="/materials/glass">رجوع للزجاج</ScreenBack>
      </div>
    );
  }

  if (!system) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted">
        جاري التحميل…
      </div>
    );
  }

  const isDouble = glass.glazing === "double";

  return (
    <div className="flex flex-col gap-3">
      <div className="px-1">
        <h2 className="text-lg font-bold text-foreground">{system.name}</h2>
        <p className="mt-0.5 text-xs text-muted">
          مفرد أو دبل · الزجاجة الأولى والثانية · جورجيا
        </p>
      </div>

      {flash ? (
        <p
          className="rounded-xl border border-primary/30 bg-primary-soft px-3 py-2 text-center text-xs font-semibold text-primary"
          role="status"
        >
          {flash}
        </p>
      ) : null}

      <form onSubmit={saveAll} className="space-y-3">
        <section className="space-y-3 rounded-2xl border border-border bg-card p-3">
          <h3 className="text-xs font-bold text-foreground">بيانات النظام</h3>
          <input
            type="text"
            value={systemName}
            onChange={(e) => setSystemName(e.target.value)}
            placeholder="اسم نظام الزجاج"
            required
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <textarea
            value={systemNotes}
            onChange={(e) => setSystemNotes(e.target.value)}
            placeholder="ملاحظات (اختياري)"
            rows={2}
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-card p-3">
          <h3 className="text-xs font-bold text-foreground">نوع التركيب</h3>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "single", label: "مفرد" },
                { id: "double", label: "دبل" },
              ] as const
            ).map((opt) => {
              const active = glass.glazing === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setGlazing(opt.id)}
                  className={`h-11 rounded-xl border text-sm font-semibold transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>

        <PaneEditor
          title={isDouble ? "الزجاجة الأولى" : "الزجاجة"}
          subtitle={isDouble ? "الخارجية غالباً" : undefined}
          pane={glass.pane1}
          onChange={updatePane1}
        />

        {isDouble ? (
          <>
            <section className="space-y-2 rounded-2xl border border-border bg-card p-3">
              <h3 className="text-xs font-bold text-foreground">
                الفاصل الهوائي
              </h3>
              <label className="block text-[11px] text-muted">
                سمك الفاصل (مم)
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={glass.spacerMm ?? 6}
                  onChange={(e) =>
                    setGlass((g) => ({
                      ...g,
                      spacerMm: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>
            </section>

            <PaneEditor
              title="الزجاجة الثانية"
              subtitle="الداخلية غالباً"
              pane={glass.pane2 ?? defaultGlassPane()}
              onChange={updatePane2}
            />

            <section className="space-y-3 rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-right">
                  <h3 className="text-xs font-bold text-foreground">جورجيا</h3>
                  <p className="mt-0.5 text-[11px] text-muted">
                    بارك زخرفي بين الزجاجتين
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={glass.georgian}
                  onClick={() =>
                    setGlass((g) => ({ ...g, georgian: !g.georgian }))
                  }
                  className={`relative h-8 w-14 rounded-full transition-colors ${
                    glass.georgian ? "bg-primary" : "bg-border"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
                      glass.georgian ? "right-1" : "right-7"
                    }`}
                  />
                </button>
              </div>
              {glass.georgian ? (
                <input
                  type="text"
                  value={glass.georgianNote ?? ""}
                  onChange={(e) =>
                    setGlass((g) => ({ ...g, georgianNote: e.target.value }))
                  }
                  placeholder="وصف الجورجيا (لون / شكل)"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              ) : null}
            </section>
          </>
        ) : null}

        <section className="rounded-2xl border border-border bg-background p-3 text-sm">
          <p className="text-xs font-bold text-primary">الملخص</p>
          <p className="mt-1 text-foreground">
            {glassCompositionLabel(
              isDouble
                ? glass
                : { glazing: "single", pane1: glass.pane1, georgian: false }
            )}
          </p>
          <p className="mt-1 text-xs text-muted">
            السمك الإجمالي: {glassTotalThicknessMm(
              isDouble
                ? {
                    ...glass,
                    pane2: glass.pane2 ?? defaultGlassPane(),
                    spacerMm: glass.spacerMm ?? 6,
                  }
                : { glazing: "single", pane1: glass.pane1, georgian: false }
            )}{" "}
            مم
            {isDouble && glass.georgian
              ? ` · جورجيا${glass.georgianNote ? `: ${glass.georgianNote}` : ""}`
              : ""}
          </p>
          {isDouble ? (
            <div className="mt-2 space-y-0.5 text-[11px] text-muted">
              <p>
                الأولى: {glass.pane1.label || glassPaneKindLabel(glass.pane1.kind)}{" "}
                — {glass.pane1.thicknessMm} مم
              </p>
              <p>فاصل: {glass.spacerMm ?? 6} مم</p>
              <p>
                الثانية:{" "}
                {(glass.pane2 ?? defaultGlassPane()).label ||
                  glassPaneKindLabel((glass.pane2 ?? defaultGlassPane()).kind)}{" "}
                — {(glass.pane2 ?? defaultGlassPane()).thicknessMm} مم
              </p>
            </div>
          ) : null}
        </section>

        <button
          type="submit"
          className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          حفظ
        </button>
      </form>
    </div>
  );
}

function PaneEditor({
  title,
  subtitle,
  pane,
  onChange,
}: {
  title: string;
  subtitle?: string;
  pane: GlassPaneSpec;
  onChange: (patch: Partial<GlassPaneSpec>) => void;
}) {
  return (
    <section className="space-y-2.5 rounded-2xl border border-border bg-card p-3">
      <div>
        <h3 className="text-xs font-bold text-foreground">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-[11px] text-muted">{subtitle}</p>
        ) : null}
      </div>
      <input
        type="text"
        value={pane.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="اسم / وصف الزجاجة"
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-[11px] text-muted">
          النوع
          <select
            value={pane.kind}
            onChange={(e) =>
              onChange({ kind: e.target.value as GlassPaneKind })
            }
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          >
            {GLASS_PANE_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[11px] text-muted">
          السمك (مم)
          <input
            type="number"
            min={1}
            step={1}
            value={pane.thicknessMm}
            onChange={(e) =>
              onChange({
                thicknessMm: Math.max(1, Number(e.target.value) || 1),
              })
            }
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </label>
      </div>
    </section>
  );
}
