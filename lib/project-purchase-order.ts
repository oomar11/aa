import {
  calcItemAccessories,
  scaleAccessories,
  type AccessoriesBreakdown,
} from "@/lib/accessories";
import { loadCompany } from "@/lib/company";
import { mergeCustomers, type Customer } from "@/lib/customers";
import {
  FRAME_COLORS,
  normalizeFrameColor,
  type DesignItem,
} from "@/lib/design-items";
import {
  calcIronBreakdown,
  scaleIronBreakdown,
  type IronBreakdown,
} from "@/lib/iron";
import {
  DEFAULT_BAR_LENGTH_M,
  barsEstimate,
  findSystem,
  formatBarsEstimate,
  getIronSystem,
  loadMaterialCatalog,
  type MaterialCatalog,
} from "@/lib/material-systems";
import {
  calcGlassBreakdown,
  calcItemMaterials,
  calcMeshBreakdown,
  calcProfileCostBreakdown,
  formatCount,
  formatMeters,
  scaleMaterials,
  type GlassBreakdown,
  type MaterialsBreakdown,
  type MeshBreakdown,
  type ProfileCostBreakdown,
} from "@/lib/materials";
import {
  getItemsForProject,
  getProjectById,
  type Project,
} from "@/lib/projects";
import { chunkItemsByBudget } from "@/lib/project-pdf";
import { formatDate } from "@/lib/utils";

export type PurchaseSectionId =
  | "profiles"
  | "glass"
  | "mesh"
  | "accessories"
  | "iron";

export type PurchaseUnit = "م" | "م²" | "قطعة" | "طقم";

export type PurchaseLine = {
  key: string;
  section: PurchaseSectionId;
  label: string;
  /** كمية رقمية للتجميع */
  amount: number;
  unit: PurchaseUnit;
  /** طول العود بالمتر — للقطاعات/الحديد عشان تقدير الأعواد */
  barLengthM?: number;
  note?: string;
};

export type PurchaseSection = {
  id: PurchaseSectionId;
  title: string;
  lines: PurchaseLine[];
};

export type PurchaseOrderData = {
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
  sections: PurchaseSection[];
  /** صفحات أسطر جاهزة للطباعة */
  linePages: PurchaseLine[][];
};

const SECTION_ORDER: PurchaseSectionId[] = [
  "profiles",
  "glass",
  "mesh",
  "accessories",
  "iron",
];

const SECTION_TITLE: Record<PurchaseSectionId, string> = {
  profiles: "القطاعات",
  glass: "الزجاج",
  mesh: "السلك",
  accessories: "الاكسسوار",
  iron: "الحديد",
};

/**
 * ميزانية أسطر الصفحة الأولى أصغر بسبب هيدر العميل/المشروع.
 * عناوين الأقسام بتاخد وحدات إضافية في التقسيم.
 */
export const PURCHASE_LINES_FIRST_PAGE = 9;
export const PURCHASE_LINES_PER_PAGE = 15;
export const PURCHASE_SECTION_COST = 2;

function roundAmount(n: number, unit: PurchaseUnit): number {
  if (unit === "قطعة" || unit === "طقم") return Math.round(n * 100) / 100;
  return Math.round(n * 1000) / 1000;
}

/** لون إطار/ضلفة البند — للحجات اللي بيتطلب لونها */
function itemFrameColorLabel(item: DesignItem): string {
  return FRAME_COLORS[normalizeFrameColor(item.frameColor)].label;
}

function joinNotes(...parts: Array<string | null | undefined>): string | undefined {
  const text = parts.filter(Boolean).join(" · ");
  return text || undefined;
}

function colorNote(colorLabel: string | null | undefined): string | undefined {
  return colorLabel ? `لون: ${colorLabel}` : undefined;
}

function addLine(
  map: Map<string, PurchaseLine>,
  partial: Omit<PurchaseLine, "key"> & { key?: string }
) {
  if (partial.amount < 0.0005) return;
  const key =
    partial.key ??
    `${partial.section}|${partial.label}|${partial.unit}|${partial.barLengthM ?? ""}|${partial.note ?? ""}`;
  const prev = map.get(key);
  if (prev) {
    prev.amount = roundAmount(prev.amount + partial.amount, partial.unit);
    return;
  }
  map.set(key, {
    key,
    section: partial.section,
    label: partial.label,
    amount: roundAmount(partial.amount, partial.unit),
    unit: partial.unit,
    barLengthM: partial.barLengthM,
    note: partial.note,
  });
}

