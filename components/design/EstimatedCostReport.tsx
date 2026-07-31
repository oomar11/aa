"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  REPORT_PAGE_HEIGHT_PX,
  REPORT_PAGE_WIDTH_PX,
} from "@/lib/project-pdf";
import {
  buildProjectEstimatedCost,
  costMoneyLabel,
  costQtyLabel,
  type CostSectionId,
  type EstimatedCostData,
  type EstimatedCostLine,
  type ItemEstimatedCost,
} from "@/lib/project-estimated-cost";
import { formatCurrency } from "@/lib/utils";

type Props = {
  customerId: string;
  projectId: string;
};

const SECTION_COLOR: Record<CostSectionId, string> = {
  profiles: "#2b7de9",
  glass: "#0d9488",
  mesh: "#7c3aed",
  accessories: "#c2410c",
  iron: "#475569",
};

export function EstimatedCostReport({ customerId, projectId }: Props) {
  const [data] = useState(() =>
    buildProjectEstimatedCost(customerId, projectId)
  );

  if (!data) {
    return (
      <div className="report-sheet" style={{ width: REPORT_PAGE_WIDTH_PX }}>
        <section
          className="report-page box-border flex items-center justify-center bg-white text-sm text-[#6b7585]"
          style={{
            width: REPORT_PAGE_WIDTH_PX,
            height: REPORT_PAGE_HEIGHT_PX,
          }}
        >
          المشروع غير موجود
        </section>
      </div>
    );
  }

  const pages: Array<
    | { kind: "summary"; items: ItemEstimatedCost[]; index: number }
    | { kind: "lines"; lines: EstimatedCostLine[]; index: number }
  > = [];

  data.summaryPages.forEach((items, i) => {
    pages.push({ kind: "summary", items, index: i });
  });
  data.linePages.forEach((lines, i) => {
    if (lines.length === 0 && data.summaryPages.length > 0) return;
    pages.push({ kind: "lines", lines, index: i });
  });
  if (pages.length === 0) {
    pages.push({ kind: "summary", items: [], index: 0 });
  }

  return (
    <div
      className="estimated-cost-report bg-white text-[#152033]"
      style={{
        width: REPORT_PAGE_WIDTH_PX,
        fontFamily:
          'Cairo, "Noto Sans Arabic", "Segoe UI", Tahoma, sans-serif',
      }}
    >
      <div className="report-sheet">
        {pages.map((page, pageIndex) =>
          page.kind === "summary" ? (
            <SummaryPage
              key={`sum-${page.index}`}
              data={data}
              items={page.items}
              pageIndex={pageIndex}
              pageCount={pages.length}
              isFirstSummary={page.index === 0}
            />
          ) : (
            <LinesPage
              key={`lines-${page.index}`}
              data={data}
              lines={page.lines}
              pageIndex={pageIndex}
              pageCount={pages.length}
            />
          )
        )}
      </div>
    </div>
  );
}

function ReportHeader({
  data,
  subtitle,
}: {
  data: EstimatedCostData;
  subtitle?: string;
}) {
  return (
    <header className="shrink-0 border-b-2 border-[#0f766e] pb-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 text-right">
          <h1
            className="truncate text-[22px] font-bold text-[#152033]"
            style={{ lineHeight: "28px", margin: 0 }}
          >
            {data.companyName}
          </h1>
          {data.companyPhone ? (
            <p
              dir="ltr"
              className="text-right text-[11px] text-[#5a6578]"
              style={{ margin: 0, marginTop: 6, lineHeight: "16px" }}
            >
              {data.companyPhone}
            </p>
          ) : null}
        </div>
        <table
          className="shrink-0"
          style={{
            width: 250,
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
                  color: "#0f766e",
                  lineHeight: "20px",
                  whiteSpace: "nowrap",
                }}
              >
                تكلفة المشروع التقديرية
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
                  maxWidth: 250,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {data.projectName}
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
                }}
              >
                {subtitle ?? `تاريخ التقرير: ${data.printedAt}`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </header>
  );
}

