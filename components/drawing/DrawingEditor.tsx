"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScreenBack } from "@/components/layout/ScreenBack";
import {
  DimensionEditDialog,
} from "@/components/drawing/DimensionEditDialog";
import {
  DrawingCanvas,
  type DeleteMullionTarget,
  type DimTarget,
  type EqualizeTarget,
} from "@/components/drawing/DrawingCanvas";
import { PanePropertiesModal } from "@/components/drawing/PanePropertiesModal";
import {
  ItemSettingsDrawer,
  type ItemSettingsPatch,
} from "@/components/drawing/ItemSettingsDrawer";
import {
  ToolPalette,
  type ToolId,
} from "@/components/drawing/ToolPalette";
import { MaterialsBar } from "@/components/drawing/MaterialsBar";
import { TemplatePickerModal } from "@/components/design/TemplatePickerModal";
import { useUnit } from "@/components/settings/UnitProvider";
import {
  calcItemAccessories,
  scaleAccessories,
  type AccessoriesBreakdown,
} from "@/lib/accessories";
import {
  createItemFromTemplate,
  isExtraChargeItem,
  itemTotalPrice,
  normalizeFrameColor,
  normalizePaneConfig,
  type DesignItem,
  type FrameColorId,
  type PaneConfig,
  type PaneOpening,
} from "@/lib/design-items";
import { itemIsDoubleGlazing, PRICING_UPDATED_EVENT } from "@/lib/pricing";
import { withSuggestedName } from "@/lib/item-naming";
import { calcGlassBreakdown, calcItemMaterials, calcMeshBreakdown, calcProfileCostBreakdown, scaleMaterials, type GlassBreakdown, type MeshBreakdown, type ProfileCostBreakdown } from "@/lib/materials";
import {
  calcIronBreakdown,
  scaleIronBreakdown,
  type IronBreakdown,
} from "@/lib/iron";
import {
  getIronSystem,
  getIronSystemId,
  loadMaterialCatalog,
  MATERIAL_CATALOG_UPDATED,
} from "@/lib/material-systems";
import {
  equalizeSplitRatios,
  ratioFromMm,
  removeMullionAfter,
  setPaneConfig,
  setPaneOpening,
  splitPane,
  syncPanesMap,
  updateSplitRatio,
  getSplitRatiosAtPath,
} from "@/lib/drawing-ops";
import {
  getItemsForProject,
  getProjectById,
  saveItemsForProject,
} from "@/lib/projects";
import {
  effectiveItemMaterials,
  GLASS_PANE2_NONE,
  projectMaterialDefaultsFrom,
} from "@/lib/project-materials";
import { applyBouclierRules, isBouclierEligible } from "@/lib/bouclier";
import { applyDouranRules, isDouranEligible } from "@/lib/douran";
import { fromMm, toMm } from "@/lib/units";
import { formatCurrency } from "@/lib/utils";
import type { LayoutNode } from "@/lib/window-layout";
import { cloneLayout, ensurePaneIds, listPaneIds } from "@/lib/window-layout";
import { getTemplateById } from "@/lib/window-templates";

type Props = {
  customerId: string;
  projectId: string;
  itemId: string;
};

type HistorySnap = {
  layout: LayoutNode;
  widthMm: number;
  heightMm: number;
  frameColor: FrameColorId;
  panes: NonNullable<DesignItem["panes"]>;
  qty: number;
  notes: string;
  customSalePricePerSqm: number | null;
  specialPrice: number | null;
  discountId: string;
  systemId: string;
  accessoryId: string;
  glassPane1Id?: string;
  glassPane2Id?: string;
  glassGeorgian?: boolean;
  ironId: string;
  name: string;
  nameIsCustom: boolean;
};

function snapshot(item: DesignItem): HistorySnap {
  return {
    layout: structuredClone(
      ensurePaneIds(item.layout ?? { type: "pane", id: "root" })
    ),
    widthMm: item.widthMm,
    heightMm: item.heightMm,
    frameColor: normalizeFrameColor(item.frameColor),
    panes: structuredClone(item.panes ?? {}),
    qty: item.qty,
    notes: item.notes ?? "",
    customSalePricePerSqm: item.customSalePricePerSqm ?? null,
    specialPrice: item.specialPrice ?? null,
    discountId: item.discountId ?? "none",
    systemId: item.systemId ?? "none",
    accessoryId: item.accessoryId ?? "none",
    glassPane1Id: item.glassPane1Id,
    glassPane2Id: item.glassPane2Id,
    glassGeorgian: item.glassGeorgian,
    ironId: item.ironId ?? "iron-std",
    name: item.name,
    nameIsCustom: Boolean(item.nameIsCustom),
  };
}

