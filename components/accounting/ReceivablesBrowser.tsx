"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  filterReceivableRows,
  listReceivableRows,
  RECEIVABLE_FILTER_LABELS,
  receivablesTotals,
  type ReceivableFilter,
  type ReceivableRow,
} from "@/lib/receivables";
import { ROUTES } from "@/lib/routes";
import { formatCurrency, smartSearchMatch } from "@/lib/utils";
import { WORKFLOW_VISUAL } from "@/lib/workshop";
import { WorkflowBadge } from "@/components/workshop/WorkflowBadge";

function readRows(): ReceivableRow[] {
  if (typeof window === "undefined") return [];
  return listReceivableRows();
}

const FILTERS: ReceivableFilter[] = [
  "owed",
  "all",
  "paid",
  "not_delivered",
  "delivered",
];

/**
 * متابعة الفلوس اللي برا: عليه فلوس / اتسلّم / الشغل اتسلّم ولا لأ.
 */
export function ReceivablesBrowser() {
  const [rows, setRows] = useState(readRows);
  const [filter, setFilter] = useState<ReceivableFilter>("owed");
  const [query, setQuery] = useState("");

  useEffect(() => {
    function refresh() {
      setRows(listReceivableRows());
    }
    window.addEventListener("upvc-accounting-updated", refresh);
    window.addEventListener("upvc-projects-updated", refresh);
    window.addEventListener("upvc-customers-updated", refresh);
    return () => {
      window.removeEventListener("upvc-accounting-updated", refresh);
      window.removeEventListener("upvc-projects-updated", refresh);
      window.removeEventListener("upvc-customers-updated", refresh);
    };
  }, []);

  const filtered = useMemo(() => {
    const byFilter = filterReceivableRows(rows, filter);
    return byFilter.filter((row) =>
      smartSearchMatch(query, [
        row.customerName,
        row.customerPhone,
        row.project.name,
        row.workflowLabel,
        row.deliveryLabel,
      ])
    );
  }, [rows, filter, query]);

  const totals = useMemo(() => receivablesTotals(filtered), [filtered]);

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-2 gap-2.5">
        <SummaryTile
          label="حساب"
          value={totals.sale}
          tone="neutral"
        />
        <SummaryTile
          label="اتسلّم"
          value={totals.paid}
          tone="good"
        />
        <SummaryTile
          label="لِيا برا"
          value={totals.remaining}
          tone="warn"
        />
        <SummaryTile
          label="مكسب الشغل"
          value={totals.profit}
          tone={totals.profit >= 0 ? "good" : "warn"}
        />
      </section>

      <p className="px-0.5 text-xs text-muted">
        {totals.owedCount} عليه فلوس
        {" · "}
        {totals.paidCount} خلص فلوسه
        {" · "}
        {totals.notDeliveredCount} شغل متسلّمش
      </p>

      <div
        role="tablist"
        aria-label="تصفية المستحقات"
        className="flex gap-1.5 overflow-x-auto pb-0.5"
      >
        {FILTERS.map((id) => {
          const active = filter === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(id)}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                active
                  ? "bg-[#1F6B55] text-white"
                  : "border border-border bg-card text-muted"
              }`}
            >
              {RECEIVABLE_FILTER_LABELS[id]}
            </button>
          );
        })}
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="بحث بالعميل أو الشغل…"
        className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
          مفيش شغل في التصنيف ده حالياً
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((row) => {
            const visual = WORKFLOW_VISUAL[row.project.workflow];
            return (
              <li key={row.project.id}>
                <Link
                  href={ROUTES.design.account(
                    row.project.customerId,
                    row.project.id
                  )}
                  className={`flex flex-col gap-2 rounded-2xl border border-s-[3px] bg-card px-3.5 py-3 transition-all active:scale-[0.99] ${visual.rail} border-border`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <WorkflowBadge workflow={row.project.workflow} />
                        <p className="truncate text-sm font-bold text-foreground">
                          {row.project.name}
                        </p>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {row.customerName}
                        {row.deliveryLabel ? ` · ${row.deliveryLabel}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-end">
                      <p className="text-[10px] text-muted">
                        {row.remaining > 0 ? "لِيا برا" : "اتخلّص"}
                      </p>
                      <p
                        className={`text-sm font-bold tabular-nums ${
                          row.remaining > 0
                            ? "text-[#E85A8A]"
                            : "text-[#2F9B7A]"
                        }`}
                      >
                        {formatCurrency(
                          row.remaining > 0 ? row.remaining : row.paid
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">
                    <span>
                      حساب {formatCurrency(row.sale)}
                    </span>
                    <span className="text-[#2F9B7A]">
                      اتسلّم {formatCurrency(row.paid)}
                    </span>
                    {row.expenses > 0 ? (
                      <span className="text-[#C45C26]">
                        مصروف {formatCurrency(row.expenses)}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "good" | "warn" | "neutral";
}) {
  const toneClass =
    tone === "good"
      ? "text-[#2F9B7A]"
      : tone === "warn"
        ? "text-[#E85A8A]"
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
