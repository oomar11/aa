/** أنظمة الخامات: قطاعات · اكسسوار · زجاج · حديد */

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
 * التخصيمات بالمليمتر.
 * الحلق = مقاس الفتحة − تخصيم الحلق
 * الضلفة = مقاس الحلق − تخصيم الضلفة
 */
export type ProfileDeductions = {
  frame: {
    /** خصم من العرض: عرض الحلق = عرض الفتحة − القيمة */
    widthMm: number;
    /** خصم من الارتفاع: ارتفاع الحلق = ارتفاع الفتحة − القيمة */
    heightMm: number;
  };
  sash: {
    /** خصم من العرض: عرض الضلفة = عرض الحلق − القيمة */
    widthMm: number;
    /** خصم من الارتفاع: ارتفاع الضلفة = ارتفاع الحلق − القيمة */
    heightMm: number;
  };
};

export type ProfileSystemDetails = {
  pieces: ProfilePiece[];
  deductions: ProfileDeductions;
};

export type MaterialSystem = {
  id: string;
  name: string;
  notes?: string;
  /** النظام الافتراضي (خصوصاً للحديد الثابت غالباً) */
  isDefault?: boolean;
  /** تفاصيل نظام القطاعات: العيدان + التخصيمات */
  profile?: ProfileSystemDetails;
};

export type MaterialCatalog = Record<MaterialCategory, MaterialSystem[]>;

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
    description: "أنواع الزجاج المستخدمة في التصميم",
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
    frame: { widthMm: 0, heightMm: 0 },
    sash: { widthMm: 10, heightMm: 10 },
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

function withDefaultProfile(system: MaterialSystem): MaterialSystem {
  if (system.profile) return system;
  return { ...system, profile: defaultProfileDetails() };
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
            frame: { widthMm: 0, heightMm: 0 },
            sash: { widthMm: 10, heightMm: 10 },
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
            frame: { widthMm: 0, heightMm: 0 },
            sash: { widthMm: 40, heightMm: 60 },
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
      { id: "g464", name: "زجاج عادي 4-6-4" },
      { id: "g46464", name: "زجاج عادي 4-6-4-6-4" },
      { id: "g-tempered", name: "زجاج سيكوريت" },
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

function normalizeAxis(
  raw: unknown,
  fallback: { widthMm: number; heightMm: number }
): { widthMm: number; heightMm: number } {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const a = raw as Record<string, unknown>;
  const w = Number(a.widthMm);
  const h = Number(a.heightMm);
  return {
    widthMm: Number.isFinite(w) && w >= 0 ? w : fallback.widthMm,
    heightMm: Number.isFinite(h) && h >= 0 ? h : fallback.heightMm,
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
      frame: normalizeAxis(deductionsRaw.frame, fallback.deductions.frame),
      sash: normalizeAxis(deductionsRaw.sash, fallback.deductions.sash),
    },
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
        const withProfile =
          cat.id === "profiles" && !s.profile
            ? { ...s, profile: defaultProfileDetails() }
            : s;
        if (withProfile.isDefault && !foundDefault) {
          foundDefault = true;
          return withProfile;
        }
        return { ...withProfile, isDefault: false };
      });
    }
  }

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

export function upsertSystem(
  catalog: MaterialCatalog,
  category: MaterialCategory,
  system: MaterialSystem
): MaterialCatalog {
  const toSave: MaterialSystem =
    category === "profiles" && !system.profile
      ? { ...system, profile: defaultProfileDetails() }
      : system;

  const list = [...(catalog[category] ?? [])];
  const idx = list.findIndex((s) => s.id === toSave.id);
  let nextList: MaterialSystem[];

  if (idx >= 0) {
    // احتفظ بتفاصيل القطاعات لو التعديل ماجابش profile جديد كامل
    const prev = list[idx]!;
    const merged: MaterialSystem = {
      ...prev,
      ...toSave,
      profile:
        category === "profiles"
          ? toSave.profile ?? prev.profile ?? defaultProfileDetails()
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
    ...systems.map((s) => ({
      id: s.id,
      label: s.isDefault ? `${s.name} (افتراضي)` : s.name,
    })),
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
};

export function calcCutSizes(
  openingWidthMm: number,
  openingHeightMm: number,
  deductions: ProfileDeductions
): CutSizes {
  const frameWidthMm = Math.max(0, openingWidthMm - deductions.frame.widthMm);
  const frameHeightMm = Math.max(
    0,
    openingHeightMm - deductions.frame.heightMm
  );
  const sashWidthMm = Math.max(0, frameWidthMm - deductions.sash.widthMm);
  const sashHeightMm = Math.max(0, frameHeightMm - deductions.sash.heightMm);
  return {
    openingWidthMm,
    openingHeightMm,
    frameWidthMm,
    frameHeightMm,
    sashWidthMm,
    sashHeightMm,
    deductions,
  };
}

/** نصوص معادلات التخصيم للعرض */
export function frameWidthFormula(d: ProfileDeductions): string {
  if (d.frame.widthMm <= 0) return "عرض الحلق = عرض الفتحة";
  return `عرض الحلق = عرض الفتحة − ${d.frame.widthMm} مم`;
}

export function frameHeightFormula(d: ProfileDeductions): string {
  if (d.frame.heightMm <= 0) return "ارتفاع الحلق = ارتفاع الفتحة";
  return `ارتفاع الحلق = ارتفاع الفتحة − ${d.frame.heightMm} مم`;
}

export function sashWidthFormula(d: ProfileDeductions): string {
  if (d.sash.widthMm <= 0) return "عرض الضلفة = عرض الحلق";
  return `عرض الضلفة = عرض الحلق − ${d.sash.widthMm} مم`;
}

export function sashHeightFormula(d: ProfileDeductions): string {
  if (d.sash.heightMm <= 0) return "ارتفاع الضلفة = ارتفاع الحلق";
  return `ارتفاع الضلفة = ارتفاع الحلق − ${d.sash.heightMm} مم`;
}

export function formatBarLength(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return "—";
  return `${m.toFixed(m % 1 === 0 ? 0 : 1)} م`;
}

export function formatSectionMm(mm: number): string {
  if (!Number.isFinite(mm) || mm < 0) return "—";
  return `${mm} مم`;
}