function applySnap(item: DesignItem, snap: HistorySnap): DesignItem {
  return {
    ...item,
    layout: snap.layout,
    widthMm: snap.widthMm,
    heightMm: snap.heightMm,
    frameColor: snap.frameColor,
    panes: snap.panes,
    qty: snap.qty,
    notes: snap.notes,
    customSalePricePerSqm: snap.customSalePricePerSqm,
    specialPrice: snap.specialPrice,
    discountId: snap.discountId,
    systemId: snap.systemId,
    accessoryId: snap.accessoryId,
    glassPane1Id: snap.glassPane1Id,
    glassPane2Id: snap.glassPane2Id,
    glassGeorgian: snap.glassGeorgian,
    ironId: snap.ironId,
    name: snap.name,
    nameIsCustom: snap.nameIsCustom,
  };
}

export function DrawingEditor({ customerId, projectId, itemId }: Props) {
  const router = useRouter();
  const { unit } = useUnit();
  const [item, setItem] = useState<DesignItem | null>(null);
  const [itemIndex, setItemIndex] = useState(1);
  const [selectedPaneId, setSelectedPaneId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<HistorySnap[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnap[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [propsPaneId, setPropsPaneId] = useState<string | null>(null);
  const [dimEdit, setDimEdit] = useState<{
    value: number;
    target: DimTarget;
  } | null>(null);
  const [equalizeTarget, setEqualizeTarget] = useState<EqualizeTarget | null>(
    null
  );
  const [deleteMullion, setDeleteMullion] =
    useState<DeleteMullionTarget | null>(null);

  const backHref = `/design/editor?customer=${customerId}&project=${projectId}`;

  useEffect(() => {
    const items = getItemsForProject(projectId);
    const found = items.find((i) => i.id === itemId);
    if (!found || isExtraChargeItem(found)) {
      router.replace(backHref);
      return;
    }
    const templateLayout = found.templateId
      ? getTemplateById(found.templateId)?.layout
      : undefined;
    const layout = ensurePaneIds(
      found.layout
        ? found.layout
        : templateLayout
          ? cloneLayout(templateLayout)
          : { type: "pane", id: "root" }
    );
    const normalized: DesignItem = withSuggestedName({
      ...found,
      layout,
      frameColor: normalizeFrameColor(found.frameColor),
      panes: applyDouranRules(
        layout,
        applyBouclierRules(
          layout,
          syncPanesMap(layout, found.panes)
        )
      ),
      nameIsCustom: Boolean(found.nameIsCustom),
    });
    setItem(normalized);
    setItemIndex(items.findIndex((i) => i.id === itemId) + 1);
    const first = listPaneIds(layout)[0];
    setSelectedPaneId(first ?? null);
    // sync normalized back
    const next = items.map((i) => (i.id === itemId ? normalized : i));
    saveItemsForProject(projectId, next);
  }, [projectId, itemId, router, backHref]);

  const projectMaterials = useMemo(
    () => projectMaterialDefaultsFrom(getProjectById(projectId)),
    [projectId]
  );

  const calcItem = useMemo(() => {
    if (!item) return null;
    return effectiveItemMaterials(item, projectMaterials);
  }, [item, projectMaterials]);

  const persistItem = useCallback(
    (next: DesignItem, pushHistory = true) => {
      const withRules: DesignItem = next.layout
        ? {
            ...next,
            panes: applyDouranRules(
              next.layout,
              applyBouclierRules(next.layout, next.panes ?? {})
            ),
          }
        : next;
      const named = withSuggestedName(withRules);

      setItem((prev) => {
        if (prev && pushHistory) {
          setUndoStack((u) => [...u, snapshot(prev)]);
          setRedoStack([]);
        }
        return named;
      });
      const items = getItemsForProject(projectId);
      saveItemsForProject(
        projectId,
        items.map((i) => (i.id === named.id ? named : i))
      );
    },
    [projectId]
  );

  const materials = useMemo(() => {
    if (!calcItem) return null;
    return scaleMaterials(calcItemMaterials(calcItem), calcItem.qty);
  }, [calcItem]);

  const glassBreakdown = useMemo((): GlassBreakdown | null => {
    if (!calcItem) return null;
    return calcGlassBreakdown(calcItem);
  }, [calcItem]);

  const meshBreakdown = useMemo((): MeshBreakdown | null => {
    if (!calcItem) return null;
    return calcMeshBreakdown(calcItem);
  }, [calcItem]);

  const accessoriesBreakdown = useMemo((): AccessoriesBreakdown | null => {
    if (!calcItem) return null;
    return scaleAccessories(
      calcItemAccessories(calcItem, undefined, projectMaterials),
      calcItem.qty
    );
  }, [calcItem, projectMaterials]);

  const [catalogTick, setCatalogTick] = useState(0);

  useEffect(() => {
    const bump = () => setCatalogTick((n) => n + 1);
    window.addEventListener(MATERIAL_CATALOG_UPDATED, bump);
    window.addEventListener(PRICING_UPDATED_EVENT, bump);
    return () => {
      window.removeEventListener(MATERIAL_CATALOG_UPDATED, bump);
      window.removeEventListener(PRICING_UPDATED_EVENT, bump);
    };
  }, []);

  const saleTotal = useMemo(() => {
    if (!item) return null;
    void catalogTick;
    const project = getProjectById(projectId);
    const n = itemTotalPrice(item, project);
    return n > 0 ? n : null;
  }, [item, projectId, catalogTick]);

  const profileCostBreakdown = useMemo((): ProfileCostBreakdown | null => {
    if (!calcItem) return null;
    return calcProfileCostBreakdown(calcItem, calcItemMaterials(calcItem));
  }, [calcItem, catalogTick]);

  const ironBreakdown = useMemo((): IronBreakdown | null => {
    if (!calcItem) return null;
    const catalog = loadMaterialCatalog();
    const raw = calcIronBreakdown(calcItem, getIronSystem(catalog));
    if (!raw) return null;
    return scaleIronBreakdown(raw, calcItem.qty);
  }, [calcItem, catalogTick]);

  const activeOpening = useMemo(() => {
    if (!item || !selectedPaneId) return null;
    return item.panes?.[selectedPaneId]?.opening ?? "fixed";
  }, [item, selectedPaneId]);

  function handleUndo() {
    if (!item || undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1]!;
    setUndoStack((u) => u.slice(0, -1));
    setRedoStack((r) => [...r, snapshot(item)]);
    const next = applySnap(item, prev);
    setItem(next);
    const items = getItemsForProject(projectId);
    saveItemsForProject(
      projectId,
      items.map((i) => (i.id === next.id ? next : i))
    );
  }

  function handleRedo() {
    if (!item || redoStack.length === 0) return;
    const nxt = redoStack[redoStack.length - 1]!;
    setRedoStack((r) => r.slice(0, -1));
    setUndoStack((u) => [...u, snapshot(item)]);
    const next = applySnap(item, nxt);
    setItem(next);
    const items = getItemsForProject(projectId);
    saveItemsForProject(
      projectId,
      items.map((i) => (i.id === next.id ? next : i))
    );
  }

  function handleTool(id: ToolId) {
    if (!item || !item.layout) return;

    if (id === "split-v" || id === "split-h" || id === "split-v2") {
      if (!selectedPaneId) return;
      const parts = id === "split-v2" ? 3 : 2;
      const dir = id === "split-h" ? "h" : "v";
      const result = splitPane(item.layout, selectedPaneId, dir, parts);
      if (!result) return;
      let panes = syncPanesMap(result.layout, item.panes);
      persistItem({ ...item, layout: result.layout, panes });
      setSelectedPaneId(result.newIds[0] ?? null);
      return;
    }

    if (!selectedPaneId) return;
    const opening = id as PaneOpening;
    persistItem({
      ...item,
      panes: setPaneOpening(item.panes ?? {}, selectedPaneId, opening),
    });
  }

  function handleSettingsConfirm(patch: ItemSettingsPatch) {
    if (!item) return;
    persistItem({
      ...item,
      name: patch.name,
      nameIsCustom: patch.nameIsCustom,
      qty: patch.qty,
      notes: patch.notes,
      customSalePricePerSqm: patch.customSalePricePerSqm,
      specialPrice: patch.specialPrice,
      discountId: patch.discountId,
      systemId:
        patch.systemId === "__project__" ? undefined : patch.systemId,
      accessoryId:
        patch.accessoryId === "__project__" ? undefined : patch.accessoryId,
      glassPane1Id:
        patch.glassFromProject ? undefined : patch.glassPane1Id,
      glassPane2Id: patch.glassFromProject
        ? undefined
        : patch.glassPane2Id || GLASS_PANE2_NONE,
      glassGeorgian: patch.glassFromProject
        ? undefined
        : patch.glassPane2Id
          ? patch.glassGeorgian
          : undefined,
      ironId: getIronSystemId(),
      frameColor: patch.frameColor,
    });
    setSettingsOpen(false);
  }

  function handleDimConfirm(displayValue: number) {
    if (!item || !dimEdit) return;
    const valueMm = toMm(displayValue, unit);
    const target = dimEdit.target;

    if (target.kind === "width") {
      persistItem({ ...item, widthMm: valueMm });
    } else if (target.kind === "height") {
      persistItem({ ...item, heightMm: valueMm });
    } else if (target.kind === "segment" && item.layout) {
      const { segment } = target;
      const share = ratioFromMm(
        valueMm,
        segment.totalMm,
        getSplitRatiosAtPath(item.layout, segment.path),
        segment.childIndex
      );
      const layout = updateSplitRatio(
        item.layout,
        segment.path,
        segment.childIndex,
        share
      );
      persistItem({ ...item, layout });
    }
    setDimEdit(null);
  }

  function handleEqualizeConfirm() {
    if (!item?.layout || !equalizeTarget) return;
    const path =
      equalizeTarget.kind === "segment" ? equalizeTarget.path : [];
    const layout = equalizeSplitRatios(item.layout, path);
    persistItem({ ...item, layout });
    setEqualizeTarget(null);
  }

  function handleDeleteMullionConfirm() {
    if (!item?.layout || !deleteMullion) return;
    const layout = removeMullionAfter(
      item.layout,
      deleteMullion.path,
      deleteMullion.leftChildIndex
    );
    if (!layout) {
      setDeleteMullion(null);
      return;
    }
    const panes = syncPanesMap(layout, item.panes);
    persistItem({ ...item, layout, panes });
    setSelectedPaneId(listPaneIds(layout)[0] ?? null);
    setDeleteMullion(null);
  }

  function handleNewFromTemplate(templateId: string, layout: LayoutNode) {
    const items = getItemsForProject(projectId);
    const created = createItemFromTemplate(
      templateId,
      layout,
      items.length + 1,
      projectMaterials
    );
    saveItemsForProject(projectId, [created, ...items]);
    setPickerOpen(false);
    // Replace so previous بند is not left under the new one in history.
    router.replace(
      `/design/draw?customer=${customerId}&project=${projectId}&item=${created.id}`
    );
  }

  if (!item) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted">
        جاري التحميل…
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background px-3 pb-5 pt-3 sm:px-4 lg:min-h-0 lg:max-w-none lg:flex-1 lg:px-4 lg:pb-4">
      <header className="mb-3 flex items-center gap-2 rounded-2xl border border-border bg-card px-2.5 py-2 text-foreground shadow-[0_8px_24px_rgba(15,20,28,0.07)]">
        <ScreenBack
          href={backHref}
          variant="icon"
          aria-label="رجوع للمشروع"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex min-w-7 items-center justify-center rounded-lg bg-primary-soft px-1.5 py-0.5 text-sm font-bold text-primary">
              {itemIndex}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {item.name || "رسم العنصر"}
              </p>
              <p className="truncate text-[11px] text-muted">
                {item.nameIsCustom ? "اسم مخصص" : "تسمية ذكية"} · بند {itemIndex}
                {saleTotal != null
                  ? ` · ${formatCurrency(Math.round(saleTotal))} ج.م`
                  : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-primary transition-colors hover:bg-primary-soft disabled:opacity-35"
            aria-label="تراجع"
            disabled={undoStack.length === 0}
            onClick={handleUndo}
          >
            <UndoIcon />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-primary transition-colors hover:bg-primary-soft disabled:opacity-35"
            aria-label="إعادة"
            disabled={redoStack.length === 0}
            onClick={handleRedo}
          >
            <RedoIcon />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-primary transition-colors hover:bg-primary-soft"
            aria-label="بند جديد"
            onClick={() => {
              setSettingsOpen(false);
              setPickerOpen(true);
            }}
          >
            <AddDocIcon />
          </button>
          <button
            type="button"
            className={`flex h-9 w-9 items-center justify-center rounded-xl text-primary transition-colors hover:bg-primary-soft ${
              settingsOpen ? "bg-primary-soft" : ""
            }`}
            aria-label="تفاصيل البند"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen(true)}
          >
            <MoreIcon />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:items-stretch lg:gap-3">
        <div className="lg:flex lg:w-64 lg:shrink-0 lg:flex-col">
          <ToolPalette
            className="lg:h-full"
            activeOpening={activeOpening}
            onTool={handleTool}
          />
        </div>

        <main className="relative mt-3 flex min-h-0 flex-1 flex-col lg:mt-0">
          <section className="flex min-h-[16rem] flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-sm lg:min-h-[28rem]">
            <div className="flex flex-1 items-center justify-center">
              <DrawingCanvas
                item={item}
                selectedPaneId={selectedPaneId}
                onSelectPane={setSelectedPaneId}
                onOpenPaneProperties={setPropsPaneId}
                onRequestDeleteMullion={setDeleteMullion}
                onRequestEqualize={setEqualizeTarget}
                onEditDimension={(target) => {
                  if (target.kind === "width") {
                    setDimEdit({
                      value: fromMm(item.widthMm, unit),
                      target,
                    });
                  } else if (target.kind === "height") {
                    setDimEdit({
                      value: fromMm(item.heightMm, unit),
                      target,
                    });
                  } else {
                    setDimEdit({
                      value: fromMm(target.segment.valueMm, unit),
                      target,
                    });
                  }
                }}
              />
            </div>
          </section>

          {materials ? (
            <MaterialsBar
              materials={materials}
              glassBreakdown={glassBreakdown}
              meshBreakdown={meshBreakdown}
              accessoriesBreakdown={accessoriesBreakdown}
              profileCostBreakdown={profileCostBreakdown}
              ironBreakdown={ironBreakdown}
              partLabel={item.name || "شباك"}
              widthMm={item.widthMm}
              heightMm={item.heightMm}
              systemId={calcItem?.systemId ?? item.systemId}
              discountId={item.discountId}
              isDoubleGlazing={itemIsDoubleGlazing(calcItem ?? item)}
              fallbackPricePerSqm={item.pricePerSqm}
              customSalePricePerSqm={item.customSalePricePerSqm}
            />
          ) : null}
        </main>
      </div>

      <DimensionEditDialog
        open={dimEdit != null}
        initialValue={dimEdit?.value ?? 0}
        unit={unit}
        onClose={() => setDimEdit(null)}
        onConfirm={handleDimConfirm}
      />

      {equalizeTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 backdrop-blur-[2px] sm:items-center"
          onClick={() => setEqualizeTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="equalize-title"
          >
            <h2
              id="equalize-title"
              className="text-base font-semibold text-foreground"
            >
              تقسيم بالتساوي؟
            </h2>
            <p className="mt-2 text-sm text-muted">
              ستُوزَّع المسافة على الأجزاء الموجودة بالتساوي. هل أنت متأكد؟
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground"
                onClick={() => setEqualizeTarget(null)}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-white"
                onClick={handleEqualizeConfirm}
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteMullion && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 backdrop-blur-[2px] sm:items-center"
          onClick={() => setDeleteMullion(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-mullion-title"
          >
            <h2
              id="delete-mullion-title"
              className="text-base font-semibold text-foreground"
            >
              مسح خط التقسيم؟
            </h2>
            <p className="mt-2 text-sm text-muted">
              هيتشال خط التقسيم عند النقطة دي، والجزئين هيبقوا جزء واحد.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground"
                onClick={() => setDeleteMullion(null)}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-medium text-white"
                onClick={handleDeleteMullionConfirm}
              >
                مسح
              </button>
            </div>
          </div>
        </div>
      )}

      <PanePropertiesModal
        open={propsPaneId != null}
        initial={normalizePaneConfig(
          propsPaneId ? item.panes?.[propsPaneId] : undefined
        )}
        bouclierEligible={
          propsPaneId && item.layout
            ? isBouclierEligible(propsPaneId, item.layout, item.panes ?? {})
            : false
        }
        douranEligible={
          propsPaneId && item.layout
            ? isDouranEligible(propsPaneId, item.layout, item.panes ?? {})
            : false
        }
        onClose={() => setPropsPaneId(null)}
        onConfirm={(config: PaneConfig) => {
          if (!propsPaneId) return;
          persistItem({
            ...item,
            panes: setPaneConfig(item.panes ?? {}, propsPaneId, config),
          });
          setPropsPaneId(null);
        }}
      />

      <TemplatePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={handleNewFromTemplate}
      />

      <ItemSettingsDrawer
        open={settingsOpen}
        item={item}
        projectDefaults={projectMaterials}
        onClose={() => setSettingsOpen(false)}
        onConfirm={handleSettingsConfirm}
      />
    </div>
  );
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 14l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10h9a5 5 0 010 10h-3" strokeLinecap="round" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 14l4-4-4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 10h-9a5 5 0 000 10h3" strokeLinecap="round" />
    </svg>
  );
}

function AddDocIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <path d="M8 3h6l4 4v12a2 2 0 01-2 2H8a2 2 0 01-2-2V5a2 2 0 012-2z" strokeLinejoin="round" />
      <path d="M14 3v4h4M12 11v6M9 14h6" strokeLinecap="round" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}
