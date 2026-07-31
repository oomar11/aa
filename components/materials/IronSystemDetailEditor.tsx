"use client";

import { MaterialSectionTabs } from "@/components/materials/MaterialSectionTabs";
import { NumericInput } from "@/components/ui/NumericInput";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  DEFAULT_BAR_LENGTH_M,
  defaultIronDetails,
  defaultIronDeductions,
  getIronSystem,
  ironDeductionSummary,
  ironDeductionsFromOffsets,
  ironOffsetMmFromFormula,
  ironPieceBarPrice,
  ironPiecePricePerM,
  ironPiecePriceSummary,
  ironRoleHint,
  IRON_PIECE_ROLES,
  loadMaterialCatalog,
  profileBarPricePerM,
  saveMaterialCatalog,
  SINGLE_IRON_SYSTEM_ID,
  upsertSystem,
  type IronDeductions,
  type IronPiece,
  type IronPieceRole,
  type IronSystemDetails,
  type MaterialCatalog,
  type MaterialSystem,
} from "@/lib/material-systems";
import { ensureEqualsPrefix, evaluateFormula } from "@/lib/excel-formula";

type Props = {
  /** يُتجاهل — الحديد سيستم واحد */
  systemId?: string;
};

type IronTab = "meta" | "pieces" | "cuts";

const TABS: { id: IronTab; label: string }[] = [
  { id: "meta", label: "بيانات" },
  { id: "pieces", label: "العيدان" },
  { id: "cuts", label: "التخصيم" },
];

type DeductOffsets = {
  frameW: number;
  frameH: number;
  sashW: number;
  sashH: number;
  mullion: number;
  hingeStrip: number;
};

function offsetsFromDeductions(d: IronDeductions): DeductOffsets {
  return {
    frameW: ironOffsetMmFromFormula(d.frame.width),
    frameH: ironOffsetMmFromFormula(d.frame.height),
    sashW: ironOffsetMmFromFormula(d.sash.width),
    sashH: ironOffsetMmFromFormula(d.sash.height),
    mullion: ironOffsetMmFromFormula(d.mullion),
    hingeStrip: ironOffsetMmFromFormula(
      d.hingeStrip?.trim() || d.sash.height
    ),
  };
}

function pieceByRole(
  pieces: IronPiece[],
  role: IronPieceRole
): IronPiece | undefined {
  return pieces.find((p) => p.role === role);
}

function upsertPiece(
  pieces: IronPiece[],
  role: IronPieceRole,
  patch: Partial<IronPiece>
): IronPiece[] {
  const existing = pieceByRole(pieces, role);
  if (existing) {
    return pieces.map((p) =>
      p.role === role ? { ...p, ...patch, role } : p
    );
  }
  const fallback = defaultIronDetails().pieces.find((p) => p.role === role)!;
  return [
    ...pieces,
    {
      ...fallback,
      ...patch,
      role,
      id: fallback.id,
      name: patch.name ?? fallback.name,
      enabled: patch.enabled ?? true,
      sectionWidthMm: patch.sectionWidthMm ?? fallback.sectionWidthMm,
      sectionHeightMm: patch.sectionHeightMm ?? fallback.sectionHeightMm,
      barLengthM: patch.barLengthM ?? fallback.barLengthM,
    },
  ];
}

function evalPreviewMm(
  formula: string,
  vars: Record<string, number>
): number {
  const result = evaluateFormula(ensureEqualsPrefix(formula), vars);
  if (!result.ok) return 0;
  return Math.max(0, Math.round(result.value));
}

