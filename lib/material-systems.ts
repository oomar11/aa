/** أنظمة الخامات: قطاعات · اكسسوار · زجاج · حديد */

import {
  deductToFormula,
  ensureEqualsPrefix,
  evaluateFormula,
  validateFormula,
} from "@/lib/excel-formula";

export type MaterialCategory = "profiles" | "accessories" | "glass" | "iron";

/** دور العود داخل نظام القطاعات */
export type ProfilePieceRole =
  | "frame-hinged"
  | "frame-sliding"
  | "sash-hinged"
  | "sash-sliding"
  | "mullion"
  | "coupling"
  | "knife"
  | "bead"
  | "threshold"
  | "other";

export const PROFILE_PIECE_ROLES: {
  id: ProfilePieceRole;
  label: string;
}[] = [
  { id: "frame-hinged", label: "حلق مفصلي" },
  { id: "frame-sliding", label: "حلق جرار" },
  { id: "sash-hinged", label: "ضلفة مفصلي" },
  { id: "sash-sliding", label: "ضلفة جرار" },
  { id: "mullion", label: "سوقاس" },
  { id: "coupling", label: "كوبلن" },
  { id: "knife", label: "سكينة" },
  { id: "bead", label: "بيادة زجاج" },
  { id: "threshold", label: "عتبة" },
  { id: "other", label: "أخرى" },
];

export function profileRoleLabel(role: ProfilePieceRole): string {
  return PROFILE_PIECE_ROLES.find((r) => r.id === role)?.label ?? role;
}

/** عود / قطاع داخل النظام */
export type ProfilePiece = {
  id: string;
  /** اسم العود (مثلاً: حلق مفصلي 60) */
  name: string;
  role: ProfilePieceRole;
  /** عرض مقطع القطاع بالمليمتر */
  sectionWidthMm: number;
  /** طول العود بالمتر (المخزون) — غالباً 5.8 أو 6 */
  barLengthM: number;
  notes?: string;
};

/**
 * معادلات التخصيم (صيغة إكسل).
 * متغيرات: W عرض الفتحة، H ارتفاع الفتحة، FW عرض الحلق، FH ارتفاع الحلق.
 * مثال: =W   |   =W-10   |   =FW-2*5   |   =MAX(H-20,0)
 */
export type ProfileAxisFormulas = {
  width: string;
  height: string;
};

export type ProfileDeductions = {
  frame: ProfileAxisFormulas;
  sash: ProfileAxisFormulas;
};

export type ProfileSystemDetails = {
  pieces: ProfilePiece[];
  deductions: ProfileDeductions;
};

/** نوع الزجاجة الواحدة */
export type GlassPaneKind =
  | "clear"
  | "satin"
  | "tinted"
  | "reflective"
  | "tempered"
  | "laminated"
  | "low-e"
  | "other";

export const GLASS_PANE_KINDS: { id: GlassPaneKind; label: string }[] = [
  { id: "clear", label: "شفاف عادي" },
  { id: "satin", label: "مصنفر" },
  { id: "tinted", label: "ملون" },
  { id: "reflective", label: "عاكس" },
  { id: "tempered", label: "سيكوريت" },
  { id: "laminated", label: "مصفح" },
  { id: "low-e", label: "Low-E" },
  { id: "other", label: "أخرى" },
];

export function glassPaneKindLabel(kind: GlassPaneKind): string {
  return GLASS_PANE_KINDS.find((k) => k.id === kind)?.label ?? kind;
}

export type GlassPaneSpec = {
  /** وصف الزجاجة (مثلاً: شفاف 4 مم) */
  label: string;
  /** سمك الزجاجة بالمليمتر */
  thicknessMm: number;
  kind: GlassPaneKind;
};

export type GlassGlazing = "single" | "double";

/**
 * تفاصيل نظام الزجاج:
 * مفرد أو دبل، الزجاجة الأولى/الثانية، جورجيا بينهم.
 * الأسعار اختيارية — تُستخدم لحساب تكلفة الزجاج منفصلة.
 */
export type GlassSystemDetails = {
  glazing: GlassGlazing;
  /** الزجاجة الأولى (الخارجية / الوحيدة في المفرد) */
  pane1: GlassPaneSpec;
  /** الزجاجة الثانية — للدبل فقط */
  pane2?: GlassPaneSpec;
  /** سمك الفاصل الهوائي بين الزجاجتين (مم) — للدبل */
  spacerMm?: number;
  /** جورجيا بين الزجاجتين */
  georgian: boolean;
  /** وصف الجورجيا (شكل / لون) */
  georgianNote?: string;
  /** سعر متر مربع الزجاجة الأولى (ج.م) */
  pane1PricePerSqm?: number;
  /** سعر متر مربع الزجاجة الثانية — للدبل (ج.م) */
  pane2PricePerSqm?: number;
  /** تكلفة التدبيل لكل متر مربع — للدبل (ج.م) */
  doublingCostPerSqm?: number;
  /** تكلفة الجورجيا لكل متر مربع (ج.م) */
  georgianCostPerSqm?: number;
};

