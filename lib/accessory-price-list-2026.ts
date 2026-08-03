/**
 * قائمة أسعار اكسسوارات UPVC — يوليو 2026 (فورنا / VORNE)
 * المصدر: قائمة أسعار الاكسسوارات 2026 — تسليم أرض المصنع
 */

import type { AccessoryBrand, AccessoryBrandCategory } from "@/lib/material-systems";

export const VORNE_PRICE_LIST_NOTES =
  "قائمة أسعار فورنا يوليو 2026 — تسليم أرض المصنع (بدون نقل)";

/** أسعار سبلونة مفصلي وجرار اكس 15.5 (ج.م/قطعة) */
export const VORNE_ESPAGNOLETTE_STANDARD_PRICES: Record<number, number> = {
  30: 42.3,
  40: 47.8,
  60: 58.4,
  80: 68.4,
  100: 79.2,
  120: 92.3,
  140: 105.6,
  160: 116.7,
  180: 126.7,
  200: 150,
};

/** أسعار سبلونة مفصلي قلاب — رينج maxDimMm (بريمير 2026) */
export const VORNE_TILT_ESPAGNOLETTE_PRICES: Record<number, number> = {
  700: 53.4,
  800: 73.4,
  1200: 108.9,
  1400: 122.3,
  1700: 161.2,
  2200: 205.6,
};

/** أسعار مقص قلاب — رينج maxDimMm (بريمير 2026) */
export const VORNE_TILT_SCISSORS_PRICES: Record<number, number> = {
  600: 138.9,
  650: 144.5,
  850: 172.3,
  1100: 222.3,
};

/** أسعار سبلونة جرار اكس 7.5 (ج.م/قطعة) */
export const VORNE_ESPAGNOLETTE_SLIDING_75_PRICES: Record<number, number> = {
  40: 60,
  60: 71.2,
  80: 82.3,
  100: 91.2,
  120: 105,
  140: 116.7,
  160: 127.8,
  180: 138.9,
};

export function vorneEspagnolettePrice(
  size: number,
  slidingAxe75 = false
): number | undefined {
  const table = slidingAxe75
    ? VORNE_ESPAGNOLETTE_SLIDING_75_PRICES
    : VORNE_ESPAGNOLETTE_STANDARD_PRICES;
  return table[size];
}

/** سعر وحدة البراند — يدعم أسعار السبلونة حسب المقاس */
export function accessoryBrandResolvedPrice(
  brand: Pick<AccessoryBrand, "unitPrice" | "sizePrices"> | undefined,
  size?: number
): number | null {
  if (!brand) return null;
  if (size != null && brand.sizePrices?.[size] != null) {
    const p = brand.sizePrices[size]!;
    return p > 0 ? p : null;
  }
  if (brand.unitPrice != null && brand.unitPrice > 0) return brand.unitPrice;
  return null;
}

function brand(
  id: string,
  name: string,
  category: AccessoryBrandCategory,
  unitPrice?: number,
  sizePrices?: Record<number, number>,
  notes?: string
): AccessoryBrand {
  return {
    id,
    name,
    category,
    unitPrice,
    sizePrices,
    notes,
  };
}