export function IronSystemDetailEditor({ systemId: _systemId }: Props) {
  const [catalog, setCatalog] = useState<MaterialCatalog | null>(null);
  const [system, setSystem] = useState<MaterialSystem | null>(null);
  const [systemName, setSystemName] = useState("");
  const [systemNotes, setSystemNotes] = useState("");
  const [pieces, setPieces] = useState<IronPiece[]>([]);
  const [deductions, setDeductions] =
    useState<IronDeductions>(defaultIronDeductions);
  const [tracksPerFrame, setTracksPerFrame] = useState(2);
  const [offsets, setOffsets] = useState<DeductOffsets>(() =>
    offsetsFromDeductions(defaultIronDeductions())
  );
  const [previewW, setPreviewW] = useState(1200);
  const [previewH, setPreviewH] = useState(1400);
  const [flash, setFlash] = useState<string | null>(null);
  const [tab, setTab] = useState<IronTab>("cuts");

  const showFlash = useCallback((msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 1800);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      const cat = loadMaterialCatalog();
      setCatalog(cat);
      const found = getIronSystem(cat);
      const details = found.iron ?? defaultIronDetails();
      setSystem(found);
      setSystemName(found.name);
      setSystemNotes(found.notes ?? "");
      setPieces(details.pieces);
      setDeductions(details.deductions);
      setTracksPerFrame(details.tracksPerFrame ?? 2);
      setOffsets(offsetsFromDeductions(details.deductions));
    });
  }, []);

  function persistIron(
    nextPieces: IronPiece[],
    nextDeductions: IronDeductions,
    nextTracks = tracksPerFrame,
    name = systemName,
    notes = systemNotes
  ) {
    if (!catalog || !system) return;
    const iron: IronSystemDetails = {
      pieces: nextPieces,
      deductions: nextDeductions,
      tracksPerFrame: Math.max(0, Math.round(nextTracks) || 0),
    };
    const nextSystem: MaterialSystem = {
      ...system,
      id: SINGLE_IRON_SYSTEM_ID,
      name: name.trim() || system.name,
      notes: notes.trim() || undefined,
      iron,
    };
    const saved = saveMaterialCatalog(
      upsertSystem(catalog, "iron", nextSystem)
    );
    setCatalog(saved);
    const refreshed = getIronSystem(saved);
    setSystem(refreshed);
    const details = refreshed.iron ?? defaultIronDetails();
    setPieces(details.pieces);
    setDeductions(details.deductions);
    setTracksPerFrame(details.tracksPerFrame ?? 2);
    setOffsets(offsetsFromDeductions(details.deductions));
  }

  function saveMeta(e: FormEvent) {
    e.preventDefault();
    persistIron(pieces, deductions);
    showFlash("تم حفظ البيانات");
  }

  function saveCuts(e: FormEvent) {
    e.preventDefault();
    const next = ironDeductionsFromOffsets(offsets);
    setDeductions(next);
    persistIron(pieces, next, tracksPerFrame);
    showFlash("تم حفظ التخصيم");
  }

  function patchPiece(role: IronPieceRole, patch: Partial<IronPiece>) {
    const next = upsertPiece(pieces, role, patch);
    setPieces(next);
    persistIron(next, deductions);
  }

  if (!system) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted">
        جاري التحميل…
      </div>
    );
  }

  const fw = previewW;
  const fh = previewH;
  const ironFrameW = evalPreviewMm(deductions.frame.width, {
    W: fw,
    H: fh,
    FW: fw,
    FH: fh,
  });
  const ironFrameH = evalPreviewMm(deductions.frame.height, {
    W: fw,
    H: fh,
    FW: fw,
    FH: fh,
  });
  const ironSashW = evalPreviewMm(deductions.sash.width, {
    W: fw,
    H: fh,
    FW: fw,
    FH: fh,
    SW: fw,
    SH: fh,
  });
  const ironSashH = evalPreviewMm(deductions.sash.height, {
    W: fw,
    H: fh,
    FW: fw,
    FH: fh,
    SW: fw,
    SH: fh,
  });
  const hingeStripH = evalPreviewMm(
    deductions.hingeStrip?.trim() || deductions.sash.height,
    { W: fh, H: fh, FW: fw, FH: fh, SW: fh, SH: fh }
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="px-1">
        <h2 className="text-lg font-bold text-foreground">{system.name}</h2>
        <p className="mt-0.5 text-xs text-muted">
          سيستم واحد لكل الشغل · تسعير بالعود · تراك · شريحة مفصلة
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

      <MaterialSectionTabs
        tabs={TABS}
        active={tab}
        onChange={setTab}
        label="أقسام نظام الحديد"
      />

      {tab === "meta" ? (
        <form
          onSubmit={saveMeta}
          className="space-y-3 rounded-2xl border border-border bg-card p-3"
        >
          <h3 className="text-xs font-bold text-foreground">بيانات النظام</h3>
          <input
            type="text"
            value={systemName}
            onChange={(e) => setSystemName(e.target.value)}
            placeholder="اسم نظام الحديد"
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
          <button
            type="submit"
            className="h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            حفظ
          </button>
        </form>
      ) : null}

      {tab === "pieces" ? (
        <section className="space-y-2">
          <p className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs leading-relaxed text-muted">
            تسعير بالعود زي القطاعات: سعر العود ÷ طول العود = سعر المتر، ومنها
            تكلفة التسليح في التصميم.
          </p>
          <ul className="overflow-hidden rounded-2xl border border-border bg-card">
            {IRON_PIECE_ROLES.map((role, i) => {
              const piece = pieceByRole(pieces, role.id) ?? {
                id: `iron-${role.id}`,
                name: role.label,
                role: role.id,
                sectionWidthMm: role.id === "track" ? 0 : 40,
                sectionHeightMm: role.id === "track" ? 0 : 20,
                barLengthM: DEFAULT_BAR_LENGTH_M,
                enabled: true,
              };
              const isTrack = role.id === "track";
              const barPrice = ironPieceBarPrice(piece);
              const perM = ironPiecePricePerM(piece);
              const priceHint = ironPiecePriceSummary(piece);
              return (
                <li
                  key={role.id}
                  className={`space-y-2 px-3 py-3 ${i > 0 ? "border-t border-border" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={piece.enabled}
                      onChange={(e) =>
                        patchPiece(role.id, { enabled: e.target.checked })
                      }
                      className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
                      aria-label={`تفعيل ${role.label}`}
                    />
                    <div className="min-w-0 flex-1 text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {role.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {ironRoleHint(role.id)}
                      </p>
                      {priceHint ? (
                        <p className="mt-1 text-[11px] font-medium text-primary">
                          {priceHint}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {piece.enabled ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {!isTrack ? (
                        <>
                          <label className="block text-[10px] text-muted">
                            عرض المقطع (مم)
                            <NumericInput
                              min={0}
                              value={piece.sectionWidthMm}
                              onChange={(v) =>
                                patchPiece(role.id, { sectionWidthMm: v })
                              }
                              className="mt-0.5 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                            />
                          </label>
                          <label className="block text-[10px] text-muted">
                            ارتفاع المقطع (مم)
                            <NumericInput
                              min={0}
                              value={piece.sectionHeightMm}
                              onChange={(v) =>
                                patchPiece(role.id, { sectionHeightMm: v })
                              }
                              className="mt-0.5 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                            />
                          </label>
                        </>
                      ) : null}
                      <label className="block text-[10px] text-muted">
                        طول العود (م)
                        <NumericInput
                          min={0.1}
                          step={0.1}
                          fallback={DEFAULT_BAR_LENGTH_M}
                          blankZero={false}
                          value={piece.barLengthM}
                          onChange={(v) => {
                            const barLengthM = v > 0 ? v : DEFAULT_BAR_LENGTH_M;
                            const nextBar = ironPieceBarPrice({
                              ...piece,
                              barLengthM,
                            });
                            patchPiece(role.id, {
                              barLengthM,
                              barPrice: nextBar > 0 ? nextBar : undefined,
                              pricePerM:
                                nextBar > 0
                                  ? profileBarPricePerM(nextBar, barLengthM)
                                  : undefined,
                            });
                          }}
                          className="mt-0.5 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                        />
                      </label>
                      <label className="block text-[10px] text-muted">
                        سعر العود (ج.م)
                        <NumericInput
                          min={0}
                          step={1}
                          value={barPrice}
                          onChange={(v) => {
                            const next = v > 0 ? v : undefined;
                            const len =
                              piece.barLengthM > 0
                                ? piece.barLengthM
                                : DEFAULT_BAR_LENGTH_M;
                            patchPiece(role.id, {
                              barPrice: next,
                              pricePerM:
                                next != null
                                  ? profileBarPricePerM(next, len)
                                  : undefined,
                            });
                          }}
                          className="mt-0.5 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                        />
                      </label>
                      <label className="block text-[10px] text-muted">
                        سعر المتر (محسوب)
                        <input
                          readOnly
                          value={perM > 0 ? String(perM) : "—"}
                          className="mt-0.5 w-full rounded-lg border border-border bg-background/60 px-2 py-1.5 text-xs text-muted outline-none"
                          aria-label="سعر المتر المحسوب"
                        />
                      </label>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {tab === "cuts" ? (
        <form onSubmit={saveCuts} className="flex flex-col gap-3">
          <p className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs leading-relaxed text-muted">
            اكتب كام مللي الحديد أصغر من القطاع. مثال:{" "}
            <span className="font-semibold text-foreground">١٠٠ مم</span> =
            الحديد أقصر ١٠ سم من كل ضلع.
          </p>

          <section className="space-y-2.5 rounded-2xl border border-border bg-card p-3">
            <h3 className="text-xs font-bold text-foreground">
              تخصيم حديد الحلق
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] text-muted">
                من العرض (مم)
                <NumericInput
                  min={0}
                  value={offsets.frameW}
                  onChange={(v) =>
                    setOffsets((o) => ({ ...o, frameW: v }))
                  }
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block text-[11px] text-muted">
                من الارتفاع (مم)
                <NumericInput
                  min={0}
                  value={offsets.frameH}
                  onChange={(v) =>
                    setOffsets((o) => ({ ...o, frameH: v }))
                  }
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
            </div>
          </section>

          <section className="space-y-2.5 rounded-2xl border border-border bg-card p-3">
            <h3 className="text-xs font-bold text-foreground">
              تخصيم حديد الضلفة
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] text-muted">
                من العرض (مم)
                <NumericInput
                  min={0}
                  value={offsets.sashW}
                  onChange={(v) =>
                    setOffsets((o) => ({ ...o, sashW: v }))
                  }
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block text-[11px] text-muted">
                من الارتفاع (مم)
                <NumericInput
                  min={0}
                  value={offsets.sashH}
                  onChange={(v) =>
                    setOffsets((o) => ({ ...o, sashH: v }))
                  }
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
            </div>
          </section>

          <section className="space-y-2.5 rounded-2xl border border-border bg-card p-3">
            <h3 className="text-xs font-bold text-foreground">
              تخصيم حديد السوقاس
            </h3>
            <label className="block text-[11px] text-muted">
              من طول القطعة (مم)
              <NumericInput
                min={0}
                value={offsets.mullion}
                onChange={(v) =>
                  setOffsets((o) => ({ ...o, mullion: v }))
                }
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
          </section>

          <section className="space-y-2.5 rounded-2xl border border-border bg-card p-3">
            <h3 className="text-xs font-bold text-foreground">
              شريحة المفصلة
            </h3>
            <p className="text-[11px] leading-relaxed text-muted">
              عود بارتفاع جنب المفصلات في الضلفة المفصلي/القلاب — يخصم زي الحديد.
            </p>
            <label className="block text-[11px] text-muted">
              تخصيم من ارتفاع الضلفة (مم)
              <NumericInput
                min={0}
                value={offsets.hingeStrip}
                onChange={(v) =>
                  setOffsets((o) => ({ ...o, hingeStrip: v }))
                }
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
          </section>

          <section className="space-y-2.5 rounded-2xl border border-border bg-card p-3">
            <h3 className="text-xs font-bold text-foreground">تراك الجرار</h3>
            <p className="text-[11px] leading-relaxed text-muted">
              عدد التراكات على حلق الجرار × عرض الحلق.
            </p>
            <label className="block text-[11px] text-muted">
              عدد التراك على الحلق
              <NumericInput
                min={0}
                step={1}
                value={tracksPerFrame}
                onChange={(v) => setTracksPerFrame(v)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
          </section>

          <button
            type="submit"
            className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            حفظ التخصيم
          </button>

          <section className="rounded-2xl border border-border bg-card p-3">
            <h3 className="text-xs font-bold text-foreground">معاينة سريعة</h3>
            <p className="mt-1 text-[11px] text-muted">
              {ironDeductionSummary(
                ironDeductionsFromOffsets(offsets)
              )}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block text-[11px] text-muted">
                عرض الفتحة (مم)
                <NumericInput
                  min={0}
                  value={previewW}
                  onChange={setPreviewW}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block text-[11px] text-muted">
                ارتفاع الفتحة (مم)
                <NumericInput
                  min={0}
                  value={previewH}
                  onChange={setPreviewH}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
            </div>
            <ul className="mt-2 space-y-1 text-[11px] text-muted">
              <li>
                حديد حلق:{" "}
                <span className="font-semibold text-foreground">
                  {ironFrameW}×{ironFrameH} مم
                </span>
              </li>
              <li>
                حديد ضلفة (لو فتحة بنفس المقاس):{" "}
                <span className="font-semibold text-foreground">
                  {ironSashW}×{ironSashH} مم
                </span>
              </li>
              <li>
                شريحة مفصلة:{" "}
                <span className="font-semibold text-foreground">
                  {hingeStripH} مم ارتفاع
                </span>
              </li>
              <li>
                تراك×{tracksPerFrame}:{" "}
                <span className="font-semibold text-foreground">
                  {Math.round(((tracksPerFrame * previewW) / 1000) * 100) /
                    100}{" "}
                  م
                </span>
              </li>
            </ul>
          </section>
        </form>
      ) : null}
    </div>
  );
}
