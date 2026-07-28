/** أنظمة الخامات: قطاعات · اكسسوار · زجاج · حديد */

export type MaterialCategory = "profiles" | "accessories" | "glass" | "iron";

export type MaterialSystem = {
  id: string;
  name: string;
  notes?: string;
  /** النظام الافتراضي (خصوصاً للحديد الثابت غالباً) */
  isDefault?: boolean;
};

export type MaterialCatalog = Record<MaterialCategory, MaterialSystem[]>;

export const MATERIALS_STORAGE_KEY = "upvc-material-systems";

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
    description: "أنظمة البروفيل / الحلق والضلفة",
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

/** القيم الافتراضية — متوافقة مع الاختيارات القديمة في التصميم */
export function getDefaultCatalog(): MaterialCatalog {
  return {
    profiles: [
      { id: "pvc1", name: "نظام PVC مخصص 1" },
      { id: "pvc2", name: "نظام PVC مخصص 2" },
      { id: "pvc3", name: "نظام PVC مخصص 3" },
      { id: "sysA", name: "نظام PVC A" },
      { id: "sysB", name: "نظام PVC B" },
      { id: "sysC", name: "نظام PVC C" },
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

function normalizeSystem(raw: unknown): MaterialSystem | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.id !== "string" || typeof s.name !== "string") return null;
  if (!s.id.trim() || !s.name.trim()) return null;
  return {
    id: s.id.trim(),
    name: s.name.trim(),
    notes: typeof s.notes === "string" ? s.notes : undefined,
    isDefault: Boolean(s.isDefault),
  };
}

function normalizeCatalog(raw: MaterialCatalog): MaterialCatalog {
  const defaults = getDefaultCatalog();
  const next = {} as MaterialCatalog;

  for (const cat of MATERIAL_CATEGORIES) {
    const list = Array.isArray(raw[cat.id]) ? raw[cat.id] : [];
    const seen = new Set<string>();
    const systems: MaterialSystem[] = [];

    for (const item of list) {
      const sys = normalizeSystem(item);
      if (!sys || seen.has(sys.id)) continue;
      seen.add(sys.id);
      systems.push(sys);
    }

    if (systems.length === 0) {
      next[cat.id] = defaults[cat.id];
    } else {
      // ضمان وجود افتراضي واحد على الأكثر لكل فئة
      let foundDefault = false;
      next[cat.id] = systems.map((s) => {
        if (s.isDefault && !foundDefault) {
          foundDefault = true;
          return s;
        }
        return { ...s, isDefault: false };
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

export function upsertSystem(
  catalog: MaterialCatalog,
  category: MaterialCategory,
  system: MaterialSystem
): MaterialCatalog {
  const list = [...(catalog[category] ?? [])];
  const idx = list.findIndex((s) => s.id === system.id);
  let nextList: MaterialSystem[];

  if (idx >= 0) {
    nextList = list.map((s, i) => (i === idx ? system : s));
  } else {
    nextList = [...list, system];
  }

  if (system.isDefault) {
    nextList = nextList.map((s) =>
      s.id === system.id ? { ...s, isDefault: true } : { ...s, isDefault: false }
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
  // لو اتحذف الافتراضي، خلّي أول عنصر افتراضي (حديد خصوصاً)
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
