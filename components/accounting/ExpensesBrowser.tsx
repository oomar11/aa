"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  deleteExpense,
  loadExpenses,
  type Expense,
} from "@/lib/accounting";
import { ROUTES } from "@/lib/routes";
import { formatCurrency, formatDate, smartSearchMatch } from "@/lib/utils";

export function ExpensesBrowser() {
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    typeof window === "undefined" ? [] : loadExpenses()
  );
  const [query, setQuery] = useState("");

  useEffect(() => {
    function refresh() {
      setExpenses(loadExpenses());
    }
    window.addEventListener("upvc-accounting-updated", refresh);
    return () => window.removeEventListener("upvc-accounting-updated", refresh);
  }, []);

  const filtered = useMemo(() => {
    return [...expenses]
      .filter((expense) =>
        smartSearchMatch(query, [
          expense.category,
          expense.description,
          expense.note,
        ])
      )
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
  }, [expenses, query]);

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="بحث بالوصف أو التصنيف…"
          className="h-11 flex-1 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <Link
          href={ROUTES.accounting.newExpense}
          className="flex h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white"
        >
          مصروف
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card px-4 py-3">
        <p className="text-xs text-muted">إجمالي المعروض</p>
        <p className="mt-1 text-lg font-bold tabular-nums text-[#E8956F]">
          {formatCurrency(total)} ج.م
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
          مفيش مصروفات مطابقة
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {filtered.map((expense) => (
            <li
              key={expense.id}
              className="rounded-2xl border border-border bg-card p-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    {expense.description}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {expense.category} · {formatDate(expense.date)}
                  </p>
                  {expense.note ? (
                    <p className="mt-1 text-xs text-muted">{expense.note}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <p className="text-sm font-bold tabular-nums text-[#E8956F]">
                    {formatCurrency(expense.amount)}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm("تمسح المصروف ده؟")) return;
                      deleteExpense(expense.id);
                    }}
                    className="text-xs font-semibold text-[#E85A8A]"
                  >
                    حذف
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
