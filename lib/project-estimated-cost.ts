import {
  calcItemAccessories,
  scaleAccessories,
  type AccessoriesBreakdown,
} from "@/lib/accessories";
import { accessoryBrandResolvedPrice } from "@/lib/accessory-price-list-2026";
import { loadCompany } from "@/lib/company";
import { mergeCustomers, type Customer } from "@/lib/customers";
import {
  FRAME_COLORS,
  normalizeFrameColor,
  type DesignItem,
} from "@/lib/design-items";
import {
  applyDiscountAmount,
  discountLabel,
} from "@/lib/item-catalogs";
import {
  calcIronBreakdown,
  scaleIronBreakdown,
} from "@/lib/iron";
import {
  DEFAULT_BAR_LENGTH_M,
  barsEstimate,
  findSystem,
  formatBarsEstimate,
  getIronSystem,
  loadMaterialCatalog,
  type AccessoryBrand,
  type AccessoryBrandCategory,
  type MaterialCatalog,
} from "@/lib/material-systems";
import {
  calcGlassBreakdown,
  calcItemMaterials,
  calcMeshBreakdown,
  calcProfileCostBreakdown,
  formatCount,
  formatMeters,
} from "@/lib/materials";
import { effectiveItemMaterials } from "@/lib/project-materials";
import {
  getItemsForProject,
  getProjectById,
  type Project,
} from "@/lib/projects";
import { chunkItemsByBudget } from "@/lib/project-pdf";
import { formatCurrency, formatDate } from "@/lib/utils";

export type CostSectionId =
  | "profiles"
  | "glass"
  | "mesh"
  | "accessories"
  | "iron";

export type CostUnit = "م" | "م²" | "قطعة" | "طقم";

export type EstimatedCostLine = {
  key: string;
  section: CostSectionId;
  label: string;
  amount: number;
  unit: CostUnit;
  /** طول العود بالمتر — للقطاعات/الحديد عشان تقدير الأعواد */
  barLengthM?: number;
  /** تكلفة تقديرية — null لو مفيش سعر */
  cost: number | null;
  note?: string;
};

export type ItemEstimatedCost = {
  itemId: string;
  name: string;
  qty: number;
  frameColorLabel: string;
  profiles: number;
  glass: number;
  mesh: number;
  accessories: number;
  iron: number;
  beforeDiscount: number;
  discountText: string | null;
  afterDiscount: number;
  hasCost: boolean;
};

export type EstimatedCostSection = {
  id: CostSectionId;
  title: string;
  total: number;
  hasPriced: boolean;
  lines: EstimatedCostLine[];
};

export type EstimatedCostData = {
  companyName: string;
  companyPhone?: string;
  customerName: string;
  customerPhone?: string;
  projectName: string;
  projectLocation?: string;
  printedAt: string;
  createdAtLabel: string;
  itemCount: number;
  totalQty: number;
  items: ItemEstimatedCost[];
  sections: EstimatedCostSection[];
  sectionTotals: Record<CostSectionId, number>;
  beforeDiscount: number;
  afterDiscount: number;
  hasAnyCost: boolean;
  /** صفحات: ملخص البنود ثم تفاصيل الأسطر */
  summaryPages: ItemEstimatedCost[][];
  linePages: EstimatedCostLine[][];
};

const SECTION_ORDER: CostSectionId[] = [
  "profiles",
  "glass",
  "mesh",
  "accessories",
  "iron",
];

const SECTION_TITLE: Record<CostSectionId, string> = {
  profiles: "القطاعات",
  glass: "الزجاج",
  mesh: "السلك",
  accessories: "الاكسسوار",
  iron: "الحديد",
};

