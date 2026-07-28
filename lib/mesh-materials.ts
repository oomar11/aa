import {
  defaultMeshSpec,
  normalizePaneConfig,
  type DesignItem,
  type MeshSpec,
  type PaneConfig,
} from "@/lib/design-items";
import { collectPaneRects, type PaneRect } from "@/lib/drawing-ops";
import { ensurePaneIds, type LayoutNode } from "@/lib/window-layout";

export type MeshPaneSummary = {
  paneId: string;
  opening: PaneConfig["opening"];
  label: string;
  mode: MeshSpec["mode"];
  color: string;
  widthMm: number;
  heightMm: number;
  areaSqm: number;
  widthPieces: number;
  heightPieces: number;
  widthLengthMm: number;
  heightLengthMm: number;
  meshAreaSqm: number;
  wheelCount: number;
  latchHandleCount: number;
  readyMadeQuantity: number;
  notes: string;
};

export type MeshTotals = {
  panes: number;
  widthPieces: number;
  heightPieces: number;
  widthLengthMm: number;
  heightLengthMm: number;
  meshAreaSqm: number;
  wheelCount: number;
  latchHandleCount: number;
  readyMadeQuantity: number;
};

function buildPaneRects(item: DesignItem): PaneRect[] {
  const layout: LayoutNode = ensurePaneIds(
    item.layout ?? { type: "pane", id: "root" }
  );
  const out: PaneRect[] = [];
  collectPaneRects(
    layout,
    { x: 0, y: 0, w: item.widthMm, h: item.heightMm },
    out
  );
  return out;
}

export function getPaneRectMm(
  item: DesignItem,
  paneId: string
): PaneRect | undefined {
  return buildPaneRects(item).find((pane) => pane.id === paneId);
}

export function getMeshPaneSummaries(item: DesignItem): MeshPaneSummary[] {
  const rects = buildPaneRects(item);

  return rects.flatMap<MeshPaneSummary>((rect) => {
    const pane = normalizePaneConfig(item.panes?.[rect.id]);
    if (!pane.mesh) return [];

    const spec = pane.meshSpec ?? defaultMeshSpec(pane.opening);
    const areaSqm = (rect.w * rect.h) / 1_000_000;

    if (spec.mode === "ready-made") {
      return [
        {
          paneId: rect.id,
          opening: pane.opening,
          label: spec.label,
          mode: spec.mode,
          color: spec.renderColor,
          widthMm: rect.w,
          heightMm: rect.h,
          areaSqm,
          widthPieces: 0,
          heightPieces: 0,
          widthLengthMm: 0,
          heightLengthMm: 0,
          meshAreaSqm: spec.readyMadeUsesPaneArea ? areaSqm : 0,
          wheelCount: 0,
          latchHandleCount: 0,
          readyMadeQuantity: Math.max(1, spec.readyMadeQuantity ?? 1),
          notes: spec.readyMadeNotes ?? "",
        },
      ];
    }

    const materials = spec.materials ?? defaultMeshSpec(pane.opening).materials!;
    return [
      {
        paneId: rect.id,
        opening: pane.opening,
        label: spec.label,
        mode: spec.mode,
        color: spec.renderColor,
        widthMm: rect.w,
        heightMm: rect.h,
        areaSqm,
        widthPieces: materials.widthPieces,
        heightPieces: materials.heightPieces,
        widthLengthMm: materials.widthPieces * rect.w,
        heightLengthMm: materials.heightPieces * rect.h,
        meshAreaSqm: materials.usePaneArea ? areaSqm : 0,
        wheelCount: materials.wheelCount,
        latchHandleCount: materials.latchHandleCount,
        readyMadeQuantity: 0,
        notes: materials.extraNotes ?? "",
      },
    ];
  });
}

export function summarizeMeshMaterials(item: DesignItem): MeshTotals {
  return getMeshPaneSummaries(item).reduce<MeshTotals>(
    (acc, pane) => ({
      panes: acc.panes + 1,
      widthPieces: acc.widthPieces + pane.widthPieces,
      heightPieces: acc.heightPieces + pane.heightPieces,
      widthLengthMm: acc.widthLengthMm + pane.widthLengthMm,
      heightLengthMm: acc.heightLengthMm + pane.heightLengthMm,
      meshAreaSqm: acc.meshAreaSqm + pane.meshAreaSqm,
      wheelCount: acc.wheelCount + pane.wheelCount,
      latchHandleCount: acc.latchHandleCount + pane.latchHandleCount,
      readyMadeQuantity: acc.readyMadeQuantity + pane.readyMadeQuantity,
    }),
    {
      panes: 0,
      widthPieces: 0,
      heightPieces: 0,
      widthLengthMm: 0,
      heightLengthMm: 0,
      meshAreaSqm: 0,
      wheelCount: 0,
      latchHandleCount: 0,
      readyMadeQuantity: 0,
    }
  );
}
