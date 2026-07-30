/**
 * حساب حديد التسليح للحلق · الضلفة · السوقاس.
 * الحديد أصغر من القطاع حسب معادلات نظام الحديد (افتراضي −١٠ سم).
 */

import {
  isExhaustPane,
  normalizePaneConfig,
  type DesignItem,
  type PaneConfig,
  type PaneOpening,
} from "@/lib/design-items";
import { gridLines } from "@/lib/pane-grid";
import {
  classifyJunction,
  frameKindForOpening,
  isDoorPane,
  meshReplacesPaneGlass,
  type FrameKind,
} from "@/lib/materials";
import {
  calcCutSizes,
  defaultIronDetails,
  getCutDeductions,
  ironPieceForRole,
  ironRoleLabel,
  loadMaterialCatalog,
  type IronDeductions,
  type IronPieceRole,
  type IronSystemDetails,
  type MaterialSystem,
} from "@/lib/material-systems";
import { evaluateFormula } from "@/lib/excel-formula";
import type { LayoutNode } from "@/lib/window-layout";

type PaneBox = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: FrameKind;
  opening: PaneOpening;
  bouclier: boolean;
};

export type IronLine = {
  role: IronPieceRole;
  label: string;
  lengthM: number;
  sectionWidthMm?: number;
  sectionHeightMm?: number;
  pieceName?: string;
};

export type IronBreakdown = {
  lines: IronLine[];
  frameHingedM: number;
  frameSlidingM: number;
  sashHingedM: number;
  sashSlidingM: number;
  sashDoorM: number;
  mullionM: number;
  totalM: number;
  systemName?: string;
};

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

function roundM(mm: number): number {
  return Math.round(mm * 1000) / 1000;
}

function mmToM(mm: number): number {
  return mm / 1000;
}

function evalIronMm(formula: string, vars: Record<string, number>): number {
  const result = evaluateFormula(formula, vars);
  if (!result.ok) return 0;
  return Math.max(0, Math.round(result.value * 1000) / 1000);
}

function isOpeningSash(opening: PaneOpening): boolean {
  return opening !== "fixed" && opening !== "exhaust";
}

function paneOpening(
  id: string,
  panes: Record<string, PaneConfig> | undefined
): PaneOpening {
  return (panes?.[id]?.opening ?? "fixed") as PaneOpening;
}

function paneBouclier(
  id: string,
  panes: Record<string, PaneConfig> | undefined
): boolean {
  return Boolean(normalizePaneConfig(panes?.[id]).bouclier);
}

function collectPaneBoxes(
  node: LayoutNode,
  x: number,
  y: number,
  w: number,
  h: number,
  panes: Record<string, PaneConfig> | undefined,
  out: PaneBox[]
) {
  if (node.type === "empty") return;
  if (node.type === "pane") {
    const opening = paneOpening(node.id, panes);
    out.push({
      id: node.id,
      x,
      y,
      w,
      h,
      kind: frameKindForOpening(opening),
      opening,
      bouclier: paneBouclier(node.id, panes),
    });
    return;
  }

  const total = sum(node.ratios) || 1;
  let offset = 0;
  node.children.forEach((child, i) => {
    const portion = node.ratios[i]! / total;
    if (node.dir === "v") {
      const cw = w * portion;
      collectPaneBoxes(child, x + offset, y, cw, h, panes, out);
      offset += cw;
    } else {
      const ch = h * portion;
      collectPaneBoxes(child, x, y + offset, w, ch, panes, out);
      offset += ch;
    }
  });
}

