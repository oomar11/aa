"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  applyOpeningMeshDefaults,
  defaultPaneConfig,
  gridCellCount,
  inferMeshKind,
  isExhaustPane,
  isSlidingSashOpening,
  normalizePaneConfig,
  resolvePaneMeshKind,
  type PaneConfig,
  type PaneGrid,
  type PaneOpening,
  type MeshKind,
} from "@/lib/design-items";
import { getGridCells, gridLines } from "@/lib/pane-grid";
import { MeshTypePicker } from "@/components/materials/MeshTypePicker";
import {
  meshCategoryOptions,
  meshTypeOptions,
} from "@/lib/material-systems";

type Props = {
  open: boolean;
  initial: PaneConfig;
  bouclierEligible?: boolean;
  onClose: () => void;
  onConfirm: (config: PaneConfig) => void;
};

type OptionDef<T extends string> = {
  id: T;
  label: string;
};

type OptionGroup<T extends string> = {
  title: string;
  items: OptionDef<T>[];
};

const OPENING_GROUPS: OptionGroup<PaneOpening>[] = [
  {
    title: "ثابت",
    items: [
      { id: "fixed", label: "ثابت" },
      { id: "exhaust", label: "شفاط" },
    ],
  },
  {
    title: "مفصلي",
    items: [
      { id: "casement-right", label: "مفصلي يمين" },
      { id: "casement-left", label: "مفصلي يسار" },
    ],
  },
  {
    title: "قلاب",
    items: [
      { id: "tilt", label: "قلاب" },
      { id: "tilt-inverted", label: "قلاب معكوس" },
    ],
  },
  {
    title: "قلب وضلفة",
    items: [
      { id: "tilt-turn", label: "قلب وضلفة يمين" },
      { id: "tilt-turn-left", label: "قلب وضلفة يسار" },
    ],
  },
  {
    title: "جرار",
    items: [
      { id: "drawer-right", label: "جرار يمين" },
      { id: "drawer-left", label: "جرار شمال" },
    ],
  },
  {
    title: "بانل",
    items: [
      { id: "panel-h", label: "بانل أفقي" },
      { id: "panel-v", label: "بانل رأسي" },
    ],
  },
];

const GRID_GROUPS: OptionGroup<PaneGrid>[] = [
  {
    title: "ضلفة كاملة",
    items: [{ id: "solid", label: "ضلفة كاملة" }],
  },
  {
    title: "تقسيم رأسي",
    items: [
      { id: "2v", label: "قسمين رأسي" },
      { id: "3v", label: "٣ أقسام رأسي" },
      { id: "4v", label: "٤ أقسام رأسي" },
    ],
  },
  {
    title: "تقسيم أفقي",
    items: [
      { id: "2h", label: "قسمين أفقي" },
      { id: "3h", label: "٣ أقسام أفقي" },
      { id: "4h", label: "٤ أقسام أفقي" },
    ],
  },
  {
    title: "شبكات",
    items: [
      { id: "2x2", label: "شبكة ٢×٢" },
      { id: "3x2", label: "شبكة ٣×٢" },
      { id: "2x3", label: "شبكة ٢×٣" },
      { id: "3x3", label: "شبكة ٣×٣" },
    ],
  },
  {
    title: "أشكال خاصة",
    items: [
      { id: "top-2v", label: "أعلى منقسم" },
      { id: "bot-2v", label: "أسفل منقسم" },
      { id: "diamond", label: "معين" },
    ],
  },
];

type ExtraKey = "sandwichPanels" | "mesh" | "isDoor";

const EXTRA_TITLES: Record<ExtraKey, string> = {
  sandwichPanels: "خيارات البنل",
  mesh: "خيارات شبكة السلك",
  isDoor: "خيارات ضلفة الباب",
};

const DOUBLE_TAP_MS = 320;
const LONG_PRESS_MS = 450;