export const COST_ITEMS_FIRST_PAGE = 6;
export const COST_ITEMS_PER_PAGE = 12;
export const COST_LINES_FIRST_PAGE = 10;
export const COST_LINES_PER_PAGE = 15;
export const COST_SECTION_COST = 2;

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function roundAmount(n: number, unit: CostUnit): number {
  if (unit === "قطعة" || unit === "طقم") return Math.round(n * 100) / 100;
  return Math.round(n * 1000) / 1000;
}

function joinNotes(
  ...parts: Array<string | null | undefined>
): string | undefined {
  const text = parts.filter(Boolean).join(" · ");
  return text || undefined;
}

function brandFor(
  brands: AccessoryBrand[],
  labels: AccessoriesBreakdown["brandLabels"],
  category: AccessoryBrandCategory
): AccessoryBrand | undefined {
  const name = labels[category];
  if (!name) return undefined;
  return brands.find((b) => b.category === category && b.name === name);
}

function addCostLine(
  map: Map<string, EstimatedCostLine>,
  partial: Omit<EstimatedCostLine, "key"> & { key?: string }
) {
  if (partial.amount < 0.0005) return;
  const key =
    partial.key ??
    `${partial.section}|${partial.label}|${partial.unit}|${partial.barLengthM ?? ""}|${partial.note ?? ""}|${
      partial.cost == null ? "u" : "p"
    }`;
  const prev = map.get(key);
  if (prev) {
    prev.amount = roundAmount(prev.amount + partial.amount, partial.unit);
    if (partial.cost != null) {
      prev.cost = roundMoney((prev.cost ?? 0) + partial.cost);
    }
    return;
  }
  map.set(key, {
    key,
    section: partial.section,
    label: partial.label,
    amount: roundAmount(partial.amount, partial.unit),
    unit: partial.unit,
    barLengthM: partial.barLengthM,
    cost: partial.cost != null ? roundMoney(partial.cost) : null,
    note: partial.note,
  });
}

function pieceCost(
  brands: AccessoryBrand[],
  labels: AccessoriesBreakdown["brandLabels"],
  category: AccessoryBrandCategory,
  qty: number,
  size?: number
): number | null {
  if (qty < 0.5) return null;
  const unit = accessoryBrandResolvedPrice(
    brandFor(brands, labels, category),
    size
  );
  return unit != null ? roundMoney(qty * unit) : null;
}

function metersCost(
  brands: AccessoryBrand[],
  labels: AccessoriesBreakdown["brandLabels"],
  category: AccessoryBrandCategory,
  meters: number
): number | null {
  if (meters < 0.0005) return null;
  const unit = accessoryBrandResolvedPrice(brandFor(brands, labels, category));
  return unit != null ? roundMoney(meters * unit) : null;
}

