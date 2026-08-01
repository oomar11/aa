"use client";

import { useMemo, useState, type ReactNode } from "react";
import { MaterialSectionTabs } from "@/components/materials/MaterialSectionTabs";
import { NumericInput } from "@/components/ui/NumericInput";
import { defaultVorneCategoryBrands } from "@/lib/accessory-price-list-2026";
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

type LockKind = "hinged" | "bouclier" | "bouclier-bolt" | "sliding";

type AccessoryFormTab = "prices" | "sablons" | "rules" | "advanced";

const ACCESSORY_FORM_TABS: { id: AccessoryFormTab; label: string }[] = [
  { id: "prices", label: "الأسعار" },
  { id: "sablons", label: "السبلونات" },
  { id: "rules", label: "القواعد" },
  { id: "advanced", label: "متقدم" },
];

type Props = {
  details: AccessorySystemDetails;
  onChange: (next: AccessorySystemDetails) => void;
  brandCatalog: AccessoryBrand[];
  onBrandCatalogChange?: (next: AccessoryBrand[]) => void;
  onNotify?: (message: string) => void;
  /** في إعدادات المشروع: اعرض القواعد والسبلونات بدون تبويب أسعار عام */
  compact?: boolean;
};

function isEspagnoletteCategory(category: AccessoryBrandCategory): boolean {
  return (
    category === "hinged-espagnolette" || category === "sliding-espagnolette"
  );
}

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

function resolveBrandForCategory(
  category: AccessoryBrandCategory,
  details: AccessorySystemDetails,
  brands: AccessoryBrand[]
): AccessoryBrand | undefined {
  const linkedId = details.categoryBrands[category];
  const linked = linkedId
    ? brands.find((b) => b.id === linkedId && b.category === category)
    : undefined;
  if (linked) return linked;
  return brands.find((b) => b.category === category);
}

