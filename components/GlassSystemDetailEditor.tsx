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
  defaultGlassPane,
  findSystem,
  getGlassBottlePrice,
  glassPaneKindLabel,
  loadMaterialCatalog,
  saveMaterialCatalog,
  upsertSystem,
  type GlassPaneKind,
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
  const [kind, setKind] = useState<GlassPaneKind>("clear");
  const [thicknessMm, setThicknessMm] = useState(4);
  const [pricePerSqm, setPricePerSqm] = useState<number | "">("");
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
      const pane = found.glass?.pane1 ?? defaultGlassPane();
      setKind(pane.kind);
      setThicknessMm(pane.thicknessMm);
      setPricePerSqm(getGlassBottlePrice(found) || "");
    });
  }, [systemId]);

  function buildGlass(): GlassSystemDetails {
    return {
      glazing: "single",
      pane1: defaultGlassPane({
        label: systemName.trim() || system?.name || "زجاجة",
        thicknessMm,
        kind,
      }),
      georgian: false,
      pane1PricePerSqm:
        pricePerSqm === "" ? undefined : Math.max(0, Number(pricePerSqm) || 0),
    };
  }

  function persist() {
    if (!catalog || !system) return;
    const nextSystem: MaterialSystem = {
      ...system,
      name: systemName.trim() || system.name,
      notes: systemNotes.trim() || undefined,
      glass: buildGlass(),
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
    }
  }

  function saveAll(e: FormEvent) {
    e.preventDefault();
    persist();
    showFlash("تم حفظ الزجاجة");
  }

  if (missing) {
    return (
      <div className="space-y-3">
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted">
          الزجاجة مش موجودة
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

  return (
    <div className="flex flex-col gap-3">
      <div className="px-1">
        <h2 className="text-lg font-bold text-foreground">{system.name}</h2>
        <p className="mt-0.5 text-xs text-muted">
          زجاجة واحدة — السعر بالمتر المربع
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
          <h3 className="text-xs font-bold text-foreground">بيانات الزجاجة</h3>
          <input
            type="text"
            value={systemName}
            onChange={(e) => setSystemName(e.target.value)}
            placeholder="اسم الزجاجة (مثلاً: مصنفر 4 مم)"
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

        <section className="space-y-2.5 rounded-2xl border border-border bg-card p-3">
          <h3 className="text-xs font-bold text-foreground">المواصفات</h3>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] text-muted">
              النوع
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as GlassPaneKind)}
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
                value={thicknessMm}
                onChange={(e) =>
                  setThicknessMm(Math.max(1, Number(e.target.value) || 1))
                }
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-card p-3">
          <div>
            <h3 className="text-xs font-bold text-foreground">السعر</h3>
            <p className="mt-0.5 text-[11px] text-muted">
              سعر المتر المربع بالجنيه — بيتحسب لكل ضلفة تختار فيها الزجاجة دي
            </p>
          </div>
          <label className="block text-[11px] text-muted">
            سعر م²
            <input
              type="number"
              min={0}
              step={0.01}
              value={pricePerSqm}
              onChange={(e) =>
                setPricePerSqm(
                  e.target.value === "" ? "" : Math.max(0, Number(e.target.value) || 0)
                )
              }
              placeholder="0.00"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </label>
        </section>

        <section className="rounded-2xl border border-border bg-background p-3 text-sm">
          <p className="text-xs font-bold text-primary">الملخص</p>
          <p className="mt-1 text-foreground">
            {systemName || system.name} — {glassPaneKindLabel(kind)} {thicknessMm} مم
          </p>
          {pricePerSqm !== "" && Number(pricePerSqm) > 0 ? (
            <p className="mt-1 text-xs text-muted">
              {Number(pricePerSqm).toFixed(2)} ج.م / م²
            </p>
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