export function PanePropertiesModal({
  open,
  initial,
  bouclierEligible = false,
  onClose,
  onConfirm,
}: Props) {
  const [draft, setDraft] = useState<PaneConfig>(defaultPaneConfig());
  const [expandedExtra, setExpandedExtra] = useState<ExtraKey | null>(null);
  const [meshOpts, setMeshOpts] = useState<
    { id: string; label: string; kind: MeshKind; pricePerSqm: number }[]
  >([]);
  const [meshCategoryOpts, setMeshCategoryOpts] = useState<
    { id: string; label: string; calcProfile: boolean }[]
  >([]);

  useEffect(() => {
    if (!open) return;
    setMeshOpts(meshTypeOptions());
    setMeshCategoryOpts(meshCategoryOptions());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setDraft(applyOpeningMeshDefaults(normalizePaneConfig(initial)));
    setExpandedExtra(null);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (expandedExtra) {
          setExpandedExtra(null);
          return;
        }
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, expandedExtra]);

  const cellCount = useMemo(
    () => gridCellCount(draft.grid ?? "solid"),
    [draft.grid]
  );

  if (!open) return null;

  function setGrid(grid: PaneGrid) {
    const count = gridCellCount(grid);
    setDraft((d) => ({
      ...d,
      grid,
      panelCells: (d.panelCells ?? []).filter((i) => i < count),
    }));
  }

  function togglePanelCell(index: number) {
    setDraft((d) => {
      const set = new Set(d.panelCells ?? []);
      if (set.has(index)) set.delete(index);
      else set.add(index);
      return { ...d, panelCells: [...set].sort((a, b) => a - b) };
    });
  }

  function isFlagOn(key: ExtraKey): boolean {
    if (key === "sandwichPanels") return Boolean(draft.sandwichPanels);
    if (key === "mesh") return Boolean(draft.mesh);
    if (key === "isDoor") return Boolean(draft.isDoor);
    return false;
  }

  function setFlag(key: ExtraKey, value: boolean) {
    setDraft((d) => {
      const next: PaneConfig = { ...d, [key]: value };
      if (key === "sandwichPanels") {
        const solidLike =
          (d.grid ?? "solid") === "solid" || d.grid === "diamond";
        if (value && solidLike) next.panelCells = [0];
        if (!value && solidLike) next.panelCells = [];
      }
      if (key === "isDoor") {
        if (value) {
          if (d.opening === "casement-left") next.opening = "door-left";
          else if (d.opening === "casement-right") next.opening = "door-right";
        } else if (d.opening === "door-left") {
          next.opening = "casement-left";
        } else if (d.opening === "door-right") {
          next.opening = "casement-right";
        }
      }
      if (key === "mesh") {
        if (value) {
          next.meshOffManual = false;
          // نوع/تصنيف تلقائي من الفتحة — المستخدم يقدر يغيّرهم من قائمة السلك
          const kind = inferMeshKind(d.opening);
          next.meshKind = kind;
          next.meshKindManual = false;
          const current = meshOpts.find((m) => m.id === d.meshTypeId);
          const match =
            current?.kind === kind
              ? current
              : meshOpts.find((m) => m.kind === kind) ??
                meshOpts.find((m) => m.kind === meshCategoryOpts[0]?.id) ??
                meshOpts[0];
          if (match) next.meshTypeId = match.id;
        } else {
          next.meshOffManual = true;
          next.meshTypeId = undefined;
          next.meshKind = undefined;
          next.meshKindManual = undefined;
        }
      }
      return next;
    });
    if (!value) {
      setExpandedExtra((cur) => (cur === key ? null : cur));
    }
  }

  /** ضغطة واحدة: تفعيل / إيقاف */
  function toggleFlag(key: ExtraKey) {
    setFlag(key, !isFlagOn(key));
  }

  /** ضغطتين أو ضغطة مطوّلة: فتح / قفل القائمة فوق */
  function toggleExtraMenu(key: ExtraKey) {
    if (expandedExtra === key) {
      setExpandedExtra(null);
      return;
    }
    if (!isFlagOn(key)) setFlag(key, true);
    setExpandedExtra(key);
  }

  function setDoorSide(side: "door-left" | "door-right") {
    setDraft((d) => ({ ...d, isDoor: true, opening: side }));
  }

  const showBouclier =
    !expandedExtra && bouclierEligible && draft.opening === "fixed";
  const isExhaust = isExhaustPane(draft.opening);
  const doorSide: "door-left" | "door-right" | null =
    draft.opening === "door-left" || draft.opening === "door-right"
      ? draft.opening
      : draft.opening === "casement-left" || draft.opening === "tilt-turn-left"
        ? "door-left"
        : draft.opening === "casement-right" || draft.opening === "tilt-turn"
          ? "door-right"
          : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-3 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pane-props-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(15,20,28,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-3 py-2.5 text-center">
          <h2
            id="pane-props-title"
            className="text-sm font-bold text-foreground"
          >
            {expandedExtra ? EXTRA_TITLES[expandedExtra] : "خصائص الضلفة"}
          </h2>
          <p className="mt-0.5 text-[11px] text-muted">
            {expandedExtra
              ? "ضغطتين أو ضغطة مطوّلة لقفل القائمة"
              : "اختَر نوع الفتح ثم التقسيم الداخلي"}
          </p>
        </div>

        {/* المنطقة العلوية: نوع الفتح/التقسيم أو قائمة الخيار الإضافي */}
        {expandedExtra ? (
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <header className="bg-primary px-2 py-1.5 text-center">
              <p className="text-sm font-bold text-primary-foreground">
                {EXTRA_TITLES[expandedExtra]}
              </p>
              <p className="text-[10px] font-normal text-primary-foreground/80">
                إعدادات الخيار الإضافي
              </p>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto bg-background/40 p-3">
              {expandedExtra === "sandwichPanels" && (
                <div className="mx-auto w-full max-w-sm space-y-3">
                  {cellCount > 1 ? (
                    <div className="rounded-xl border border-border bg-card p-3">
                      <PanelCellPicker
                        grid={draft.grid ?? "solid"}
                        cellCount={cellCount}
                        selected={draft.panelCells ?? []}
                        onToggle={togglePanelCell}
                        onSelectAll={() =>
                          setDraft((d) => ({
                            ...d,
                            panelCells: Array.from(
                              { length: cellCount },
                              (_, i) => i
                            ),
                          }))
                        }
                        onClearAll={() =>
                          setDraft((d) => ({ ...d, panelCells: [] }))
                        }
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border bg-card p-3">
                      <p className="text-[12px] leading-relaxed text-muted">
                        البنل هيغطي الضلفة كاملة. لو عايز أجزاء بنل وأجزاء زجاج،
                        ارجع للتقسيم الداخلي واختار تقسيم.
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpandedExtra(null)}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[12px] font-semibold text-foreground"
                  >
                    رجوع للتقسيم ونوع الفتح
                  </button>
                </div>
              )}

              {expandedExtra === "mesh" && (
                <div className="mx-auto w-full max-w-sm space-y-3">
                  <div className="rounded-xl border border-border bg-card p-3">
                    <MeshTypePicker
                      meshTypeId={draft.meshTypeId}
                      meshKind={resolvePaneMeshKind(draft, draft.opening)}
                      meshKindManual={draft.meshKindManual}
                      categoryOpts={meshCategoryOpts}
                      meshOpts={meshOpts}
                      hint="فعّل السلك يدوي. النوع بيتحدد تلقائي من نوع الفتح وتقدر تغيّره. سلك الجرار (ضلفة سلك) بيستبدل الزجاج — باقي الأنواع سلك فوق الزجاج، مش على البنل."
                      onChange={(next) =>
                        setDraft((d) => ({ ...d, ...next }))
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedExtra(null)}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[12px] font-semibold text-foreground"
                  >
                    رجوع للتقسيم ونوع الفتح
                  </button>
                </div>
              )}

              {expandedExtra === "isDoor" && (
                <div className="mx-auto w-full max-w-sm space-y-3">
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="mb-3 text-[12px] leading-relaxed text-muted">
                      الباب بيترسم بـ ٣ مفصلات. اختَر اتجاه الفتح:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDoorSide("door-right")}
                        className={`rounded-xl border px-2 py-3 text-[12px] font-semibold transition-colors ${
                          doorSide === "door-right"
                            ? "border-primary bg-primary-soft text-primary"
                            : "border-border bg-background text-foreground"
                        }`}
                      >
                        باب يمين
                      </button>
                      <button
                        type="button"
                        onClick={() => setDoorSide("door-left")}
                        className={`rounded-xl border px-2 py-3 text-[12px] font-semibold transition-colors ${
                          doorSide === "door-left"
                            ? "border-primary bg-primary-soft text-primary"
                            : "border-border bg-background text-foreground"
                        }`}
                      >
                        باب يسار
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedExtra(null)}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[12px] font-semibold text-foreground"
                  >
                    رجوع للتقسيم ونوع الفتح
                  </button>
                </div>
              )}
            </div>
          </section>
        ) : (
          <div
            className={`grid min-h-0 flex-1 gap-0 overflow-hidden ${
              isExhaust ? "grid-cols-1" : "grid-cols-2"
            }`}
          >
            <section
              className={`flex min-h-0 flex-col ${
                isExhaust ? "" : "border-l border-border"
              }`}
            >
              <header className="bg-primary px-2 py-1.5 text-center">
                <p className="text-sm font-bold text-primary-foreground">
                  نوع الفتح
                </p>
                <p className="text-[10px] font-normal text-primary-foreground/80">
                  ثابت، مفصلي، قلاب…
                </p>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto bg-background/40 p-2">
                <div className="space-y-2">
                  {OPENING_GROUPS.map((group) => (
                    <OptionSection key={group.title} title={group.title}>
                      {group.items.map((o) => {
                        const active = draft.opening === o.id;
                        return (
                          <OptionCard
                            key={o.id}
                            label={o.label}
                            active={active}
                            onClick={() =>
                              setDraft((d) =>
                                applyOpeningMeshDefaults({
                                  ...d,
                                  opening: o.id,
                                })
                              )
                            }
                          >
                            <OpeningIcon type={o.id} />
                          </OptionCard>
                        );
                      })}
                    </OptionSection>
                  ))}
                  {isSlidingSashOpening(draft.opening) ? (
                    <div className="mt-2 rounded-xl border border-border bg-card p-2.5">
                      <p className="mb-2 text-[11px] font-semibold text-foreground">
                        نوع الضلفة
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            { id: "auto", label: "تلقائي" },
                            { id: "protruding", label: "بارز" },
                            { id: "recessed", label: "غاطس" },
                          ] as const
                        ).map((opt) => {
                          const active =
                            opt.id === "auto"
                              ? !draft.sashDepthManual
                              : draft.sashDepthManual &&
                                draft.sashDepth === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                setDraft((d) => ({
                                  ...d,
                                  sashDepthManual: opt.id !== "auto",
                                  sashDepth:
                                    opt.id === "auto" ? undefined : opt.id,
                                }))
                              }
                              className={`rounded-lg border px-2 py-2 text-[11px] font-semibold transition-colors ${
                                active
                                  ? "border-primary bg-primary-soft text-primary"
                                  : "border-border bg-background text-foreground"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
                        الضلفة الغاطسة بتحمل مقبض غاطس. التلقائي: تناوب
                        بارز/غاطس حسب موقع الضلفة في الصف.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            {!isExhaust && (
            <section className="flex min-h-0 flex-col">
              <header className="bg-primary px-2 py-1.5 text-center">
                <p className="text-sm font-bold text-primary-foreground">
                  التقسيم الداخلي
                </p>
                <p className="text-[10px] font-normal text-primary-foreground/80">
                  عوائد / تقسيم الزجاج
                </p>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto bg-background/40 p-2">
                <div className="space-y-2">
                  {GRID_GROUPS.map((group) => (
                    <OptionSection key={group.title} title={group.title}>
                      {group.items.map((g) => {
                        const active = (draft.grid ?? "solid") === g.id;
                        return (
                          <OptionCard
                            key={g.id}
                            label={g.label}
                            active={active}
                            onClick={() => setGrid(g.id)}
                          >
                            <GridIcon type={g.id} />
                          </OptionCard>
                        );
                      })}
                    </OptionSection>
                  ))}
                </div>
              </div>
            </section>
            )}

            {isExhaust && (
              <div className="border-t border-border bg-background/40 px-4 py-6 text-center">
                <p className="text-[12px] leading-relaxed text-muted">
                  الشفاط بيتساب فاضي — بدون زجاج أو باكتة أو تقسيم داخلي.
                </p>
              </div>
            )}
          </div>
        )}

        {/* شريط الخيارات الإضافية */}
        {!isExhaust && (
        <div className="shrink-0 border-t border-border bg-background/80">
          <div className="px-2.5 pt-2 pb-1.5">
            <p className="mb-1 text-center text-[10px] font-semibold tracking-wide text-muted">
              خيارات إضافية
            </p>
            <p className="mb-1.5 text-center text-[9px] text-muted/80">
              ضغطة تفعيل/إيقاف · ضغطتين أو مطوّلة للقائمة
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <FlagChip
                label="بنل ساندوتش"
                checked={Boolean(draft.sandwichPanels)}
                expanded={expandedExtra === "sandwichPanels"}
                onToggle={() => toggleFlag("sandwichPanels")}
                onOpenMenu={() => toggleExtraMenu("sandwichPanels")}
                icon={<PanelIcon />}
              />
              <FlagChip
                label="شبكة سلك"
                checked={Boolean(draft.mesh)}
                expanded={expandedExtra === "mesh"}
                onToggle={() => toggleFlag("mesh")}
                onOpenMenu={() => toggleExtraMenu("mesh")}
                icon={<MeshIcon />}
              />
              <FlagChip
                label="ضلفة باب"
                checked={Boolean(draft.isDoor)}
                expanded={expandedExtra === "isDoor"}
                onToggle={() => toggleFlag("isDoor")}
                onOpenMenu={() => toggleExtraMenu("isDoor")}
                icon={<DoorIcon />}
              />
            </div>
          </div>

          {showBouclier && (
            <div className="max-h-[28dvh] overflow-y-auto border-t border-border/60 px-2.5 py-2">
              <div className="rounded-xl border border-border bg-card p-2">
                <p className="mb-2 text-[11px] font-semibold text-foreground">
                  سوقاس / بوكلير
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        bouclier: false,
                        bouclierManual: true,
                      }))
                    }
                    className={`rounded-xl border px-2 py-2 text-[11px] font-semibold ${
                      !draft.bouclier
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-background text-foreground"
                    }`}
                  >
                    سوقاس (ثابت)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        bouclier: true,
                        bouclierManual: true,
                      }))
                    }
                    className={`rounded-xl border px-2 py-2 text-[11px] font-semibold ${
                      draft.bouclier
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-background text-foreground"
                    }`}
                  >
                    بوكلير
                  </button>
                </div>
                <p className="mt-1.5 text-[10px] text-muted">
                  البوكلير متاح فقط بين مفصلي يمين ويسار والمقابض باتجاه بعض
                </p>
              </div>
            </div>
          )}
        </div>
        )}

        <footer className="grid shrink-0 grid-cols-2 gap-3 border-t border-border p-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 items-center justify-center rounded-2xl border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:bg-primary-soft"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => onConfirm(normalizePaneConfig(draft))}
            className="flex h-12 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition-all hover:brightness-105 active:scale-[0.98]"
          >
            تطبيق
          </button>
        </footer>
      </div>
    </div>
  );
}

function OptionSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-1.5">
      <p className="mb-1 px-1 text-[10px] font-semibold text-muted">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">{children}</div>
    </div>
  );
}

function OptionCard({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-[5.3rem] flex-col items-center justify-center gap-1 rounded-xl border-2 bg-card p-1.5 ${
        active
          ? "border-primary ring-2 ring-primary/25"
          : "border-transparent hover:border-primary/40"
      }`}
    >
      <span className="aspect-square w-full max-w-[3.1rem]">{children}</span>
      <span className="w-full truncate text-center text-[10px] font-medium leading-tight text-foreground">
        {label}
      </span>
    </button>
  );
}

function PanelCellPicker({
  grid,
  cellCount,
  selected,
  onToggle,
  onSelectAll,
  onClearAll,
}: {
  grid: PaneGrid;
  cellCount: number;
  selected: number[];
  onToggle: (index: number) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  const selectedCount = selected.length;
  const allSelected = selectedCount === cellCount;
  const noneSelected = selectedCount === 0;
  const cells = getGridCells(grid, 0, 0, 100, 100);

  return (
    <div>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-foreground">
            أجزاء البنل
          </p>
          <p className="text-[10px] text-muted">
            اضغط على الجزء عشان يبقى بنل أو زجاج
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">
          {selectedCount}/{cellCount}
        </span>
      </div>

      <div
        className="relative mx-auto overflow-hidden rounded-lg border-2 border-[#6b7280] bg-[#6b7280] shadow-inner"
        style={{ width: "100%", maxWidth: 168, aspectRatio: "1 / 1.05" }}
      >
        {cells.map((cell, i) => {
          const on = selected.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onToggle(i)}
              aria-pressed={on}
              aria-label={on ? `جزء ${i + 1}: بنل` : `جزء ${i + 1}: زجاج`}
              className={`absolute flex items-center justify-center overflow-hidden transition-colors ${
                on
                  ? "bg-[#c4a06a] text-white"
                  : "bg-[linear-gradient(180deg,#dbeafe_0%,#93c5fd_100%)] text-sky-900/70"
              }`}
              style={{
                left: `${cell.x}%`,
                top: `${cell.y}%`,
                width: `${cell.w}%`,
                height: `${cell.h}%`,
                boxShadow: "inset 0 0 0 1.5px #6b7280",
              }}
            >
              {on && (
                <span
                  className="pointer-events-none absolute inset-0"
                  aria-hidden
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(to bottom, transparent 0, transparent 28%, rgba(0,0,0,0.22) 28%, rgba(0,0,0,0.22) 34%)",
                  }}
                />
              )}
              <span className="relative text-[9px] font-bold leading-none">
                {on ? "بنل" : "زجاج"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-muted">
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: "#c4a06a" }}
            aria-hidden
          />
          بنل
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm bg-sky-300"
            aria-hidden
          />
          زجاج
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={onSelectAll}
          disabled={allSelected}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-[10px] font-semibold text-foreground disabled:opacity-40"
        >
          كل البنل
        </button>
        <button
          type="button"
          onClick={onClearAll}
          disabled={noneSelected}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-[10px] font-semibold text-foreground disabled:opacity-40"
        >
          كل الزجاج
        </button>
      </div>
    </div>
  );
}

function FlagChip({
  label,
  checked,
  expanded,
  onToggle,
  onOpenMenu,
  icon,
}: {
  label: string;
  checked: boolean;
  expanded: boolean;
  onToggle: () => void;
  onOpenMenu: () => void;
  icon: ReactNode;
}) {
  const longTimerRef = useRef<number | null>(null);
  const longFiredRef = useRef(false);
  const lastTapRef = useRef<number>(0);
  const pendingToggleRef = useRef<number | null>(null);

  function clearLongTimer() {
    if (longTimerRef.current != null) {
      window.clearTimeout(longTimerRef.current);
      longTimerRef.current = null;
    }
  }

  function clearPendingToggle() {
    if (pendingToggleRef.current != null) {
      window.clearTimeout(pendingToggleRef.current);
      pendingToggleRef.current = null;
    }
  }

  function handlePointerDown() {
    longFiredRef.current = false;
    clearLongTimer();
    longTimerRef.current = window.setTimeout(() => {
      longFiredRef.current = true;
      clearPendingToggle();
      lastTapRef.current = 0;
      onOpenMenu();
    }, LONG_PRESS_MS);
  }

  function handlePointerEnd() {
    clearLongTimer();
  }

  function handleClick() {
    if (longFiredRef.current) {
      longFiredRef.current = false;
      return;
    }

    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      // ضغطتين ورا بعض → فتح/قفل القائمة
      clearPendingToggle();
      lastTapRef.current = 0;
      onOpenMenu();
      return;
    }

    lastTapRef.current = now;
    clearPendingToggle();
    // استنى شوية عشان لو جت ضغطة تانية تبقى double-tap مش toggle
    pendingToggleRef.current = window.setTimeout(() => {
      pendingToggleRef.current = null;
      onToggle();
    }, DOUBLE_TAP_MS);
  }

  useEffect(() => {
    return () => {
      clearLongTimer();
      clearPendingToggle();
    };
  }, []);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-expanded={expanded}
      aria-label={
        expanded
          ? `${label} — القائمة مفتوحة، ضغطتين أو مطوّلة للقفل`
          : `${label} — ضغطة تفعيل، ضغطتين أو مطوّلة للقائمة`
      }
      title="ضغطة: تفعيل/إيقاف · ضغطتين أو مطوّلة: القائمة"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
      onClick={handleClick}
      className={`relative flex min-h-[3.6rem] flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-1.5 transition-all select-none touch-manipulation ${
        expanded
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : checked
            ? "border-primary bg-primary-soft text-primary"
            : "border-border bg-card text-muted hover:border-primary/40 hover:text-foreground"
      }`}
    >
      <span className="flex h-6 w-6 items-center justify-center">{icon}</span>
      <span className="w-full truncate text-center text-[10px] font-semibold leading-tight">
        {label}
      </span>
      {checked && (
        <span
          className={`absolute start-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${
            expanded ? "bg-primary-foreground" : "bg-primary"
          }`}
          aria-hidden
        />
      )}
      {expanded && (
        <span
          className="absolute inset-x-2 bottom-0.5 mx-auto h-0.5 w-4 rounded-full bg-primary-foreground/70"
          aria-hidden
        />
      )}
    </button>
  );
}

