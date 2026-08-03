"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadExpenses, loadPayments } from "@/lib/accounting";
import {
  listMoneyMovements,
  moneyMovementsNet,
  type MoneyMovement,
} from "@/lib/money-ledger";
import { ROUTES } from "@/lib/routes";
import { formatCurrency, formatDate, smartSearchMatch } from "@/lib/utils";

function readMovements(): MoneyMovement[] {
  if (typeof window === "undefined") return [];
  return listMoneyMovements(loadPayments(), loadExpenses());
}

/**
 * سجل حركة الفلوس: تحصيل (+) ومصروف (−) بالترتيب الزمني.
 */
export function MoneyLedger() {
  const [movements, setMovements] = useState(readMovements);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function refresh() {
      setMovements(listMoneyMovements(loadPayments(), loadExpenses()));
    }
    window.addEventListener("upvc-accounting-updated", refresh);
    return () => window.removeEventListener("upvc-accounting-updated", refresh);
  }, []);

  const filtered = useMemo(() => {
    return movements.filter((row) =>
      smartSearchMatch(query, [
        row.title,
        row.subtitle,
        row.methodLabel,
        row.kind === "in" ? "تحصيل" : "مصروف",
      ])
    );
  }, [movements, query]);

  const net = moneyMovementsNet(filtered);
  const collected = filtered
    .filter((r) => r.kind === "in")
    .reduce((s, r) => s + r.amount, 0);
  const spent = filtered
    .filter((r) => r.kind === "out")
    .reduce((s, r) => s + r.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl border border-border bg-card px-3.5 py-3">
          <p className="text-[11px] text-muted">تحصيل</p>
          <p className="mt-1 text-base font-bold tabular-nums text-[#2F9B7A]">
            {formatCurrency(collected)} ج.م
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-3.5 py-3">
          <p className="text-[11px] text-muted">مصروف</p>
          <p className="mt-1 text-base font-bold tabular-nums text-[#C45C26]">
            {formatCurrency(spent)} ج.م
          </p>
        </div>
        <div className="col-span-2 rounded-2xl border border-border bg-card px-3.5 py-3">
          <p className="text-[11px] text-muted">الرصيد التقديري</p>
          <p
            className={`mt-1 text-lg font-bold tabular-nums ${
              net >= 0 ? "text-[#2F9B7A]" : "text-[#E85A8A]"
            }`}
          >
            {formatCurrency(net)} ج.م
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href={ROUTES.accounting.newPayment}
          className="flex h-11 items-center justify-center rounded-xl bg-[#1F6B55] text-xs font-bold text-white active:scale-[0.98]"
        >
          استلام دفعة
        </Link>
        <Link
          href={ROUTES.accounting.newExpense}
          className="flex h-11 items-center justify-center rounded-xl bg-[#C45C26] text-xs font-bold text-white active:scale-[0.98]"
        >
          تسجيل مصروف
        </Link>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="بحث في الحركة…"
        className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
          مفيش حركات فلوس بعد.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((row) => {
            const isIn = row.kind === "in";
            const href =
              row.projectId && row.customerId
                ? row.kind === "out"
                  ? ROUTES.design.expenses(row.customerId, row.projectId)
                  : ROUTES.design.account(row.customerId, row.projectId)
                : row.kind === "out"
                  ? ROUTES.accounting.expenses
                  : ROUTES.accounting.payments;

            return (
              <li key={row.id}>
                <Link
                  href={href}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card px-3.5 py-3 transition-all active:scale-[0.99]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                          isIn
                            ? "bg-[#2F9B7A]/15 text-[#1F6B55]"
                            : "bg-[#E8956F]/20 text-[#C45C26]"
                        }`}
                      >
                        {isIn ? "تحصيل" : "مصروف"}
                      </span>
                      <p className="truncate text-sm font-bold text-foreground">
                        {row.title}
                      </p>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {formatDate(row.date)}
                      {row.methodLabel ? ` · ${row.methodLabel}` : ""}
                      {row.subtitle ? ` · ${row.subtitle}` : ""}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 text-sm font-bold tabular-nums ${
                      isIn ? "text-[#2F9B7A]" : "text-[#C45C26]"
                    }`}
                  >
                    {isIn ? "+" : "−"}
                    {formatCurrency(row.amount)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
