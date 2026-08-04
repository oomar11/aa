"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { AccessoriesBreakdown } from "@/lib/accessories";
import { accessoryBrandTag } from "@/lib/accessories";
import { accessoryBrandResolvedPrice } from "@/lib/accessory-price-list-2026";
import type {
  GlassBreakdown,
  MaterialsBreakdown,
  MeshBreakdown,
  ProfileCostBreakdown,
  ProfileCostLine,
} from "@/lib/materials";
import {
  calcProfileCostBreakdown,
  formatCount,
  formatMeters,
} from "@/lib/materials";
import type { IronBreakdown } from "@/lib/iron";
import {
  findSystem,
  loadMaterialCatalog,
  type AccessoryBrand,
  type AccessoryBrandCategory,
  type MaterialSystem,
} from "@/lib/material-systems";
import {
  applyDiscountAmount,
  discountLabel,
  discountPercent,
  type DiscountId,
} from "@/lib/item-catalogs";
import {
  hybridSaleBreakdown,
  loadPricingSettings,
  perSqmSaleBreakdown,
  PRICING_UPDATED_EVENT,
  resolveItemSalePricePerSqm,
} from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";

type Props = {
  materials: MaterialsBreakdown;
  glassBreakdown?: GlassBreakdown | null;
  meshBreakdown?: MeshBreakdown | null;
  accessoriesBreakdown?: AccessoriesBreakdown | null;
  profileCostBreakdown?: ProfileCostBreakdown | null;
  ironBreakdown?: IronBreakdown | null;
  partLabel?: string;
  widthMm?: number;
  heightMm?: number;
  systemId?: string | null;
  /** خصم البند — يُطبَّق على إجمالي تكلفة الخامات */
  discountId?: DiscountId | string | null;
  /** البند دبل زجاج — لوضع التسعير بالمتر */
  isDoubleGlazing?: boolean;
  /** رجوع لسعر المتر على البند لو النظام بدون سعر بيع */
  fallbackPricePerSqm?: number;
  /** سعر متر مخصص لهذا الشباك — يلغي السعر الموحد */
  customSalePricePerSqm?: number | null;
};

