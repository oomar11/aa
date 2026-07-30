/** أنظمة الخامات: قطاعات · اكسسوار · زجاج · حديد */

import type { MeshKind } from "@/lib/design-items";
import {
  deductToFormula,
  describeFormulaAr,
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
  | "sash-sliding-protruding"
  | "sash-sliding-recessed"
  | "mullion"
  | "coupling"
  | "knife"
  | "four-leaf-meeting"
  | "mesh-meeting"
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
  { id: "sash-sliding-protruding", label: "ضلفة جرار بارز" },
  { id: "sash-sliding-recessed", label: "ضلفة جرار غاطس" },
  { id: "mullion", label: "سوقاس" },
  { id: "coupling", label: "كوبلن" },
  { id: "knife", label: "سكينة" },
  { id: "four-leaf-meeting", label: "تقابل ٤ ضلفة" },
  { id: "mesh-meeting", label: "تقابل سلك جرار" },
  { id: "bead", label: "بيادة زجاج" },
  { id: "threshold", label: "عتبة" },
  { id: "other", label: "أخرى" },
];

export function profileRoleLabel(role: ProfilePieceRole): string {
  return PROFILE_PIECE_ROLES.find((r) => r.id === role)?.label ?? role;
}

/** فئات أسعار القطاعات — تطابق حساب الخامات */
export type ProfilePriceCategory =
  | "frame-hinged"
  | "frame-sliding"
  | "sash-hinged"
  | "sash-door"
  | "sash-sliding"
  | "mullion"
  | "coupling"
  | "knife"
  | "bouclier"
  | "bead-single-hinged"
  | "bead-single-sliding"
  | "bead-double-hinged"
  | "bead-double-sliding"
  | "mesh-sliding-profile";

export const PROFILE_PRICE_CATEGORIES: {
  id: ProfilePriceCategory;
  label: string;
}[] = [
  { id: "frame-hinged", label: "حلق مفصلي" },
  { id: "frame-sliding", label: "حلق جرار" },
  { id: "sash-hinged", label: "ضلفة مفصلي" },
  { id: "sash-door", label: "ضلفة باب" },
  { id: "sash-sliding", label: "ضلفة جرار" },
  { id: "mullion", label: "سوقاس" },
  { id: "coupling", label: "كوبلن" },
  { id: "knife", label: "سكينة" },
  { id: "bouclier", label: "بوكلير" },
  { id: "bead-single-hinged", label: "باكتة سنجل مفصلي" },
  { id: "bead-single-sliding", label: "باكتة سنجل جرار" },
  { id: "bead-double-hinged", label: "باكتة دبل مفصلي" },
  { id: "bead-double-sliding", label: "باكتة دبل جرار" },
  { id: "mesh-sliding-profile", label: "ضلفة سلك جرار" },
];