/** نموذج الاكسسوار — أسعار · سبلونات · قواعد · متقدم */
export function AccessoryDetailsForm({
  details,
  onChange,
  brandCatalog,
  onBrandCatalogChange,
  onNotify,
  compact = false,
}: Props) {
  const [tab, setTab] = useState<AccessoryFormTab>(
    compact ? "sablons" : "prices"
  );

  function patchDetails(patch: Partial<AccessorySystemDetails>) {
    onChange({ ...details, ...patch });
  }

  const show = (id: AccessoryFormTab) => compact || tab === id;

  function ensureBrand(
    category: AccessoryBrandCategory
  ): {
    brand: AccessoryBrand;
    brands: AccessoryBrand[];
    details: AccessorySystemDetails;
  } | null {
    const existing = resolveBrandForCategory(category, details, brandCatalog);
    if (existing) {
      const nextDetails =
        details.categoryBrands[category] === existing.id
          ? details
          : {
              ...details,
              categoryBrands: {
                ...details.categoryBrands,
                [category]: existing.id,
              },
            };
      if (nextDetails !== details) onChange(nextDetails);
      return { brand: existing, brands: brandCatalog, details: nextDetails };
    }

    const fallbackId = defaultVorneCategoryBrands()[category];
    if (!fallbackId || !onBrandCatalogChange) return null;

    const created: AccessoryBrand = {
      id: fallbackId,
      name: accessoryBrandCategoryLabel(category),
      category,
      unitPrice: isEspagnoletteCategory(category) ? undefined : 0,
      sizePrices: isEspagnoletteCategory(category) ? {} : undefined,
    };
    const brands = [...brandCatalog, created];
    const nextDetails = {
      ...details,
      categoryBrands: { ...details.categoryBrands, [category]: created.id },
    };
    onBrandCatalogChange(brands);
    onChange(nextDetails);
    return { brand: created, brands, details: nextDetails };
  }

  function updateBrandPrice(
    category: AccessoryBrandCategory,
    patch: Partial<Pick<AccessoryBrand, "unitPrice" | "sizePrices">>
  ) {
    if (!onBrandCatalogChange) return;
    const resolved = ensureBrand(category);
    if (!resolved) {
      onNotify?.("لا يوجد سعر مرتبط بهذه الفئة");
      return;
    }
    const nextBrands = resolved.brands.map((b) =>
      b.id === resolved.brand.id ? { ...b, ...patch } : b
    );
    onBrandCatalogChange(nextBrands);
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
    const gap = Math.max(0, details.espagnoletteSashDeductionMm || 200);
    const entry: EspagnoletteCatalogEntry = {
      id: newEspagnoletteCatalogId(),
      size,
      maxHeightMm: size * 10 + gap,
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
      onNotify?.("يلزم مقاس واحد على الأقل");
      return;
    }
    patchDetails({
      espagnoletteCatalog: details.espagnoletteCatalog.filter((e) => e.id !== id),
    });
  }

  function setSizePrice(
    category: "hinged-espagnolette" | "sliding-espagnolette",
    size: number,
    raw: string
  ) {
    const brand = resolveBrandForCategory(category, details, brandCatalog);
    const next = { ...(brand?.sizePrices ?? {}) };
    if (raw === "") delete next[size];
    else {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) next[size] = n;
      else return;
    }
    updateBrandPrice(category, { sizePrices: next });
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
      onNotify?.("يلزم قطعة سكاك واحدة على الأقل");
      return;
    }
    patchDetails({ [key]: list });
  }

  const hingedBrand = resolveBrandForCategory(
    "hinged-espagnolette",
    details,
    brandCatalog
  );
  const slidingBrand = resolveBrandForCategory(
    "sliding-espagnolette",
    details,
    brandCatalog
  );

  const sablonPricedCount = useMemo(() => {
    let n = 0;
    for (const entry of details.espagnoletteCatalog) {
      if (entry.hinged && (hingedBrand?.sizePrices?.[entry.size] ?? 0) > 0) n += 1;
      if (entry.sliding && (slidingBrand?.sizePrices?.[entry.size] ?? 0) > 0)
        n += 1;
    }
    return n;
  }, [details.espagnoletteCatalog, hingedBrand, slidingBrand]);

  const gapClass = compact ? "gap-2" : "gap-3";
  const formTabs = compact
    ? ACCESSORY_FORM_TABS.filter((t) => t.id !== "prices")
    : ACCESSORY_FORM_TABS;

  return (
    <div className={`flex flex-col ${gapClass}`}>
      <MaterialSectionTabs
        tabs={formTabs}
        active={compact && tab === "prices" ? "sablons" : tab}
        onChange={setTab}
        label="أقسام الاكسسوار"
      />

      {show("prices") && onBrandCatalogChange ? (
        <Section
          title="أسعار القطع"
          hint="هذه الأسعار تدخل تكلفة البند والبيع مباشرة عند الرسم. أسعار السبلونة من تبويب «السبلونات»."
          compact={compact}
        >
          {(["hinged", "door", "bouclier", "sliding"] as const).map((group) => {
            const cats = ACCESSORY_BRAND_CATEGORIES.filter(
              (c) => c.group === group && !isEspagnoletteCategory(c.id)
            );
            if (cats.length === 0) return null;
            const groupLabel =
              group === "hinged"
                ? "مفصلي (شباك)"
                : group === "door"
                  ? "باب مفصلي"
                  : group === "bouclier"
                    ? "بوكلير"
                    : "جرار";
            return (
              <div key={group} className="space-y-2">
                <p className="text-[11px] font-bold text-foreground">
                  {groupLabel}
                </p>
                <div className="space-y-2">
                  {cats.map((cat) => {
                    const brand = resolveBrandForCategory(
                      cat.id,
                      details,
                      brandCatalog
                    );
                    return (
                      <UnitPriceRow
                        key={cat.id}
                        label={cat.label}
                        unitHint={
                          cat.id === "track" || cat.id === "brush"
                            ? "ج.م/م"
                            : "ج.م"
                        }
                        value={brand?.unitPrice}
                        onChange={(raw) => {
                          if (raw === "") {
                            updateBrandPrice(cat.id, { unitPrice: undefined });
                            return;
                          }
                          const n = Number(raw);
                          if (Number.isFinite(n) && n >= 0) {
                            updateBrandPrice(cat.id, { unitPrice: n });
                          }
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Section>
      ) : null}

      {show("sablons") ? (
        <Section
          title="السبلونات — مقاسات وأسعار"
          hint={
            onBrandCatalogChange
              ? "سجّل سعر كل مقاس هنا. عند الرسم يختار البرنامج المقاس المناسب حسب ارتفاع الضلفة، ويحسب التكلفة والبيع تلقائياً."
              : "قواعد المقاسات لهذا المشروع — الأسعار من كتالوج الخامات."
          }
          compact={compact}
        >
          <div className="rounded-xl border border-primary/25 bg-primary-soft/50 px-3 py-2.5 text-[11px] leading-relaxed text-foreground">
            <p className="font-semibold text-primary">كيف تُحسب السبلونة؟</p>
            <p className="mt-1 text-muted">
              طول السبلونة ≈ ارتفاع الضلفة − الفرق أدناه. يُختار أكبر مقاس مفعّل
              ≤ هذا الطول، ويُضرب سعره في عدد الضلف.
              {onBrandCatalogChange
                ? ` · مسجّل: ${sablonPricedCount} سعر مقاس`
                : ""}
            </p>
          </div>

          <NumberField
            label="فرق السبلونة عن الضلفة (مم)"
            value={details.espagnoletteSashDeductionMm}
            onChange={(v) => patchDetails({ espagnoletteSashDeductionMm: v })}
            hint="٢٠٠ = ٢٠ سم"
          />

          {onBrandCatalogChange ? (
            <div className="flex flex-wrap justify-end gap-1.5">
              <button
                type="button"
                onClick={addCatalogEntry}
                className="rounded-lg border border-primary/40 bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary"
              >
                + مقاس
              </button>
              <button
                type="button"
                onClick={() =>
                  patchDetails({
                    espagnoletteCatalog: defaultEspagnoletteCatalog(),
                  })
                }
                className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-muted"
              >
                استعادة القياسي
              </button>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-border bg-background/70 text-[11px]">
            <div
              className={`grid min-w-[520px] border-b border-border bg-card/80 text-center font-semibold text-muted ${
                onBrandCatalogChange
                  ? "grid-cols-[0.7fr_1fr_1fr_0.55fr_0.55fr_0.45fr]"
                  : "grid-cols-[0.9fr_1fr_0.6fr_0.6fr]"
              }`}
            >
              <span className="px-2 py-2">مقاس سم</span>
              {onBrandCatalogChange ? (
                <>
                  <span className="px-2 py-2">سعر مفصلي</span>
                  <span className="px-2 py-2">سعر جرار</span>
                </>
              ) : (
                <span className="px-2 py-2">أقصى ارتفاع مم</span>
              )}
              <span className="px-2 py-2">مفصلي</span>
              <span className="px-2 py-2">جرار</span>
              {onBrandCatalogChange ? <span className="px-2 py-2" /> : null}
            </div>
            {details.espagnoletteCatalog.map((entry, i) => (
              <div
                key={entry.id}
                className={`grid min-w-[520px] items-center text-center ${
                  onBrandCatalogChange
                    ? "grid-cols-[0.7fr_1fr_1fr_0.55fr_0.55fr_0.45fr]"
                    : "grid-cols-[0.9fr_1fr_0.6fr_0.6fr]"
                } ${i > 0 ? "border-t border-border/70" : ""}`}
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
                    onChange={(size) => {
                      const gap = Math.max(
                        0,
                        details.espagnoletteSashDeductionMm || 200
                      );
                      updateCatalogEntry(entry.id, {
                        size,
                        maxHeightMm: size * 10 + gap,
                      });
                    }}
                    className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm font-bold outline-none focus:border-primary"
                  />
                </div>
                {onBrandCatalogChange ? (
                  <>
                    <div className="p-1.5">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        dir="ltr"
                        disabled={!entry.hinged}
                        value={
                          entry.hinged
                            ? (hingedBrand?.sizePrices?.[entry.size] ?? "")
                            : ""
                        }
                        onChange={(e) =>
                          setSizePrice(
                            "hinged-espagnolette",
                            entry.size,
                            e.target.value
                          )
                        }
                        placeholder="—"
                        aria-label={`سعر سبلونة مفصلي ${entry.size}`}
                        className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-left text-sm outline-none focus:border-primary disabled:opacity-40"
                      />
                    </div>
                    <div className="p-1.5">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        dir="ltr"
                        disabled={!entry.sliding}
                        value={
                          entry.sliding
                            ? (slidingBrand?.sizePrices?.[entry.size] ?? "")
                            : ""
                        }
                        onChange={(e) =>
                          setSizePrice(
                            "sliding-espagnolette",
                            entry.size,
                            e.target.value
                          )
                        }
                        placeholder="—"
                        aria-label={`سعر سبلونة جرار ${entry.size}`}
                        className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-left text-sm outline-none focus:border-primary disabled:opacity-40"
                      />
                    </div>
                  </>
                ) : (
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
                      className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                )}
                <div className="flex justify-center p-1.5">
                  <input
                    type="checkbox"
                    checked={entry.hinged}
                    onChange={(e) =>
                      updateCatalogEntry(entry.id, {
                        hinged: e.target.checked,
                      })
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
                      updateCatalogEntry(entry.id, {
                        sliding: e.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-[var(--primary)]"
                    aria-label={`جرار ${entry.size}`}
                  />
                </div>
                {onBrandCatalogChange ? (
                  <div className="p-1.5">
                    <button
                      type="button"
                      onClick={() => removeCatalogEntry(entry.id)}
                      className="rounded-md border border-border px-1.5 py-1 text-[10px] text-red-600"
                    >
                      حذف
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted">
            السعر بالجنيه للمقاس الواحد. الباب المفصلي لا يستخدم سبلونة.
          </p>
        </Section>
      ) : null}

      {show("rules") ? (
        <Section
          title="قواعد الحساب"
          hint="أرقام بسيطة: كام مفصلة · كام عجل — تدخل كمية الاكسسوار في البند"
          compact={compact}
        >
          <p className="text-[11px] font-bold text-foreground">مفصلي</p>
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

          <p className="pt-1 text-[11px] font-bold text-foreground">
            باب مفصلي — دون سبلونة/سكاك
          </p>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="كالون / باب"
              value={details.cylindersPerDoor}
              onChange={(v) => patchDetails({ cylindersPerDoor: v })}
            />
            <NumberField
              label="مقبض إشارة / باب"
              value={details.signalHandlesPerDoor}
              onChange={(v) => patchDetails({ signalHandlesPerDoor: v })}
            />
            <NumberField
              label="وش تسكيك / باب"
              value={details.escutcheonsPerDoor}
              onChange={(v) => patchDetails({ escutcheonsPerDoor: v })}
            />
          </div>
          <p className="text-[10px] text-muted">
            لون مقبض الإشارة يتبع لون إطار/باب البند
          </p>

          <p className="pt-1 text-[11px] font-bold text-foreground">
            جرار — التراك مع الحديد
          </p>
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
          </div>
          <p className="text-[10px] text-muted">
            فرق السبلونة عن الضلفة يُعدَّل من تبويب «السبلونات».
          </p>
        </Section>
      ) : null}

      {show("advanced") ? (
        <Section
          title="سكاك وفرش"
          hint="إن لم تحتج إلى تعديل هذه التفاصيل فاتركها كما هي"
          compact={compact}
        >
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="فرش × محيط الضلفة"
              value={details.brushSashPerimeterMultiplier}
              onChange={(v) =>
                patchDetails({ brushSashPerimeterMultiplier: v })
              }
              step={0.5}
            />
            <NumberField
              label="فرش × ارتفاع السكينة"
              value={details.brushKnifeHeightMultiplier}
              onChange={(v) =>
                patchDetails({ brushKnifeHeightMultiplier: v })
              }
              step={0.5}
            />
          </div>

          <LockPiecesEditor
            title="سكاك مفصلي"
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
            title="سكاك بوكلير"
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
          <LockPiecesEditor
            title="سكاك ترباس"
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
          <LockPiecesEditor
            title="سكاك جرار"
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
      ) : null}
    </div>
  );
}

function UnitPriceRow({
  label,
  value,
  unitHint,
  onChange,
}: {
  label: string;
  value?: number;
  unitHint: string;
  onChange: (raw: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-2">
      <span className="min-w-0 flex-1 text-[12px] font-medium text-foreground">
        {label}
      </span>
      <input
        type="number"
        min={0}
        step="any"
        dir="ltr"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className="w-24 rounded-lg border border-border bg-card px-2 py-1.5 text-left text-sm outline-none focus:border-primary"
      />
      <span className="shrink-0 text-[10px] text-muted">{unitHint}</span>
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
        {hint ? <p className="mt-0.5 text-[11px] text-muted">{hint}</p> : null}
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