type MaterialRow = {
  key: string;
  label: string;
  qty: string;
  unitHint?: string;
  cost: number | null;
  sub?: string;
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
  discountId,
  isDoubleGlazing = false,
  fallbackPricePerSqm = 0,
  customSalePricePerSqm = null,
}: Props) {
  const [profileSystem, setProfileSystem] = useState<MaterialSystem | null>(
    null
  );
  const [accessoryBrands, setAccessoryBrands] = useState<AccessoryBrand[]>([]);

  useEffect(() => {
    queueMicrotask(() => {
      const catalog = loadMaterialCatalog();
      setAccessoryBrands(catalog.accessoryBrands ?? []);
      if (!systemId || systemId === "none") {
        setProfileSystem(null);
        return;
      }
      setProfileSystem(findSystem("profiles", systemId, catalog) ?? null);
    });
  }, [systemId]);

  // احسب التكلفة من الكتالوج الحالي مباشرة — بعد ترحيل أسعار السيتي بريمير
  const localProfileCost = useMemo((): ProfileCostBreakdown | null => {
    if (!systemId || systemId === "none") return null;
    if (typeof window === "undefined") return null;
    const catalog = loadMaterialCatalog();
    return calcProfileCostBreakdown(
      { systemId, qty: 1 } as never,
      materials,
      catalog
    );
  }, [systemId, materials]);

  const effectiveProfileCost =
    localProfileCost?.hasPricing && localProfileCost.lines.length > 0
      ? localProfileCost
      : profileCostBreakdown?.hasPricing &&
          (profileCostBreakdown.lines?.length ?? 0) > 0
        ? profileCostBreakdown
        : localProfileCost ?? profileCostBreakdown;

  const profileRows = useMemo(
    () => buildProfileRows(effectiveProfileCost, materials),
    [effectiveProfileCost, materials]
  );

  const glassRows = useMemo(
    () => buildGlassRows(glassBreakdown),
    [glassBreakdown]
  );

  const meshRows = useMemo(
    () => buildMeshRows(meshBreakdown, materials),
    [meshBreakdown, materials]
  );

  const accessoryRows = useMemo(
    () => buildAccessoryRows(accessoriesBreakdown, accessoryBrands),
    [accessoriesBreakdown, accessoryBrands]
  );

  const ironRows = useMemo(
    () => buildIronRows(ironBreakdown),
    [ironBreakdown]
  );

  const profileTotal = effectiveProfileCost?.hasPricing
    ? effectiveProfileCost.totalUnitCost
    : null;
  const glassTotal = glassBreakdown?.hasPricing
    ? glassBreakdown.totalUnitCost
    : null;
  const meshTotal = meshBreakdown?.hasPricing
    ? meshBreakdown.totalUnitCost
    : null;
  const accessoryTotal = accessoryRows.some((r) => r.cost != null)
    ? accessoryRows.reduce((s, r) => s + (r.cost ?? 0), 0)
    : null;
  const ironTotal =
    ironBreakdown && ironBreakdown.totalCost > 0
      ? ironBreakdown.totalCost
      : ironRows.some((r) => r.cost != null)
        ? ironRows.reduce((s, r) => s + (r.cost ?? 0), 0)
        : null;

  const grandTotal =
    (profileTotal ?? 0) +
    (glassTotal ?? 0) +
    (meshTotal ?? 0) +
    (accessoryTotal ?? 0) +
    (ironTotal ?? 0);
  const hasAnyCost =
    profileTotal != null ||
    glassTotal != null ||
    meshTotal != null ||
    accessoryTotal != null ||
    ironTotal != null;
  const discountPct = discountPercent(discountId);
  const discountedTotal =
    hasAnyCost && discountPct > 0
      ? applyDiscountAmount(grandTotal, discountId)
      : grandTotal;
  const discountText = discountLabel(discountId);

  const [pricingTick, setPricingTick] = useState(0);
  useEffect(() => {
    function refresh() {
      setPricingTick((n) => n + 1);
    }
    window.addEventListener(PRICING_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(PRICING_UPDATED_EVENT, refresh);
  }, []);

  const saleHint = useMemo(() => {
    void pricingTick;
    const settings = loadPricingSettings();
    const unitArea =
      widthMm && heightMm && widthMm > 0 && heightMm > 0
        ? (widthMm * heightMm) / 1_000_000
        : 1;
    const doubleFromGlass =
      glassBreakdown?.lines.some((l) => l.glazing === "double") ?? false;
    const isDouble = isDoubleGlazing || doubleFromGlass;
    const hasCustom =
      customSalePricePerSqm != null &&
      Number.isFinite(customSalePricePerSqm) &&
      customSalePricePerSqm > 0;

    if (settings.mode === "per_sqm" || hasCustom) {
      const salePerSqm = resolveItemSalePricePerSqm(
        {
          customSalePricePerSqm,
          pricePerSqm: fallbackPricePerSqm,
          systemId,
        },
        systemId
      );
      if (salePerSqm <= 0) return null;
      return perSqmSaleBreakdown(salePerSqm, unitArea, isDouble, settings);
    }

    if (!hasAnyCost || grandTotal <= 0) return null;
    return hybridSaleBreakdown(grandTotal, unitArea, settings);
  }, [
    grandTotal,
    hasAnyCost,
    widthMm,
    heightMm,
    pricingTick,
    systemId,
    isDoubleGlazing,
    fallbackPricePerSqm,
    customSalePricePerSqm,
    glassBreakdown,
  ]);

  const showSummary = hasAnyCost || saleHint != null;

  return (
    <section
      className="mt-3 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      aria-label="حساب الخامات"
    >
      <div className="flex items-center justify-between border-b border-border bg-primary-soft/60 px-3 py-2">
        <p className="text-xs font-semibold text-primary">حساب الخامات</p>
        <p className="truncate text-[11px] text-muted">
          {profileSystem
            ? `${partLabel} · ${profileSystem.name} · تقديري بعد التخصيم`
            : partLabel}
        </p>
      </div>

      {showSummary ? (
        <div className="border-b border-primary/20 bg-primary-soft/40 px-3 py-2.5">
          {hasAnyCost ? (
            discountPct > 0 ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-muted">قبل الخصم</p>
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {formatCurrency(Math.round(grandTotal))} ج.م
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-medium text-primary">
                    {discountText ?? `خصم ${discountPct}%`}
                  </p>
                  <p className="text-[11px] tabular-nums text-muted">
                    −{formatCurrency(Math.round(grandTotal - discountedTotal))}{" "}
                    ج.م
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-primary/15 pt-1">
                  <p className="text-[11px] font-bold text-primary">بعد الخصم</p>
                  <p className="text-base font-bold tabular-nums text-foreground">
                    {formatCurrency(Math.round(discountedTotal))} ج.م
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-primary">
                  إجمالي التكلفة
                </p>
                <p className="text-base font-bold tabular-nums text-foreground">
                  {formatCurrency(Math.round(grandTotal))} ج.م
                </p>
              </div>
            )
          ) : null}
          {saleHint?.mode === "hybrid" ? (
            <div
              className={`space-y-1 ${hasAnyCost ? "mt-2 border-t border-primary/15 pt-2" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-muted">
                  هامش {saleHint.marginPercent}%
                </p>
                <p className="text-[11px] tabular-nums text-muted">
                  +{formatCurrency(Math.round(saleHint.marginAmount))} ج.م
                </p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-muted">
                  مصنعية{" "}
                  {saleHint.laborArea.toFixed(
                    saleHint.laborArea === 1 ? 0 : 2
                  )}{" "}
                  م²
                  {(widthMm ?? 0) * (heightMm ?? 0) > 0 &&
                  (widthMm! * heightMm!) / 1_000_000 < 1
                    ? " (حد أدنى متر)"
                    : ""}
                </p>
                <p className="text-[11px] tabular-nums text-muted">
                  +{formatCurrency(Math.round(saleHint.laborAmount))} ج.م
                </p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-[#C45C26]">
                  سعر البيع المقترح
                </p>
                <p className="text-base font-bold tabular-nums text-[#C45C26]">
                  {formatCurrency(Math.round(saleHint.unitSale))} ج.م
                </p>
              </div>
            </div>
          ) : null}
          {saleHint?.mode === "per_sqm" ? (
            <div
              className={`space-y-1 ${hasAnyCost ? "mt-2 border-t border-primary/15 pt-2" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-muted">
                  {customSalePricePerSqm != null &&
                  Number.isFinite(customSalePricePerSqm) &&
                  customSalePricePerSqm > 0
                    ? "مخصص "
                    : ""}
                  {saleHint.salePricePerSqm} ج.م/م² ×{" "}
                  {saleHint.billableArea.toFixed(
                    saleHint.billableArea === 1 ? 0 : 2
                  )}{" "}
                  م²
                  {saleHint.billableArea > 0 &&
                  (widthMm ?? 0) * (heightMm ?? 0) > 0 &&
                  (widthMm! * heightMm!) / 1_000_000 < 1
                    ? " (حد أدنى متر)"
                    : ""}
                </p>
                <p className="text-[11px] tabular-nums text-muted">
                  {formatCurrency(Math.round(saleHint.baseAmount))} ج.م
                </p>
              </div>
              {saleHint.isDouble && saleHint.doubleAmount > 0 ? (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-muted">
                    زيادة دبل {saleHint.doubleExtraPerSqm} ج.م/م²
                  </p>
                  <p className="text-[11px] tabular-nums text-muted">
                    +{formatCurrency(Math.round(saleHint.doubleAmount))} ج.م
                  </p>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-[#C45C26]">
                  سعر البيع المقترح
                </p>
                <p className="text-base font-bold tabular-nums text-[#C45C26]">
                  {formatCurrency(Math.round(saleHint.unitSale))} ج.م
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <Section
        title="القطاعات"
        total={profileTotal}
        emptyHint={
          systemId && systemId !== "none"
            ? "لا توجد تكلفة للقطاعات — اضبط أسعار العود من تفاصيل النظام"
            : "اختار نظام قطاعات للبند"
        }
      >
        {profileRows.length > 0 ? (
          <RowsList rows={profileRows} />
        ) : (
          <UnpricedMaterialFallback materials={materials} />
        )}
      </Section>

      {glassRows.length > 0 ? (
        <Section title="الزجاج" total={glassTotal}>
          <RowsList rows={glassRows} />
        </Section>
      ) : null}

      {meshRows.length > 0 ? (
        <Section title="السلك" total={meshTotal}>
          <RowsList rows={meshRows} />
        </Section>
      ) : null}

      {accessoryRows.length > 0 || accessoriesBreakdown?.systemName ? (
        <Section
          title="الاكسسوار"
          total={accessoryTotal}
          subtitle={
            accessoriesBreakdown?.systemName
              ? accessoriesBreakdown.systemName
              : undefined
          }
          emptyHint={
            accessoryRows.length === 0
              ? "لا يوجد اكسسوار — الضلف كلها ثابتة أو مفيش فتحات"
              : undefined
          }
        >
          {accessoryRows.length > 0 ? <RowsList rows={accessoryRows} /> : null}
        </Section>
      ) : null}

      {ironRows.length > 0 ? (
        <Section title="الحديد" total={ironTotal}>
          <RowsList rows={ironRows} />
        </Section>
      ) : null}
    </section>
  );
}

function Section({
  title,
  subtitle,
  total,
  emptyHint,
  children,
}: {
  title: string;
  subtitle?: string;
  total: number | null;
  emptyHint?: string;
  children: ReactNode;
}) {
  const hasChildren = children != null && children !== false;
  return (
    <div className="border-t border-border px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0 text-right">
          <p className="text-[11px] font-bold text-primary">{title}</p>
          {subtitle ? (
            <p className="truncate text-[10px] text-muted">{subtitle}</p>
          ) : null}
        </div>
        {total != null ? (
          <p className="shrink-0 text-[12px] font-bold tabular-nums text-foreground">
            {formatCurrency(Math.round(total))} ج.م
          </p>
        ) : null}
      </div>
      {children}
      {emptyHint && !hasChildren ? (
        <p className="text-[10px] text-muted">{emptyHint}</p>
      ) : null}
    </div>
  );
}

function RowsList({ rows }: { rows: MaterialRow[] }) {
  if (rows.length === 0) return null;
  return (
    <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border bg-background/40">
      {rows.map((row) => (
        <li key={row.key} className="px-2.5 py-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 text-right">
              <p className="text-[12px] font-semibold text-foreground">
                {row.label}
              </p>
              {row.sub ? (
                <p className="mt-0.5 text-[10px] text-muted">{row.sub}</p>
              ) : null}
            </div>
            <p className="shrink-0 text-[12px] font-semibold tabular-nums text-foreground">
              {row.qty}
            </p>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-[10px] text-muted">
              {row.unitHint ?? (row.cost != null ? "تكلفة" : "بدون سعر")}
            </p>
            <p
              className={`text-[12px] font-bold tabular-nums ${
                row.cost != null ? "text-primary" : "text-muted"
              }`}
            >
              {row.cost != null
                ? `${formatCurrency(Math.round(row.cost))} ج.م`
                : "—"}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function buildProfileRows(
  breakdown: ProfileCostBreakdown | null | undefined,
  materials: MaterialsBreakdown
): MaterialRow[] {
  if (breakdown?.hasPricing && breakdown.lines.length > 0) {
    return breakdown.lines.map((line) => {
      const row = profileLineToRow(line);
      if (line.category === "panel" && materials.panelStripCount > 0) {
        return {
          ...row,
          label: "بنل",
          sub: `عيدان عرض ١٥ سم · ${materials.panelStripCount} عود`,
        };
      }
      return row;
    });
  }

  // بدون أسعار — أعرض الكميات فقط للأصناف الموجودة
  const candidates: {
    key: string;
    label: string;
    qty: string;
    ok: boolean;
    sub?: string;
  }[] = [
      {
        key: "frame-h",
        label: "حلق مفصلي",
        qty: formatMeters(materials.frameHingedM),
        ok: materials.frameHingedM > 0.0005,
      },
      {
        key: "frame-s",
        label: "حلق جرار",
        qty: formatMeters(materials.frameSlidingM),
        ok: materials.frameSlidingM > 0.0005,
      },
      {
        key: "sash-h",
        label: "ضلفة شباك مفصلي",
        qty: formatMeters(materials.sashHingedM),
        ok: materials.sashHingedM > 0.0005,
      },
      {
        key: "sash-d",
        label: "ضلفة باب مفصلي",
        qty: formatMeters(materials.sashDoorM),
        ok: materials.sashDoorM > 0.0005,
      },
      {
        key: "sash-s",
        label: "ضلفة جرار",
        qty: formatMeters(materials.sashSlidingM),
        ok: materials.sashSlidingM > 0.0005,
      },
      {
        key: "mullion",
        label: "سوقاس",
        qty: formatMeters(materials.mullionTotalM),
        ok: materials.mullionTotalM > 0.0005,
      },
      {
        key: "bouclier",
        label: "بوكلير",
        qty: formatMeters(materials.bouclierM),
        ok: materials.bouclierM > 0.0005,
      },
      {
        key: "bouclier-cap",
        label: "طبة بوكلير",
        qty: formatCount(materials.bouclierCapQty),
        ok: materials.bouclierCapQty > 0,
      },
      {
        key: "coupling",
        label: "كوبلن",
        qty: formatMeters(materials.couplingM),
        ok: materials.couplingM > 0.0005,
      },
      {
        key: "knife",
        label: "سكينة",
        qty: formatMeters(materials.knifeM),
        ok: materials.knifeM > 0.0005,
      },
      {
        key: "bead-sh",
        label: "باكتة سنجل مفصلي",
        qty: formatMeters(materials.beadSingleHingedM),
        ok: materials.beadSingleHingedM > 0.0005,
      },
      {
        key: "bead-dh",
        label: "باكتة دبل مفصلي",
        qty: formatMeters(materials.beadDoubleHingedM),
        ok: materials.beadDoubleHingedM > 0.0005,
      },
      {
        key: "bead-ss",
        label: "باكتة سنجل جرار",
        qty: formatMeters(materials.beadSingleSlidingM),
        ok: materials.beadSingleSlidingM > 0.0005,
      },
      {
        key: "bead-ds",
        label: "باكتة دبل جرار",
        qty: formatMeters(materials.beadDoubleSlidingM),
        ok: materials.beadDoubleSlidingM > 0.0005,
      },
      {
        key: "panel",
        label: "بنل",
        qty: formatMeters(materials.panelM),
        ok: materials.panelM > 0.0005,
        sub:
          materials.panelStripCount > 0
            ? `عيدان عرض ١٥ سم · ${materials.panelStripCount} عود`
            : "عيدان عرض ١٥ سم",
      },
      {
        key: "mesh-profile",
        label: "ضلفة سلك جرار",
        qty: formatMeters(materials.meshSlidingProfileM),
        ok: materials.meshSlidingProfileM > 0.0005,
      },
      {
        key: "four-leaf",
        label: "تقابل ٤ ضلفة",
        qty: formatMeters(materials.fourLeafMeetingM),
        ok: materials.fourLeafMeetingM > 0.0005,
      },
      {
        key: "mesh-meeting",
        label: "تقابل سلك",
        qty: formatMeters(materials.meshMeetingM),
        ok: materials.meshMeetingM > 0.0005,
      },
    ];

  return candidates
    .filter((c) => c.ok)
    .map((c) => ({
      key: c.key,
      label: c.label,
      qty: c.qty,
      cost: null,
      sub: c.sub,
    }));
}

function profileLineToRow(line: ProfileCostLine): MaterialRow {
  if (line.billing === "kit") {
    return {
      key: line.category,
      label: line.label,
      qty: `${line.qty ?? 0} طقم`,
      unitHint:
        line.unitPrice != null && line.unitPrice > 0
          ? `${line.unitPrice} ج.م/طقم`
          : line.productName ?? "طقم",
      cost: line.totalCost > 0 ? line.totalCost : null,
      sub: line.productName,
    };
  }
  return {
    key: line.category,
    label: line.label,
    qty: `${line.lengthM.toFixed(2)} م`,
    unitHint: `${line.barPrice} ج.م / عود ${line.barLengthM}م · ${line.pricePerM} ج.م/م`,
    cost: line.totalCost,
    sub: line.productName,
  };
}

function UnpricedMaterialFallback({
  materials,
}: {
  materials: MaterialsBreakdown;
}) {
  const rows = buildProfileRows(null, materials);
  if (rows.length === 0) {
    return (
      <p className="text-[10px] text-muted">لا توجد قطاعات محسوبة على هذا البند</p>
    );
  }
  return <RowsList rows={rows} />;
}

function buildGlassRows(
  breakdown: GlassBreakdown | null | undefined
): MaterialRow[] {
  if (!breakdown || breakdown.lines.length === 0) return [];
  return breakdown.lines.map((line, i) => ({
    key: `glass-${line.paneId}`,
    label: `زجاج ضلفة ${i + 1}`,
    qty: `${line.areaSqm.toFixed(2)} م²`,
    unitHint:
      line.costPerSqm > 0
        ? `${line.costPerSqm} ج.م/م² · ${line.label}`
        : line.label,
    cost: breakdown.hasPricing && line.totalCost > 0 ? line.totalCost : null,
    sub: [line.glazing === "double" ? "دبل" : "سنجل", line.georgian ? "جورجيا" : null]
      .filter(Boolean)
      .join(" · ") || undefined,
  }));
}

function buildMeshRows(
  breakdown: MeshBreakdown | null | undefined,
  materials: MaterialsBreakdown
): MaterialRow[] {
  const rows: MaterialRow[] = [];
  if (breakdown && breakdown.lines.length > 0) {
    for (const [i, line] of breakdown.lines.entries()) {
      rows.push({
        key: `mesh-${line.paneId}`,
        label: `سلك ضلفة ${i + 1}`,
        qty: `${line.areaSqm.toFixed(2)} م²`,
        unitHint:
          line.costPerSqm > 0
            ? `${line.costPerSqm} ج.م/م² · ${line.label}`
            : line.label,
        cost:
          breakdown.hasPricing && line.totalCost > 0 ? line.totalCost : null,
      });
    }
  } else if (materials.meshAreaSqm > 0.0005) {
    rows.push({
      key: "mesh-area",
      label: "مساحة سلك",
      qty: `${materials.meshAreaSqm.toFixed(2)} م²`,
      cost: null,
    });
  }

  if (materials.meshSlidingWheelQty > 0) {
    rows.push({
      key: "mesh-wheel",
      label: "عجل سلك",
      qty: formatCount(materials.meshSlidingWheelQty),
      unitHint: "٢ لكل ضلفة",
      cost: null,
    });
  }
  if (materials.meshPushHandleQty > 0) {
    rows.push({
      key: "mesh-handle",
      label: "مقبض لطش",
      qty: formatCount(materials.meshPushHandleQty),
      cost: null,
    });
  }
  return rows;
}

function brandByCategoryId(
  brands: AccessoryBrand[],
  labels: AccessoriesBreakdown["brandLabels"],
  category: AccessoryBrandCategory
): AccessoryBrand | undefined {
  const name = labels[category];
  if (!name) return undefined;
  return brands.find((b) => b.category === category && b.name === name);
}

function buildAccessoryRows(
  breakdown: AccessoriesBreakdown | null | undefined,
  brands: AccessoryBrand[]
): MaterialRow[] {
  if (!breakdown?.hasAccessories) return [];
  const rows: MaterialRow[] = [];
  const labels = breakdown.brandLabels;

  function pushPiece(
    key: string,
    label: string,
    qty: number,
    category: AccessoryBrandCategory,
    qtyLabel?: string,
    size?: number
  ) {
    if (qty < 0.5) return;
    const brand = brandByCategoryId(brands, labels, category);
    const unit = accessoryBrandResolvedPrice(brand, size);
    const cost = unit != null ? Math.round(qty * unit * 100) / 100 : null;
    rows.push({
      key,
      label,
      qty: qtyLabel ?? formatCount(qty),
      unitHint:
        unit != null
          ? `${unit} ج.م/قطعة${brand ? ` · ${brand.name}` : ""}${size != null ? ` · ${size}سم` : ""}`
          : brand
            ? brand.name
            : undefined,
      cost,
      sub: accessoryBrandTag(labels, category).replace(/^ · /, "") || undefined,
    });
  }

  function pushMeters(
    key: string,
    label: string,
    meters: number,
    category: AccessoryBrandCategory
  ) {
    if (meters < 0.0005) return;
    const brand = brandByCategoryId(brands, labels, category);
    const unit = accessoryBrandResolvedPrice(brand);
    const cost = unit != null ? Math.round(meters * unit * 100) / 100 : null;
    rows.push({
      key,
      label,
      qty: formatMeters(meters),
      unitHint:
        unit != null
          ? `${unit} ج.م/م${brand ? ` · ${brand.name}` : ""}`
          : brand
            ? brand.name
            : undefined,
      cost,
    });
  }

  pushPiece("hinge", "مفصلات", breakdown.hingeQty, "hinge");

  for (const line of breakdown.tiltScissors) {
    if (line.qty < 0.5) continue;
    pushPiece(
      `tilt-arm-${line.id}`,
      `ذراع قلاب ${line.label}`,
      line.qty,
      "tilt-scissors",
      undefined,
      line.maxDimMm
    );
  }
  pushPiece(
    "tilt-corner-upper",
    "كورنر علوي",
    breakdown.tiltCornerUpperQty,
    "tilt-corner-upper"
  );
  pushPiece(
    "tilt-corner-lower",
    "كورنر سفلي",
    breakdown.tiltCornerLowerQty,
    "tilt-corner-lower"
  );
  pushPiece(
    "tilt-top-hinge",
    "مفصلة علوية جزء الضلفة",
    breakdown.tiltTopHingeQty,
    "tilt-top-hinge"
  );
  pushPiece(
    "tilt-top-frame-hinge",
    "مفصلة علوية جزء الحلق",
    breakdown.tiltTopFrameHingeQty,
    "tilt-top-frame-hinge"
  );
  pushPiece(
    "tilt-bottom-frame-hinge",
    "مفصلة سفلية جزء الحلق",
    breakdown.tiltBottomFrameHingeQty,
    "tilt-bottom-frame-hinge"
  );
  pushPiece(
    "tilt-bottom-sash-hinge",
    "مفصلة سفلية جزء الضلفة",
    breakdown.tiltBottomSashHingeQty,
    "tilt-bottom-sash-hinge"
  );
  pushPiece(
    "tilt-hinge-pin",
    "مفصلة علوية بنز",
    breakdown.tiltHingePinQty,
    "tilt-hinge-pin"
  );
  pushPiece(
    "tilt-corner-striker",
    "سكاك كورنر سفلي",
    breakdown.tiltCornerStrikerQty,
    "tilt-corner-striker"
  );
  pushPiece(
    "tilt-hinge-cover",
    "غطاء مفصلة",
    breakdown.tiltHingeCoverQty,
    "tilt-hinge-cover"
  );

  pushPiece("door-cylinder", "كالون", breakdown.doorCylinderQty, "door-cylinder");
  if (breakdown.doorSignalHandleQty > 0.5) {
    pushPiece(
      "door-signal-handle",
      "مقبض إشارة",
      breakdown.doorSignalHandleQty,
      "door-signal-handle"
    );
    const color = breakdown.doorHandleColorLabel;
    const last = rows[rows.length - 1];
    if (last && color) {
      last.sub = last.sub
        ? `${last.sub} · لون الباب: ${color}`
        : `لون الباب: ${color}`;
    }
  }
  pushPiece(
    "door-escutcheon",
    "وش تسكيك",
    breakdown.doorEscutcheonQty,
    "door-escutcheon"
  );

  const hingedEspQty = breakdown.hingedEspagnolettes.reduce(
    (s, l) => s + l.qty,
    0
  );
  if (hingedEspQty > 0) {
    const brand = brandByCategoryId(brands, labels, "hinged-espagnolette");
    let espCost = 0;
    let priced = false;
    for (const line of breakdown.hingedEspagnolettes) {
      const unit = accessoryBrandResolvedPrice(brand, line.size);
      if (unit != null) {
        espCost += line.qty * unit;
        priced = true;
      }
    }
    const summary = breakdown.hingedEspagnolettes
      .map((l) => `${l.qty}×${l.size}سم`)
      .join(" · ");
    rows.push({
      key: "hinged-esp",
      label: "سبلونة مفصلي",
      qty: summary,
      unitHint: brand?.name,
      cost: priced ? Math.round(espCost * 100) / 100 : null,
      sub: accessoryBrandTag(labels, "hinged-espagnolette").replace(/^ · /, "") || undefined,
    });
  }

  for (const piece of breakdown.hingedLockPieces) {
    if (piece.qty < 0.5) continue;
    pushPiece(
      `hinged-lock-${piece.name}`,
      piece.name,
      piece.qty,
      "hinged-lock"
    );
  }

  for (const piece of breakdown.bouclierLockPieces) {
    if (piece.qty < 0.5) continue;
    pushPiece(
      `bouclier-lock-${piece.name}`,
      piece.name,
      piece.qty,
      "bouclier-lock"
    );
  }

  pushPiece("bolt", "ترباس", breakdown.boltQty, "bouclier-bolt");

  for (const piece of breakdown.bouclierBoltLockPieces) {
    if (piece.qty < 0.5) continue;
    pushPiece(
      `bolt-lock-${piece.name}`,
      piece.name,
      piece.qty,
      "bouclier-bolt-lock"
    );
  }

  pushPiece(
    "protruding-handle",
    "مقبض بارز",
    breakdown.protrudingHandleQty,
    "protruding-handle"
  );

  pushPiece("roller", "عجل جرار", breakdown.rollerQty, "roller");
  pushMeters("brush", "فرش", breakdown.brushLengthM, "brush");

  const slidingEspQty = breakdown.slidingEspagnolettes.reduce(
    (s, l) => s + l.qty,
    0
  );
  if (slidingEspQty > 0) {
    const brand = brandByCategoryId(brands, labels, "sliding-espagnolette");
    let espCost = 0;
    let priced = false;
    for (const line of breakdown.slidingEspagnolettes) {
      const unit = accessoryBrandResolvedPrice(brand, line.size);
      if (unit != null) {
        espCost += line.qty * unit;
        priced = true;
      }
    }
    const summary = breakdown.slidingEspagnolettes
      .map((l) => `${l.qty}×${l.size}سم`)
      .join(" · ");
    rows.push({
      key: "sliding-esp",
      label: "سبلونة جرار",
      qty: summary,
      unitHint: brand?.name,
      cost: priced ? Math.round(espCost * 100) / 100 : null,
      sub: accessoryBrandTag(labels, "sliding-espagnolette").replace(/^ · /, "") || undefined,
    });
  }

  for (const piece of breakdown.slidingLockPieces) {
    if (piece.qty < 0.5) continue;
    pushPiece(
      `sliding-lock-${piece.name}`,
      piece.name,
      piece.qty,
      "sliding-lock"
    );
  }

  pushPiece(
    "recessed-handle",
    "مقبض غاطس",
    breakdown.recessedHandleQty,
    "recessed-handle"
  );

  return rows;
}

function buildIronRows(
  breakdown: IronBreakdown | null | undefined
): MaterialRow[] {
  if (!breakdown || breakdown.totalM < 0.0005) return [];
  const rows: MaterialRow[] = [];

  const priceHint = (line?: IronBreakdown["lines"][number]) => {
    if (!line) return undefined;
    if (
      line.barPrice != null &&
      line.barPrice > 0 &&
      line.barLengthM != null &&
      line.barLengthM > 0 &&
      line.pricePerM != null
    ) {
      return `${line.barPrice} ج.م / عود ${line.barLengthM}م · ${line.pricePerM} ج.م/م`;
    }
    if (line.pricePerM != null) return `${line.pricePerM} ج.م/م`;
    return undefined;
  };

  const pushMeters = (
    key: string,
    label: string,
    lengthM: number,
    line?: IronBreakdown["lines"][number]
  ) => {
    if (lengthM < 0.0005) return;
    const barsApprox = line?.barsApprox;
    rows.push({
      key,
      label,
      qty:
        barsApprox != null && barsApprox > 0
          ? `${formatMeters(lengthM)} · ≈${barsApprox} عود`
          : formatMeters(lengthM),
      cost:
        line?.totalCost != null && line.totalCost > 0 ? line.totalCost : null,
      unitHint: priceHint(line),
    });
  };

  const lineOf = (role: string) =>
    breakdown.lines.find((l) => l.role === role);

  pushMeters(
    "iron-frame-hinged",
    "حديد حلق مفصلي",
    breakdown.frameHingedM,
    lineOf("frame-hinged")
  );
  pushMeters(
    "iron-frame-sliding",
    "حديد حلق جرار",
    breakdown.frameSlidingM,
    lineOf("frame-sliding")
  );
  pushMeters(
    "iron-sash-hinged",
    "حديد ضلفة مفصلي شباك",
    breakdown.sashHingedM,
    lineOf("sash-hinged")
  );
  pushMeters(
    "iron-sash-door",
    "حديد ضلفة باب",
    breakdown.sashDoorM,
    lineOf("sash-door")
  );
  pushMeters(
    "iron-sash-sliding",
    "حديد ضلفة جرار",
    breakdown.sashSlidingM,
    lineOf("sash-sliding")
  );
  pushMeters(
    "iron-mullion",
    "حديد سوقاس",
    breakdown.mullionM,
    lineOf("mullion")
  );

  if (breakdown.trackM > 0.0005 || breakdown.trackQty > 0) {
    const track = lineOf("track");
    rows.push({
      key: "iron-track",
      label: "تراك جرار",
      qty: `${formatCount(breakdown.trackQty)} · ${formatMeters(breakdown.trackM)}`,
      cost:
        track?.totalCost != null && track.totalCost > 0
          ? track.totalCost
          : null,
      unitHint: priceHint(track),
    });
  }

  if (breakdown.hingeStripM > 0.0005 || breakdown.hingeStripQty > 0) {
    const strip = lineOf("hinge-strip");
    rows.push({
      key: "iron-hinge-strip",
      label: "شريحة مفصلة",
      qty: `${formatCount(breakdown.hingeStripQty)} · ${formatMeters(breakdown.hingeStripM)}${
        strip?.barsApprox ? ` · ≈${strip.barsApprox} عود` : ""
      }`,
      cost:
        strip?.totalCost != null && strip.totalCost > 0
          ? strip.totalCost
          : null,
      unitHint: priceHint(strip),
    });
  }

  if (rows.length === 0) {
    rows.push({
      key: "iron-total",
      label: "حديد",
      qty: formatMeters(breakdown.totalM),
      cost: null,
      sub: breakdown.systemName,
    });
  }
  return rows;
}