export function profilePriceCategoryLabel(id: ProfilePriceCategory): string {
  return PROFILE_PRICE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

/** براند قطاعات (سيتي · بريمير · …) مع قائمة أسعار لكل نوع */
export type ProfileBrand = {
  id: string;
  name: string;
  notes?: string;
  /** سعر المتر الطولي (ج.م/م) لكل فئة قطاع */
  prices: Partial<Record<ProfilePriceCategory, number>>;
};

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
 * تخصيمات القطع (تخزين داخلي بصيغة معادلة).
 * الواجهة الافتراضية: رقم خصم بالمم → يتحول لـ =W-10 مثلاً.
 * الوضع المتقدم: معادلة حرة (W/H/FW/FH + MIN/MAX/IF…).
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

/** مقاس السبلونة بالسم */
export type EspagnoletteSize = number;

/** المقاسات القياسية الافتراضية */
export const DEFAULT_ESPAGNOLETTE_SIZE_VALUES = [
  40, 60, 80, 100, 140, 160, 180,
] as const;

/** @deprecated استخدم DEFAULT_ESPAGNOLETTE_SIZE_VALUES */
export const ESPAGNOLETTE_SIZES: number[] = [...DEFAULT_ESPAGNOLETTE_SIZE_VALUES];

/** صف في كتالوج مقاسات السبلونة — قابل للتعديل بالكامل */
export type EspagnoletteCatalogEntry = {
  id: string;
  /** مقاس السبلونة (سم) */
  size: number;
  /**
   * أقصى ارتفاع ضلفة من ناحية المقبض (مم) لهذا المقاس.
   * الاختيار: أصغر مقاس قاعدته ≥ الارتفاع، وإلا الأكبر المتاح.
   */
  maxHeightMm: number;
  /** متاح لسبلونة المفصلي */
  hinged: boolean;
  /** متاح لسبلونة الجرار */
  sliding: boolean;
};

/** @deprecated — للترحيل من الإصدارات القديمة فقط */
export type EspagnoletteSizeRule = {
  size: number;
  maxHeightMm: number;
};

/** قطعة سكاك داخل طقم السبلونة */
export type AccessoryLockPiece = {
  id: string;
  name: string;
  /** العدد لكل سبلونة / ضلفة */
  qtyPerLockset: number;
};

/** فئات براندات الاكسسوار */
export type AccessoryBrandCategory =
  | "hinge"
  | "hinged-espagnolette"
  | "hinged-lock"
  | "protruding-handle"
  | "bouclier-lock"
  | "bouclier-bolt"
  | "bouclier-bolt-lock"
  | "bouclier-cap"
  | "track"
  | "roller"
  | "brush"
  | "sliding-espagnolette"
  | "sliding-lock"
  | "recessed-handle";

export const ACCESSORY_BRAND_CATEGORIES: {
  id: AccessoryBrandCategory;
  label: string;
  group: "hinged" | "bouclier" | "sliding";
}[] = [
  { id: "hinge", label: "مفصلات", group: "hinged" },
  { id: "hinged-espagnolette", label: "سبلونة مفصلي", group: "hinged" },
  { id: "hinged-lock", label: "سكاك مفصلي", group: "hinged" },
  { id: "protruding-handle", label: "مقبض بارز", group: "hinged" },
  { id: "bouclier-lock", label: "سكاك بوكلير", group: "bouclier" },
  { id: "bouclier-bolt", label: "ترباس بوكلير", group: "bouclier" },
  { id: "bouclier-bolt-lock", label: "سكاك ترباس", group: "bouclier" },
  { id: "bouclier-cap", label: "طبة بوكلير", group: "bouclier" },
  { id: "track", label: "تراك جرار", group: "sliding" },
  { id: "roller", label: "عجل جرار", group: "sliding" },
  { id: "brush", label: "فرش جرار", group: "sliding" },
  { id: "sliding-espagnolette", label: "سبلونة جرار", group: "sliding" },
  { id: "sliding-lock", label: "سكاك جرار", group: "sliding" },
  { id: "recessed-handle", label: "مقبض غاطس", group: "sliding" },
];

export function accessoryBrandCategoryLabel(
  id: AccessoryBrandCategory
): string {
  return ACCESSORY_BRAND_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

/** براند اكسسوار داخل فئة محددة */
export type AccessoryBrand = {
  id: string;
  name: string;
  category: AccessoryBrandCategory;
  notes?: string;
};

/**
 * تفاصيل نظام الاكسسوار — قواعد الكميات للمفصلي والجرار.
 * تتعدّل من شاشة تفاصيل نظام الاكسسوار.
 */
export type AccessorySystemDetails = {
  /** البراند المختار لكل فئة (معرّف من كتالوج accessoryBrands) */
  categoryBrands: Partial<Record<AccessoryBrandCategory, string>>;
  // ── مفصلي ──────────────────────────────────────────
  /** مفصلات لكل ضلفة شباك مفصلي */
  hingesPerSash: number;
  /** مفصلات لكل ضلفة باب */
  hingesPerDoor: number;
  /** كتالوج مقاسات السبلونة — قابل للتعديل */
  espagnoletteCatalog: EspagnoletteCatalogEntry[];
  /**
   * تخصيم من ارتفاع الضلفة (مم) قبل اختيار مقاس السبلونة.
   * الافتراضي ١٥٠ مم = ١٥ سم.
   */
  espagnoletteSashDeductionMm: number;
  /** سكاك مفصلي — طقم لكل سبلونة ضلفة واحدة */
  hingedLockPieces: AccessoryLockPiece[];
  /** سكاك بوكلير — بدل المفصلي لما فيه بوكلير */
  bouclierLockPieces: AccessoryLockPiece[];
  /** ترباس لكل بوكلير */
  boltsPerBouclier: number;
  /** سكاك ترباس — لكل ترباس */
  bouclierBoltLockPieces: AccessoryLockPiece[];
  /** طقم طبة بوكلير لكل بوكلير */
  bouclierCapKitsPerBouclier: number;
  /** مقبض بارز لكل سبلونة */
  protrudingHandlesPerLockset: number;

  // ── جرار ───────────────────────────────────────────
  /** عدد قطع التراك على الحلق (٢ بعرض الحلق) */
  tracksPerFrame: number;
  /** عجل لكل ضلفة جرار */
  rollersPerSlidingSash: number;
  /** مضاعف محيط الضلفة للفرش (افتراضي ٢) */
  brushSashPerimeterMultiplier: number;
  /** مضاعف ارتفاع السكينة للفرش (افتراضي ١) */
  brushKnifeHeightMultiplier: number;
  /** سكاك جرار — مكان المفصلي */
  slidingLockPieces: AccessoryLockPiece[];
  /** مقبض غاطس لكل ضلفة جرار غاطسة */
  recessedHandlesPerRecessedSash: number;
};

/** دور عود الحديد داخل القطاع */
export type IronPieceRole =
  | "frame-hinged"
  | "frame-sliding"
  | "sash-hinged"
  | "sash-sliding"
  | "sash-door"
  | "mullion";

export const IRON_PIECE_ROLES: { id: IronPieceRole; label: string }[] = [
  { id: "frame-hinged", label: "حلق مفصلي" },
  { id: "frame-sliding", label: "حلق جرار" },
  { id: "sash-hinged", label: "ضلفة مفصلي" },
  { id: "sash-sliding", label: "ضلفة جرار" },
  { id: "sash-door", label: "ضلفة باب" },
  { id: "mullion", label: "سوقاس" },
];

export function ironRoleLabel(role: IronPieceRole): string {
  return IRON_PIECE_ROLES.find((r) => r.id === role)?.label ?? role;
}

/** عود حديد داخل نظام التسليح */
export type IronPiece = {
  id: string;
  name: string;
  role: IronPieceRole;
  /** عرض مقطع الحديد (مم) */
  sectionWidthMm: number;
  /** ارتفاع مقطع الحديد (مم) */
  sectionHeightMm: number;
  /** طول العود بالمتر (المخزون) */
  barLengthM: number;
  /** يُحسب له حديد في التصميم */
  enabled: boolean;
  notes?: string;
};

/**
 * معادلات تخصيم الحديد عن القطاع.
 * الحلق/الضلفة: FW · FH · SW · SH — السوقاس: L طول القطعة.
 */
export type IronDeductions = {
  frame: ProfileAxisFormulas;
  sash: ProfileAxisFormulas;
  /** صيغة طول سوقاس الحديد — المتغير L */
  mullion: string;
};

export type IronSystemDetails = {
  pieces: IronPiece[];
  deductions: IronDeductions;
};

export type MaterialSystem = {
  id: string;
  name: string;
  notes?: string;
  /** النظام الافتراضي (خصوصاً للحديد الثابت غالباً) */
  isDefault?: boolean;
  /** براند القطاعات المرتبط — قائمة أسعار الحلق والضلفة والباكتة … */
  profileBrandId?: string;
  /** تفاصيل نظام القطاعات: العيدان + التخصيمات */
  profile?: ProfileSystemDetails;
  /** تفاصيل نظام الزجاج: مفرد/دبل + جورجيا */
  glass?: GlassSystemDetails;
  /** تفاصيل نظام الاكسسوار: مفصلي · جرار · سبلونة · سكاك */
  accessory?: AccessorySystemDetails;
  /** تفاصيل نظام الحديد: عيدان + تخصيم عن الحلق والضلفة والسوقاس */
  iron?: IronSystemDetails;
};

/** أسعار التدبيل والجورجيا — عامة لكل الضلف */
export type GlassRates = {
  doublingCostPerSqm: number;
  georgianCostPerSqm: number;
};

/** تصنيف السلك (جرار / ثابت / …) */
export type MeshCategory = {
  id: string;
  label: string;
  /** يتحسب قطاع ضلفة زي الجرار */
  calcProfile: boolean;
  /** يُختار تلقائياً لنوع الفتح المناسب */
  defaultFor?: "sliding" | "hinged" | "fixed" | "tilt";
};

/** نوع سلك في كتالوج الخامات */
export type MeshType = {
  id: string;
  name: string;
  kind: MeshKind;
  pricePerSqm: number;
  notes?: string;
};

export type MaterialCatalog = Record<MaterialCategory, MaterialSystem[]> & {
  glassRates?: GlassRates;
  meshCategories?: MeshCategory[];
  meshTypes?: MeshType[];
  /** كتالوج براندات الاكسسوار حسب الفئة */
  accessoryBrands?: AccessoryBrand[];
  /** كتالوج براندات القطاعات مع قوائم الأسعار */
  profileBrands?: ProfileBrand[];
};

export const MATERIALS_STORAGE_KEY = "upvc-material-systems";

/** يُبث بعد حفظ تصنيفات/أنواع السلك — لمزامنة المحررات */
export const MESH_CATALOG_UPDATED = "upvc-mesh-catalog-updated";

export function notifyMeshCatalogUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MESH_CATALOG_UPDATED));
  }
}

/** يُبث بعد حفظ براندات الاكسسوار */
export const ACCESSORY_BRANDS_UPDATED = "upvc-accessory-brands-updated";

export function notifyAccessoryBrandsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ACCESSORY_BRANDS_UPDATED));
  }
}

/** يُبث بعد حفظ براندات القطاعات */
export const PROFILE_BRANDS_UPDATED = "upvc-profile-brands-updated";

export function notifyProfileBrandsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PROFILE_BRANDS_UPDATED));
  }
}

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
    description: "مفصلي · جرار · سبلونة · سكاك · تراك · فرش",
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
    description: "تسليح الحلق · الضلفة · السوقاس — مفصلي وجرار",
    accent: "#7A8799",
    shadow: "rgba(122,135,153,0.35)",
  },
];

export function getCategoryMeta(id: MaterialCategory) {
  return MATERIAL_CATEGORIES.find((c) => c.id === id)!;
}

/** بطاقات صفحة الخامات — السلك صفحة مستقلة مش جزء من الاكسسوار */
export type MaterialHubId = MaterialCategory | "mesh";

export const MATERIAL_HUB_ITEMS: {
  id: MaterialHubId;
  label: string;
  description: string;
  accent: string;
  shadow: string;
  href: string;
}[] = [
  ...MATERIAL_CATEGORIES.filter((c) => c.id !== "iron").map((c) => ({
    ...c,
    href: `/materials/${c.id}`,
  })),
  {
    id: "mesh",
    label: "سلك",
    description: "تصنيفات وأنواع السلك · الأسعار والحساب",
    accent: "#5B9A6F",
    shadow: "rgba(91,154,111,0.35)",
    href: "/materials/mesh",
  },
  ...MATERIAL_CATEGORIES.filter((c) => c.id === "iron").map((c) => ({
    ...c,
    href: `/materials/${c.id}`,
  })),
];

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

function newLockPieceId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function defaultEspagnoletteCatalog(): EspagnoletteCatalogEntry[] {
  return DEFAULT_ESPAGNOLETTE_SIZE_VALUES.map((size) => ({
    id: `esp-${size}`,
    size,
    maxHeightMm: size * 10,
    hinged: true,
    sliding: true,
  }));
}

/** @deprecated */
export function defaultEspagnoletteSizeRules(): EspagnoletteSizeRule[] {
  return defaultEspagnoletteCatalog().map((e) => ({
    size: e.size,
    maxHeightMm: e.maxHeightMm,
  }));
}

export function defaultHingedLockPieces(): AccessoryLockPiece[] {
  return [
    { id: "hl-keeper-main", name: "سكة رئيسية", qtyPerLockset: 1 },
    { id: "hl-keeper-mid", name: "سكة وسط", qtyPerLockset: 2 },
  ];
}