export type MaterialSystem = {
  id: string;
  name: string;
  notes?: string;
  /** النظام الافتراضي (خصوصاً للحديد الثابت غالباً) */
  isDefault?: boolean;
  /** تفاصيل نظام القطاعات: العيدان + التخصيمات */
  profile?: ProfileSystemDetails;
  /** تفاصيل نظام الزجاج: مفرد/دبل + جورجيا */
  glass?: GlassSystemDetails;
};

/** أسعار التدبيل والجورجيا — عامة لكل الضلف */
export type GlassRates = {
  doublingCostPerSqm: number;
  georgianCostPerSqm: number;
};

export type MaterialCatalog = Record<MaterialCategory, MaterialSystem[]> & {
  glassRates?: GlassRates;
};

export const MATERIALS_STORAGE_KEY = "upvc-material-systems";

/** طول العود الافتراضي بالمتر */
export const DEFAULT_BAR_LENGTH_M = 5.8;

export const MATERIAL_CATEGORIES: {
  id: MaterialCategory;
  label: string;
  description: string;
  accent: string;
  shadow: string;
}[] = [
  {
    id: "profiles",
    label: "قطاعات",
    description: "أنظمة البروفيل · العيدان · التخصيمات",
    accent: "#E8956F",
    shadow: "rgba(232,149,111,0.35)",
  },
  {
    id: "accessories",
    label: "اكسسوار",
    description: "المقابض · المفصلات · الإكسسوارات",
    accent: "#6B8AD8",
    shadow: "rgba(107,138,216,0.35)",
  },
  {
    id: "glass",
    label: "زجاج",
    description: "كتالوج الزجاجات · التدبيل · جورجيا",
    accent: "#4BA3F5",
    shadow: "rgba(75,163,245,0.35)",
  },
  {
    id: "iron",
    label: "حديد",
    description: "تسليح الحديد — غالباً ثابت",
    accent: "#7A8799",
    shadow: "rgba(122,135,153,0.35)",
  },
];

export function getCategoryMeta(id: MaterialCategory) {
  return MATERIAL_CATEGORIES.find((c) => c.id === id)!;
}

export function defaultDeductions(): ProfileDeductions {
  return {
    frame: { width: "=W", height: "=H" },
    sash: { width: "=FW-10", height: "=FH-10" },
  };
}

export function defaultProfilePieces(): ProfilePiece[] {
  return [
    {
      id: "piece-frame-h",
      name: "حلق مفصلي",
      role: "frame-hinged",
      sectionWidthMm: 60,
      barLengthM: DEFAULT_BAR_LENGTH_M,
    },
    {
      id: "piece-sash-h",
      name: "ضلفة مفصلي",
      role: "sash-hinged",
      sectionWidthMm: 70,
      barLengthM: DEFAULT_BAR_LENGTH_M,
    },
    {
      id: "piece-mullion",
      name: "سوقاس",
      role: "mullion",
      sectionWidthMm: 70,
      barLengthM: DEFAULT_BAR_LENGTH_M,
    },
    {
      id: "piece-bead",
      name: "بيادة زجاج",
      role: "bead",
      sectionWidthMm: 20,
      barLengthM: DEFAULT_BAR_LENGTH_M,
    },
  ];
}

export function defaultProfileDetails(): ProfileSystemDetails {
  return {
    pieces: defaultProfilePieces(),
    deductions: defaultDeductions(),
  };
}

export function defaultGlassPane(
  partial?: Partial<GlassPaneSpec>
): GlassPaneSpec {
  return {
    label: partial?.label ?? "شفاف عادي",
    thicknessMm: partial?.thicknessMm ?? 4,
    kind: partial?.kind ?? "clear",
  };
}

export function defaultGlassDetails(
  glazing: GlassGlazing = "double"
): GlassSystemDetails {
  if (glazing === "single") {
    return {
      glazing: "single",
      pane1: defaultGlassPane({ label: "شفاف عادي", thicknessMm: 6 }),
      georgian: false,
    };
  }
  return {
    glazing: "double",
    pane1: defaultGlassPane({ label: "شفاف عادي", thicknessMm: 4 }),
    pane2: defaultGlassPane({ label: "شفاف عادي", thicknessMm: 4 }),
    spacerMm: 6,
    georgian: false,
  };
}

