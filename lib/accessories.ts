/**
 * حساب اكسسوار المفصلي والجرار من إعدادات نظام الاكسسوار + رسم البند.
 *
 * مفصلي عادي (شباك casement):
 * - مفصلات عادية لكل ضلفة (٢ — من الإعداد) — نفس قطعة الباب
 * - سبلونة مفصلي حسب ارتفاع ناحية المقبض
 * - سكاك مفصلي لكل سبلونة (كميات قابلة للتعديل عبر hingedLockQty)
 * - ضلفتين مقابض في وش بعض (بوكلير): سبلونة واحدة مش اثنين، سكاك بوكلير (مش مفصلي)، ترباس + سكاك ترباس، مقبض بارز
 *
 * مفصلي قلاب / قلاب (tilt / tilt-turn) لكل ضلفة:
 * - سبلونة مفصلي عادي (نفس جدول المفصلي حسب الارتفاع)
 * - سكاكين مفصلي (٢ ثابت)
 * - مقبض بارز
 * - بدون مجموعة المفصلي القلاب (ذراع/كورنر/مفصلات قلاب)
 *
 * باب مفصلي:
 * - نفس المفصلة العادية بعدد أكبر (٣–٤) + كالون + مقبض إشارة + وش تسكيك
 *
 * جرار:
 * - عجلتين لكل ضلفة
 * - فرش: محيط الضلفة ×٢ + ارتفاع السكينة ×١
 * - سبلونة جرار + سكاك جرار بعدد slidingLockQty لمقاس السبلونة
 * - مقبض غاطس على الضلفة الغاطسة + مقبض بارز على الضلفة البارزة
 */

