"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  FRAME_COLORS,
  defaultMeshSpec,
  normalizePaneConfig,
  type DesignItem,
  type FrameColorId,
  type MeshMode,
  type PaneConfig,
} from "@/lib/design-items";
import {
  DISCOUNT_OPTIONS,
  GLASS_OPTIONS,
  SYSTEM_OPTIONS,
  type DiscountId,
  type GlassId,
  type SystemId,
} from "@/lib/item-catalogs";
import { suggestItemName } from "@/lib/item-naming";
import {
  getMeshPaneSummaries,
  getPaneRectMm,
  summarizeMeshMaterials,
} from "@/lib/mesh-materials";

export type ItemSettingsPatch = {
  name: string;
  nameIsCustom: boolean;
  qty: number;
  notes: string;
  specialPrice: number | null;
  discountId: DiscountId;
  systemId: SystemId;
  glassId: GlassId;
  frameColor: FrameColorId;
  selectedPaneId?: string | null;
  selectedPaneConfig?: PaneConfig | null;
};

type Props = {
  open: boolean;
  item: DesignItem;
  selectedPaneId: string | null;
  onClose: () => void;
  onConfirm: (patch: ItemSettingsPatch) => void;
};

function toDraft(item: DesignItem): ItemSettingsPatch {
  return {
    name: item.name || suggestItemName(item),
    nameIsCustom: Boolean(item.nameIsCustom),
    qty: Math.max(1, item.qty || 1),
    notes: item.notes ?? "",
    specialPrice:
      item.specialPrice != null && Number.isFinite(item.specialPrice)
        ? item.specialPrice
        : null,
    discountId: (item.discountId as DiscountId) || "none",
    systemId: (item.systemId as SystemId) || "none",
    glassId: (item.glassId as GlassId) || "none",
    frameColor: (item.frameColor as FrameColorId) || "white",
    selectedPaneId: null,
    selectedPaneConfig: null,
  };
}

const MESH_COLORS = [
  { value: "#0f766e", label: "تركواز" },
  { value: "#7c3aed", label: "بنفسجي" },
  { value: "#b45309", label: "نحاسي" },
  { value: "#be123c", label: "نبيتي" },
];

const OPENING_LABELS: Record<PaneConfig["opening"], string> = {
  fixed: "ثابت",
  "casement-left": "ضلفة يسار",
  "casement-right": "ضلفة يمين",
  tilt: "قلاب",
  "tilt-turn": "قلب وضلفة",
  "tilt-turn-left": "قلب وضلفة يسار",
  "sliding-left": "سحاب يسار",
  "sliding-right": "سحاب يمين",
  "door-left": "باب يسار",
  "door-right": "باب يمين",
  "drawer-left": "جرار شمال",
  "drawer-right": "جرار يمين",
  "panel-h": "بانل أفقي",
  "panel-v": "بانل رأسي",
};