export function defaultBouclierLockPieces(): AccessoryLockPiece[] {
  return [
    { id: "bl-keeper", name: "سكة بوكلير", qtyPerLockset: 1 },
    { id: "bl-strike", name: "لقمة بوكلير", qtyPerLockset: 1 },
  ];
}

export function defaultBouclierBoltLockPieces(): AccessoryLockPiece[] {
  return [{ id: "bb-keeper", name: "سكة ترباس", qtyPerLockset: 1 }];
}

export function defaultSlidingLockPieces(): AccessoryLockPiece[] {
  return [
    { id: "sl-keeper-main", name: "سكة جرار", qtyPerLockset: 1 },
    { id: "sl-keeper-mid", name: "سكة وسط جرار", qtyPerLockset: 1 },
  ];
}

export function defaultAccessoryDetails(): AccessorySystemDetails {
  return {
    categoryBrands: {},
    hingesPerSash: 2,
    hingesPerDoor: 3,
    espagnoletteCatalog: defaultEspagnoletteCatalog(),
    espagnoletteSashDeductionMm: 150,
    hingedLockPieces: defaultHingedLockPieces(),
    bouclierLockPieces: defaultBouclierLockPieces(),
    boltsPerBouclier: 2,
    bouclierBoltLockPieces: defaultBouclierBoltLockPieces(),
    bouclierCapKitsPerBouclier: 1,
    protrudingHandlesPerLockset: 1,
    tracksPerFrame: 2,
    rollersPerSlidingSash: 2,
    brushSashPerimeterMultiplier: 2,
    brushKnifeHeightMultiplier: 1,
    slidingLockPieces: defaultSlidingLockPieces(),
    recessedHandlesPerRecessedSash: 1,
  };
}

export function getDefaultAccessoryDetails(): AccessorySystemDetails {
  return defaultAccessoryDetails();
}

export function defaultIronDeductions(): IronDeductions {
  return {
    frame: { width: "=FW-100", height: "=FH-100" },
    sash: { width: "=SW-100", height: "=SH-100" },
    mullion: "=L-100",
  };
}

export function defaultIronPieces(): IronPiece[] {
  return [
    {
      id: "iron-frame-h",
      name: "حديد حلق مفصلي",
      role: "frame-hinged",
      sectionWidthMm: 40,
      sectionHeightMm: 20,
      barLengthM: DEFAULT_BAR_LENGTH_M,
      enabled: true,
    },
    {
      id: "iron-frame-s",
      name: "حديد حلق جرار",
      role: "frame-sliding",
      sectionWidthMm: 40,
      sectionHeightMm: 20,
      barLengthM: DEFAULT_BAR_LENGTH_M,
      enabled: true,
    },
    {
      id: "iron-sash-h",
      name: "حديد ضلفة مفصلي",
      role: "sash-hinged",
      sectionWidthMm: 35,
      sectionHeightMm: 20,
      barLengthM: DEFAULT_BAR_LENGTH_M,
      enabled: true,
    },
    {
      id: "iron-sash-s",
      name: "حديد ضلفة جرار",
      role: "sash-sliding",
      sectionWidthMm: 35,
      sectionHeightMm: 20,
      barLengthM: DEFAULT_BAR_LENGTH_M,
      enabled: true,
    },
    {
      id: "iron-sash-door",
      name: "حديد ضلفة باب",
      role: "sash-door",
      sectionWidthMm: 45,
      sectionHeightMm: 25,
      barLengthM: DEFAULT_BAR_LENGTH_M,
      enabled: true,
    },
    {
      id: "iron-mullion",
      name: "حديد سوقاس",
      role: "mullion",
      sectionWidthMm: 30,
      sectionHeightMm: 15,
      barLengthM: DEFAULT_BAR_LENGTH_M,
      enabled: true,
    },
  ];
}

export function defaultIronDetails(): IronSystemDetails {
  return {
    pieces: defaultIronPieces(),
    deductions: defaultIronDeductions(),
  };
}

export function newIronPieceId(): string {
  return `iron-piece-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

export function ironPieceForRole(
  details: IronSystemDetails,
  role: IronPieceRole
): IronPiece | undefined {
  return details.pieces.find((p) => p.role === role && p.enabled);
}

export function ironDeductionSummary(d: IronDeductions): string {
  return `حلق ${ensureEqualsPrefix(d.frame.width)} · ضلفة ${ensureEqualsPrefix(d.sash.width)} · سوقاس ${ensureEqualsPrefix(d.mullion)}`;
}

/**
 * يختار مقاس السبلونة حسب ارتفاع ناحية المقبض (مم).
 * أصغر مقاس قاعدته ≥ الارتفاع، وإلا أكبر مقاس متاح.
 */
export function pickEspagnoletteSize(
  handleSideHeightMm: number,
  catalog: EspagnoletteCatalogEntry[],
  kind: "hinged" | "sliding"
): number {
  const allowed = catalog
    .filter((e) => (kind === "hinged" ? e.hinged : e.sliding))
    .sort((a, b) => a.maxHeightMm - b.maxHeightMm);

  if (allowed.length === 0) {
    const fallback = [...catalog].sort((a, b) => a.size - b.size);
    return fallback[fallback.length - 1]?.size ?? 100;
  }

  const h = Math.max(0, handleSideHeightMm);
  for (const entry of allowed) {
    if (h <= entry.maxHeightMm) return entry.size;
  }
  return allowed[allowed.length - 1]!.size;
}

export function espagnoletteCatalogSummary(
  catalog: EspagnoletteCatalogEntry[],
  kind?: "hinged" | "sliding"
): string {
  const sizes = catalog
    .filter((e) => !kind || (kind === "hinged" ? e.hinged : e.sliding))
    .map((e) => e.size)
    .sort((a, b) => a - b);
  if (sizes.length === 0) return "—";
  return sizes.join(" · ");
}

export function newEspagnoletteCatalogId(): string {
  return `esp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

export function newAccessoryLockPieceId(
  kind: "hinged" | "bouclier" | "bouclier-bolt" | "sliding"
): string {
  const prefix =
    kind === "hinged"
      ? "hl"
      : kind === "bouclier"
        ? "bl"
        : kind === "bouclier-bolt"
          ? "bb"
          : "sl";
  return newLockPieceId(prefix);
}

export function newAccessoryBrandId(): string {
  return `abrand-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

const ACCESSORY_BRAND_CATEGORY_IDS = new Set(
  ACCESSORY_BRAND_CATEGORIES.map((c) => c.id)
);

export function isAccessoryBrandCategory(
  raw: unknown
): raw is AccessoryBrandCategory {
  return (
    typeof raw === "string" &&
    ACCESSORY_BRAND_CATEGORY_IDS.has(raw as AccessoryBrandCategory)
  );
}

export function defaultAccessoryBrands(): AccessoryBrand[] {
  return [];
}

export function findAccessoryBrand(
  id: string | undefined | null,
  catalog?: MaterialCatalog
): AccessoryBrand | undefined {
  if (!id) return undefined;
  const cat = catalog ?? (typeof window !== "undefined" ? loadMaterialCatalog() : getDefaultCatalog());
  return (cat.accessoryBrands ?? []).find((b) => b.id === id);
}

export function brandsForCategory(
  category: AccessoryBrandCategory,
  catalog?: MaterialCatalog
): AccessoryBrand[] {
  const cat = catalog ?? (typeof window !== "undefined" ? loadMaterialCatalog() : getDefaultCatalog());
  return (cat.accessoryBrands ?? [])
    .filter((b) => b.category === category)
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

export function resolveCategoryBrandName(
  category: AccessoryBrandCategory,
  brandId: string | undefined,
  catalog?: MaterialCatalog
): string | null {
  if (!brandId) return null;
  const brand = findAccessoryBrand(brandId, catalog);
  if (!brand || brand.category !== category) return null;
  return brand.name;
}

const PROFILE_PRICE_CATEGORY_IDS = new Set(
  PROFILE_PRICE_CATEGORIES.map((c) => c.id)
);

export function isProfilePriceCategory(
  raw: unknown
): raw is ProfilePriceCategory {
  return (
    typeof raw === "string" &&
    PROFILE_PRICE_CATEGORY_IDS.has(raw as ProfilePriceCategory)
  );
}

export function newProfileBrandId(): string {
  return `pbrand-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

export function defaultProfileBrandPrices(): Partial<
  Record<ProfilePriceCategory, number>
> {
  return {
    "frame-hinged": 42,
    "frame-sliding": 48,
    "sash-hinged": 52,
    "sash-door": 58,
    "sash-sliding": 38,
    mullion: 50,
    coupling: 45,
    knife: 28,
    bouclier: 35,
    "bead-single-hinged": 12,
    "bead-single-sliding": 12,
    "bead-double-hinged": 18,
    "bead-double-sliding": 18,
    "mesh-sliding-profile": 38,
  };
}

export function defaultProfileBrands(): ProfileBrand[] {
  return [
    {
      id: "brand-city",
      name: "سيتي",
      notes:
        "قائمة أسعار السيتي — للحلق والضلفة والباكتة والسوقاس (مثلاً سيستم بريمير سيتي)",
      prices: defaultProfileBrandPrices(),
    },
    {
      id: "brand-premier",
      name: "بريمير",
      notes: "قائمة أسعار بريمير — لأي سيستم مربوط ببراند بريمير",
      prices: {
        "frame-hinged": 55,
        "frame-sliding": 62,
        "sash-hinged": 68,
        "sash-door": 75,
        "sash-sliding": 48,
        mullion: 65,
        coupling: 58,
        knife: 35,
        bouclier: 42,
        "bead-single-hinged": 15,
        "bead-single-sliding": 15,
        "bead-double-hinged": 22,
        "bead-double-sliding": 22,
        "mesh-sliding-profile": 48,
      },
    },
  ];
}

export function normalizeProfileBrandPrices(
  raw: unknown
): Partial<Record<ProfilePriceCategory, number>> {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: Partial<Record<ProfilePriceCategory, number>> = {};
  for (const cat of PROFILE_PRICE_CATEGORIES) {
    const n = Number(o[cat.id]);
    if (Number.isFinite(n) && n >= 0) out[cat.id] = n;
  }
  return out;
}

export function normalizeProfileBrands(raw: unknown): ProfileBrand[] {
  if (!Array.isArray(raw)) return defaultProfileBrands();
  const out: ProfileBrand[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    const name = typeof o.name === "string" ? o.name.trim() : "";
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name,
      notes: typeof o.notes === "string" ? o.notes.trim() || undefined : undefined,
      prices: normalizeProfileBrandPrices(o.prices),
    });
  }

  return out.length > 0 ? out : defaultProfileBrands();
}