function SummaryPage({
  data,
  items,
  pageIndex,
  pageCount,
  isFirstSummary,
}: {
  data: EstimatedCostData;
  items: ItemEstimatedCost[];
  pageIndex: number;
  pageCount: number;
  isFirstSummary: boolean;
}) {
  const sectionRows = useMemo(
    () =>
      (
        [
          "profiles",
          "glass",
          "mesh",
          "accessories",
          "iron",
        ] as CostSectionId[]
      )
        .map((id) => ({
          id,
          title:
            id === "profiles"
              ? "القطاعات"
              : id === "glass"
                ? "الزجاج"
                : id === "mesh"
                  ? "السلك"
                  : id === "accessories"
                    ? "الاكسسوار"
                    : "الحديد",
          total: data.sectionTotals[id],
        }))
        .filter((r) => r.total > 0.005),
    [data.sectionTotals]
  );

  return (
    <section
      className="report-page box-border flex flex-col overflow-hidden bg-white"
      style={{
        width: REPORT_PAGE_WIDTH_PX,
        height: REPORT_PAGE_HEIGHT_PX,
        padding: "28px 32px",
      }}
    >
      {isFirstSummary ? (
        <>
          <ReportHeader data={data} />
          <div
            className="mt-3 grid grid-cols-2 rounded-lg border border-[#e4e8ee] bg-[#f7f9fc] px-3 py-2.5 text-[11px]"
            style={{ gap: 12 }}
          >
            <div className="min-w-0">
              <p style={{ margin: 0, color: "#6b7585", lineHeight: "15px" }}>
                العميل
              </p>
              <p
                className="truncate font-bold text-[#152033]"
                style={{ margin: 0, marginTop: 4, lineHeight: "17px" }}
              >
                {data.customerName}
              </p>
              {data.customerPhone ? (
                <p
                  dir="ltr"
                  className="text-[#5a6578]"
                  style={{ margin: 0, marginTop: 4, lineHeight: "15px" }}
                >
                  {data.customerPhone}
                </p>
              ) : null}
            </div>
            <div className="min-w-0">
              <p style={{ margin: 0, color: "#6b7585", lineHeight: "15px" }}>
                المشروع
              </p>
              <p
                className="truncate font-bold text-[#152033]"
                style={{ margin: 0, marginTop: 4, lineHeight: "17px" }}
              >
                {data.projectLocation || data.projectName}
              </p>
              <p
                className="truncate text-[#5a6578]"
                style={{ margin: 0, marginTop: 4, lineHeight: "15px" }}
              >
                {data.createdAtLabel} · {data.itemCount} بند · عدد{" "}
                {data.totalQty}
              </p>
            </div>
          </div>

          <div
            className="mt-3 rounded-lg border border-[#99f6e4] bg-[#f0fdfa] px-3 py-3"
            style={{ textAlign: "right" }}
          >
            {data.hasAnyCost ? (
              data.beforeDiscount - data.afterDiscount > 0.5 ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        color: "#6b7585",
                        lineHeight: "16px",
                      }}
                    >
                      قبل الخصم
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 700,
                        lineHeight: "20px",
                      }}
                    >
                      {formatCurrency(Math.round(data.beforeDiscount))} ج.م
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-[#99f6e4] pt-1">
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#0f766e",
                        lineHeight: "18px",
                      }}
                    >
                      الإجمالي التقديري بعد الخصم
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 20,
                        fontWeight: 800,
                        color: "#134e4a",
                        lineHeight: "28px",
                      }}
                    >
                      {formatCurrency(Math.round(data.afterDiscount))} ج.م
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#0f766e",
                      lineHeight: "18px",
                    }}
                  >
                    الإجمالي التقديري
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 22,
                      fontWeight: 800,
                      color: "#134e4a",
                      lineHeight: "28px",
                    }}
                  >
                    {formatCurrency(Math.round(data.afterDiscount))} ج.م
                  </p>
                </div>
              )
            ) : (
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "#6b7585",
                  lineHeight: "18px",
                }}
              >
                مفيش أسعار كافية لحساب التكلفة — اضبط أسعار القطاعات والزجاج
                والاكسسوار من الخامات
              </p>
            )}
            <p
              style={{
                margin: 0,
                marginTop: 8,
                fontSize: 10,
                color: "#5a6578",
                lineHeight: "14px",
              }}
            >
              تقدير من أسعار الخامات المسجّلة · قطاعات · زجاج · سلك · اكسسوار ·
              حديد
            </p>
          </div>

          {sectionRows.length > 0 ? (
            <div className="mt-3">
              <h3
                style={{
                  margin: 0,
                  marginBottom: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#0f766e",
                  lineHeight: "18px",
                }}
              >
                ملخص حسب النوع
              </h3>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 11,
                }}
              >
                <tbody>
                  {sectionRows.map((row) => (
                    <tr key={row.id}>
                      <td
                        style={{
                          padding: "6px 8px",
                          borderBottom: "1px solid #eef1f5",
                          fontWeight: 600,
                          color: SECTION_COLOR[row.id],
                          lineHeight: "16px",
                        }}
                      >
                        {row.title}
                      </td>
                      <td
                        style={{
                          padding: "6px 8px",
                          borderBottom: "1px solid #eef1f5",
                          textAlign: "left",
                          fontWeight: 700,
                          lineHeight: "16px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {costMoneyLabel(row.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : (
        <header className="flex shrink-0 items-center justify-between border-b border-[#e4e8ee] pb-2 text-[11px]">
          <p className="font-bold text-[#152033]" style={{ margin: 0 }}>
            {data.companyName}
          </p>
          <p className="text-[#6b7585]" style={{ margin: 0 }}>
            تكلفة تقديرية · {data.projectName} · صفحة {pageIndex + 1}
          </p>
        </header>
      )}

      <div className="mt-3 min-h-0 flex-1 overflow-hidden">
        <h3
          style={{
            margin: 0,
            marginBottom: 6,
            fontSize: 12,
            fontWeight: 700,
            color: "#0f766e",
            lineHeight: "18px",
          }}
        >
          تكلفة البنود
        </h3>
        {items.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-[#d5dbe5] text-sm text-[#6b7585]">
            مفيش بنود في المشروع
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 11,
            }}
          >
            <thead>
              <tr style={{ background: "#f7f9fc" }}>
                <th style={thStyle("42%")}>البند</th>
                <th style={thStyle("12%", "center")}>العدد</th>
                <th style={thStyle("23%", "left")}>قبل الخصم</th>
                <th style={thStyle("23%", "left")}>بعد الخصم</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.itemId}>
                  <td style={tdStyle()}>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div
                      style={{
                        marginTop: 2,
                        fontSize: 10,
                        color: "#6b7585",
                        lineHeight: "14px",
                      }}
                    >
                      لون: {item.frameColorLabel}
                      {item.discountText ? ` · ${item.discountText}` : ""}
                    </div>
                  </td>
                  <td style={tdStyle("center")}>{item.qty}</td>
                  <td style={tdStyle("left")}>
                    {costMoneyLabel(item.beforeDiscount)}
                  </td>
                  <td style={{ ...tdStyle("left"), fontWeight: 700 }}>
                    {costMoneyLabel(item.afterDiscount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <footer
        className="mt-2 shrink-0 text-center text-[10px] text-[#8a93a3]"
        style={{ lineHeight: "14px" }}
      >
        صفحة {pageIndex + 1} من {pageCount}
      </footer>
    </section>
  );
}

function LinesPage({
  data,
  lines,
  pageIndex,
  pageCount,
}: {
  data: EstimatedCostData;
  lines: EstimatedCostLine[];
  pageIndex: number;
  pageCount: number;
}) {
  const grouped = useMemo(() => {
    const order: CostSectionId[] = [
      "profiles",
      "glass",
      "mesh",
      "accessories",
      "iron",
    ];
    const titles: Record<CostSectionId, string> = {
      profiles: "القطاعات",
      glass: "الزجاج",
      mesh: "السلك",
      accessories: "الاكسسوار",
      iron: "الحديد",
    };
    return order
      .map((id) => ({
        id,
        title: titles[id],
        lines: lines.filter((l) => l.section === id),
      }))
      .filter((g) => g.lines.length > 0);
  }, [lines]);

  return (
    <section
      className="report-page box-border flex flex-col overflow-hidden bg-white"
      style={{
        width: REPORT_PAGE_WIDTH_PX,
        height: REPORT_PAGE_HEIGHT_PX,
        padding: "28px 32px",
      }}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-[#e4e8ee] pb-2 text-[11px]">
        <p className="font-bold text-[#152033]" style={{ margin: 0 }}>
          {data.companyName}
        </p>
        <p className="text-[#6b7585]" style={{ margin: 0 }}>
          تفاصيل التكلفة · {data.projectName} · صفحة {pageIndex + 1}
        </p>
      </header>

      <div className="mt-3 min-h-0 flex-1 overflow-hidden">
        {lines.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#d5dbe5] text-sm text-[#6b7585]">
            مفيش خامات محسوبة بعد
          </div>
        ) : (
          <div className="space-y-3">
            {grouped.map((group) => (
              <section key={group.id}>
                <h3
                  style={{
                    margin: 0,
                    marginBottom: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    color: SECTION_COLOR[group.id],
                    lineHeight: "18px",
                  }}
                >
                  {group.title}
                </h3>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 11,
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f7f9fc" }}>
                      <th style={thStyle("36%")}>الصنف</th>
                      <th style={thStyle("26%", "center")}>الكمية</th>
                      <th style={thStyle("16%", "left")}>التكلفة</th>
                      <th style={thStyle("22%")}>ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.lines.map((line) => (
                      <tr key={line.key}>
                        <td style={{ ...tdStyle(), fontWeight: 600 }}>
                          {line.label}
                        </td>
                        <td style={tdStyle("center")}>
                          {costQtyLabel(line)}
                        </td>
                        <td
                          style={{
                            ...tdStyle("left"),
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {costMoneyLabel(line.cost)}
                        </td>
                        <td
                          style={{
                            ...tdStyle(),
                            color: "#6b7585",
                            maxWidth: 160,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={line.note || undefined}
                        >
                          {line.note || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </div>
        )}
      </div>

      <footer
        className="mt-2 shrink-0 text-center text-[10px] text-[#8a93a3]"
        style={{ lineHeight: "14px" }}
      >
        تقديري من أسعار الخامات · صفحة {pageIndex + 1} من {pageCount}
      </footer>
    </section>
  );
}

function thStyle(
  width: string,
  align: "right" | "left" | "center" = "right"
): CSSProperties {
  return {
    textAlign: align,
    padding: "6px 8px",
    borderBottom: "1px solid #e4e8ee",
    color: "#6b7585",
    fontWeight: 600,
    width,
  };
}

function tdStyle(
  align: "right" | "left" | "center" = "right"
): CSSProperties {
  return {
    padding: "7px 8px",
    borderBottom: "1px solid #eef1f5",
    color: "#152033",
    lineHeight: "16px",
    textAlign: align,
  };
}
