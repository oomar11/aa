/**
 * قائمة أسعار قطاعات أكسا إيجيبت — تحديث 7 / 4 / 2026
 * المصدر: شركة أكسا إيجيبت للاستيراد والتصدير
 * التسعير بالعود · طول العود 6 م · سعر المتر = سعر العود ÷ 6
 *
 * الألوان في القائمة: بيج/أبيض · خشابي · رمادي · أرو
 * المعدّل الافتراضي في البرنامج = بيج/أبيض (الأكثر استخدامًا).
 */

import type {
  ProfileBarRate,
  ProfilePriceCategory,
} from "@/lib/material-systems";

export const AKSA_EGYPT_PRICE_LIST_DATE = "2026-04-07";

export const AKSA_EGYPT_BAR_LENGTH_M = 6;

export const AKSA_EGYPT_PRICE_LIST_NOTES =
  "قائمة أسعار قطاعات أكسا إيجيبت — تحديث 7/4/2026 · تسعير بالعود (طول العود 6 م) · شامل الكاوتش · بدون ضريبة مبيعات وبدون نقل · ألوان القائمة: بيج/أبيض (افتراضي) · خشابي · رمادي · أرو";

export type AksaEgyptOfficialBarRate = {
  code: string;
  label: string;
  /** سعر العود (ج.م) — بيج/أبيض */
  barPrice: number;
  /** سعر المتر (ج.م) — بيج/أبيض */
  pricePerM: number;
  barLengthM: number;
};

function row(
  code: string,
  label: string,
  pricePerM: number,
  barPrice: number
): AksaEgyptOfficialBarRate {
  return {
    code,
    label,
    pricePerM,
    barPrice,
    barLengthM: AKSA_EGYPT_BAR_LENGTH_M,
  };
}

/** نظام المفصلي — بيج/أبيض */
export const AKSA_EGYPT_HINGED_WHITE_BEIGE: AksaEgyptOfficialBarRate[] = [
  row("AX-H01", "حلق مفصلي بدون برور", 176.42, 1058.51),
  row("AX-H02", "حلق مفصلي ببرور 3.8 سم", 190.65, 1143.89),
  row("AX-H03", "حلق مفصلي ببرور كبير 6 سم", 221.2, 1327.2),
  row("AX-H04", "حلق مفصلي ببار 6 سم مقلوب", 254.44, 1526.63),
  row("AX-H05", "ضلفة شباك مفصلي", 230.17, 1381.03),
  row("AX-H06", "ضلفة باب مفصلي فتح للداخل", 276.87, 1661.2),
  row("AX-H07", "ضلفة باب مفصلي فتح للخارج", 276.87, 1661.2),
  row("AX-H08", "باكتة سنجل مفصلي", 57.37, 344.23),
  row("AX-H09", "باكتة دبل مفصلي", 49.81, 298.86),
  row("AX-H10", "سقاس مفصلي", 219.38, 1316.29),
  row("AX-H11", "بوكلير مفصلي", 182.01, 1092.06),
  row("AX-H12", "بانل 10 سم", 118.4, 710.4),
];

/** نظام الجرار — بيج/أبيض */
export const AKSA_EGYPT_SLIDING_WHITE_BEIGE: AksaEgyptOfficialBarRate[] = [
  row("AX-S01", "حلق جرار 2 مجرى بدون برور", 176.42, 1058.51),
  row("AX-S02", "حلق جرار 2 مجرى ببرور", 226.96, 1361.77),
  row("AX-S03", "حلق جرار 3 مجرى بدون برور", 254.44, 1526.63),
  row("AX-S04", "حلق جرار 3 ضلفة زجاج", 329.22, 1975.31),
  row("AX-S05", "حلق جرار 3 مجرى ببرور 6 سم", 319.25, 1915.49),
  row("AX-S06", "حلق جرار 3 مجرى ببرور 4 سم", 296.79, 1780.74),
  row("AX-S07", "ضلفة شباك جرار", 221.89, 1331.31),
  row("AX-S08", "ضلفة جرار كبيرة", 254.44, 1526.63),
  row("AX-S09", "حلق مونوريل", 269.31, 1615.89),
  row("AX-S10", "سقاس مونو ريل", 326.76, 1960.57),
  row("AX-S11", "سقاس جرار", 187.03, 1122.17),
  row("AX-S12", "باكتة سنجل جرار", 44.95, 269.71),
  row("AX-S13", "باكتة دبل جرار", 39.65, 237.89),
  row("AX-S14", "طبة + سكينة", 68.33, 410.0),
  row("AX-S15", "طبة + سكينة كبيرة", 93.58, 561.49),
  row("AX-S16", "ضلفة سلك", 87.3, 523.83),
  row("AX-S17", "ضلفة سلك كبيرة", 118.79, 712.74),
  row("AX-S18", "سقاس ضلفة سلك", 84.72, 508.34),
  row("AX-S19", "تراك سلك لطش", 53.88, 323.26),
];