export function findProfileBrand(
  id: string | undefined | null,
  catalog?: MaterialCatalog
): ProfileBrand | undefined {
  if (!id) return undefined;
  const cat =
    catalog ??
    (typeof window !== "undefined" ? loadMaterialCatalog() : getDefaultCatalog());
  return (cat.profileBrands ?? defaultProfileBrands()).find((b) => b.id === id);
}

export function profileBrandOptions(
  catalog?: MaterialCatalog
): { id: string; label: string }[] {
  const cat =
    catalog ??
    (typeof window !== "undefined" ? loadMaterialCatalog() : getDefaultCatalog());
  return (cat.profileBrands ?? defaultProfileBrands())
    .map((b) => ({ id: b.id, label: b.name }))
    .sort((a, b) => a.label.localeCompare(b.label, "ar"));
}

export function resolveProfileBrandForSystem(
  system: MaterialSystem | undefined | null,
  catalog?: MaterialCatalog
): ProfileBrand | undefined {
  if (!system?.profileBrandId) return undefined;
  return findProfileBrand(system.profileBrandId, catalog);
}

export function profileBrandHasPricing(brand: ProfileBrand | undefined): boolean {
  if (!brand) return false;
  return Object.values(brand.prices).some((p) => (p ?? 0) > 0);
}

