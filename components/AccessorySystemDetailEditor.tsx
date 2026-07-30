"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ACCESSORY_BRAND_CATEGORIES,
  ACCESSORY_BRANDS_UPDATED,
  accessoryBrandCategoryLabel,
  defaultAccessoryDetails,
  defaultEspagnoletteCatalog,
  findSystem,
  loadMaterialCatalog,
  newAccessoryLockPieceId,
  newEspagnoletteCatalogId,
  saveMaterialCatalog,
  upsertSystem,
  type AccessoryBrand,
  type AccessoryBrandCategory,
  type AccessoryLockPiece,
  type AccessorySystemDetails,
  type EspagnoletteCatalogEntry,
  type MaterialCatalog,
  type MaterialSystem,
} from "@/lib/material-systems";

type Props = {
  systemId: string;
};

type LockKind = "hinged" | "bouclier" | "sliding";

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
  const [brandCatalog, setBrandCatalog] = useState<AccessoryBrand[]>([]);

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

  function updateCatalogEntry(
    id: string,
    patch: Partial<EspagnoletteCatalogEntry>
  ) {
    const next = details.espagnoletteCatalog
      .map((e) => (e.id === id ? { ...e, ...patch } : e))
      .sort((a, b) => a.size - b.size);
    patchDetails({ espagnoletteCatalog: next });
  }

  function addCatalogEntry() {
    const used = new Set(details.espagnoletteCatalog.map((e) => e.size));
    let size = 100;
    while (used.has(size) && size < 999) size += 10;
    const entry: EspagnoletteCatalogEntry = {
      id: newEspagnoletteCatalogId(),
      size,
      maxHeightMm: size * 10,
      hinged: true,
      sliding: true,
    };
    patchDetails({
      espagnoletteCatalog: [...details.espagnoletteCatalog, entry].sort(
        (a, b) => a.size - b.size
      ),
    });
  }

  function removeCatalogEntry(id: string) {
    if (details.espagnoletteCatalog.length <= 1) {
      showFlash("لازم مقاس واحد على الأقل");
      return;
    }
    patchDetails({
      espagnoletteCatalog: details.espagnoletteCatalog.filter((e) => e.id !== id),
    });
  }

  function resetCatalogToDefaults() {
    patchDetails({ espagnoletteCatalog: defaultEspagnoletteCatalog() });
  }

  function setCategoryBrand(category: AccessoryBrandCategory, brandId: string) {
    const next = { ...details.categoryBrands };
    if (!brandId) delete next[category];
    else next[category] = brandId;
    patchDetails({ categoryBrands: next });
  }

  function updateLockPiece(
    kind: LockKind,
    id: string,
    patch: Partial<AccessoryLockPiece>
  ) {
    const key =
      kind === "hinged"
        ? "hingedLockPieces"
        : kind === "bouclier"
          ? "bouclierLockPieces"
          : "slidingLockPieces";
    const list = details[key].map((p) =>
      p.id === id ? { ...p, ...patch } : p
    );
    patchDetails({ [key]: list });
  }

  function addLockPiece(kind: LockKind) {
    const key =
      kind === "hinged"
        ? "hingedLockPieces"
        : kind === "bouclier"
          ? "bouclierLockPieces"
          : "slidingLockPieces";
    const piece: AccessoryLockPiece = {
      id: newAccessoryLockPieceId(kind),
      name: kind === "bouclier" ? "سكة بوكلير" : kind === "sliding" ? "سكة جرار" : "سكة",
      qtyPerLockset: 1,
    };
    patchDetails({ [key]: [...details[key], piece] });
  }

  function removeLockPiece(kind: LockKind, id: string) {
    const key =
      kind === "hinged"
        ? "hingedLockPieces"
        : kind === "bouclier"
          ? "bouclierLockPieces"
          : "slidingLockPieces";
    const list = details[key].filter((p) => p.id !== id);
    if (list.length === 0) {
      showFlash("لازم قطعة سكاك واحدة على الأقل");
      return;
    }
    patchDetails({ [key]: list });
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

      <Section
        title="مقاسات السبلونة"
        hint="عدّل المقاس (سم) · أقصى ارتفاع ضلفة (مم) · تفعيل للمفصلي أو الجرار"
      >
        <div className="flex flex-wrap justify-end gap-1.5">
          <button
            type="button"
            onClick={addCatalogEntry}
            className="rounded-lg border border-primary/40 bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary"
          >
            + مقاس جديد
          </button>
          <button
            type="button"
            onClick={resetCatalogToDefaults}
            className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-muted"
          >
            استعادة القياسي
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-background/70 text-[11px]">
          <div className="grid grid-cols-[1fr_1.2fr_0.5fr_0.5fr_0.4fr] border-b border-border bg-card/80 text-center font-semibold text-muted">
            <span className="px-2 py-2">مقاس (سم)</span>
            <span className="px-2 py-2">أقصى ارتفاع (مم)</span>
            <span className="px-2 py-2">مفصلي</span>
            <span className="px-2 py-2">جرار</span>
            <span className="px-2 py-2" />
          </div>
          {details.espagnoletteCatalog.map((entry, i) => (
            <div
              key={entry.id}
              className={`grid grid-cols-[1fr_1.2fr_0.5fr_0.5fr_0.4fr] items-center text-center ${
                i > 0 ? "border-t border-border/70" : ""
              }`}
            >
              <div className="p-1.5">
                <input
                  type="number"
                  min={1}
                  max={999}
                  step={1}
                  value={entry.size}
                  onChange={(e) => {
                    const size = Math.max(
                      1,
                      Math.min(999, Math.round(Number(e.target.value) || 1))
                    );
                    updateCatalogEntry(entry.id, { size });
                  }}
                  className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm font-bold text-foreground outline-none focus:border-primary"
                />
              </div>
              <div className="p-1.5">
                <input
                  type="number"
                  min={1}
                  step={10}
                  value={entry.maxHeightMm}
                  onChange={(e) =>
                    updateCatalogEntry(entry.id, {
                      maxHeightMm: Math.max(
                        1,
                        Math.round(Number(e.target.value) || 1)
                      ),
                    })
                  }
                  className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
              <div className="flex justify-center p-1.5">
                <input
                  type="checkbox"
                  checked={entry.hinged}
                  onChange={(e) =>
                    updateCatalogEntry(entry.id, { hinged: e.target.checked })
                  }
                  className="h-4 w-4 accent-[var(--primary)]"
                  aria-label={`مفصلي ${entry.size}`}
                />
              </div>
              <div className="flex justify-center p-1.5">
                <input
                  type="checkbox"
                  checked={entry.sliding}
                  onChange={(e) =>
                    updateCatalogEntry(entry.id, { sliding: e.target.checked })
                  }
                  className="h-4 w-4 accent-[var(--primary)]"
                  aria-label={`جرار ${entry.size}`}
                />
              </div>
              <div className="p-1.5">
                <button
                  type="button"
                  onClick={() => removeCatalogEntry(entry.id)}
                  className="rounded-md border border-border px-1.5 py-1 text-[10px] text-red-600"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] leading-relaxed text-muted">
          الاختيار التلقائي: أصغر مقاس أقصى ارتفاعه ≥ (ارتفاع الضلفة − التخصيم)
          من ناحية المقبض. مثال: ضلفة ١٤٠٠ مم مع تخصيم ١٥٠ → ١٢٥٠ مم → مقاس
          ١٤٠.
        </p>
        <NumberField
          label="تخصيم من الضلفة لاختيار السبلونة (مم)"
          value={details.espagnoletteSashDeductionMm}
          onChange={(v) => patchDetails({ espagnoletteSashDeductionMm: v })}
          hint="١٥٠ = ١٥ سم"
        />
      </Section>

      <Section
        title="براندات لكل فئة"
        hint="اختَر البراند من كتالوج البراندات"
      >
        {(["hinged", "bouclier", "sliding"] as const).map((group) => {
          const cats = ACCESSORY_BRAND_CATEGORIES.filter((c) => c.group === group);
          const groupLabel =
            group === "hinged" ? "مفصلي" : group === "bouclier" ? "بوكلير" : "جرار";
          return (
            <div key={group} className="space-y-2">
              <p className="text-[11px] font-bold text-foreground">{groupLabel}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {cats.map((cat) => (
                  <BrandSelect
                    key={cat.id}
                    category={cat.id}
                    label={cat.label}
                    value={details.categoryBrands[cat.id]}
                    options={brandCatalog.filter((b) => b.category === cat.id)}
                    onChange={(id) => setCategoryBrand(cat.id, id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </Section>

      {/* ── مفصلي ── */}
      <Section title="اكسسوار المفصلي" hint="مفصلات · سبلونة · سكاك · بوكلير">
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="مفصلات / ضلفة شباك"
            value={details.hingesPerSash}
            onChange={(v) => patchDetails({ hingesPerSash: v })}
          />
          <NumberField
            label="مفصلات / باب"
            value={details.hingesPerDoor}
            onChange={(v) => patchDetails({ hingesPerDoor: v })}
          />
          <NumberField
            label="ترباس / بوكلير"
            value={details.boltsPerBouclier}
            onChange={(v) => patchDetails({ boltsPerBouclier: v })}
          />
          <NumberField
            label="طقم طبة / بوكلير"
            value={details.bouclierCapKitsPerBouclier}
            onChange={(v) => patchDetails({ bouclierCapKitsPerBouclier: v })}
          />
          <NumberField
            label="مقبض بارز / سبلونة"
            value={details.protrudingHandlesPerLockset}
            onChange={(v) => patchDetails({ protrudingHandlesPerLockset: v })}
          />
        </div>

        <LockPiecesEditor
          title="سكاك مفصلي (لكل سبلونة ضلفة واحدة)"
          pieces={details.hingedLockPieces}
          onChangeName={(id, name) =>
            updateLockPiece("hinged", id, { name })
          }
          onChangeQty={(id, qty) =>
            updateLockPiece("hinged", id, { qtyPerLockset: qty })
          }
          onAdd={() => addLockPiece("hinged")}
          onRemove={(id) => removeLockPiece("hinged", id)}
        />

        <LockPiecesEditor
          title="سكاك بوكلير (بدل المفصلي لما فيه بوكلير)"
          pieces={details.bouclierLockPieces}
          onChangeName={(id, name) =>
            updateLockPiece("bouclier", id, { name })
          }
          onChangeQty={(id, qty) =>
            updateLockPiece("bouclier", id, { qtyPerLockset: qty })
          }
          onAdd={() => addLockPiece("bouclier")}
          onRemove={(id) => removeLockPiece("bouclier", id)}
        />
      </Section>

      {/* ── جرار ── */}
      <Section title="اكسسوار الجرار" hint="تراك · عجل · فرش · سبلونة · مقبض غاطس">
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="تراك على الحلق"
            value={details.tracksPerFrame}
            onChange={(v) => patchDetails({ tracksPerFrame: v })}
            hint="بعرض الحلق"
          />
          <NumberField
            label="عجل / ضلفة جرار"
            value={details.rollersPerSlidingSash}
            onChange={(v) => patchDetails({ rollersPerSlidingSash: v })}
          />
          <NumberField
            label="مقبض غاطس / ضلفة غاطسة"
            value={details.recessedHandlesPerRecessedSash}
            onChange={(v) =>
              patchDetails({ recessedHandlesPerRecessedSash: v })
            }
          />
          <NumberField
            label="فرش × محيط الضلفة"
            value={details.brushSashPerimeterMultiplier}
            onChange={(v) => patchDetails({ brushSashPerimeterMultiplier: v })}
            step={0.5}
          />
          <NumberField
            label="فرش × ارتفاع السكينة"
            value={details.brushKnifeHeightMultiplier}
            onChange={(v) => patchDetails({ brushKnifeHeightMultiplier: v })}
            step={0.5}
          />
        </div>

        <LockPiecesEditor
          title="سكاك جرار (مكان المفصلي)"
          pieces={details.slidingLockPieces}
          onChangeName={(id, name) =>
            updateLockPiece("sliding", id, { name })
          }
          onChangeQty={(id, qty) =>
            updateLockPiece("sliding", id, { qtyPerLockset: qty })
          }
          onAdd={() => addLockPiece("sliding")}
          onRemove={(id) => removeLockPiece("sliding", id)}
        />
      </Section>

      <p className="px-1 pb-2 text-center text-[11px] leading-relaxed text-muted">
        ضلفتين مفصلي + بوكلير = سبلونة واحدة + سكاك بوكلير + ترباس + طبة.
        الجرار: تراك ٢ بعرض الحلق · عجل ٢/ضلفة · فرش محيط×٢ + سكينة×١ · مقبض غاطس على الضلفة الغاطسة.
      </p>
    </div>
  );
}

function BrandSelect({
  category,
  label,
  value,
  options,
  onChange,
}: {
  category: AccessoryBrandCategory;
  label: string;
  value?: string;
  options: AccessoryBrand[];
  onChange: (brandId: string) => void;
}) {
  return (
    <label className="block text-[11px] text-muted">
      {label}
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        aria-label={`براند ${accessoryBrandCategoryLabel(category)}`}
      >
        <option value="">— بدون —</option>
        {options.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      {options.length === 0 ? (
        <span className="mt-0.5 block text-[10px] text-muted/80">
          مفيش براندات —{" "}
          <Link
            href="/materials/accessories/brands"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            أضف من صفحة البراندات
          </Link>
        </span>
      ) : null}
    </label>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-3">
      <div>
        <h2 className="text-xs font-bold text-foreground">{title}</h2>
        {hint ? (
          <p className="mt-0.5 text-[11px] text-muted">{hint}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
  hint,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  step?: number;
}) {
  return (
    <label className="block text-[11px] text-muted">
      {label}
      {hint ? (
        <span className="mr-1 text-[10px] opacity-70">({hint})</span>
      ) : null}
      <input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
      />
    </label>
  );
}

function LockPiecesEditor({
  title,
  pieces,
  onChangeName,
  onChangeQty,
  onAdd,
  onRemove,
}: {
  title: string;
  pieces: AccessoryLockPiece[];
  onChangeName: (id: string, name: string) => void;
  onChangeQty: (id: string, qty: number) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-muted">{title}</p>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg border border-primary/40 bg-primary-soft px-2 py-1 text-[10px] font-semibold text-primary"
        >
          + قطعة
        </button>
      </div>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/70 p-2"
        >
          <input
            type="text"
            value={p.name}
            onChange={(e) => onChangeName(p.id, e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-card px-2 py-1.5 text-sm outline-none focus:border-primary"
          />
          <input
            type="number"
            min={0}
            step={1}
            value={p.qtyPerLockset}
            onChange={(e) =>
              onChangeQty(p.id, Math.max(0, Math.round(Number(e.target.value) || 0)))
            }
            className="w-16 rounded-lg border border-border bg-card px-2 py-1.5 text-center text-sm outline-none focus:border-primary"
            title="العدد لكل سبلونة"
          />
          <button
            type="button"
            onClick={() => onRemove(p.id)}
            className="rounded-lg border border-border px-2 py-1.5 text-[10px] text-red-600"
          >
            حذف
          </button>
        </div>
      ))}
    </div>
  );
}
