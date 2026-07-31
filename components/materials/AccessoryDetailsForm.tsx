"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { MaterialSectionTabs } from "@/components/materials/MaterialSectionTabs";
import { NumericInput } from "@/components/ui/NumericInput";
import {
  ACCESSORY_BRAND_CATEGORIES,
  accessoryBrandCategoryLabel,
  defaultEspagnoletteCatalog,
  newAccessoryLockPieceId,
  newEspagnoletteCatalogId,
  type AccessoryBrand,
  type AccessoryBrandCategory,
  type AccessoryLockPiece,
  type AccessorySystemDetails,
  type EspagnoletteCatalogEntry,
} from "@/lib/material-systems";
import { ROUTES } from "@/lib/routes";

type LockKind = "hinged" | "bouclier" | "bouclier-bolt" | "sliding";

type AccessoryFormTab = "brands" | "hinged" | "sliding" | "espagnolette";

const ACCESSORY_FORM_TABS: {
  id: AccessoryFormTab;
  label: string;
}[] = [
  { id: "brands", label: "براندات" },
  { id: "hinged", label: "مفصلي" },
  { id: "sliding", label: "جرار" },
  { id: "espagnolette", label: "سبلونة" },
];

type Props = {
  details: AccessorySystemDetails;
  onChange: (next: AccessorySystemDetails) => void;
  brandCatalog: AccessoryBrand[];
  onNotify?: (message: string) => void;
  compact?: boolean;
};

function lockPieceKey(
  kind: LockKind
): keyof Pick<
  AccessorySystemDetails,
  | "hingedLockPieces"
  | "bouclierLockPieces"
  | "bouclierBoltLockPieces"
  | "slidingLockPieces"
> {
  if (kind === "hinged") return "hingedLockPieces";
  if (kind === "bouclier") return "bouclierLockPieces";
  if (kind === "bouclier-bolt") return "bouclierBoltLockPieces";
  return "slidingLockPieces";
}

function defaultLockPieceName(kind: LockKind): string {
  if (kind === "bouclier") return "سكة بوكلير";
  if (kind === "bouclier-bolt") return "سكة ترباس";
  if (kind === "sliding") return "سكة جرار";
  return "سكة";
}