function formatPurchaseQty(line: PurchaseLine): string {
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

export function purchaseQtyLabel(line: PurchaseLine): string {
  return formatPurchaseQty(line);
}

function addProfileLines(
  map: Map<string, PurchaseLine>,
  cost: ProfileCostBreakdown | null,
  materials: MaterialsBreakdown,
  qty: number,
  systemNote?: string,
  frameColor?: string
) {
  const q = Math.max(1, qty || 1);
  const tint = colorNote(frameColor);
  if (cost?.lines.length) {
    for (const line of cost.lines) {
      if (line.billing === "kit") {
        addLine(map, {
          section: "profiles",
          label: line.label,
          amount: (line.qty ?? 0) * q,
          unit: "طقم",
          note: joinNotes(systemNote, line.productName, tint),
        });
      } else {
        const barLen =
          line.barLengthM > 0 ? line.barLengthM : DEFAULT_BAR_LENGTH_M;
        addLine(map, {
          section: "profiles",
          label: line.label,
          amount: line.lengthM * q,
          unit: "م",
          barLengthM: barLen,
          note: joinNotes(
            systemNote,
            line.productName,
            `طول العود ${barLen}م`,
            tint
          ),
        });
      }
    }
    return;
  }

  // بدون تسعير: بالمتر + تقدير أعواد
  const fallback: { label: string; meters: number }[] = [
    { label: "حلق مفصلي", meters: materials.frameHingedM },
    { label: "حلق جرار", meters: materials.frameSlidingM },
    { label: "ضلفة مفصلي", meters: materials.sashHingedM },
    { label: "ضلفة باب", meters: materials.sashDoorM },
    { label: "ضلفة جرار", meters: materials.sashSlidingM },
    { label: "سوقاس مفصلي", meters: materials.mullionHingedM },
    { label: "سوقاس جرار", meters: materials.mullionSlidingM },
    { label: "بوكلير", meters: materials.bouclierM },
    { label: "كوبلن", meters: materials.couplingM },
    { label: "سكينة", meters: materials.knifeM },
    { label: "باكتة سنجل مفصلي", meters: materials.beadSingleHingedM },
    { label: "باكتة دبل مفصلي", meters: materials.beadDoubleHingedM },
    { label: "باكتة سنجل جرار", meters: materials.beadSingleSlidingM },
    { label: "باكتة دبل جرار", meters: materials.beadDoubleSlidingM },
    { label: "بنل", meters: materials.panelM },
    { label: "ضلفة سلك جرار", meters: materials.meshSlidingProfileM },
    { label: "تقابل ٤ ضلفة", meters: materials.fourLeafMeetingM },
    { label: "تقابل سلك", meters: materials.meshMeetingM },
  ];
  for (const row of fallback) {
    addLine(map, {
      section: "profiles",
      label: row.label,
      amount: row.meters,
      unit: "م",
      barLengthM: DEFAULT_BAR_LENGTH_M,
      note: joinNotes(systemNote, `طول العود ${DEFAULT_BAR_LENGTH_M}م`, tint),
    });
  }
  if (materials.bouclierCapQty > 0) {
    addLine(map, {
      section: "profiles",
      label: "طبة بوكلير",
      amount: materials.bouclierCapQty,
      unit: "طقم",
      note: joinNotes(systemNote, tint),
    });
  }
  if (materials.mullionHingedQty > 0) {
    addLine(map, {
      section: "profiles",
      label: "طقم تجميع سقاس مفصلي",
      amount: materials.mullionHingedQty,
      unit: "طقم",
      note: joinNotes(systemNote, tint),
    });
  }
  if (materials.mullionSlidingQty > 0) {
    addLine(map, {
      section: "profiles",
      label: "طقم تجميع سقاس جرار",
      amount: materials.mullionSlidingQty,
      unit: "طقم",
      note: joinNotes(systemNote, tint),
    });
  }
}

function addGlassLines(
  map: Map<string, PurchaseLine>,
  glass: GlassBreakdown | null,
  materials: MaterialsBreakdown,
  qty: number
) {
  const q = Math.max(1, qty || 1);
  if (glass?.lines.length) {
    const byLabel = new Map<string, { area: number; note?: string }>();
    for (const line of glass.lines) {
      const key = line.label || "زجاج";
      const prev = byLabel.get(key) ?? { area: 0, note: undefined };
      prev.area += line.areaSqm * q;
      const bits = [
        line.glazing === "double" ? "دبل" : "سنجل",
        line.georgian ? "جورجيا" : null,
      ].filter(Boolean);
      prev.note = bits.length ? bits.join(" · ") : prev.note;
      byLabel.set(key, prev);
    }
    for (const [label, v] of byLabel) {
      addLine(map, {
        section: "glass",
        label,
        amount: v.area,
        unit: "م²",
        note: v.note,
      });
    }
    return;
  }
  if (materials.glassAreaSqm > 0.0005) {
    addLine(map, {
      section: "glass",
      label: "زجاج",
      amount: materials.glassAreaSqm,
      unit: "م²",
    });
  }
}

function addMeshLines(
  map: Map<string, PurchaseLine>,
  mesh: MeshBreakdown | null,
  materials: MaterialsBreakdown,
  qty: number
) {
  const q = Math.max(1, qty || 1);
  if (mesh?.lines.length) {
    const byLabel = new Map<string, number>();
    for (const line of mesh.lines) {
      const key = line.label || "سلك";
      byLabel.set(key, (byLabel.get(key) ?? 0) + line.areaSqm * q);
    }
    for (const [label, area] of byLabel) {
      addLine(map, {
        section: "mesh",
        label,
        amount: area,
        unit: "م²",
      });
    }
  } else if (materials.meshAreaSqm > 0.0005) {
    addLine(map, {
      section: "mesh",
      label: "سلك",
      amount: materials.meshAreaSqm,
      unit: "م²",
    });
  }

  if (materials.meshSlidingWheelQty > 0) {
    addLine(map, {
      section: "mesh",
      label: "عجل سلك",
      amount: materials.meshSlidingWheelQty,
      unit: "قطعة",
      note: "٢ لكل ضلفة",
    });
  }
  if (materials.meshPushHandleQty > 0) {
    addLine(map, {
      section: "mesh",
      label: "مقبض لطش",
      amount: materials.meshPushHandleQty,
      unit: "قطعة",
    });
  }
}

function addAccessoryLines(
  map: Map<string, PurchaseLine>,
  acc: AccessoriesBreakdown | null,
  frameColor?: string
) {
  if (!acc?.hasAccessories) return;
  const brandNote = (cat: keyof AccessoriesBreakdown["brandLabels"]) =>
    acc.brandLabels[cat] || acc.systemName || undefined;
  /** لون المقابض ووش التسكيك = لون الإطار/الباب */
  const handleTint =
    colorNote(acc.doorHandleColorLabel) ?? colorNote(frameColor);

  addLine(map, {
    section: "accessories",
    label: "مفصلات",
    amount: acc.hingeQty,
    unit: "قطعة",
    note: brandNote("hinge"),
  });

  for (const line of acc.tiltEspagnolettes) {
    addLine(map, {
      section: "accessories",
      label: `سبلونة مفصلي قلاب ${line.label}`,
      amount: line.qty,
      unit: "قطعة",
      note: joinNotes(brandNote("tilt-espagnolette"), `حد ${line.maxDimMm}مم`),
    });
  }
  for (const line of acc.tiltScissors) {
    addLine(map, {
      section: "accessories",
      label: `مقص قلاب ${line.label}`,
      amount: line.qty,
      unit: "قطعة",
      note: joinNotes(brandNote("tilt-scissors"), `حد ${line.maxDimMm}مم`),
    });
  }
  addLine(map, {
    section: "accessories",
    label: "كورنر علوي",
    amount: acc.tiltCornerUpperQty,
    unit: "قطعة",
    note: brandNote("tilt-corner-upper"),
  });
  addLine(map, {
    section: "accessories",
    label: "كورنر سفلي",
    amount: acc.tiltCornerLowerQty,
    unit: "قطعة",
    note: brandNote("tilt-corner-lower"),
  });
  addLine(map, {
    section: "accessories",
    label: "مفصلة علوية جزء الضلفة",
    amount: acc.tiltTopHingeQty,
    unit: "قطعة",
    note: brandNote("tilt-top-hinge"),
  });
  addLine(map, {
    section: "accessories",
    label: "مفصلة علوية جزء الحلق",
    amount: acc.tiltTopFrameHingeQty,
    unit: "قطعة",
    note: brandNote("tilt-top-frame-hinge"),
  });
  addLine(map, {
    section: "accessories",
    label: "مفصلة سفلية جزء الحلق",
    amount: acc.tiltBottomFrameHingeQty,
    unit: "قطعة",
    note: brandNote("tilt-bottom-frame-hinge"),
  });
  addLine(map, {
    section: "accessories",
    label: "مفصلة سفلية جزء الضلفة",
    amount: acc.tiltBottomSashHingeQty,
    unit: "قطعة",
    note: brandNote("tilt-bottom-sash-hinge"),
  });
  addLine(map, {
    section: "accessories",
    label: "مفصلة علوية بنز",
    amount: acc.tiltHingePinQty,
    unit: "قطعة",
    note: brandNote("tilt-hinge-pin"),
  });
  addLine(map, {
    section: "accessories",
    label: "سكاك كورنر سفلي",
    amount: acc.tiltCornerStrikerQty,
    unit: "قطعة",
    note: brandNote("tilt-corner-striker"),
  });
  addLine(map, {
    section: "accessories",
    label: "غطاء مفصلة",
    amount: acc.tiltHingeCoverQty,
    unit: "قطعة",
    note: brandNote("tilt-hinge-cover"),
  });

  addLine(map, {
    section: "accessories",
    label: "كالون",
    amount: acc.doorCylinderQty,
    unit: "قطعة",
    note: brandNote("door-cylinder"),
  });
  addLine(map, {
    section: "accessories",
    label: "مقبض إشارة",
    amount: acc.doorSignalHandleQty,
    unit: "قطعة",
    note: joinNotes(brandNote("door-signal-handle"), handleTint),
  });
  addLine(map, {
    section: "accessories",
    label: "وش تسكيك",
    amount: acc.doorEscutcheonQty,
    unit: "قطعة",
    note: joinNotes(brandNote("door-escutcheon"), handleTint),
  });

  for (const line of acc.hingedEspagnolettes) {
    addLine(map, {
      section: "accessories",
      label: `سبلونة مفصلي ${line.size}سم`,
      amount: line.qty,
      unit: "قطعة",
      note: brandNote("hinged-espagnolette"),
    });
  }
  for (const piece of acc.hingedLockPieces) {
    addLine(map, {
      section: "accessories",
      label: piece.name,
      amount: piece.qty,
      unit: "قطعة",
      note: brandNote("hinged-lock"),
    });
  }
  for (const piece of acc.bouclierLockPieces) {
    addLine(map, {
      section: "accessories",
      label: piece.name,
      amount: piece.qty,
      unit: "قطعة",
      note: brandNote("bouclier-lock"),
    });
  }
  addLine(map, {
    section: "accessories",
    label: "ترباس",
    amount: acc.boltQty,
    unit: "قطعة",
    note: brandNote("bouclier-bolt"),
  });
  for (const piece of acc.bouclierBoltLockPieces) {
    addLine(map, {
      section: "accessories",
      label: piece.name,
      amount: piece.qty,
      unit: "قطعة",
      note: brandNote("bouclier-bolt-lock"),
    });
  }
  addLine(map, {
    section: "accessories",
    label: "مقبض بارز",
    amount: acc.protrudingHandleQty,
    unit: "قطعة",
    note: joinNotes(brandNote("protruding-handle"), colorNote(frameColor)),
  });
  addLine(map, {
    section: "accessories",
    label: "عجل جرار",
    amount: acc.rollerQty,
    unit: "قطعة",
    note: brandNote("roller"),
  });
  addLine(map, {
    section: "accessories",
    label: "فرش",
    amount: acc.brushLengthM,
    unit: "م",
    note: brandNote("brush"),
  });
  for (const line of acc.slidingEspagnolettes) {
    addLine(map, {
      section: "accessories",
      label: `سبلونة جرار ${line.size}سم`,
      amount: line.qty,
      unit: "قطعة",
      note: brandNote("sliding-espagnolette"),
    });
  }
  for (const piece of acc.slidingLockPieces) {
    addLine(map, {
      section: "accessories",
      label: piece.name,
      amount: piece.qty,
      unit: "قطعة",
      note: brandNote("sliding-lock"),
    });
  }
  addLine(map, {
    section: "accessories",
    label: "مقبض غاطس",
    amount: acc.recessedHandleQty,
    unit: "قطعة",
    note: joinNotes(brandNote("recessed-handle"), colorNote(frameColor)),
  });
}

function addIronLines(map: Map<string, PurchaseLine>, iron: IronBreakdown | null) {
  if (!iron?.lines.length) return;
  for (const line of iron.lines) {
    const barLen =
      line.barLengthM && line.barLengthM > 0
        ? line.barLengthM
        : DEFAULT_BAR_LENGTH_M;
    const note = joinNotes(
      iron.systemName,
      line.pieceName,
      line.lengthM > 0.0005 ? `طول العود ${barLen}م` : undefined
    );
    if (line.lengthM > 0.0005) {
      addLine(map, {
        section: "iron",
        label: line.label,
        amount: line.lengthM,
        unit: "م",
        barLengthM: barLen,
        note,
      });
    } else if (line.qty != null && line.qty > 0) {
      addLine(map, {
        section: "iron",
        label: line.label,
        amount: line.qty,
        unit: "قطعة",
        note,
      });
    }
  }
}

function contributeItem(
  map: Map<string, PurchaseLine>,
  item: DesignItem,
  project: Project | undefined,
  catalog: MaterialCatalog
) {
  const qty = Math.max(1, item.qty || 1);
  const unitMats = calcItemMaterials(item, catalog);
  const mats = scaleMaterials(unitMats, qty);
  const systemId = item.systemId || project?.systemId;
  const system = systemId && systemId !== "none"
    ? findSystem("profiles", systemId, catalog)
    : null;
  const systemNote = system?.name;
  const frameColor = itemFrameColorLabel(item);

  const profileCost = calcProfileCostBreakdown(item, unitMats, catalog);
  addProfileLines(
    map,
    profileCost,
    mats,
    qty,
    systemNote ?? undefined,
    frameColor
  );

  addGlassLines(map, calcGlassBreakdown(item, catalog), mats, qty);
  addMeshLines(map, calcMeshBreakdown(item, catalog), mats, qty);
  addAccessoryLines(
    map,
    scaleAccessories(calcItemAccessories(item, catalog, project), qty),
    frameColor
  );

  const ironRaw = calcIronBreakdown(item, getIronSystem(catalog));
  addIronLines(map, ironRaw ? scaleIronBreakdown(ironRaw, qty) : null);
}

/** يبني طلبية مشتريات مجمّعة لكل بنود المشروع */
export function buildProjectPurchaseOrder(
  customerId: string,
  projectId: string
): PurchaseOrderData | null {
  const project = getProjectById(projectId);
  if (!project) return null;

  const items = getItemsForProject(projectId);
  const catalog = loadMaterialCatalog();
  const company = loadCompany();
  const customer =
    mergeCustomers().find((c) => c.id === customerId) ?? null;

  const map = new Map<string, PurchaseLine>();
  for (const item of items) {
    try {
      contributeItem(map, item, project, catalog);
    } catch (err) {
      console.error("purchase order item failed", item.id, err);
    }
  }

  const allLines = Array.from(map.values());
  const sections: PurchaseSection[] = SECTION_ORDER.map((id) => ({
    id,
    title: SECTION_TITLE[id],
    lines: allLines
      .filter((l) => l.section === id)
      .sort((a, b) => a.label.localeCompare(b.label, "ar")),
  })).filter((s) => s.lines.length > 0);

  const flat = sections.flatMap((s) => s.lines);
  const printedAt = new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

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
    sections,
    linePages: chunkItemsByBudget(flat, {
      firstPageBudget: PURCHASE_LINES_FIRST_PAGE,
      nextPageBudget: PURCHASE_LINES_PER_PAGE,
      sectionCost: PURCHASE_SECTION_COST,
      getSection: (line) => line.section,
    }),
  };
}

