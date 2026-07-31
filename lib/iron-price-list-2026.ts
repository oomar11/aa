/**
 * قائمة أسعار الحديد والألومنيوم — يوليو 2026 (UPVCP)
 * المصدر: قائمة أسعار الحديد و الألومنيوم — تاريخ التحرير 01 يوليو 2026
 * جميع الأسعار تسليم أرض المصنع (بدون نقل)
 */

export const IRON_PRICE_LIST_DATE = "2026-07-01";

export const IRON_PRICE_LIST_NOTES =
  "قائمة أسعار الحديد والألومنيوم يوليو 2026 — تسليم أرض المصنع (بدون نقل)";

/** طول عود الحديد الشائع في القائمة (م) */
export const IRON_STOCK_BAR_LENGTH_M = 2.5;

/** طول مجرى الألومنيوم (م) */
export const IRON_TRACK_BAR_LENGTH_M = 6;

export type IronOfficialBarRate = {
  code: string;
  /** وصف الصنف من القائمة */
  label: string;
  barPrice: number;
  pricePerM: number;
  barLengthM: number;
};

/**
 * بنود القائمة كما وردت.
 * سعر المتر × طول العود ≈ سعر العود.
 */
export const UPVCP_IRON_PRICE_ROWS: IronOfficialBarRate[] = [
  {
    code: "401001",
    label:
      "حديد حلق مفصلي 6سم و7سم · ضلفة مفصلي 6سم و7سم · بوكلير مفصلي · ضلفة جرار وسط",
    barPrice: 66.7,
    pricePerM: 26.68,
    barLengthM: IRON_STOCK_BAR_LENGTH_M,
  },
  {
    code: "401002",
    label:
      "حديد سوقاس جرار 10 و12 · سوقاس مفصلي 6سم · ضلفة سلك · سوقاس ضلفة سلك",
    barPrice: 50,
    pricePerM: 20,
    barLengthM: IRON_STOCK_BAR_LENGTH_M,
  },
  {
    code: "401003",
    label: "حديد ضلفة باب مفصلي 7سم · سوقاس مفصلي 7سم · ضلفة جرار كبيرة",
    barPrice: 100,
    pricePerM: 40,
    barLengthM: IRON_STOCK_BAR_LENGTH_M,
  },
  {
    code: "401004",
    label: "حديد حلق جرار · ضلفة جرار سيتي",
    barPrice: 64.5,
    pricePerM: 25.8,
    barLengthM: IRON_STOCK_BAR_LENGTH_M,
  },
  {
    code: "401005",
    label: "حديد ضلفة سلك سيتي",
    barPrice: 43.4,
    pricePerM: 17.36,
    barLengthM: IRON_STOCK_BAR_LENGTH_M,
  },
  {
    code: "401006",
    label: "حديد حلق 2 مجرى + 3 مجرى 12سم",
    barPrice: 72.3,
    pricePerM: 28.92,
    barLengthM: IRON_STOCK_BAR_LENGTH_M,
  },
  {
    code: "401007",
    label: "حديد ضلفة باب مفصلي 6سم",
    barPrice: 100,
    pricePerM: 40,
    barLengthM: IRON_STOCK_BAR_LENGTH_M,
  },
  {
    code: "401016",
    label: "شريحة مفصلة",
    barPrice: 16.7,
    pricePerM: 7.26,
    /** 16.70 ÷ 7.26 ≈ 2.3 م */
    barLengthM: 2.3,
  },
  {
    code: "401008",
    label: "مجرى ألومنيوم U",
    barPrice: 277.8,
    pricePerM: 46.3,
    barLengthM: IRON_TRACK_BAR_LENGTH_M,
  },
  {
    code: "ST5",
    label: "مجرى ألومنيوم غاطس ST5",
    barPrice: 222.3,
    pricePerM: 37.05,
    barLengthM: IRON_TRACK_BAR_LENGTH_M,
  },
];

type IronRateRole =
  | "frame-hinged"
  | "frame-sliding"
  | "sash-hinged"
  | "sash-door"
  | "sash-sliding"
  | "mullion"
  | "track"
  | "hinge-strip";

/**
 * ربط أدوار نظام الحديد ببنود القائمة.
 * (بعض أصناف القائمة زي ضلفة السلك وحلق ١٢سم مش أدوار مستقلة عندنا)
 */
export const IRON_ROLE_OFFICIAL_RATES: Partial<
  Record<IronRateRole, IronOfficialBarRate>
> = {
  "frame-hinged": UPVCP_IRON_PRICE_ROWS[0]!,
  "sash-hinged": UPVCP_IRON_PRICE_ROWS[0]!,
  mullion: UPVCP_IRON_PRICE_ROWS[1]!,
  "sash-door": UPVCP_IRON_PRICE_ROWS[6]!,
  "frame-sliding": UPVCP_IRON_PRICE_ROWS[3]!,
  "sash-sliding": UPVCP_IRON_PRICE_ROWS[3]!,
  "hinge-strip": UPVCP_IRON_PRICE_ROWS[7]!,
  /** التراك = مجرى ألومنيوم U */
  track: UPVCP_IRON_PRICE_ROWS[8]!,
};

export function ironOfficialRateForRole(
  role: string
): IronOfficialBarRate | undefined {
  return IRON_ROLE_OFFICIAL_RATES[role as IronRateRole];
}
