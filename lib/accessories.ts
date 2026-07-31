/**
 * حساب اكسسوار المفصلي والجرار من إعدادات نظام الاكسسوار + رسم البند.
 *
 * مفصلي (شباك):
 * - مفصلات لكل ضلفة (٢ — من الإعدادات)
 * - سبلونة مفصلي حسب ارتفاع ناحية المقبض
 * - سكاك مفصلي لكل سبلونة (كميات قابلة للتعديل)
 * - ضلفتين + بوكلير: سبلونة واحدة، سكاك بوكلير، ترباس + سكاك ترباس، مقبض بارز
 *
 * باب مفصلي:
 * - مفصلات باب (٣ — من الإعدادات)
 * - كالون + مقبض إشارة + وش تسكيك (من غير سبلونة/سكاك مفصلي)
 * - لون المقبض = لون الإطار/الباب
 *
 * جرار:
 * - تراك ×٢ بعرض الحلق
 * - عجلتين لكل ضلفة
 * - فرش: محيط الضلفة ×٢ + ارتفاع السكينة ×١
 * - سبلونة/سكاك جرار
 * - مقبض غاطس على الضلفة الغاطسة
 */

import {
  FRAME_COLORS,
  normalizePaneConfig,
  type DesignItem,
  type FrameColorId,
  type PaneConfig,
  type PaneOpening,
} from "@/lib/design-items";
import {
  areFacingHandles,
  frameKindForOpening,
  isDoorPane,
  slidingSashDepthMap,
  type FrameKind,
} from "@/lib/materials";
import {
  itemHasOwnAccessory,
  resolveProjectAccessoryDetails,
  type ProjectMaterialDefaults,
} from "@/lib/project-materials";
import {
  ACCESSORY_BRAND_CATEGORIES,
  findSystem,
  getDefaultAccessoryDetails,
  loadMaterialCatalog,
  pickEspagnoletteSize,
  resolveCategoryBrandName,
  type AccessoryBrandCategory,
  type AccessoryLockPiece,
  type AccessorySystemDetails,
  type EspagnoletteSize,
  type MaterialCatalog,
} from "@/lib/material-systems";
import type { LayoutNode } from "@/lib/window-layout";

export type EspagnoletteLine = {
  size: EspagnoletteSize;
  qty: number;
};

export type LockPieceLine = {
  id: string;
  name: string;
  qty: number;
};

export type AccessoriesBreakdown = {
  /** نظام الاكسسوار المطبق */
  systemName: string | null;
  hasAccessories: boolean;

  // ── مفصلي ──────────────────────────────────────────
  hingeQty: number;
  hingedEspagnolettes: EspagnoletteLine[];
  hingedLockPieces: LockPieceLine[];
  bouclierLockPieces: LockPieceLine[];
  boltQty: number;
  bouclierBoltLockPieces: LockPieceLine[];
  protrudingHandleQty: number;
  /** كالون — ضلفة باب مفصلي */
  doorCylinderQty: number;
  /** مقبض إشارة — ضلفة باب مفصلي */
  doorSignalHandleQty: number;
  /** وش تسكيك — ضلفة باب مفصلي */
  doorEscutcheonQty: number;
  /** لون مقبض الباب (= لون الإطار) */
  doorHandleColorLabel: string | null;

  // ── جرار ───────────────────────────────────────────
  /** عدد قطع التراك (عادة ٢) */
  trackQty: number;
  /** إجمالي طول التراك بالمتر (العدد × عرض الحلق) */
  trackLengthM: number;
  rollerQty: number;
  brushLengthM: number;
  slidingEspagnolettes: EspagnoletteLine[];
  slidingLockPieces: LockPieceLine[];
  /** مقبض غاطس — لكل ضلفة جرار غاطسة */
  recessedHandleQty: number;
  /** أسماء البراندات المختارة لكل فئة */
  brandLabels: Partial<Record<AccessoryBrandCategory, string>>;
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
  isDoor: boolean;
};

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

function mmToM(mm: number) {
  return Math.max(0, mm) / 1000;
}