function withDefaultProfile(system: MaterialSystem): MaterialSystem {
  if (system.profile) return system;
  return { ...system, profile: defaultProfileDetails() };
}

function withDefaultGlass(system: MaterialSystem): MaterialSystem {
  if (system.glass) return system;
  return { ...system, glass: defaultGlassDetails("double") };
}

export function defaultGlassRates(): GlassRates {
  return {
    doublingCostPerSqm: 50,
    georgianCostPerSqm: 100,
  };
}

/** زجاجة واحدة في كتالوج الخامات */
export function defaultGlassBottle(opts: {
  id: string;
  name: string;
  kind: GlassPaneKind;
  thicknessMm: number;
  pricePerSqm: number;
  notes?: string;
}): MaterialSystem {
  return {
    id: opts.id,
    name: opts.name,
    notes: opts.notes,
    glass: {
      glazing: "single",
      pane1: defaultGlassPane({
        label: opts.name,
        thicknessMm: opts.thicknessMm,
        kind: opts.kind,
      }),
      georgian: false,
      pane1PricePerSqm: opts.pricePerSqm,
    },
  };
}

export function getGlassBottlePrice(system: MaterialSystem | undefined): number {
  return system?.glass?.pane1PricePerSqm ?? 0;
}

export function findGlassBottle(
  id: string | undefined | null,
  catalog?: MaterialCatalog
): MaterialSystem | undefined {
  if (!id) return undefined;
  return getSystemsForCategory("glass", catalog).find((s) => s.id === id);
}

export function glassBottleOptions(
  catalog?: MaterialCatalog
): { id: string; label: string; pricePerSqm: number }[] {
  return getSystemsForCategory("glass", catalog).map((s) => ({
    id: s.id,
    label: s.name,
    pricePerSqm: getGlassBottlePrice(s),
  }));
}

/**
 * حساب تكلفة الزجاج لكل م² لضلفة واحدة:
 * زجاجة واحدة = سعرها · زجاجتين = السعرين + تدبيل · جورجيا إضافية للدبل
 */
export function calcPaneGlassCostPerSqm(
  pane1Id: string | undefined,
  pane2Id: string | undefined,
  georgian: boolean,
  catalog?: MaterialCatalog
): number {
  if (!pane1Id) return 0;
  const cat = catalog ?? (typeof window !== "undefined" ? loadMaterialCatalog() : getDefaultCatalog());
  const bottle1 = findGlassBottle(pane1Id, cat);
  const p1 = getGlassBottlePrice(bottle1);
  if (!pane2Id) return p1;

  const bottle2 = findGlassBottle(pane2Id, cat);
  const p2 = getGlassBottlePrice(bottle2);
  const rates = cat.glassRates ?? defaultGlassRates();
  const geo = georgian ? rates.georgianCostPerSqm : 0;
  return p1 + p2 + rates.doublingCostPerSqm + geo;
}

export function paneGlassHasPricing(
  pane1Id: string | undefined,
  catalog?: MaterialCatalog
): boolean {
  if (!pane1Id) return false;
  return getGlassBottlePrice(findGlassBottle(pane1Id, catalog)) > 0;
}