import {
  FRAME_COLORS,
  normalizeFrameColor,
  normalizePaneConfig,
  type DesignItem,
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
  getDefaultSystemId,
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

/** سطر رينج قلاب (سبلونة أو مقص) */
export type TiltRangeLine = {
  id: string;
  label: string;
  maxDimMm: number;
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

  // ── مفصلي عادي ─────────────────────────────────────
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

  /** ذراع قلاب — رينج حسب عرض الضلفة */
  tiltScissors: TiltRangeLine[];
  /**
   * @deprecated القلاب يستخدم سبلونة مفصلي عادي — الحقل فاضي للتوافق الخلفي
   */
  tiltEspagnolettes: TiltRangeLine[];
  tiltTopHingeQty: number;
  tiltTopFrameHingeQty: number;
  tiltBottomFrameHingeQty: number;
  tiltBottomSashHingeQty: number;
  tiltCornerUpperQty: number;
  tiltCornerLowerQty: number;
  tiltCornerStrikerQty: number;
  tiltHingePinQty: number;
  tiltHingeCoverQty: number;

  // ── جرار ───────────────────────────────────────────
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
  douran: boolean;
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

function isTiltOpening(opening: PaneOpening): boolean {
  return (
    opening === "tilt" ||
    opening === "tilt-inverted" ||
    opening === "tilt-turn" ||
    opening === "tilt-turn-left"
  );
}

/** مفصلي عادي (casement) — مش قلاب */
function isCasementHingedOpening(opening: PaneOpening): boolean {
  return isHingedOpening(opening) && !isTiltOpening(opening);
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
    tiltEspagnolettes: [],
    tiltScissors: [],
    tiltTopHingeQty: 0,
    tiltTopFrameHingeQty: 0,
    tiltBottomFrameHingeQty: 0,
    tiltBottomSashHingeQty: 0,
    tiltCornerUpperQty: 0,
    tiltCornerLowerQty: 0,
    tiltCornerStrikerQty: 0,
    tiltHingePinQty: 0,
    tiltHingeCoverQty: 0,
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
      douran: Boolean(cfg.douran),
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

function mergeLockPieceLines(
  a: LockPieceLine[],
  b: LockPieceLine[]
): LockPieceLine[] {
  const map = new Map<string, LockPieceLine>();
  for (const line of [...a, ...b]) {
    if (line.qty <= 0) continue;
    const key = line.id || line.name;
    const prev = map.get(key);
    if (prev) {
      prev.qty += line.qty;
    } else {
      map.set(key, { ...line });
    }
  }
  return [...map.values()].filter((l) => l.qty > 0);
}

type BouclierPair = {
  left: PaneBox;
  right: PaneBox;
  /** ضلفة ثابتة بوكلير في الوسط — إن وُجدت */
  bouclier: PaneBox | null;
};

/**
 * يجمع عدد السكاك من مقاسات السبلونات المستخدمة.
 * لكل سبلونة: كمية السكاك = hingedLockQty أو slidingLockQty حسب النوع.
 */
function lockPieceLinesFromEspSizes(
  pieces: AccessoryLockPiece[],
  espMap: Map<EspagnoletteSize, number>,
  catalog: AccessorySystemDetails["espagnoletteCatalog"],
  kind: "hinged" | "sliding"
): LockPieceLine[] {
  let lockCount = 0;
  for (const [size, espQty] of espMap) {
    if (espQty <= 0) continue;
    const entry = catalog.find((e) => e.size === size);
    const perEsp =
      kind === "hinged"
        ? (entry?.hingedLockQty ?? 1)
        : (entry?.slidingLockQty ?? 1);
    lockCount += Math.max(0, perEsp) * espQty;
  }
  return lockPieceLines(pieces, lockCount);
}

/**
 * مجموعات المفصلي:
 * - ضلفتين مقابض في وش بعض (متجاورتين أو بينهم بوكلير ثابت) → مجموعة واحدة = سبلونة واحدة
 * - باقي الضلف المفصلي كل واحدة لوحدها
 */
function hingedLocksetGroups(boxes: PaneBox[]): {
  solo: PaneBox[];
  bouclierPairs: BouclierPair[];
} {
  const hinged = boxes.filter((b) => isCasementHingedOpening(b.opening));
  // الأبواب مفصليّة بس مش بتدخل في مجموعات البوكلير/السبلونة
  const hingedWindows = hinged.filter((b) => !b.isDoor);
  const hingedDoors = hinged.filter((b) => b.isDoor);
  const boucliers = boxes.filter((b) => b.bouclier && b.opening === "fixed");
  const used = new Set<string>();
  const bouclierPairs: BouclierPair[] = [];

  for (const mid of boucliers) {
    // يمين ويسار على نفس الصف تقريباً — ضلفة بوكلير ثابتة بينهم
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

  // ضلفتين مفصلي متجاورتين والمقابض في وش بعض (من غير ضلفة ثابتة في الوسط)
  // → برضو سبلونة واحدة + سكاك/ترباس بوكلير — مش سبلونتين
  const remaining = hingedWindows
    .filter((b) => !used.has(b.id))
    .sort((a, b) => a.y - b.y || a.x - b.x);

  for (let i = 0; i < remaining.length; i++) {
    const left = remaining[i]!;
    if (used.has(left.id)) continue;

    const right = remaining.find(
      (b) =>
        !used.has(b.id) &&
        b.id !== left.id &&
        Math.abs(b.y - left.y) < 2 &&
        Math.abs(b.h - left.h) < 2 &&
        Math.abs(left.x + left.w - b.x) < 3
    );
    if (!right) continue;
    if (!areFacingHandles(left.opening, right.opening)) continue;

    used.add(left.id);
    used.add(right.id);
    bouclierPairs.push({ left, right, bouclier: null });
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

  const id =
    item.accessoryId && item.accessoryId !== "none"
      ? item.accessoryId
      : project?.accessoryId && project.accessoryId !== "none"
        ? project.accessoryId
        : getDefaultSystemId("accessories", cat);

  if (!id || id === "none") return null;

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

  // ── مفصلي عادي ────────────────────────────────────────────
  let hingeQty = 0;
  /** سبلونات الضلف المنفردة — منها فقط سكاك مفصلي */
  const soloHingedEspMap = new Map<EspagnoletteSize, number>();
  /** سبلونات البوكلير (واحدة لكل زوج) — تُعرض مع السبلونة المفصلي، بس سكاكها بوكلير */
  const bouclierEspMap = new Map<EspagnoletteSize, number>();
  let bouclierLocksetCount = 0;
  let boltQty = 0;
  let protrudingHandleQty = 0;
  let doorCylinderQty = 0;
  let doorSignalHandleQty = 0;
  let doorEscutcheonQty = 0;
  let tiltTopHingeQty = 0;
  let tiltTopFrameHingeQty = 0;
  let tiltBottomFrameHingeQty = 0;
  let tiltBottomSashHingeQty = 0;
  let tiltCornerUpperQty = 0;
  let tiltCornerLowerQty = 0;
  let tiltCornerStrikerQty = 0;
  let tiltHingePinQty = 0;
  let tiltHingeCoverQty = 0;

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
    addEspagnolette(soloHingedEspMap, size);
    protrudingHandleQty += details.protrudingHandlesPerLockset;
  }

  for (const pair of bouclierPairs) {
    // مفصلات عادية لكل ضلفة شباك مفصلي في الزوج (الأبواب مش هنا)
    for (const leaf of [pair.left, pair.right]) {
      hingeQty += details.hingesPerSash;
    }
    // سبلونة واحدة للزوج — المقاس من أطول ضلفة — سكاك بوكلير مش مفصلي
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
    addEspagnolette(bouclierEspMap, size);
    bouclierLocksetCount += 1;
    boltQty += details.boltsPerBouclier;
    protrudingHandleQty += details.protrudingHandlesPerLockset;
  }

  // ── قلاب — سبلونة مفصلي + سكاكين + مقبض بارز فقط ───────────
  /** سبلونات القلاب للعرض مع السبلونة المفصلي — السكاك ثابتة ٢/ضلفة */
  const tiltEspMap = new Map<EspagnoletteSize, number>();
  const tiltBoxes = boxes.filter(
    (b) => isTiltOpening(b.opening) && !b.isDoor && isOpeningSash(b.opening)
  );
  for (const box of tiltBoxes) {
    const size = pickEspagnoletteSize(
      handleSideHeightMm(box),
      details.espagnoletteCatalog,
      "hinged",
      espGap
    );
    addEspagnolette(tiltEspMap, size);
    protrudingHandleQty += details.protrudingHandlesPerLockset;
  }

  // عرض السبلونات: مفصلي منفرد + قلاب + بوكلير
  const hingedEspMap = new Map<EspagnoletteSize, number>(soloHingedEspMap);
  for (const [size, qty] of tiltEspMap) {
    hingedEspMap.set(size, (hingedEspMap.get(size) ?? 0) + qty);
  }
  for (const [size, qty] of bouclierEspMap) {
    hingedEspMap.set(size, (hingedEspMap.get(size) ?? 0) + qty);
  }

  const frameColorId = normalizeFrameColor(item.frameColor);
  const doorHandleColorLabel =
    doorSignalHandleQty > 0 ||
    doorEscutcheonQty > 0 ||
    doorCylinderQty > 0
      ? FRAME_COLORS[frameColorId].label
      : null;

  // سكاك مفصلي: منفردة حسب مقاس السبلونة + سكاكين ثابتة لكل ضلفة قلاب
  const hingedLockPieces = mergeLockPieceLines(
    lockPieceLinesFromEspSizes(
      details.hingedLockPieces,
      soloHingedEspMap,
      details.espagnoletteCatalog,
      "hinged"
    ),
    tiltBoxes.length > 0
      ? details.hingedLockPieces
          .filter((p) => p.qtyPerLockset > 0)
          .map((p) => ({
            id: p.id,
            name: p.name,
            qty: 2 * tiltBoxes.length,
          }))
      : []
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
  let rollerQty = 0;
  let brushMm = 0;
  const slidingEspMap = new Map<EspagnoletteSize, number>();
  let recessedHandleQty = 0;

  if (slidingBoxes.length > 0) {
    const depthMap = slidingSashDepthMap(boxes, panes);
    const protrudingPer =
      details.protrudingHandlesPerProtrudingSash ??
      details.protrudingHandlesPerLockset ??
      1;

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

      const depth = depthMap.get(box.id);
      if (depth === "recessed") {
        recessedHandleQty += details.recessedHandlesPerRecessedSash;
      } else if (depth === "protruding") {
        protrudingHandleQty += protrudingPer;
      }
    }
  }

  const slidingLockPieces = lockPieceLinesFromEspSizes(
    details.slidingLockPieces,
    slidingEspMap,
    details.espagnoletteCatalog,
    "sliding"
  );

  const brushLengthM = roundM(mmToM(brushMm));

  const hingedEspagnolettes = espagnoletteLines(hingedEspMap);
  const tiltEspagnolettes: TiltRangeLine[] = [];
  const tiltScissors: TiltRangeLine[] = [];
  const slidingEspagnolettes = espagnoletteLines(slidingEspMap);
  const brandLabels = buildBrandLabels(details, cat);

  const hasAccessories =
    hingeQty > 0 ||
    tiltEspagnolettes.length > 0 ||
    tiltScissors.length > 0 ||
    tiltTopHingeQty > 0 ||
    tiltTopFrameHingeQty > 0 ||
    tiltBottomFrameHingeQty > 0 ||
    tiltBottomSashHingeQty > 0 ||
    tiltCornerUpperQty > 0 ||
    tiltCornerLowerQty > 0 ||
    tiltCornerStrikerQty > 0 ||
    tiltHingePinQty > 0 ||
    tiltHingeCoverQty > 0 ||
    hingedEspagnolettes.length > 0 ||
    hingedLockPieces.length > 0 ||
    bouclierLockPieces.length > 0 ||
    boltQty > 0 ||
    bouclierBoltLockPieces.length > 0 ||
    protrudingHandleQty > 0 ||
    doorCylinderQty > 0 ||
    doorSignalHandleQty > 0 ||
    doorEscutcheonQty > 0 ||
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
    tiltEspagnolettes,
    tiltScissors,
    tiltTopHingeQty,
    tiltTopFrameHingeQty,
    tiltBottomFrameHingeQty,
    tiltBottomSashHingeQty,
    tiltCornerUpperQty,
    tiltCornerLowerQty,
    tiltCornerStrikerQty,
    tiltHingePinQty,
    tiltHingeCoverQty,
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
    tiltEspagnolettes: scaleLines(a.tiltEspagnolettes),
    tiltScissors: scaleLines(a.tiltScissors),
    tiltTopHingeQty: a.tiltTopHingeQty * q,
    tiltTopFrameHingeQty: a.tiltTopFrameHingeQty * q,
    tiltBottomFrameHingeQty: a.tiltBottomFrameHingeQty * q,
    tiltBottomSashHingeQty: a.tiltBottomSashHingeQty * q,
    tiltCornerUpperQty: a.tiltCornerUpperQty * q,
    tiltCornerLowerQty: a.tiltCornerLowerQty * q,
    tiltCornerStrikerQty: a.tiltCornerStrikerQty * q,
    tiltHingePinQty: a.tiltHingePinQty * q,
    tiltHingeCoverQty: a.tiltHingeCoverQty * q,
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