function roundM(m: number) {
  return Math.round(m * 1000) / 1000;
}

function isOpeningSash(opening: PaneOpening): boolean {
  return (
    opening !== "fixed" &&
    opening !== "exhaust" &&
    opening !== "panel-h" &&
    opening !== "panel-v"
  );
}

function isHingedOpening(opening: PaneOpening): boolean {
  return frameKindForOpening(opening) === "hinged" && isOpeningSash(opening);
}

function isSlidingOpening(opening: PaneOpening): boolean {
  return frameKindForOpening(opening) === "sliding" && isOpeningSash(opening);
}

function panePerimeterMm(w: number, h: number): number {
  return 2 * (w + h);
}

function emptyBreakdown(systemName: string | null): AccessoriesBreakdown {
  return {
    systemName,
    hasAccessories: false,
    hingeQty: 0,
    hingedEspagnolettes: [],
    hingedLockPieces: [],
    bouclierLockPieces: [],
    boltQty: 0,
    bouclierBoltLockPieces: [],
    protrudingHandleQty: 0,
    doorCylinderQty: 0,
    doorSignalHandleQty: 0,
    doorEscutcheonQty: 0,
    doorHandleColorLabel: null,
    trackQty: 0,
    trackLengthM: 0,
    rollerQty: 0,
    brushLengthM: 0,
    slidingEspagnolettes: [],
    slidingLockPieces: [],
    recessedHandleQty: 0,
    brandLabels: {},
  };
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
    const cfg = normalizePaneConfig(panes?.[node.id]);
    const opening = cfg.opening;
    out.push({
      id: node.id,
      x,
      y,
      w,
      h,
      kind: frameKindForOpening(opening),
      opening,
      bouclier: Boolean(cfg.bouclier),
      isDoor: isDoorPane(opening, cfg),
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

function addEspagnolette(
  map: Map<EspagnoletteSize, number>,
  size: EspagnoletteSize,
  qty = 1
) {
  map.set(size, (map.get(size) ?? 0) + qty);
}

function espagnoletteLines(
  map: Map<EspagnoletteSize, number>
): EspagnoletteLine[] {
  return [...map.entries()]
    .filter(([, qty]) => qty > 0)
    .sort((a, b) => a[0] - b[0])
    .map(([size, qty]) => ({ size, qty }));
}

function lockPieceLines(
  pieces: AccessoryLockPiece[],
  locksetCount: number
): LockPieceLine[] {
  if (locksetCount <= 0) return [];
  return pieces
    .filter((p) => p.qtyPerLockset > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      qty: p.qtyPerLockset * locksetCount,
    }));
}

/**
 * مجموعات المفصلي:
 * - ضلفتين متقابلتين وبينهم بوكلير → مجموعة واحدة (سبلونة مشتركة)
 * - باقي الضلف المفصلي كل واحدة لوحدها
 */
function hingedLocksetGroups(boxes: PaneBox[]): {
  solo: PaneBox[];
  bouclierPairs: { left: PaneBox; right: PaneBox; bouclier: PaneBox }[];
} {
  const hinged = boxes.filter((b) => isHingedOpening(b.opening));
  // الأبواب مفصليّة بس مش بتدخل في مجموعات البوكلير/السبلونة
  const hingedWindows = hinged.filter((b) => !b.isDoor);
  const hingedDoors = hinged.filter((b) => b.isDoor);
  const boucliers = boxes.filter((b) => b.bouclier && b.opening === "fixed");
  const used = new Set<string>();
  const bouclierPairs: {
    left: PaneBox;
    right: PaneBox;
    bouclier: PaneBox;
  }[] = [];

  for (const mid of boucliers) {
    // يمين ويسار على نفس الصف تقريباً
    const left = hingedWindows
      .filter(
        (b) =>
          !used.has(b.id) &&
          Math.abs(b.y - mid.y) < 2 &&
          Math.abs(b.h - mid.h) < 2 &&
          Math.abs(b.x + b.w - mid.x) < 3
      )
      .sort((a, b) => b.x - a.x)[0];
    const right = hingedWindows
      .filter(
        (b) =>
          !used.has(b.id) &&
          Math.abs(b.y - mid.y) < 2 &&
          Math.abs(b.h - mid.h) < 2 &&
          Math.abs(mid.x + mid.w - b.x) < 3
      )
      .sort((a, b) => a.x - b.x)[0];

    if (!left || !right) continue;
    if (!areFacingHandles(left.opening, right.opening)) continue;

    used.add(left.id);
    used.add(right.id);
    used.add(mid.id);
    bouclierPairs.push({ left, right, bouclier: mid });
  }

  const soloWindows = hingedWindows.filter((b) => !used.has(b.id));
  const solo = [...soloWindows, ...hingedDoors];
  return { solo, bouclierPairs };
}

/** @deprecated استخدم pickEspagnoletteSize مع ارتفاع الضلفة والفرق الأدنى */
export function espagnoletteHeightFromSash(
  sashHeightMm: number,
  deductionMm: number
): number {
  const d = Math.max(0, deductionMm);
  return Math.max(0, sashHeightMm - d);
}

/** ارتفاع ناحية المقبض — الضلفة الرأسية */
function handleSideHeightMm(box: PaneBox): number {
  return box.h;
}

function aabbWidth(boxes: PaneBox[]): number {
  if (boxes.length === 0) return 0;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.x);
    maxX = Math.max(maxX, b.x + b.w);
  }
  return Math.max(0, maxX - minX);
}

