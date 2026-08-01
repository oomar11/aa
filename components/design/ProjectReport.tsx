"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { WindowPreview } from "@/components/design/WindowPreview";
import { useUnit } from "@/components/settings/UnitProvider";
import { loadCompany } from "@/lib/company";
import {
  customers,
  loadLocalCustomers,
  type Customer,
} from "@/lib/customers";
import {
  itemAreaSqm,
  itemTotalPrice,
  type DesignItem,
} from "@/lib/design-items";
import { suggestItemName } from "@/lib/item-naming";
import { loadMaterialCatalog } from "@/lib/material-systems";
import {
  REPORT_PAGE_HEIGHT_PX,
  REPORT_PAGE_WIDTH_PX,
  chunkReportItems,
} from "@/lib/project-pdf";
import { reportMaterialRows } from "@/lib/project-report";
import {
  getItemsForProject,
  getProjectById,
  type Project,
} from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import { formatSizePair, type LengthUnit } from "@/lib/units";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { MaterialCatalog } from "@/lib/material-systems";

type Props = {
  customerId: string;
  projectId: string;
  /** رسم التقرير فقط (لتوليد PDF) بدون شريط الأدوات */
  exportOnly?: boolean;
};

function mergeCustomers(): Customer[] {
  if (typeof window === "undefined") return customers;
  const local = loadLocalCustomers();
  const localIds = new Set(local.map((c) => c.id));
  return [...local, ...customers.filter((c) => !localIds.has(c.id))];
}

function readCustomer(customerId: string): Customer | null {
  return mergeCustomers().find((c) => c.id === customerId) ?? null;
}

function readReportData(customerId: string, projectId: string) {
  return {
    company: loadCompany(),
    customer: readCustomer(customerId),
    project: getProjectById(projectId),
    items: getItemsForProject(projectId),
  };
}

