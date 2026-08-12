"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  PAYMENT_METHOD_LABELS,
  type Expense,
  type Payment,
} from "@/lib/accounting";
import { getCustomerById } from "@/lib/customers";
import {
  getProjectMoneySummary,
  listProjectExpenses,
  listProjectPayments,
  type ProjectMoneySummary,
} from "@/lib/project-money";
import { getProjectById } from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import { isAccountedProject } from "@/lib/accounting-scope";
import {
  ensureCustomerLinkedToStore,
  hasStoreBridgeCredentials,
  loadStoreBridgeConfig,
  syncProjectSaleToStore,
} from "@/lib/store-bridge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { WORKFLOW_LABELS, WORKFLOW_VISUAL } from "@/lib/workshop";
import { WorkflowBadge } from "@/components/workshop/WorkflowBadge";
import { ActivityNotesPanel } from "@/components/accounting/ActivityNotesPanel";

type Props = {
  customerId: string;
  projectId: string;
  /** داخل مساحة المشروع — بدون روابط رجوع مكررة */
  embedded?: boolean;
  /** فتح تبويب المصروفات — مع مصروف محدد للتعديل إن وُجد */
  onOpenExpenses?: (expenseId?: string) => void;
};

/**
 * حساب المشروع في مكان واحد:
 * حساب · مدفوع · باقي · مصروف + سجل الدفعات والمصروفات (قابل للتعديل).
 */
