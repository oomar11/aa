/** أنظمة الخامات: قطاعات · اكسسوار · زجاج · حديد */

import {
  defaultVorneAccessoryBrands,
  defaultVorneCategoryBrands,
  migrateVorneAccessoryBrands,
} from "@/lib/accessory-price-list-2026";
import {
  IRON_PRICE_LIST_NOTES,
  IRON_STOCK_BAR_LENGTH_M,
  ironOfficialRateForRole,
} from "@/lib/iron-price-list-2026";
import type { MeshKind } from "@/lib/design-items";
import {
  deductToFormula,
  describeFormulaAr,
  ensureEqualsPrefix,
  evaluateFormula,
  validateFormula,
} from "@/lib/excel-formula";
import { CATALOG_EVENTS, STORAGE_KEYS } from "@/lib/storage/keys";

export type MaterialCategory = "profiles" | "accessories" | "glass" | "iron";

/** دور العود داخل نظام القطاعات */
export type ProfilePieceRole =
  | "frame-hinged"
  | "frame-sliding"
  | "sash-hinged"
  | "sash-door"
  | "sash-sliding"
  | "mullion"
  | "coupling"
  | "knife"
  | "four-leaf-meeting"
  | "mesh-meeting"
  | "bouclier-cap"
  | "bead-single-hinged"
  | "bead-double-hinged"
  | "bead-single-sliding"
  | "bead-double-sliding"
  | "panel"
  | "bead"
  | "other";

export const PROFILE_PIECE_ROLES: {
  id: ProfilePieceRole;
  label: string;
  group: "frame" | "sash" | "bead" | "panel" | "other";
}[] = [
  { id: "frame-hinged", label: "حلق مفصلي", group: "frame" },
  { id: "frame-sliding", label: "حلق جرار", group: "frame" },
  { id: "sash-hinged", label: "ضلفة شباك مفصلي", group: "sash" },
  { id: "sash-door", label: "ضلفة باب مفصلي", group: "sash" },
  { id: "sash-sliding", label: "ضلفة جرار", group: "sash" },
  { id: "mullion", label: "سوقاس", group: "other" },
  { id: "coupling", label: "كوبلن", group: "other" },
  { id: "knife", label: "سكينة", group: "other" },
  { id: "four-leaf-meeting", label: "تقابل ٤ ضلفة", group: "other" },
  { id: "mesh-meeting", label: "تقابل سلك جرار", group: "other" },
  { id: "bouclier-cap", label: "طبة بوكلير", group: "other" },
  { id: "bead-single-hinged", label: "باكتة سنجل مفصلي", group: "bead" },
  { id: "bead-double-hinged", label: "باكتة دبل مفصلي", group: "bead" },
  { id: "bead-single-sliding", label: "باكتة سنجل جرار", group: "bead" },
  { id: "bead-double-sliding", label: "باكتة دبل جرار", group: "bead" },
  { id: "panel", label: "بنل (١٥ سم)", group: "panel" },
  { id: "other", label: "أخرى", group: "other" },
];

const PROFILE_PIECE_ROLE_IDS = new Set(
  PROFILE_PIECE_ROLES.map((r) => r.id)
);

/** ترحيل الأدوار القديمة */
const LEGACY_PROFILE_ROLE_MAP: Record<string, ProfilePieceRole> = {
  bead: "bead-single-hinged",
  "sash-sliding-protruding": "sash-sliding",
  "sash-sliding-recessed": "sash-sliding",
  threshold: "other",
};

export function profileRoleLabel(role: ProfilePieceRole): string {
  const resolved = LEGACY_PROFILE_ROLE_MAP[role] ?? role;
  return PROFILE_PIECE_ROLES.find((r) => r.id === resolved)?.label ?? role;
}

export function profileRoleDefaultName(role: ProfilePieceRole): string {
  return profileRoleLabel(role);
}