function addAccessoryCostLines(
  map: Map<string, EstimatedCostLine>,
  acc: AccessoriesBreakdown,
  brands: AccessoryBrand[],
  frameColor?: string
) {
  if (!acc.hasAccessories) return;
  const labels = acc.brandLabels;
  const brandNote = (cat: AccessoryBrandCategory) =>
    labels[cat] || acc.systemName || undefined;
  const tint = frameColor ? `لون: ${frameColor}` : undefined;

  const pushPiece = (
    label: string,
    qty: number,
    category: AccessoryBrandCategory,
    noteExtra?: string
  ) => {
    if (qty < 0.5) return;
    addCostLine(map, {
      section: "accessories",
      label,
      amount: qty,
      unit: "قطعة",
      cost: pieceCost(brands, labels, category, qty),
      note: joinNotes(brandNote(category), noteExtra),
    });
  };

  pushPiece("مفصلات", acc.hingeQty, "hinge");

  if (acc.tiltScissors.length) {
    for (const line of acc.tiltScissors) {
      const brand = brandFor(brands, labels, "tilt-scissors");
      const unit = accessoryBrandResolvedPrice(brand, line.maxDimMm);
      addCostLine(map, {
        section: "accessories",
        label: `ذراع قلاب ${line.label}`,
        amount: line.qty,
        unit: "قطعة",
        cost: unit != null ? roundMoney(line.qty * unit) : null,
        note: joinNotes(brandNote("tilt-scissors"), `حد ${line.maxDimMm}مم`),
      });
    }
  }

  pushPiece("كورنر علوي", acc.tiltCornerUpperQty, "tilt-corner-upper");
  pushPiece("كورنر سفلي", acc.tiltCornerLowerQty, "tilt-corner-lower");
  pushPiece(
    "مفصلة علوية جزء الضلفة",
    acc.tiltTopHingeQty,
    "tilt-top-hinge"
  );
  pushPiece(
    "مفصلة علوية جزء الحلق",
    acc.tiltTopFrameHingeQty,
    "tilt-top-frame-hinge"
  );
  pushPiece(
    "مفصلة سفلية جزء الحلق",
    acc.tiltBottomFrameHingeQty,
    "tilt-bottom-frame-hinge"
  );
  pushPiece(
    "مفصلة سفلية جزء الضلفة",
    acc.tiltBottomSashHingeQty,
    "tilt-bottom-sash-hinge"
  );
  pushPiece("مفصلة علوية بنز", acc.tiltHingePinQty, "tilt-hinge-pin");
  pushPiece("سكاك كورنر سفلي", acc.tiltCornerStrikerQty, "tilt-corner-striker");
  pushPiece("غطاء مفصلة", acc.tiltHingeCoverQty, "tilt-hinge-cover");

  pushPiece("كالون", acc.doorCylinderQty, "door-cylinder");
  pushPiece("مقبض إشارة", acc.doorSignalHandleQty, "door-signal-handle", tint);
  pushPiece("وش تسكيك", acc.doorEscutcheonQty, "door-escutcheon", tint);

  if (acc.hingedEspagnolettes.length) {
    const brand = brandFor(brands, labels, "hinged-espagnolette");
    let cost = 0;
    let priced = false;
    let amount = 0;
    for (const line of acc.hingedEspagnolettes) {
      amount += line.qty;
      const unit = accessoryBrandResolvedPrice(brand, line.size);
      if (unit != null) {
        cost += line.qty * unit;
        priced = true;
      }
    }
    addCostLine(map, {
      section: "accessories",
      label: "سبلونة مفصلي",
      amount,
      unit: "قطعة",
      cost: priced ? roundMoney(cost) : null,
      note: joinNotes(
        brandNote("hinged-espagnolette"),
        acc.hingedEspagnolettes.map((l) => `${l.qty}×${l.size}سم`).join(" · ")
      ),
    });
  }

  for (const piece of acc.hingedLockPieces) {
    pushPiece(piece.name, piece.qty, "hinged-lock");
  }

  for (const piece of acc.bouclierLockPieces) {
    pushPiece(piece.name, piece.qty, "bouclier-lock");
  }
  pushPiece("ترباس", acc.boltQty, "bouclier-bolt");
  for (const piece of acc.bouclierBoltLockPieces) {
    pushPiece(piece.name, piece.qty, "bouclier-bolt-lock");
  }
  pushPiece("مقبض بارز", acc.protrudingHandleQty, "protruding-handle", tint);
  pushPiece("عجل جرار", acc.rollerQty, "roller");

  if (acc.brushLengthM > 0.0005) {
    addCostLine(map, {
      section: "accessories",
      label: "فرش",
      amount: acc.brushLengthM,
      unit: "م",
      cost: metersCost(brands, labels, "brush", acc.brushLengthM),
      note: brandNote("brush"),
    });
  }

  if (acc.slidingEspagnolettes.length) {
    const brand = brandFor(brands, labels, "sliding-espagnolette");
    let cost = 0;
    let priced = false;
    let amount = 0;
    for (const line of acc.slidingEspagnolettes) {
      amount += line.qty;
      const unit = accessoryBrandResolvedPrice(brand, line.size);
      if (unit != null) {
        cost += line.qty * unit;
        priced = true;
      }
    }
    addCostLine(map, {
      section: "accessories",
      label: "سبلونة جرار",
      amount,
      unit: "قطعة",
      cost: priced ? roundMoney(cost) : null,
      note: joinNotes(
        brandNote("sliding-espagnolette"),
        acc.slidingEspagnolettes.map((l) => `${l.qty}×${l.size}سم`).join(" · ")
      ),
    });
  }

  for (const piece of acc.slidingLockPieces) {
    pushPiece(piece.name, piece.qty, "sliding-lock");
  }
  pushPiece("مقبض غاطس", acc.recessedHandleQty, "recessed-handle", tint);
}

