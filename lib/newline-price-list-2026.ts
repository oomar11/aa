/**
 * قائمة أسعار قطاعات نيولاين — تحديث 7 / 4 / 2026
 * المصدر: قائمة أسعار نيولاين (أبيض / بيج)
 * التسعير بالعود · طول العود 6 م · سعر المتر = سعر العود ÷ 6
 *
 * بعض البنود بتشير لكود كرافت الين (KL…) — الأسعار من قائمة كرافت الين.
 */

import type {
  ProfileBarRate,
  ProfilePriceCategory,
} from "@/lib/material-systems";

export const NEWLINE_PRICE_LIST_DATE = "2026-04-07";

export const NEWLINE_BAR_LENGTH_M = 6;

export const NEWLINE_PRICE_LIST_NOTES =
  "قائمة أسعار قطاعات نيولاين — تحديث 7/4/2026 · تسعير بالعود (طول العود 6 م) · أبيض/بيج · بعض البنود من قائمة كرافت الين (KL)";

export type NewlineOfficialBarRate = {
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
): NewlineOfficialBarRate {
  return {
    code,
    label,
    pricePerM,
    barPrice,
    barLengthM: NEWLINE_BAR_LENGTH_M,
  };
}

/** نظام المفصلي — أبيض/بيج */
export const NEWLINE_HINGED_WHITE_BEIGE: NewlineOfficialBarRate[] = [
  // NL510 حلق مفصلي بدون بار — بدون سعر في القائمة
  row("NL511", "حلق مفصلي ببار 5 سم", 112.06, 672.36),
  row("NL512", "حلق مفصلي ببار مقلوب 5 سم", 114.61, 687.66),
  row("NL513", "ضلفة شباك مفصلي", 113.47, 680.82),
  row("NL515", "ضلفة باب مفصلي نيولاين", 131.8, 790.8),
  row("KL-S514", "سؤاس مفصلي (سؤاس جرار كرافت)", 112.06, 672.36),
  row("NL517", "بوكلير مفصلي", 93.97, 563.82),
  // باكتة من قائمة كرافت الين
  row("KL618", "باكتة سنجل مفصلي", 39.48, 236.89),
  row("KL619", "باكتة دبل مفصلي", 32.09, 192.55),
  row("NL-S611E", "حلق مفصلي 6 سم", 114.61, 687.66),
  row("NL-613E", "شباك مفصلي 6 سم", 114.61, 687.66),
  // NL-615E باب مفصلي 6 سم — بدون سعر في القائمة
];

/** نظام الجرار — أبيض/بيج */
export const NEWLINE_SLIDING_WHITE_BEIGE: NewlineOfficialBarRate[] = [
  // NL-S1012 حلق 3 مجرى بدون بار — بدون سعر
  row("NL-S1013", "حلق 3 مجرى ببار 5 سم", 155.36, 932.16),
  row("NL-S1015", "ضلفة جرار", 111.17, 667.02),
  row("KL-S738", "باكتة سنجل جرار", 32.23, 193.36),
  row("KL-S737", "باكتة دبل جرار", 26.74, 160.42),
  row("NL-S1016", "طبة + سكينة", 40.74, 244.44),
  row("NL-S1019", "ضلفة سلك", 56.17, 337.02),
];

function rate(barPrice: number, productName: string): ProfileBarRate {
  return {
    barPrice,
    barLengthM: NEWLINE_BAR_LENGTH_M,
    productName,
  };
}

/**
 * أسعار فئات البرنامج من قائمة نيولاين (أبيض/بيج).
 * الاختيار: حلق ببار 5 سم · ضلفة باب نيولاين · حلق جرار 3 مجرى ببار.
 */
export function newlineProfileBarRates(): Partial<
  Record<ProfilePriceCategory, ProfileBarRate>
> {
  return {
    // مفصلي
    "frame-hinged": rate(672.36, "NL511 حلق مفصلي ببار 5 سم"),
    "sash-hinged": rate(680.82, "NL513 ضلفة شباك مفصلي"),
    "sash-door": rate(790.8, "NL515 ضلفة باب مفصلي نيولاين"),
    bouclier: rate(563.82, "NL517 بوكلير مفصلي"),
    "mullion-hinged": rate(672.36, "KL-S514 سؤاس مفصلي"),
    "bead-single-hinged": rate(236.89, "KL618 باكتة سنجل مفصلي"),
    "bead-double-hinged": rate(192.55, "KL619 باكتة دبل مفصلي"),
    // جرار
    "frame-sliding": rate(932.16, "NL-S1013 حلق 3 مجرى ببار 5 سم"),
    "sash-sliding": rate(667.02, "NL-S1015 ضلفة جرار"),
    "mullion-sliding": rate(672.36, "KL-S514 سؤاس جرار كرافت"),
    knife: rate(244.44, "NL-S1016 طبة + سكينة"),
    "bead-single-sliding": rate(193.36, "KL-S738 باكتة سنجل جرار"),
    "bead-double-sliding": rate(160.42, "KL-S737 باكتة دبل جرار"),
    "mesh-sliding-profile": rate(337.02, "NL-S1019 ضلفة سلك"),
  };
}
