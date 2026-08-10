"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  deleteExpense,
  loadExpenses,
  type Expense,
} from "@/lib/accounting";
import { getProjectById } from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import { formatCurrency, formatDate, smartSearchMatch } from "@/lib/utils";
import {
  hasStoreBridgeCredentials,
  isStoreBridgeActive,
  loadStoreBridgeConfig,
  syncAssignedStoreInvoiceExpenses,
  syncMoneyToStore,
} from "@/lib/store-bridge";

/**
 * سجل مصروفات الورشة — عرض وحذف + رابط لتسجيل مصروف جديد.
 */
export function ExpensesBrowser() {
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    typeof window === "undefined" ? [] : loadExpenses()
  );
  const [query, setQuery] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    function refresh() {
      setExpenses(loadExpenses());
    }
    window.addEventListener("upvc-accounting-updated", refresh);
    if (hasStoreBridgeCredentials()) {
      void syncAssignedStoreInvoiceExpenses()
        .then(() => refresh())
        .catch(() => undefined);
    }
    return () => window.removeEventListener("upvc-accounting-updated", refresh);
  }, []);

  const filtered = useMemo(() => {
    return [...expenses]
      .filter((expense) => {
        const project = expense.projectId
          ? getProjectById(expense.projectId)
          : undefined;
        return smartSearchMatch(query, [
          expense.category,
          expense.description,
          expense.note,
          project?.name,
        ]);
      })
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
  }, [expenses, query]);

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);

  async function handleDelete(expense: Expense) {
    if (!window.confirm("هل تريد حذف هذا المصروف؟")) return;
    setActionError("");
    const cfg = loadStoreBridgeConfig();
    if (
      expense.storeBridge &&
      !expense.storeInvoiceId &&
      isStoreBridgeActive(cfg) &&
      cfg
    ) {
      try {
        await syncMoneyToStore(
          {
            kind: "expense",
            externalKey: expense.id,
            amount: 0,
            description: "ورشة · حذف مصروف",
            safeId: expense.storeBridge.safeId || cfg.safeId,
          },
          cfg
        );
      } catch (err) {
        setActionError(
          err instanceof Error
            ? `فشل إلغاء المصروف في خزنة المتجر: ${err.message}`
            : "فشل إلغاء المصروف في خزنة المتجر"
        );
        return;
      }
    }
    deleteExpense(expense.id);
    setExpenses(loadExpenses());
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={ROUTES.accounting.newExpense}
        className="flex h-12 items-center justify-center rounded-2xl bg-[#C45C26] text-sm font-bold text-white transition-all hover:brightness-105 active:scale-[0.98]"
      >
        تسجيل مصروف
      </Link>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="بحث بالوصف أو المشروع…"
        className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />

      {actionError ? (
        <p className="rounded-xl border border-[#E85A8A]/35 bg-[#E85A8A]/10 px-3 py-2 text-xs font-medium text-[#E85A8A]">
          {actionError}
        </p>
      ) : null}

      <div className="rounded-2xl border border-border bg-card px-4 py-3">
        <p className="text-xs text-muted">إجمالي المعروض</p>
        <p className="mt-1 text-lg font-bold tabular-nums text-[#E8956F]">
          {formatCurrency(total)} ج.م
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm leading-relaxed text-muted">
          لا توجد مصروفات بعد.
          <br />
          سجّل مصروف ورشة من الزر أعلاه أو من داخل المشروع.
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {filtered.map((expense) => {
            const project = expense.projectId
              ? getProjectById(expense.projectId)
              : undefined;
            return (
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
                      {project
                        ? ` · ${project.name}`
                        : " · مصروف ورشة عام"}
                    </p>
                    {expense.note ? (
                      <p className="mt-1 text-xs text-muted">{expense.note}</p>
                    ) : null}
                    {project ? (
                      <Link
                        href={ROUTES.design.expenses(
                          project.customerId,
                          project.id
                        )}
                        className="mt-2 inline-block text-[11px] font-semibold text-primary"
                      >
                        فتح مصروفات المشروع
                      </Link>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <p className="text-sm font-bold tabular-nums text-[#E8956F]">
                      {formatCurrency(expense.amount)}
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleDelete(expense)}
                      className="text-xs font-semibold text-[#E85A8A]"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
