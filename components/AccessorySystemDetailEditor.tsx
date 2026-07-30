"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  defaultAccessoryDetails,
  ESPAGNOLETTE_SIZES,
  findSystem,
  loadMaterialCatalog,
  newAccessoryLockPieceId,
  saveMaterialCatalog,
  upsertSystem,
  type AccessoryLockPiece,
  type AccessorySystemDetails,
  type EspagnoletteSize,
  type EspagnoletteSizeRule,
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
  }, [systemId]);

  useEffect(() => {
    queueMicrotask(reload);
  }, [reload]);

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

  function toggleSize(
    field: "hingedEspagnoletteSizes" | "slidingEspagnoletteSizes",
    size: EspagnoletteSize
  ) {
    const current = details[field];
    const next = current.includes(size)
      ? current.filter((s) => s !== size)
      : [...current, size].sort((a, b) => a - b);
    if (next.length === 0) {
      showFlash("لازم مقاس واحد على الأقل");
      return;
    }
    const allSizes = [
      ...new Set([
        ...(field === "hingedEspagnoletteSizes"
          ? next
          : details.hingedEspagnoletteSizes),
        ...(field === "slidingEspagnoletteSizes"
          ? next
          : details.slidingEspagnoletteSizes),
      ]),
    ].sort((a, b) => a - b) as EspagnoletteSize[];

    const rules = syncRules(details.espagnoletteSizeRules, allSizes);
    patchDetails({ [field]: next, espagnoletteSizeRules: rules });
  }

  function updateRule(size: EspagnoletteSize, maxHeightMm: number) {
    const rules = details.espagnoletteSizeRules.map((r) =>
      r.size === size ? { ...r, maxHeightMm: Math.max(1, maxHeightMm) } : r
    );
    patchDetails({ espagnoletteSizeRules: rules });
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

        <SizeChips
          label="مقاسات سبلونة مفصلي"
          selected={details.hingedEspagnoletteSizes}
          onToggle={(s) => toggleSize("hingedEspagnoletteSizes", s)}
        />

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
      <Section title="اكسسوار الجرار" hint="تراك · عجل · فرش · سبلونة · تقابل">
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

        <SizeChips
          label="مقاسات سبلونة جرار"
          selected={details.slidingEspagnoletteSizes}
          onToggle={(s) => toggleSize("slidingEspagnoletteSizes", s)}
        />

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

        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={details.fourLeafMeetingEnabled}
            onChange={(e) =>
              patchDetails({ fourLeafMeetingEnabled: e.target.checked })
            }
            className="h-4 w-4 accent-[var(--primary)]"
          />
          تقابل ٤ ضلفة (قطعة واحدة بارتفاع الضلفة)
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={details.meshSlidingMeetingEnabled}
            onChange={(e) =>
              patchDetails({ meshSlidingMeetingEnabled: e.target.checked })
            }
            className="h-4 w-4 accent-[var(--primary)]"
          />
          تقابل سلك جرار (ضلفتين في نفس الفتحة)
        </label>
      </Section>

      {/* ── قواعد المقاس ── */}
      <Section
        title="قواعد اختيار مقاس السبلونة"
        hint="حسب ارتفاع الضلفة من ناحية المقبض (مم) — أصغر مقاس يغطي الارتفاع"
      >
        <div className="space-y-2">
          {details.espagnoletteSizeRules.map((rule) => (
            <div
              key={rule.size}
              className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/70 px-2.5 py-2"
            >
              <span className="w-12 shrink-0 text-sm font-bold text-foreground">
                {rule.size}
              </span>
              <label className="flex flex-1 items-center gap-2 text-[11px] text-muted">
                أقصى ارتفاع (مم)
                <input
                  type="number"
                  min={1}
                  step={10}
                  value={rule.maxHeightMm}
                  onChange={(e) =>
                    updateRule(rule.size, Number(e.target.value) || 1)
                  }
                  className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                />
              </label>
            </div>
          ))}
        </div>
      </Section>

      <p className="px-1 pb-2 text-center text-[11px] leading-relaxed text-muted">
        ضلفتين مفصلي + بوكلير = سبلونة واحدة + سكاك بوكلير + ترباس + طبة.
        الجرار: تراك ٢ بعرض الحلق · عجل ٢/ضلفة · فرش محيط×٢ + سكينة×١.
      </p>
    </div>
  );
}

function syncRules(
  current: EspagnoletteSizeRule[],
  sizes: EspagnoletteSize[]
): EspagnoletteSizeRule[] {
  const map = new Map(current.map((r) => [r.size, r.maxHeightMm]));
  return sizes.map((size) => ({
    size,
    maxHeightMm: map.get(size) ?? size * 10,
  }));
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

function SizeChips({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: EspagnoletteSize[];
  onToggle: (s: EspagnoletteSize) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold text-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {ESPAGNOLETTE_SIZES.map((size) => {
          const on = selected.includes(size);
          return (
            <button
              key={size}
              type="button"
              onClick={() => onToggle(size)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                on
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background text-muted"
              }`}
            >
              {size}
            </button>
          );
        })}
      </div>
    </div>
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
