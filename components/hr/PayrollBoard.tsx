"use client";

import { useEffect, useMemo, useState } from "react";
import { StoreSafePicker } from "@/components/accounting/StoreSafePicker";
import { NumericInput } from "@/components/ui/NumericInput";
import { todayIsoDate } from "@/lib/accounting";
import {
  attachPayrollStoreBridge,
  currentMonthRange,
  deletePaidPayroll,
  HR_UPDATED_EVENT,
  listActiveEmployees,
  loadPayroll,
  payEmployeeBalance,
  PAY_TYPE_LABELS,
  periodLabel,
  previewEmployeeBalance,
  type BalancePreview,
  type Employee,
  type Payroll,
} from "@/lib/hr";
import { listAllProjects, type Project } from "@/lib/projects";
import {
  isStoreBridgeActive,
  loadStoreBridgeConfig,
  syncMoneyToStore,
  withStoreBridgeMeta,
} from "@/lib/store-bridge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { WORKFLOW_LABELS } from "@/lib/workshop";

const FIELD =
  "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export function PayrollBoard() {
  const month = currentMonthRange();
  const [date, setDate] = useState(todayIsoDate);
  const [projectId, setProjectId] = useState("");
  const [safeId, setSafeId] = useState("");
  const [safeName, setSafeName] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");
  const [payingId, setPayingId] = useState("");
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>(
    {}
  );
  const [historyFrom, setHistoryFrom] = useState(month.from);
  const [historyTo, setHistoryTo] = useState(month.to);

  useEffect(() => {
    function refresh() {
      setEmployees(listActiveEmployees());
      setPayroll(loadPayroll());
      setProjects(listAllProjects());
    }
    refresh();
    window.addEventListener(HR_UPDATED_EVENT, refresh);
    window.addEventListener("upvc-accounting-updated", refresh);
    window.addEventListener("upvc-projects-updated", refresh);
    return () => {
      window.removeEventListener(HR_UPDATED_EVENT, refresh);
      window.removeEventListener("upvc-accounting-updated", refresh);
      window.removeEventListener("upvc-projects-updated", refresh);
    };
  }, []);

  const rows = employees.map((employee) => previewEmployeeBalance(employee));
  const payable = rows.filter(
    (row) =>
      row.netAmount > 0.004 ||
      (row.employee.payType === "manual" &&
        (customAmounts[row.employee.id] ?? 0) > 0.004)
  );
  const payableTotal = payable.reduce((sum, row) => {
    if (row.employee.payType === "manual" && row.accruedAmount <= 0.004) {
      const typed = roundShown(customAmounts[row.employee.id] ?? 0);
      return sum + typed;
    }
    return sum + row.netAmount;
  }, 0);

  const history = useMemo(
    () =>
      payroll
        .filter(
          (row) =>
            row.status === "paid" &&
            row.date >= historyFrom &&
            row.date <= historyTo
        )
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [payroll, historyFrom, historyTo]
  );

  const employeeById = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const row of employees) map.set(row.id, row);
    return map;
  }, [employees]);

  async function payOne(preview: BalancePreview, custom?: boolean) {
    setError("");
    const typed = roundShown(customAmounts[preview.employee.id] ?? 0);
    const amount =
      custom || preview.employee.payType === "manual"
        ? typed > 0.004
          ? typed
          : preview.employee.payType === "manual"
            ? undefined
            : typed
        : undefined;
    if (
      preview.employee.payType === "manual" &&
      preview.accruedAmount <= 0.004 &&
      !(typed > 0.004)
    ) {
      setError("أدخل مبلغ الصرف للعامل بدون راتب ثابت");
      return;
    }
    const cfg = loadStoreBridgeConfig();
    const bridgeOn = isStoreBridgeActive(cfg);
    const expectedNet =
      amount == null
        ? preview.netAmount
        : Math.max(0, amount - Math.min(amount, preview.openAdvances));
    if (bridgeOn && expectedNet > 0.004 && !safeId) {
      setError("اختر خزنة المتجر");
      return;
    }
    setPayingId(preview.employee.id);
    try {
      const paid = payEmployeeBalance({
        employee: preview.employee,
        amount,
        date,
        projectId: projectId || undefined,
      });
      if (paid.expenseId && bridgeOn && cfg && paid.netAmount > 0.004) {
        try {
          const sync = await syncMoneyToStore(
            {
              kind: "expense",
              externalKey: paid.expenseId,
              amount: paid.netAmount,
              description: [
                "ورشة · راتب",
                preview.employee.name,
                PAY_TYPE_LABELS[preview.employee.payType],
              ].join(" · "),
              occurredAt: date ? `${date}T12:00:00.000Z` : undefined,
              safeId,
            },
            cfg
          );
          attachPayrollStoreBridge(
            paid.id,
            withStoreBridgeMeta(
              paid.netAmount,
              sync.safe_id || safeId,
              sync.reference_id,
              safeName
            )
          );
        } catch (err) {
          setError(
            `تم الصرف محلياً — ${
              err instanceof Error ? err.message : "فشلت مزامنة الخزنة"
            }`
          );
        }
      }
      setCustomAmounts((current) => ({
        ...current,
        [preview.employee.id]: 0,
      }));
      setPayroll(loadPayroll());
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر صرف الراتب");
    } finally {
      setPayingId("");
    }
  }

  async function payAll() {
    for (const row of payable) {
      if (payingId) return;
      const typed = roundShown(customAmounts[row.employee.id] ?? 0);
      const useCustom =
        row.employee.payType === "manual" || typed > 0.004;
      await payOne(row, useCustom && typed > 0.004);
    }
  }

  async function undoPay(row: Payroll) {
    if (!window.confirm("إلغاء صرف الراتب؟ هيتشال المصروف وترجع السلف والمكافآت.")) {
      return;
    }
    setError("");
    const cfg = loadStoreBridgeConfig();
    if (row.expenseId && row.storeBridge && isStoreBridgeActive(cfg) && cfg) {
      try {
        await syncMoneyToStore(
          {
            kind: "expense",
            externalKey: row.expenseId,
            amount: 0,
            description: "ورشة · إلغاء راتب",
            safeId: row.storeBridge.safeId || cfg.safeId,
          },
          cfg
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? `فشل إلغاء الراتب في الخزنة: ${err.message}`
            : "فشل إلغاء الراتب في الخزنة"
        );
        return;
      }
    }
    deletePaidPayroll(row.id);
    setPayroll(loadPayroll());
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4">
        <label className="flex flex-col gap-1.5 text-right">
          <span className="text-xs font-medium text-muted">تاريخ الصرف</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={FIELD}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-right">
          <span className="text-xs font-medium text-muted">
            شغلانة (اختياري)
          </span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className={FIELD}
          >
            <option value="">مصروف أجور عام</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
                {project.workflow !== "quote"
                  ? ` · ${WORKFLOW_LABELS[project.workflow]}`
                  : ""}
              </option>
            ))}
          </select>
        </label>
      </section>

      <StoreSafePicker
        value={safeId}
        preferredSafeId={safeId}
        onChange={(id, safe) => {
          setSafeId(id);
          setSafeName(safe?.name ?? "");
        }}
        label="خزنة الصرف"
        variant="choices"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold">
          صافي المستحق المتراكم {formatCurrency(payableTotal)} ج.م
        </p>
        <button
          type="button"
          onClick={() => void payAll()}
          disabled={payable.length === 0 || Boolean(payingId)}
          className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          صرف كل المستحقات
        </button>
      </div>

      {error ? (
        <p className="text-sm font-medium text-[#E85A8A]">{error}</p>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
          مفيش موظفين شغالين
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2">
            {rows.map((row) => (
              <PayrollCard
                key={row.employee.id}
                row={row}
                customAmount={customAmounts[row.employee.id] ?? 0}
                payingId={payingId}
                onCustomAmount={(value) =>
                  setCustomAmounts((current) => ({
                    ...current,
                    [row.employee.id]: value,
                  }))
                }
                onPayFull={() => void payOne(row, false)}
                onPayCustom={() => void payOne(row, true)}
              />
            ))}
          </ul>
        </>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-sm font-bold">سجل الصرف</p>
          <div className="flex flex-wrap gap-2">
            <label className="flex flex-col gap-1 text-right">
              <span className="text-[11px] text-muted">من</span>
              <input
                type="date"
                value={historyFrom}
                onChange={(e) => setHistoryFrom(e.target.value)}
                className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-right">
              <span className="text-[11px] text-muted">إلى</span>
              <input
                type="date"
                value={historyTo}
                onChange={(e) => setHistoryTo(e.target.value)}
                className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
              />
            </label>
          </div>
        </div>
        {history.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted">
            مفيش صرف في الفترة دي
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((row) => {
              const name =
                employeeById.get(row.employeeId)?.name ?? "موظف";
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDate(row.date)}
                      {" · "}
                      {periodLabel(row.periodFrom, row.periodTo)}
                      {row.note ? ` · ${row.note}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold tabular-nums">
                      {formatCurrency(row.netAmount)} ج.م
                    </p>
                    <button
                      type="button"
                      onClick={() => void undoPay(row)}
                      className="text-xs font-semibold text-[#E85A8A]"
                    >
                      إلغاء
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="px-1 text-[11px] text-muted">
          المصروف يظهر في الحسابات ← مصروفات الورشة (أجور) وسجل الحركة
          {projectId ? " وحساب الشغلانة المختارة" : ""}. الأيام والنسب
          والمكافآت تتراكم لحد الصرف.
        </p>
      </section>
    </div>
  );
}

function roundShown(amount: number): number {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

function PayrollCard({
  row,
  customAmount,
  payingId,
  onCustomAmount,
  onPayFull,
  onPayCustom,
}: {
  row: BalancePreview;
  customAmount: number;
  payingId: string;
  onCustomAmount: (value: number) => void;
  onPayFull: () => void;
  onPayCustom: () => void;
}) {
  const busy = Boolean(payingId);
  const canPayFull = row.accruedAmount > 0.004;
  const canPayCustom =
    customAmount > 0.004 &&
    (row.employee.payType === "manual" || row.accruedAmount > 0.004);

  return (
    <li className="rounded-2xl border border-border bg-card px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold">{row.employee.name}</p>
          <p className="mt-0.5 text-xs text-muted">
            {row.accountLabel}
            {" · متراكم "}
            {formatCurrency(row.accruedAmount)}
            {row.bonusAmount > 0
              ? ` · مكافآت ${formatCurrency(row.bonusAmount)}`
              : ""}
            {row.openAdvances > 0
              ? ` · سلف −${formatCurrency(row.openAdvances)}`
              : ""}
          </p>
          {row.leftoverAdvances > 0.004 && row.netAmount > 0.004 ? (
            <p className="mt-0.5 text-[11px] text-[#C47A12]">
              هيفضل سلف {formatCurrency(row.leftoverAdvances)} ج.م
            </p>
          ) : null}
        </div>
        <p className="shrink-0 text-sm font-bold tabular-nums">
          {formatCurrency(row.netAmount)} ج.م
        </p>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        <span className="text-[11px] text-muted">مبلغ جزئي / يدوي</span>
        <NumericInput
          value={customAmount}
          onChange={onCustomAmount}
          min={0}
          aria-label="صرف مبلغ"
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {canPayFull ? (
            <button
              type="button"
              onClick={onPayFull}
              disabled={busy}
              className="rounded-xl bg-primary px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
            >
              {payingId === row.employee.id ? "جاري الصرف…" : "صرف المستحق"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onPayCustom}
            disabled={busy || !canPayCustom}
            className="rounded-xl border border-border px-3 py-1.5 text-[11px] font-bold disabled:opacity-50"
          >
            صرف المبلغ
          </button>
        </div>
      </div>
    </li>
  );
}