/** القيم الافتراضية — متوافقة مع الاختيارات القديمة في التصميم */
export function getDefaultCatalog(): MaterialCatalog {
  return {
    profiles: [
      withDefaultProfile({
        id: "pvc1",
        name: "نظام PVC مخصص 1",
        notes: "مفصلي قياسي",
        profile: {
          pieces: [
            {
              id: "pvc1-fh",
              name: "حلق مفصلي",
              role: "frame-hinged",
              sectionWidthMm: 60,
              barLengthM: DEFAULT_BAR_LENGTH_M,
            },
            {
              id: "pvc1-sh",
              name: "ضلفة مفصلي",
              role: "sash-hinged",
              sectionWidthMm: 70,
              barLengthM: DEFAULT_BAR_LENGTH_M,
            },
            {
              id: "pvc1-m",
              name: "سوقاس",
              role: "mullion",
              sectionWidthMm: 70,
              barLengthM: DEFAULT_BAR_LENGTH_M,
            },
            {
              id: "pvc1-b",
              name: "بيادة زجاج",
              role: "bead",
              sectionWidthMm: 20,
              barLengthM: DEFAULT_BAR_LENGTH_M,
            },
          ],
          deductions: {
            frame: { width: "=W", height: "=H" },
            sash: { width: "=FW-10", height: "=FH-10" },
          },
        },
      }),
      withDefaultProfile({
        id: "pvc2",
        name: "نظام PVC مخصص 2",
        notes: "جرار",
        profile: {
          pieces: [
            {
              id: "pvc2-fs",
              name: "حلق جرار",
              role: "frame-sliding",
              sectionWidthMm: 80,
              barLengthM: DEFAULT_BAR_LENGTH_M,
            },
            {
              id: "pvc2-ss",
              name: "ضلفة جرار",
              role: "sash-sliding",
              sectionWidthMm: 45,
              barLengthM: DEFAULT_BAR_LENGTH_M,
            },
            {
              id: "pvc2-k",
              name: "سكينة",
              role: "knife",
              sectionWidthMm: 30,
              barLengthM: DEFAULT_BAR_LENGTH_M,
            },
            {
              id: "pvc2-b",
              name: "بيادة زجاج",
              role: "bead",
              sectionWidthMm: 20,
              barLengthM: DEFAULT_BAR_LENGTH_M,
            },
          ],
          deductions: {
            frame: { width: "=W", height: "=H" },
            sash: { width: "=FW-40", height: "=FH-60" },
          },
        },
      }),
      withDefaultProfile({
        id: "pvc3",
        name: "نظام PVC مخصص 3",
        profile: defaultProfileDetails(),
      }),
      withDefaultProfile({
        id: "sysA",
        name: "نظام PVC A",
        profile: defaultProfileDetails(),
      }),
      withDefaultProfile({
        id: "sysB",
        name: "نظام PVC B",
        profile: defaultProfileDetails(),
      }),
      withDefaultProfile({
        id: "sysC",
        name: "نظام PVC C",
        profile: defaultProfileDetails(),
      }),
    ],
    accessories: [
      { id: "acc-std", name: "اكسسوار قياسي", isDefault: true },
      { id: "acc-premium", name: "اكسسوار فاخر" },
      { id: "acc-economy", name: "اكسسوار اقتصادي" },
    ],
    glass: [
      defaultGlassBottle({
        id: "bottle-clear-4",
        name: "شفاف 4 مم",
        kind: "clear",
        thicknessMm: 4,
        pricePerSqm: 80,
      }),
      defaultGlassBottle({
        id: "bottle-satin-4",
        name: "مصنفر 4 مم",
        kind: "satin",
        thicknessMm: 4,
        pricePerSqm: 120,
      }),
      defaultGlassBottle({
        id: "bottle-tempered-6",
        name: "سيكوريت 6 مم",
        kind: "tempered",
        thicknessMm: 6,
        pricePerSqm: 150,
      }),
      defaultGlassBottle({
        id: "bottle-reflective-4",
        name: "عاكس 4 مم",
        kind: "reflective",
        thicknessMm: 4,
        pricePerSqm: 100,
      }),
    ],
    iron: [
      {
        id: "iron-std",
        name: "حديد تسليح قياسي",
        notes: "ثابت في أغلب التصميمات",
        isDefault: true,
      },
      { id: "iron-heavy", name: "حديد تسليح ثقيل" },
    ],
    glassRates: defaultGlassRates(),
  };
}

function isCatalog(value: unknown): value is MaterialCatalog {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return MATERIAL_CATEGORIES.every((c) => Array.isArray(obj[c.id]));
}

function normalizeRole(raw: unknown): ProfilePieceRole {
  const ok = PROFILE_PIECE_ROLES.some((r) => r.id === raw);
  return ok ? (raw as ProfilePieceRole) : "other";
}

function normalizePiece(raw: unknown): ProfilePiece | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.id !== "string" || typeof p.name !== "string") return null;
  if (!p.id.trim() || !p.name.trim()) return null;
  const sectionWidthMm = Number(p.sectionWidthMm);
  const barLengthM = Number(p.barLengthM);
  return {
    id: p.id.trim(),
    name: p.name.trim(),
    role: normalizeRole(p.role),
    sectionWidthMm:
      Number.isFinite(sectionWidthMm) && sectionWidthMm >= 0
        ? sectionWidthMm
        : 60,
    barLengthM:
      Number.isFinite(barLengthM) && barLengthM > 0
        ? barLengthM
        : DEFAULT_BAR_LENGTH_M,
    notes: typeof p.notes === "string" ? p.notes : undefined,
  };
}