/** براندات فورنا الافتراضية لكل فئة اكسسوار */
export function defaultVorneAccessoryBrands(): AccessoryBrand[] {
  return [
    brand(
      "brand-vorne-hinge",
      "مفصلة",
      "hinge",
      undefined,
      undefined,
      "مفصلة عادية للشباك والباب — نفس القطعة؛ العدد ٢ شباك / ٣–٤ باب"
    ),
    brand(
      "brand-vorne-tilt-esp",
      "سبلونة مفصلي قلاب",
      "tilt-espagnolette",
      undefined,
      { ...VORNE_TILT_ESPAGNOLETTE_PRICES },
      "مجموعة المفصلي القلاب T&T — بريمير/فورنا 2026"
    ),
    brand(
      "brand-vorne-tilt-scissors",
      "مقص قلاب",
      "tilt-scissors",
      undefined,
      { ...VORNE_TILT_SCISSORS_PRICES },
      "مجموعة المفصلي القلاب T&T — بريمير/فورنا 2026"
    ),
    brand(
      "brand-vorne-tilt-top-hinge",
      "مفصلة علوية 9 axis (جزء الضلفة)",
      "tilt-top-hinge",
      23.4,
      undefined,
      "مجموعة المفصلي القلاب T&T"
    ),
    brand(
      "brand-vorne-tilt-top-frame-hinge",
      "مفصلة علوية (جزء الحلق)",
      "tilt-top-frame-hinge",
      36.7,
      undefined,
      "مجموعة المفصلي القلاب T&T"
    ),
    brand(
      "brand-vorne-tilt-bottom-frame-hinge",
      "مفصلة سفلية (جزء الحلق)",
      "tilt-bottom-frame-hinge",
      33.4,
      undefined,
      "مجموعة المفصلي القلاب T&T"
    ),
    brand(
      "brand-vorne-tilt-bottom-sash-hinge",
      "مفصلة سفلية (جزء الضلفة)",
      "tilt-bottom-sash-hinge",
      33.4,
      undefined,
      "مجموعة المفصلي القلاب T&T"
    ),
    brand(
      "brand-vorne-tilt-corner-upper",
      "كورنر علوي",
      "tilt-corner-upper",
      72.3,
      undefined,
      "مجموعة المفصلي القلاب T&T"
    ),
    brand(
      "brand-vorne-tilt-corner-lower",
      "كورنر سفلي",
      "tilt-corner-lower",
      94.5,
      undefined,
      "مجموعة المفصلي القلاب T&T"
    ),
    brand(
      "brand-vorne-tilt-corner-striker",
      "سكاك كورنر سفلي 9 اكس",
      "tilt-corner-striker",
      26.7,
      undefined,
      "مجموعة المفصلي القلاب T&T"
    ),
    brand(
      "brand-vorne-tilt-hinge-pin",
      "مفصلة علوية بنز",
      "tilt-hinge-pin",
      7.8,
      undefined,
      "مجموعة المفصلي القلاب T&T"
    ),
    brand(
      "brand-vorne-tilt-hinge-cover",
      "غطاء مفصلة أبيض",
      "tilt-hinge-cover",
      13.4,
      undefined,
      "مجموعة المفصلي القلاب T&T — أبيض افتراضي"
    ),
    brand(
      "brand-vorne-hinged-esp",
      "سبلونة مفصلي فورنا",
      "hinged-espagnolette",
      undefined,
      { ...VORNE_ESPAGNOLETTE_STANDARD_PRICES }
    ),
    brand(
      "brand-vorne-hinged-lock",
      "سكاك مفصلي زنك",
      "hinged-lock",
      5,
      undefined,
      "سكاك مفصلي — فورنا"
    ),
    brand(
      "brand-vorne-protruding-handle",
      "مقبض بارز بصمة ثقيل",
      "protruding-handle",
      46.7,
      undefined,
      "KayaPen — أبيض/بيج"
    ),
    brand(
      "brand-vorne-door-cylinder",
      "كالون باب",
      "door-cylinder",
      undefined,
      undefined,
      "كالون ضلفة الباب المفصلي — حدّث السعر"
    ),
    brand(
      "brand-vorne-door-signal-handle",
      "مقبض إشارة",
      "door-signal-handle",
      undefined,
      undefined,
      "لون المقبض = لون الباب"
    ),
    brand(
      "brand-vorne-door-escutcheon",
      "وش تسكيك",
      "door-escutcheon",
      undefined,
      undefined,
      "وش تسكيك ضلفة الباب المفصلي — حدّث السعر"
    ),
    brand(
      "brand-vorne-bouclier-lock",
      "سكاك مفصلي بوكلن",
      "bouclier-lock",
      10,
      undefined,
      "زنكي مفصلي — فورنا"
    ),
    brand(
      "brand-vorne-bouclier-bolt",
      "ترباس علوي وسفلي 110مم",
      "bouclier-bolt",
      38.9,
      undefined,
      "ترباس بوكلير — فورنا"
    ),
    brand(
      "brand-vorne-bouclier-bolt-lock",
      "سكاك ترباس زنك",
      "bouclier-bolt-lock",
      26.7,
      undefined,
      "سكاك ترباس — فورنا"
    ),
    brand(
      "brand-vorne-roller",
      "عجلة جرار سنجل نحاس",
      "roller",
      18.4,
      undefined,
      "SHAHBAZ — 50-70 كجم"
    ),
    brand(
      "brand-vorne-brush",
      "كاوتش قطاعات TPE",
      "brush",
      6.8,
      undefined,
      "فرش جرار — بالمتر"
    ),
    brand(
      "brand-vorne-sliding-esp",
      "سبلونة جرار اكس 15.5",
      "sliding-espagnolette",
      undefined,
      { ...VORNE_ESPAGNOLETTE_STANDARD_PRICES },
      "Casement/Sliding Axe 15.5"
    ),
    brand(
      "brand-vorne-sliding-lock",
      "سكاك جرار",
      "sliding-lock",
      14.2,
      undefined,
      "سكاك جرار — فورنا"
    ),
    brand(
      "brand-vorne-recessed-handle",
      "مقبض غاطس ألومنيوم",
      "recessed-handle",
      56,
      undefined,
      "KayaPen — أبيض/بيج"
    ),
  ];
}