function accessorySectionTotal(
  acc: AccessoriesBreakdown,
  brands: AccessoryBrand[]
): number {
  const map = new Map<string, EstimatedCostLine>();
  addAccessoryCostLines(map, acc, brands);
  return roundMoney(
    [...map.values()].reduce((s, l) => s + (l.cost ?? 0), 0)
  );
}

function contributeItem(
  lineMap: Map<string, EstimatedCostLine>,
  item: DesignItem,
  project: Project | undefined,
  catalog: MaterialCatalog,
  brands: AccessoryBrand[]
): ItemEstimatedCost {
  const effective = effectiveItemMaterials(item, project, catalog);
  const qty = Math.max(1, effective.qty || 1);
  const unitMats = calcItemMaterials(effective, catalog);
  const systemId = effective.systemId;
  const system =
    systemId && systemId !== "none"
      ? findSystem("profiles", systemId, catalog)
      : null;
  const systemNote = system?.name;
  const frameColor =
    FRAME_COLORS[normalizeFrameColor(effective.frameColor)].label;

  // قطاعات — بالمتر + تقدير أعواد بالكسور
  const profile = calcProfileCostBreakdown(effective, unitMats, catalog);
  let profiles = 0;
  if (profile.hasPricing) {
    profiles = profile.totalCost;
    for (const line of profile.lines) {
      if (line.billing === "kit") {
        addCostLine(lineMap, {
          section: "profiles",
          label: line.label,
          amount: (line.qty ?? 0) * qty,
          unit: "طقم",
          cost: roundMoney(line.totalCost * qty),
          note: joinNotes(systemNote, line.productName, `لون: ${frameColor}`),
        });
      } else {
        const barLen =
          line.barLengthM > 0 ? line.barLengthM : DEFAULT_BAR_LENGTH_M;
        addCostLine(lineMap, {
          section: "profiles",
          label: line.label,
          amount: line.lengthM * qty,
          unit: "م",
          barLengthM: barLen,
          cost: roundMoney(line.totalCost * qty),
          note: joinNotes(
            systemNote,
            line.productName,
            `طول العود ${barLen}م`,
            `لون: ${frameColor}`
          ),
        });
      }
    }
  }

  const glass = calcGlassBreakdown(effective, catalog);
  let glassTotal = 0;
  if (glass.hasPricing) {
    glassTotal = glass.totalCost;
    for (const line of glass.lines) {
      addCostLine(lineMap, {
        section: "glass",
        label: line.label || "زجاج",
        amount: line.areaSqm * qty,
        unit: "م²",
        cost: roundMoney(line.totalCost * qty),
        note: joinNotes(
          line.glazing === "double" ? "دبل" : "سنجل",
          line.georgian ? "جورجيا" : null
        ),
      });
    }
  }

  const mesh = calcMeshBreakdown(effective, catalog);
  let meshTotal = 0;
  if (mesh.hasPricing) {
    meshTotal = mesh.totalCost;
    for (const line of mesh.lines) {
      addCostLine(lineMap, {
        section: "mesh",
        label: line.label || "سلك",
        amount: line.areaSqm * qty,
        unit: "م²",
        cost: roundMoney(line.totalCost * qty),
      });
    }
  }

  const acc = scaleAccessories(
    calcItemAccessories(effective, catalog, project),
    qty
  );
  const accessories = accessorySectionTotal(acc, brands);
  addAccessoryCostLines(lineMap, acc, brands, frameColor);

  const ironRaw = calcIronBreakdown(effective, getIronSystem(catalog));
  const iron = ironRaw ? scaleIronBreakdown(ironRaw, qty) : null;
  const ironTotal = iron && iron.totalCost > 0 ? iron.totalCost : 0;
  if (iron) {
    for (const line of iron.lines) {
      const barLen =
        line.barLengthM && line.barLengthM > 0
          ? line.barLengthM
          : DEFAULT_BAR_LENGTH_M;
      if (line.lengthM > 0.0005) {
        addCostLine(lineMap, {
          section: "iron",
          label: line.label,
          amount: line.lengthM,
          unit: "م",
          barLengthM: barLen,
          cost:
            line.totalCost != null && line.totalCost > 0
              ? roundMoney(line.totalCost)
              : null,
          note: joinNotes(
            iron.systemName,
            line.pieceName,
            `طول العود ${barLen}م`
          ),
        });
      } else if (line.qty != null && line.qty > 0) {
        addCostLine(lineMap, {
          section: "iron",
          label: line.label,
          amount: line.qty,
          unit: "قطعة",
          cost:
            line.totalCost != null && line.totalCost > 0
              ? roundMoney(line.totalCost)
              : null,
          note: joinNotes(iron.systemName, line.pieceName),
        });
      }
    }
  }

  const beforeDiscount = roundMoney(
    profiles + glassTotal + meshTotal + accessories + ironTotal
  );
  const hasCost = beforeDiscount > 0.005;
  const afterDiscount = roundMoney(
    applyDiscountAmount(beforeDiscount, item.discountId)
  );

  return {
    itemId: effective.id,
    name: effective.name || "بند",
    qty,
    frameColorLabel: frameColor,
    profiles: roundMoney(profiles),
    glass: roundMoney(glassTotal),
    mesh: roundMoney(meshTotal),
    accessories: roundMoney(accessories),
    iron: roundMoney(ironTotal),
    beforeDiscount,
    discountText: discountLabel(effective.discountId),
    afterDiscount,
    hasCost,
  };
}