export function normalizeProfilePieceRole(raw: unknown): ProfilePieceRole {
  if (typeof raw === "string" && PROFILE_PIECE_ROLE_IDS.has(raw as ProfilePieceRole)) {
    return raw as ProfilePieceRole;
  }
  if (typeof raw === "string" && LEGACY_PROFILE_ROLE_MAP[raw]) {
    return LEGACY_PROFILE_ROLE_MAP[raw]!;
  }
  return "other";
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
  | "panel"
  | "mesh-sliding-profile"
  | "four-leaf-meeting"
  | "mesh-meeting";

export const PROFILE_PRICE_CATEGORIES: {
  id: ProfilePriceCategory;
  label: string;
}[] = [
  { id: "frame-hinged", label: "حلق مفصلي" },
  { id: "frame-sliding", label: "حلق جرار" },
  { id: "sash-hinged", label: "ضلفة شباك مفصلي" },
  { id: "sash-door", label: "ضلفة باب مفصلي" },
  { id: "sash-sliding", label: "ضلفة جرار" },
  { id: "mullion", label: "سوقاس" },
  { id: "coupling", label: "كوبلن" },
  { id: "knife", label: "سكينة" },
  { id: "bouclier", label: "بوكلير" },
  { id: "bead-single-hinged", label: "باكتة سنجل مفصلي" },
  { id: "bead-single-sliding", label: "باكتة سنجل جرار" },
  { id: "bead-double-hinged", label: "باكتة دبل مفصلي" },
  { id: "bead-double-sliding", label: "باكتة دبل جرار" },
  { id: "panel", label: "بنل" },
  { id: "mesh-sliding-profile", label: "ضلفة سلك جرار" },
  { id: "four-leaf-meeting", label: "تقابل ٤ ضلفة" },
  { id: "mesh-meeting", label: "تقابل سلك" },
];

export function profilePriceCategoryLabel(id: ProfilePriceCategory): string {
  return PROFILE_PRICE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

/** براند قطاعات (سيتي · بريمير · …) مع قائمة أسعار بالعود */
export type ProfileBarRate = {
  /** سعر العود (ج.م/عود) */
  barPrice: number;
  /** طول العود بالمتر */
  barLengthM: number;
  /** اسم الصنف في قائمة المصنع (اختياري) */
  productName?: string;
};

export type ProfileBrand = {
  id: string;
  name: string;
  notes?: string;
  /**
   * قائمة أسعار بالعود: سعر العود + طول العود.
   * سعر المتر = barPrice ÷ barLengthM
   * @deprecated يُنسخ إلى `profile.rates` عند الترحيل
   */
  rates: Partial<Record<ProfilePriceCategory, ProfileBarRate>>;
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
 * تخصيمات القطع القديمة (معادلات) — للترحيل فقط.
 * الحساب الفعلي من `UnifiedCutDeductions` على مستوى الكتالوج.
 */
export type ProfileAxisFormulas = {
  width: string;
  height: string;
};

/** @deprecated استخدم UnifiedCutDeductions */
export type ProfileDeductions = {
  frame: ProfileAxisFormulas;
  sash: ProfileAxisFormulas;
};

/**
 * تخصيمات موحدة لحساب تقديري الخامات (لكل البرنامج).
 * — الحلق أكبر من الفتحة
 * — الضلفة أصغر من الحلق
 * — الباكتة والزجاج أصغر من الضلفة (نفس الرقم)
 */
export type UnifiedCutDeductions = {
  /** زيادة الحلق عن الفتحة (مم) — افتراضي 110 (= 11 سم) */
  frameAddMm: number;
  /** نقص الضلفة عن الحلق (مم) — افتراضي 130 (= 13 سم) */
  sashLessMm: number;
  /** نقص الباكتة والزجاج عن الضلفة (مم) — افتراضي 40 (= 4 سم) */
  beadGlassLessMm: number;
};

export type ProfileSystemDetails = {
  pieces: ProfilePiece[];
  /**
   * @deprecated التخصيم بقى موحد على الكتالوج (`cutDeductions`)
   * بتتخزن متزامنة للترحيل فقط.
   */
  deductions: ProfileDeductions;
  /**
   * قائمة أسعار النظام بالعود: سعر العود + طول العود.
   * سعر المتر = barPrice ÷ barLengthM
   */
  rates?: Partial<Record<ProfilePriceCategory, ProfileBarRate>>;
  /**
   * سعر طقم طبة البوكلير (ج.م/طقم).
   * طقم بيركب لكل حتة بوكلير — مش بالعود، وبيختلف من سيستم للتاني.
   */
  bouclierCapKitPrice?: number;
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

/** المقاسات القياسية الافتراضية — متوافقة مع قائمة فورنا يوليو 2026 */
export const DEFAULT_ESPAGNOLETTE_SIZE_VALUES = [
  30, 40, 60, 80, 100, 120, 140, 160, 180, 200,
] as const;

/** @deprecated استخدم DEFAULT_ESPAGNOLETTE_SIZE_VALUES */
export const ESPAGNOLETTE_SIZES: number[] = [...DEFAULT_ESPAGNOLETTE_SIZE_VALUES];

/** صف في كتالوج مقاسات السبلونة — قابل للتعديل بالكامل */
export type EspagnoletteCatalogEntry = {
  id: string;
  /** مقاس السبلونة (سم) */
  size: number;
  /**
   * أقصى ارتفاع ضلفة من ناحية المقبض (مم) — مرجعي في الكتالوج.
   * الاختيار التلقائي يعتمد على مقاس السبلونة (سم) والفرق عن الضلفة.
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
  /** سعر الوحدة (ج.م) — قطعة أو متر حسب الفئة */
  unitPrice?: number;
  /** أسعار السبلونة حسب المقاس (سم) — تُستخدم بدل unitPrice عند الحساب */
  sizePrices?: Partial<Record<number, number>>;
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
   * أقل فرق مطلوب بين ارتفاع الضلفة ومقاس السبلونة (مم).
   * الافتراضي ٢٠٠ مم = ٢٠ سم — تُختار أكبر سبلونة أقصر من الضلفة بهذا الفرق على الأقل.
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

/** دور عود الحديد — حلق/ضلفة حسب مفصلي أو جرار (وباب للشباك المفصلي) */
export type IronPieceRole =
  | "frame-hinged"
  | "frame-sliding"
  | "sash-hinged"
  | "sash-door"
  | "sash-sliding"
  | "mullion"
  | "track"
  | "hinge-strip";

export const IRON_PIECE_ROLES: {
  id: IronPieceRole;
  label: string;
  hint: string;
}[] = [
  {
    id: "frame-hinged",
    label: "حديد حلق مفصلي",
    hint: "تسليح محيط الحلق المفصلي",
  },
  {
    id: "frame-sliding",
    label: "حديد حلق جرار",
    hint: "تسليح محيط الحلق الجرار",
  },
  {
    id: "sash-hinged",
    label: "حديد ضلفة مفصلي شباك",
    hint: "تسليح ضلفة الشباك المفصلي/القلاب",
  },
  {
    id: "sash-door",
    label: "حديد ضلفة باب",
    hint: "تسليح ضلفة الباب المفصلي",
  },
  {
    id: "sash-sliding",
    label: "حديد ضلفة جرار",
    hint: "تسليح ضلفة الجرار",
  },
  { id: "mullion", label: "حديد سوقاس", hint: "تسليح قوائم التقسيم" },
  { id: "track", label: "تراك جرار", hint: "تراكات على حلق الجرار" },
  {
    id: "hinge-strip",
    label: "شريحة مفصلة",
    hint: "عود بارتفاع جنب المفصلات — مفصلي وقلاب",
  },
];

/** أدوار الحديد المعروفة حاليًا */
const IRON_ROLE_IDS = new Set<string>(IRON_PIECE_ROLES.map((r) => r.id));

/**
 * ترحيل أدوار قديمة:
 * - frame / sash الموحّدين يتوزّعوا على الأنواع التفصيلية في migrateIronPieces
 * - الأسماء القديمة المفصلي/الجرار تفضل كما هي
 */
const LEGACY_IRON_ROLE_MAP: Record<string, IronPieceRole> = {
  "frame-hinged": "frame-hinged",
  "frame-sliding": "frame-sliding",
  "sash-hinged": "sash-hinged",
  "sash-sliding": "sash-sliding",
  "sash-door": "sash-door",
  mullion: "mullion",
  track: "track",
  "hinge-strip": "hinge-strip",
  // الموحّد القديم → نوزّعه في migrate (هنا نرجّع نوع أساسي مؤقت)
  frame: "frame-hinged",
  sash: "sash-hinged",
};

export function ironRoleLabel(role: IronPieceRole): string {
  return IRON_PIECE_ROLES.find((r) => r.id === role)?.label ?? role;
}

export function ironRoleHint(role: IronPieceRole): string {
  return IRON_PIECE_ROLES.find((r) => r.id === role)?.hint ?? "";
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
  /** يُحسب في التصميم */
  enabled: boolean;
  /**
   * سعر العود (ج.م/عود) — الأساس للتكلفة.
   * سعر المتر = barPrice ÷ barLengthM
   */
  barPrice?: number;
  /**
   * @deprecated استخدم barPrice؛ يُشتق أو يُرحَّل للتوافق
   */
  pricePerM?: number;
  notes?: string;
};

/**
 * تخصيمات الحديد عن القطاع.
 * التخزين بصيغة معادلة؛ الواجهة تعرض رقم خصم بالمم.
 */
export type IronDeductions = {
  frame: ProfileAxisFormulas;
  sash: ProfileAxisFormulas;
  /** صيغة طول سوقاس الحديد — المتغير L */
  mullion: string;
  /**
   * صيغة طول شريحة المفصلة — المتغيرات SH / H.
   * لو فاضية تُستخدم معادلة ارتفاع الضلفة.
   */
  hingeStrip?: string;
};

export type IronSystemDetails = {
  pieces: IronPiece[];
  deductions: IronDeductions;
  /** عدد تراكات الجرار على الحلق (افتراضي ٢) */
  tracksPerFrame: number;
};

export type MaterialSystem = {
  id: string;
  name: string;
  notes?: string;
  /** النظام الافتراضي (خصوصاً للحديد الثابت غالباً) */
  isDefault?: boolean;
  /**
   * @deprecated الأسعار بقت داخل `profile.rates` — يُستخدم فقط للترحيل من البيانات القديمة
   */
  profileBrandId?: string;
  /** تفاصيل نظام القطاعات: العيدان + التخصيمات + الأسعار */
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
  /**
   * تخصيمات موحدة لحساب تقديري الخامات (حلق · ضلفة · باكتة · زجاج)
   */
  cutDeductions?: UnifiedCutDeductions;
  /**
   * @deprecated أسعار القطاعات بقت على كل نظام (`profile.rates`) — للترحيل فقط
   */
  profileBrands?: ProfileBrand[];
};

/** @deprecated استخدم STORAGE_KEYS.materialSystems */
export const MATERIALS_STORAGE_KEY = STORAGE_KEYS.materialSystems;

/** يُبث بعد حفظ تصنيفات/أنواع السلك — لمزامنة المحررات */
export const MESH_CATALOG_UPDATED = CATALOG_EVENTS.meshUpdated;

export function notifyMeshCatalogUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MESH_CATALOG_UPDATED));
  }
}

/** يُبث بعد حفظ براندات الاكسسوار */
export const ACCESSORY_BRANDS_UPDATED = CATALOG_EVENTS.accessoryBrandsUpdated;

export function notifyAccessoryBrandsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ACCESSORY_BRANDS_UPDATED));
  }
}

/** يُبث بعد أي حفظ لكتالوج الخامات — لمزامنة شاشة الرسم */
export const MATERIAL_CATALOG_UPDATED = CATALOG_EVENTS.catalogUpdated;

export function notifyMaterialCatalogUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MATERIAL_CATALOG_UPDATED));
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
    label: "القطاعات",
    description: "أنظمة · أسعار العود · العيدان · التخصيمات",
    accent: "#E8956F",
    shadow: "rgba(232,149,111,0.35)",
  },
  {
    id: "accessories",
    label: "الاكسسوار",
    description: "أسعار وقواعد المفصلي والجرار",
    accent: "#6B8AD8",
    shadow: "rgba(107,138,216,0.35)",
  },
  {
    id: "glass",
    label: "الزجاج",
    description: "كتالوج الزجاجات · التدبيل · جورجيا",
    accent: "#4BA3F5",
    shadow: "rgba(75,163,245,0.35)",
  },
  {
    id: "iron",
    label: "الحديد",
    description: "سيستم تسليح واحد · تسعير بالعود",
    accent: "#7A8799",
    shadow: "rgba(122,135,153,0.35)",
  },
];

export function getCategoryMeta(id: MaterialCategory) {
  return MATERIAL_CATEGORIES.find((c) => c.id === id)!;
}

/** بطاقات صفحة الخامات — السلك صفحة مستقلة مش جزء من الاكسسوار */
export type MaterialHubId = MaterialCategory | "mesh" | "deductions";

export type MaterialHubGroup = "systems" | "other";

export const MATERIAL_HUB_GROUPS: {
  id: MaterialHubGroup;
  title: string;
  hint: string;
}[] = [
  {
    id: "systems",
    title: "الأنظمة",
    hint: "قطاعات واكسسوار — اختار النظام وقت التصميم",
  },
  {
    id: "other",
    title: "خامات تانية",
    hint: "تخصيمات · زجاج · سلك · حديد",
  },
];

export const MATERIAL_HUB_ITEMS: {
  id: MaterialHubId;
  label: string;
  description: string;
  accent: string;
  shadow: string;
  href: string;
  group: MaterialHubGroup;
}[] = [
  {
    id: "profiles",
    label: "القطاعات",
    description: "أسعار المتر بالعود · العيدان",
    accent: "#E8956F",
    shadow: "rgba(232,149,111,0.35)",
    href: "/materials/profiles",
    group: "systems",
  },
  {
    id: "accessories",
    label: "الاكسسوار",
    description: "نظام واحد: الأسعار + قواعد المفصلي والجرار",
    accent: "#6B8AD8",
    shadow: "rgba(107,138,216,0.35)",
    href: "/materials/accessories",
    group: "systems",
  },
  {
    id: "deductions",
    label: "التخصيمات",
    description: "حلق +١١ · ضلفة −١٣ · باكتة وزجاج — تقديري الخامات",
    accent: "#C47B5A",
    shadow: "rgba(196,123,90,0.35)",
    href: "/materials/deductions",
    group: "other",
  },
  {
    id: "glass",
    label: "الزجاج",
    description: "كتالوج الزجاجات · التدبيل · جورجيا",
    accent: "#4BA3F5",
    shadow: "rgba(75,163,245,0.35)",
    href: "/materials/glass",
    group: "other",
  },
  {
    id: "mesh",
    label: "السلك",
    description: "تصنيفات وأنواع السلك والأسعار",
    accent: "#5B9A6F",
    shadow: "rgba(91,154,111,0.35)",
    href: "/materials/mesh",
    group: "other",
  },
  {
    id: "iron",
    label: "الحديد",
    description: "سيستم واحد · تسعير بالعود · تراك · شريحة مفصلة",
    accent: "#7A8799",
    shadow: "rgba(122,135,153,0.35)",
    href: "/materials/iron",
    group: "other",
  },
];

