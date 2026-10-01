"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StoreSafePicker } from "@/components/accounting/StoreSafePicker";
import { NumericInput } from "@/components/ui/NumericInput";
import { AttendanceStatusToggle } from "@/components/hr/AttendanceStatusToggle";
import { BalanceChips } from "@/components/hr/BalanceChips";
import { LedgerForm, LedgerList } from "@/components/hr/EmployeeLedger";
import { todayIsoDate } from "@/lib/accounting";
import {
  attachPayrollStoreBridge,
  deletePaidPayroll,
  EMPLOYEE_STATUS_LABELS,
  getEmployeeById,
  HR_UPDATED_EVENT,
  loadAdvances,
  loadAttendance,
  loadBonuses,
  loadPayroll,
  PAY_TYPE_LABELS,
  payEmployeeBalance,
  periodLabel,
  previewEmployeeBalance,
  setAttendance,
  type AttendanceStatus,
  type BalancePreview,
  type Employee,
  type Payroll,
} from "@/lib/hr";
import { ATTENDANCE_VISUAL, payRateLabel } from "@/lib/hr-visual";
import { listAllProjects, type Project } from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import {
  isStoreBridgeActive,
  loadStoreBridgeConfig,
  syncMoneyToStore,
  withStoreBridgeMeta,
} from "@/lib/store-bridge";
import { formatCurrency, formatDate } from "@/lib/utils";