export function getProfileBrandPrice(
  brand: ProfileBrand | undefined,
  category: ProfilePriceCategory
): number {
  return brand?.prices[category] ?? 0;
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

export function defaultMeshCategories(): MeshCategory[] {
  return [
    {
      id: "sliding",
      label: "سلك جرار",
      calcProfile: true,
      defaultFor: "sliding",
    },
    {
      id: "tilt",
      label: "سلك قلاب",
      calcProfile: false,
      defaultFor: "tilt",
    },
    {
      id: "fixed",
      label: "سلك ثابت",
      calcProfile: false,
      defaultFor: "fixed",
    },
    {
      id: "roll",
      label: "سلك رول",
      calcProfile: false,
    },
    {
      id: "hinged",
      label: "سلك مفصلي",
      calcProfile: false,
      defaultFor: "hinged",
    },
  ];
}

export function getMeshCategories(catalog?: MaterialCatalog): MeshCategory[] {
  const cat =
    catalog ??
    (typeof window !== "undefined" ? loadMaterialCatalog() : getDefaultCatalog());
  return cat.meshCategories ?? defaultMeshCategories();
}

export function findMeshCategory(
  id: string | undefined | null,
  catalog?: MaterialCatalog
): MeshCategory | undefined {
  if (!id) return undefined;
  return getMeshCategories(catalog).find((c) => c.id === id);
}

export function meshCategoryOptions(
  catalog?: MaterialCatalog
): { id: string; label: string; calcProfile: boolean }[] {
  return getMeshCategories(catalog).map((c) => ({
    id: c.id,
    label: c.label,
    calcProfile: c.calcProfile,
  }));
}

export function meshKindLabel(
  kind: MeshKind,
  catalog?: MaterialCatalog
): string {
  return findMeshCategory(kind, catalog)?.label ?? kind;
}

export function meshCategoryCalcProfile(
  kind: MeshKind,
  catalog?: MaterialCatalog
): boolean {
  const cat = findMeshCategory(kind, catalog);
  if (cat) return cat.calcProfile;
  return kind === "sliding";
}

export function defaultMeshTypes(): MeshType[] {
  return [
    {
      id: "mesh-sliding-fiber",
      name: "سلك جرار فايبر",
      kind: "sliding",
      pricePerSqm: 45,
    },
    {
      id: "mesh-sliding-alum",
      name: "سلك جرار ألومنيوم",
      kind: "sliding",
      pricePerSqm: 55,
    },
    {
      id: "mesh-tilt-fiber",
      name: "سلك قلاب فايبر",
      kind: "tilt",
      pricePerSqm: 42,
    },
    {
      id: "mesh-tilt-micro",
      name: "سلك قلاب مايكرو",
      kind: "tilt",
      pricePerSqm: 50,
    },
    {
      id: "mesh-fixed-fiber",
      name: "سلك ثابت فايبر",
      kind: "fixed",
      pricePerSqm: 35,
    },
    {
      id: "mesh-fixed-pet",
      name: "سلك ثابت PET",
      kind: "fixed",
      pricePerSqm: 30,
    },
    {
      id: "mesh-roll-std",
      name: "سلك رول قياسي",
      kind: "roll",
      pricePerSqm: 40,
    },
    {
      id: "mesh-hinged-fiber",
      name: "سلك مفصلي فايبر",
      kind: "hinged",
      pricePerSqm: 38,
    },
    {
      id: "mesh-hinged-alum",
      name: "سلك مفصلي ألومنيوم",
      kind: "hinged",
      pricePerSqm: 48,
    },
  ];
}

export function getMeshTypes(catalog?: MaterialCatalog): MeshType[] {
  const cat = catalog ?? (typeof window !== "undefined" ? loadMaterialCatalog() : getDefaultCatalog());
  return cat.meshTypes ?? defaultMeshTypes();
}

export function findMeshType(
  id: string | undefined | null,
  catalog?: MaterialCatalog
): MeshType | undefined {
  if (!id) return undefined;
  const aliases: Record<string, string> = {
    "mesh-sliding": "mesh-sliding-fiber",
    "mesh-fixed": "mesh-fixed-fiber",
    "mesh-roll": "mesh-roll-std",
    "mesh-hinged": "mesh-hinged-fiber",
  };
  const resolved = aliases[id] ?? id;
  return getMeshTypes(catalog).find((m) => m.id === resolved);
}

export function meshTypeOptions(
  catalog?: MaterialCatalog
): { id: string; label: string; kind: MeshType["kind"]; pricePerSqm: number }[] {
  return getMeshTypes(catalog).map((m) => ({
    id: m.id,
    label: m.name,
    kind: m.kind,
    pricePerSqm: m.pricePerSqm,
  }));
}

export function meshTypesForCategory(
  kind: MeshKind,
  catalog?: MaterialCatalog
): MeshType[] {
  return getMeshTypes(catalog).filter((t) => t.kind === kind);
}

export function meshTypeHasPricing(
  meshTypeId: string | undefined,
  catalog?: MaterialCatalog
): boolean {
  const t = findMeshType(meshTypeId, catalog);
  return Boolean(t && t.pricePerSqm > 0);
}

export function defaultMeshTypeForKind(
  kind: MeshType["kind"],
  catalog?: MaterialCatalog
): MeshType | undefined {
  const types = getMeshTypes(catalog);
  return types.find((t) => t.kind === kind) ?? types[0];
}

/** زجاجة واحدة في كتالوج الخامات */
export function defaultGlassBottle(opts: {
  id: string;
  name: string;
  kind: GlassPaneKind;
  thicknessMm: number;
  pricePerSqm: number;
  notes?: string;
  isDefault?: boolean;
}): MaterialSystem {
  return {
    id: opts.id,
    name: opts.name,
    notes: opts.notes,
    isDefault: opts.isDefault,
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

export function getDefaultGlassBottleId(catalog?: MaterialCatalog): string {
  const id = getDefaultSystemId("glass", catalog);
  return resolveGlassBottleId(id) ?? id;
}

/** معرفات زجاج قديمة → المعرف الجديد */
const GLASS_BOTTLE_ID_ALIASES: Record<string, string> = {
  "bottle-clear-4": "bottle-clear",
  "bottle-satin-4": "bottle-satin",
  "bottle-reflective-4": "bottle-reflective-blue",
  "bottle-tempered-6": "bottle-clear",
};

export function resolveGlassBottleId(
  id: string | undefined | null
): string | undefined {
  if (!id) return undefined;
  return GLASS_BOTTLE_ID_ALIASES[id] ?? id;
}

/** أنظمة الزجاج الجاهزة القديمة (اسطمبات) — تُزال عند الترحيل */
const LEGACY_GLASS_STAMP_IDS = new Set([
  "g464",
  "g464-geo",
  "g-tempered",
  "g46464",
]);

function isLegacyGlassStamp(sys: MaterialSystem): boolean {
  if (LEGACY_GLASS_STAMP_IDS.has(sys.id)) return true;
  const g = sys.glass;
  if (!g) return false;
  if (g.glazing === "double" && !sys.id.startsWith("bottle-")) {
    return !sys.id.startsWith("glass-");
  }
  if (/زجاج دبل|4-6-4|سيكوريت مفرد/.test(sys.name)) return true;
  return false;
}

function glassSystemAsBottle(sys: MaterialSystem): GlassSystemDetails {
  const g = sys.glass;
  const pane1 = g?.pane1 ?? defaultGlassPane({ label: sys.name });
  const price = g?.pane1PricePerSqm;
  return {
    glazing: "single",
    pane1: { ...pane1, label: sys.name },
    georgian: false,
    pane1PricePerSqm: price,
  };
}

/** ترحيل كتالوج الزجاج: إزالة الاسطمبات القديمة وتوحيد الزجاجات */
function migrateGlassSystems(systems: MaterialSystem[]): MaterialSystem[] {
  const defaults = getDefaultCatalog().glass;
  const byId = new Map<string, MaterialSystem>();

  function upsert(id: string, sys: MaterialSystem) {
    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, sys);
      return;
    }
    const prevPrice = getGlassBottlePrice(prev);
    const nextPrice = getGlassBottlePrice(sys);
    if (nextPrice > 0 && prevPrice <= 0) byId.set(id, sys);
  }

  for (const sys of systems) {
    if (isLegacyGlassStamp(sys)) continue;

    const targetId = resolveGlassBottleId(sys.id) ?? sys.id;
    const def = defaults.find((d) => d.id === targetId);

    upsert(targetId, {
      id: targetId,
      name: def?.name ?? sys.name,
      notes: sys.notes,
      isDefault: Boolean(sys.isDefault || def?.isDefault),
      glass: glassSystemAsBottle({ ...sys, name: def?.name ?? sys.name }),
    });
  }

  for (const def of defaults) {
    if (!byId.has(def.id)) byId.set(def.id, def);
  }

  let list = Array.from(byId.values());
  let foundDefault = false;
  list = list.map((s) => {
    if (s.isDefault && !foundDefault) {
      foundDefault = true;
      return s;
    }
    return { ...s, isDefault: false };
  });
  if (!foundDefault) {
    list = list.map((s) => ({
      ...s,
      isDefault: s.id === "bottle-clear",
    }));
  }

  return list;
}

function normalizeGlassBottleDetails(
  raw: unknown,
  systemName: string
): GlassSystemDetails {
  const fallback: GlassSystemDetails = {
    glazing: "single",
    pane1: defaultGlassPane({ label: systemName }),
    georgian: false,
  };
  if (!raw || typeof raw !== "object") return fallback;
  const g = raw as Record<string, unknown>;
  const pane1 = normalizeGlassPane(g.pane1, fallback.pane1);
  const n = Number(g.pane1PricePerSqm);
  const pane1Price =
    Number.isFinite(n) && n >= 0 ? n : undefined;
  return {
    glazing: "single",
    pane1: { ...pane1, label: systemName || pane1.label },
    georgian: false,
    pane1PricePerSqm: pane1Price,
  };
}

export function getGlassBottlePrice(system: MaterialSystem | undefined): number {
  return system?.glass?.pane1PricePerSqm ?? 0;
}

export function findGlassBottle(
  id: string | undefined | null,
  catalog?: MaterialCatalog
): MaterialSystem | undefined {
  const resolved = resolveGlassBottleId(id);
  if (!resolved) return undefined;
  return getSystemsForCategory("glass", catalog).find((s) => s.id === resolved);
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
        name: "بريمير سيتي",
        notes:
          "سيستم بريمير سيتي — بياخد قائمة أسعار السيتي للحلق والضلفة والباكتة والسوقاس",
        isDefault: true,
        profileBrandId: "brand-city",
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
        name: "بريمير سلايد",
        notes: "سيستم جرار — قائمة أسعار السيتي",
        profileBrandId: "brand-city",
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
              id: "pvc2-ss-p",
              name: "ضلفة جرار بارز",
              role: "sash-sliding-protruding",
              sectionWidthMm: 45,
              barLengthM: DEFAULT_BAR_LENGTH_M,
            },
            {
              id: "pvc2-ss-r",
              name: "ضلفة جرار غاطس",
              role: "sash-sliding-recessed",
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
              id: "pvc2-m4",
              name: "تقابل ٤ ضلفة",
              role: "four-leaf-meeting",
              sectionWidthMm: 70,
              barLengthM: DEFAULT_BAR_LENGTH_M,
            },
            {
              id: "pvc2-mm",
              name: "تقابل سلك جرار",
              role: "mesh-meeting",
              sectionWidthMm: 70,
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
      {
        id: "acc-std",
        name: "اكسسوار قياسي",
        isDefault: true,
        accessory: defaultAccessoryDetails(),
      },
      {
        id: "acc-premium",
        name: "اكسسوار فاخر",
        accessory: defaultAccessoryDetails(),
      },
      {
        id: "acc-economy",
        name: "اكسسوار اقتصادي",
        accessory: defaultAccessoryDetails(),
      },
    ],
    glass: [
      defaultGlassBottle({
        id: "bottle-clear",
        name: "شفاف",
        kind: "clear",
        thicknessMm: 4,
        pricePerSqm: 80,
        isDefault: true,
      }),
      defaultGlassBottle({
        id: "bottle-satin",
        name: "مصنفر",
        kind: "satin",
        thicknessMm: 4,
        pricePerSqm: 120,
      }),
      defaultGlassBottle({
        id: "bottle-reflective-blue",
        name: "عاكس ازرق",
        kind: "reflective",
        thicknessMm: 4,
        pricePerSqm: 110,
      }),
      defaultGlassBottle({
        id: "bottle-reflective-green",
        name: "عاكس اخضر",
        kind: "reflective",
        thicknessMm: 4,
        pricePerSqm: 110,
      }),
      defaultGlassBottle({
        id: "bottle-reflective-brown",
        name: "عاكس بني",
        kind: "reflective",
        thicknessMm: 4,
        pricePerSqm: 110,
      }),
      defaultGlassBottle({
        id: "bottle-reflective-white",
        name: "عاكس ابيض",
        kind: "reflective",
        thicknessMm: 4,
        pricePerSqm: 115,
      }),
      defaultGlassBottle({
        id: "bottle-reflective-black",
        name: "عاكس اسود",
        kind: "reflective",
        thicknessMm: 4,
        pricePerSqm: 115,
      }),
      defaultGlassBottle({
        id: "bottle-nashiji",
        name: "نشيجي",
        kind: "other",
        thicknessMm: 4,
        pricePerSqm: 130,
      }),
    ],
    iron: [
      {
        id: "iron-std",
        name: "حديد تسليح قياسي",
        notes: "الحديد أصغر ١٠ سم من الحلق والضلفة والسوقاس",
        isDefault: true,
        iron: defaultIronDetails(),
      },
      {
        id: "iron-heavy",
        name: "حديد تسليح ثقيل",
        iron: {
          ...defaultIronDetails(),
          pieces: defaultIronPieces().map((p) => ({
            ...p,
            sectionWidthMm: p.sectionWidthMm + 5,
            sectionHeightMm: p.sectionHeightMm + 5,
          })),
        },
      },
    ],
    glassRates: defaultGlassRates(),
    meshCategories: defaultMeshCategories(),
    meshTypes: defaultMeshTypes(),
    accessoryBrands: defaultAccessoryBrands(),
    profileBrands: defaultProfileBrands(),
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

function normalizeIronRole(raw: unknown): IronPieceRole {
  const ok = IRON_PIECE_ROLES.some((r) => r.id === raw);
  return ok ? (raw as IronPieceRole) : "frame-hinged";
}

function normalizeIronPiece(raw: unknown): IronPiece | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.id !== "string" || typeof p.name !== "string") return null;
  if (!p.id.trim() || !p.name.trim()) return null;
  const sectionWidthMm = Number(p.sectionWidthMm);
  const sectionHeightMm = Number(p.sectionHeightMm);
  const barLengthM = Number(p.barLengthM);
  return {
    id: p.id.trim(),
    name: p.name.trim(),
    role: normalizeIronRole(p.role),
    sectionWidthMm:
      Number.isFinite(sectionWidthMm) && sectionWidthMm >= 0
        ? sectionWidthMm
        : 40,
    sectionHeightMm:
      Number.isFinite(sectionHeightMm) && sectionHeightMm >= 0
        ? sectionHeightMm
        : 20,
    barLengthM:
      Number.isFinite(barLengthM) && barLengthM > 0
        ? barLengthM
        : DEFAULT_BAR_LENGTH_M,
    enabled: p.enabled !== false,
    notes: typeof p.notes === "string" ? p.notes : undefined,
  };
}

