"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  buildAccountingReport,
  reportBounds,
  REPORT_PERIOD_LABELS,
  type AccountingReport,
  type ReportPeriod,
} from "@/lib/accounting-reports";
import { ROUTES } from "@/lib/routes";
import { downloadCsv, formatCurrency, formatDate, smartSearchMatch } from "@/lib/utils";
import { DELIVERY_LABELS } from "@/lib/workshop";
import { WorkflowBadge } from "@/components/workshop/WorkflowBadge";

const PERIODS: ReportPeriod[] = ["month", "quarter", "year", "all"];

function emptyReport(period: ReportPeriod): AccountingReport {
  const bounds = reportBounds(period);
  return {
    period,
    fromDate: bounds.fromDate,
    toDate: bounds.toDate,
    sales: 0,
    collected: 0,
    expenses: 0,
    net: 0,
    outstanding: 0,
    projectRows: [],
    paymentCount: 0,
    expenseCount: 0,
  };
}

function readReport(
  period: ReportPeriod,
  fromDate: string,
  toDate: string
): AccountingReport {
  if (typeof window === "undefined") return emptyReport(period);
  return buildAccountingReport(period, undefined, undefined, undefined, {
    fromDate: fromDate || null,
    toDate,
  });
}

/**
 * تقرير ربحية الورشة من الشغل اللي خلص واتسلّم.
 */