function aabbOf(
  boxes: PaneBox[]
): { x: number; y: number; w: number; h: number } | null {
  if (boxes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function frameIronPerimeterMm(
  fw: number,
  fh: number,
  deductions: IronDeductions
): number {
  const vars = { W: fw, H: fh, FW: fw, FH: fh };
  const iw = evalIronMm(deductions.frame.width, vars);
  const ih = evalIronMm(deductions.frame.height, vars);
  return 2 * (iw + ih);
}

function sashIronPerimeterMm(
  w: number,
  h: number,
  fw: number,
  fh: number,
  deductions: IronDeductions
): number {
  const vars = { W: w, H: h, FW: fw, FH: fh, SW: w, SH: h };
  const iw = evalIronMm(deductions.sash.width, vars);
  const ih = evalIronMm(deductions.sash.height, vars);
  return 2 * (iw + ih);
}

function mullionIronLengthMm(
  segmentMm: number,
  deductions: IronDeductions
): number {
  return evalIronMm(deductions.mullion, { L: segmentMm });
}

function collectFrameMullions(
  node: LayoutNode,
  w: number,
  h: number,
  panes: Record<string, PaneConfig> | undefined,
  out: number[],
  countedBouclierPanes: Set<string>
) {
  if (node.type !== "split") return;

  const total = sum(node.ratios) || 1;
  const sizes = node.ratios.map(
    (r) => ((node.dir === "v" ? w : h) * r) / total
  );

  node.children.forEach((child, i) => {
    const size = sizes[i]!;
    const childW = node.dir === "v" ? size : w;
    const childH = node.dir === "h" ? size : h;
    collectFrameMullions(
      child,
      childW,
      childH,
      panes,
      out,
      countedBouclierPanes
    );

    if (child.type === "pane" && paneBouclier(child.id, panes)) {
      countedBouclierPanes.add(child.id);
    }

    if (i >= node.children.length - 1) return;
    const next = node.children[i + 1]!;
    const kind = classifyJunction(child, next, node.dir, panes);
    if (kind !== "mullion") return;
    const span = node.dir === "v" ? h : w;
    out.push(span);
  });
}

function collectSashMullions(
  boxes: PaneBox[],
  panes: Record<string, PaneConfig> | undefined,
  out: number[]
) {
  for (const box of boxes) {
    if (isExhaustPane(box.opening)) continue;
    if (box.bouclier) continue;
    const grid = normalizePaneConfig(panes?.[box.id]).grid ?? "solid";
    if (grid === "solid") continue;
    const lines = gridLines(grid, 0, 0, box.w, box.h);
    for (const line of lines) {
      const dx = line.x2 - line.x1;
      const dy = line.y2 - line.y1;
      out.push(Math.hypot(dx, dy));
    }
  }
}

function addLine(
  lines: IronLine[],
  totals: Record<IronPieceRole, number>,
  role: IronPieceRole,
  lengthMm: number,
  details: IronSystemDetails
) {
  if (lengthMm <= 0.5) return;
  const piece = ironPieceForRole(details, role);
  if (!piece) return;
  const lengthM = roundM(mmToM(lengthMm));
  totals[role] = (totals[role] ?? 0) + lengthM;
  const existing = lines.find((l) => l.role === role);
  if (existing) {
    existing.lengthM = roundM(existing.lengthM + lengthM);
    return;
  }
  lines.push({
    role,
    label: ironRoleLabel(role),
    lengthM,
    sectionWidthMm: piece.sectionWidthMm,
    sectionHeightMm: piece.sectionHeightMm,
    pieceName: piece.name,
  });
}

function emptyBreakdown(): IronBreakdown {
  return {
    lines: [],
    frameHingedM: 0,
    frameSlidingM: 0,
    sashHingedM: 0,
    sashSlidingM: 0,
    sashDoorM: 0,
    mullionM: 0,
    totalM: 0,
  };
}

/**
 * يحسب أطوال حديد التسليح للبند الواحد (بدون ضرب الكمية).
 */
export function calcIronBreakdown(
  item: DesignItem,
  ironSystem?: MaterialSystem | null
): IronBreakdown | null {
  const ironId = item.ironId;
  if (!ironId || ironId === "none") return null;

  const catalog =
    typeof window !== "undefined" ? loadMaterialCatalog() : undefined;
  const system =
    ironSystem ??
    catalog?.iron.find((s) => s.id === ironId) ??
    null;
  if (!system) return null;

  const details = system.iron ?? defaultIronDetails();
  const widthMm = Math.max(0, item.widthMm || 0);
  const heightMm = Math.max(0, item.heightMm || 0);
  if (widthMm <= 0 || heightMm <= 0) return emptyBreakdown();

  const layout: LayoutNode =
    item.layout ?? ({ type: "pane", id: "root" } as LayoutNode);
  const panes = item.panes;
  const boxes: PaneBox[] = [];
  collectPaneBoxes(layout, 0, 0, widthMm, heightMm, panes, boxes);
  if (boxes.length === 0) return emptyBreakdown();

  const cutDeductions = getCutDeductions(catalog);
  const cuts = calcCutSizes(widthMm, heightMm, cutDeductions);
  const fw = cuts.frameWidthMm;
  const fh = cuts.frameHeightMm;

  const hingedBoxes = boxes.filter((b) => b.kind === "hinged");
  const slidingBoxes = boxes.filter((b) => b.kind === "sliding");
  const hasHinged = hingedBoxes.length > 0;
  const hasSliding = slidingBoxes.length > 0;
  const isMixedFrame = hasHinged && hasSliding;

  const lines: IronLine[] = [];
  const totals = {} as Record<IronPieceRole, number>;

  // ── حلق ─────────────────────────────────────────────
  if (!isMixedFrame) {
    const peri = frameIronPerimeterMm(fw, fh, details.deductions);
    if (hasSliding && peri > 0) {
      addLine(lines, totals, "frame-sliding", peri, details);
    } else if (hasHinged && peri > 0) {
      addLine(lines, totals, "frame-hinged", peri, details);
    }
  } else {
    const hingedAabb = aabbOf(hingedBoxes);
    const slidingAabb = aabbOf(slidingBoxes);
    if (hingedAabb) {
      const hCuts = calcCutSizes(hingedAabb.w, hingedAabb.h, cutDeductions);
      const peri = frameIronPerimeterMm(
        hCuts.frameWidthMm,
        hCuts.frameHeightMm,
        details.deductions
      );
      addLine(lines, totals, "frame-hinged", peri, details);
    }
    if (slidingAabb) {
      const sCuts = calcCutSizes(slidingAabb.w, slidingAabb.h, cutDeductions);
      const peri = frameIronPerimeterMm(
        sCuts.frameWidthMm,
        sCuts.frameHeightMm,
        details.deductions
      );
      addLine(lines, totals, "frame-sliding", peri, details);
    }
  }

  // ── ضلفة ────────────────────────────────────────────
  const cat = catalog;
  for (const box of boxes) {
    if (!isOpeningSash(box.opening)) continue;
    const cfg = normalizePaneConfig(panes?.[box.id]);
    if (meshReplacesPaneGlass(cfg, box.opening, cat)) continue;

    const peri = sashIronPerimeterMm(box.w, box.h, fw, fh, details.deductions);
    if (peri <= 0) continue;

    if (box.kind === "sliding") {
      addLine(lines, totals, "sash-sliding", peri, details);
    } else if (isDoorPane(box.opening, cfg)) {
      addLine(lines, totals, "sash-door", peri, details);
    } else {
      addLine(lines, totals, "sash-hinged", peri, details);
    }
  }

  // ── سوقاس ───────────────────────────────────────────
  if (ironPieceForRole(details, "mullion")) {
    const segments: number[] = [];
    collectFrameMullions(
      layout,
      widthMm,
      heightMm,
      panes,
      segments,
      new Set()
    );
    collectSashMullions(boxes, panes, segments);
    let mullionMm = 0;
    for (const seg of segments) {
      mullionMm += mullionIronLengthMm(seg, details.deductions);
    }
    addLine(lines, totals, "mullion", mullionMm, details);
  }

  const frameHingedM = totals["frame-hinged"] ?? 0;
  const frameSlidingM = totals["frame-sliding"] ?? 0;
  const sashHingedM = totals["sash-hinged"] ?? 0;
  const sashSlidingM = totals["sash-sliding"] ?? 0;
  const sashDoorM = totals["sash-door"] ?? 0;
  const mullionM = totals.mullion ?? 0;
  const totalM = roundM(
    frameHingedM +
      frameSlidingM +
      sashHingedM +
      sashSlidingM +
      sashDoorM +
      mullionM
  );

  return {
    lines: lines.sort((a, b) => a.label.localeCompare(b.label, "ar")),
    frameHingedM,
    frameSlidingM,
    sashHingedM,
    sashSlidingM,
    sashDoorM,
    mullionM,
    totalM,
    systemName: system.name,
  };
}

export function scaleIronBreakdown(
  breakdown: IronBreakdown,
  qty: number
): IronBreakdown {
  const n = Math.max(1, qty || 1);
  if (n === 1) return breakdown;
  const scale = (v: number) => roundM(v * n);
  return {
    ...breakdown,
    lines: breakdown.lines.map((l) => ({
      ...l,
      lengthM: scale(l.lengthM),
    })),
    frameHingedM: scale(breakdown.frameHingedM),
    frameSlidingM: scale(breakdown.frameSlidingM),
    sashHingedM: scale(breakdown.sashHingedM),
    sashSlidingM: scale(breakdown.sashSlidingM),
    sashDoorM: scale(breakdown.sashDoorM),
    mullionM: scale(breakdown.mullionM),
    totalM: scale(breakdown.totalM),
  };
}
