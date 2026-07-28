import { PANEL_STRIPE_MM } from "@/lib/design-items";

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