function lastDates(count: number, endIso: string): string[] {
  const end = new Date(`${endIso}T00:00:00`);
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function EmployeeDetail({ employeeId }: { employeeId: string }) {
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    function refresh() {
      setTick((n) => n + 1);
    }
    setMounted(true);
    window.addEventListener(HR_UPDATED_EVENT, refresh);
    window.addEventListener("upvc-accounting-updated", refresh);
    window.addEventListener("upvc-projects-updated", refresh);
    return () => {
      window.removeEventListener(HR_UPDATED_EVENT, refresh);
      window.removeEventListener("upvc-accounting-updated", refresh);
      window.removeEventListener("upvc-projects-updated", refresh);
    };
  }, []);

  const employee = mounted ? getEmployeeById(employeeId) : undefined;
  const projects = useMemo(() => (mounted ? listAllProjects() : []), [mounted, tick]);
  const advances = useMemo(
    () => (mounted ? loadAdvances().filter((row) => row.employeeId === employeeId) : []),
    [mounted, tick, employeeId]
  );
  const bonuses = useMemo(
    () => (mounted ? loadBonuses().filter((row) => row.employeeId === employeeId) : []),
    [mounted, tick, employeeId]
  );
  const payrollHistory = useMemo(
    () =>
      mounted
        ? loadPayroll()
            .filter((row) => row.employeeId === employeeId && row.status === "paid")
            .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
        : [],
    [mounted, tick, employeeId]
  );
  const attendanceByDate = useMemo(() => {
    if (!mounted) return new Map<string, AttendanceStatus>();
    const map = new Map<string, AttendanceStatus>();
    for (const row of loadAttendance()) {
      if (row.employeeId === employeeId) map.set(row.date, row.status);
    }
    return map;
  }, [mounted, tick, employeeId]);

  if (!mounted) {
    return (
      <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted">
        جاري التحميل…
      </div>
    );
  }

  if (!employee) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
        الموظف غير موجود
      </p>
    );
  }

  const balance = previewEmployeeBalance(employee);
  const today = todayIsoDate();
  const week = lastDates(7, today);

  function refresh() {
    setTick((n) => n + 1);
  }

  return (
    <div className="flex flex-col gap-4 lg:max-w-3xl">
      <header className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-foreground">
            {employee.name}
            {employee.status === "left" ? (
              <span className="ms-2 text-xs font-semibold text-muted">
                {EMPLOYEE_STATUS_LABELS.left}
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {employee.role} · {PAY_TYPE_LABELS[employee.payType]}{" "}
            {payRateLabel(employee)}
            {employee.phone ? ` · ${employee.phone}` : ""}
          </p>
        </div>
        <Link
          href={ROUTES.hr.editEmployee(employee.id)}
          className="shrink-0 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground"
        >
          تعديل البيانات
        </Link>
      </header>

      <BalanceCard employee={employee} balance={balance} onPaid={refresh} />

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">الحضور</h2>
        <p className="mt-0.5 text-[11px] text-muted">{formatDate(today)} — اليوم</p>
        <AttendanceStatusToggle
          current={attendanceByDate.get(today)}
          onChange={(status) => {
            setAttendance({ employeeId: employee.id, date: today, status });
            refresh();
          }}
          className="mt-2"
        />
        <div className="mt-3 flex items-center gap-1.5">
          {week.map((date) => {
            const status = attendanceByDate.get(date);
            const visual = status ? ATTENDANCE_VISUAL[status] : null;
            return (
              <span
                key={date}
                title={`${formatDate(date)}${visual ? ` · ${visual.label}` : ""}`}
                className={`h-2.5 w-2.5 rounded-full ${visual ? visual.dot : "bg-border"}`}
              />
            );
          })}
          <span className="ms-1 text-[11px] text-muted">آخر ٧ أيام</span>
        </div>
      </section>

      <LedgerForm employeeId={employee.id} onSaved={refresh} />
      <LedgerList advances={advances} bonuses={bonuses} projects={projects} onChanged={refresh} />

      <PayrollHistory history={payrollHistory} onChanged={refresh} />
    </div>
  );
}

function BalanceCard({
  employee,
  balance,
  onPaid,
}: {
  employee: Employee;
  balance: BalancePreview;
  onPaid: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayIsoDate);
  const [safeId, setSafeId] = useState("");
  const [safeName, setSafeName] = useState("");
  const [customAmount, setCustomAmount] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const hasBalance = balance.netAmount > 0.004;

  async function pay(custom: boolean) {
    setError("");
    const typed = roundShown(customAmount);
    const amount = custom ? typed : undefined;

    if (
      employee.payType === "manual" &&
      balance.accruedAmount <= 0.004 &&
      !(typed > 0.004)
    ) {
      setError("أدخل مبلغ الصرف للعامل بدون راتب ثابت");
      return;
    }

    const cfg = loadStoreBridgeConfig();
    const bridgeOn = isStoreBridgeActive(cfg);
    const expectedNet =
      amount == null ? balance.netAmount : Math.max(0, amount - Math.min(amount, balance.openAdvances));
    if (bridgeOn && expectedNet > 0.004 && !safeId) {
      setError("اختر خزنة المتجر");
      return;
    }

    setSaving(true);
    try {
      const paid = payEmployeeBalance({ employee, amount, date });
      if (paid.expenseId && bridgeOn && cfg && paid.netAmount > 0.004) {
        try {
          const sync = await syncMoneyToStore(
            {
              kind: "expense",
              externalKey: paid.expenseId,
              amount: paid.netAmount,
              description: ["ورشة · راتب", employee.name].join(" · "),
              occurredAt: date ? `${date}T12:00:00.000Z` : undefined,
              safeId,
            },
            cfg
          );
          attachPayrollStoreBridge(
            paid.id,
            withStoreBridgeMeta(paid.netAmount, sync.safe_id || safeId, sync.reference_id, safeName)
          );
        } catch (err) {
          setError(
            `تم الصرف محلياً — ${err instanceof Error ? err.message : "فشلت مزامنة الخزنة"}`
          );
        }
      }
      setCustomAmount(0);
      setOpen(false);
      onPaid();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر صرف الراتب");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted">الرصيد الحالي</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
            {formatCurrency(balance.netAmount)}{" "}
            <span className="text-xs font-semibold text-muted">ج.م</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={!hasBalance && employee.payType !== "manual"}
          className="shrink-0 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          صرف
        </button>
      </div>
      <BalanceChips row={balance} className="mt-3" />
      {balance.leftoverAdvances > 0.004 && balance.netAmount > 0.004 ? (
        <p className="mt-2 text-[11px] text-[#C47A12]">
          هيفضل سلف {formatCurrency(balance.leftoverAdvances)} ج.م
        </p>
      ) : null}

      {open ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-right">
              <span className="text-[11px] text-muted">تاريخ الصرف</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-right">
              <span className="text-[11px] text-muted">مبلغ جزئي / يدوي</span>
              <NumericInput
                value={customAmount}
                onChange={setCustomAmount}
                min={0}
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
              />
            </label>
          </div>
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
          {error ? <p className="text-sm font-medium text-[#b5543f]">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            {hasBalance ? (
              <button
                type="button"
                onClick={() => void pay(false)}
                disabled={saving}
                className="rounded-2xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? "جاري الصرف…" : "صرف كل المستحق"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void pay(true)}
              disabled={saving || !(roundShown(customAmount) > 0.004)}
              className="rounded-2xl border border-border px-4 py-2 text-sm font-bold disabled:opacity-50"
            >
              صرف المبلغ المدخل
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PayrollHistory({
  history,
  onChanged,
}: {
  history: Payroll[];
  onChanged: () => void;
}) {
  const [error, setError] = useState("");

  async function undo(row: Payroll) {
    if (!window.confirm("إلغاء صرف الراتب؟ هيتشال المصروف وترجع السلف والمكافآت.")) return;
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
          err instanceof Error ? `فشل إلغاء الراتب في الخزنة: ${err.message}` : "فشل إلغاء الراتب في الخزنة"
        );
        return;
      }
    }
    deletePaidPayroll(row.id);
    onChanged();
  }

  if (history.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <p className="px-1 text-sm font-bold">سجل الصرف</p>
      {error ? <p className="px-1 text-sm font-medium text-[#b5543f]">{error}</p> : null}
      <ul className="flex flex-col gap-2">
        {history.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card px-3.5 py-3"
          >
            <div className="min-w-0">
              <p className="text-xs text-muted">
                {formatDate(row.date)} · {periodLabel(row.periodFrom, row.periodTo)}
                {row.note ? ` · ${row.note}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm font-bold tabular-nums">{formatCurrency(row.netAmount)} ج.م</p>
              <button
                type="button"
                onClick={() => void undo(row)}
                className="text-xs font-semibold text-[#b5543f]"
              >
                إلغاء
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function roundShown(amount: number): number {
  return Math.round((Number(amount) || 0) * 100) / 100;
}
