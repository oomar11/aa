"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  deleteExpense,
  EXPENSE_CATEGORIES,
  expenseChannelLabel,
  isCreditExpense,
  loadExpenses,
  type Expense,
} from "@/lib/accounting";
import { getProjectById } from "@/lib/projects";
import { getEmployeeById } from "@/lib/hr";
import { ROUTES } from "@/lib/routes";
import { formatCurrency, formatDate, smartSearchMatch } from "@/lib/utils";
import {
  hasStoreBridgeCredentials,
  isStoreBridgeActive,
  loadStoreBridgeConfig,
  syncAssignedStoreInvoiceExpenses,
  syncMoneyToStore,
} from "@/lib/store-bridge";
import { CATALOG_EVENTS } from "@/lib/storage/keys";
import {
  expectedExpenseTotals,
  listExpectedExpenseRows,
  type ExpectedExpenseRow,
} from "@/lib/expected-expenses";
import { ExpenseForm } from "@/components/accounting/ExpenseForm";
import { WorkshopSyncBanner } from "@/components/settings/WorkshopSyncBanner";

type SettlementFilter = "all" | "cash" | "credit";
type PeriodFilter = "all" | "month";

/**
 * سجل مصروفات الورشة — كروت على الموبايل، ولوحة جدول+نموذج على الكمبيوتر.
 */