/** نموذج قواعد الاكسسوار — مشترك بين كتالوج الأنظمة وإعدادات المشروع */
export function AccessoryDetailsForm({
  details,
  onChange,
  brandCatalog,
  onNotify,
  compact = false,
}: Props) {
  const [tab, setTab] = useState<AccessoryFormTab>("brands");

  function patchDetails(patch: Partial<AccessorySystemDetails>) {
    onChange({ ...details, ...patch });
  }

  const show = (id: AccessoryFormTab) => compact || tab === id;

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
      onNotify?.("لازم مقاس واحد على الأقل");
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
    const key = lockPieceKey(kind);
    const list = details[key].map((p) =>
      p.id === id ? { ...p, ...patch } : p
    );
    patchDetails({ [key]: list });
  }

  function addLockPiece(kind: LockKind) {
    const key = lockPieceKey(kind);
    const piece: AccessoryLockPiece = {
      id: newAccessoryLockPieceId(kind),
      name: defaultLockPieceName(kind),
      qtyPerLockset: 1,
    };
    patchDetails({ [key]: [...details[key], piece] });
  }

  function removeLockPiece(kind: LockKind, id: string) {
    const key = lockPieceKey(kind);
    const list = details[key].filter((p) => p.id !== id);
    if (list.length === 0) {
      onNotify?.("لازم قطعة سكاك واحدة على الأقل");
      return;
    }
    patchDetails({ [key]: list });
  }

  const gapClass = compact ? "gap-2" : "gap-3";

  return (
    <div className={`flex flex-col ${gapClass}`}>
      {!compact ? (
        <MaterialSectionTabs
          tabs={ACCESSORY_FORM_TABS}
          active={tab}
          onChange={setTab}
          label="أقسام الاكسسوار"
        />
      ) : null}

      {show("espagnolette") ? (
      <Section
        title="مقاسات السبلونة"
        hint="عدّل المقاس (سم) · أقصى ارتفاع ضلفة (مم) · تفعيل للمفصلي أو الجرار"
        compact={compact}
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
                <NumericInput
                  min={1}
                  max={999}
                  step={1}
                  round
                  fallback={1}
                  blankZero={false}
                  value={entry.size}
                  onChange={(size) => updateCatalogEntry(entry.id, { size })}
                  className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm font-bold text-foreground outline-none focus:border-primary"
                />
              </div>
              <div className="p-1.5">
                <NumericInput
                  min={1}
                  step={10}
                  round
                  fallback={1}
                  blankZero={false}
                  value={entry.maxHeightMm}
                  onChange={(maxHeightMm) =>
                    updateCatalogEntry(entry.id, { maxHeightMm })
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
          الاختيار التلقائي: أكبر مقاس سبلونة أقصر من الضلفة بـ ٢٠ سم على الأقل
          (قابل للتعديل). مثال: ضلفة ١٤٠٠ مم → سبلونة ١٢٠ سم أو ١٠٠ حسب الكتالوج.
        </p>
        <NumberField
          label="أقل فرق بين الضلفة والسبلونة (مم)"
          value={details.espagnoletteSashDeductionMm}
          onChange={(v) => patchDetails({ espagnoletteSashDeductionMm: v })}
          hint="٢٠٠ = ٢٠ سم"
        />
      </Section>
      ) : null}

      {show("brands") ? (
      <Section
        title="براندات لكل فئة"
        hint="اختَر البراند من كتالوج البراندات"
        compact={compact}
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
      ) : null}

      {show("hinged") ? (
      <Section
        title="اكسسوار المفصلي"
        hint="مفصلات · سبلونة · سكاك · بوكلير"
        compact={compact}
      >
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
            label="مقبض بارز / سبلونة"
            value={details.protrudingHandlesPerLockset}
            onChange={(v) => patchDetails({ protrudingHandlesPerLockset: v })}
          />
        </div>

        <LockPiecesEditor
          title="سكاك مفصلي (لكل سبلونة ضلفة واحدة)"
          pieces={details.hingedLockPieces}
          onChangeName={(id, name) => updateLockPiece("hinged", id, { name })}
          onChangeQty={(id, qty) =>
            updateLockPiece("hinged", id, { qtyPerLockset: qty })
          }
          onAdd={() => addLockPiece("hinged")}
          onRemove={(id) => removeLockPiece("hinged", id)}
        />

        <LockPiecesEditor
          title="سكاك بوكلير (بدل المفصلي لما فيه بوكلير)"
          pieces={details.bouclierLockPieces}
          onChangeName={(id, name) => updateLockPiece("bouclier", id, { name })}
          onChangeQty={(id, qty) =>
            updateLockPiece("bouclier", id, { qtyPerLockset: qty })
          }
          onAdd={() => addLockPiece("bouclier")}
          onRemove={(id) => removeLockPiece("bouclier", id)}
        />

        <LockPiecesEditor
          title="سكاك ترباس (لكل ترباس)"
          pieces={details.bouclierBoltLockPieces}
          onChangeName={(id, name) =>
            updateLockPiece("bouclier-bolt", id, { name })
          }
          onChangeQty={(id, qty) =>
            updateLockPiece("bouclier-bolt", id, { qtyPerLockset: qty })
          }
          onAdd={() => addLockPiece("bouclier-bolt")}
          onRemove={(id) => removeLockPiece("bouclier-bolt", id)}
        />
      </Section>
      ) : null}

      {show("sliding") ? (
      <Section
        title="اكسسوار الجرار"
        hint="عجل · فرش · سبلونة · مقبض غاطس — التراك مع الحديد"
        compact={compact}
      >
        <div className="grid grid-cols-2 gap-2">
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
          onChangeName={(id, name) => updateLockPiece("sliding", id, { name })}
          onChangeQty={(id, qty) =>
            updateLockPiece("sliding", id, { qtyPerLockset: qty })
          }
          onAdd={() => addLockPiece("sliding")}
          onRemove={(id) => removeLockPiece("sliding", id)}
        />
      </Section>
      ) : null}
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
            href={ROUTES.materials.accessoryBrands}
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
  compact,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      className={`space-y-3 rounded-2xl border border-border bg-card ${
        compact ? "p-2.5" : "p-3"
      }`}
    >
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
      <NumericInput
        min={0}
        step={step}
        value={value}
        onChange={onChange}
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
          <NumericInput
            min={0}
            step={1}
            round
            value={p.qtyPerLockset}
            onChange={(qty) => onChangeQty(p.id, qty)}
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