function buildBrandLabels(
  details: AccessorySystemDetails,
  catalog?: MaterialCatalog
): Partial<Record<AccessoryBrandCategory, string>> {
  const out: Partial<Record<AccessoryBrandCategory, string>> = {};
  for (const cat of ACCESSORY_BRAND_CATEGORIES) {
    const name = resolveCategoryBrandName(
      cat.id,
      details.categoryBrands[cat.id],
      catalog
    );
    if (name) out[cat.id] = name;
  }
  return out;
}

export function accessoryBrandTag(
  labels: Partial<Record<AccessoryBrandCategory, string>>,
  category: AccessoryBrandCategory
): string {
  const name = labels[category];
  return name ? ` · ${name}` : "";
}

function resolveAccessoryDetails(
  item: DesignItem,
  catalog?: MaterialCatalog,
  project?: ProjectMaterialDefaults | null
): { details: AccessorySystemDetails; systemName: string | null } | null {
  const cat =
    catalog ??
    (typeof window !== "undefined" ? loadMaterialCatalog() : undefined);

  if (!itemHasOwnAccessory(item)) {
    const custom = resolveProjectAccessoryDetails(project, cat);
    if (custom) {
      return {
        details: custom.details,
        systemName: custom.systemName,
      };
    }
  }

  const id = item.accessoryId;
  if (!id || id === "none") {
    if (project?.accessoryId && project.accessoryId !== "none") {
      const system = findSystem("accessories", project.accessoryId, cat);
      if (system) {
        return {
          details: system.accessory ?? getDefaultAccessoryDetails(),
          systemName: system.name,
        };
      }
    }
    return null;
  }

  const system = findSystem("accessories", id, cat);
  if (!system) return null;
  return {
    details: system.accessory ?? getDefaultAccessoryDetails(),
    systemName: system.name,
  };
}

/**
 * حساب اكسسوار البند (للقطعة الواحدة — بدون ضرب الكمية).
 * لو مفيش نظام اكسسوار مختار بيرجع فاضي.
 */
