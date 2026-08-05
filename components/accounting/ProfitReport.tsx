"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  buildAccountingReport,
  REPORT_PERIOD_LABELS,
  type AccountingReport,
  type ReportPeriod,
} from "@/lib/accounting-reports";
import { ROUTES } from "@/lib/routes";
import { formatCurrency, formatDate, smartSearchMatch } from "@/lib/utils";
import { WorkflowBadge } from "@/components/workshop/WorkflowBadge";

const PERIODS: ReportPeriod[] = ["month", "quarter", "year", "all"];

function readReport(period: ReportPeriod): AccountingReport {
  if (typeof window === "undefined") {
    return {
      period,
      fromDate: null,
      toDate: new Date().toISOString().slice(0, 10),
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
  return buildAccountingReport(period);
}

/**
 * تقرير ربحية الورشة: هل بتكسب ولا لأ؟
 */
export function ProfitReport() {
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [report, setReport] = useState(() => readReport("month"));
  const [query, setQuery] = useState("");

  useEffect(() => {
    function refresh() {
      setReport(buildAccountingReport(period));
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
  }, [period]);

  const rows = useMemo(() => {
    return report.projectRows.filter((row) =>
      smartSearchMatch(query, [row.projectName, row.customerName])
    );
  }, [report.projectRows, query]);

  const winning = rows.filter((r) => r.profit > 0).length;
  const losing = rows.filter((r) => r.profit < 0).length;

  return (
    <div className="flex flex-col gap-4">
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
              onClick={() => setPeriod(id)}
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

      <p className="px-0.5 text-xs text-muted">
        {report.fromDate
          ? `من ${formatDate(report.fromDate)} إلى ${formatDate(report.toDate)}`
          : `حتى ${formatDate(report.toDate)}`}
        {" · "}
        {report.paymentCount} دفعة
        {" · "}
        {report.expenseCount} مصروف
      </p>

      <section className="rounded-2xl bg-[#1F6B55] px-4 py-5 text-white shadow-[0_8px_24px_rgba(47,155,122,0.28)]">
        <p className="text-xs font-medium opacity-85">
          {report.net >= 0 ? "بتكسب" : "خسارة في الفترة"}
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
          {formatCurrency(report.net)} ج.م
        </p>
        <p className="mt-1 text-xs opacity-80">
          المحصّل ناقص المصروف
          {period !== "all" ? ` — ${REPORT_PERIOD_LABELS[period]}` : ""}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-2.5">
        <Tile label="إجمالي الحسابات" value={report.sales} tone="neutral" />
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
        className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
          مفيش شغل يظهر في الفترة دي
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.projectId}>
              <Link
                href={ROUTES.design.account(row.customerId, row.projectId)}
                className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card px-3.5 py-3 transition-all active:scale-[0.99]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <WorkflowBadge workflow={row.workflow} />
                    <p className="truncate text-sm font-bold text-foreground">
                      {row.projectName}
                    </p>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {row.customerName}
                    {" · حساب "}
                    {formatCurrency(row.sale)}
                    {" · اتسلّم "}
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