function normalizeIronDeductions(raw: unknown): IronDeductions {
  const fallback = defaultIronDeductions();
  if (!raw || typeof raw !== "object") return fallback;
  const d = raw as Record<string, unknown>;
  const frame = normalizeAxisFormulas(d.frame, fallback.frame, "frame");
  const sash = normalizeAxisFormulas(d.sash, fallback.sash, "sash");
  let mullion = fallback.mullion;
  if (typeof d.mullion === "string" && d.mullion.trim()) {
    const formula = ensureEqualsPrefix(d.mullion);
    const check = validateFormula(formula);
    if (check.ok) mullion = formula;
  }
  return { frame, sash, mullion };
}

function normalizeIronDetails(raw: unknown): IronSystemDetails {
  const fallback = defaultIronDetails();
  if (!raw || typeof raw !== "object") return fallback;
  const d = raw as Record<string, unknown>;
  const pieces: IronPiece[] = [];
  const seen = new Set<string>();
  if (Array.isArray(d.pieces)) {
    for (const item of d.pieces) {
      const piece = normalizeIronPiece(item);
      if (!piece || seen.has(piece.id)) continue;
      seen.add(piece.id);
      pieces.push(piece);
    }
  }
  return {
    pieces: pieces.length > 0 ? pieces : fallback.pieces,
    deductions: normalizeIronDeductions(d.deductions),
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

function normalizeSizeNumber(raw: unknown): number | null {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || n <= 0 || n > 999) return null;
  return n;
}

function normalizeEspagnoletteCatalog(
  raw: unknown,
  legacy?: Record<string, unknown>
): EspagnoletteCatalogEntry[] {
  if (Array.isArray(raw) && raw.length > 0) {
    const out: EspagnoletteCatalogEntry[] = [];
    const seenIds = new Set<string>();
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const id =
        typeof o.id === "string" && o.id.trim()
          ? o.id.trim()
          : newEspagnoletteCatalogId();
      if (seenIds.has(id)) continue;
      const size = normalizeSizeNumber(o.size);
      if (!size) continue;
      const maxH = Number(o.maxHeightMm);
      seenIds.add(id);
      out.push({
        id,
        size,
        maxHeightMm:
          Number.isFinite(maxH) && maxH > 0 ? Math.round(maxH) : size * 10,
        hinged: o.hinged === undefined ? true : Boolean(o.hinged),
        sliding: o.sliding === undefined ? true : Boolean(o.sliding),
      });
    }
    if (out.length > 0) {
      return out.sort((a, b) => a.size - b.size);
    }
  }

  if (legacy) {
    return migrateLegacyEspagnoletteCatalog(legacy);
  }

  return defaultEspagnoletteCatalog();
}

function migrateLegacyEspagnoletteCatalog(
  o: Record<string, unknown>
): EspagnoletteCatalogEntry[] {
  const fallback = defaultEspagnoletteCatalog();
  const rulesRaw = Array.isArray(o.espagnoletteSizeRules)
    ? o.espagnoletteSizeRules
    : null;

  const hingedRaw = Array.isArray(o.hingedEspagnoletteSizes)
    ? o.hingedEspagnoletteSizes
    : [];
  const slidingRaw = Array.isArray(o.slidingEspagnoletteSizes)
    ? o.slidingEspagnoletteSizes
    : [];

  const hingedSet = new Set<number>();
  for (const item of hingedRaw) {
    const n = normalizeSizeNumber(item);
    if (n) hingedSet.add(n);
  }
  const slidingSet = new Set<number>();
  for (const item of slidingRaw) {
    const n = normalizeSizeNumber(item);
    if (n) slidingSet.add(n);
  }

  const bySize = new Map<number, { maxHeightMm: number }>();

  if (rulesRaw) {
    for (const item of rulesRaw) {
      if (!item || typeof item !== "object") continue;
      const r = item as Record<string, unknown>;
      const size = normalizeSizeNumber(r.size);
      if (!size) continue;
      const maxH = Number(r.maxHeightMm);
      bySize.set(size, {
        maxHeightMm:
          Number.isFinite(maxH) && maxH > 0 ? Math.round(maxH) : size * 10,
      });
    }
  }

  const allSizes = new Set<number>([
    ...bySize.keys(),
    ...hingedSet,
    ...slidingSet,
    ...fallback.map((e) => e.size),
  ]);

  if (allSizes.size === 0) return fallback;

  return [...allSizes]
    .sort((a, b) => a - b)
    .map((size) => ({
      id: `esp-${size}`,
      size,
      maxHeightMm: bySize.get(size)?.maxHeightMm ?? size * 10,
      hinged: hingedSet.size === 0 || hingedSet.has(size),
      sliding: slidingSet.size === 0 || slidingSet.has(size),
    }));
}

function normalizeLockPieces(
  raw: unknown,
  fallback: AccessoryLockPiece[]
): AccessoryLockPiece[] {
  if (!Array.isArray(raw)) return fallback.map((p) => ({ ...p }));
  const out: AccessoryLockPiece[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    const name = typeof o.name === "string" ? o.name.trim() : "";
    if (!id || !name || seen.has(id)) continue;
    const qty = Number(o.qtyPerLockset);
    seen.add(id);
    out.push({
      id,
      name,
      qtyPerLockset:
        Number.isFinite(qty) && qty >= 0 ? Math.round(qty) : 1,
    });
  }
  return out.length > 0 ? out : fallback.map((p) => ({ ...p }));
}