export function ProjectReport({
  customerId,
  projectId,
  exportOnly = false,
}: Props) {
  const { unit } = useUnit();
  const [{ company, customer, project, items }] = useState(() =>
    readReportData(customerId, projectId)
  );

  const catalog = useMemo(() => loadMaterialCatalog(), []);

  const totals = useMemo(() => {
    const area = items.reduce((sum, item) => sum + itemAreaSqm(item), 0);
    const price = items.reduce((sum, item) => sum + itemTotalPrice(item), 0);
    const qty = items.reduce((sum, item) => sum + item.qty, 0);
    return { area, price, qty };
  }, [items]);

  const printedAt = useMemo(
    () =>
      new Intl.DateTimeFormat("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date()),
    []
  );

  const itemPages = useMemo(() => chunkReportItems(items), [items]);

  if (!project) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-semibold text-foreground">المشروع غير موجود</p>
        <Link
          href={ROUTES.design.projects(customerId)}
          className="text-sm text-primary"
        >
          مشاريع العميل
        </Link>
      </div>
    );
  }

  return (
    <div
      className="project-report bg-white text-[#152033]"
      style={{
        width: REPORT_PAGE_WIDTH_PX,
        fontFamily:
          'Cairo, "Noto Sans Arabic", "Segoe UI", Tahoma, sans-serif',
      }}
      data-export={exportOnly ? "1" : "0"}
    >
      <div className="report-sheet">
        {itemPages.map((pageItems, pageIndex) => {
          const isFirst = pageIndex === 0;
          const isLast = pageIndex === itemPages.length - 1;
          const baseIndex = pageIndex * 4;

          return (
            <section
              key={`page-${pageIndex}`}
              className="report-page box-border flex flex-col overflow-hidden bg-white"
              style={{
                width: REPORT_PAGE_WIDTH_PX,
                height: REPORT_PAGE_HEIGHT_PX,
                padding: "28px 32px",
              }}
            >
              {isFirst ? (
                <header className="shrink-0 border-b-2 border-[#2b7de9] pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 text-right">
                      <h1
                        className="truncate text-[22px] font-bold text-[#152033]"
                        style={{ lineHeight: "28px", margin: 0 }}
                      >
                        {company?.name || "شركتي للـ uPVC"}
                      </h1>
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 11,
                          color: "#5a6578",
                        }}
                      >
                        {company?.phone ? (
                          <p
                            dir="ltr"
                            className="text-right"
                            style={{
                              margin: 0,
                              lineHeight: "16px",
                              height: 16,
                            }}
                          >
                            {company.phone}
                          </p>
                        ) : null}
                        {company?.address ? (
                          <p
                            className="truncate"
                            style={{
                              margin: 0,
                              marginTop: company?.phone ? 4 : 0,
                              lineHeight: "16px",
                              height: 16,
                            }}
                          >
                            {company.address}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <table
                      className="shrink-0"
                      style={{
                        width: 240,
                        borderCollapse: "separate",
                        borderSpacing: 0,
                        textAlign: "left",
                      }}
                    >
                      <tbody>
                        <tr>
                          <td
                            style={{
                              padding: "0 0 10px",
                              fontSize: 12,
                              fontWeight: 600,
                              color: "#2b7de9",
                              lineHeight: "20px",
                              whiteSpace: "nowrap",
                              verticalAlign: "top",
                            }}
                          >
                            عرض أسعار
                          </td>
                        </tr>
                        <tr>
                          <td
                            style={{
                              padding: "0 0 10px",
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#152033",
                              lineHeight: "22px",
                              verticalAlign: "top",
                              maxWidth: 240,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {project.name}
                          </td>
                        </tr>
                        <tr>
                          <td
                            style={{
                              padding: 0,
                              fontSize: 11,
                              color: "#6b7585",
                              lineHeight: "18px",
                              whiteSpace: "nowrap",
                              verticalAlign: "top",
                            }}
                          >
                            تاريخ التقرير: {printedAt}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div
                    className="mt-3 grid grid-cols-2 gap-3 rounded-lg border border-[#e4e8ee] bg-[#f7f9fc] px-3 py-2.5 text-[11px]"
                    style={{ gap: 12 }}
                  >
                    <div className="min-w-0">
                      <p
                        style={{
                          margin: 0,
                          color: "#6b7585",
                          lineHeight: "15px",
                          height: 15,
                        }}
                      >
                        العميل
                      </p>
                      <p
                        className="truncate font-bold text-[#152033]"
                        style={{
                          margin: 0,
                          marginTop: 4,
                          lineHeight: "17px",
                          height: 17,
                        }}
                      >
                        {customer?.name ?? "—"}
                      </p>
                      {customer?.phone ? (
                        <p
                          className="text-[#5a6578]"
                          dir="ltr"
                          style={{
                            margin: 0,
                            marginTop: 4,
                            lineHeight: "15px",
                            height: 15,
                          }}
                        >
                          {customer.phone}
                        </p>
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p
                        style={{
                          margin: 0,
                          color: "#6b7585",
                          lineHeight: "15px",
                          height: 15,
                        }}
                      >
                        المشروع
                      </p>
                      <p
                        className="truncate font-bold text-[#152033]"
                        style={{
                          margin: 0,
                          marginTop: 4,
                          lineHeight: "17px",
                          height: 17,
                        }}
                      >
                        {project.location || project.name}
                      </p>
                      <p
                        className="truncate text-[#5a6578]"
                        style={{
                          margin: 0,
                          marginTop: 4,
                          lineHeight: "15px",
                          height: 15,
                        }}
                      >
                        {formatDate(project.createdAt)} · {items.length} بند
                      </p>
                    </div>
                  </div>
                </header>
              ) : (
                <header className="flex shrink-0 items-center justify-between border-b border-[#e4e8ee] pb-2 text-[11px]">
                  <p
                    className="font-bold text-[#152033]"
                    style={{ margin: 0, lineHeight: "16px" }}
                  >
                    {company?.name || "شركتي للـ uPVC"}
                  </p>
                  <p
                    className="truncate text-[#6b7585]"
                    style={{ margin: 0, lineHeight: "16px", maxWidth: "55%" }}
                  >
                    {project.name} · صفحة {pageIndex + 1}
                  </p>
                </header>
              )}

              <div className="mt-3 min-h-0 flex-1">
                {pageItems.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#d5dbe5] text-sm text-[#6b7585]">
                    لا توجد بنود في المشروع حالياً
                  </div>
                ) : (
                  <ul className="grid h-full grid-cols-2 grid-rows-2 gap-3">
                    {pageItems.map((item, i) => (
                      <li key={item.id} className="min-h-0">
                        <ReportItemCard
                          item={item}
                          index={baseIndex + i}
                          unit={unit}
                          project={project as Project}
                          catalog={catalog}
                        />
                      </li>
                    ))}
                    {/* خلايا فاضية تحافظ على الشبكة لو الصفحة ناقصة */}
                    {Array.from({ length: Math.max(0, 4 - pageItems.length) }).map(
                      (_, i) => (
                        <li key={`empty-${i}`} className="min-h-0" aria-hidden />
                      )
                    )}
                  </ul>
                )}
              </div>

              {isLast ? (
                <footer className="mt-3 shrink-0 rounded-lg border border-[#2b7de9]/30 bg-[#f3f8ff] px-3 py-2.5">
                  <div className="grid grid-cols-3 gap-2 text-[12px]">
                    <div>
                      <p className="text-[#6b7585]">إجمالي العدد</p>
                      <p className="mt-0.5 font-bold">{totals.qty}</p>
                    </div>
                    <div>
                      <p className="text-[#6b7585]">إجمالي المساحة</p>
                      <p className="mt-0.5 font-bold">
                        {totals.area.toFixed(2)} م²
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-[#6b7585]">الإجمالي</p>
                      <p className="mt-0.5 text-[16px] font-bold text-[#2b7de9]">
                        {formatCurrency(Math.round(totals.price))} ج.م
                      </p>
                    </div>
                  </div>
                </footer>
              ) : (
                <footer className="mt-2 shrink-0 text-center text-[10px] text-[#8a93a3]">
                  صفحة {pageIndex + 1} من {itemPages.length}
                </footer>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ReportItemCard({
  item,
  index,
  unit,
  project,
  catalog,
}: {
  item: DesignItem;
  index: number;
  unit: LengthUnit;
  project: Project;
  catalog: MaterialCatalog;
}) {
  const name = item.name?.trim() || suggestItemName(item);
  const area = itemAreaSqm(item);
  const price = itemTotalPrice(item);
  const materials = reportMaterialRows(item, project, catalog).slice(0, 3);

  const materialRows = Math.max(materials.length, 1);
  const materialsBlockH = 16 + materialRows * 28;

  return (
    <article
      className="h-full min-h-0 overflow-hidden rounded-lg border border-[#d9e0ea] bg-white"
      style={{
        display: "grid",
        // الرسم يصغر؛ المقاسات والخامات ثابتين عشان متتقصّش/تتراكب
        gridTemplateRows:
          materials.length > 0
            ? `auto minmax(72px, 1fr) auto ${materialsBlockH}px`
            : "auto minmax(72px, 1fr) auto",
        gap: 8,
        padding: 10,
        fontFamily:
          'Cairo, "Noto Sans Arabic", "Segoe UI", Tahoma, sans-serif',
      }}
    >
      <div className="flex items-start justify-between gap-2 border-b border-[#eef1f5] pb-1.5">
        <div className="min-w-0">
          <p
            className="text-[10px] font-semibold text-[#2b7de9]"
            style={{ lineHeight: "14px", margin: 0 }}
          >
            بند {index + 1}
          </p>
          <h4
            className="truncate text-[13px] font-bold text-[#152033]"
            style={{ lineHeight: "18px", margin: 0 }}
          >
            {name}
          </h4>
        </div>
        <p
          className="shrink-0 text-[12px] font-bold text-[#2b7de9]"
          style={{ lineHeight: "18px", margin: 0 }}
          dir="ltr"
        >
          {formatCurrency(Math.round(price))}
          <span style={{ marginInlineStart: 4 }}>ج.م</span>
        </p>
      </div>

      <div className="flex min-h-0 items-center justify-center overflow-hidden rounded-md border border-[#e8edf3] bg-[#f4f7fb] p-1.5">
        <WindowPreview
          style={item.style}
          templateId={item.templateId}
          layout={item.layout}
          panes={item.panes}
          frameColor={item.frameColor}
          widthMm={item.widthMm}
          heightMm={item.heightMm}
          forceLight
          showDimensions
          unit={unit}
          className="h-full w-auto max-h-full max-w-full"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
        }}
      >
        <Meta
          label="المقاس"
          value={formatSizePair(item.widthMm, item.heightMm, unit)}
          ltr
        />
        <Meta label="العدد" value={String(item.qty)} />
        <Meta label="المساحة" value={`${area.toFixed(2)} م²`} ltr />
        <Meta
          label="سعر المتر"
          value={`${formatCurrency(Math.round(item.pricePerSqm))} ج.م`}
          ltr
        />
      </div>

      {materials.length > 0 ? (
        <div
          style={{
            background: "#f7f9fc",
            borderRadius: 6,
            padding: "6px 8px",
            overflow: "hidden",
            height: materialsBlockH,
            boxSizing: "border-box",
          }}
        >
          {materials.map((row) => (
            <div
              key={row.label}
              style={{
                display: "block",
                fontSize: 11,
                lineHeight: "28px",
                height: 28,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                margin: 0,
                padding: 0,
              }}
            >
              <span style={{ color: "#6b7585" }}>{row.label}: </span>
              <span style={{ color: "#152033", fontWeight: 700 }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function Meta({
  label,
  value,
  ltr = false,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div
      style={{
        background: "#f7f9fc",
        borderRadius: 6,
        padding: "6px 7px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          color: "#6b7585",
          fontSize: 9,
          lineHeight: "14px",
          height: 14,
          margin: 0,
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 5,
          color: "#152033",
          fontSize: 11,
          fontWeight: 700,
          lineHeight: "16px",
          height: 16,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        dir={ltr ? "ltr" : undefined}
      >
        {value}
      </div>
    </div>
  );
}
