"use client";

import { useEffect, useMemo, useState } from "react";
import { StoreSafePicker } from "@/components/accounting/StoreSafePicker";
import { todayIsoDate } from "@/lib/accounting";
import {
  attachPayrollStoreBridge,
  currentMonthRange,
  deletePaidPayroll,
  HR_UPDATED_EVENT,
  listActiveEmployees,
  loadPayroll,
  payEmployeePayroll,
  periodLabel,
  previewPayroll,
  type Employee,
  type Payroll,
  type PayrollPreview,
} from "@/lib/hr";
import { listAllProjects, type Project } from "@/lib/projects";
import {
  isStoreBridgeActive,
  loadStoreBridgeConfig,
  syncMoneyToStore,
  withStoreBridgeMeta,
} from "@/lib/store-bridge";
import { formatCurrency } from "@/lib/utils";
import { WORKFLOW_LABELS } from "@/lib/workshop";

const FIELD =
  "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export function PayrollBoard() {
  const month = currentMonthRange();
  const [from, setFrom] = useState(month.from);
  const [to, setTo] = useState(month.to);
  const [date, setDate] = useState(todayIsoDate);
  const [projectId, setProjectId] = useState("");
  const [safeId, setSafeId] = useState("");
  const [safeName, setSafeName] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");
  const [payingId, setPayingId] = useState("");

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

  const rows = employees.map((employee) =>
    previewPayroll(employee, from, to)
  );

  const periodPayroll = useMemo(
    () =>
      payroll.filter(
        (row) =>
          row.status === "paid" &&
          row.periodFrom === from &&
          row.periodTo === to
      ),
    [payroll, from, to]
  );

  const unpaid = rows.filter((row) => !row.alreadyPaid);
  const payableTotal = unpaid.reduce((sum, row) => sum + row.netAmount, 0);

  async function payOne(preview: PayrollPreview) {
    setError("");
    const cfg = loadStoreBridgeConfig();
    const bridgeOn = isStoreBridgeActive(cfg);
    if (bridgeOn && preview.netAmount > 0.004 && !safeId) {
      setError("اختر خزنة المتجر");
      return;
    }
    setPayingId(preview.employee.id);
    try {
      const paid = payEmployeePayroll({
        employee: preview.employee,
        periodFrom: from,
        periodTo: to,
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
                periodLabel(from, to),
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
      setPayroll(loadPayroll());
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر صرف الراتب");
    } finally {
      setPayingId("");
    }
  }

  async function payAll() {
    for (const row of unpaid) {
      if (row.alreadyPaid) continue;
      await payOne(row);
    }
  }

  async function undoPay(row: Payroll) {
    if (!window.confirm("إلغاء صرف الراتب؟ هيتشال المصروف وترجع السلف.")) return;
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
      <section className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4 lg:grid-cols-4">
        <label className="flex flex-col gap-1.5 text-right">
          <span className="text-xs font-medium text-muted">من</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={FIELD}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-right">
          <span className="text-xs font-medium text-muted">إلى</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={FIELD}
          />
        </label>
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
          {periodLabel(from, to)} · صافي المستحق{" "}
          {formatCurrency(payableTotal)} ج.م
        </p>
        <button
          type="button"
          onClick={() => void payAll()}
          disabled={unpaid.length === 0 || Boolean(payingId)}
          className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          صرف الكل
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
        <ul className="flex flex-col gap-2">
          {rows.map((row) => {
            const paid = row.alreadyPaid;
            return (
              <li
                key={row.employee.id}
                className="rounded-2xl border border-border bg-card px-3.5 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{row.employee.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {row.employee.payType === "daily"
                        ? `${row.daysWorked} يوم حاضر`
                        : "راتب شهري"}
                      {" · أساس "}
                      {formatCurrency(row.baseAmount)}
                      {row.advancesDeducted > 0
                        ? ` · سلف −${formatCurrency(row.advancesDeducted)}`
                        : ""}
                    </p>
                    {row.leftoverAdvances > 0.004 && !paid ? (
                      <p className="mt-0.5 text-[11px] text-[#C47A12]">
                        هيفضل سلف {formatCurrency(row.leftoverAdvances)} ج.م
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-sm font-bold tabular-nums">
                    {formatCurrency(paid?.netAmount ?? row.netAmount)} ج.م
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {paid ? (
                    <button
                      type="button"
                      onClick={() => void undoPay(paid)}
                      className="rounded-xl border border-[#E85A8A]/35 bg-[#E85A8A]/10 px-3 py-1.5 text-[11px] font-bold text-[#E85A8A]"
                    >
                      إلغاء الصرف
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void payOne(row)}
                      disabled={Boolean(payingId)}
                      className="rounded-xl bg-primary px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                    >
                      {payingId === row.employee.id ? "جاري الصرف…" : "صرف"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {periodPayroll.length > 0 ? (
        <p className="px-1 text-[11px] text-muted">
          المصروف يظهر في الحسابات ← مصروفات الورشة (أجور) وسجل الحركة
          {projectId ? " وحساب الشغلانة المختارة" : ""}.
        </p>
      ) : null}
    </div>
  );
}