/**
 * القطاعات التكميلية — سعر المتر بيج/أبيض من القائمة
 * (سعر العود = سعر المتر × 6)
 */
export const AKSA_EGYPT_COMPLEMENTARY_WHITE_BEIGE: AksaEgyptOfficialBarRate[] =
  [
    row("AX-C01", "ماسورة CRB", 97.27, 583.62),
    row("AX-C02", "كورنر CRB", 97.27, 583.62),
    row("AX-C03", "برور خارجي كلبس", 44.75, 268.5),
    row("AX-C04", "برور عريض 6 × 9 سم", 124.85, 749.1),
    row("AX-C05", "كلبس مفصلي", 6.81, 40.86),
    row("AX-C06", "علبة 7.45 × 7.45", 179.58, 1077.48),
    row("AX-C09", "كوبلن (تجميع مفصلي مع جرار)", 37.47, 224.82),
    row("AX-C10", "تجميع ثابت مع جرار", 72.74, 436.44),
  ];

function rate(barPrice: number, productName: string): ProfileBarRate {
  return {
    barPrice,
    barLengthM: AKSA_EGYPT_BAR_LENGTH_M,
    productName,
  };
}

/**
 * أسعار فئات البرنامج من قائمة أكسا إيجيبت (بيج/أبيض).
 * الاختيار يطابق الاستخدام الشائع (حلق ببرور · ضلفة باب فتح للداخل · حلق جرار 3 مجرى ببرور).
 */
export function aksaEgyptProfileBarRates(): Partial<
  Record<ProfilePriceCategory, ProfileBarRate>
> {
  return {
    // مفصلي
    "frame-hinged": rate(1143.89, "AX-H02 حلق مفصلي ببرور 3.8 سم"),
    "sash-hinged": rate(1381.03, "AX-H05 ضلفة شباك مفصلي"),
    "sash-door": rate(1661.2, "AX-H06 ضلفة باب مفصلي فتح للداخل"),
    bouclier: rate(1092.06, "AX-H11 بوكلير مفصلي"),
    "mullion-hinged": rate(1316.29, "AX-H10 سقاس مفصلي"),
    "bead-single-hinged": rate(344.23, "AX-H08 باكتة سنجل مفصلي"),
    "bead-double-hinged": rate(298.86, "AX-H09 باكتة دبل مفصلي"),
    panel: rate(710.4, "AX-H12 بانل 10 سم"),
    coupling: rate(224.82, "AX-C09 كوبلن"),
    // جرار
    "frame-sliding": rate(1915.49, "AX-S05 حلق جرار 3 مجرى ببرور 6 سم"),
    "sash-sliding": rate(1526.63, "AX-S08 ضلفة جرار كبيرة"),
    "mullion-sliding": rate(1122.17, "AX-S11 سقاس جرار"),
    knife: rate(410.0, "AX-S14 طبة + سكينة"),
    "bead-single-sliding": rate(269.71, "AX-S12 باكتة سنجل جرار"),
    "bead-double-sliding": rate(237.89, "AX-S13 باكتة دبل جرار"),
    "mesh-sliding-profile": rate(712.74, "AX-S17 ضلفة سلك كبيرة"),
    "mesh-meeting": rate(508.34, "AX-S18 سقاس ضلفة سلك"),
  };
}