export function ItemSettingsDrawer({
  open,
  item,
  selectedPaneId,
  onClose,
  onConfirm,
}: Props) {
  const [draft, setDraft] = useState<ItemSettingsPatch>(() => toDraft(item));
  const [specialText, setSpecialText] = useState(
    item.specialPrice != null && item.specialPrice > 0
      ? String(item.specialPrice)
      : ""
  );
  const [selectedPaneDraft, setSelectedPaneDraft] = useState<PaneConfig | null>(
    () =>
      selectedPaneId ? normalizePaneConfig(item.panes?.[selectedPaneId]) : null
  );

  const previewItem = useMemo(() => {
    if (!selectedPaneId || !selectedPaneDraft) return item;
    return {
      ...item,
      panes: {
        ...(item.panes ?? {}),
        [selectedPaneId]: selectedPaneDraft,
      },
    };
  }, [item, selectedPaneDraft, selectedPaneId]);

  const activePaneRect = useMemo(() => {
    if (!selectedPaneId) return undefined;
    return getPaneRectMm(previewItem, selectedPaneId);
  }, [previewItem, selectedPaneId]);

  const meshSummaries = useMemo(
    () => getMeshPaneSummaries(previewItem),
    [previewItem]
  );
  const meshTotals = useMemo(
    () => summarizeMeshMaterials(previewItem),
    [previewItem]
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function commit() {
    const parsed = specialText.trim() === "" ? null : Number(specialText);
    const trimmed = draft.name.trim();
    onConfirm({
      ...draft,
      name: trimmed || suggestItemName(item),
      nameIsCustom: trimmed ? draft.nameIsCustom : false,
      specialPrice:
        parsed != null && Number.isFinite(parsed) && parsed > 0 ? parsed : null,
      selectedPaneId,
      selectedPaneConfig: selectedPaneDraft
        ? normalizePaneConfig(selectedPaneDraft)
        : null,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex"
      role="dialog"
      aria-modal="true"
      aria-label="تفاصيل البند"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="إغلاق"
        onClick={onClose}
      />

      <aside
        className="relative z-10 flex h-full w-[min(86vw,340px)] max-w-full flex-col border-r border-border bg-background shadow-[8px_0_40px_rgba(15,20,28,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-3 py-3">
          <div className="min-w-0 text-right">
            <h2 className="text-base font-bold text-foreground">تفاصيل البند</h2>
            <p className="text-[11px] text-muted">الاسم · العدد · السعر · النظام</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-primary-soft hover:text-primary"
            aria-label="إغلاق"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          <Section title="اسم البند">
            <div className="space-y-2">
              <input
                type="text"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    name: e.target.value,
                    nameIsCustom: true,
                  }))
                }
                placeholder="اسم البند"
                className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary focus:bg-card"
              />
              <button
                type="button"
                onClick={() => {
                  const smart = suggestItemName({
                    ...item,
                    ...draft,
                    specialPrice:
                      specialText.trim() === ""
                        ? null
                        : Number(specialText) || null,
                  });
                  setDraft((d) => ({
                    ...d,
                    name: smart,
                    nameIsCustom: false,
                  }));
                }}
                className="flex w-full items-center justify-center rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft"
              >
                تسمية ذكية من الرسم
              </button>
              {!draft.nameIsCustom && (
                <p className="text-[11px] text-muted">
                  الاسم يتحدث تلقائياً مع الرسم
                </p>
              )}
              {draft.nameIsCustom && (
                <p className="text-[11px] text-muted">
                  اسم مخصص — مش هيتغيّر مع الرسم
                </p>
              )}
            </div>
          </Section>

          <Section title="عدد">
            <div className="flex items-center overflow-hidden rounded-2xl border border-border bg-background">
              <button
                type="button"
                className="flex h-11 w-12 items-center justify-center text-xl font-bold text-primary transition-colors hover:bg-primary-soft"
                aria-label="إنقاص"
                onClick={() =>
                  setDraft((d) => ({ ...d, qty: Math.max(1, d.qty - 1) }))
                }
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={draft.qty}
                onChange={(e) => {
                  const n = Math.max(1, Math.floor(Number(e.target.value) || 1));
                  setDraft((d) => ({ ...d, qty: n }));
                }}
                className="h-11 min-w-0 flex-1 border-x border-border bg-card text-center text-base font-semibold text-foreground outline-none"
              />
              <button
                type="button"
                className="flex h-11 w-12 items-center justify-center text-xl font-bold text-primary transition-colors hover:bg-primary-soft"
                aria-label="زيادة"
                onClick={() =>
                  setDraft((d) => ({ ...d, qty: d.qty + 1 }))
                }
              >
                +
              </button>
            </div>
          </Section>

          <Section title="مذكرة">
            <textarea
              value={draft.notes}
              onChange={(e) =>
                setDraft((d) => ({ ...d, notes: e.target.value }))
              }
              rows={3}
              placeholder="اكتب ملاحظة على البند…"
              className="w-full resize-none rounded-2xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary focus:bg-card"
            />
          </Section>

          <Section title="السعر الخاص">
            <input
              type="number"
              min={0}
              inputMode="decimal"
              value={specialText}
              onChange={(e) => setSpecialText(e.target.value)}
              placeholder="اتركه فاضي للحساب العادي"
              className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary focus:bg-card"
            />
          </Section>

          <Section title="مخطط مالي">
            <RadioList
              name="discount"
              options={DISCOUNT_OPTIONS.map((o) => ({
                id: o.id,
                label: o.label,
              }))}
              value={draft.discountId}
              onChange={(id) =>
                setDraft((d) => ({ ...d, discountId: id as DiscountId }))
              }
            />
          </Section>

          <Section title="نظام النوافذ">
            <RadioList
              name="system"
              options={SYSTEM_OPTIONS}
              value={draft.systemId}
              onChange={(id) =>
                setDraft((d) => ({ ...d, systemId: id as SystemId }))
              }
            />
          </Section>

          <Section title="نوع الزجاج">
            <RadioList
              name="glass"
              options={GLASS_OPTIONS}
              value={draft.glassId}
              onChange={(id) =>
                setDraft((d) => ({ ...d, glassId: id as GlassId }))
              }
            />
          </Section>

          <Section title="لون الإطار">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(FRAME_COLORS) as FrameColorId[]).map((id) => {
                const c = FRAME_COLORS[id];
                const active = draft.frameColor === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({ ...d, frameColor: id }))
                    }
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs transition-colors ${
                      active
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-background text-foreground hover:bg-primary-soft/60"
                    }`}
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-black/10"
                      style={{ background: c.hex }}
                    />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="سلك الضلفة المحددة">
            {!selectedPaneId || !selectedPaneDraft ? (
              <p className="text-xs text-muted">
                اختر ضلفة من الرسمة أولاً ثم افتح تفاصيل البند.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-border bg-background px-3 py-2 text-xs text-muted">
                  <div className="flex items-center justify-between gap-2">
                    <span>الضلفة: {selectedPaneId}</span>
                    <span>{OPENING_LABELS[selectedPaneDraft.opening]}</span>
                  </div>
                  {activePaneRect ? (
                    <div className="mt-1.5">
                      المقاس التقريبي: {Math.round(activePaneRect.w)} ×{" "}
                      {Math.round(activePaneRect.h)} مم
                    </div>
                  ) : null}
                </div>

                <FlagToggle
                  label="تفعيل سلك لهذه الضلفة"
                  checked={Boolean(selectedPaneDraft.mesh)}
                  onChange={(checked) =>
                    setSelectedPaneDraft((current) => {
                      if (!current) return current;
                      return normalizePaneConfig({
                        ...current,
                        mesh: checked,
                        meshSpec: checked
                          ? current.meshSpec ?? defaultMeshSpec(current.opening)
                          : current.meshSpec,
                      });
                    })
                  }
                />

                {selectedPaneDraft.mesh && selectedPaneDraft.meshSpec ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPaneDraft((current) => {
                          if (!current) return current;
                          return normalizePaneConfig({
                            ...current,
                            mesh: true,
                            meshSpec: defaultMeshSpec(current.opening),
                          });
                        })
                      }
                      className="flex w-full items-center justify-center rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft"
                    >
                      اقتراح تلقائي حسب نوع الضلفة
                    </button>

                    <label className="flex flex-col gap-1.5 text-right">
                      <span className="text-xs font-bold text-foreground">
                        اسم/نوع السلك
                      </span>
                      <input
                        type="text"
                        value={selectedPaneDraft.meshSpec.label}
                        onChange={(e) =>
                          setSelectedPaneDraft((current) => {
                            if (!current?.meshSpec) return current;
                            return normalizePaneConfig({
                              ...current,
                              meshSpec: {
                                ...current.meshSpec,
                                label: e.target.value,
                                autoAssigned: false,
                              },
                            });
                          })
                        }
                        className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary focus:bg-card"
                        placeholder="مثال: سلك جرار أو سلك مفصلي"
                      />
                    </label>

                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-foreground">
                        لون السلك في الرسمة
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {MESH_COLORS.map((color) => {
                          const active =
                            selectedPaneDraft.meshSpec?.renderColor ===
                            color.value;
                          return (
                            <button
                              key={color.value}
                              type="button"
                              onClick={() =>
                                setSelectedPaneDraft((current) => {
                                  if (!current?.meshSpec) return current;
                                  return normalizePaneConfig({
                                    ...current,
                                    meshSpec: {
                                      ...current.meshSpec,
                                      renderColor: color.value,
                                      autoAssigned: false,
                                    },
                                  });
                                })
                              }
                              className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold ${
                                active
                                  ? "border-primary bg-primary-soft text-primary"
                                  : "border-border bg-background text-foreground"
                              }`}
                            >
                              <span
                                className="h-4 w-4 rounded-full border border-black/10"
                                style={{ backgroundColor: color.value }}
                              />
                              {color.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateMeshMode(
                            setSelectedPaneDraft,
                            "custom-materials"
                          )
                        }
                        className={`rounded-2xl border px-3 py-2 text-xs font-semibold ${
                          selectedPaneDraft.meshSpec.mode === "custom-materials"
                            ? "border-primary bg-primary-soft text-primary"
                            : "border-border bg-background text-foreground"
                        }`}
                      >
                        تفصيل خامات
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateMeshMode(setSelectedPaneDraft, "ready-made")
                        }
                        className={`rounded-2xl border px-3 py-2 text-xs font-semibold ${
                          selectedPaneDraft.meshSpec.mode === "ready-made"
                            ? "border-primary bg-primary-soft text-primary"
                            : "border-border bg-background text-foreground"
                        }`}
                      >
                        جاهز على المقاس
                      </button>
                    </div>

                    {selectedPaneDraft.meshSpec.mode === "custom-materials" ? (
                      <div className="space-y-3 rounded-2xl border border-border bg-background p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <NumberField
                            label="عدد العرضيات"
                            value={
                              selectedPaneDraft.meshSpec.materials?.widthPieces ??
                              0
                            }
                            onChange={(value) =>
                              updateMeshMaterials(
                                setSelectedPaneDraft,
                                "widthPieces",
                                value
                              )
                            }
                          />
                          <NumberField
                            label="عدد الارتفاعيات"
                            value={
                              selectedPaneDraft.meshSpec.materials?.heightPieces ??
                              0
                            }
                            onChange={(value) =>
                              updateMeshMaterials(
                                setSelectedPaneDraft,
                                "heightPieces",
                                value
                              )
                            }
                          />
                          <NumberField
                            label="عدد العجل"
                            value={
                              selectedPaneDraft.meshSpec.materials?.wheelCount ??
                              0
                            }
                            onChange={(value) =>
                              updateMeshMaterials(
                                setSelectedPaneDraft,
                                "wheelCount",
                                value
                              )
                            }
                          />
                          <NumberField
                            label="مقبض لطش"
                            value={
                              selectedPaneDraft.meshSpec.materials
                                ?.latchHandleCount ?? 0
                            }
                            onChange={(value) =>
                              updateMeshMaterials(
                                setSelectedPaneDraft,
                                "latchHandleCount",
                                value
                              )
                            }
                          />
                        </div>

                        <FlagToggle
                          label="يأخذ سلك بمساحة الضلفة"
                          checked={
                            selectedPaneDraft.meshSpec.materials?.usePaneArea ??
                            true
                          }
                          onChange={(checked) =>
                            setSelectedPaneDraft((current) => {
                              if (!current?.meshSpec?.materials) return current;
                              return normalizePaneConfig({
                                ...current,
                                meshSpec: {
                                  ...current.meshSpec,
                                  autoAssigned: false,
                                  materials: {
                                    ...current.meshSpec.materials,
                                    usePaneArea: checked,
                                  },
                                },
                              });
                            })
                          }
                        />

                        <label className="flex flex-col gap-1.5 text-right">
                          <span className="text-xs font-bold text-foreground">
                            ملاحظات الخامة
                          </span>
                          <textarea
                            value={
                              selectedPaneDraft.meshSpec.materials?.extraNotes ??
                              ""
                            }
                            onChange={(e) =>
                              setSelectedPaneDraft((current) => {
                                if (!current?.meshSpec?.materials) return current;
                                return normalizePaneConfig({
                                  ...current,
                                  meshSpec: {
                                    ...current.meshSpec,
                                    autoAssigned: false,
                                    materials: {
                                      ...current.meshSpec.materials,
                                      extraNotes: e.target.value,
                                    },
                                  },
                                });
                              })
                            }
                            rows={2}
                            className="w-full resize-none rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                            placeholder="مثال: خامة مختلفة أو مقاس خاص"
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-3 rounded-2xl border border-border bg-background p-3">
                        <NumberField
                          label="كمية السلك الجاهز"
                          value={selectedPaneDraft.meshSpec.readyMadeQuantity ?? 1}
                          onChange={(value) =>
                            setSelectedPaneDraft((current) => {
                              if (!current?.meshSpec) return current;
                              return normalizePaneConfig({
                                ...current,
                                meshSpec: {
                                  ...current.meshSpec,
                                  autoAssigned: false,
                                  readyMadeQuantity: Math.max(1, value),
                                },
                              });
                            })
                          }
                        />

                        <FlagToggle
                          label="احسب مساحة السلك من مساحة الضلفة"
                          checked={
                            selectedPaneDraft.meshSpec.readyMadeUsesPaneArea ??
                            true
                          }
                          onChange={(checked) =>
                            setSelectedPaneDraft((current) => {
                              if (!current?.meshSpec) return current;
                              return normalizePaneConfig({
                                ...current,
                                meshSpec: {
                                  ...current.meshSpec,
                                  autoAssigned: false,
                                  readyMadeUsesPaneArea: checked,
                                },
                              });
                            })
                          }
                        />

                        <label className="flex flex-col gap-1.5 text-right">
                          <span className="text-xs font-bold text-foreground">
                            ملاحظات السلك الجاهز
                          </span>
                          <textarea
                            value={selectedPaneDraft.meshSpec.readyMadeNotes ?? ""}
                            onChange={(e) =>
                              setSelectedPaneDraft((current) => {
                                if (!current?.meshSpec) return current;
                                return normalizePaneConfig({
                                  ...current,
                                  meshSpec: {
                                    ...current.meshSpec,
                                    autoAssigned: false,
                                    readyMadeNotes: e.target.value,
                                  },
                                });
                              })
                            }
                            rows={2}
                            className="w-full resize-none rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                            placeholder="مثال: يأتي مفصل وجاهز على المقاس"
                          />
                        </label>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted">
                    فعّل سلك الضلفة من الأعلى أو من خصائص الضلفة لتحديد نوعه
                    وخاماته.
                  </p>
                )}
              </div>
            )}
          </Section>

          <Section title="ملخص خامات السلك">
            {meshSummaries.length === 0 ? (
              <p className="text-xs text-muted">
                لا يوجد ضلف عليها سلك حالياً.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <SummaryChip label="عدد ضلف السلك" value={String(meshTotals.panes)} />
                  <SummaryChip
                    label="مساحة السلك"
                    value={`${meshTotals.meshAreaSqm.toFixed(2)} م²`}
                  />
                  <SummaryChip
                    label="إجمالي العرضيات"
                    value={`${meshTotals.widthPieces} قطعة`}
                  />
                  <SummaryChip
                    label="إجمالي الارتفاعيات"
                    value={`${meshTotals.heightPieces} قطعة`}
                  />
                  <SummaryChip
                    label="إجمالي العجل"
                    value={`${meshTotals.wheelCount}`}
                  />
                  <SummaryChip
                    label="مقابض لطش"
                    value={`${meshTotals.latchHandleCount}`}
                  />
                </div>

                <div className="space-y-2">
                  {meshSummaries.map((summary) => (
                    <div
                      key={summary.paneId}
                      className="rounded-2xl border border-border bg-background px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 font-semibold text-foreground">
                        <span>{summary.label}</span>
                        <span>{summary.paneId}</span>
                      </div>
                      <div className="mt-1 text-muted">
                        {Math.round(summary.widthMm)} × {Math.round(summary.heightMm)} مم
                      </div>
                      {summary.mode === "custom-materials" ? (
                        <div className="mt-1 space-y-0.5 text-muted">
                          <div>
                            عرضيات: {summary.widthPieces} × {Math.round(summary.widthMm)} مم
                          </div>
                          <div>
                            ارتفاعيات: {summary.heightPieces} × {Math.round(summary.heightMm)} مم
                          </div>
                          <div>
                            سلك: {summary.meshAreaSqm.toFixed(2)} م²
                          </div>
                          <div>
                            عجل {summary.wheelCount} · مقبض لطش{" "}
                            {summary.latchHandleCount}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 space-y-0.5 text-muted">
                          <div>جاهز على المقاس: {summary.readyMadeQuantity} قطعة</div>
                          {summary.meshAreaSqm > 0 ? (
                            <div>مساحة مرجعية: {summary.meshAreaSqm.toFixed(2)} م²</div>
                          ) : null}
                        </div>
                      )}
                      {summary.notes ? (
                        <div className="mt-1 text-[11px] text-muted">
                          ملاحظات: {summary.notes}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>
        </div>

        <footer className="grid shrink-0 grid-cols-2 gap-3 border-t border-border bg-card p-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 items-center justify-center rounded-2xl border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:bg-primary-soft"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={commit}
            className="flex h-12 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition-all hover:brightness-105 active:scale-[0.98]"
          >
            حسناً
          </button>
        </footer>
      </aside>
    </div>
  );
}

function updateMeshMode(
  setSelectedPaneDraft: Dispatch<SetStateAction<PaneConfig | null>>,
  mode: MeshMode
) {
  setSelectedPaneDraft((current) => {
    if (!current?.meshSpec) return current;
    const spec = current.meshSpec;
    return normalizePaneConfig({
      ...current,
      meshSpec: {
        ...spec,
        mode,
        autoAssigned: false,
      },
    });
  });
}

function updateMeshMaterials(
  setSelectedPaneDraft: Dispatch<SetStateAction<PaneConfig | null>>,
  key:
    | "widthPieces"
    | "heightPieces"
    | "wheelCount"
    | "latchHandleCount",
  value: number
) {
  setSelectedPaneDraft((current) => {
    if (!current?.meshSpec?.materials) return current;
    return normalizePaneConfig({
      ...current,
      meshSpec: {
        ...current.meshSpec,
        autoAssigned: false,
        materials: {
          ...current.meshSpec.materials,
          [key]: Math.max(0, Math.floor(value)),
        },
      },
    });
  });
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-3 shadow-[0_8px_24px_rgba(15,20,28,0.04)]">
      <h3 className="mb-2 text-xs font-bold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-right">
      <span className="text-xs font-bold text-foreground">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
      />
    </label>
  );
}

function FlagToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border bg-background px-3 py-2.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span
        className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
          checked ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
    </label>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background px-3 py-2">
      <div className="text-muted">{label}</div>
      <div className="mt-1 font-semibold text-foreground">{value}</div>
    </div>
  );
}

function RadioList({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      {options.map((opt, i) => {
        const active = value === opt.id;
        return (
          <label
            key={opt.id}
            className={`flex cursor-pointer items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
              i > 0 ? "border-t border-border" : ""
            } ${active ? "bg-primary-soft" : "hover:bg-primary-soft/40"}`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                active ? "border-primary" : "border-border"
              }`}
            >
              {active && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </span>
            <input
              type="radio"
              name={name}
              checked={active}
              onChange={() => onChange(opt.id)}
              className="sr-only"
            />
            <span
              className={
                active ? "font-semibold text-primary" : "text-foreground"
              }
            >
              {opt.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
