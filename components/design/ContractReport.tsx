"use client";

import { useMemo } from "react";
import {
  REPORT_PAGE_HEIGHT_PX,
  REPORT_PAGE_WIDTH_PX,
} from "@/lib/project-pdf";
import {
  buildProjectContract,
  type ProjectContractData,
} from "@/lib/project-contract";
import { formatCurrency, formatDate } from "@/lib/utils";

type Props = {
  customerId: string;
  projectId: string;
  /** بنود لهذه المشاركة فقط (نص متعدد الأسطر) */
  termsText?: string;
};

function PartyBlock({
  title,
  name,
  phone,
  address,
}: {
  title: string;
  name: string;
  phone?: string;
  address?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        border: "1px solid #d8dee8",
        borderRadius: 10,
        padding: "12px 14px",
        minWidth: 0,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 700,
          color: "#2b7de9",
          lineHeight: "16px",
        }}
      >
        {title}
      </p>
      <p
        style={{
          margin: "6px 0 0",
          fontSize: 14,
          fontWeight: 700,
          color: "#152033",
          lineHeight: "20px",
        }}
      >
        {name}
      </p>
      {phone ? (
        <p
          dir="ltr"
          style={{
            margin: "4px 0 0",
            fontSize: 11,
            color: "#5a6578",
            lineHeight: "16px",
            textAlign: "right",
          }}
        >
          {phone}
        </p>
      ) : null}
      {address ? (
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 11,
            color: "#5a6578",
            lineHeight: "16px",
          }}
        >
          {address}
        </p>
      ) : null}
    </div>
  );
}

function MoneyRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr>
      <td
        style={{
          padding: "8px 10px",
          fontSize: 12,
          fontWeight: bold ? 700 : 500,
          color: "#152033",
          borderBottom: "1px solid #e8edf5",
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: "8px 10px",
          fontSize: 13,
          fontWeight: bold ? 700 : 600,
          color: "#152033",
          textAlign: "left",
          borderBottom: "1px solid #e8edf5",
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
        dir="ltr"
      >
        {value}
      </td>
    </tr>
  );
}

/**
 * تقرير عقد اتفاق — صفحة A4 للتصدير PDF / التوقيع الورقي.
 */
export function ContractReport({
  customerId,
  projectId,
  termsText,
}: Props) {
  const data = useMemo(
    () => buildProjectContract(customerId, projectId, termsText),
    [customerId, projectId, termsText]
  );

  if (!data) {
    return (
      <div className="report-sheet">
        <section
          className="report-page box-border flex items-center justify-center bg-white"
          style={{
            width: REPORT_PAGE_WIDTH_PX,
            height: REPORT_PAGE_HEIGHT_PX,
          }}
        >
          <p style={{ fontSize: 14, color: "#5a6578" }}>المشروع غير موجود</p>
        </section>
      </div>
    );
  }

  return <ContractPages data={data} />;
}