function GridIcon({ type }: { type: PaneGrid }) {
  const stroke = "currentColor";
  const lines = gridLines(type, 4, 4, 32, 32);
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full text-primary" aria-hidden>
      <rect
        x="4"
        y="4"
        width="32"
        height="32"
        fill="var(--primary-soft)"
        stroke={stroke}
        strokeWidth="2"
      />
      {lines.map((line, i) => (
        <line
          key={i}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={stroke}
          strokeWidth={type === "3x3" || type === "4v" || type === "4h" ? 1.5 : 2}
        />
      ))}
    </svg>
  );
}

function OpeningIcon({ type }: { type: PaneOpening }) {
  const s = "currentColor";
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full text-primary" fill="none" aria-hidden>
      <rect x="5" y="5" width="30" height="30" stroke={s} strokeWidth="1.8" />
      {type === "fixed" && (
        <>
          <line x1="8" y1="20" x2="32" y2="20" stroke={s} strokeWidth="1.6" />
          <line x1="20" y1="8" x2="20" y2="32" stroke={s} strokeWidth="1.6" />
        </>
      )}
      {type === "exhaust" && (
        <>
          <circle cx="20" cy="20" r="10" stroke={s} strokeWidth="1.6" />
          <circle cx="20" cy="20" r="2.2" fill={s} stroke="none" />
          <path
            d="M20 10.5 Q26 14 24.5 20 Q22 12.5 20 10.5 M20 10.5 Q14 14 15.5 20 Q18 12.5 20 10.5 M24.5 20 Q26 26 20 29.5 Q22 22.5 24.5 20 M15.5 20 Q14 26 20 29.5 Q18 22.5 15.5 20"
            stroke={s}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </>
      )}
      {type === "tilt" && (
        <path d="M8 32 L20 8 L32 32" stroke={s} strokeWidth="1.6" />
      )}
      {type === "tilt-inverted" && (
        <path d="M8 8 L20 32 L32 8" stroke={s} strokeWidth="1.6" />
      )}
      {type === "casement-left" && (
        <path d="M32 8 L8 20 L32 32" stroke={s} strokeWidth="1.6" />
      )}
      {type === "casement-right" && (
        <path d="M8 8 L32 20 L8 32" stroke={s} strokeWidth="1.6" />
      )}
      {type === "sliding-left" && (
        <path d="M28 20 H12 M16 14 L10 20 L16 26" stroke={s} strokeWidth="1.6" />
      )}
      {type === "sliding-right" && (
        <path d="M12 20 H28 M24 14 L30 20 L24 26" stroke={s} strokeWidth="1.6" />
      )}
      {type === "drawer-left" && (
        <path
          d="M16 14.5 L11 20 L16 25.5 M11 20 H29 V26"
          stroke={s}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {type === "drawer-right" && (
        <path
          d="M24 14.5 L29 20 L24 25.5 M29 20 H11 V26"
          stroke={s}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {type === "tilt-turn" && (
        <>
          <path d="M8 32 L20 8 L32 32" stroke={s} strokeWidth="1.4" />
          <path d="M32 8 L8 20 L32 32" stroke={s} strokeWidth="1.3" opacity="0.8" />
        </>
      )}
      {type === "tilt-turn-left" && (
        <>
          <path d="M8 32 L20 8 L32 32" stroke={s} strokeWidth="1.4" />
          <path d="M8 8 L32 20 L8 32" stroke={s} strokeWidth="1.3" opacity="0.8" />
        </>
      )}
      {(type === "door-left" || type === "door-right") && (
        <path
          d={
            type === "door-left"
              ? "M32 8 L8 20 L32 32"
              : "M8 8 L32 20 L8 32"
          }
          stroke={s}
          strokeWidth="1.6"
        />
      )}
      {type === "panel-h" && (
        <>
          <rect x="8" y="9" width="24" height="5" fill={s} opacity="0.35" rx="0.5" />
          <rect x="8" y="17.5" width="24" height="5" fill={s} opacity="0.35" rx="0.5" />
          <rect x="8" y="26" width="24" height="5" fill={s} opacity="0.35" rx="0.5" />
        </>
      )}
      {type === "panel-v" && (
        <>
          <rect x="9" y="8" width="5" height="24" fill={s} opacity="0.35" rx="0.5" />
          <rect x="17.5" y="8" width="5" height="24" fill={s} opacity="0.35" rx="0.5" />
          <rect x="26" y="8" width="5" height="24" fill={s} opacity="0.35" rx="0.5" />
        </>
      )}
    </svg>
  );
}

function PanelIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="4" y="3" width="16" height="18" />
      <rect x="6" y="12" width="12" height="7" fill="currentColor" opacity="0.25" />
    </svg>
  );
}

function DoorIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="7" y="2" width="10" height="20" />
      <circle cx="14" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function MeshIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <rect x="4" y="4" width="16" height="16" />
      <path d="M4 8h16M4 12h16M4 16h16M8 4v16M12 4v16M16 4v16" />
    </svg>
  );
}
