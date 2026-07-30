"use client";

import { useEffect, useState } from "react";
import type { GlassBreakdown, MaterialsBreakdown } from "@/lib/materials";
import { formatArea, formatMeters } from "@/lib/materials";
import {
  calcCutSizes,
  findSystem,
  frameHeightFormula,
  frameWidthFormula,
  loadMaterialCatalog,
  sashHeightFormula,
  sashWidthFormula,
  type CutSizes,
  type MaterialSystem,
  type ProfileSystemDetails,
} from "@/lib/material-systems";
import { formatCurrency } from "@/lib/utils";

type Props = {
  materials: MaterialsBreakdown;
  glassBreakdown?: GlassBreakdown | null;
  partLabel?: string;
  /** مقاس الفتحة للبند */
  widthMm?: number;
  heightMm?: number;
  /** نظام القطاعات المختار على البند */
  systemId?: string | null;
};

type Cell = {
  key: string;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
};

export function MaterialsBar({
  materials,
  glassBreakdown,
  partLabel = "شباك",
  widthMm,
  heightMm,
  systemId,
}: Props) {
  const [profileSystem, setProfileSystem] = useState<MaterialSystem | null>(
    null
  );

  useEffect(() => {
    queueMicrotask(() => {
      if (!systemId || systemId === "none") {
        setProfileSystem(null);
        return;
      }
      const catalog = loadMaterialCatalog();
      setProfileSystem(findSystem("profiles", systemId, catalog) ?? null);
    });
  }, [systemId]);

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
      key: "knife",
      label: "سكينة",
      value: formatMeters(materials.knifeM),
      hint: materials.knifeM > 0 ? "بين الجرار" : undefined,
      accent: materials.knifeM > 0,
    },
    {
      key: "bouclier",
      label: "بوكلير",
      value: formatMeters(materials.bouclierM),
      hint: materials.bouclierM > 0 ? "مقابض متقابلة" : undefined,
      accent: materials.bouclierM > 0,
    },
    {
      key: "sash-h",
      label: "ضلفة مفصلي",
      value: formatMeters(materials.sashHingedM),
      accent: materials.sashHingedM > 0,
    },
    {
      key: "sash-d",
      label: "ضلفة باب",
      value: formatMeters(materials.sashDoorM),
      accent: materials.sashDoorM > 0,
    },
    {
      key: "sash-s",
      label: "ضلفة جرار",
      value: formatMeters(materials.sashSlidingM),
      accent: materials.sashSlidingM > 0,
    },
    {
      key: "bead",
      label: "باكتة",
      value: formatMeters(materials.beadM),
      hint: materials.beadM > 0 ? "تثبيت زجاج" : undefined,
      accent: materials.beadM > 0,
    },
    {
      key: "glass-area",
      label: "مساحة زجاج",
      value: formatArea(materials.glassAreaSqm),
      hint: materials.glassAreaSqm > 0 ? "فعلي" : undefined,
      accent: materials.glassAreaSqm > 0,
    },
    {
      key: "mullion",
      label: "سوقاس",
      value: formatMeters(materials.mullionTotalM),
      hint: mullionHint(materials),
      accent: materials.mullionTotalM > 0,
    },
  ];

  const showDetails =
    materials.mullionFrameM > 0 ||
    materials.mullionSashM > 0 ||
    materials.knifeM > 0 ||
    materials.bouclierM > 0;

  const profile = profileSystem?.profile;
  const cuts =
    profile && widthMm != null && heightMm != null && widthMm > 0 && heightMm > 0
      ? calcCutSizes(widthMm, heightMm, profile.deductions)
      : null;

  return (
    <section
      className="mt-3 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      aria-label="حساب الخامات"
    >
      <div className="flex items-center justify-between border-b border-border bg-primary-soft/60 px-3 py-2">
        <p className="text-xs font-semibold text-primary">حساب الخامات</p>
        <p className="truncate text-xs text-muted">
          {profileSystem ? `${partLabel} · ${profileSystem.name}` : partLabel}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-center">
          <thead>
            <tr className="border-b border-border text-[11px] font-semibold text-muted">
              <th className="px-2.5 py-2 text-start font-semibold">الجزء</th>
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
                    c.accent
                      ? "font-bold text-primary"
                      : "font-medium text-foreground"
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
            {showDetails ? (
              <tr className="border-t border-border/80 bg-background/50 text-xs text-muted">
                <td className="px-2.5 py-2 text-start">تفاصيل</td>
                <td className="px-2.5 py-2" colSpan={cells.length}>
                  سوقاس حلق: {formatMeters(materials.mullionFrameM)} · سوقاس ضلفة:{" "}
                  {formatMeters(materials.mullionSashM)}
                  {materials.knifeM > 0.0005
                    ? ` · سكينة: ${formatMeters(materials.knifeM)}`
                    : ""}
                  {materials.bouclierM > 0.0005
                    ? ` · بوكلير: ${formatMeters(materials.bouclierM)}`
                    : ""}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {profile ? (
        <ProfileCutsPanel
          systemName={profileSystem!.name}
          profile={profile}
          cuts={cuts}
        />
      ) : null}

      {glassBreakdown?.hasPricing && glassBreakdown.lines.length > 0 ? (
        <GlassBreakdownPanel breakdown={glassBreakdown} />
      ) : null}
    </section>
  );
}

function ProfileCutsPanel({
  systemName,
  profile,
  cuts,
}: {
  systemName: string;
  profile: ProfileSystemDetails;
  cuts: CutSizes | null;
}) {
  return (
    <div className="border-t border-border bg-background/40 px-3 py-2.5">
      <p className="text-[11px] font-semibold text-primary">
        نظام القطاعات: {systemName}
      </p>

      {profile.pieces.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {profile.pieces.map((p) => (
            <span
              key={p.id}
              className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] text-foreground"
            >
              {p.name} · {p.sectionWidthMm}مم · عود {p.barLengthM}م
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-2 grid gap-1 text-[11px] leading-relaxed text-muted">
        <p className="font-mono">{frameWidthFormula(profile.deductions)}</p>
        <p className="font-mono">{frameHeightFormula(profile.deductions)}</p>
        <p className="font-mono">{sashWidthFormula(profile.deductions)}</p>
        <p className="font-mono">{sashHeightFormula(profile.deductions)}</p>
      </div>

      {cuts ? (
        <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card text-[11px]">
          <div className="grid grid-cols-3 border-b border-border text-center font-semibold text-muted">
            <span className="px-2 py-1.5 text-start">بعد التخصيم</span>
            <span className="px-2 py-1.5">العرض</span>
            <span className="px-2 py-1.5">الارتفاع</span>
          </div>
          <div className="grid grid-cols-3 border-b border-border text-center tabular-nums">
            <span className="px-2 py-1.5 text-start font-medium">الحلق</span>
            <span className="px-2 py-1.5 font-semibold text-primary">
              {cuts.errors.frameWidth ? "خطأ" : `${cuts.frameWidthMm} مم`}
            </span>
            <span className="px-2 py-1.5 font-semibold text-primary">
              {cuts.errors.frameHeight ? "خطأ" : `${cuts.frameHeightMm} مم`}
            </span>
          </div>
          <div className="grid grid-cols-3 text-center tabular-nums">
            <span className="px-2 py-1.5 text-start font-medium">الضلفة</span>
            <span className="px-2 py-1.5 font-semibold text-primary">
              {cuts.errors.sashWidth ? "خطأ" : `${cuts.sashWidthMm} مم`}
            </span>
            <span className="px-2 py-1.5 font-semibold text-primary">
              {cuts.errors.sashHeight ? "خطأ" : `${cuts.sashHeightMm} مم`}
            </span>
          </div>
        </div>
      ) : null}
    </div>
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

function GlassBreakdownPanel({ breakdown }: { breakdown: GlassBreakdown }) {
  const [expanded, setExpanded] = useState(false);
  const showExpand = breakdown.lines.length > 1;
  return (
    <div className="border-t border-border bg-background/40 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-primary">تكلفة الزجاج</p>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-foreground">
            {formatCurrency(Math.round(breakdown.totalCost))} ج.م
          </span>
          {showExpand && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded-md px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary-soft"
            >
              {expanded ? "إخفاء" : "تفاصيل"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-1.5 grid grid-cols-3 gap-x-3 text-[10px] text-muted">
        <span>
          للقطعة: {formatCurrency(Math.round(breakdown.totalUnitCost))} ج.م
        </span>
        <span>الكمية × {breakdown.totalCost / (breakdown.totalUnitCost || 1)}</span>
        <span>
          الإجمالي: {formatCurrency(Math.round(breakdown.totalCost))} ج.م
        </span>
      </div>

      {expanded && (
        <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card text-[10px]">
          <div className="grid grid-cols-4 border-b border-border text-center font-semibold text-muted">
            <span className="px-2 py-1.5 text-start">ضلفة</span>
            <span className="px-2 py-1.5">نوع</span>
            <span className="px-2 py-1.5">م²</span>
            <span className="px-2 py-1.5">تكلفة</span>
          </div>
          {breakdown.lines.map((line, i) => (
            <div
              key={line.paneId}
              className={`grid grid-cols-4 text-center tabular-nums ${
                i > 0 ? "border-t border-border/60" : ""
              }`}
            >
              <span className="px-2 py-1.5 text-start font-medium text-foreground">
                {i + 1}
              </span>
              <span className="px-2 py-1.5 text-foreground">
                {line.label}
              </span>
              <span className="px-2 py-1.5 text-foreground">
                {line.areaSqm.toFixed(2)}
              </span>
              <span className="px-2 py-1.5 font-semibold text-primary">
                {formatCurrency(Math.round(line.totalCost))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
