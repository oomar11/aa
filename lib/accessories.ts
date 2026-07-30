import {
  isExhaustPane,
  normalizePaneConfig,
  type DesignItem,
  type PaneConfig,
  type PaneOpening,
} from "@/lib/design-items";
import { isBouclierEligible } from "@/lib/bouclier";
import {
  accessoryRoleLabel,
  accessoryUnitPrice,
  calcCutSizes,
  findSystem,
  getAccessoryDetails,
  getProfileDetails,
  loadMaterialCatalog,
  meshCategoryCalcProfile,
  pickEspagnoletteSizeCm,
  type AccessoryPieceRole,
  type AccessorySystemDetails,
  type MaterialCatalog,
} from "@/lib/material-systems";
import {
  frameKindForOpening,
  isDoorPane,
  type FrameKind,
} from "@/lib/materials";
import type { LayoutNode } from "@/lib/window-layout";

export type AccessoryLine = {
  role: AccessoryPieceRole;
  label: string;
  qty: number;
  /** للقطع الطولية (تراك، فرش، تقابل) بالمتر */
  lengthM?: number;
  /** مقاس السبلونة بالسم إن وُجد */
  sizeCm?: number;
  unitPrice: number;
  totalCost: number;
  hint?: string;
};

export type AccessoryBreakdown = {
  lines: AccessoryLine[];
  hingedSashCount: number;
  slidingSashCount: number;
  bouclierCount: number;
  totalUnitCost: number;
  totalCost: number;
  hasPricing: boolean;
};

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

type BouclierTriple = {
  bouclierId: string;
  leftSashId: string;
  rightSashId: string;
};

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

function roundQty(n: number) {
  return Math.round(n * 1000) / 1000;
}

function roundM(m: number) {
  return Math.round(m * 1000) / 1000;
}

function mmToM(mm: number) {
  return Math.max(0, mm) / 1000;
}

function isHingedSash(opening: PaneOpening, cfg: PaneConfig): boolean {
  if (isExhaustPane(opening)) return false;
  if (opening === "fixed" || opening === "panel-h" || opening === "panel-v") {
    return false;
  }
  if (frameKindForOpening(opening) === "sliding") return false;
  return isOpeningSash(opening);
}

function isOpeningSash(opening: PaneOpening): boolean {
  return opening !== "fixed" && opening !== "exhaust";
}

function isSlidingSash(opening: PaneOpening): boolean {
  return frameKindForOpening(opening) === "sliding" && isOpeningSash(opening);
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

function paneIdOf(node: LayoutNode): string | undefined {
  if (node.type === "pane") return node.id;
  return undefined;
}

function findBouclierTriples(
  node: LayoutNode,
  panes: Record<string, PaneConfig> | undefined,
  out: BouclierTriple[]
) {
  if (node.type !== "split") return;

  if (node.dir === "v") {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i]!;
      if (child.type !== "pane") {
        findBouclierTriples(child, panes, out);
        continue;
      }
      const cfg = normalizePaneConfig(panes?.[child.id]);
      if (cfg.opening !== "fixed" || !cfg.bouclier) continue;
      if (!isBouclierEligible(child.id, node, panes ?? {})) continue;

      const leftId =
        i > 0 ? paneIdOf(node.children[i - 1]!) : undefined;
      const rightId =
        i < node.children.length - 1
          ? paneIdOf(node.children[i + 1]!)
          : undefined;
      if (!leftId || !rightId) continue;

      out.push({
        bouclierId: child.id,
        leftSashId: leftId,
        rightSashId: rightId,
      });
    }
  }

  for (const child of node.children) {
    findBouclierTriples(child, panes, out);
  }
}

/** مقاس السبلونة من ناحية المقبض = ارتفاع الضلفة بعد التخصيم */
function sashEspagnoletteDimMm(
  box: PaneBox,
  item: DesignItem,
  catalog?: MaterialCatalog
): number {
  const profile = getProfileDetails(item.systemId, catalog);
  if (profile && item.widthMm > 0 && item.heightMm > 0) {
    const cuts = calcCutSizes(item.widthMm, item.heightMm, profile.deductions);
    if (!cuts.errors.sashHeight && cuts.sashHeightMm > 0) {
      return cuts.sashHeightMm;
    }
  }
  return box.h;
}

