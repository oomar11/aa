"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { AccessoryDetailsForm } from "@/components/AccessoryDetailsForm";
import {
  ACCESSORY_BRANDS_UPDATED,
  defaultAccessoryDetails,
  findSystem,
  loadMaterialCatalog,
  saveMaterialCatalog,
  upsertSystem,
  type AccessorySystemDetails,
  type MaterialCatalog,
  type MaterialSystem,
} from "@/lib/material-systems";

type Props = {
  systemId: string;
};

export function AccessorySystemDetailEditor({ systemId }: Props) {
  const [catalog, setCatalog] = useState<MaterialCatalog | null>(null);
  const [system, setSystem] = useState<MaterialSystem | null>(null);
  const [systemName, setSystemName] = useState("");
  const [systemNotes, setSystemNotes] = useState("");
  const [details, setDetails] = useState<AccessorySystemDetails>(
    defaultAccessoryDetails
  );
  const [flash, setFlash] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [brandCatalog, setBrandCatalog] = useState(
    () => loadMaterialCatalog().accessoryBrands ?? []
  );

  const showFlash = useCallback((msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 1800);
  }, []);

  const reload = useCallback(() => {
    const cat = loadMaterialCatalog();
    setCatalog(cat);
    const found = findSystem("accessories", systemId, cat);
    if (!found) {
      setMissing(true);
      setSystem(null);
      return;
    }
    setMissing(false);
    setSystem(found);
    setSystemName(found.name);
    setSystemNotes(found.notes ?? "");
    setDetails(found.accessory ?? defaultAccessoryDetails());
    setBrandCatalog(cat.accessoryBrands ?? []);
  }, [systemId]);

  useEffect(() => {
    queueMicrotask(reload);
  }, [reload]);

  useEffect(() => {
    const onBrands = () => {
      setBrandCatalog(loadMaterialCatalog().accessoryBrands ?? []);
    };
    window.addEventListener(ACCESSORY_BRANDS_UPDATED, onBrands);
    return () => window.removeEventListener(ACCESSORY_BRANDS_UPDATED, onBrands);
  }, []);

  function persist(nextDetails: AccessorySystemDetails, name?: string, notes?: string) {
    if (!catalog || !system) return;
    const nextSystem: MaterialSystem = {
      ...system,
      name: (name ?? systemName).trim() || system.name,
      notes: (notes ?? systemNotes).trim() || undefined,
      accessory: nextDetails,
    };
    const saved = saveMaterialCatalog(
      upsertSystem(catalog, "accessories", nextSystem)
    );
    setCatalog(saved);
    const updated = findSystem("accessories", systemId, saved);
    if (updated) {
      setSystem(updated);
      setDetails(updated.accessory ?? defaultAccessoryDetails());
    }
  }

  function handleSaveMeta(e: FormEvent) {
    e.preventDefault();
    const trimmed = systemName.trim();
    if (!trimmed) {
      showFlash("اكتب اسم النظام");
      return;
    }
    persist(details, trimmed, systemNotes);
    setSystemName(trimmed);
    showFlash("تم حفظ بيانات النظام");
  }

  function patchDetails(patch: Partial<AccessorySystemDetails>) {
    const next = { ...details, ...patch };
    setDetails(next);
    persist(next);
    showFlash("تم الحفظ");
  }

  if (missing) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted">
        نظام الاكسسوار مش موجود
      </div>
    );
  }

  if (!catalog || !system) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted">
        جاري التحميل…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="px-1">
        <h1 className="text-xl font-bold">تفاصيل الاكسسوار</h1>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          قواعد الكميات للمفصلي والجرار — السبلونة · السكاك · التراك · الفرش ·
          التقابل
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

      <form
        onSubmit={handleSaveMeta}
        className="space-y-3 rounded-2xl border border-border bg-card p-3"
      >
        <h2 className="text-xs font-bold text-foreground">بيانات النظام</h2>
        <input
          type="text"
          value={systemName}
          onChange={(e) => setSystemName(e.target.value)}
          placeholder="اسم النظام"
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <textarea
          value={systemNotes}
          onChange={(e) => setSystemNotes(e.target.value)}
          placeholder="ملاحظات (اختياري)"
          rows={2}
          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          حفظ الاسم
        </button>
      </form>

      <AccessoryDetailsForm
        details={details}
        onChange={(next) => patchDetails(next)}
        brandCatalog={brandCatalog}
        onNotify={showFlash}
      />

      <p className="px-1 pb-2 text-center text-[11px] leading-relaxed text-muted">
        ضلفتين مفصلي + بوكلير = سبلونة واحدة + سكاك بوكلير + ترباس + سكاك ترباس + طبة (قطاع).
        الجرار: تراك ٢ بعرض الحلق · عجل ٢/ضلفة · فرش محيط×٢ + سكينة×١ · مقبض غاطس على الضلفة الغاطسة.
      </p>
    </div>
  );
}