/**
 * تكلفة خامات البند (قبل/بعد خصم البند) من أسعار الكتالوج.
 * تُستخدم لتسعير البيع الهجين.
 */
export function calcItemMaterialsCost(
  item: DesignItem,
  project?: Project | null
): Pick<
  ItemEstimatedCost,
  | "profiles"
  | "glass"
  | "mesh"
  | "accessories"
  | "iron"
  | "beforeDiscount"
  | "afterDiscount"
  | "hasCost"
  | "qty"
> {
  if (typeof window === "undefined") {
    return {
      profiles: 0,
      glass: 0,
      mesh: 0,
      accessories: 0,
      iron: 0,
      beforeDiscount: 0,
      afterDiscount: 0,
      hasCost: false,
      qty: Math.max(1, item.qty || 1),
    };
  }
  const catalog = loadMaterialCatalog();
  const brands = catalog.accessoryBrands ?? [];
  const summary = contributeItem(
    new Map(),
    item,
    project ?? undefined,
    catalog,
    brands
  );
  return {
    profiles: summary.profiles,
    glass: summary.glass,
    mesh: summary.mesh,
    accessories: summary.accessories,
    iron: summary.iron,
    beforeDiscount: summary.beforeDiscount,
    afterDiscount: summary.afterDiscount,
    hasCost: summary.hasCost,
    qty: summary.qty,
  };
}

