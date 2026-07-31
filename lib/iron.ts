/**
 * حساب حديد التسليح الموحّد + تراك الجرار + شريحة المفصلة.
 * الحديد أصغر من القطاع حسب تخصيمات النظام (افتراضي −١٠ سم).
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
  meshReplacesPaneGlass,
  type FrameKind,
} from "@/lib/materials";
import {
  calcCutSizes,
  defaultIronDetails,
  getCutDeductions,
  getIronSystem,
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
  /** عدد القطع (للتراك وشريحة المفصلة) */
  qty?: number;
  /** عدد الأعواد التقريبي = ceil(lengthM / barLengthM) */
  barsApprox?: number;
  sectionWidthMm?: number;
  sectionHeightMm?: number;
  pieceName?: string;
  pricePerM?: number;
  totalCost?: number;
};

export type IronBreakdown = {
  lines: IronLine[];
  frameM: number;
  sashM: number;
  mullionM: number;
  trackM: number;
  trackQty: number;
  hingeStripM: number;
  hingeStripQty: number;
  totalM: number;
  totalCost: number;
  systemName?: string;
  /** @deprecated توافق مع العرض القديم */
  frameHingedM: number;
  frameSlidingM: number;
  sashHingedM: number;
  sashSlidingM: number;
  sashDoorM: number;
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

/** مفصلي أو قلاب أو باب — جنب فيه مفصلات (مش جرار) */
function isHingedFamily(opening: PaneOpening): boolean {
  if (!isOpeningSash(opening)) return false;
  if (opening.startsWith("panel")) return false;
  return frameKindForOpening(opening) === "hinged";
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

function hingeStripLengthMm(
  sashH: number,
  fw: number,
  fh: number,
  deductions: IronDeductions
): number {
  const formula =
    deductions.hingeStrip?.trim() ||
    deductions.sash.height ||
    "=SH-100";
  return evalIronMm(formula, {
    W: sashH,
    H: sashH,
    FW: fw,
    FH: fh,
    SW: sashH,
    SH: sashH,
  });
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

function barsFor(lengthM: number, barLengthM: number): number | undefined {
  if (!(barLengthM > 0) || lengthM <= 0) return undefined;
  return Math.ceil(lengthM / barLengthM);
}

function addLine(
  lines: IronLine[],
  totals: Partial<Record<IronPieceRole, number>>,
  role: IronPieceRole,
  lengthMm: number,
  details: IronSystemDetails,
  qty?: number
) {
  if (lengthMm <= 0.5 && !(qty != null && qty > 0 && lengthMm > 0)) {
    if (!(qty != null && qty > 0 && lengthMm > 0.01)) return;
  }
  if (lengthMm <= 0.5 && (qty == null || qty <= 0)) return;

  const piece = ironPieceForRole(details, role);
  if (!piece) return;
  const lengthM = roundM(mmToM(lengthMm));
  totals[role] = roundM((totals[role] ?? 0) + lengthM);
  const existing = lines.find((l) => l.role === role);
  const pricePerM = piece.pricePerM;
  const addedCost =
    pricePerM != null && pricePerM > 0
      ? roundM(lengthM * pricePerM)
      : undefined;

  if (existing) {
    existing.lengthM = roundM(existing.lengthM + lengthM);
    if (qty != null) existing.qty = (existing.qty ?? 0) + qty;
    existing.barsApprox = barsFor(existing.lengthM, piece.barLengthM);
    if (addedCost != null) {
      existing.totalCost = roundM((existing.totalCost ?? 0) + addedCost);
    }
    return;
  }

  lines.push({
    role,
    label: ironRoleLabel(role),
    lengthM,
    qty,
    barsApprox: barsFor(lengthM, piece.barLengthM),
    sectionWidthMm: piece.sectionWidthMm || undefined,
    sectionHeightMm: piece.sectionHeightMm || undefined,
    pieceName: piece.name,
    pricePerM: pricePerM != null && pricePerM > 0 ? pricePerM : undefined,
    totalCost: addedCost,
  });
}

function emptyBreakdown(): IronBreakdown {
  return {
    lines: [],
    frameM: 0,
    sashM: 0,
    mullionM: 0,
    trackM: 0,
    trackQty: 0,
    hingeStripM: 0,
    hingeStripQty: 0,
    totalM: 0,
    totalCost: 0,
    frameHingedM: 0,
    frameSlidingM: 0,
    sashHingedM: 0,
    sashSlidingM: 0,
    sashDoorM: 0,
  };
}

/**
 * يحسب أطوال حديد التسليح للبند الواحد (بدون ضرب الكمية).
 * الحديد سيستم واحد لكل الشغل — مش اختيار من قائمة أنظمة.
 */
export function calcIronBreakdown(
  item: DesignItem,
  ironSystemParam?: MaterialSystem | null,
  _profileSystem?: MaterialSystem | null
): IronBreakdown | null {
  const catalog =
    typeof window !== "undefined" ? loadMaterialCatalog() : undefined;
  const system = ironSystemParam ?? getIronSystem(catalog);
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

  const lines: IronLine[] = [];
  const totals: Partial<Record<IronPieceRole, number>> = {};

  // ── حلق (موحّد) ─────────────────────────────────────
  const framePeri = frameIronPerimeterMm(fw, fh, details.deductions);
  addLine(lines, totals, "frame", framePeri, details);

  // ── ضلفة (موحّد لكل الفتحات) ─────────────────────────
  const cat = catalog;
  for (const box of boxes) {
    if (!isOpeningSash(box.opening)) continue;
    const cfg = normalizePaneConfig(panes?.[box.id]);
    if (meshReplacesPaneGlass(cfg, box.opening, cat)) continue;

    const peri = sashIronPerimeterMm(box.w, box.h, fw, fh, details.deductions);
    addLine(lines, totals, "sash", peri, details);
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

  // ── تراك جرار ───────────────────────────────────────
  const slidingBoxes = boxes.filter((b) => b.kind === "sliding");
  let trackQty = 0;
  let trackM = 0;
  if (slidingBoxes.length > 0 && ironPieceForRole(details, "track")) {
    const aabb = aabbOf(slidingBoxes);
    const frameW = aabb?.w || widthMm;
    trackQty = Math.max(0, details.tracksPerFrame || 0);
    if (trackQty > 0 && frameW > 0) {
      const trackMm = trackQty * frameW;
      trackM = roundM(mmToM(trackMm));
      addLine(lines, totals, "track", trackMm, details, trackQty);
    }
  }

  // ── شريحة مفصلة (مفصلي + قلاب) ───────────────────────
  let hingeStripQty = 0;
  let hingeStripM = 0;
  if (ironPieceForRole(details, "hinge-strip")) {
    for (const box of boxes) {
      if (!isHingedFamily(box.opening)) continue;
      const cfg = normalizePaneConfig(panes?.[box.id]);
      if (meshReplacesPaneGlass(cfg, box.opening, cat)) continue;
      const lenMm = hingeStripLengthMm(box.h, fw, fh, details.deductions);
      if (lenMm <= 0.5) continue;
      hingeStripQty += 1;
      hingeStripM = roundM(hingeStripM + mmToM(lenMm));
      addLine(lines, totals, "hinge-strip", lenMm, details, 1);
    }
  }

  const frameM = totals.frame ?? 0;
  const sashM = totals.sash ?? 0;
  const mullionM = totals.mullion ?? 0;
  const totalM = roundM(
    frameM + sashM + mullionM + trackM + hingeStripM
  );
  const totalCost = roundM(
    lines.reduce((s, l) => s + (l.totalCost ?? 0), 0)
  );

  return {
    lines: lines.sort((a, b) => a.label.localeCompare(b.label, "ar")),
    frameM,
    sashM,
    mullionM,
    trackM,
    trackQty,
    hingeStripM,
    hingeStripQty,
    totalM,
    totalCost,
    systemName: system.name,
    // توافق قديم للعرض
    frameHingedM: frameM,
    frameSlidingM: 0,
    sashHingedM: sashM,
    sashSlidingM: 0,
    sashDoorM: 0,
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
      qty: l.qty != null ? l.qty * n : undefined,
      barsApprox:
        l.barsApprox != null ? Math.ceil((l.barsApprox * n) ) : undefined,
      totalCost: l.totalCost != null ? scale(l.totalCost) : undefined,
    })),
    frameM: scale(breakdown.frameM),
    sashM: scale(breakdown.sashM),
    mullionM: scale(breakdown.mullionM),
    trackM: scale(breakdown.trackM),
    trackQty: breakdown.trackQty * n,
    hingeStripM: scale(breakdown.hingeStripM),
    hingeStripQty: breakdown.hingeStripQty * n,
    totalM: scale(breakdown.totalM),
    totalCost: scale(breakdown.totalCost),
    frameHingedM: scale(breakdown.frameHingedM),
    frameSlidingM: scale(breakdown.frameSlidingM),
    sashHingedM: scale(breakdown.sashHingedM),
    sashSlidingM: scale(breakdown.sashSlidingM),
    sashDoorM: scale(breakdown.sashDoorM),
  };
}