function normalizeFormulaField(
  raw: unknown,
  legacyDeduct: unknown,
  baseVar: "W" | "H" | "FW" | "FH",
  fallback: string
): string {
  if (typeof raw === "string" && raw.trim()) {
    const formula = ensureEqualsPrefix(raw);
    const check = validateFormula(formula);
    return check.ok ? formula : fallback;
  }
  if (typeof legacyDeduct === "number" && Number.isFinite(legacyDeduct)) {
    return deductToFormula(baseVar, legacyDeduct);
  }
  if (typeof legacyDeduct === "string" && legacyDeduct.trim() !== "") {
    const n = Number(legacyDeduct);
    if (Number.isFinite(n)) return deductToFormula(baseVar, n);
  }
  return fallback;
}

function normalizeAxisFormulas(
  raw: unknown,
  fallback: ProfileAxisFormulas,
  kind: "frame" | "sash"
): ProfileAxisFormulas {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const a = raw as Record<string, unknown>;
  const widthBase = kind === "frame" ? "W" : "FW";
  const heightBase = kind === "frame" ? "H" : "FH";
  return {
    width: normalizeFormulaField(
      a.width ?? a.widthFormula,
      a.widthMm,
      widthBase,
      fallback.width
    ),
    height: normalizeFormulaField(
      a.height ?? a.heightFormula,
      a.heightMm,
      heightBase,
      fallback.height
    ),
  };
}

function normalizeProfileDetails(raw: unknown): ProfileSystemDetails {
  const fallback = defaultProfileDetails();
  if (!raw || typeof raw !== "object") return fallback;
  const d = raw as Record<string, unknown>;
  const piecesRaw = Array.isArray(d.pieces) ? d.pieces : [];
  const seen = new Set<string>();
  const pieces: ProfilePiece[] = [];
  for (const item of piecesRaw) {
    const piece = normalizePiece(item);
    if (!piece || seen.has(piece.id)) continue;
    seen.add(piece.id);
    pieces.push(piece);
  }
  const deductionsRaw =
    d.deductions && typeof d.deductions === "object"
      ? (d.deductions as Record<string, unknown>)
      : {};
  return {
    pieces: pieces.length > 0 ? pieces : fallback.pieces,
    deductions: {
      frame: normalizeAxisFormulas(
        deductionsRaw.frame,
        fallback.deductions.frame,
        "frame"
      ),
      sash: normalizeAxisFormulas(
        deductionsRaw.sash,
        fallback.deductions.sash,
        "sash"
      ),
    },
  };
}

function normalizeGlassRates(raw: unknown): GlassRates {
  const fallback = defaultGlassRates();
  if (!raw || typeof raw !== "object") return fallback;
  const g = raw as Record<string, unknown>;
  const doubling = Number(g.doublingCostPerSqm);
  const georgian = Number(g.georgianCostPerSqm);
  return {
    doublingCostPerSqm:
      Number.isFinite(doubling) && doubling >= 0 ? doubling : fallback.doublingCostPerSqm,
    georgianCostPerSqm:
      Number.isFinite(georgian) && georgian >= 0 ? georgian : fallback.georgianCostPerSqm,
  };
}

function normalizeGlassPane(
  raw: unknown,
  fallback: GlassPaneSpec
): GlassPaneSpec {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const p = raw as Record<string, unknown>;
  const thicknessMm = Number(p.thicknessMm);
  const kindRaw = p.kind;
  const kindOk = GLASS_PANE_KINDS.some((k) => k.id === kindRaw);
  return {
    label:
      typeof p.label === "string" && p.label.trim()
        ? p.label.trim()
        : fallback.label,
    thicknessMm:
      Number.isFinite(thicknessMm) && thicknessMm > 0
        ? thicknessMm
        : fallback.thicknessMm,
    kind: kindOk ? (kindRaw as GlassPaneKind) : fallback.kind,
  };
}

