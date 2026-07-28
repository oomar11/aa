/** هندسة رسم شفاط (مروحة دائرية) داخل ضلفة */

export type ExhaustFanGeom = {
  cx: number;
  cy: number;
  outerR: number;
  hubR: number;
  /** مسارات الشفرات */
  blades: string[];
  strokeWidth: number;
};

export function exhaustFanGeom(
  cx: number,
  cy: number,
  size: number,
  strokeWidth = 1.3
): ExhaustFanGeom {
  const outerR = Math.max(6, Math.min(size * 0.38, size / 2 - 2));
  const hubR = Math.max(1.4, outerR * 0.18);
  const bladeR = outerR * 0.92;
  const blades: string[] = [];
  const bladeCount = 3;
  for (let i = 0; i < bladeCount; i++) {
    const a0 = (i * (Math.PI * 2)) / bladeCount - Math.PI / 2;
    const a1 = a0 + (Math.PI * 2) / bladeCount * 0.72;
    const mid = (a0 + a1) / 2;
    const outer = bladeR * 0.95;
    const inner = hubR * 1.15;
    const x0 = cx + Math.cos(a0) * inner;
    const y0 = cy + Math.sin(a0) * inner;
    const x1 = cx + Math.cos(a0 + 0.15) * outer;
    const y1 = cy + Math.sin(a0 + 0.15) * outer;
    const xm = cx + Math.cos(mid) * outer;
    const ym = cy + Math.sin(mid) * outer;
    const x2 = cx + Math.cos(a1 - 0.15) * outer;
    const y2 = cy + Math.sin(a1 - 0.15) * outer;
    const x3 = cx + Math.cos(a1) * inner;
    const y3 = cy + Math.sin(a1) * inner;
    blades.push(
      `M ${x0} ${y0} Q ${x1} ${y1} ${xm} ${ym} Q ${x2} ${y2} ${x3} ${y3}`
    );
  }
  return { cx, cy, outerR, hubR, blades, strokeWidth };
}