/** القيم الافتراضية الموحدة (سم → مم) */
export function defaultUnifiedCutDeductions(): UnifiedCutDeductions {
  return {
    frameAddMm: 110,
    sashLessMm: 130,
    beadGlassLessMm: 40,
  };
}

/** يحوّل التخصيم الموحد لمعادلات قديمة (ترحيل / توافق) */
export function unifiedToProfileDeductions(
  u: UnifiedCutDeductions
): ProfileDeductions {
  const frame = Math.round(u.frameAddMm);
  const sash = Math.round(u.sashLessMm);
  return {
    frame: {
      width: frame === 0 ? "=W" : frame > 0 ? `=W+${frame}` : `=W${frame}`,
      height: frame === 0 ? "=H" : frame > 0 ? `=H+${frame}` : `=H${frame}`,
    },
    sash: {
      width: sash === 0 ? "=FW" : `=FW-${sash}`,
      height: sash === 0 ? "=FH" : `=FH-${sash}`,
    },
  };
}

export function defaultDeductions(): ProfileDeductions {
  return unifiedToProfileDeductions(defaultUnifiedCutDeductions());
}

export function normalizeUnifiedCutDeductions(
  raw: unknown
): UnifiedCutDeductions {
  const fallback = defaultUnifiedCutDeductions();
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  const frameAddMm = Number(o.frameAddMm);
  const sashLessMm = Number(o.sashLessMm);
  const beadGlassLessMm = Number(o.beadGlassLessMm);
  return {
    frameAddMm:
      Number.isFinite(frameAddMm) && frameAddMm >= 0
        ? Math.round(frameAddMm)
        : fallback.frameAddMm,
    sashLessMm:
      Number.isFinite(sashLessMm) && sashLessMm >= 0
        ? Math.round(sashLessMm)
        : fallback.sashLessMm,
    beadGlassLessMm:
      Number.isFinite(beadGlassLessMm) && beadGlassLessMm >= 0
        ? Math.round(beadGlassLessMm)
        : fallback.beadGlassLessMm,
  };
}

/** يقرأ التخصيم الموحد من الكتالوج */
export function getCutDeductions(
  catalog?: MaterialCatalog | null
): UnifiedCutDeductions {
  return normalizeUnifiedCutDeductions(catalog?.cutDeductions);
}

export function defaultProfilePieces(): ProfilePiece[] {
  return standardHingedProfilePieces();
}

/** قطاعات قياسية لنظام مفصلي */
export function standardHingedProfilePieces(): ProfilePiece[] {
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
      name: "ضلفة شباك مفصلي",
      role: "sash-hinged",
      sectionWidthMm: 70,
      barLengthM: DEFAULT_BAR_LENGTH_M,
    },
    {
      id: "piece-sash-door",
      name: "ضلفة باب مفصلي",
      role: "sash-door",
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
      id: "piece-bead-sh",
      name: "باكتة سنجل مفصلي",
      role: "bead-single-hinged",
      sectionWidthMm: 35,
      barLengthM: DEFAULT_BAR_LENGTH_M,
    },
    {
      id: "piece-bead-dh",
      name: "باكتة دبل مفصلي",
      role: "bead-double-hinged",
      sectionWidthMm: 20,
      barLengthM: DEFAULT_BAR_LENGTH_M,
    },
    {
      id: "piece-panel",
      name: "بنل",
      role: "panel",
      sectionWidthMm: 150,
      barLengthM: DEFAULT_BAR_LENGTH_M,
    },
    {
      id: "piece-bouclier-cap",
      name: "طبة بوكلير",
      role: "bouclier-cap",
      sectionWidthMm: 25,
      barLengthM: DEFAULT_BAR_LENGTH_M,
    },
  ];
}

/** قطاعات قياسية لنظام جرار */
export function standardSlidingProfilePieces(): ProfilePiece[] {
  return [
    {
      id: "piece-frame-s",
      name: "حلق جرار",
      role: "frame-sliding",
      sectionWidthMm: 80,
      barLengthM: DEFAULT_BAR_LENGTH_M,
    },
    {
      id: "piece-sash-s",
      name: "ضلفة جرار",
      role: "sash-sliding",
      sectionWidthMm: 45,
      barLengthM: DEFAULT_BAR_LENGTH_M,
    },
    {
      id: "piece-knife",
      name: "سكينة",
      role: "knife",
      sectionWidthMm: 30,
      barLengthM: DEFAULT_BAR_LENGTH_M,
    },
    {
      id: "piece-m4",
      name: "تقابل ٤ ضلفة",
      role: "four-leaf-meeting",
      sectionWidthMm: 70,
      barLengthM: DEFAULT_BAR_LENGTH_M,
    },
    {
      id: "piece-mm",
      name: "تقابل سلك جرار",
      role: "mesh-meeting",
      sectionWidthMm: 70,
      barLengthM: DEFAULT_BAR_LENGTH_M,
    },
    {
      id: "piece-bead-ss",
      name: "باكتة سنجل جرار",
      role: "bead-single-sliding",
      sectionWidthMm: 20,
      barLengthM: DEFAULT_BAR_LENGTH_M,
    },
    {
      id: "piece-bead-ds",
      name: "باكتة دبل جرار",
      role: "bead-double-sliding",
      sectionWidthMm: 9,
      barLengthM: DEFAULT_BAR_LENGTH_M,
    },
    {
      id: "piece-panel-s",
      name: "بنل",
      role: "panel",
      sectionWidthMm: 150,
      barLengthM: DEFAULT_BAR_LENGTH_M,
    },
  ];
}

/** يدمج القطاعات القياسية مع الموجود — بدون تكرار نفس الدور */
export function mergeStandardProfilePieces(
  existing: ProfilePiece[],
  kind: "hinged" | "sliding"
): ProfilePiece[] {
  const standard =
    kind === "hinged"
      ? standardHingedProfilePieces()
      : standardSlidingProfilePieces();
  const byRole = new Map<ProfilePieceRole, ProfilePiece>();
  for (const p of existing) {
    const role = normalizeProfilePieceRole(p.role);
    byRole.set(role, { ...p, role });
  }
  for (const p of standard) {
    if (!byRole.has(p.role)) byRole.set(p.role, { ...p, id: newPieceId() });
  }
  return [...byRole.values()];
}

export function defaultProfileDetails(): ProfileSystemDetails {
  return {
    pieces: defaultProfilePieces(),
    deductions: defaultDeductions(),
    rates: {},
  };
}

/** قالب أسعار لنظام جديد — يبدأ من قائمة السيتي بريمير (بالعود) */
export function defaultProfileSystemRates(): Partial<
  Record<ProfilePriceCategory, ProfileBarRate>
> {
  return cityPremierProfileBarRates();
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
    categoryBrands: defaultVorneCategoryBrands(),
    hingesPerSash: 2,
    hingesPerDoor: 3,
    espagnoletteCatalog: defaultEspagnoletteCatalog(),
    espagnoletteSashDeductionMm: 200,
    hingedLockPieces: defaultHingedLockPieces(),
    bouclierLockPieces: defaultBouclierLockPieces(),
    boltsPerBouclier: 2,
    bouclierBoltLockPieces: defaultBouclierBoltLockPieces(),
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
    hingeStrip: "=SH-100",
  };
}

export function defaultIronPieces(): IronPiece[] {
  const piece = (
    id: string,
    name: string,
    role: IronPieceRole,
    sectionWidthMm: number,
    sectionHeightMm: number
  ): IronPiece => {
    const rate = ironOfficialRateForRole(role);
    const barLengthM = rate?.barLengthM ?? IRON_STOCK_BAR_LENGTH_M;
    const barPrice = rate?.barPrice;
    const pricePerM =
      barPrice != null && barPrice > 0
        ? profileBarPricePerM(barPrice, barLengthM)
        : undefined;
    return {
      id,
      name,
      role,
      sectionWidthMm,
      sectionHeightMm,
      barLengthM,
      enabled: true,
      barPrice: barPrice != null && barPrice > 0 ? barPrice : undefined,
      pricePerM,
      notes: rate
        ? `${rate.code} · ${rate.label}`
        : undefined,
    };
  };

  return [
    piece("iron-frame-hinged", "حديد حلق مفصلي", "frame-hinged", 40, 20),
    piece("iron-frame-sliding", "حديد حلق جرار", "frame-sliding", 40, 20),
    piece(
      "iron-sash-hinged",
      "حديد ضلفة مفصلي شباك",
      "sash-hinged",
      35,
      20
    ),
    piece("iron-sash-door", "حديد ضلفة باب", "sash-door", 40, 20),
    piece("iron-sash-sliding", "حديد ضلفة جرار", "sash-sliding", 30, 20),
    piece("iron-mullion", "حديد سوقاس", "mullion", 30, 15),
    piece("iron-track", "تراك جرار (مجرى U)", "track", 0, 0),
    piece("iron-hinge-strip", "شريحة مفصلة", "hinge-strip", 20, 3),
  ];
}