function normalizeGlassDetails(raw: unknown): GlassSystemDetails {
  const fallback = defaultGlassDetails("double");
  if (!raw || typeof raw !== "object") return fallback;
  const g = raw as Record<string, unknown>;
  const glazing: GlassGlazing = g.glazing === "single" ? "single" : "double";
  const pane1 = normalizeGlassPane(g.pane1, fallback.pane1);
  const spacerRaw = Number(g.spacerMm);
  const georgian = Boolean(g.georgian);

  function normPrice(v: unknown): number | undefined {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  }

  const pane1Price = normPrice(g.pane1PricePerSqm);
  const pane2Price = normPrice(g.pane2PricePerSqm);
  const doublingCost = normPrice(g.doublingCostPerSqm);
  const georgianCost = normPrice(g.georgianCostPerSqm);

  if (glazing === "single") {
    return {
      glazing: "single",
      pane1,
      georgian: false,
      georgianNote: undefined,
      spacerMm: undefined,
      pane2: undefined,
      pane1PricePerSqm: pane1Price,
      georgianCostPerSqm: georgianCost,
    };
  }

  return {
    glazing: "double",
    pane1,
    pane2: normalizeGlassPane(
      g.pane2,
      fallback.pane2 ?? defaultGlassPane({ thicknessMm: 4 })
    ),
    spacerMm:
      Number.isFinite(spacerRaw) && spacerRaw >= 0
        ? spacerRaw
        : (fallback.spacerMm ?? 6),
    georgian,
    georgianNote:
      georgian && typeof g.georgianNote === "string" && g.georgianNote.trim()
        ? g.georgianNote.trim()
        : georgian
          ? undefined
          : undefined,
    pane1PricePerSqm: pane1Price,
    pane2PricePerSqm: pane2Price,
    doublingCostPerSqm: doublingCost,
    georgianCostPerSqm: georgianCost,
  };
}

function normalizeSystem(
  raw: unknown,
  category: MaterialCategory
): MaterialSystem | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.id !== "string" || typeof s.name !== "string") return null;
  if (!s.id.trim() || !s.name.trim()) return null;
  const base: MaterialSystem = {
    id: s.id.trim(),
    name: s.name.trim(),
    notes: typeof s.notes === "string" ? s.notes : undefined,
    isDefault: Boolean(s.isDefault),
  };
  if (category === "profiles") {
    base.profile = normalizeProfileDetails(s.profile);
  }
  if (category === "glass") {
    base.glass = normalizeGlassDetails(s.glass);
  }
  return base;
}

function normalizeCatalog(raw: MaterialCatalog): MaterialCatalog {
  const defaults = getDefaultCatalog();
  const next = {} as MaterialCatalog;

  for (const cat of MATERIAL_CATEGORIES) {
    const list = Array.isArray(raw[cat.id]) ? raw[cat.id] : [];
    const seen = new Set<string>();
    const systems: MaterialSystem[] = [];

    for (const item of list) {
      const sys = normalizeSystem(item, cat.id);
      if (!sys || seen.has(sys.id)) continue;
      seen.add(sys.id);
      systems.push(sys);
    }

    if (systems.length === 0) {
      next[cat.id] = defaults[cat.id];
    } else {
      let foundDefault = false;
      next[cat.id] = systems.map((s) => {
        let enriched = s;
        if (cat.id === "profiles" && !enriched.profile) {
          enriched = { ...enriched, profile: defaultProfileDetails() };
        }
        if (cat.id === "glass" && !enriched.glass) {
          enriched = {
            ...enriched,
            glass: {
              glazing: "single",
              pane1: defaultGlassPane({ label: enriched.name }),
              georgian: false,
            },
          };
        }
        if (enriched.isDefault && !foundDefault) {
          foundDefault = true;
          return enriched;
        }
        return { ...enriched, isDefault: false };
      });
    }
  }

  next.glassRates = normalizeGlassRates(raw.glassRates);

  return next;
}

export function loadMaterialCatalog(): MaterialCatalog {
  if (typeof window === "undefined") return getDefaultCatalog();
  try {
    const raw = localStorage.getItem(MATERIALS_STORAGE_KEY);
    if (!raw) return getDefaultCatalog();
    const parsed: unknown = JSON.parse(raw);
    if (!isCatalog(parsed)) return getDefaultCatalog();
    return normalizeCatalog(parsed);
  } catch {
    return getDefaultCatalog();
  }
}