export function ProfitReport() {
  const initial = reportBounds("month");
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [fromDate, setFromDate] = useState(initial.fromDate ?? "");
  const [toDate, setToDate] = useState(initial.toDate);
  const [report, setReport] = useState(() =>
    readReport("month", initial.fromDate ?? "", initial.toDate)
  );
  const [query, setQuery] = useState("");

  useEffect(() => {
    function refresh() {
      setReport(
        buildAccountingReport(period, undefined, undefined, undefined, {
          fromDate: fromDate || null,
          toDate,
        })
      );
    }
    refresh();
    window.addEventListener("upvc-accounting-updated", refresh);
    window.addEventListener("upvc-projects-updated", refresh);
    window.addEventListener("upvc-customers-updated", refresh);
    return () => {
      window.removeEventListener("upvc-accounting-updated", refresh);
      window.removeEventListener("upvc-projects-updated", refresh);
      window.removeEventListener("upvc-customers-updated", refresh);
    };
  }, [period, fromDate, toDate]);

  const rows = useMemo(() => {
    return report.projectRows.filter((row) =>
      smartSearchMatch(query, [row.projectName, row.customerName])
    );
  }, [report.projectRows, query]);

  const winning = rows.filter((r) => r.profit > 0).length;
  const losing = rows.filter((r) => r.profit < 0).length;

  function selectPeriod(id: ReportPeriod) {
    const bounds = reportBounds(id);
    setPeriod(id);
    setFromDate(bounds.fromDate ?? "");
    setToDate(bounds.toDate);
  }

  function exportCsv() {
    downloadCsv(`تقرير-ربح-${report.toDate}.csv`, [
      [
        "المشروع",
        "العميل",
        "التسليم",
        "تاريخ التسليم",
        "البيع",
        "المحصّل",
        "المصروف",
        "الباقي",
        "المكسب",
      ],
      ...rows.map((row) => [
        row.projectName,
        row.customerName,
        DELIVERY_LABELS.delivered,
        row.deliveredAt ?? "",
        row.sale,
        row.paid,
        row.expenses,
        row.remaining,
        row.profit,
      ]),
    ]);
  }

  return (
    <div className="profit-report flex flex-col gap-4">
      <h1 className="mb-1 hidden text-xl font-bold print:block">تقرير الربح</h1>
      <div className="report-actions flex flex-col gap-3 print:hidden">
        <div
          role="tablist"
          aria-label="فترة التقرير"
          className="flex gap-1.5 overflow-x-auto pb-0.5"
        >
          {PERIODS.map((id) => {
            const active = period === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectPeriod(id)}
                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                  active
                    ? "bg-[#1F6B55] text-white"
                    : "border border-border bg-card text-muted"
                }`}
              >
                {REPORT_PERIOD_LABELS[id]}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-[9rem] flex-1 flex-col gap-1 text-[11px] font-semibold text-muted">
            من
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPeriod("custom");
              }}
              className="h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="flex min-w-[9rem] flex-1 flex-col gap-1 text-[11px] font-semibold text-muted">
            إلى
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPeriod("custom");
              }}
              className="h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <button
            type="button"
            onClick={() => window.print()}
            className="h-11 rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground"
          >
            طباعة
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="h-11 rounded-xl bg-[#1F6B55] px-4 text-sm font-bold text-white"
          >
            تصدير Excel
          </button>
        </div>
      </div>

      <p className="px-0.5 text-xs text-muted">
        {report.fromDate
          ? `من ${formatDate(report.fromDate)} إلى ${formatDate(report.toDate)}`
          : `حتى ${formatDate(report.toDate)}`}
        {" · "}
        {rows.length} شغل متسلّم
        {" · "}
        {report.expenseCount} مصروف
      </p>

      <section className="rounded-2xl bg-[#1F6B55] px-4 py-5 text-white shadow-[0_8px_24px_rgba(47,155,122,0.28)] print:shadow-none">
        <p className="text-xs font-medium opacity-85">
          {report.net >= 0 ? "بتكسب" : "خسارة في الفترة"}
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
          {formatCurrency(report.net)} ج.م
        </p>
        <p className="mt-1 text-xs opacity-80">
          من الشغل اللي اتسلّم ناقص المصروف
          {period !== "all" && period !== "custom"
            ? ` — ${REPORT_PERIOD_LABELS[period]}`
            : period === "custom"
              ? " — فترة مخصصة"
              : ""}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Tile label="بيع المتسلّم" value={report.sales} tone="neutral" />
        <Tile label="المحصّل" value={report.collected} tone="good" />
        <Tile label="المصروفات" value={report.expenses} tone="expense" />
        <Tile label="لِيا برا" value={report.outstanding} tone="warn" />
      </section>

      <p className="px-0.5 text-xs text-muted">
        {winning} شغل مكسب
        {" · "}
        {losing} شغل خسران
        {" · "}
        {rows.length} في القائمة
      </p>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="بحث في شغل التقرير…"
        className="report-actions h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 print:hidden"
      />

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
          مفيش شغل اتسلّم في الفترة دي
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card lg:block print:block">
            <table className="profit-report-table w-full min-w-[800px] text-start text-sm">
              <thead className="bg-background text-[11px] text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">المشروع</th>
                  <th className="px-3 py-2.5 font-semibold">العميل</th>
                  <th className="px-3 py-2.5 font-semibold">التسليم</th>
                  <th className="px-3 py-2.5 text-end font-semibold">البيع</th>
                  <th className="px-3 py-2.5 text-end font-semibold">المحصّل</th>
                  <th className="px-3 py-2.5 text-end font-semibold">المصروف</th>
                  <th className="px-3 py-2.5 text-end font-semibold">الباقي</th>
                  <th className="px-4 py-2.5 text-end font-semibold">المكسب</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.projectId}
                    className="border-t border-border hover:bg-primary-soft/40"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={ROUTES.design.account(
                          row.customerId,
                          row.projectId
                        )}
                        className="font-bold text-foreground"
                      >
                        {row.projectName}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-muted">{row.customerName}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col items-start gap-0.5">
                        <WorkflowBadge
                          workflow={row.workflow}
                          project={{
                            workflow: row.workflow,
                            deliveryStatus: "delivered",
                            deliveredAt: row.deliveredAt,
                          }}
                        />
                        {row.deliveredAt ? (
                          <span className="text-[10px] text-muted">
                            {formatDate(row.deliveredAt)}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-end tabular-nums">
                      {formatCurrency(row.sale)}
                    </td>
                    <td className="px-3 py-2.5 text-end tabular-nums text-[#2F9B7A]">
                      {formatCurrency(row.paid)}
                    </td>
                    <td className="px-3 py-2.5 text-end tabular-nums text-[#C45C26]">
                      {formatCurrency(row.expenses)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-end tabular-nums ${
                        row.remaining > 0 ? "text-[#E85A8A]" : "text-[#2F9B7A]"
                      }`}
                    >
                      {formatCurrency(row.remaining)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-end tabular-nums font-bold ${
                        row.profit >= 0 ? "text-[#2F9B7A]" : "text-[#E85A8A]"
                      }`}
                    >
                      {formatCurrency(row.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-2 lg:hidden print:hidden">
            {rows.map((row) => (
              <li key={row.projectId}>
                <Link
                  href={ROUTES.design.account(row.customerId, row.projectId)}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card px-3.5 py-3 transition-all active:scale-[0.99]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <WorkflowBadge
                        workflow={row.workflow}
                        project={{
                          workflow: row.workflow,
                          deliveryStatus: "delivered",
                          deliveredAt: row.deliveredAt,
                        }}
                      />
                      <p className="truncate text-sm font-bold text-foreground">
                        {row.projectName}
                      </p>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {row.customerName}
                      {row.deliveredAt
                        ? ` · ${formatDate(row.deliveredAt)}`
                        : ""}
                      {" · حساب "}
                      {formatCurrency(row.sale)}
                      {" · محصّل "}
                      {formatCurrency(row.paid)}
                      {" · مصروف "}
                      {formatCurrency(row.expenses)}
                    </p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="text-[10px] text-muted">مكسب</p>
                    <p
                      className={`text-sm font-bold tabular-nums ${
                        row.profit >= 0 ? "text-[#2F9B7A]" : "text-[#E85A8A]"
                      }`}
                    >
                      {formatCurrency(row.profit)}
                    </p>
                    {row.remaining > 0 ? (
                      <p className="mt-0.5 text-[10px] tabular-nums text-[#E85A8A]">
                        باقي {formatCurrency(row.remaining)}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "good" | "warn" | "neutral" | "expense";
}) {
  const toneClass =
    tone === "good"
      ? "text-[#2F9B7A]"
      : tone === "warn"
        ? "text-[#E85A8A]"
        : tone === "expense"
          ? "text-[#C45C26]"
          : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card px-3.5 py-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`mt-1 text-base font-bold tabular-nums ${toneClass}`}>
        {formatCurrency(value)} ج.م
      </p>
    </div>
  );
}