/** ربط افتراضي لبراندات فورنا بكل فئة */
export function defaultVorneCategoryBrands(): Partial<
  Record<AccessoryBrandCategory, string>
> {
  const brands = defaultVorneAccessoryBrands();
  const out: Partial<Record<AccessoryBrandCategory, string>> = {};
  for (const b of brands) {
    out[b.category] = b.id;
  }
  return out;
}

/**
 * دمج براندات فورنا الافتراضية مع القائمة المحفوظة:
 * - إضافة البراندات الناقصة
 * - تحديث أسعار براندات فورنا المعروفة دون مسح تعديلات المستخدم على براندات أخرى
 */
export function migrateVorneAccessoryBrands(
  existing: AccessoryBrand[]
): AccessoryBrand[] {
  const defaults = defaultVorneAccessoryBrands();
  const byId = new Map(existing.map((b) => [b.id, b]));
  const merged: AccessoryBrand[] = [];

  for (const def of defaults) {
    const prev = byId.get(def.id);
    if (!prev) {
      merged.push(def);
      continue;
    }
    // تصحيح هجرة: براند المفصلة كان متسمّي بقطعة القلاب اكس 9
    const forceHingeRename =
      def.id === "brand-vorne-hinge" &&
      /9\s*axis|علوية|T&T|قلاب/i.test(prev.name);
    merged.push({
      ...prev,
      name: forceHingeRename ? def.name : prev.name || def.name,
      category: def.category,
      unitPrice: forceHingeRename
        ? def.unitPrice
        : prev.unitPrice != null && prev.unitPrice > 0
          ? prev.unitPrice
          : def.unitPrice,
      sizePrices:
        prev.sizePrices && Object.keys(prev.sizePrices).length > 0
          ? prev.sizePrices
          : def.sizePrices,
      notes: forceHingeRename ? def.notes : (prev.notes ?? def.notes),
    });
    byId.delete(def.id);
  }

  for (const rest of byId.values()) {
    // التراك انتقل للحديد — لا نبقي براندات تراك في الاكسسوار
    if ((rest.category as string) === "track") continue;
    // سكاك قلاب وهمي — استُبدل بسكاك كورنر سفلي
    if ((rest.category as string) === "tilt-lock") continue;
    if (rest.id === "brand-vorne-tilt-lock") continue;
    if (
      (rest.category as string) === "tilt-esp-triple-sash" ||
      (rest.category as string) === "tilt-esp-triple-frame"
    )
      continue;
    if (
      rest.id === "brand-vorne-tilt-esp-triple-sash" ||
      rest.id === "brand-vorne-tilt-esp-triple-frame"
    )
      continue;
    merged.push(rest);
  }

  return merged.length > 0 ? merged : defaults;
}