function aabbOf(boxes: PaneBox[]) {
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

type SplitGroup = {
  paneIds: string[];
  widthMm: number;
  heightMm: number;
};

function collectSplitGroups(
  node: LayoutNode,
  x: number,
  y: number,
  w: number,
  h: number,
  out: SplitGroup[]
) {
  if (node.type === "empty") return;
  if (node.type === "pane") {
    out.push({ paneIds: [node.id], widthMm: w, heightMm: h });
    return;
  }

  if (node.children.length > 1) {
    const ids: string[] = [];
    function walk(n: LayoutNode) {
      if (n.type === "pane") ids.push(n.id);
      else if (n.type === "split") n.children.forEach(walk);
    }
    node.children.forEach(walk);
    out.push({ paneIds: ids, widthMm: w, heightMm: h });
  }

  const total = sum(node.ratios) || 1;
  let offset = 0;
  node.children.forEach((child, i) => {
    const portion = node.ratios[i]! / total;
    if (node.dir === "v") {
      const cw = w * portion;
      collectSplitGroups(child, x + offset, y, cw, h, out);
      offset += cw;
    } else {
      const ch = h * portion;
      collectSplitGroups(child, x, y + offset, w, ch, out);
      offset += ch;
    }
  });
}

function pushQtyLine(
  lines: AccessoryLine[],
  details: AccessorySystemDetails,
  role: AccessoryPieceRole,
  qty: number,
  hint?: string,
  sizeCm?: number
) {
  if (qty <= 0) return;
  const unitPrice = accessoryUnitPrice(details, role);
  lines.push({
    role,
    label: accessoryRoleLabel(role),
    qty: roundQty(qty),
    sizeCm,
    unitPrice,
    totalCost: roundQty(qty * unitPrice),
    hint,
  });
}

function pushLengthLine(
  lines: AccessoryLine[],
  details: AccessorySystemDetails,
  role: AccessoryPieceRole,
  lengthM: number,
  qty: number,
  hint?: string
) {
  if (qty <= 0 || lengthM <= 0) return;
  const unitPrice = accessoryUnitPrice(details, role);
  lines.push({
    role,
    label: accessoryRoleLabel(role),
    qty: roundQty(qty),
    lengthM: roundM(lengthM),
    unitPrice,
    totalCost: roundQty(qty * lengthM * unitPrice),
    hint,
  });
}

function emptyBreakdown(): AccessoryBreakdown {
  return {
    lines: [],
    hingedSashCount: 0,
    slidingSashCount: 0,
    bouclierCount: 0,
    totalUnitCost: 0,
    totalCost: 0,
    hasPricing: false,
  };
}

/**
 * حساب اكسسوار البند (مفصلي + جرار + بوكلير).
 * يعتمد على accessoryId ونظام الاكسسوار في كتالوج الخامات.
 */
export function calcAccessoryBreakdown(
  item: DesignItem,
  catalog?: MaterialCatalog
): AccessoryBreakdown {
  const cat = catalog ?? loadMaterialCatalog();
  const accessoryId = item.accessoryId;
  if (!accessoryId || accessoryId === "none") return emptyBreakdown();

  const system = findSystem("accessories", accessoryId, cat);
  const details = system?.accessory ?? getAccessoryDetails(accessoryId, cat);
  if (!details) return emptyBreakdown();

  const widthMm = Math.max(0, item.widthMm || 0);
  const heightMm = Math.max(0, item.heightMm || 0);
  const layout: LayoutNode =
    item.layout ?? ({ type: "pane", id: "root" } as LayoutNode);
  const panes = item.panes ?? {};

  const boxes: PaneBox[] = [];
  collectPaneBoxes(layout, 0, 0, widthMm, heightMm, panes, boxes);
  if (boxes.length === 0 || widthMm <= 0 || heightMm <= 0) {
    return emptyBreakdown();
  }

  const hingedRules = details.hinged;
  const slidingRules = details.sliding;
  const lines: AccessoryLine[] = [];

  const hingedBoxes = boxes.filter((b) => {
    const cfg = normalizePaneConfig(panes[b.id]);
    return isHingedSash(b.opening, cfg);
  });
  const slidingBoxes = boxes.filter((b) => isSlidingSash(b.opening));

  const bouclierTriples: BouclierTriple[] = [];
  findBouclierTriples(layout, panes, bouclierTriples);
  const activeBoucliers = bouclierTriples.filter((t) =>
    Boolean(normalizePaneConfig(panes[t.bouclierId]).bouclier)
  );

  const sharedSashIds = new Set<string>();
  if (hingedRules.bouclierSharedEspagnolette) {
    for (const t of activeBoucliers) {
      sharedSashIds.add(t.leftSashId);
      sharedSashIds.add(t.rightSashId);
    }
  }

  const hingedSashCount = hingedBoxes.length;
  const slidingSashCount = slidingBoxes.length;
  const bouclierCount = activeBoucliers.length;

  // ——— مفصلي ———
  const hingeQty = hingedSashCount * hingedRules.hingesPerSash;
  pushQtyLine(
    lines,
    details,
    "hinge",
    hingeQty,
    `${hingedRules.hingesPerSash}/ضلفة · نفس لون الشباك`
  );

  let espagnoletteCount = hingedSashCount;
  if (hingedRules.bouclierSharedEspagnolette) {
    espagnoletteCount -= activeBoucliers.length;
  }
  espagnoletteCount = Math.max(0, espagnoletteCount);

  const espagnoletteSizes = new Map<number, number>();
  for (const box of hingedBoxes) {
    const inSharedPair = sharedSashIds.has(box.id);
    const dim = sashEspagnoletteDimMm(box, item, cat);
    const sizeCm = pickEspagnoletteSizeCm(
      dim,
      hingedRules.espagnoletteSizesCm
    );
    if (inSharedPair && hingedRules.bouclierSharedEspagnolette) {
      const triple = activeBoucliers.find(
        (t) => t.leftSashId === box.id || t.rightSashId === box.id
      );
      if (triple && box.id === triple.rightSashId) continue;
    }
    espagnoletteSizes.set(sizeCm, (espagnoletteSizes.get(sizeCm) ?? 0) + 1);
  }

  for (const [sizeCm, qty] of [...espagnoletteSizes.entries()].sort(
    (a, b) => a[0] - b[0]
  )) {
    pushQtyLine(
      lines,
      details,
      "hinged-espagnolette",
      qty,
      `مقاس ${sizeCm} سم`,
      sizeCm
    );
  }

  let hingeScrewQty =
    hingedSashCount *
    hingedRules.hingesPerSash *
    hingedRules.screwsPerSashPerHinge;
  if (hingedRules.bouclierReplacesHingeScrews > 0) {
    hingeScrewQty -=
      activeBoucliers.length * hingedRules.bouclierReplacesHingeScrews;
  }
  hingeScrewQty = Math.max(0, hingeScrewQty);
  pushQtyLine(
    lines,
    details,
    "hinged-screw",
    hingeScrewQty,
    hingedRules.screwPackQty > 0
      ? `عبوة ${hingedRules.screwPackQty}`
      : undefined
  );

  pushQtyLine(
    lines,
    details,
    "protruding-handle",
    espagnoletteCount * hingedRules.handlesPerEspagnolette,
    `${hingedRules.handlesPerEspagnolette}/سبلونة`
  );

  // ——— بوكلير ———
  if (bouclierCount > 0) {
    pushQtyLine(
      lines,
      details,
      "bouclier-screw",
      bouclierCount * hingedRules.bouclierScrewsPerUnit,
      "بدل سكاك مفصلي"
    );
    pushQtyLine(
      lines,
      details,
      "bouclier-bolt",
      bouclierCount * hingedRules.bouclierBoltsPerUnit,
      `${hingedRules.bouclierBoltsPerUnit}/بوكلير`
    );
    pushQtyLine(
      lines,
      details,
      "bouclier-cap",
      bouclierCount * hingedRules.bouclierCapSetsPerUnit,
      "نفس لون البوكلير"
    );
  }

  // ——— جرار ———
  if (slidingSashCount > 0) {
    const slidingAabb = aabbOf(slidingBoxes);
    const frameWidthM = slidingAabb
      ? roundM(mmToM(slidingAabb.w))
      : roundM(mmToM(widthMm));
    pushLengthLine(
      lines,
      details,
      "sliding-track",
      frameWidthM,
      slidingRules.tracksPerFrameWidth,
      `${slidingRules.tracksPerFrameWidth}× عرض الحلق`
    );

    pushQtyLine(
      lines,
      details,
      "sliding-wheel",
      slidingSashCount * slidingRules.wheelsPerSash,
      `${slidingRules.wheelsPerSash}/ضلفة`
    );

    let totalBrushM = 0;
    for (const box of slidingBoxes) {
      const sashH = sashEspagnoletteDimMm(box, item, cat);
      const brushLen =
        slidingRules.brushWraps > 0
          ? roundM(mmToM((sashH * 2) / slidingRules.brushWraps))
          : roundM(mmToM(sashH));
      totalBrushM += brushLen;
    }
    pushLengthLine(
      lines,
      details,
      "sliding-brush",
      roundM(totalBrushM),
      1,
      slidingRules.brushWraps === 2
        ? "لفّتين = ارتفاع الضلفة مرة"
        : undefined
    );

    const slidingEspSizes = new Map<number, number>();
    for (const box of slidingBoxes) {
      const dim = sashEspagnoletteDimMm(box, item, cat);
      const sizeCm = pickEspagnoletteSizeCm(
        dim,
        slidingRules.espagnoletteSizesCm
      );
      slidingEspSizes.set(sizeCm, (slidingEspSizes.get(sizeCm) ?? 0) + 1);
    }
    for (const [sizeCm, qty] of [...slidingEspSizes.entries()].sort(
      (a, b) => a[0] - b[0]
    )) {
      pushQtyLine(
        lines,
        details,
        "sliding-espagnolette",
        qty,
        `مقاس ${sizeCm} سم`,
        sizeCm
      );
    }

    pushQtyLine(
      lines,
      details,
      "sliding-screw",
      slidingSashCount * slidingRules.screwsPerSashPerEspagnolette,
      `${slidingRules.screwsPerSashPerEspagnolette}/سبلونة`
    );
  }

  // تقابل ٤ ضلف جرار
  if (slidingRules.meetingPieceFor4Sashes && slidingSashCount >= 4) {
    const groups: SplitGroup[] = [];
    collectSplitGroups(layout, 0, 0, widthMm, heightMm, groups);
    let meeting4 = 0;
    let meetingLenM = 0;
    for (const g of groups) {
      const slidingInGroup = g.paneIds.filter((id) => {
        const op = paneOpening(id, panes);
        return isSlidingSash(op);
      });
      if (slidingInGroup.length !== 4) continue;
      meeting4 += 1;
      const sample = boxes.find((b) => b.id === slidingInGroup[0]);
      const sashH = sample
        ? sashEspagnoletteDimMm(sample, item, cat)
        : g.heightMm;
      meetingLenM += roundM(mmToM(sashH));
    }
    if (meeting4 > 0) {
      pushLengthLine(
        lines,
        details,
        "meeting-4-sash",
        roundM(meetingLenM / meeting4),
        meeting4,
        "قطعة واحدة للأربع ضلف"
      );
    }
  }

  // تقابل سلك جرار
  if (slidingRules.meetingPieceFor2MeshSliding) {
    const groups: SplitGroup[] = [];
    collectSplitGroups(layout, 0, 0, widthMm, heightMm, groups);
    let meetingMesh = 0;
    let meetingLenM = 0;
    for (const g of groups) {
      const meshSliding = g.paneIds.filter((id) => {
        const cfg = normalizePaneConfig(panes[id]);
        if (!cfg.mesh || !cfg.meshKind) return false;
        const op = paneOpening(id, panes);
        if (!isSlidingSash(op)) return false;
        return meshCategoryCalcProfile(cfg.meshKind, cat);
      });
      if (meshSliding.length < 2) continue;
      meetingMesh += 1;
      const sample = boxes.find((b) => b.id === meshSliding[0]);
      meetingLenM += sample
        ? roundM(mmToM(sashEspagnoletteDimMm(sample, item, cat)))
        : roundM(mmToM(g.heightMm));
    }
    if (meetingMesh > 0) {
      pushLengthLine(
        lines,
        details,
        "meeting-mesh-sliding",
        roundM(meetingLenM / meetingMesh),
        meetingMesh,
        "نفس ارتفاع سلك الجرار"
      );
    }
  }

  const totalUnitCost = roundQty(
    lines.reduce((acc, l) => acc + l.totalCost, 0)
  );
  const hasPricing = lines.some((l) => l.unitPrice > 0);
  const qty = Math.max(1, item.qty || 1);

  return {
    lines,
    hingedSashCount,
    slidingSashCount,
    bouclierCount,
    totalUnitCost,
    totalCost: roundQty(totalUnitCost * qty),
    hasPricing,
  };
}

/** يضرب كميات الاكسسوار في كمية البند */
export function scaleAccessoryBreakdown(
  b: AccessoryBreakdown,
  qty: number
): AccessoryBreakdown {
  const q = Math.max(1, qty || 1);
  if (q === 1) return b;
  return {
    ...b,
    lines: b.lines.map((l) => ({
      ...l,
      qty: roundQty(l.qty * q),
      totalCost: roundQty(l.totalCost * q),
    })),
    hingedSashCount: b.hingedSashCount * q,
    slidingSashCount: b.slidingSashCount * q,
    bouclierCount: b.bouclierCount * q,
    totalUnitCost: b.totalUnitCost,
    totalCost: roundQty(b.totalUnitCost * q),
    hasPricing: b.hasPricing,
  };
}
