"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { WindowPreview } from "@/components/design/WindowPreview";
import { BackChevron } from "@/components/layout/BackChevron";
import { NavBack } from "@/components/layout/NavBack";
import { useUnit } from "@/components/settings/UnitProvider";
import { loadCompany } from "@/lib/company";
import {
  customers,
  loadLocalCustomers,
  type Customer,
} from "@/lib/customers";
import { itemAreaSqm, itemTotalPrice } from "@/lib/design-items";
import { suggestItemName } from "@/lib/item-naming";
import { loadMaterialCatalog } from "@/lib/material-systems";
import { reportMaterialRows } from "@/lib/project-report";
import { getItemsForProject, getProjectById } from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import { formatSizePair } from "@/lib/units";
import { formatCurrency, formatDate } from "@/lib/utils";

type Props = {
  customerId: string;
  projectId: string;
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

export function ProjectReport({ customerId, projectId }: Props) {
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

  function handlePrint() {
    window.print();
  }

  function handleShare() {
    const lines = items.map((item, i) => {
      const name = item.name?.trim() || suggestItemName(item);
      return `${i + 1}- ${name}: ${formatSizePair(item.widthMm, item.heightMm, unit)} · عدد ${item.qty} · ${formatCurrency(Math.round(itemTotalPrice(item)))} ج.م`;
    });
    const payload = [
      company?.name ? company.name : "UPVC Design",
      `تقرير مشروع${project ? ` — ${project.name}` : ""}`,
      customer ? `العميل: ${customer.name}` : null,
      customer?.phone ? `تليفون: ${customer.phone}` : null,
      "",
      ...lines,
      "",
      `إجمالي العدد: ${totals.qty}`,
      `إجمالي المساحة: ${totals.area.toFixed(2)} م²`,
      `الإجمالي: ${formatCurrency(Math.round(totals.price))} ج.م`,
    ]
      .filter((line) => line != null)
      .join("\n");

    if (navigator.share) {
      void navigator.share({
        title: `تقرير مشروع${project ? ` — ${project.name}` : ""}`,
        text: payload,
      });
      return;
    }
    void navigator.clipboard?.writeText(payload);
  }

  if (!project) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-semibold text-foreground">المشروع غير موجود</p>
        <Link href={ROUTES.design.projects(customerId)} className="text-sm text-primary">
          مشاريع العميل
        </Link>
      </div>
    );
  }

  return (
    <div className="project-report mx-auto w-full max-w-[210mm] bg-white text-[#152033]">
      <div className="report-actions sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-[#e4e8ee] bg-white/95 px-3 py-2.5 backdrop-blur print:hidden">
        <NavBack
          href={ROUTES.design.editor(customerId, projectId)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f1fc] text-[#2b7de9] transition-colors hover:bg-[#d7e8fb]"
          aria-label="رجوع لبنود المشروع"
        >
          <BackChevron className="h-5 w-5 text-[#2b7de9]" />
        </NavBack>

        <p className="min-w-0 flex-1 truncate text-center text-sm font-bold">
          تقرير المشروع
        </p>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={handleShare}
            className="flex h-9 items-center gap-1.5 rounded-full bg-[#e8f1fc] px-3 text-xs font-semibold text-[#2b7de9] transition-colors hover:bg-[#d7e8fb]"
          >
            <ShareIcon />
            مشاركة
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex h-9 items-center gap-1.5 rounded-full bg-[#2b7de9] px-3 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(43,125,233,0.28)] transition-colors hover:bg-[#2169c8]"
          >
            <PrintIcon />
            طباعة
          </button>
        </div>
      </div>

      <article className="report-sheet px-4 py-5 sm:px-6 sm:py-7">
        <header className="border-b-2 border-[#2b7de9] pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 text-right">
              <h1 className="text-xl font-bold leading-tight text-[#152033] sm:text-2xl">
                {company?.name || "شركتي للـ uPVC"}
              </h1>
              <div className="mt-1.5 space-y-0.5 text-[12px] text-[#5a6578]">
                {company?.phone ? (
                  <p dir="ltr" className="text-right">
                    {company.phone}
                  </p>
                ) : null}
                {company?.address ? <p>{company.address}</p> : null}
                {company?.email ? (
                  <p dir="ltr" className="text-right">
                    {company.email}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="shrink-0 rounded-xl bg-[#e8f1fc] p-2.5 text-[#2b7de9]">
              <CompanyMark />
            </div>
          </div>

          {(company?.taxNumber || company?.commercialRegister) && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#6b7585]">
              {company.taxNumber ? (
                <span>
                  الرقم الضريبي:{" "}
                  <span dir="ltr">{company.taxNumber}</span>
                </span>
              ) : null}
              {company.commercialRegister ? (
                <span>
                  السجل التجاري:{" "}
                  <span dir="ltr">{company.commercialRegister}</span>
                </span>
              ) : null}
            </div>
          )}
        </header>

        <section className="mt-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-[#2b7de9]">
                تقرير مشروع / عرض أسعار
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-[#152033]">
                {project.name}
              </h2>
            </div>
            <p className="text-[11px] text-[#6b7585]">تاريخ التقرير: {printedAt}</p>
          </div>

          <div className="mt-4 grid gap-3 rounded-xl border border-[#e4e8ee] bg-[#f7f9fc] p-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] text-[#6b7585]">العميل</p>
              <p className="mt-0.5 text-sm font-bold">{customer?.name ?? "—"}</p>
              {customer?.phone ? (
                <p className="mt-0.5 text-xs text-[#5a6578]" dir="ltr">
                  {customer.phone}
                </p>
              ) : null}
              {customer?.address ? (
                <p className="mt-0.5 text-xs text-[#5a6578]">{customer.address}</p>
              ) : null}
            </div>
            <div>
              <p className="text-[11px] text-[#6b7585]">بيانات المشروع</p>
              {project.location ? (
                <p className="mt-0.5 text-sm font-semibold">{project.location}</p>
              ) : (
                <p className="mt-0.5 text-sm font-semibold">{project.name}</p>
              )}
              <p className="mt-0.5 text-xs text-[#5a6578]">
                تاريخ الإنشاء: {formatDate(project.createdAt)}
              </p>
              <p className="mt-0.5 text-xs text-[#5a6578]">
                عدد البنود: {items.length}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h3 className="mb-3 text-sm font-bold text-[#152033]">
            البنود والرسومات
          </h3>

          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d5dbe5] px-4 py-8 text-center text-sm text-[#6b7585]">
              مفيش بنود في المشروع بعد
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map((item, index) => {
                const name = item.name?.trim() || suggestItemName(item);
                const area = itemAreaSqm(item);
                const price = itemTotalPrice(item);
                const materials = reportMaterialRows(item, project, catalog);

                return (
                  <li
                    key={item.id}
                    className="report-item break-inside-avoid rounded-xl border border-[#e4e8ee] bg-white p-3 sm:p-4"
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-[#eef1f5] pb-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-[#2b7de9]">
                          بند {index + 1}
                        </p>
                        <h4 className="truncate text-base font-bold text-[#152033]">
                          {name}
                        </h4>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-[#2b7de9]">
                        {formatCurrency(Math.round(price))} ج.م
                      </p>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
                      <div className="flex items-center justify-center rounded-lg border border-[#e8edf3] bg-[#f4f7fb] p-3">
                        <WindowPreview
                          style={item.style}
                          templateId={item.templateId}
                          layout={item.layout}
                          panes={item.panes}
                          frameColor={item.frameColor}
                          widthMm={item.widthMm}
                          heightMm={item.heightMm}
                          forceLight
                          className="h-auto w-full max-h-[160px]"
                        />
                      </div>

                      <div className="min-w-0 space-y-2 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <Detail
                            label="المقاس"
                            value={formatSizePair(
                              item.widthMm,
                              item.heightMm,
                              unit
                            )}
                            ltr
                          />
                          <Detail label="العدد" value={String(item.qty)} />
                          <Detail
                            label="المساحة"
                            value={`${area.toFixed(2)} م²`}
                          />
                          <Detail
                            label="سعر المتر"
                            value={`${formatCurrency(Math.round(item.pricePerSqm))} ج.م`}
                          />
                        </div>

                        {materials.length > 0 ? (
                          <dl className="grid gap-1.5 rounded-lg bg-[#f7f9fc] p-2.5 text-[12px]">
                            {materials.map((row) => (
                              <div
                                key={row.label}
                                className="flex items-start justify-between gap-3"
                              >
                                <dt className="shrink-0 text-[#6b7585]">
                                  {row.label}
                                </dt>
                                <dd className="text-left font-medium text-[#152033]">
                                  {row.value}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        ) : null}

                        {item.notes?.trim() ? (
                          <p className="rounded-lg border border-dashed border-[#d9e0ea] px-2.5 py-2 text-[12px] text-[#5a6578]">
                            <span className="font-semibold text-[#152033]">
                              ملاحظات:{" "}
                            </span>
                            {item.notes.trim()}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="report-totals mt-6 break-inside-avoid rounded-xl border border-[#2b7de9]/25 bg-[#f3f8ff] p-4">
          <h3 className="text-sm font-bold text-[#152033]">ملخص الإجمالي</h3>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[#5a6578]">إجمالي العدد</span>
              <span className="font-semibold">{totals.qty}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#5a6578]">إجمالي المساحة</span>
              <span className="font-semibold">{totals.area.toFixed(2)} م²</span>
            </div>
            <div className="flex items-center justify-between border-t border-[#2b7de9]/25 pt-2">
              <span className="font-bold">الإجمالي</span>
              <span className="text-lg font-bold text-[#2b7de9]">
                {formatCurrency(Math.round(totals.price))} ج.م
              </span>
            </div>
          </div>
        </section>

        {company?.note?.trim() ? (
          <p className="mt-4 text-[11px] leading-relaxed text-[#6b7585]">
            {company.note.trim()}
          </p>
        ) : (
          <p className="mt-4 text-[11px] leading-relaxed text-[#6b7585]">
            الأسعار قابلة للتعديل حسب المقاسات النهائية والخامات المعتمدة عند
            التعاقد. للاستفسار تواصل معنا على بيانات الشركة أعلاه.
          </p>
        )}
      </article>
    </div>
  );
}

function Detail({
  label,
  value,
  ltr = false,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="rounded-lg bg-[#f7f9fc] px-2.5 py-2">
      <p className="text-[10px] text-[#6b7585]">{label}</p>
      <p
        className="mt-0.5 text-xs font-semibold text-[#152033]"
        dir={ltr ? "ltr" : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function CompanyMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" aria-hidden>
      <rect
        x="4"
        y="5"
        width="24"
        height="22"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 11h16M8 16h16M8 21h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9V3h12v6" />
      <path d="M6 17H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="13" width="12" height="8" rx="1" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.4 13.2l7.2 4.1M15.6 6.7l-7.2 4.1" />
    </svg>
  );
}