function normalizePositiveInt(raw: unknown, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n);
}

function normalizeMultiplier(raw: unknown, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function normalizeCategoryBrands(
  raw: unknown,
  brands: AccessoryBrand[]
): Partial<Record<AccessoryBrandCategory, string>> {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const byId = new Map(brands.map((b) => [b.id, b]));
  const out: Partial<Record<AccessoryBrandCategory, string>> = {};

  for (const cat of ACCESSORY_BRAND_CATEGORIES) {
    const idRaw = o[cat.id];
    if (typeof idRaw !== "string" || !idRaw.trim()) continue;
    const brand = byId.get(idRaw.trim());
    if (!brand || brand.category !== cat.id) continue;
    out[cat.id] = brand.id;
  }

  return out;
}

export function normalizeAccessoryBrands(raw: unknown): AccessoryBrand[] {
  if (!Array.isArray(raw)) return defaultAccessoryBrands();
  const out: AccessoryBrand[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    const name = typeof o.name === "string" ? o.name.trim() : "";
    const category = isAccessoryBrandCategory(o.category) ? o.category : null;
    if (!id || !name || !category || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name,
      category,
      notes: typeof o.notes === "string" ? o.notes.trim() || undefined : undefined,
    });
  }

  return out;
}

export function normalizeAccessoryDetails(
  raw: unknown,
  brands: AccessoryBrand[] = defaultAccessoryBrands()
): AccessorySystemDetails {
  const fallback = defaultAccessoryDetails();
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;

  const espagnoletteCatalog = normalizeEspagnoletteCatalog(
    o.espagnoletteCatalog,
    o
  );

  return {
    categoryBrands: normalizeCategoryBrands(o.categoryBrands, brands),
    hingesPerSash: normalizePositiveInt(o.hingesPerSash, fallback.hingesPerSash),
    hingesPerDoor: normalizePositiveInt(o.hingesPerDoor, fallback.hingesPerDoor),
    espagnoletteCatalog,
    espagnoletteSashDeductionMm: normalizePositiveInt(
      o.espagnoletteSashDeductionMm,
      fallback.espagnoletteSashDeductionMm
    ),
    hingedLockPieces: normalizeLockPieces(
      o.hingedLockPieces,
      fallback.hingedLockPieces
    ),
    bouclierLockPieces: normalizeLockPieces(
      o.bouclierLockPieces,
      fallback.bouclierLockPieces
    ),
    boltsPerBouclier: normalizePositiveInt(
      o.boltsPerBouclier,
      fallback.boltsPerBouclier
    ),
    bouclierBoltLockPieces: normalizeLockPieces(
      o.bouclierBoltLockPieces,
      fallback.bouclierBoltLockPieces
    ),
    bouclierCapKitsPerBouclier: normalizePositiveInt(
      o.bouclierCapKitsPerBouclier,
      fallback.bouclierCapKitsPerBouclier
    ),
    protrudingHandlesPerLockset: normalizePositiveInt(
      o.protrudingHandlesPerLockset,
      fallback.protrudingHandlesPerLockset
    ),
    tracksPerFrame: normalizePositiveInt(o.tracksPerFrame, fallback.tracksPerFrame),
    rollersPerSlidingSash: normalizePositiveInt(
      o.rollersPerSlidingSash,
      fallback.rollersPerSlidingSash
    ),
    brushSashPerimeterMultiplier: normalizeMultiplier(
      o.brushSashPerimeterMultiplier,
      fallback.brushSashPerimeterMultiplier
    ),
    brushKnifeHeightMultiplier: normalizeMultiplier(
      o.brushKnifeHeightMultiplier,
      fallback.brushKnifeHeightMultiplier
    ),
    slidingLockPieces: normalizeLockPieces(
      o.slidingLockPieces,
      fallback.slidingLockPieces
    ),
    recessedHandlesPerRecessedSash: normalizePositiveInt(
      o.recessedHandlesPerRecessedSash,
      fallback.recessedHandlesPerRecessedSash
    ),
  };
}

function normalizeSystem(
  raw: unknown,
  category: MaterialCategory,
  accessoryBrands: AccessoryBrand[] = []
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
    profileBrandId:
      typeof s.profileBrandId === "string" && s.profileBrandId.trim()
        ? s.profileBrandId.trim()
        : undefined,
  };
  if (category === "profiles") {
    base.profile = normalizeProfileDetails(s.profile);
  }
  if (category === "glass") {
    base.glass = normalizeGlassBottleDetails(s.glass, base.name);
  }
  if (category === "accessories") {
    base.accessory = normalizeAccessoryDetails(s.accessory, accessoryBrands);
  }
  if (category === "iron") {
    base.iron = normalizeIronDetails(s.iron);
  }
  return base;
}

function migrateProfileSystemLabels(systems: MaterialSystem[]): MaterialSystem[] {
  const renames: Record<
    string,
    { fromNames: string[]; name: string; notes: string; brandId: string }
  > = {
    pvc1: {
      fromNames: ["نظام PVC مخصص 1"],
      name: "بريمير سيتي",
      notes:
        "سيستم بريمير سيتي — بياخد قائمة أسعار السيتي للحلق والضلفة والباكتة والسوقاس",
      brandId: "brand-city",
    },
    pvc2: {
      fromNames: ["نظام PVC مخصص 2"],
      name: "بريمير سلايد",
      notes: "سيستم جرار — قائمة أسعار السيتي",
      brandId: "brand-city",
    },
  };

  let list = systems.map((s) => {
    const rule = renames[s.id];
    if (!rule || !rule.fromNames.includes(s.name)) return s;
    return {
      ...s,
      name: rule.name,
      notes: s.notes && !rule.fromNames.includes(s.notes) ? s.notes : rule.notes,
      profileBrandId: s.profileBrandId ?? rule.brandId,
    };
  });

  if (!list.some((s) => s.isDefault) && list.some((s) => s.id === "pvc1")) {
    list = list.map((s) => ({ ...s, isDefault: s.id === "pvc1" }));
  }

  return list;
}

function normalizeCatalog(raw: MaterialCatalog): MaterialCatalog {
  const defaults = getDefaultCatalog();
  const next = {} as MaterialCatalog;

  const accessoryBrands =
    raw.accessoryBrands === undefined
      ? defaults.accessoryBrands ?? defaultAccessoryBrands()
      : normalizeAccessoryBrands(raw.accessoryBrands);

  const profileBrands =
    raw.profileBrands === undefined
      ? defaults.profileBrands ?? defaultProfileBrands()
      : normalizeProfileBrands(raw.profileBrands);

  const profileBrandIds = new Set(profileBrands.map((b) => b.id));

  for (const cat of MATERIAL_CATEGORIES) {
    const list = Array.isArray(raw[cat.id]) ? raw[cat.id] : [];
    const seen = new Set<string>();
    const systems: MaterialSystem[] = [];

    for (const item of list) {
      const sys = normalizeSystem(item, cat.id, accessoryBrands);
      if (!sys || seen.has(sys.id)) continue;
      seen.add(sys.id);
      systems.push(sys);
    }

    if (systems.length === 0) {
      next[cat.id] = defaults[cat.id];
    } else {
      let foundDefault = false;
      let merged = systems.map((s) => {
        let enriched = s;
        if (cat.id === "profiles" && !enriched.profile) {
          enriched = { ...enriched, profile: defaultProfileDetails() };
        }
        if (
          cat.id === "profiles" &&
          enriched.profileBrandId &&
          !profileBrandIds.has(enriched.profileBrandId)
        ) {
          enriched = { ...enriched, profileBrandId: undefined };
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
        if (cat.id === "accessories" && !enriched.accessory) {
          enriched = {
            ...enriched,
            accessory: defaultAccessoryDetails(),
          };
        }
        if (cat.id === "iron" && !enriched.iron) {
          enriched = { ...enriched, iron: defaultIronDetails() };
        }
        if (enriched.isDefault && !foundDefault) {
          foundDefault = true;
          return enriched;
        }
        return { ...enriched, isDefault: false };
      });

      if (cat.id === "glass") {
        merged = migrateGlassSystems(merged);
      }

      if (cat.id === "profiles") {
        merged = migrateProfileSystemLabels(merged);
      }

      next[cat.id] = merged;
    }
  }

  next.glassRates = normalizeGlassRates(raw.glassRates);
  next.meshCategories =
    raw.meshCategories === undefined
      ? defaultMeshCategories()
      : normalizeMeshCategories(raw.meshCategories);
  next.meshTypes =
    raw.meshTypes === undefined
      ? defaultMeshTypes()
      : normalizeMeshTypes(raw.meshTypes, next.meshCategories);
  next.accessoryBrands = accessoryBrands;
  next.profileBrands = profileBrands;

  return next;
}

function normalizeMeshCategories(raw: unknown): MeshCategory[] {
  if (!Array.isArray(raw)) return [];
  const out: MeshCategory[] = [];
  const seen = new Set<string>();
  const defaultTags = new Set(["sliding", "hinged", "fixed", "tilt"]);

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    const label = typeof o.label === "string" ? o.label.trim() : "";
    if (!id || !label || seen.has(id)) continue;
    const defaultFor = defaultTags.has(o.defaultFor as string)
      ? (o.defaultFor as MeshCategory["defaultFor"])
      : undefined;
    seen.add(id);
    out.push({
      id,
      label,
      calcProfile: Boolean(o.calcProfile),
      defaultFor,
    });
  }

  return out;
}

