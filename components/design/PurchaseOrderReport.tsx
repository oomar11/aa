"use client";

import { useMemo, useState } from "react";
import {
  REPORT_PAGE_HEIGHT_PX,
  REPORT_PAGE_WIDTH_PX,
} from "@/lib/project-pdf";
import {
  buildProjectPurchaseOrder,
  purchaseQtyLabel,
  type PurchaseLine,
  type PurchaseOrderData,
  type PurchaseSectionId,
} from "@/lib/project-purchase-order";

type Props = {
  customerId: string;
  projectId: string;
};

const SECTION_COLOR: Record<PurchaseSectionId, string> = {
  profiles: "#2b7de9",
  glass: "#0d9488",
  mesh: "#7c3aed",
  accessories: "#c2410c",
  iron: "#475569",
};

export function PurchaseOrderReport({ customerId, projectId }: Props) {
  const [data] = useState(() =>
    buildProjectPurchaseOrder(customerId, projectId)
  );

  if (!data) {
    return (
      <div
        className="report-sheet"
        style={{ width: REPORT_PAGE_WIDTH_PX }}
      >
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

  return (
    <div
      className="purchase-order-report bg-white text-[#152033]"
      style={{
        width: REPORT_PAGE_WIDTH_PX,
        fontFamily:
          'Cairo, "Noto Sans Arabic", "Segoe UI", Tahoma, sans-serif',
      }}
    >
      <div className="report-sheet">
        {data.linePages.map((lines, pageIndex) => (
          <PurchasePage
            key={`po-${pageIndex}`}
            data={data}
            lines={lines}
            pageIndex={pageIndex}
            pageCount={data.linePages.length}
          />
        ))}
      </div>
    </div>
  );
}

function PurchasePage({
  data,
  lines,
  pageIndex,
  pageCount,
}: {
  data: PurchaseOrderData;
  lines: PurchaseLine[];
  pageIndex: number;
  pageCount: number;
}) {
  const isFirst = pageIndex === 0;
  const isLast = pageIndex === pageCount - 1;

  const grouped = useMemo(() => {
    const order: PurchaseSectionId[] = [
      "profiles",
      "glass",
      "mesh",
      "accessories",
      "iron",
    ];
    const titles: Record<PurchaseSectionId, string> = {
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
      {isFirst ? (
        <header className="shrink-0 border-b-2 border-[#2b7de9] pb-3">
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
                    }}
                  >
                    طلبية مشتريات
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
                      maxWidth: 240,
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
                    تاريخ الطلبية: {data.printedAt}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

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
        </header>
      ) : (
        <header className="flex shrink-0 items-center justify-between border-b border-[#e4e8ee] pb-2 text-[11px]">
          <p className="font-bold text-[#152033]" style={{ margin: 0 }}>
            {data.companyName}
          </p>
          <p className="text-[#6b7585]" style={{ margin: 0 }}>
            طلبية مشتريات · {data.projectName} · صفحة {pageIndex + 1}
          </p>
        </header>
      )}

      <div className="mt-3 min-h-0 flex-1 overflow-hidden">
        {lines.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#d5dbe5] text-sm text-[#6b7585]">
            مفيش خامات محسوبة على بنود المشروع بعد
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
                      <th
                        style={{
                          textAlign: "right",
                          padding: "6px 8px",
                          borderBottom: "1px solid #e4e8ee",
                          color: "#6b7585",
                          fontWeight: 600,
                          width: "42%",
                        }}
                      >
                        الصنف
                      </th>
                      <th
                        style={{
                          textAlign: "center",
                          padding: "6px 8px",
                          borderBottom: "1px solid #e4e8ee",
                          color: "#6b7585",
                          fontWeight: 600,
                          width: "28%",
                        }}
                      >
                        الكمية
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "6px 8px",
                          borderBottom: "1px solid #e4e8ee",
                          color: "#6b7585",
                          fontWeight: 600,
                        }}
                      >
                        ملاحظات
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.lines.map((line) => (
                      <tr key={line.key}>
                        <td
                          style={{
                            padding: "7px 8px",
                            borderBottom: "1px solid #eef1f5",
                            fontWeight: 600,
                            color: "#152033",
                            lineHeight: "16px",
                          }}
                        >
                          {line.label}
                        </td>
                        <td
                          style={{
                            padding: "7px 8px",
                            borderBottom: "1px solid #eef1f5",
                            textAlign: "center",
                            fontWeight: 700,
                            color: "#152033",
                            lineHeight: "16px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {purchaseQtyLabel(line)}
                        </td>
                        <td
                          style={{
                            padding: "7px 8px",
                            borderBottom: "1px solid #eef1f5",
                            color: "#6b7585",
                            lineHeight: "16px",
                          }}
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
        {isLast
          ? `طلبية مشتريات · صفحة ${pageIndex + 1} من ${pageCount}`
          : `صفحة ${pageIndex + 1} من ${pageCount}`}
      </footer>
    </section>
  );
}