export function costQtyLabel(line: EstimatedCostLine): string {
  if (line.unit === "م") {
    const meters = formatMeters(line.amount);
    if (line.barLengthM && line.barLengthM > 0) {
      const bars = barsEstimate(line.amount, line.barLengthM);
      return `${meters} · ≈${formatBarsEstimate(bars)} عود`;
    }
    return meters;
  }
  if (line.unit === "م²") {
    if (line.amount < 0.0005) return "—";
    return `${line.amount.toFixed(2)} م²`;
  }
  if (line.unit === "طقم") {
    const n = Math.round(line.amount);
    return n < 1 ? "—" : `${n} طقم`;
  }
  return formatCount(line.amount);
}

export function costMoneyLabel(amount: number | null | undefined): string {
  if (amount == null || amount < 0.005) return "—";
  return `${formatCurrency(Math.round(amount))} ج.م`;
}

/** يبني تكلفة المشروع التقديرية من كل الخامات المسجّلة أسعارها */
export function buildProjectEstimatedCost(
  customerId: string,
  projectId: string
): EstimatedCostData | null {
  const project = getProjectById(projectId);
  if (!project) return null;

  const items = getItemsForProject(projectId);
  const catalog = loadMaterialCatalog();
  const brands = catalog.accessoryBrands ?? [];
  const company = loadCompany();
  const customer =
    mergeCustomers().find((c) => c.id === customerId) ?? null;

  const lineMap = new Map<string, EstimatedCostLine>();
  const itemSummaries: ItemEstimatedCost[] = [];

  for (const item of items) {
    try {
      itemSummaries.push(
        contributeItem(lineMap, item, project, catalog, brands)
      );
    } catch (err) {
      console.error("estimated cost item failed", item.id, err);
    }
  }

  const allLines = Array.from(lineMap.values());
  const sectionTotals: Record<CostSectionId, number> = {
    profiles: 0,
    glass: 0,
    mesh: 0,
    accessories: 0,
    iron: 0,
  };

  const sections: EstimatedCostSection[] = SECTION_ORDER.map((id) => {
    const lines = allLines
      .filter((l) => l.section === id)
      .sort((a, b) => a.label.localeCompare(b.label, "ar"));
    const total = roundMoney(
      lines.reduce((s, l) => s + (l.cost ?? 0), 0)
    );
    sectionTotals[id] = total;
    return {
      id,
      title: SECTION_TITLE[id],
      total,
      hasPriced: lines.some((l) => l.cost != null && l.cost > 0),
      lines,
    };
  }).filter((s) => s.lines.length > 0 || s.total > 0);

  const beforeDiscount = roundMoney(
    itemSummaries.reduce((s, i) => s + i.beforeDiscount, 0)
  );
  const afterDiscount = roundMoney(
    itemSummaries.reduce((s, i) => s + i.afterDiscount, 0)
  );
  const hasAnyCost = itemSummaries.some((i) => i.hasCost);

  const printedAt = new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const flatLines = sections.flatMap((s) => s.lines);

  return {
    companyName: company?.name || "شركتي للـ uPVC",
    companyPhone: company?.phone,
    customerName: customer?.name ?? "—",
    customerPhone: customer?.phone,
    projectName: project.name,
    projectLocation: project.location,
    printedAt,
    createdAtLabel: formatDate(project.createdAt),
    itemCount: items.length,
    totalQty: items.reduce((s, i) => s + (i.qty || 1), 0),
    items: itemSummaries,
    sections,
    sectionTotals,
    beforeDiscount,
    afterDiscount,
    hasAnyCost,
    summaryPages: chunkItemsByBudget(itemSummaries, {
      firstPageBudget: COST_ITEMS_FIRST_PAGE,
      nextPageBudget: COST_ITEMS_PER_PAGE,
    }),
    linePages: chunkItemsByBudget(flatLines, {
      firstPageBudget: COST_LINES_FIRST_PAGE,
      nextPageBudget: COST_LINES_PER_PAGE,
      sectionCost: COST_SECTION_COST,
      getSection: (line) => line.section,
    }),
  };
}