export function calcItemAccessories(
  item: DesignItem,
  catalog?: MaterialCatalog,
  project?: ProjectMaterialDefaults | null
): AccessoriesBreakdown {
  const resolved = resolveAccessoryDetails(item, catalog, project);
  if (!resolved) return emptyBreakdown(null);
  const { details, systemName } = resolved;
  const widthMm = Math.max(0, item.widthMm || 0);
  const heightMm = Math.max(0, item.heightMm || 0);
  const layout: LayoutNode =
    item.layout ?? ({ type: "pane", id: "root" } as LayoutNode);
  const panes = item.panes;

  if (widthMm <= 0 || heightMm <= 0) {
    return emptyBreakdown(systemName);
  }

  const boxes: PaneBox[] = [];
  collectPaneBoxes(layout, 0, 0, widthMm, heightMm, panes, boxes);
  if (boxes.length === 0) return emptyBreakdown(systemName);

  const cat =
    catalog ??
    (typeof window !== "undefined" ? loadMaterialCatalog() : undefined);

  // ── مفصلي ────────────────────────────────────────────────
  let hingeQty = 0;
  const hingedEspMap = new Map<EspagnoletteSize, number>();
  let hingedLocksetCount = 0;
  let bouclierLocksetCount = 0;
  let boltQty = 0;
  let protrudingHandleQty = 0;
  let doorCylinderQty = 0;
  let doorSignalHandleQty = 0;
  let doorEscutcheonQty = 0;

  const { solo, bouclierPairs } = hingedLocksetGroups(boxes);
  const espGap = details.espagnoletteSashDeductionMm;

  for (const box of solo) {
    if (box.isDoor) {
      hingeQty += details.hingesPerDoor;
      doorCylinderQty += details.cylindersPerDoor;
      doorSignalHandleQty += details.signalHandlesPerDoor;
      doorEscutcheonQty += details.escutcheonsPerDoor;
      continue;
    }
    hingeQty += details.hingesPerSash;
    const size = pickEspagnoletteSize(
      handleSideHeightMm(box),
      details.espagnoletteCatalog,
      "hinged",
      espGap
    );
    addEspagnolette(hingedEspMap, size);
    hingedLocksetCount += 1;
    protrudingHandleQty += details.protrudingHandlesPerLockset;
  }

  for (const pair of bouclierPairs) {
    // مفصلات لكل ضلفة شباك مفصلي في الزوج (الأبواب مش هنا)
    for (const leaf of [pair.left, pair.right]) {
      hingeQty += details.hingesPerSash;
    }
    // سبلونة واحدة للزوج — المقاس من أطول ضلفة
    const sashH = Math.max(
      handleSideHeightMm(pair.left),
      handleSideHeightMm(pair.right)
    );
    const size = pickEspagnoletteSize(
      sashH,
      details.espagnoletteCatalog,
      "hinged",
      espGap
    );
    addEspagnolette(hingedEspMap, size);
    bouclierLocksetCount += 1;
    boltQty += details.boltsPerBouclier;
    protrudingHandleQty += details.protrudingHandlesPerLockset;
  }

  const frameColorId = (item.frameColor ?? "white") as FrameColorId;
  const doorHandleColorLabel =
    doorSignalHandleQty > 0 ||
    doorEscutcheonQty > 0 ||
    doorCylinderQty > 0
      ? FRAME_COLORS[frameColorId]?.label ?? frameColorId
      : null;

  const hingedLockPieces = lockPieceLines(
    details.hingedLockPieces,
    hingedLocksetCount
  );
  const bouclierLockPieces = lockPieceLines(
    details.bouclierLockPieces,
    bouclierLocksetCount
  );
  const bouclierBoltLockPieces = lockPieceLines(
    details.bouclierBoltLockPieces,
    boltQty
  );

  // ── جرار ─────────────────────────────────────────────────
  const slidingBoxes = boxes.filter((b) => isSlidingOpening(b.opening));
  let trackQty = 0;
  let trackLengthM = 0;
  let rollerQty = 0;
  let brushMm = 0;
  const slidingEspMap = new Map<EspagnoletteSize, number>();
  let slidingLocksetCount = 0;
  let recessedHandleQty = 0;

  if (slidingBoxes.length > 0) {
    // التراك بقى مع الحديد — مش هنا
    const depthMap = slidingSashDepthMap(boxes, panes);

    for (const box of slidingBoxes) {
      rollerQty += details.rollersPerSlidingSash;
      const peri = panePerimeterMm(box.w, box.h);
      const knifeH = box.h;
      brushMm +=
        peri * details.brushSashPerimeterMultiplier +
        knifeH * details.brushKnifeHeightMultiplier;

      const size = pickEspagnoletteSize(
        handleSideHeightMm(box),
        details.espagnoletteCatalog,
        "sliding",
        espGap
      );
      addEspagnolette(slidingEspMap, size);
      slidingLocksetCount += 1;

      if (depthMap.get(box.id) === "recessed") {
        recessedHandleQty += details.recessedHandlesPerRecessedSash;
      }
    }
  }

  const slidingLockPieces = lockPieceLines(
    details.slidingLockPieces,
    slidingLocksetCount
  );

  const brushLengthM = roundM(mmToM(brushMm));

  const hingedEspagnolettes = espagnoletteLines(hingedEspMap);
  const slidingEspagnolettes = espagnoletteLines(slidingEspMap);
  const brandLabels = buildBrandLabels(details, cat);

  const hasAccessories =
    hingeQty > 0 ||
    hingedEspagnolettes.length > 0 ||
    hingedLockPieces.length > 0 ||
    bouclierLockPieces.length > 0 ||
    boltQty > 0 ||
    bouclierBoltLockPieces.length > 0 ||
    protrudingHandleQty > 0 ||
    doorCylinderQty > 0 ||
    doorSignalHandleQty > 0 ||
    doorEscutcheonQty > 0 ||
    trackQty > 0 ||
    rollerQty > 0 ||
    brushLengthM > 0.0005 ||
    slidingEspagnolettes.length > 0 ||
    slidingLockPieces.length > 0 ||
    recessedHandleQty > 0;

  return {
    systemName,
    hasAccessories,
    hingeQty,
    hingedEspagnolettes,
    hingedLockPieces,
    bouclierLockPieces,
    boltQty,
    bouclierBoltLockPieces,
    protrudingHandleQty,
    doorCylinderQty,
    doorSignalHandleQty,
    doorEscutcheonQty,
    doorHandleColorLabel,
    trackQty,
    trackLengthM,
    rollerQty,
    brushLengthM,
    slidingEspagnolettes,
    slidingLockPieces,
    recessedHandleQty,
    brandLabels,
  };
}

