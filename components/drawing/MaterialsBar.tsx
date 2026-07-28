"use client";

import type { MaterialsBreakdown } from "@/lib/materials";
import { formatArea, formatMeters } from "@/lib/materials";

type Props = {
  materials: MaterialsBreakdown;
  partLabel?: string;
};

type Cell = {
  key: string;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
};

export function MaterialsBar({ materials, partLabel = "شباك" }: Props) {
  const cells: Cell[] = [
    {
      key: "area",
      label: "مساحة",
      value: formatArea(materials.areaSqm),
    },
    {
      key: "frame-h",
      label: "حلق مفصلي",
      value: formatMeters(materials.frameHingedM),
      hint: materials.frameHingedM > 0 ? materials.frameLabel : undefined,
      accent: materials.frameHingedM > 0,
    },
    {
      key: "frame-s",
      label: "حلق جرار",
      value: formatMeters(materials.frameSlidingM),
      accent: materials.frameSlidingM > 0,
    },
    {
      key: "coupling",
      label: "كوبلن",
      value: formatMeters(materials.couplingM),
      hint: materials.couplingM > 0 ? "تجميع" : undefined,
      accent: materials.couplingM > 0,
    },
    {
      key: "mullion",
      label: "سوقاس",
      value: formatMeters(materials.mullionTotalM),
      hint: mullionHint(materials),
      accent: materials.mullionTotalM > 0,
    },
  ];

  return (
    <section
      className="mt-3 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      aria-label="حساب الخامات"
    >
      <div className="flex items-center justify-between border-b border-border bg-primary-soft/60 px-3 py-2">
        <p className="text-xs font-semibold text-primary">حساب الخامات</p>
        <p className="truncate text-xs text-muted">{partLabel}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-center">
          <thead>
            <tr className="border-b border-border text-[11px] font-semibold text-muted">
              <th className="px-2.5 py-2 text-start font-semibold">
                الجزء
              </th>
              {cells.map((c) => (
                <th key={c.key} className="px-2.5 py-2 font-semibold">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="text-[13px]">
              <td className="px-2.5 py-2.5 text-start font-semibold text-foreground">
                {partLabel}
              </td>
              {cells.map((c) => (
                <td
                  key={c.key}
                  className={`px-2.5 py-2.5 tabular-nums ${
                    c.accent ? "font-bold text-primary" : "font-medium text-foreground"
                  }`}
                >
                  <div>{c.value}</div>
                  {c.hint ? (
                    <div className="mt-0.5 text-[10px] font-normal text-muted">
                      {c.hint}
                    </div>
                  ) : null}
                </td>
              ))}
            </tr>
            {(materials.mullionFrameM > 0 || materials.mullionSashM > 0) && (
              <tr className="border-t border-border/80 bg-background/50 text-xs text-muted">
                <td className="px-2.5 py-2 text-start">تفاصيل السوقاس</td>
                <td className="px-2.5 py-2" colSpan={2}>
                  يقسم الحلق: {formatMeters(materials.mullionFrameM)}
                </td>
                <td className="px-2.5 py-2" colSpan={3}>
                  يقسم الضلفة: {formatMeters(materials.mullionSashM)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function mullionHint(m: MaterialsBreakdown): string | undefined {
  const parts: string[] = [];
  if (m.mullionFrameM > 0.0005) parts.push("حلق");
  if (m.mullionSashM > 0.0005) parts.push("ضلفة");
  if (parts.length === 0) return undefined;
  if (parts.length === 2) return "حلق + ضلفة";
  return parts[0];
}
