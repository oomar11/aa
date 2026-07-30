"use client";

import Link from "next/link";
import { ScreenBack } from "@/components/ScreenBack";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  ACCESSORY_PIECE_ROLES,
  accessoryRoleLabel,
  defaultAccessoryDetails,
  defaultAccessoryHingedRules,
  defaultAccessorySlidingRules,
  DEFAULT_ESPAGNOLETTE_SIZES_CM,
  findSystem,
  loadMaterialCatalog,
  newPieceId,
  saveMaterialCatalog,
  upsertSystem,
  type AccessoryHingedRules,
  type AccessoryPiece,
  type AccessoryPieceRole,
  type AccessorySlidingRules,
  type AccessorySystemDetails,
  type MaterialCatalog,
  type MaterialSystem,
} from "@/lib/material-systems";

type Props = {
  systemId: string;
};

type PieceDraft = {
  id: string;
  name: string;
  role: AccessoryPieceRole;
  unitPrice: string;
  notes: string;
};

function toPieceDraft(p: AccessoryPiece): PieceDraft {
  return {
    id: p.id,
    name: p.name,
    role: p.role,
    unitPrice: p.unitPrice != null ? String(p.unitPrice) : "",
    notes: p.notes ?? "",
  };
}

function parsePiece(draft: PieceDraft): AccessoryPiece | null {
  const name = draft.name.trim();
  if (!name) return null;
  const price = Number(draft.unitPrice);
  return {
    id: draft.id,
    name,
    role: draft.role,
    unitPrice: Number.isFinite(price) && price >= 0 ? price : undefined,
    notes: draft.notes.trim() || undefined,
  };
}

function sizesToString(sizes: number[]): string {
  return sizes.join(", ");
}

