"use client";

import { useEffect, useState } from "react";
import type { AccessoriesBreakdown } from "@/lib/accessories";
import {
  formatEspagnoletteSummary,
  formatLockPiecesSummary,
  accessoryBrandTag,
} from "@/lib/accessories";
import type { GlassBreakdown, MaterialsBreakdown, MeshBreakdown, ProfileCostBreakdown } from "@/lib/materials";
import { formatArea, formatCount, formatMeters } from "@/lib/materials";
import type { IronBreakdown } from "@/lib/iron";
import {
  calcCutSizes,
  findSystem,
  formatFormulaVars,
  frameHeightFormula,
  frameWidthFormula,
  getCutCalculationSteps,
  loadMaterialCatalog,
  sashHeightFormula,
  sashWidthFormula,
  type CutSizes,
  type CutCalculationStep,
  type MaterialSystem,
  type ProfileSystemDetails,
} from "@/lib/material-systems";
import { formatCurrency } from "@/lib/utils";

type Props = {
  materials: MaterialsBreakdown;
  glassBreakdown?: GlassBreakdown | null;
  meshBreakdown?: MeshBreakdown | null;
  accessoriesBreakdown?: AccessoriesBreakdown | null;
  profileCostBreakdown?: ProfileCostBreakdown | null;
  ironBreakdown?: IronBreakdown | null;
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
  meshBreakdown,
  accessoriesBreakdown,
  profileCostBreakdown,
  ironBreakdown,
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
      hint: materials.knifeM > 0 ? "لكل ضلفة جرار" : undefined,
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
      key: "bouclier-cap",
      label: "طبة بوكلير",
      value:
        materials.bouclierCapQty > 0
          ? `${formatCount(materials.bouclierCapQty)} · ${formatMeters(materials.bouclierCapM)}`
          : formatMeters(materials.bouclierCapM),
      hint: materials.bouclierCapQty > 0 ? "قطاع" : undefined,
      accent: materials.bouclierCapQty > 0,
    },
    {
      key: "sash-h",
      label: "ضلفة شباك مفصلي",
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
      key: "bead-sh",
      label: "باكتة سنجل مفصلي",
      value: formatMeters(materials.beadSingleHingedM),
      accent: materials.beadSingleHingedM > 0,
    },
    {
      key: "bead-ss",
      label: "باكتة سنجل جرار",
      value: formatMeters(materials.beadSingleSlidingM),
      accent: materials.beadSingleSlidingM > 0,
    },
    {
      key: "bead-dh",
      label: "باكتة دبل مفصلي",
      value: formatMeters(materials.beadDoubleHingedM),
      accent: materials.beadDoubleHingedM > 0,
    },
    {
      key: "bead-ds",
      label: "باكتة دبل جرار",
      value: formatMeters(materials.beadDoubleSlidingM),
      accent: materials.beadDoubleSlidingM > 0,
    },
    {
      key: "panel-h",
      label: "بنل مفصلي",
      value: formatMeters(materials.panelHingedM),
      accent: materials.panelHingedM > 0,
    },
    {
      key: "panel-s",
      label: "بنل جرار",
      value: formatMeters(materials.panelSlidingM),
      accent: materials.panelSlidingM > 0,
    },
    {
      key: "glass-area",
      label: "مساحة زجاج",
      value: formatArea(materials.glassAreaSqm),
      hint: materials.glassAreaSqm > 0 ? "فعلي" : undefined,
      accent: materials.glassAreaSqm > 0,
    },
    {
      key: "mesh-area",
      label: "مساحة سلك",
      value: formatArea(materials.meshAreaSqm),
      hint: materials.meshAreaSqm > 0 ? "شبكة" : undefined,
      accent: materials.meshAreaSqm > 0,
    },
    {
      key: "mesh-profile",
      label: "ضلفة سلك جرار",
      value: formatMeters(materials.meshSlidingProfileM),
      hint: materials.meshSlidingProfileM > 0 ? "زي ضلفة الجرار" : undefined,
      accent: materials.meshSlidingProfileM > 0,
    },
    {
      key: "mesh-wheel",
      label: "عجل سلك",
      value: formatCount(materials.meshSlidingWheelQty),
      hint: materials.meshSlidingWheelQty > 0 ? "٢/ضلفة" : undefined,
      accent: materials.meshSlidingWheelQty > 0,
    },
    {
      key: "mesh-handle",
      label: "مقبض لطش",
      value: formatCount(materials.meshPushHandleQty),
      hint: materials.meshPushHandleQty > 0 ? "١/ضلفة" : undefined,
      accent: materials.meshPushHandleQty > 0,
    },
    {
      key: "four-leaf-meeting",
      label: "تقابل ٤ ضلفة",
      value:
        materials.fourLeafMeetingQty > 0
          ? `${formatCount(materials.fourLeafMeetingQty)} · ${formatMeters(materials.fourLeafMeetingM)}`
          : formatMeters(materials.fourLeafMeetingM),
      hint: materials.fourLeafMeetingQty > 0 ? "قطاع" : undefined,
      accent: materials.fourLeafMeetingQty > 0,
    },
    {
      key: "mesh-meeting",
      label: "تقابل سلك جرار",
      value:
        materials.meshMeetingQty > 0
          ? `${formatCount(materials.meshMeetingQty)} · ${formatMeters(materials.meshMeetingM)}`
          : formatMeters(materials.meshMeetingM),
      hint: materials.meshMeetingQty > 0 ? "قطاع" : undefined,
      accent: materials.meshMeetingQty > 0,
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
        <table className="w-full min-w-[1080px] border-collapse text-center">
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

      {profileCostBreakdown?.hasPricing &&
      profileCostBreakdown.lines.length > 0 ? (
        <ProfileCostBreakdownPanel breakdown={profileCostBreakdown} />
      ) : null}

      {glassBreakdown?.hasPricing && glassBreakdown.lines.length > 0 ? (
        <GlassBreakdownPanel breakdown={glassBreakdown} />
      ) : null}

      {meshBreakdown && meshBreakdown.lines.length > 0 ? (
        <MeshBreakdownPanel breakdown={meshBreakdown} />
      ) : null}

      {accessoriesBreakdown?.hasAccessories ? (
        <AccessoriesBreakdownPanel breakdown={accessoriesBreakdown} />
      ) : null}

      {ironBreakdown && ironBreakdown.totalM > 0.0005 ? (
        <IronBreakdownPanel breakdown={ironBreakdown} />
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
  const steps =
    cuts != null
      ? getCutCalculationSteps(
          cuts.openingWidthMm,
          cuts.openingHeightMm,
          profile.deductions
        )
      : null;

  return (
    <div className="border-t border-border bg-background/40 px-3 py-2.5">
      <p className="text-[11px] font-semibold text-primary">
        نظام القطاعات: {systemName}
      </p>
      <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
        مقاس القطع بعد التخصيم — الأمتار في الجدول فوق من تقسيمات الرسم.
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
        <p>{frameWidthFormula(profile.deductions)}</p>
        <p>{frameHeightFormula(profile.deductions)}</p>
        <p>{sashWidthFormula(profile.deductions)}</p>
        <p>{sashHeightFormula(profile.deductions)}</p>
      </div>

      {steps && cuts ? (
        <div className="mt-2 space-y-2">
          <ol className="space-y-1 rounded-xl border border-border bg-card p-2 text-[10px] leading-relaxed">
            {steps.map((s) => (
              <CutStepLine key={s.step} step={s} />
            ))}
          </ol>
          <div className="overflow-hidden rounded-xl border border-border bg-card text-[11px]">
            <div className="grid grid-cols-3 border-b border-border text-center font-semibold text-muted">
              <span className="px-2 py-1.5 text-start">النتيجة</span>
              <span className="px-2 py-1.5">العرض</span>
              <span className="px-2 py-1.5">الارتفاع</span>
            </div>
            <div className="grid grid-cols-3 border-b border-border text-center tabular-nums">
              <span className="px-2 py-1.5 text-start text-[10px] text-muted">
                فتحة {cuts.openingWidthMm}×{cuts.openingHeightMm}
              </span>
              <span className="px-2 py-1.5">{cuts.openingWidthMm}</span>
              <span className="px-2 py-1.5">{cuts.openingHeightMm}</span>
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
        </div>
      ) : null}
    </div>
  );
}

function CutStepLine({ step }: { step: CutCalculationStep }) {
  const varKeys =
    step.phase === "frame"
      ? (["W", "H"] as const)
      : (["W", "H", "FW", "FH"] as const);
  return (
    <li>
      <span className="font-semibold text-foreground">
        {step.step}. {step.label}
      </span>
      <span className="font-mono text-muted"> {step.formula}</span>
      {step.error ? (
        <span className="text-red-600"> — {step.error}</span>
      ) : (
        <span className="text-muted">
          {" "}
          ({formatFormulaVars(step.vars, [...varKeys])}) →{" "}
          <span className="font-semibold text-primary">{step.resultMm} مم</span>
        </span>
      )}
    </li>
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

function ProfileCostBreakdownPanel({
  breakdown,
}: {
  breakdown: ProfileCostBreakdown;
}) {
  const [expanded, setExpanded] = useState(false);
  const showExpand = breakdown.lines.length > 3;

  return (
    <div className="border-t border-border bg-background/40 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-primary">
          تكلفة القطاعات
          {breakdown.brandName ? `: ${breakdown.brandName}` : ""}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-foreground">
            {formatCurrency(Math.round(breakdown.totalCost))} ج.م
          </span>
          {showExpand ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded-md px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary-soft"
            >
              {expanded ? "إخفاء" : "تفاصيل"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-1.5 grid grid-cols-2 gap-x-3 text-[10px] text-muted">
        <span>
          للقطعة: {formatCurrency(Math.round(breakdown.totalUnitCost))} ج.م
        </span>
        <span>
          الإجمالي: {formatCurrency(Math.round(breakdown.totalCost))} ج.م
        </span>
      </div>

      {(expanded || breakdown.lines.length <= 3) && (
        <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card text-[10px]">
          <div className="grid grid-cols-4 border-b border-border text-center font-semibold text-muted">
            <span className="px-2 py-1.5 text-start">النوع</span>
            <span className="px-2 py-1.5">الطول</span>
            <span className="px-2 py-1.5">ج.م/م</span>
            <span className="px-2 py-1.5">تكلفة</span>
          </div>
          {breakdown.lines.map((line, i) => (
            <div
              key={line.category}
              className={`grid grid-cols-4 text-center tabular-nums ${
                i > 0 ? "border-t border-border/60" : ""
              }`}
            >
              <span className="px-2 py-1.5 text-start font-medium text-foreground">
                {line.label}
              </span>
              <span className="px-2 py-1.5 text-foreground">
                {line.lengthM.toFixed(2)} م
              </span>
              <span className="px-2 py-1.5 text-foreground">
                {line.pricePerM}
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

function MeshBreakdownPanel({ breakdown }: { breakdown: MeshBreakdown }) {
  const [expanded, setExpanded] = useState(false);
  const showExpand = breakdown.lines.length > 1;
  const showCost = breakdown.hasPricing;

  return (
    <div className="border-t border-border bg-background/40 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-primary">حساب السلك</p>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-foreground">
            {breakdown.totalAreaSqm.toFixed(2)} م²
          </span>
          {showCost ? (
            <span className="text-[11px] font-bold text-foreground">
              · {formatCurrency(Math.round(breakdown.totalCost))} ج.م
            </span>
          ) : null}
          {showExpand ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded-md px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary-soft"
            >
              {expanded ? "إخفاء" : "تفاصيل"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
        <span>مساحة: {breakdown.totalAreaSqm.toFixed(2)} م²</span>
        {breakdown.totalSlidingProfileM > 0.0005 ? (
          <span>ضلفة سلك: {breakdown.totalSlidingProfileM.toFixed(2)} م</span>
        ) : null}
        {breakdown.totalWheelQty > 0 ? (
          <span>عجل: {breakdown.totalWheelQty} (٢/ضلفة)</span>
        ) : null}
        {breakdown.totalHandleQty > 0 ? (
          <span>مقبض لطش: {breakdown.totalHandleQty}</span>
        ) : null}
        {showCost ? (
          <span>
            للقطعة: {formatCurrency(Math.round(breakdown.totalUnitCost))} ج.م
          </span>
        ) : null}
      </div>

      {(expanded || breakdown.lines.length === 1) && (
        <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card text-[10px]">
          <div
            className={`grid border-b border-border text-center font-semibold text-muted ${
              breakdown.totalSlidingProfileM > 0.0005
                ? showCost
                  ? "grid-cols-6"
                  : "grid-cols-5"
                : showCost
                  ? "grid-cols-5"
                  : "grid-cols-4"
            }`}
          >
            <span className="px-2 py-1.5 text-start">ضلفة</span>
            <span className="px-2 py-1.5">نوع</span>
            <span className="px-2 py-1.5">م²</span>
            <span className="px-2 py-1.5">ج.م/م²</span>
            {breakdown.totalSlidingProfileM > 0.0005 ? (
              <span className="px-2 py-1.5">قطاع</span>
            ) : null}
            {showCost ? <span className="px-2 py-1.5">تكلفة</span> : null}
          </div>
          {breakdown.lines.map((line, i) => (
            <div
              key={line.paneId}
              className={`grid text-center tabular-nums ${
                breakdown.totalSlidingProfileM > 0.0005
                  ? showCost
                    ? "grid-cols-6"
                    : "grid-cols-5"
                  : showCost
                    ? "grid-cols-5"
                    : "grid-cols-4"
              } ${i > 0 ? "border-t border-border/60" : ""}`}
            >
              <span className="px-2 py-1.5 text-start font-medium text-foreground">
                {i + 1}
              </span>
              <span className="px-2 py-1.5 text-foreground">{line.label}</span>
              <span className="px-2 py-1.5 text-foreground">
                {line.areaSqm.toFixed(2)}
              </span>
              <span className="px-2 py-1.5 text-foreground">
                {line.costPerSqm > 0 ? line.costPerSqm : "—"}
              </span>
              {breakdown.totalSlidingProfileM > 0.0005 ? (
                <span className="px-2 py-1.5 text-foreground">
                  {line.profileM > 0.0005 ? `${line.profileM.toFixed(2)} م` : "—"}
                </span>
              ) : null}
              {showCost ? (
                <span className="px-2 py-1.5 font-semibold text-primary">
                  {formatCurrency(Math.round(line.totalCost))}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AccessoriesBreakdownPanel({
  breakdown,
}: {
  breakdown: AccessoriesBreakdown;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasHinged =
    breakdown.hingeQty > 0 ||
    breakdown.hingedEspagnolettes.length > 0 ||
    breakdown.boltQty > 0 ||
    breakdown.bouclierBoltLockPieces.length > 0 ||
    breakdown.protrudingHandleQty > 0;
  const hasSliding =
    breakdown.trackQty > 0 ||
    breakdown.rollerQty > 0 ||
    breakdown.brushLengthM > 0.0005 ||
    breakdown.slidingEspagnolettes.length > 0 ||
    breakdown.recessedHandleQty > 0;

  return (
    <div className="border-t border-border bg-background/40 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-primary">
          حساب الاكسسوار
          {breakdown.systemName ? `: ${breakdown.systemName}` : ""}
        </p>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded-md px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary-soft"
        >
          {expanded ? "إخفاء" : "تفاصيل"}
        </button>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
        {breakdown.hingeQty > 0 ? (
          <span>
            مفصلات: {formatCount(breakdown.hingeQty)}
            {accessoryBrandTag(breakdown.brandLabels, "hinge")}
          </span>
        ) : null}
        {breakdown.hingedEspagnolettes.length > 0 ? (
          <span>
            سبلونة مفصلي:{" "}
            {formatEspagnoletteSummary(breakdown.hingedEspagnolettes)}
            {accessoryBrandTag(breakdown.brandLabels, "hinged-espagnolette")}
          </span>
        ) : null}
        {breakdown.protrudingHandleQty > 0 ? (
          <span>
            مقبض بارز: {formatCount(breakdown.protrudingHandleQty)}
            {accessoryBrandTag(breakdown.brandLabels, "protruding-handle")}
          </span>
        ) : null}
        {breakdown.trackQty > 0 ? (
          <span>
            تراك: {formatCount(breakdown.trackQty)} ·{" "}
            {formatMeters(breakdown.trackLengthM)}
            {accessoryBrandTag(breakdown.brandLabels, "track")}
          </span>
        ) : null}
        {breakdown.rollerQty > 0 ? (
          <span>
            عجل جرار: {formatCount(breakdown.rollerQty)}
            {accessoryBrandTag(breakdown.brandLabels, "roller")}
          </span>
        ) : null}
        {breakdown.brushLengthM > 0.0005 ? (
          <span>
            فرش: {formatMeters(breakdown.brushLengthM)}
            {accessoryBrandTag(breakdown.brandLabels, "brush")}
          </span>
        ) : null}
        {breakdown.slidingEspagnolettes.length > 0 ? (
          <span>
            سبلونة جرار:{" "}
            {formatEspagnoletteSummary(breakdown.slidingEspagnolettes)}
            {accessoryBrandTag(breakdown.brandLabels, "sliding-espagnolette")}
          </span>
        ) : null}
        {breakdown.recessedHandleQty > 0 ? (
          <span>
            مقبض غاطس: {formatCount(breakdown.recessedHandleQty)}
            {accessoryBrandTag(breakdown.brandLabels, "recessed-handle")}
          </span>
        ) : null}
      </div>

      {expanded ? (
        <div className="mt-2 space-y-2 text-[10px] leading-relaxed text-muted">
          {hasHinged ? (
            <div className="rounded-xl border border-border bg-card p-2.5">
              <p className="font-semibold text-foreground">مفصلي</p>
              <p>
                مفصلات: {formatCount(breakdown.hingeQty)}
                {accessoryBrandTag(breakdown.brandLabels, "hinge")}
              </p>
              <p>
                سبلونة:{" "}
                {formatEspagnoletteSummary(breakdown.hingedEspagnolettes)}
                {accessoryBrandTag(breakdown.brandLabels, "hinged-espagnolette")}
              </p>
              <p>
                سكاك مفصلي:{" "}
                {formatLockPiecesSummary(breakdown.hingedLockPieces)}
                {accessoryBrandTag(breakdown.brandLabels, "hinged-lock")}
              </p>
              {breakdown.bouclierLockPieces.length > 0 ? (
                <p>
                  سكاك بوكلير:{" "}
                  {formatLockPiecesSummary(breakdown.bouclierLockPieces)}
                  {accessoryBrandTag(breakdown.brandLabels, "bouclier-lock")}
                </p>
              ) : null}
              {breakdown.boltQty > 0 ? (
                <p>
                  ترباس: {formatCount(breakdown.boltQty)}
                  {accessoryBrandTag(breakdown.brandLabels, "bouclier-bolt")}
                </p>
              ) : null}
              {breakdown.bouclierBoltLockPieces.length > 0 ? (
                <p>
                  سكاك ترباس:{" "}
                  {formatLockPiecesSummary(breakdown.bouclierBoltLockPieces)}
                  {accessoryBrandTag(breakdown.brandLabels, "bouclier-bolt-lock")}
                </p>
              ) : null}
              {breakdown.protrudingHandleQty > 0 ? (
                <p>
                  مقبض بارز: {formatCount(breakdown.protrudingHandleQty)}
                  {accessoryBrandTag(breakdown.brandLabels, "protruding-handle")}
                </p>
              ) : null}
            </div>
          ) : null}

          {hasSliding ? (
            <div className="rounded-xl border border-border bg-card p-2.5">
              <p className="font-semibold text-foreground">جرار</p>
              {breakdown.trackQty > 0 ? (
                <p>
                  تراك: {formatCount(breakdown.trackQty)} قطعة ·{" "}
                  {formatMeters(breakdown.trackLengthM)}
                  {accessoryBrandTag(breakdown.brandLabels, "track")}
                </p>
              ) : null}
              {breakdown.rollerQty > 0 ? (
                <p>
                  عجل: {formatCount(breakdown.rollerQty)}
                  {accessoryBrandTag(breakdown.brandLabels, "roller")}
                </p>
              ) : null}
              {breakdown.brushLengthM > 0.0005 ? (
                <p>
                  فرش: {formatMeters(breakdown.brushLengthM)}
                  {accessoryBrandTag(breakdown.brandLabels, "brush")}
                </p>
              ) : null}
              <p>
                سبلونة:{" "}
                {formatEspagnoletteSummary(breakdown.slidingEspagnolettes)}
                {accessoryBrandTag(breakdown.brandLabels, "sliding-espagnolette")}
              </p>
              <p>
                سكاك جرار:{" "}
                {formatLockPiecesSummary(breakdown.slidingLockPieces)}
                {accessoryBrandTag(breakdown.brandLabels, "sliding-lock")}
              </p>
              {breakdown.recessedHandleQty > 0 ? (
                <p>
                  مقبض غاطس: {formatCount(breakdown.recessedHandleQty)}
                  {accessoryBrandTag(breakdown.brandLabels, "recessed-handle")}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function IronBreakdownPanel({ breakdown }: { breakdown: IronBreakdown }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-border bg-background/40 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-primary">
          حساب الحديد
          {breakdown.systemName ? `: ${breakdown.systemName}` : ""}
        </p>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded-md px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary-soft"
        >
          {expanded ? "إخفاء" : "تفاصيل"}
        </button>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
        <span className="font-semibold text-foreground">
          إجمالي: {formatMeters(breakdown.totalM)}
        </span>
        {breakdown.frameHingedM > 0.0005 ? (
          <span>حلق مفصلي: {formatMeters(breakdown.frameHingedM)}</span>
        ) : null}
        {breakdown.frameSlidingM > 0.0005 ? (
          <span>حلق جرار: {formatMeters(breakdown.frameSlidingM)}</span>
        ) : null}
        {breakdown.sashHingedM > 0.0005 ? (
          <span>ضلفة مفصلي: {formatMeters(breakdown.sashHingedM)}</span>
        ) : null}
        {breakdown.sashSlidingM > 0.0005 ? (
          <span>ضلفة جرار: {formatMeters(breakdown.sashSlidingM)}</span>
        ) : null}
        {breakdown.sashDoorM > 0.0005 ? (
          <span>ضلفة باب: {formatMeters(breakdown.sashDoorM)}</span>
        ) : null}
        {breakdown.mullionM > 0.0005 ? (
          <span>سوقاس: {formatMeters(breakdown.mullionM)}</span>
        ) : null}
      </div>

      {expanded ? (
        <div className="mt-2 overflow-hidden rounded-xl border border-border/80">
          <div className="grid grid-cols-3 gap-px bg-border text-[10px] font-semibold text-muted">
            <span className="bg-card px-2 py-1.5 text-start">النوع</span>
            <span className="bg-card px-2 py-1.5">المقطع</span>
            <span className="bg-card px-2 py-1.5">الطول</span>
          </div>
          {breakdown.lines.map((line) => (
            <div
              key={line.role}
              className="grid grid-cols-3 gap-px border-t border-border/60 bg-border text-[10px]"
            >
              <span className="bg-card px-2 py-1.5 text-start text-foreground">
                {line.pieceName ?? line.label}
              </span>
              <span className="bg-card px-2 py-1.5 text-foreground">
                {line.sectionWidthMm && line.sectionHeightMm
                  ? `${line.sectionWidthMm}×${line.sectionHeightMm} مم`
                  : "—"}
              </span>
              <span className="bg-card px-2 py-1.5 font-semibold text-primary">
                {formatMeters(line.lengthM)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