function normalizeMeshTypes(raw: unknown, categories: MeshCategory[]): MeshType[] {
  if (!Array.isArray(raw)) return [];
  const out: MeshType[] = [];
  const seen = new Set<string>();
  const kindIds = new Set(categories.map((c) => c.id));
  const fallbackKind = categories[0]?.id ?? "fixed";

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    const name = typeof o.name === "string" ? o.name.trim() : "";
    if (!id || !name || seen.has(id)) continue;
    const kindRaw = typeof o.kind === "string" ? o.kind.trim() : fallbackKind;
    const kind = kindIds.has(kindRaw) ? kindRaw : fallbackKind;
    const price = Number(o.pricePerSqm);
    seen.add(id);
    out.push({
      id,
      name,
      kind,
      pricePerSqm: Number.isFinite(price) && price >= 0 ? price : 0,
      notes: typeof o.notes === "string" ? o.notes.trim() || undefined : undefined,
    });
  }

  return out;
}

export function loadMaterialCatalog(): MaterialCatalog {
  if (typeof window === "undefined") return getDefaultCatalog();
  try {
    const raw = localStorage.getItem(MATERIALS_STORAGE_KEY);
    if (!raw) return getDefaultCatalog();
    const parsed: unknown = JSON.parse(raw);
    if (!isCatalog(parsed)) return getDefaultCatalog();
    const normalized = normalizeCatalog(parsed);
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return getDefaultCatalog();
  }
}

export function saveMaterialCatalog(catalog: MaterialCatalog): MaterialCatalog {
  const normalized = normalizeCatalog(catalog);
  if (typeof window !== "undefined") {
    localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(normalized));
    notifyMeshCatalogUpdated();
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
  if (category === "accessories" && !toSave.accessory) {
    toSave = { ...toSave, accessory: defaultAccessoryDetails() };
  }
  if (category === "iron" && !toSave.iron) {
    toSave = { ...toSave, iron: defaultIronDetails() };
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
      accessory:
        category === "accessories"
          ? toSave.accessory ?? prev.accessory ?? defaultAccessoryDetails()
          : undefined,
      iron:
        category === "iron"
          ? toSave.iron ?? prev.iron ?? defaultIronDetails()
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
  const cat = catalog ?? (typeof window !== "undefined" ? loadMaterialCatalog() : getDefaultCatalog());
  const systems = getSystemsForCategory(category, cat);
  return [
    { id: "none", label: "تجاهل" },
    ...systems.map((s) => {
      let label = s.name;
      if (s.isDefault) label = `${label} (افتراضي)`;
      if (category === "profiles" && s.profileBrandId) {
        const brand = findProfileBrand(s.profileBrandId, cat);
        if (brand) label = `${label} · أسعار ${brand.name}`;
      }
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

/** خطوة واحدة في سلسلة حساب مقاس القطع */
export type CutCalculationStep = {
  step: number;
  phase: "frame" | "sash";
  label: string;
  formula: string;
  /** المتغيرات المستخدمة في هذه الخطوة */
  vars: { W: number; H: number; FW: number; FH: number };
  resultMm: number;
  error?: string;
};

const VAR_LABELS: Record<string, string> = {
  W: "W",
  H: "H",
  FW: "FW",
  FH: "FH",
};

/** يعرض المتغيرات المستخدمة في المعادلة بصيغة W=1200 · H=1400 */
export function formatFormulaVars(
  vars: { W: number; H: number; FW: number; FH: number },
  keys: ("W" | "H" | "FW" | "FH")[]
): string {
  return keys.map((k) => `${VAR_LABELS[k]}=${vars[k]}`).join(" · ");
}

/** يستخرج المتغيرات المستخدمة فعلياً من صيغة المعادلة */
function varsUsedInFormula(formula: string): ("W" | "H" | "FW" | "FH")[] {
  const body = formula.trim().replace(/^=/, "").toUpperCase();
  const found: ("W" | "H" | "FW" | "FH")[] = [];
  let masked = body;
  for (const k of ["FW", "FH"] as const) {
    if (masked.includes(k)) {
      found.push(k);
      masked = masked.split(k).join("");
    }
  }
  for (const k of ["W", "H"] as const) {
    if (masked.includes(k)) found.push(k);
  }
  return found;
}

/** سلسلة خطوات حساب مقاس الحلق والضلفة — للشرح والمعاينة */
export function getCutCalculationSteps(
  openingWidthMm: number,
  openingHeightMm: number,
  deductions: ProfileDeductions
): CutCalculationStep[] {
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

  const steps: CutCalculationStep[] = [
    {
      step: 1,
      phase: "frame",
      label: "عرض الحلق",
      formula: ensureEqualsPrefix(deductions.frame.width),
      vars: base,
      resultMm: frameW.value,
      error: frameW.error,
    },
    {
      step: 2,
      phase: "frame",
      label: "ارتفاع الحلق",
      formula: ensureEqualsPrefix(deductions.frame.height),
      vars: base,
      resultMm: frameH.value,
      error: frameH.error,
    },
    {
      step: 3,
      phase: "sash",
      label: "عرض الضلفة",
      formula: ensureEqualsPrefix(deductions.sash.width),
      vars: withFrame,
      resultMm: sashW.value,
      error: sashW.error,
    },
    {
      step: 4,
      phase: "sash",
      label: "ارتفاع الضلفة",
      formula: ensureEqualsPrefix(deductions.sash.height),
      vars: withFrame,
      resultMm: sashH.value,
      error: sashH.error,
    },
  ];

  return steps;
}

/** نص مختصر لخطوة حساب واحدة */
export function formatCutStepSummary(step: CutCalculationStep): string {
  if (step.error) return `${step.label}: خطأ — ${step.error}`;
  const keys = varsUsedInFormula(step.formula);
  const varsText = formatFormulaVars(step.vars, keys);
  return `${step.label}: ${step.formula} (${varsText}) → ${step.resultMm} مم`;
}

/** نصوص مقاس القطع للعرض (عربي بسيط لو التخصيم ثابت) */
export function frameWidthFormula(d: ProfileDeductions): string {
  return describeFormulaAr(d.frame.width, "عرض الحلق");
}

export function frameHeightFormula(d: ProfileDeductions): string {
  return describeFormulaAr(d.frame.height, "ارتفاع الحلق");
}

export function sashWidthFormula(d: ProfileDeductions): string {
  return describeFormulaAr(d.sash.width, "عرض الضلفة");
}

export function sashHeightFormula(d: ProfileDeductions): string {
  return describeFormulaAr(d.sash.height, "ارتفاع الضلفة");
}

export function formatBarLength(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return "—";
  return `${m.toFixed(m % 1 === 0 ? 0 : 1)} م`;
}

export function formatSectionMm(mm: number): string {
  if (!Number.isFinite(mm) || mm < 0) return "—";
  return `${mm} مم`;
}