export function defaultIronDetails(): IronSystemDetails {
  return {
    pieces: defaultIronPieces(),
    deductions: defaultIronDeductions(),
    tracksPerFrame: 2,
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

/**
 * سعر المتر الطولي لعود الحديد.
 * الأولوية: barPrice ÷ barLengthM، وإلا pricePerM القديم.
 */
export function ironPiecePricePerM(piece: IronPiece): number {
  const barLen =
    Number.isFinite(piece.barLengthM) && piece.barLengthM > 0
      ? piece.barLengthM
      : 0;
  const barPrice = Number(piece.barPrice);
  if (Number.isFinite(barPrice) && barPrice > 0 && barLen > 0) {
    return profileBarPricePerM(barPrice, barLen);
  }
  const legacy = Number(piece.pricePerM);
  if (Number.isFinite(legacy) && legacy > 0) return legacy;
  return 0;
}

/** سعر العود المعروض — من barPrice أو مستنتج من pricePerM القديم */
export function ironPieceBarPrice(piece: IronPiece): number {
  const barPrice = Number(piece.barPrice);
  if (Number.isFinite(barPrice) && barPrice > 0) return barPrice;
  const perM = Number(piece.pricePerM);
  const barLen =
    Number.isFinite(piece.barLengthM) && piece.barLengthM > 0
      ? piece.barLengthM
      : 0;
  if (Number.isFinite(perM) && perM > 0 && barLen > 0) {
    return Math.round(perM * barLen * 100) / 100;
  }
  return 0;
}

/** ملخص تسعير عود حديد للواجهة */
export function ironPiecePriceSummary(piece: IronPiece): string | null {
  const barPrice = ironPieceBarPrice(piece);
  const barLen =
    Number.isFinite(piece.barLengthM) && piece.barLengthM > 0
      ? piece.barLengthM
      : 0;
  const perM = ironPiecePricePerM(piece);
  if (!(barPrice > 0) || !(barLen > 0) || !(perM > 0)) return null;
  return `${barPrice} ج.م/عود · ${barLen} م ← ${perM} ج.م/م`;
}

/** خصم بسيط بالمم من معادلة حديد (=FW-100 · =SW-100 · =L-100 · =SH-100) */
export function ironOffsetMmFromFormula(formula: string): number {
  const m = formula
    .trim()
    .match(/^=?\s*(FW|FH|SW|SH|L|W|H)\s*(?:([+-])\s*(\d+(?:\.\d+)?))?\s*$/i);
  if (!m) return 100;
  if (!m[2] || !m[3]) return 0;
  const amount = Number(m[3]);
  if (!Number.isFinite(amount) || amount < 0) return 100;
  // نعرض قيمة التخصيم كموجب (السالب في المعادلة = خصم)
  return m[2] === "-" ? amount : 0;
}

function ironOffsetFormula(baseVar: string, deductMm: number): string {
  const d = Math.abs(Number(deductMm) || 0);
  if (d <= 0) return `=${baseVar}`;
  return `=${baseVar}-${d}`;
}

export function ironDeductionSummary(d: IronDeductions): string {
  const frame = ironOffsetMmFromFormula(d.frame.width);
  const sash = ironOffsetMmFromFormula(d.sash.width);
  const mullion = ironOffsetMmFromFormula(d.mullion);
  return `حلق −${frame} مم · ضلفة −${sash} مم · سوقاس −${mullion} مم`;
}

/** يبني معادلات تخصيم الحديد من أرقام خصم بسيطة بالمم */
export function ironDeductionsFromOffsets(mm: {
  frameW: number;
  frameH: number;
  sashW: number;
  sashH: number;
  mullion: number;
  hingeStrip: number;
}): IronDeductions {
  return {
    frame: {
      width: ironOffsetFormula("FW", mm.frameW),
      height: ironOffsetFormula("FH", mm.frameH),
    },
    sash: {
      width: ironOffsetFormula("SW", mm.sashW),
      height: ironOffsetFormula("SH", mm.sashH),
    },
    mullion: ironOffsetFormula("L", mm.mullion),
    hingeStrip: ironOffsetFormula("SH", mm.hingeStrip),
  };
}

/**
 * يختار مقاس السبلونة (سم) حسب ارتفاع الضلفة (مم).
 * يُختار أكبر مقاس طوله ≤ (ارتفاع الضلفة − الفرق الأدنى)، وإلا أصغر مقاس متاح.
 */
export function pickEspagnoletteSize(
  sashHeightMm: number,
  catalog: EspagnoletteCatalogEntry[],
  kind: "hinged" | "sliding",
  minGapMm = 200
): number {
  const allowed = catalog
    .filter((e) => (kind === "hinged" ? e.hinged : e.sliding))
    .sort((a, b) => a.size - b.size);

  if (allowed.length === 0) {
    const fallback = [...catalog].sort((a, b) => a.size - b.size);
    return fallback[fallback.length - 1]?.size ?? 100;
  }

  const gap = Math.max(0, minGapMm);
  const maxEspLengthMm = Math.max(0, sashHeightMm - gap);

  let best: EspagnoletteCatalogEntry | null = null;
  for (const entry of allowed) {
    const espLengthMm = entry.size * 10;
    if (espLengthMm <= maxEspLengthMm) best = entry;
    else break;
  }

  return best?.size ?? allowed[0]!.size;
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
  return defaultVorneAccessoryBrands();
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

/** تحويل سعر العود (ج.م/عود) إلى سعر المتر الطولي */
export function profileBarPricePerM(
  barPrice: number,
  barLengthM: number
): number {
  if (!Number.isFinite(barPrice) || !Number.isFinite(barLengthM) || barLengthM <= 0) {
    return 0;
  }
  return Math.round((barPrice / barLengthM) * 100) / 100;
}

/** @deprecated استخدم profileBarPricePerM */
export function barPriceToPerMeter(barPrice: number, barLengthM: number): number {
  return profileBarPricePerM(barPrice, barLengthM);
}

export function makeProfileBarRate(
  barPrice: number,
  barLengthM: number,
  productName?: string
): ProfileBarRate {
  return {
    barPrice,
    barLengthM,
    ...(productName ? { productName } : {}),
  };
}

const CITY_BRAND_NOTES =
  "قائمة أسعار قطاع سيتي بريمير — فبراير 2025 · تسعير بالعود (طول العود + سعر العود) · بدون نقل · شامل الكاوتش · أبيض/بيج/رصاصي";

/**
 * قائمة أسعار قطاع السيتي بريمير (فبراير 2025) — بالعود من قائمة المصنع.
 * كل صف: سعر العود + طول العود بالمتر (زي ما في القائمة).
 */
export function cityPremierProfileBarRates(): Partial<
  Record<ProfilePriceCategory, ProfileBarRate>
> {
  const r = makeProfileBarRate;
  return {
    // مفصلي
    "frame-hinged": r(790, 6, "حلق مفصلي ببار 6سم بالكاوتش"),
    "sash-hinged": r(830, 6, "ضلفة شباك مفصلي"),
    "sash-door": r(980, 6, "ضلفة باب مفصلي"),
    bouclier: r(710, 6.5, "قائم متحرك بوكلير"),
    mullion: r(875, 6.5, "قائم ثابت سوقاس"),
    "bead-single-hinged": r(208, 6, "باكتة 35مم"),
    "bead-double-hinged": r(165, 6, "باكتة 20مم"),
    panel: r(165, 6, "بنل عرض ١٥ سم"),
    coupling: r(240, 6, "كوبلن تجميع مفصلي/جرار"),
    // جرار
    "frame-sliding": r(1000, 6.5, "حلق جرار 3 سكة ببار 6سم"),
    "sash-sliding": r(750, 6, "ضلفة شباك جرار"),
    knife: r(255, 6.5, "طبة وسكينة شباك جرار"),
    "bead-single-sliding": r(165, 6, "باكتة 20مم"),
    "bead-double-sliding": r(140, 6, "باكتة 9مم"),
    "mesh-sliding-profile": r(380, 6, "ضلفة سلك جرار"),
    "four-leaf-meeting": r(190, 6, "تقابل 4 ضلفة جرار"),
    "mesh-meeting": r(140, 6, "تقابل سلك"),
  };
}

/** أسعار افتراضية قديمة (ج.م/م) — للترحيل فقط */
const LEGACY_PLACEHOLDER_PROFILE_BRAND_PRICES = {
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
  panel: 18,
  "mesh-sliding-profile": 38,
} as const satisfies Partial<Record<ProfilePriceCategory, number>>;

function profileBrandPricesMatch(
  prices: Partial<Record<ProfilePriceCategory, number>>,
  expected: Partial<Record<ProfilePriceCategory, number>>
): boolean {
  for (const [key, value] of Object.entries(expected)) {
    if ((prices[key as ProfilePriceCategory] ?? 0) !== value) return false;
  }
  return true;
}

function isProfileBarRate(raw: unknown): raw is ProfileBarRate {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  const barPrice = Number(o.barPrice);
  const barLengthM = Number(o.barLengthM);
  return (
    Number.isFinite(barPrice) &&
    barPrice >= 0 &&
    Number.isFinite(barLengthM) &&
    barLengthM > 0
  );
}

export function normalizeProfileBarRate(raw: unknown): ProfileBarRate | undefined {
  if (isProfileBarRate(raw)) {
    const o = raw as ProfileBarRate & { productName?: unknown };
    const productName =
      typeof o.productName === "string" && o.productName.trim()
        ? o.productName.trim()
        : undefined;
    return makeProfileBarRate(o.barPrice, o.barLengthM, productName);
  }
  // رقم قديم = كان ج.م/م — نرجّعه لعود بطول 6م تقريبي
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) {
    return makeProfileBarRate(Math.round(n * 6 * 100) / 100, 6);
  }
  return undefined;
}

export function normalizeProfileBrandRates(
  raw: unknown
): Partial<Record<ProfilePriceCategory, ProfileBarRate>> {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: Partial<Record<ProfilePriceCategory, ProfileBarRate>> = {};
  for (const cat of PROFILE_PRICE_CATEGORIES) {
    const rate = normalizeProfileBarRate(o[cat.id]);
    if (rate) out[cat.id] = rate;
  }

  // ترحيل بنل مفصلي/جرار القديم → بنل واحد
  if (!out.panel) {
    const legacyPanel =
      normalizeProfileBarRate(o["panel-hinged"]) ??
      normalizeProfileBarRate(o["panel-sliding"]) ??
      out["bead-double-hinged"] ??
      out["bead-double-sliding"];
    if (legacyPanel) {
      out.panel = {
        ...legacyPanel,
        productName: legacyPanel.productName ?? "باكتة بنل",
      };
    }
  }

  return out;
}

/**
 * ترحيل أسعار رقمية قديمة (ج.م/م) إلى هيكل العود.
 * لو البراند سيتي بريمير → قائمة المصنع الرسمية.
 */
export function migrateRatesFromLegacyPrices(
  prices: Partial<Record<ProfilePriceCategory, number>>
): Partial<Record<ProfilePriceCategory, ProfileBarRate>> {
  if (profileBrandPricesMatch(prices, LEGACY_PLACEHOLDER_PROFILE_BRAND_PRICES)) {
    return cityPremierProfileBarRates();
  }
  const out: Partial<Record<ProfilePriceCategory, ProfileBarRate>> = {};
  for (const cat of PROFILE_PRICE_CATEGORIES) {
    const perM = prices[cat.id];
    if (!(perM != null && perM > 0)) continue;
    // حاول نطابق قائمة السيتي بريمير المشتقة
    const official = cityPremierProfileBarRates()[cat.id];
    if (
      official &&
      Math.abs(profileBarPricePerM(official.barPrice, official.barLengthM) - perM) < 0.02
    ) {
      out[cat.id] = { ...official };
      continue;
    }
    out[cat.id] = makeProfileBarRate(Math.round(perM * 6 * 100) / 100, 6);
  }
  return out;
}

/** يحدّث براند السيتي بريمير إلى قائمة العود الرسمية فبراير 2025 */
export function migrateCityPremierProfileBrandPrices(
  brands: ProfileBrand[]
): ProfileBrand[] {
  const official = cityPremierProfileBarRates();
  let list = brands.map((brand) => {
    const isCityBrand =
      brand.id === "brand-city" ||
      brand.name === "سيتي" ||
      brand.name === "سيتي بريمير";

    if (!isCityBrand) return brand;

    const hasRates = Object.values(brand.rates ?? {}).some(
      (r) => r && r.barPrice > 0 && r.barLengthM > 0
    );

    // ثبّت قائمة المصنع لبراند السيتي بريمير
    return {
      ...brand,
      id: brand.id === "brand-city" || !hasRates ? "brand-city" : brand.id,
      name: "سيتي بريمير",
      notes: CITY_BRAND_NOTES,
      rates: { ...official },
    };
  });

  // لو مفيش براند سيتي خالص — أضيفه
  if (!list.some((b) => b.id === "brand-city" || b.name === "سيتي بريمير")) {
    list = [
      {
        id: "brand-city",
        name: "سيتي بريمير",
        notes: CITY_BRAND_NOTES,
        rates: { ...official },
      },
      ...list,
    ];
  }

  return list;
}

/** @deprecated استخدم migrateCityPremierProfileBrandPrices */
export function migrateCityBrandPrices(brands: ProfileBrand[]): ProfileBrand[] {
  return migrateCityPremierProfileBrandPrices(brands);
}

export function defaultProfileBrands(): ProfileBrand[] {
  return [
    {
      id: "brand-city",
      name: "سيتي بريمير",
      notes: CITY_BRAND_NOTES,
      rates: cityPremierProfileBarRates(),
    },
    {
      id: "brand-premier",
      name: "بريمير",
      notes: "قائمة أسعار بريمير — تسعير بالعود · لأي سيستم مربوط ببراند بريمير",
      rates: {
        "frame-hinged": makeProfileBarRate(330, 6),
        "frame-sliding": makeProfileBarRate(372, 6),
        "sash-hinged": makeProfileBarRate(408, 6),
        "sash-door": makeProfileBarRate(450, 6),
        "sash-sliding": makeProfileBarRate(288, 6),
        mullion: makeProfileBarRate(390, 6),
        coupling: makeProfileBarRate(348, 6),
        knife: makeProfileBarRate(210, 6),
        bouclier: makeProfileBarRate(252, 6),
        "bead-single-hinged": makeProfileBarRate(90, 6),
        "bead-single-sliding": makeProfileBarRate(90, 6),
        "bead-double-hinged": makeProfileBarRate(132, 6),
        "bead-double-sliding": makeProfileBarRate(132, 6),
        panel: makeProfileBarRate(132, 6),
        "mesh-sliding-profile": makeProfileBarRate(288, 6),
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

    let rates = normalizeProfileBrandRates(o.rates);
    // ترحيل من prices الرقمية القديمة
    if (Object.keys(rates).length === 0 && o.prices) {
      rates = migrateRatesFromLegacyPrices(normalizeProfileBrandPrices(o.prices));
    }

    out.push({
      id,
      name,
      notes: typeof o.notes === "string" ? o.notes.trim() || undefined : undefined,
      rates,
    });
  }

  return out.length > 0 ? out : defaultProfileBrands();
}

function systemLooksLikeCityPremier(system: MaterialSystem): boolean {
  const n = `${system.name} ${system.notes ?? ""}`;
  return /سيتي|بريمير\s*سيتي|سيتي\s*بريمير/.test(n);
}

export function profileRatesHasPricing(
  rates: Partial<Record<ProfilePriceCategory, ProfileBarRate>> | undefined
): boolean {
  if (!rates) return false;
  return Object.values(rates).some(
    (r) => r != null && r.barPrice > 0 && r.barLengthM > 0
  );
}

export function getProfileSystemRate(
  system: MaterialSystem | undefined | null,
  category: ProfilePriceCategory
): ProfileBarRate | undefined {
  const rate = system?.profile?.rates?.[category];
  if (!rate || rate.barPrice <= 0 || rate.barLengthM <= 0) return undefined;
  return rate;
}

/** سعر المتر الطولي من قائمة أسعار النظام */
export function getProfileSystemPrice(
  system: MaterialSystem | undefined | null,
  category: ProfilePriceCategory
): number {
  const rate = getProfileSystemRate(system, category);
  if (!rate) return 0;
  return profileBarPricePerM(rate.barPrice, rate.barLengthM);
}

export function profileSystemHasPricing(
  system: MaterialSystem | undefined | null
): boolean {
  return profileRatesHasPricing(system?.profile?.rates);
}

export function countProfilePricedCategories(
  system: MaterialSystem | undefined | null
): number {
  const rates = system?.profile?.rates;
  if (!rates) return 0;
  return PROFILE_PRICE_CATEGORIES.filter((c) => {
    const r = rates[c.id];
    return r != null && r.barPrice > 0 && r.barLengthM > 0;
  }).length;
}

function profileBrandHasPricing(brand: ProfileBrand | undefined): boolean {
  if (!brand) return false;
  return profileRatesHasPricing(brand.rates);
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
  const cutDeductions = defaultUnifiedCutDeductions();
  const syncedDeductions = unifiedToProfileDeductions(cutDeductions);
  return {
    cutDeductions,
    profiles: [
      withDefaultProfile({
        id: "pvc1",
        name: "بريمير سيتي",
        notes:
          "سيستم بريمير سيتي — أسعار القطاعات من قائمة سيتي بريمير (فبراير 2025)",
        isDefault: true,
        profile: {
          pieces: [
            ...standardHingedProfilePieces().map((p) => ({
              ...p,
              id: `pvc1-${p.role}`,
            })),
          ],
          deductions: syncedDeductions,
          rates: cityPremierProfileBarRates(),
        },
      }),
      withDefaultProfile({
        id: "pvc2",
        name: "بريمير سلايد",
        notes:
          "سيستم جرار — أسعار القطاعات من قائمة سيتي بريمير (فبراير 2025)",
        profile: {
          pieces: standardSlidingProfilePieces().map((p) => ({
            ...p,
            id: `pvc2-${p.role}`,
          })),
          deductions: syncedDeductions,
          rates: cityPremierProfileBarRates(),
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
        name: "اكسسوار فورنا",
        isDefault: true,
        notes: "أسعار فورنا يوليو 2026 · قواعد المفصلي والجرار",
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
        name: "حديد التسليح",
        notes: IRON_PRICE_LIST_NOTES,
        isDefault: true,
        iron: defaultIronDetails(),
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
  return normalizeProfilePieceRole(raw);
}

function migrateProfilePiece(piece: ProfilePiece): ProfilePiece {
  const rawRole = piece.role as string;
  let role = normalizeProfilePieceRole(piece.role);
  if (rawRole === "threshold") {
    role = "other";
  } else if (
    rawRole === "panel" ||
    /بنل|بانل|panel/i.test(piece.name)
  ) {
    role = "panel";
  }
  const legacyBead =
    piece.role === "bead" ||
    /بيادة|بياة/.test(piece.name) ||
    piece.name.trim() === "باكتة";
  let name = piece.name.trim() || profileRoleDefaultName(role);
  if (legacyBead && role === "bead-single-hinged") {
    name = profileRoleDefaultName("bead-single-hinged");
  }
  if (role === "panel") {
    if (/مفصلي|جرار/i.test(name)) name = "بنل";
    return {
      ...piece,
      role,
      name,
      sectionWidthMm: 150,
    };
  }
  return { ...piece, role, name };
}

function normalizePiece(raw: unknown): ProfilePiece | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.id !== "string" || typeof p.name !== "string") return null;
  if (!p.id.trim() || !p.name.trim()) return null;
  const sectionWidthMm = Number(p.sectionWidthMm);
  const barLengthM = Number(p.barLengthM);
  return migrateProfilePiece({
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
  });
}

function normalizeIronRole(raw: unknown): IronPieceRole {
  if (typeof raw === "string") {
    if (IRON_ROLE_IDS.has(raw)) return raw as IronPieceRole;
    const mapped = LEGACY_IRON_ROLE_MAP[raw];
    if (mapped) return mapped;
  }
  return "frame-hinged";
}

function cloneIronPieceForRole(
  source: IronPiece,
  role: IronPieceRole,
  def: IronPiece
): IronPiece {
  return {
    ...def,
    ...source,
    role,
    id: def.id,
    name: def.name,
  };
}

/** يملأ سعر القائمة الرسمية لو العود مفيش سعر عود محفوظ */
function fillIronOfficialPrice(piece: IronPiece): IronPiece {
  if ((piece.barPrice ?? 0) > 0) {
    return {
      ...piece,
      pricePerM:
        piece.pricePerM && piece.pricePerM > 0
          ? piece.pricePerM
          : profileBarPricePerM(piece.barPrice!, piece.barLengthM),
    };
  }
  const rate = ironOfficialRateForRole(piece.role);
  if (!rate) return piece;
  return {
    ...piece,
    barLengthM: rate.barLengthM,
    barPrice: rate.barPrice,
    pricePerM: profileBarPricePerM(rate.barPrice, rate.barLengthM),
    notes: piece.notes?.trim() || `${rate.code} · ${rate.label}`,
  };
}

/**
 * يوسّع العيدان الموحّدة القديمة (frame/sash) إلى مفصلي/جرار/باب،
 * ويحافظ على التفاصيل والأسعار الموجودة.
 */
function migrateIronPieces(pieces: IronPiece[]): IronPiece[] {
  const defaults = defaultIronPieces();
  const byRole = new Map<IronPieceRole, IronPiece>();

  // قطع خام قبل التطبيع الكامل للدور — نحتاج الـ role الأصلي من التخزين
  const rawFrame: IronPiece[] = [];
  const rawSash: IronPiece[] = [];

  for (const piece of pieces) {
    const rawRole = String(piece.role);
    if (rawRole === "frame") {
      rawFrame.push(piece);
      continue;
    }
    if (rawRole === "sash") {
      rawSash.push(piece);
      continue;
    }
    const role = normalizeIronRole(piece.role);
    const existing = byRole.get(role);
    if (!existing) {
      byRole.set(role, { ...piece, role });
      continue;
    }
    if (!existing.enabled && piece.enabled) {
      byRole.set(role, { ...piece, role });
    } else if (existing.enabled === piece.enabled) {
      const existingArea = existing.sectionWidthMm * existing.sectionHeightMm;
      const nextArea = piece.sectionWidthMm * piece.sectionHeightMm;
      if (nextArea > existingArea) byRole.set(role, { ...piece, role });
      // لو نفس المقاس وواحد فيه سعر — فضّل المُسعَّر
      else if (
        nextArea === existingArea &&
        (piece.barPrice ?? piece.pricePerM ?? 0) >
          (existing.barPrice ?? existing.pricePerM ?? 0)
      ) {
        byRole.set(role, { ...piece, role });
      }
    }
  }

  const pickTemplate = (list: IronPiece[]): IronPiece | undefined => {
    if (list.length === 0) return undefined;
    return list.reduce((best, p) => {
      const bestPrice = best.barPrice ?? best.pricePerM ?? 0;
      const nextPrice = p.barPrice ?? p.pricePerM ?? 0;
      if (nextPrice > bestPrice) return p;
      if (!best.enabled && p.enabled) return p;
      return best;
    });
  };

  const frameTemplate = pickTemplate(rawFrame);
  if (frameTemplate) {
    for (const role of ["frame-hinged", "frame-sliding"] as const) {
      if (!byRole.has(role)) {
        const def = defaults.find((d) => d.role === role)!;
        byRole.set(role, cloneIronPieceForRole(frameTemplate, role, def));
      }
    }
  }

  const sashTemplate = pickTemplate(rawSash);
  if (sashTemplate) {
    for (const role of ["sash-hinged", "sash-door", "sash-sliding"] as const) {
      if (!byRole.has(role)) {
        const def = defaults.find((d) => d.role === role)!;
        byRole.set(role, cloneIronPieceForRole(sashTemplate, role, def));
      }
    }
  }

  return defaults.map((def) => {
    const found = byRole.get(def.role);
    if (!found) return fillIronOfficialPrice(def);
    return fillIronOfficialPrice({
      ...def,
      ...found,
      role: def.role,
      id: found.id?.startsWith("iron-") ? def.id : found.id || def.id,
      name: def.name,
      // لو المحفوظ مفيهوش سعر — خليه من القائمة الافتراضية
      barPrice:
        (found.barPrice ?? 0) > 0 ? found.barPrice : def.barPrice,
      pricePerM:
        (found.barPrice ?? 0) > 0 || (found.pricePerM ?? 0) > 0
          ? found.pricePerM ?? def.pricePerM
          : def.pricePerM,
      barLengthM:
        (found.barPrice ?? 0) > 0
          ? found.barLengthM
          : def.barLengthM || found.barLengthM,
      notes: found.notes?.trim() || def.notes,
    });
  });
}

function normalizeIronPiece(raw: unknown): IronPiece | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.id !== "string" || typeof p.name !== "string") return null;
  if (!p.id.trim() || !p.name.trim()) return null;
  const sectionWidthMm = Number(p.sectionWidthMm);
  const sectionHeightMm = Number(p.sectionHeightMm);
  const barLengthM = Number(p.barLengthM);
  const barPriceRaw = Number(p.barPrice);
  const pricePerMRaw = Number(p.pricePerM);
  const barLength =
    Number.isFinite(barLengthM) && barLengthM > 0
      ? barLengthM
      : IRON_STOCK_BAR_LENGTH_M;

  let barPrice: number | undefined =
    Number.isFinite(barPriceRaw) && barPriceRaw >= 0 ? barPriceRaw : undefined;
  let pricePerM: number | undefined =
    Number.isFinite(pricePerMRaw) && pricePerMRaw >= 0
      ? pricePerMRaw
      : undefined;

  // ترحيل: لو في سعر متر قديم ومفيش سعر عود → استنتج سعر العود
  if (
    (barPrice == null || barPrice <= 0) &&
    pricePerM != null &&
    pricePerM > 0
  ) {
    barPrice = Math.round(pricePerM * barLength * 100) / 100;
  }
  // لو في سعر عود → حدّث سعر المتر المشتق للتوافق
  if (barPrice != null && barPrice > 0) {
    pricePerM = profileBarPricePerM(barPrice, barLength);
  }

  // احتفظ بـ frame/sash الموحّدين مؤقتًا عشان migrateIronPieces يوزّعهم
  const rawRole = typeof p.role === "string" ? p.role.trim() : "";
  const role: IronPieceRole | "frame" | "sash" =
    rawRole === "frame" || rawRole === "sash"
      ? rawRole
      : normalizeIronRole(rawRole || "frame-hinged");

  return {
    id: p.id.trim(),
    name: p.name.trim(),
    role: role as IronPieceRole,
    sectionWidthMm:
      Number.isFinite(sectionWidthMm) && sectionWidthMm >= 0
        ? sectionWidthMm
        : 40,
    sectionHeightMm:
      Number.isFinite(sectionHeightMm) && sectionHeightMm >= 0
        ? sectionHeightMm
        : 20,
    barLengthM: barLength,
    enabled: p.enabled !== false,
    barPrice: barPrice != null && barPrice > 0 ? barPrice : undefined,
    pricePerM: pricePerM != null && pricePerM > 0 ? pricePerM : undefined,
    notes: typeof p.notes === "string" ? p.notes : undefined,
  };
}

function normalizeIronDeductions(raw: unknown): IronDeductions {
  const fallback = defaultIronDeductions();
  if (!raw || typeof raw !== "object") return fallback;
  const d = raw as Record<string, unknown>;
  const ironVars = ["W", "H", "FW", "FH", "SW", "SH", "L"];
  const frame = normalizeAxisFormulas(d.frame, fallback.frame, "frame");
  // معادلات الضلفة تستخدم SW/SH — تحقّق بمتغيرات الحديد
  let sash = fallback.sash;
  if (d.sash && typeof d.sash === "object") {
    const s = d.sash as Record<string, unknown>;
    const width =
      typeof s.width === "string" && s.width.trim()
        ? ensureEqualsPrefix(s.width)
        : fallback.sash.width;
    const height =
      typeof s.height === "string" && s.height.trim()
        ? ensureEqualsPrefix(s.height)
        : fallback.sash.height;
    sash = {
      width: validateFormula(width, ironVars).ok ? width : fallback.sash.width,
      height: validateFormula(height, ironVars).ok
        ? height
        : fallback.sash.height,
    };
  }
  // الحلق FW/FH — الـ normalizeAxisFormulas كفاية، لكن ثبّت أيضاً
  void frame;
  const frameNorm = (() => {
    if (!d.frame || typeof d.frame !== "object") return fallback.frame;
    const f = d.frame as Record<string, unknown>;
    const width =
      typeof f.width === "string" && f.width.trim()
        ? ensureEqualsPrefix(f.width)
        : fallback.frame.width;
    const height =
      typeof f.height === "string" && f.height.trim()
        ? ensureEqualsPrefix(f.height)
        : fallback.frame.height;
    return {
      width: validateFormula(width, ironVars).ok ? width : fallback.frame.width,
      height: validateFormula(height, ironVars).ok
        ? height
        : fallback.frame.height,
    };
  })();

  let mullion = fallback.mullion;
  if (typeof d.mullion === "string" && d.mullion.trim()) {
    const formula = ensureEqualsPrefix(d.mullion);
    const check = validateFormula(formula, ironVars);
    if (check.ok) mullion = formula;
  }
  let hingeStrip = fallback.hingeStrip ?? "=SH-100";
  if (typeof d.hingeStrip === "string" && d.hingeStrip.trim()) {
    const formula = ensureEqualsPrefix(d.hingeStrip);
    const check = validateFormula(formula, ironVars);
    if (check.ok) hingeStrip = formula;
  } else {
    hingeStrip = sash.height;
  }
  return { frame: frameNorm, sash, mullion, hingeStrip };
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
  const tracksRaw = Number(d.tracksPerFrame);
  return {
    pieces: migrateIronPieces(pieces.length > 0 ? pieces : fallback.pieces),
    deductions: normalizeIronDeductions(d.deductions),
    tracksPerFrame:
      Number.isFinite(tracksRaw) && tracksRaw > 0
        ? Math.round(tracksRaw)
        : fallback.tracksPerFrame,
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

function dedupeProfilePiecesByRole(pieces: ProfilePiece[]): ProfilePiece[] {
  const seenRoles = new Set<ProfilePieceRole>();
  const out: ProfilePiece[] = [];
  for (const piece of pieces) {
    if (seenRoles.has(piece.role)) continue;
    seenRoles.add(piece.role);
    out.push(piece);
  }
  return out;
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
    pieces:
      pieces.length > 0 ? dedupeProfilePiecesByRole(pieces) : fallback.pieces,
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
    rates: ensurePanelProfileRate(normalizeProfileBrandRates(d.rates)),
    bouclierCapKitPrice: (() => {
      const n = Number(d.bouclierCapKitPrice);
      return Number.isFinite(n) && n >= 0 ? n : undefined;
    })(),
  };
}

/** يضمن وجود سعر بنل — من الباكتة دبل في نفس النظام لو ناقص */
function ensurePanelProfileRate(
  rates: Partial<Record<ProfilePriceCategory, ProfileBarRate>>
): Partial<Record<ProfilePriceCategory, ProfileBarRate>> {
  if (rates.panel && rates.panel.barPrice > 0 && rates.panel.barLengthM > 0) {
    return rates;
  }
  const fallback =
    rates["bead-double-hinged"] ?? rates["bead-double-sliding"];
  if (!fallback || fallback.barPrice <= 0 || fallback.barLengthM <= 0) {
    return rates;
  }
  return {
    ...rates,
    panel: {
      ...fallback,
      productName: fallback.productName ?? "باكتة بنل",
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
      unitPrice: (() => {
        const n = Number(o.unitPrice);
        return Number.isFinite(n) && n >= 0 ? n : undefined;
      })(),
      sizePrices: normalizeAccessorySizePrices(o.sizePrices),
      notes: typeof o.notes === "string" ? o.notes.trim() || undefined : undefined,
    });
  }

  return out.length > 0 ? out : defaultAccessoryBrands();
}

function normalizeAccessorySizePrices(
  raw: unknown
): Partial<Record<number, number>> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const out: Partial<Record<number, number>> = {};
  for (const [key, val] of Object.entries(o)) {
    const size = Number(key);
    const price = Number(val);
    if (Number.isFinite(size) && size > 0 && Number.isFinite(price) && price >= 0) {
      out[size] = price;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
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
    categoryBrands: (() => {
      const mapped = normalizeCategoryBrands(o.categoryBrands, brands);
      return Object.keys(mapped).length > 0
        ? mapped
        : defaultVorneCategoryBrands();
    })(),
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
    { fromNames: string[]; name: string; notes: string }
  > = {
    pvc1: {
      fromNames: ["نظام PVC مخصص 1"],
      name: "بريمير سيتي",
      notes:
        "سيستم بريمير سيتي — أسعار القطاعات من قائمة سيتي بريمير (فبراير 2025)",
    },
    pvc2: {
      fromNames: ["نظام PVC مخصص 2"],
      name: "بريمير سلايد",
      notes:
        "سيستم جرار — أسعار القطاعات من قائمة سيتي بريمير (فبراير 2025)",
    },
  };

  let list = systems.map((s) => {
    const rule = renames[s.id];
    if (rule && rule.fromNames.includes(s.name)) {
      return {
        ...s,
        name: rule.name,
        notes: s.notes && !rule.fromNames.includes(s.notes) ? s.notes : rule.notes,
      };
    }
    return s;
  });

  if (!list.some((s) => s.isDefault) && list.some((s) => s.id === "pvc1")) {
    list = list.map((s) => ({ ...s, isDefault: s.id === "pvc1" }));
  }

  return list;
}

/**
 * ينقل أسعار البراند القديم إلى داخل كل نظام (`profile.rates`)
 * ويشيل ربط `profileBrandId`.
 */
function foldProfileBrandRatesIntoSystems(
  systems: MaterialSystem[],
  brands: ProfileBrand[]
): MaterialSystem[] {
  const brandById = new Map(brands.map((b) => [b.id, b]));
  const cityBrand =
    brandById.get("brand-city") ??
    brands.find((b) => b.name === "سيتي بريمير" || b.name === "سيتي") ??
    brands.find((b) => profileBrandHasPricing(b));

  return systems.map((s) => {
    const profile = s.profile ?? defaultProfileDetails();
    if (profileRatesHasPricing(profile.rates)) {
      if (!s.profileBrandId) return { ...s, profile };
      return { ...s, profileBrandId: undefined, profile };
    }

    let rates: Partial<Record<ProfilePriceCategory, ProfileBarRate>> = {};

    if (s.profileBrandId) {
      const linked = brandById.get(s.profileBrandId);
      if (linked && profileBrandHasPricing(linked)) {
        rates = { ...linked.rates };
      }
    }

    if (
      !profileRatesHasPricing(rates) &&
      (s.id === "pvc1" || s.id === "pvc2" || systemLooksLikeCityPremier(s))
    ) {
      rates = {
        ...(cityBrand?.rates ?? cityPremierProfileBarRates()),
      };
    }

    return {
      ...s,
      profileBrandId: undefined,
      profile: {
        ...profile,
        rates: profileRatesHasPricing(rates) ? rates : profile.rates ?? {},
      },
    };
  });
}

function normalizeCatalog(raw: MaterialCatalog): MaterialCatalog {
  const defaults = getDefaultCatalog();
  const next = {} as MaterialCatalog;

  const accessoryBrands = migrateVorneAccessoryBrands(
    raw.accessoryBrands === undefined
      ? defaults.accessoryBrands ?? defaultAccessoryBrands()
      : normalizeAccessoryBrands(raw.accessoryBrands)
  );

  const profileBrands = migrateCityPremierProfileBrandPrices(
    raw.profileBrands === undefined
      ? defaults.profileBrands ?? defaultProfileBrands()
      : normalizeProfileBrands(raw.profileBrands)
  );

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
        merged = foldProfileBrandRatesIntoSystems(merged, profileBrands);
      }

      if (cat.id === "iron") {
        merged = collapseIronToSingleSystem(merged);
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
  next.cutDeductions = normalizeUnifiedCutDeductions(raw.cutDeductions);

  // زامن تخصيم كل نظام قطاعات مع التخصيم الموحد
  const synced = unifiedToProfileDeductions(next.cutDeductions);
  next.profiles = next.profiles.map((s) => ({
    ...s,
    profile: {
      ...(s.profile ?? defaultProfileDetails()),
      deductions: synced,
    },
  }));

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
    notifyMaterialCatalogUpdated();
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
  if (category === "iron") return collapseIronToSingleSystem(source.iron ?? []);
  return source[category] ?? [];
}

export function getDefaultSystemId(
  category: MaterialCategory,
  catalog?: MaterialCatalog
): string {
  if (category === "iron") return getIronSystemId(catalog);
  const systems = getSystemsForCategory(category, catalog);
  const marked = systems.find((s) => s.isDefault);
  return marked?.id ?? systems[0]?.id ?? "none";
}

export function findSystem(
  category: MaterialCategory,
  id: string | undefined | null,
  catalog?: MaterialCatalog
): MaterialSystem | undefined {
  if (category === "iron") {
    // الحديد سيستم واحد — أي id (حتى القديم) يرجع النظام الوحيد
    if (!id || id === "none") return getIronSystem(catalog);
    return getIronSystem(catalog);
  }
  if (!id || id === "none") return undefined;
  return getSystemsForCategory(category, catalog).find((s) => s.id === id);
}

export const SINGLE_IRON_SYSTEM_ID = "iron-std";

/**
 * الحديد سيستم واحد بس لكل الشغل — مفيش قياسي/ثقيل/اقتصادي.
 * يحتفظ بأفضل تفاصيل موجودة ويوحّد المعرّف والاسم.
 */
function collapseIronToSingleSystem(systems: MaterialSystem[]): MaterialSystem[] {
  if (systems.length === 0) {
    return [
      {
        id: SINGLE_IRON_SYSTEM_ID,
        name: "حديد التسليح",
        notes: IRON_PRICE_LIST_NOTES,
        isDefault: true,
        iron: defaultIronDetails(),
      },
    ];
  }

  const preferred =
    systems.find((s) => s.id === SINGLE_IRON_SYSTEM_ID) ??
    systems.find((s) => s.isDefault) ??
    systems[0]!;

  const details = preferred.iron ?? defaultIronDetails();

  return [
    {
      ...preferred,
      id: SINGLE_IRON_SYSTEM_ID,
      name: "حديد التسليح",
      notes: preferred.notes?.trim() || IRON_PRICE_LIST_NOTES,
      isDefault: true,
      iron: details,
    },
  ];
}

/** النظام الوحيد للحديد — كل البنود بتتسلح منه */
export function getIronSystem(
  catalog?: MaterialCatalog
): MaterialSystem {
  const cat =
    catalog ??
    (typeof window !== "undefined" ? loadMaterialCatalog() : getDefaultCatalog());
  const list = collapseIronToSingleSystem(cat.iron ?? []);
  return list[0]!;
}

export function getIronSystemId(catalog?: MaterialCatalog): string {
  return getIronSystem(catalog).id;
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
  if (category === "iron") {
    // سيستم واحد فقط — أي حفظ يحدّث نفس النظام ولا يضيف تاني
    toSave = {
      ...getIronSystem(catalog),
      ...toSave,
      id: SINGLE_IRON_SYSTEM_ID,
      name: toSave.name.trim() || "حديد التسليح",
      isDefault: true,
      iron: toSave.iron ?? getIronSystem(catalog).iron ?? defaultIronDetails(),
    };
    return {
      ...catalog,
      iron: [
        {
          ...toSave,
          id: SINGLE_IRON_SYSTEM_ID,
          isDefault: true,
        },
      ],
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
      accessory:
        category === "accessories"
          ? toSave.accessory ?? prev.accessory ?? defaultAccessoryDetails()
          : undefined,
      iron: undefined,
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
  // الحديد سيستم واحد — ممنوع حذفه
  if (category === "iron") return catalog;
  const nextList = (catalog[category] ?? []).filter((s) => s.id !== id);
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
  if (category === "iron") {
    const iron = getIronSystem(cat);
    return [{ id: iron.id, label: iron.name }];
  }
  const systems = getSystemsForCategory(category, cat);
  return [
    { id: "none", label: "تجاهل" },
    ...systems.map((s) => {
      let label = s.name;
      if (s.isDefault) label = `${label} (افتراضي)`;
      if (category === "profiles") {
        const n = countProfilePricedCategories(s);
        if (n > 0) label = `${label} · ${n} سعر`;
      }
      if (category === "glass") {
        const price = getGlassBottlePrice(s);
        if (price > 0) label = `${label} — ${price} ج.م/م²`;
      }
      return { id: s.id, label };
    }),
  ];
}

/** مقاسات القطع بعد التخصيم الموحد من مقاس الفتحة */
export type CutSizes = {
  openingWidthMm: number;
  openingHeightMm: number;
  frameWidthMm: number;
  frameHeightMm: number;
  sashWidthMm: number;
  sashHeightMm: number;
  /** باكتة وزجاج — نفس المقاس */
  beadGlassWidthMm: number;
  beadGlassHeightMm: number;
  deductions: UnifiedCutDeductions;
  errors: {
    frameWidth?: string;
    frameHeight?: string;
    sashWidth?: string;
    sashHeight?: string;
    beadGlassWidth?: string;
    beadGlassHeight?: string;
  };
};

function roundCutMm(n: number): number {
  return Math.max(0, Math.round(n * 1000) / 1000);
}

/**
 * يقبل التخصيم الموحد، أو معادلات قديمة (ProfileDeductions) للتوافق.
 */
export function calcCutSizes(
  openingWidthMm: number,
  openingHeightMm: number,
  deductions?: UnifiedCutDeductions | ProfileDeductions | null
): CutSizes {
  const unified = isUnifiedCutDeductions(deductions)
    ? normalizeUnifiedCutDeductions(deductions)
    : isLegacyProfileDeductions(deductions)
      ? legacyProfileToUnified(deductions)
      : defaultUnifiedCutDeductions();

  const frameWidthMm = roundCutMm(openingWidthMm + unified.frameAddMm);
  const frameHeightMm = roundCutMm(openingHeightMm + unified.frameAddMm);
  const sashWidthMm = roundCutMm(frameWidthMm - unified.sashLessMm);
  const sashHeightMm = roundCutMm(frameHeightMm - unified.sashLessMm);
  const beadGlassWidthMm = roundCutMm(sashWidthMm - unified.beadGlassLessMm);
  const beadGlassHeightMm = roundCutMm(sashHeightMm - unified.beadGlassLessMm);

  return {
    openingWidthMm,
    openingHeightMm,
    frameWidthMm,
    frameHeightMm,
    sashWidthMm,
    sashHeightMm,
    beadGlassWidthMm,
    beadGlassHeightMm,
    deductions: unified,
    errors: {},
  };
}

function isUnifiedCutDeductions(
  value: unknown
): value is UnifiedCutDeductions {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    "frameAddMm" in o || "sashLessMm" in o || "beadGlassLessMm" in o
  );
}

function isLegacyProfileDeductions(
  value: unknown
): value is ProfileDeductions {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return Boolean(o.frame && o.sash);
}

/** يستخرج أرقام بسيطة من معادلات قديمة لو أمكن */
function legacyProfileToUnified(d: ProfileDeductions): UnifiedCutDeductions {
  const fallback = defaultUnifiedCutDeductions();
  const fw = evaluateFormula(ensureEqualsPrefix(d.frame.width), {
    W: 1000,
    H: 1000,
    FW: 1000,
    FH: 1000,
  });
  const sw = evaluateFormula(ensureEqualsPrefix(d.sash.width), {
    W: 1000,
    H: 1000,
    FW: fw.ok ? fw.value : 1000,
    FH: 1000,
  });
  const frameAddMm = fw.ok ? Math.round(fw.value - 1000) : fallback.frameAddMm;
  const sashLessMm = sw.ok
    ? Math.round((fw.ok ? fw.value : 1000) - sw.value)
    : fallback.sashLessMm;
  return {
    frameAddMm: Number.isFinite(frameAddMm) ? Math.max(0, frameAddMm) : fallback.frameAddMm,
    sashLessMm: Number.isFinite(sashLessMm) ? Math.max(0, sashLessMm) : fallback.sashLessMm,
    beadGlassLessMm: fallback.beadGlassLessMm,
  };
}

/** خطوة واحدة في سلسلة حساب مقاس القطع */
export type CutCalculationStep = {
  step: number;
  phase: "frame" | "sash" | "bead-glass";
  label: string;
  formula: string;
  resultMm: number;
  error?: string;
};

/** سلسلة خطوات حساب مقاس الحلق والضلفة والباكتة/الزجاج */
export function getCutCalculationSteps(
  openingWidthMm: number,
  openingHeightMm: number,
  deductions?: UnifiedCutDeductions | ProfileDeductions | null
): CutCalculationStep[] {
  const cuts = calcCutSizes(openingWidthMm, openingHeightMm, deductions);
  const d = cuts.deductions;
  return [
    {
      step: 1,
      phase: "frame",
      label: "عرض الحلق",
      formula: `الفتحة ${openingWidthMm} + ${d.frameAddMm}`,
      resultMm: cuts.frameWidthMm,
    },
    {
      step: 2,
      phase: "frame",
      label: "ارتفاع الحلق",
      formula: `الفتحة ${openingHeightMm} + ${d.frameAddMm}`,
      resultMm: cuts.frameHeightMm,
    },
    {
      step: 3,
      phase: "sash",
      label: "عرض الضلفة",
      formula: `الحلق ${cuts.frameWidthMm} − ${d.sashLessMm}`,
      resultMm: cuts.sashWidthMm,
    },
    {
      step: 4,
      phase: "sash",
      label: "ارتفاع الضلفة",
      formula: `الحلق ${cuts.frameHeightMm} − ${d.sashLessMm}`,
      resultMm: cuts.sashHeightMm,
    },
    {
      step: 5,
      phase: "bead-glass",
      label: "عرض الباكتة / الزجاج",
      formula: `الضلفة ${cuts.sashWidthMm} − ${d.beadGlassLessMm}`,
      resultMm: cuts.beadGlassWidthMm,
    },
    {
      step: 6,
      phase: "bead-glass",
      label: "ارتفاع الباكتة / الزجاج",
      formula: `الضلفة ${cuts.sashHeightMm} − ${d.beadGlassLessMm}`,
      resultMm: cuts.beadGlassHeightMm,
    },
  ];
}

/** نص مختصر لخطوة حساب واحدة */
export function formatCutStepSummary(step: CutCalculationStep): string {
  if (step.error) return `${step.label}: خطأ — ${step.error}`;
  return `${step.label}: ${step.formula} → ${step.resultMm} مم`;
}

/** نصوص مقاس القطع للعرض (عربي بسيط) */
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

/** يحفظ التخصيم الموحد ويزامن أنظمة القطاعات */
export function saveCutDeductions(
  catalog: MaterialCatalog,
  next: UnifiedCutDeductions
): MaterialCatalog {
  return saveMaterialCatalog({
    ...catalog,
    cutDeductions: normalizeUnifiedCutDeductions(next),
  });
}

export function formatBarLength(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return "—";
  return `${m.toFixed(m % 1 === 0 ? 0 : 1)} م`;
}

export function formatSectionMm(mm: number): string {
  if (!Number.isFinite(mm) || mm < 0) return "—";
  return `${mm} مم`;
}