export function ProjectAccount({
  customerId,
  projectId,
  embedded = false,
  onOpenExpenses,
}: Props) {
  const [money, setMoney] = useState<ProjectMoneySummary | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    function refresh() {
      setTick((n) => n + 1);
    }
    window.addEventListener("upvc-accounting-updated", refresh);
    window.addEventListener("upvc-projects-updated", refresh);
    return () => {
      window.removeEventListener("upvc-accounting-updated", refresh);
      window.removeEventListener("upvc-projects-updated", refresh);
    };
  }, []);

  useEffect(() => {
    setMoney(getProjectMoneySummary(projectId));
    setPayments(listProjectPayments(projectId));
    setExpenses(listProjectExpenses(projectId));
  }, [projectId, tick]);

  const project = getProjectById(projectId);
  const customer = getCustomerById(customerId);

  // مرآة البيع على حساب العميل في المحل فقط بعد عربون/دخول الحساب.
  // المقايسات الخام تُلغى من كشف العميل لو اتسجّلت بالغلط قبل كده.
  useEffect(() => {
    if (!money) return;
    const liveCustomer = getCustomerById(customerId);
    const liveProject = getProjectById(projectId);
    if (!liveCustomer || !liveProject) return;
    const cfg = loadStoreBridgeConfig();
    if (!hasStoreBridgeCredentials(cfg) || !cfg) return;
    const accounted = isAccountedProject(liveProject);
    let cancelled = false;
    void (async () => {
      try {
        const storeCustomerId = await ensureCustomerLinkedToStore(
          liveCustomer,
          cfg
        );
        if (cancelled || !storeCustomerId) return;
        await syncProjectSaleToStore(
          {
            storeCustomerId,
            projectId: liveProject.id,
            projectName: liveProject.name,
            saleAmount: accounted ? money.sale : 0,
            includeInCustomerLedger: accounted,
            localPartyId: liveCustomer.id,
          },
          cfg
        );
      } catch {
        /* silent — الربط اختياري وقت العرض */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, projectId, money, project?.workflow]);
  const visual = project ? WORKFLOW_VISUAL[project.workflow] : null;
  const profit = money != null ? money.paid - money.expenses : 0;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-muted">حساب المشروع</p>
            <h2 className="mt-0.5 truncate text-lg font-bold text-foreground">
              {project?.name ?? "مشروع"}
            </h2>
            <p className="mt-0.5 truncate text-xs text-muted">
              {customer?.name ?? "عميل"}
              {project?.location ? ` · ${project.location}` : ""}
            </p>
          </div>
          {project ? <WorkflowBadge workflow={project.workflow} /> : null}
        </div>
        {visual ? (
          <p className={`mt-2 text-[11px] font-semibold ${visual.text}`}>
            {WORKFLOW_LABELS[project!.workflow]}
          </p>
        ) : null}
      </section>

      {money ? (
        <section className="grid grid-cols-2 gap-2">
          <MoneyTile label="الحساب" value={money.sale} tone="neutral" />
          <MoneyTile label="مدفوع" value={money.paid} tone="good" />
          <MoneyTile
            label="باقي"
            value={money.remaining}
            tone={money.remaining > 0 ? "warn" : "good"}
          />
          <MoneyTile label="مصروف" value={money.expenses} tone="expense" />
        </section>
      ) : null}

      {money ? (
        <section className="rounded-2xl border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted">المحصّل ناقص المصروف</p>
            <p
              className={`text-sm font-bold tabular-nums ${
                profit >= 0 ? "text-[#2F9B7A]" : "text-[#E85A8A]"
              }`}
            >
              {formatCurrency(profit)} ج.م
            </p>
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-2">
        <Link
          href={ROUTES.accounting.depositForProject(customerId, projectId)}
          className="flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          استلام دفعة
        </Link>
        {onOpenExpenses ? (
          <button
            type="button"
            onClick={() => onOpenExpenses()}
            className="flex h-11 items-center justify-center rounded-xl border border-[#C45C26]/35 bg-[#C45C26]/10 text-sm font-bold text-[#C45C26] transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            تسجيل مصروف
          </button>
        ) : (
          <Link
            href={ROUTES.design.expenses(customerId, projectId)}
            className="flex h-11 items-center justify-center rounded-xl border border-[#C45C26]/35 bg-[#C45C26]/10 text-sm font-bold text-[#C45C26] transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            تسجيل مصروف
          </Link>
        )}
      </section>

      <LedgerSection
        title="الدفعات"
        count={payments.length}
        empty="لا توجد دفعات على هذا المشروع بعد"
        hint={payments.length > 0 ? "اضغط للتعديل" : undefined}
        actionHref={ROUTES.accounting.depositForProject(customerId, projectId)}
        actionLabel="دفعة جديدة"
      >
        {payments.map((payment) => (
          <li key={payment.id}>
            <Link
              href={ROUTES.accounting.editPayment(payment.id)}
              className="flex w-full items-center justify-between gap-3 rounded-xl bg-background/60 px-3 py-2.5 text-right transition-all hover:bg-primary/5 active:scale-[0.99]"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold tabular-nums text-[#2F9B7A]">
                  {formatCurrency(payment.amount)} ج.م
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted">
                  {formatDate(payment.date)}
                  {" · "}
                  {PAYMENT_METHOD_LABELS[payment.method]}
                  {payment.note ? ` · ${payment.note}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-primary">
                تعديل
              </span>
            </Link>
          </li>
        ))}
      </LedgerSection>

      <LedgerSection
        title="المصروفات"
        count={expenses.length}
        empty="لا توجد مصروفات مسجّلة"
        hint={expenses.length > 0 ? "اضغط للتعديل" : undefined}
        actionHref={
          onOpenExpenses
            ? undefined
            : ROUTES.design.expenses(customerId, projectId)
        }
        actionLabel="مصروف جديد"
        onAction={onOpenExpenses ? () => onOpenExpenses() : undefined}
      >
        {expenses.map((expense) => {
          const expensesHref = ROUTES.design.expenses(customerId, projectId);
          const rowClass =
            "flex w-full items-center justify-between gap-3 rounded-xl bg-background/60 px-3 py-2.5 text-right transition-all hover:bg-[#E8956F]/10 active:scale-[0.99]";
          const body = (
            <>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {expense.description}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted">
                  {expense.category}
                  {" · "}
                  {formatDate(expense.date)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <p className="text-sm font-bold tabular-nums text-[#C45C26]">
                  {formatCurrency(expense.amount)}
                </p>
                <span className="text-[11px] font-semibold text-[#C45C26]">
                  تعديل
                </span>
              </div>
            </>
          );

          return (
            <li key={expense.id}>
              {onOpenExpenses ? (
                <button
                  type="button"
                  onClick={() => onOpenExpenses(expense.id)}
                  className={rowClass}
                >
                  {body}
                </button>
              ) : (
                <Link href={expensesHref} className={rowClass}>
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </LedgerSection>

      <ActivityNotesPanel
        customerId={customerId}
        projectId={projectId}
        title="المتابعة — قال / عمل"
      />

      {!embedded ? (
        <Link
          href={ROUTES.design.editor(customerId, projectId)}
          className="rounded-xl border border-dashed border-border py-3 text-center text-sm font-semibold text-muted"
        >
          الرجوع لبنود المشروع
        </Link>
      ) : null}
    </div>
  );
}

function MoneyTile({
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
    <div className="rounded-2xl border border-border bg-card px-3.5 py-3 text-center">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`mt-1 text-base font-bold tabular-nums ${toneClass}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function LedgerSection({
  title,
  count,
  empty,
  hint,
  actionHref,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  hint?: string;
  actionHref?: string;
  actionLabel: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground">
            {title}
            <span className="ms-1.5 text-xs font-semibold text-muted tabular-nums">
              {count}
            </span>
          </h3>
          {hint ? (
            <p className="mt-0.5 text-[10px] text-muted">{hint}</p>
          ) : null}
        </div>
        {onAction ? (
          <button
            type="button"
            onClick={() => onAction()}
            className="text-[11px] font-bold text-primary"
          >
            {actionLabel}
          </button>
        ) : actionHref ? (
          <Link href={actionHref} className="text-[11px] font-bold text-primary">
            {actionLabel}
          </Link>
        ) : null}
      </div>
      {count === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted">
          {empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">{children}</ul>
      )}
    </section>
  );
}