/** يضرب كميات الاكسسوار في كمية البند */
export function scaleAccessories(
  a: AccessoriesBreakdown,
  qty: number
): AccessoriesBreakdown {
  const q = Math.max(1, qty || 1);
  if (q === 1) return a;

  const scaleLines = <T extends { qty: number }>(lines: T[]): T[] =>
    lines.map((l) => ({ ...l, qty: l.qty * q }));

  return {
    ...a,
    hingeQty: a.hingeQty * q,
    hingedEspagnolettes: scaleLines(a.hingedEspagnolettes),
    hingedLockPieces: scaleLines(a.hingedLockPieces),
    bouclierLockPieces: scaleLines(a.bouclierLockPieces),
    boltQty: a.boltQty * q,
    bouclierBoltLockPieces: scaleLines(a.bouclierBoltLockPieces),
    protrudingHandleQty: a.protrudingHandleQty * q,
    doorCylinderQty: a.doorCylinderQty * q,
    doorSignalHandleQty: a.doorSignalHandleQty * q,
    doorEscutcheonQty: a.doorEscutcheonQty * q,
    doorHandleColorLabel: a.doorHandleColorLabel,
    trackQty: a.trackQty * q,
    trackLengthM: roundM(a.trackLengthM * q),
    rollerQty: a.rollerQty * q,
    brushLengthM: roundM(a.brushLengthM * q),
    slidingEspagnolettes: scaleLines(a.slidingEspagnolettes),
    slidingLockPieces: scaleLines(a.slidingLockPieces),
    recessedHandleQty: a.recessedHandleQty * q,
  };
}

export function formatEspagnoletteSummary(lines: EspagnoletteLine[]): string {
  if (lines.length === 0) return "—";
  return lines.map((l) => `${l.size}×${l.qty}`).join(" · ");
}

export function formatLockPiecesSummary(lines: LockPieceLine[]): string {
  if (lines.length === 0) return "—";
  return lines.map((l) => `${l.name}×${l.qty}`).join(" · ");
}