export function ExpensesBrowser() {
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    typeof window === "undefined" ? [] : loadExpenses()
  );
  const [query, setQuery] = useState("");
  const [settlementFilter, setSettlementFilter] =
    useState<SettlementFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [actionError, setActionError] = useState("");
  const [expectedRows, setExpectedRows] = useState<ExpectedExpenseRow[]>([]);

  useEffect(() => {
    function refresh() {
      setExpenses(loadExpenses());
      setExpectedRows(listExpectedExpenseRows());
    }
    refresh();
    window.addEventListener("upvc-accounting-updated", refresh);
    window.addEventListener("upvc-projects-updated", refresh);
    window.addEventListener(CATALOG_EVENTS.catalogUpdated, refresh);
    if (hasStoreBridgeCredentials()) {
      void syncAssignedStoreInvoiceExpenses()
        .then(() => refresh())
        .catch(() => undefined);
    }
    return () => {
      window.removeEventListener("upvc-accounting-updated", refresh);
      window.removeEventListener("upvc-projects-updated", refresh);
      window.removeEventListener(CATALOG_EVENTS.catalogUpdated, refresh);
    };
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    return [...expenses]
      .filter((expense) => {
        const project = expense.projectId
          ? getProjectById(expense.projectId)
          : undefined;
        const employeeName = expense.employeeId
          ? (getEmployeeById(expense.employeeId)?.name ?? "")
          : "";
        if (
          !smartSearchMatch(query, [
            expense.category,
            expense.description,
            expense.note,
            expense.storeSupplierName,
            expense.storeBridge?.safeName,
            project?.name,
            employeeName,
          ])
        ) {
          return false;
        }
        if (categoryFilter && expense.category !== categoryFilter) return false;
        const credit = isCreditExpense(expense);
        if (settlementFilter === "cash" && credit) return false;
        if (settlementFilter === "credit" && !credit) return false;
        if (periodFilter === "month") {
          const d = new Date(expense.date);
          if (
            d.getFullYear() !== now.getFullYear() ||
            d.getMonth() !== now.getMonth()
          ) {
            return false;
          }
        }
        return true;
      })
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
  }, [expenses, query, categoryFilter, settlementFilter, periodFilter]);

  const expectedTotals = useMemo(
    () => expectedExpenseTotals(expectedRows),
    [expectedRows]
  );

  const totals = useMemo(() => {
    let cash = 0;
    let credit = 0;
    for (const expense of filtered) {
      if (isCreditExpense(expense)) credit += expense.amount;
      else cash += expense.amount;
    }
    return { cash, credit, all: cash + credit, count: filtered.length };
  }, [filtered]);

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

  function reload() {
    setExpenses(loadExpenses());
    setExpectedRows(listExpectedExpenseRows());
  }

  return (
    <div className="flex flex-col gap-4">
      <WorkshopSyncBanner />

      <Link
        href={ROUTES.accounting.newExpense}
        className="flex h-12 items-center justify-center rounded-2xl bg-[#C45C26] text-sm font-bold text-white transition-all hover:brightness-105 active:scale-[0.98] lg:hidden"
      >
        تسجيل مصروف
      </Link>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="بحث بالوصف أو المشروع أو الخزنة…"
          className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 lg:flex-1"
        />
        <div className="hidden shrink-0 gap-1.5 lg:flex">
          {(
            [
              { id: "all" as const, label: "كل الفترة" },
              { id: "month" as const, label: "هذا الشهر" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPeriodFilter(opt.id)}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                periodFilter === opt.id
                  ? "border-[#C45C26] bg-[#C45C26] text-white"
                  : "border-border bg-card text-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden flex-wrap gap-1.5 lg:flex">
        {(
          [
            { id: "all" as const, label: "الكل" },
            { id: "cash" as const, label: "نقدي" },
            { id: "credit" as const, label: "آجل" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSettlementFilter(opt.id)}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${
              settlementFilter === opt.id
                ? "border-[#C45C26] bg-[#C45C26] text-white"
                : "border-border bg-card text-muted"
            }`}
          >
            {opt.label}
          </button>
        ))}
        <span className="mx-1 h-6 w-px self-center bg-border" />
        <button
          type="button"
          onClick={() => setCategoryFilter("")}
          className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${
            !categoryFilter
              ? "border-[#C45C26] bg-[#C45C26] text-white"
              : "border-border bg-card text-muted"
          }`}
        >
          كل التصنيف
        </button>
        {EXPENSE_CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategoryFilter(item)}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${
              categoryFilter === item
                ? "border-[#C45C26] bg-[#C45C26] text-white"
                : "border-border bg-card text-muted"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {actionError ? (
        <p className="rounded-xl border border-[#E85A8A]/35 bg-[#E85A8A]/10 px-3 py-2 text-xs font-medium text-[#E85A8A]">
          {actionError}
        </p>
      ) : null}

      <ExpectedPanel rows={expectedRows} totals={expectedTotals} />

      <div className="rounded-2xl border border-border bg-card px-4 py-3 lg:hidden">
        <p className="text-xs text-muted">إجمالي المعروض</p>
        <p className="mt-1 text-lg font-bold tabular-nums text-[#E8956F]">
          {formatCurrency(totals.all)} ج.م
        </p>
      </div>

      <div className="hidden grid-cols-4 gap-3 lg:grid">
        <Kpi label="إجمالي المعروض" value={totals.all} />
        <Kpi label="نقدي من الخزن" value={totals.cash} />
        <Kpi label="آجل على مورد" value={totals.credit} />
        <Kpi label="عدد القيود" value={totals.count} count />
      </div>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)] lg:items-start">
        <div className="hidden lg:sticky lg:top-4 lg:block lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-4">
          <h2 className="mb-3 text-sm font-bold text-foreground">
            تسجيل مصروف
          </h2>
          <ExpenseForm embedded onSaved={reload} />
        </div>

        <div className="min-w-0">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm leading-relaxed text-muted">
              لا توجد مصروفات بعد.
              <br />
              سجّل مصروف ورشة من الزر أعلاه أو من داخل المشروع.
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card lg:block">
                <table className="w-full min-w-[760px] text-start text-sm">
                  <thead className="bg-background text-[11px] text-muted">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">التاريخ</th>
                      <th className="px-3 py-2.5 font-semibold">الوصف</th>
                      <th className="px-3 py-2.5 font-semibold">التصنيف</th>
                      <th className="px-3 py-2.5 font-semibold">المشروع</th>
                      <th className="px-3 py-2.5 font-semibold">التعامل</th>
                      <th className="px-3 py-2.5 text-end font-semibold">
                        المبلغ
                      </th>
                      <th className="px-4 py-2.5 text-end font-semibold">
                        إجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((expense) => {
                      const project = expense.projectId
                        ? getProjectById(expense.projectId)
                        : undefined;
                      return (
                        <tr
                          key={expense.id}
                          className="border-t border-border hover:bg-[#E8956F]/10"
                        >
                          <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                            {formatDate(expense.date)}
                          </td>
                          <td className="max-w-[16rem] px-3 py-2.5">
                            <p className="truncate font-semibold text-foreground">
                              {expense.description}
                            </p>
                            {expense.note ? (
                              <p className="mt-0.5 truncate text-[11px] text-muted">
                                {expense.note}
                              </p>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-muted">
                            {expense.category}
                          </td>
                          <td className="px-3 py-2.5">
                            {project ? (
                              <Link
                                href={ROUTES.design.expenses(
                                  project.customerId,
                                  project.id
                                )}
                                className="font-semibold text-primary hover:underline"
                              >
                                {project.name}
                              </Link>
                            ) : (
                              <span className="text-muted">عام</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-[12px] text-muted">
                            {expenseChannelLabel(expense)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-end font-bold tabular-nums text-[#C45C26]">
                            {formatCurrency(expense.amount)}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-end gap-3">
                              <Link
                                href={ROUTES.accounting.editExpense(expense.id)}
                                className="text-xs font-semibold text-primary"
                              >
                                تعديل
                              </Link>
                              <button
                                type="button"
                                onClick={() => void handleDelete(expense)}
                                className="text-xs font-semibold text-[#E85A8A]"
                              >
                                حذف
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="flex flex-col gap-2.5 lg:hidden">
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
                          <p className="mt-1 text-[11px] font-semibold text-muted">
                            {expenseChannelLabel(expense)}
                          </p>
                          {expense.note ? (
                            <p className="mt-1 text-xs text-muted">
                              {expense.note}
                            </p>
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
                          <Link
                            href={ROUTES.accounting.editExpense(expense.id)}
                            className="text-xs font-semibold text-primary"
                          >
                            تعديل
                          </Link>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function leftoverTone(value: number): string {
  if (value > 0.004) return "text-[#2F9B7A]";
  if (value < -0.004) return "text-[#E85A8A]";
  return "text-foreground";
}

function ExpectedPanel({
  rows,
  totals,
}: {
  rows: ExpectedExpenseRow[];
  totals: ReturnType<typeof expectedExpenseTotals>;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-foreground">
            المصروفات المتوقعة
          </h2>
          <p className="mt-0.5 text-[11px] text-muted">
            تكلفة خامات الشغل المفتوح من أسعار المقايسة
          </p>
        </div>
        {totals.jobs > 0 ? (
          <span className="shrink-0 text-[11px] font-semibold text-muted">
            {totals.jobs} شغلانة
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-background px-2.5 py-2 text-center">
          <p className="text-[10px] text-muted">متوقع</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-[#C45C26]">
            {formatCurrency(totals.expected)}
          </p>
        </div>
        <div className="rounded-xl bg-background px-2.5 py-2 text-center">
          <p className="text-[10px] text-muted">اتسجّل</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-[#C45C26]">
            {formatCurrency(totals.actual)}
          </p>
        </div>
        <div className="rounded-xl bg-background px-2.5 py-2 text-center">
          <p className="text-[10px] text-muted">
            {totals.leftover < -0.004 ? "زيادة" : "باقي متوقع"}
          </p>
          <p
            className={`mt-0.5 text-sm font-bold tabular-nums ${leftoverTone(
              totals.leftover
            )}`}
          >
            {formatCurrency(Math.abs(totals.leftover))}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-center text-xs leading-relaxed text-muted">
          مفيش شغل مفتوح عليه تكلفة متوقعة. اضبط أسعار الخامات من المقايسة عشان
          يظهر الرقم.
        </p>
      ) : (
        <>
          <ul className="mt-3 flex flex-col gap-1.5 lg:hidden">
            {rows.map((row) => (
              <li key={row.projectId}>
                <Link
                  href={ROUTES.design.expenses(row.customerId, row.projectId)}
                  className="flex items-center justify-between gap-3 rounded-xl bg-background px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {row.projectName}
                    </p>
                    <p className="truncate text-[11px] text-muted">
                      {row.customerName}
                      {" · متوقع "}
                      {formatCurrency(row.expected)}
                      {" · اتسجّل "}
                      {formatCurrency(row.actual)}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 text-xs font-bold tabular-nums ${leftoverTone(
                      row.leftover
                    )}`}
                  >
                    {row.leftover < -0.004 ? "+" : ""}
                    {formatCurrency(row.leftover)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-3 hidden overflow-x-auto rounded-xl border border-border lg:block">
            <table className="w-full min-w-[560px] text-start text-sm">
              <thead className="bg-background text-[11px] text-muted">
                <tr>
                  <th className="px-3 py-2 font-semibold">المشروع</th>
                  <th className="px-3 py-2 font-semibold">العميل</th>
                  <th className="px-3 py-2 text-end font-semibold">متوقع</th>
                  <th className="px-3 py-2 text-end font-semibold">اتسجّل</th>
                  <th className="px-3 py-2 text-end font-semibold">الفرق</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.projectId} className="border-t border-border">
                    <td className="px-3 py-2">
                      <Link
                        href={ROUTES.design.expenses(
                          row.customerId,
                          row.projectId
                        )}
                        className="font-semibold text-primary hover:underline"
                      >
                        {row.projectName}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-muted">{row.customerName}</td>
                    <td className="px-3 py-2 text-end tabular-nums">
                      {row.hasCost ? formatCurrency(row.expected) : "—"}
                    </td>
                    <td className="px-3 py-2 text-end tabular-nums text-[#C45C26]">
                      {formatCurrency(row.actual)}
                    </td>
                    <td
                      className={`px-3 py-2 text-end font-bold tabular-nums ${leftoverTone(
                        row.leftover
                      )}`}
                    >
                      {formatCurrency(row.leftover)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function Kpi({
  label,
  value,
  count = false,
}: {
  label: string;
  value: number;
  count?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-[#C45C26]">
        {count ? value : `${formatCurrency(value)} ج.م`}
      </p>
    </div>
  );
}