function parseSizes(raw: string, fallback: number[]): number[] {
  const parts = raw
    .split(/[,،\s]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (parts.length === 0) return [...fallback];
  return [...new Set(parts)].sort((a, b) => a - b);
}

function NumField({
  label,
  value,
  onChange,
  hint,
  min = 0,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
  min?: number;
  step?: number;
}) {
  return (
    <label className="block text-[11px] text-muted">
      {label}
      {hint ? (
        <span className="mt-0.5 block text-[10px] font-normal text-muted/80">
          {hint}
        </span>
      ) : null}
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

export function AccessorySystemDetailEditor({ systemId }: Props) {
  const [system, setSystem] = useState<MaterialSystem | null>(null);
  const [hinged, setHinged] = useState<AccessoryHingedRules>(
    defaultAccessoryHingedRules()
  );
  const [sliding, setSliding] = useState<AccessorySlidingRules>(
    defaultAccessorySlidingRules()
  );
  const [hingedSizesText, setHingedSizesText] = useState(
    sizesToString([...DEFAULT_ESPAGNOLETTE_SIZES_CM])
  );
  const [slidingSizesText, setSlidingSizesText] = useState(
    sizesToString([...DEFAULT_ESPAGNOLETTE_SIZES_CM])
  );
  const [pieces, setPieces] = useState<PieceDraft[]>([]);
  const [flash, setFlash] = useState<string | null>(null);

  const reload = useCallback(() => {
    const catalog = loadMaterialCatalog();
    const found = findSystem("accessories", systemId, catalog);
    if (!found) {
      setSystem(null);
      return;
    }
    const details = found.accessory ?? defaultAccessoryDetails();
    setSystem(found);
    setHinged(details.hinged);
    setSliding(details.sliding);
    setHingedSizesText(sizesToString(details.hinged.espagnoletteSizesCm));
    setSlidingSizesText(sizesToString(details.sliding.espagnoletteSizesCm));
    setPieces(details.pieces.map(toPieceDraft));
  }, [systemId]);

  useEffect(() => {
    queueMicrotask(reload);
  }, [reload]);

  const showFlash = useCallback((msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 1800);
  }, []);

  function persist(
    nextHinged: AccessoryHingedRules,
    nextSliding: AccessorySlidingRules,
    nextPieces: AccessoryPiece[]
  ) {
    if (!system) return;
    const catalog = loadMaterialCatalog();
    const accessory: AccessorySystemDetails = {
      hinged: nextHinged,
      sliding: nextSliding,
      pieces: nextPieces,
    };
    const updated: MaterialSystem = { ...system, accessory };
    const saved = saveMaterialCatalog(
      upsertSystem(catalog, "accessories", updated)
    );
    const refreshed = findSystem("accessories", systemId, saved);
    if (refreshed) setSystem(refreshed);
    showFlash("تم الحفظ");
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!system) return;

    const parsedPieces: AccessoryPiece[] = [];
    for (const draft of pieces) {
      const p = parsePiece(draft);
      if (p) parsedPieces.push(p);
    }

    const nextHinged: AccessoryHingedRules = {
      ...hinged,
      espagnoletteSizesCm: parseSizes(
        hingedSizesText,
        defaultAccessoryHingedRules().espagnoletteSizesCm
      ),
    };
    const nextSliding: AccessorySlidingRules = {
      ...sliding,
      espagnoletteSizesCm: parseSizes(
        slidingSizesText,
        defaultAccessorySlidingRules().espagnoletteSizesCm
      ),
    };

    persist(nextHinged, nextSliding, parsedPieces);
    setHinged(nextHinged);
    setSliding(nextSliding);
  }

  function updatePiece(idx: number, patch: Partial<PieceDraft>) {
    setPieces((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, ...patch } : p))
    );
  }

  function addPiece() {
    const role = ACCESSORY_PIECE_ROLES[0]!.id;
    setPieces((prev) => [
      ...prev,
      {
        id: newPieceId(),
        name: accessoryRoleLabel(role),
        role,
        unitPrice: "",
        notes: "",
      },
    ]);
  }

  function removePiece(idx: number) {
    setPieces((prev) => prev.filter((_, i) => i !== idx));
  }

  if (!system) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted">
        النظام مش موجود
      </div>
    );
  }

  const groupedRoles = {
    hinged: ACCESSORY_PIECE_ROLES.filter((r) => r.group === "hinged"),
    bouclier: ACCESSORY_PIECE_ROLES.filter((r) => r.group === "bouclier"),
    sliding: ACCESSORY_PIECE_ROLES.filter((r) => r.group === "sliding"),
    meeting: ACCESSORY_PIECE_ROLES.filter((r) => r.group === "meeting"),
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-3">
      <div className="px-1 text-right">
        <h2 className="text-lg font-bold text-foreground">{system.name}</h2>
        <p className="mt-0.5 text-xs text-muted">
          قواعد اكسسوار المفصلي والجرار والبوكلير
        </p>
      </div>

      {flash ? (
        <p className="rounded-xl border border-primary/30 bg-primary-soft px-3 py-2 text-center text-xs font-semibold text-primary">
          {flash}
        </p>
      ) : null}

      {/* مفصلي */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-3">
        <h3 className="text-xs font-bold text-foreground">اكسسوار المفصلي</h3>
        <p className="text-[11px] leading-relaxed text-muted">
          كل ضلفة مفصلي: {hinged.hingesPerSash} مفصلة بنفس لون الشباك · سبلونة
          بمقاس الضلفة من ناحية المقبض · سكاك مفصلي · مقبض بارز لكل سبلونة.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <NumField
            label="مفصلات / ضلفة"
            value={hinged.hingesPerSash}
            onChange={(n) => setHinged((h) => ({ ...h, hingesPerSash: n }))}
          />
          <NumField
            label="سكاك / مفصلة"
            value={hinged.screwsPerSashPerHinge}
            onChange={(n) =>
              setHinged((h) => ({ ...h, screwsPerSashPerHinge: n }))
            }
          />
          <NumField
            label="عدد السكاك في العبوة"
            value={hinged.screwPackQty}
            onChange={(n) => setHinged((h) => ({ ...h, screwPackQty: n }))}
          />
          <NumField
            label="مقبض بارز / سبلونة"
            value={hinged.handlesPerEspagnolette}
            onChange={(n) =>
              setHinged((h) => ({ ...h, handlesPerEspagnolette: n }))
            }
          />
        </div>
        <label className="block text-[11px] text-muted">
          مقاسات السبلونة (سم) — مفصولة بفاصلة
          <input
            type="text"
            value={hingedSizesText}
            onChange={(e) => setHingedSizesText(e.target.value)}
            placeholder="40, 60, 80, 100, 140, 160, 180"
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
      </section>

      {/* بوكلير */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-3">
        <h3 className="text-xs font-bold text-foreground">اكسسوار البوكلير</h3>
        <p className="text-[11px] leading-relaxed text-muted">
          ضلفتين مفصلي بينهم بوكلير: سبلونة واحدة مشتركة · سكاك بوكلير بدل سكاك
          مفصلي · ترباس · طقم طبة بنفس لون البوكلير.
        </p>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={hinged.bouclierSharedEspagnolette}
            onChange={(e) =>
              setHinged((h) => ({
                ...h,
                bouclierSharedEspagnolette: e.target.checked,
              }))
            }
            className="h-4 w-4 accent-[var(--primary)]"
          />
          سبلونة مشتركة بين الضلفتين
        </label>
        <div className="grid grid-cols-2 gap-2">
          <NumField
            label="سكاك بوكلير / وحدة"
            value={hinged.bouclierScrewsPerUnit}
            onChange={(n) =>
              setHinged((h) => ({ ...h, bouclierScrewsPerUnit: n }))
            }
          />
          <NumField
            label="بدل سكاك مفصلي"
            value={hinged.bouclierReplacesHingeScrews}
            onChange={(n) =>
              setHinged((h) => ({ ...h, bouclierReplacesHingeScrews: n }))
            }
            hint="عدد السكاك اللي بتتشال"
          />
          <NumField
            label="ترباس / بوكلير"
            value={hinged.bouclierBoltsPerUnit}
            onChange={(n) =>
              setHinged((h) => ({ ...h, bouclierBoltsPerUnit: n }))
            }
          />
          <NumField
            label="طقم طبة / بوكلير"
            value={hinged.bouclierCapSetsPerUnit}
            onChange={(n) =>
              setHinged((h) => ({ ...h, bouclierCapSetsPerUnit: n }))
            }
          />
        </div>
      </section>

      {/* جرار */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-3">
        <h3 className="text-xs font-bold text-foreground">اكسسوار الجرار</h3>
        <p className="text-[11px] leading-relaxed text-muted">
          تراك على الحلق (٢× عرض الحلق) · عجلتين لكل ضلفة · فرش يلف الضلفة مرتين
          (طوله = ارتفاع الضلفة مرة) · سبلونة وسكاك جرار.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <NumField
            label="تراك / عرض الحلق"
            value={sliding.tracksPerFrameWidth}
            onChange={(n) =>
              setSliding((s) => ({ ...s, tracksPerFrameWidth: n }))
            }
          />
          <NumField
            label="عجلات / ضلفة"
            value={sliding.wheelsPerSash}
            onChange={(n) => setSliding((s) => ({ ...s, wheelsPerSash: n }))}
          />
          <NumField
            label="لفات الفرش"
            value={sliding.brushWraps}
            onChange={(n) => setSliding((s) => ({ ...s, brushWraps: n || 2 }))}
            hint="٢ = طول الفرش = ارتفاع الضلفة"
          />
          <NumField
            label="سكاك / سبلونة"
            value={sliding.screwsPerSashPerEspagnolette}
            onChange={(n) =>
              setSliding((s) => ({ ...s, screwsPerSashPerEspagnolette: n }))
            }
          />
        </div>
        <label className="block text-[11px] text-muted">
          مقاسات سبلونة الجرار (سم)
          <input
            type="text"
            value={slidingSizesText}
            onChange={(e) => setSlidingSizesText(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={sliding.meetingPieceFor4Sashes}
              onChange={(e) =>
                setSliding((s) => ({
                  ...s,
                  meetingPieceFor4Sashes: e.target.checked,
                }))
              }
              className="h-4 w-4 accent-[var(--primary)]"
            />
            تقابل ٤ ضلف — قطعة واحدة بطول الضلفة
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={sliding.meetingPieceFor2MeshSliding}
              onChange={(e) =>
                setSliding((s) => ({
                  ...s,
                  meetingPieceFor2MeshSliding: e.target.checked,
                }))
              }
              className="h-4 w-4 accent-[var(--primary)]"
            />
            تقابل سلك جرار لضلفتين في نفس الفتحة
          </label>
        </div>
      </section>

      {/* أسعار القطع */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-foreground">أسعار القطع</h3>
            <p className="mt-0.5 text-[11px] text-muted">
              سعر الوحدة أو المتر — اختياري للتكلفة
            </p>
          </div>
          <button
            type="button"
            onClick={addPiece}
            className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground"
          >
            + قطعة
          </button>
        </div>

        {(["hinged", "bouclier", "sliding", "meeting"] as const).map(
          (group) => {
            const roles = groupedRoles[group];
            const groupPieces = pieces.filter((p) =>
              roles.some((r) => r.id === p.role)
            );
            if (groupPieces.length === 0) return null;
            const groupLabel =
              group === "hinged"
                ? "مفصلي"
                : group === "bouclier"
                  ? "بوكلير"
                  : group === "sliding"
                    ? "جرار"
                    : "تقابل";
            return (
              <div key={group} className="space-y-2">
                <p className="text-[11px] font-semibold text-foreground">
                  {groupLabel}
                </p>
                {pieces.map((draft, idx) => {
                  if (!roles.some((r) => r.id === draft.role)) return null;
                  return (
                    <div
                      key={draft.id}
                      className="space-y-2 rounded-xl border border-border/80 bg-background/70 p-2.5"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <label className="col-span-2 block text-[11px] text-muted">
                          الاسم
                          <input
                            type="text"
                            value={draft.name}
                            onChange={(e) =>
                              updatePiece(idx, { name: e.target.value })
                            }
                            className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"
                          />
                        </label>
                        <label className="block text-[11px] text-muted">
                          النوع
                          <select
                            value={draft.role}
                            onChange={(e) =>
                              updatePiece(idx, {
                                role: e.target.value as AccessoryPieceRole,
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                          >
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-[11px] text-muted">
                          السعر (ج.م)
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={draft.unitPrice}
                            onChange={(e) =>
                              updatePiece(idx, { unitPrice: e.target.value })
                            }
                            placeholder="0"
                            className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePiece(idx)}
                        className="text-[11px] font-medium text-red-600"
                      >
                        حذف
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          }
        )}
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/materials/accessories"
          className="flex h-11 items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold"
        >
          رجوع
        </Link>
        <button
          type="submit"
          className="h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          حفظ الإعدادات
        </button>
      </div>
    </form>
  );
}