function ContractPages({ data }: { data: ProjectContractData }) {
  const { company, customer, project, money, terms, printedAt, contractDate } =
    data;

  // قسّم البنود على صفحات لو كتيرة: ~14 بند في الأولى (مع هيدر)، ~22 في التالية
  const firstBudget = 12;
  const nextBudget = 20;
  const pages: string[][] = [];
  let i = 0;
  while (i < terms.length) {
    const budget = pages.length === 0 ? firstBudget : nextBudget;
    pages.push(terms.slice(i, i + budget));
    i += budget;
  }
  if (pages.length === 0) pages.push([]);

  return (
    <div className="report-sheet" dir="rtl">
      {pages.map((pageTerms, pageIndex) => {
        const isFirst = pageIndex === 0;
        const isLast = pageIndex === pages.length - 1;
        const termOffset =
          pages.slice(0, pageIndex).reduce((n, p) => n + p.length, 0) + 1;

        return (
          <section
            key={`contract-page-${pageIndex}`}
            className="report-page box-border flex flex-col overflow-hidden bg-white"
            style={{
              width: REPORT_PAGE_WIDTH_PX,
              height: REPORT_PAGE_HEIGHT_PX,
              padding: "28px 32px",
            }}
          >
            {isFirst ? (
              <>
                <header
                  className="shrink-0"
                  style={{ borderBottom: "2px solid #2b7de9", paddingBottom: 12 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
                      <h1
                        style={{
                          margin: 0,
                          fontSize: 22,
                          fontWeight: 700,
                          color: "#152033",
                          lineHeight: "28px",
                        }}
                      >
                        {company.name || "شركتي للـ uPVC"}
                      </h1>
                      {company.phone ? (
                        <p
                          dir="ltr"
                          style={{
                            margin: "6px 0 0",
                            fontSize: 11,
                            color: "#5a6578",
                            lineHeight: "16px",
                            textAlign: "right",
                          }}
                        >
                          {company.phone}
                        </p>
                      ) : null}
                      {company.address ? (
                        <p
                          style={{
                            margin: "4px 0 0",
                            fontSize: 11,
                            color: "#5a6578",
                            lineHeight: "16px",
                          }}
                        >
                          {company.address}
                        </p>
                      ) : null}
                    </div>
                    <div style={{ textAlign: "left", flexShrink: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 16,
                          fontWeight: 700,
                          color: "#2b7de9",
                          lineHeight: "22px",
                        }}
                      >
                        عقد اتفاق
                      </p>
                      <p
                        style={{
                          margin: "6px 0 0",
                          fontSize: 11,
                          color: "#5a6578",
                          lineHeight: "16px",
                        }}
                      >
                        التاريخ: {formatDate(contractDate)}
                      </p>
                    </div>
                  </div>
                </header>

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 16,
                    flexShrink: 0,
                  }}
                >
                  <PartyBlock
                    title="الطرف الأول (الشركة)"
                    name={company.name}
                    phone={company.phone}
                    address={company.address}
                  />
                  <PartyBlock
                    title="الطرف الثاني (العميل)"
                    name={customer?.name || "عميل"}
                    phone={customer?.phone}
                    address={customer?.address}
                  />
                </div>

                <div
                  style={{
                    marginTop: 14,
                    border: "1px solid #d8dee8",
                    borderRadius: 10,
                    padding: "12px 14px",
                    flexShrink: 0,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#2b7de9",
                    }}
                  >
                    موضوع العقد
                  </p>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#152033",
                      lineHeight: "20px",
                    }}
                  >
                    {project.name}
                  </p>
                  {project.location ? (
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: 12,
                        color: "#5a6578",
                        lineHeight: "18px",
                      }}
                    >
                      الموقع: {project.location}
                    </p>
                  ) : null}
                </div>

                <table
                  style={{
                    width: "100%",
                    marginTop: 14,
                    borderCollapse: "collapse",
                    border: "1px solid #d8dee8",
                    borderRadius: 10,
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  <tbody>
                    <MoneyRow
                      label="المبلغ المتفق عليه"
                      value={formatCurrency(money.sale)}
                      bold
                    />
                    <MoneyRow
                      label="المدفوع حتى تاريخه"
                      value={formatCurrency(money.paid)}
                    />
                    <MoneyRow
                      label="المتبقي"
                      value={formatCurrency(money.remaining)}
                      bold
                    />
                  </tbody>
                </table>
              </>
            ) : (
              <header
                className="shrink-0"
                style={{
                  borderBottom: "1px solid #d8dee8",
                  paddingBottom: 10,
                  marginBottom: 12,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#152033",
                  }}
                >
                  عقد اتفاق — {project.name}
                  <span
                    style={{
                      marginRight: 8,
                      fontWeight: 500,
                      color: "#5a6578",
                      fontSize: 11,
                    }}
                  >
                    تابع ({pageIndex + 1}/{pages.length})
                  </span>
                </p>
              </header>
            )}

            <div style={{ marginTop: isFirst ? 16 : 0, flex: 1, minHeight: 0 }}>
              {isFirst ? (
                <p
                  style={{
                    margin: "0 0 10px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#152033",
                  }}
                >
                  بنود الاتفاق
                </p>
              ) : null}
              <ol
                start={termOffset}
                style={{
                  margin: 0,
                  padding: "0 18px 0 0",
                  listStylePosition: "outside",
                }}
              >
                {pageTerms.map((term, idx) => (
                  <li
                    key={`term-${termOffset + idx}`}
                    style={{
                      marginBottom: 8,
                      fontSize: 12,
                      lineHeight: "18px",
                      color: "#152033",
                    }}
                  >
                    {term}
                  </li>
                ))}
              </ol>
            </div>

            {isLast ? (
              <footer className="shrink-0" style={{ marginTop: 8 }}>
                <div
                  style={{
                    display: "flex",
                    gap: 24,
                    marginTop: 8,
                    paddingTop: 16,
                  }}
                >
                  <SignatureBox label="توقيع الطرف الأول (الشركة)" />
                  <SignatureBox label="توقيع الطرف الثاني (العميل)" />
                </div>
                <p
                  style={{
                    margin: "14px 0 0",
                    fontSize: 10,
                    color: "#8a93a3",
                    textAlign: "center",
                  }}
                >
                  طُبع بتاريخ {printedAt} — يُعتبر التوقيع موافقة على البنود أعلاه
                </p>
              </footer>
            ) : (
              <p
                style={{
                  marginTop: "auto",
                  fontSize: 10,
                  color: "#8a93a3",
                  textAlign: "center",
                  flexShrink: 0,
                }}
              >
                صفحة {pageIndex + 1} من {pages.length}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function SignatureBox({ label }: { label: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 600,
          color: "#152033",
          lineHeight: "16px",
        }}
      >
        {label}
      </p>
      <div
        style={{
          marginTop: 36,
          borderBottom: "1px solid #152033",
          height: 1,
        }}
      />
      <p
        style={{
          margin: "8px 0 0",
          fontSize: 10,
          color: "#8a93a3",
        }}
      >
        الاسم / التاريخ
      </p>
    </div>
  );
}
