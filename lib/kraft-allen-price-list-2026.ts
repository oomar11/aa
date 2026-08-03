/**
 * قائمة أسعار قطاعات كرافت الين — تحديث 7 / 4 / 2026
 * المصدر: قائمة أسعار قطاعات كرافت الين
 * التسعير بالعود · طول العود 6 م · سعر المتر = سعر العود ÷ 6
 *
 * الألوان في القائمة: أبيض/بيج · خشبي · جراي/أسود
 * المعدّل الافتراضي في البرنامج = أبيض/بيج (الأكثر استخدامًا).
 */

import type {
  ProfileBarRate,
  ProfilePriceCategory,
} from "@/lib/material-systems";

export const KRAFT_ALLEN_PRICE_LIST_DATE = "2026-04-07";

export const KRAFT_ALLEN_BAR_LENGTH_M = 6;

export const KRAFT_ALLEN_PRICE_LIST_NOTES =
  "قائمة أسعار قطاعات كرافت الين — تحديث 7/4/2026 · تسعير بالعود (طول العود 6 م) · ألوان القائمة: أبيض/بيج (افتراضي) · خشبي · جراي/أسود";

export type KraftAllenOfficialBarRate = {
  code: string;
  label: string;
  /** سعر العود (ج.م) — أبيض/بيج */
  barPrice: number;
  /** سعر المتر (ج.م) — أبيض/بيج */
  pricePerM: number;
  barLengthM: number;
};

function row(
  code: string,
  label: string,
  pricePerM: number,
  barPrice: number
): KraftAllenOfficialBarRate {
  return {
    code,
    label,
    pricePerM,
    barPrice,
    barLengthM: KRAFT_ALLEN_BAR_LENGTH_M,
  };
}

/** نظام المفصلي — أبيض/بيج */
export const KRAFT_ALLEN_HINGED_WHITE_BEIGE: KraftAllenOfficialBarRate[] = [
  row("KL610", "حلق مفصلي بدون بار", 110.79, 664.75),
  row("KL611", "حلق مفصلي ببار 5 سم", 137.52, 825.11),
  row("KL612", "حلق مفصلي ببار مقلوب 5 سم", 143.89, 863.35),
  row("KL613", "ضلفة شباك مفصلي", 141.35, 848.13),
  row("KL615", "ضلفة باب مفصلي فتح للداخل", 160.46, 962.78),
  row("KL616", "ضلفة باب مفصلي فتح للخارج", 171.91, 1031.45),
  row("KL614", "سقاس مفصلي", 132.43, 794.56),
  row("KL617", "بوكلير مفصلي", 112.06, 672.38),
  row("KL618", "باكتة سنجل مفصلي", 39.48, 236.89),
  row("KL619", "باكتة دبل مفصلي", 32.09, 192.55),
  row("KL310", "بانل 15 سم", 92.95, 557.73),
];

/** نظام الجرار — أبيض/بيج */
export const KRAFT_ALLEN_SLIDING_WHITE_BEIGE: KraftAllenOfficialBarRate[] = [
  row("KL-S731", "حلق 2 مجرى ببار 5 سم", 144.54, 867.22),
  row("KL-S732", "حلق 3 مجرى بدون بار", 154.08, 924.49),
  row("KL-S733", "حلق 3 مجرى ببار 5 سم", 182.09, 1092.55),
  row("KL-S735", "ضلفة جرار كبيرة", 146.44, 878.62),
  row("KL-S738", "باكتة سنجل جرار", 32.23, 193.36),
  row("KL-S737", "باكتة دبل جرار", 26.74, 160.42),
  row("KL-S336", "طبة + سكينة", 43.3, 259.8),
  row("KL-S739", "ضلفة سلك كبيرة", 74.5, 447.0),
  row("KL-S514", "سقاس جرار", 112.06, 672.38),
  row("KL-S734", "حلق جرار 3 ضلفة زجاج", 184.53, 1107.16),
  row("KL-S741", "سؤاس ضلفة سلك", 59.85, 359.13),
];

/**
 * القطاعات التكميلية — سعر المتر أبيض/بيج من القائمة
 * (سعر العود = سعر المتر × 6)
 */
export const KRAFT_ALLEN_COMPLEMENTARY_WHITE_BEIGE: KraftAllenOfficialBarRate[] =
  [
    row("KL314", "م اسورة CRP", 85.32, 511.92),
    row("KL315", "كورنر CRP", 85.32, 511.92),
    row("KL311", "برور خارجي كلبس", 43.3, 259.8),
    row("KL315-6x9", "برور 6 × 9", 91.69, 550.14),
    row("KL312", "كوبلن", 25.47, 152.82),
    row("KL313", "تجميع ثابت مع جرار", 70.04, 420.24),
    row("KL317", "علبة 7.5 سم × 7.5 سم", 137.52, 825.12),
    row("KL318", "تراك ضلفة سلك لطش", 22.92, 137.52),
  ];

function rate(
  barPrice: number,
  productName: string
): ProfileBarRate {
  return {
    barPrice,
    barLengthM: KRAFT_ALLEN_BAR_LENGTH_M,
    productName,
  };
}

/**
 * أسعار فئات البرنامج من قائمة كرافت الين (أبيض/بيج).
 * الاختيار يطابق الاستخدام الشائع (حلق ببار · ضلفة باب فتح للداخل · حلق جرار 3 مجرى ببار).
 */
export function kraftAllenProfileBarRates(): Partial<
  Record<ProfilePriceCategory, ProfileBarRate>
> {
  return {
    // مفصلي
    "frame-hinged": rate(825.11, "KL611 حلق مفصلي ببار 5 سم"),
    "sash-hinged": rate(848.13, "KL613 ضلفة شباك مفصلي"),
    "sash-door": rate(962.78, "KL615 ضلفة باب مفصلي فتح للداخل"),
    bouclier: rate(672.38, "KL617 بوكلير مفصلي"),
    "mullion-hinged": rate(794.56, "KL614 سقاس مفصلي"),
    "bead-single-hinged": rate(236.89, "KL618 باكتة سنجل مفصلي"),
    "bead-double-hinged": rate(192.55, "KL619 باكتة دبل مفصلي"),
    panel: rate(557.73, "KL310 بانل 15 سم"),
    coupling: rate(152.82, "KL312 كوبلن"),
    // جرار
    "frame-sliding": rate(1092.55, "KL-S733 حلق 3 مجرى ببار 5 سم"),
    "sash-sliding": rate(878.62, "KL-S735 ضلفة جرار كبيرة"),
    "mullion-sliding": rate(672.38, "KL-S514 سقاس جرار"),
    knife: rate(259.8, "KL-S336 طبة + سكينة"),
    "bead-single-sliding": rate(193.36, "KL-S738 باكتة سنجل جرار"),
    "bead-double-sliding": rate(160.42, "KL-S737 باكتة دبل جرار"),
    "mesh-sliding-profile": rate(447.0, "KL-S739 ضلفة سلك كبيرة"),
    "mesh-meeting": rate(359.13, "KL-S741 سؤاس ضلفة سلك"),
  };
}
