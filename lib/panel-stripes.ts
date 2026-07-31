import { PANEL_STRIPE_MM } from "@/lib/design-items";

/** اتجاه تجميع عيدان البنل (عرض العود ١٥ سم) */
export type PanelBarOrientation = "horizontal" | "vertical";

export type PanelBarCut = {
  /** عدد العيدان */
  stripCount: number;
  /** طول العود الواحد (مم) */
  stripLengthMm: number;
  /** إجمالي الطول المطلوب (مم) */
  totalMm: number;
  /** عرض العود (مم) — ١٥ سم */
  stripeMm: number;
  orientation: PanelBarOrientation;
};

/**
 * حساب أمتار عيدان البنل: عود عرض ١٥ سم بيتقطع ويتجمّع.
 * — أفقي: العود بطول العرض، العدد = ارتفاع ÷ ١٥ سم (لأعلى)
 * — رأسي: العود بطول الارتفاع، العدد = عرض ÷ ١٥ سم (لأعلى)
 */
export function panelBarLengthMm(
  widthMm: number,
  heightMm: number,
  orientation: PanelBarOrientation,
  stripeMm: number = PANEL_STRIPE_MM
): PanelBarCut {
  const w = Math.max(0, widthMm);
  const h = Math.max(0, heightMm);
  const stripe = Math.max(1, stripeMm);
  if (w <= 0 || h <= 0) {
    return {
      stripCount: 0,
      stripLengthMm: 0,
      totalMm: 0,
      stripeMm: stripe,
      orientation,
    };
  }

  if (orientation === "horizontal") {
    const stripCount = Math.ceil(h / stripe);
    return {
      stripCount,
      stripLengthMm: w,
      totalMm: stripCount * w,
      stripeMm: stripe,
      orientation,
    };
  }

  const stripCount = Math.ceil(w / stripe);
  return {
    stripCount,
    stripLengthMm: h,
    totalMm: stripCount * h,
    stripeMm: stripe,
    orientation,
  };
}

/** مواضع خطوط البنل الساندوتش (نفس منطق panel-h / panel-v) */
export function panelStripeLayout(
  span: number,
  svgPerMm: number,
  fallbackMinGap = 3.6
): { gap: number; positions: number[] } {
  const gap =
    svgPerMm > 0
      ? Math.max(1.2, svgPerMm * 2)
      : Math.max(1.8, fallbackMinGap);
  const stripe =
    svgPerMm > 0
      ? PANEL_STRIPE_MM * svgPerMm
      : Math.max(span * 0.15, gap * 4);
  const positions: number[] = [];
  for (let pos = stripe; pos < span - 0.5; pos += stripe) {
    positions.push(pos);
  }
  return { gap, positions };
}

export function panelStripeDivider(frameFill: string): string {
  return luminance(frameFill) < 0.45 ? "#ffffff66" : "#00000040";
}

function luminance(hex: string): number {
  const raw = hex.replace("#", "").trim();
  if (raw.length < 6) return 0.5;
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