export function saveMaterialCatalog(catalog: MaterialCatalog): MaterialCatalog {
  const normalized = normalizeCatalog(catalog);
  if (typeof window !== "undefined") {
    localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function resetMaterialCatalog(): MaterialCatalog {
  const defaults = getDefaultCatalog();
  if (typeof window !== "undefined") {
    localStorage.removeItem(MATERIALS_STORAGE_KEY);
  }
  return defaults;
}

export function getSystemsForCategory(
  category: MaterialCategory,
  catalog?: MaterialCatalog
): MaterialSystem[] {
  const source = catalog ?? loadMaterialCatalog();
  return source[category] ?? [];
}

export function getDefaultSystemId(
  category: MaterialCategory,
  catalog?: MaterialCatalog
): string {
  const systems = getSystemsForCategory(category, catalog);
  const marked = systems.find((s) => s.isDefault);
  return marked?.id ?? systems[0]?.id ?? "none";
}

export function findSystem(
  category: MaterialCategory,
  id: string | undefined | null,
  catalog?: MaterialCatalog
): MaterialSystem | undefined {
  if (!id || id === "none") return undefined;
  return getSystemsForCategory(category, catalog).find((s) => s.id === id);
}

export function getProfileDetails(
  systemId: string | undefined | null,
  catalog?: MaterialCatalog
): ProfileSystemDetails | undefined {
  const system = findSystem("profiles", systemId, catalog);
  return system?.profile;
}

export function getGlassDetails(
  systemId: string | undefined | null,
  catalog?: MaterialCatalog
): GlassSystemDetails | undefined {
  const system = findSystem("glass", systemId, catalog);
  return system?.glass;
}

/** ملخص قصير لتركيبة الزجاج */
export function glassCompositionLabel(glass: GlassSystemDetails): string {
  if (glass.glazing === "single") {
    return `مفرد ${glass.pane1.thicknessMm} مم (${glassPaneKindLabel(glass.pane1.kind)})`;
  }
  const p1 = glass.pane1.thicknessMm;
  const p2 = glass.pane2?.thicknessMm ?? p1;
  const spacer = glass.spacerMm ?? 0;
  const base = `دبل ${p1}-${spacer}-${p2}`;
  const kinds = `${glassPaneKindLabel(glass.pane1.kind)} + ${glassPaneKindLabel(
    glass.pane2?.kind ?? "clear"
  )}`;
  return glass.georgian ? `${base} · ${kinds} · جورجيا` : `${base} · ${kinds}`;
}

export function glassTotalThicknessMm(glass: GlassSystemDetails): number {
  if (glass.glazing === "single") return glass.pane1.thicknessMm;
  return (
    glass.pane1.thicknessMm +
    (glass.spacerMm ?? 0) +
    (glass.pane2?.thicknessMm ?? 0)
  );
}

/**
 * حساب تكلفة الزجاج لكل متر مربع بناءً على إعدادات النظام.
 * glazingOverride و georgianOverride يسمحان بتجاوز إعداد النظام
 * (مثلاً لما الضلفة عندها نوع مختلف عن النظام الافتراضي).
 */
export function glassGlazingCostPerSqm(
  glass: GlassSystemDetails,
  glazingOverride?: GlassGlazing,
  georgianOverride?: boolean
): number {
  const glazing = glazingOverride ?? glass.glazing;
  const georgian = georgianOverride ?? glass.georgian;
  const p1 = glass.pane1PricePerSqm ?? 0;
  if (glazing === "single") {
    return p1 + (georgian ? (glass.georgianCostPerSqm ?? 0) : 0);
  }
  const p2 = glass.pane2PricePerSqm ?? 0;
  const dbl = glass.doublingCostPerSqm ?? 0;
  const geo = georgian ? (glass.georgianCostPerSqm ?? 0) : 0;
  return p1 + p2 + dbl + geo;
}

/** هل نظام الزجاج فيه أسعار مُدخَلة (الزجاجة الأولى على الأقل) */
export function glassSystemHasPricing(glass: GlassSystemDetails): boolean {
  return (glass.pane1PricePerSqm ?? 0) > 0;
}

export function upsertSystem(
  catalog: MaterialCatalog,
  category: MaterialCategory,
  system: MaterialSystem
): MaterialCatalog {
  let toSave: MaterialSystem = system;
  if (category === "profiles" && !toSave.profile) {
    toSave = { ...toSave, profile: defaultProfileDetails() };
  }
  if (category === "glass" && !toSave.glass) {
    toSave = {
      ...toSave,
      glass: {
        glazing: "single",
        pane1: defaultGlassPane({ label: toSave.name }),
        georgian: false,
      },
    };
  }

  const list = [...(catalog[category] ?? [])];
  const idx = list.findIndex((s) => s.id === toSave.id);
  let nextList: MaterialSystem[];

  if (idx >= 0) {
    const prev = list[idx]!;
    const merged: MaterialSystem = {
      ...prev,
      ...toSave,
      profile:
        category === "profiles"
          ? toSave.profile ?? prev.profile ?? defaultProfileDetails()
          : undefined,
      glass:
        category === "glass"
          ? toSave.glass ?? prev.glass ?? {
              glazing: "single",
              pane1: defaultGlassPane({ label: toSave.name }),
              georgian: false,
            }
          : undefined,
    };
    nextList = list.map((s, i) => (i === idx ? merged : s));
  } else {
    nextList = [...list, toSave];
  }

  if (toSave.isDefault) {
    nextList = nextList.map((s) =>
      s.id === toSave.id ? { ...s, isDefault: true } : { ...s, isDefault: false }
    );
  }

  return { ...catalog, [category]: nextList };
}

export function deleteSystem(
  catalog: MaterialCatalog,
  category: MaterialCategory,
  id: string
): MaterialCatalog {
  const nextList = (catalog[category] ?? []).filter((s) => s.id !== id);
  if (
    category === "iron" &&
    nextList.length > 0 &&
    !nextList.some((s) => s.isDefault)
  ) {
    nextList[0] = { ...nextList[0]!, isDefault: true };
  }
  return { ...catalog, [category]: nextList };
}

export function setDefaultSystem(
  catalog: MaterialCatalog,
  category: MaterialCategory,
  id: string
): MaterialCatalog {
  return {
    ...catalog,
    [category]: (catalog[category] ?? []).map((s) => ({
      ...s,
      isDefault: s.id === id,
    })),
  };
}

export function newSystemId(category: MaterialCategory): string {
  return `${category}-${Date.now().toString(36)}`;
}

export function newPieceId(): string {
  return `piece-${Date.now().toString(36)}`;
}

/** خيارات للـ RadioList في تفاصيل البند — مع خيار تجاهل */
export function catalogOptionsFor(
  category: MaterialCategory,
  catalog?: MaterialCatalog
): { id: string; label: string }[] {
  const systems = getSystemsForCategory(category, catalog);
  return [
    { id: "none", label: "تجاهل" },
    ...systems.map((s) => {
      let label = s.isDefault ? `${s.name} (افتراضي)` : s.name;
      if (category === "glass") {
        const price = getGlassBottlePrice(s);
        if (price > 0) label = `${label} — ${price} ج.م/م²`;
      }
      return { id: s.id, label };
    }),
  ];
}

/** مقاسات القطع بعد التخصيم من مقاس الفتحة */
export type CutSizes = {
  openingWidthMm: number;
  openingHeightMm: number;
  frameWidthMm: number;
  frameHeightMm: number;
  sashWidthMm: number;
  sashHeightMm: number;
  deductions: ProfileDeductions;
  errors: {
    frameWidth?: string;
    frameHeight?: string;
    sashWidth?: string;
    sashHeight?: string;
  };
};

function evalCut(
  formula: string,
  vars: Record<string, number>
): { value: number; error?: string } {
  const result = evaluateFormula(formula, vars);
  if (!result.ok) return { value: 0, error: result.error };
  return { value: Math.max(0, Math.round(result.value * 1000) / 1000) };
}

export function calcCutSizes(
  openingWidthMm: number,
  openingHeightMm: number,
  deductions: ProfileDeductions
): CutSizes {
  const base = {
    W: openingWidthMm,
    H: openingHeightMm,
    FW: openingWidthMm,
    FH: openingHeightMm,
  };

  const frameW = evalCut(deductions.frame.width, base);
  const frameH = evalCut(deductions.frame.height, base);

  const withFrame = {
    ...base,
    FW: frameW.value,
    FH: frameH.value,
  };

  const sashW = evalCut(deductions.sash.width, withFrame);
  const sashH = evalCut(deductions.sash.height, withFrame);

  return {
    openingWidthMm,
    openingHeightMm,
    frameWidthMm: frameW.value,
    frameHeightMm: frameH.value,
    sashWidthMm: sashW.value,
    sashHeightMm: sashH.value,
    deductions,
    errors: {
      frameWidth: frameW.error,
      frameHeight: frameH.error,
      sashWidth: sashW.error,
      sashHeight: sashH.error,
    },
  };
}

/** نصوص معادلات التخصيم للعرض */
export function frameWidthFormula(d: ProfileDeductions): string {
  return `عرض الحلق ${ensureEqualsPrefix(d.frame.width)}`;
}

export function frameHeightFormula(d: ProfileDeductions): string {
  return `ارتفاع الحلق ${ensureEqualsPrefix(d.frame.height)}`;
}

export function sashWidthFormula(d: ProfileDeductions): string {
  return `عرض الضلفة ${ensureEqualsPrefix(d.sash.width)}`;
}

export function sashHeightFormula(d: ProfileDeductions): string {
  return `ارتفاع الضلفة ${ensureEqualsPrefix(d.sash.height)}`;
}

export function formatBarLength(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return "—";
  return `${m.toFixed(m % 1 === 0 ? 0 : 1)} م`;
}

export function formatSectionMm(mm: number): string {
  if (!Number.isFinite(mm) || mm < 0) return "—";
  return `${mm} مم`;
}
