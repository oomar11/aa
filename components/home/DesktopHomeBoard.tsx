"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isAccountedProject } from "@/lib/accounting-scope";
import { buildAccountingReport, startOfPeriod } from "@/lib/accounting-reports";
import { loadExpenses, todayIsoDate } from "@/lib/accounting";
import { mergeCustomers, type Customer } from "@/lib/customers";
import { getProjectMoneySummary } from "@/lib/project-money";
import {
  listAllProjects,
  PROJECTS_UPDATED_EVENT,
  type Project,
} from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  compareProjectsByWorkflowThenDate,
  listAwaitingDeliveryProjects,
  listQueuedProjects,
  listWorkshopProjects,
  WORKFLOW_VISUAL,
} from "@/lib/workshop";
import { WorkflowBadge } from "@/components/workshop/WorkflowBadge";

function customerName(map: Map<string, Customer>, customerId: string): string {
  return map.get(customerId)?.name ?? "عميل";
}

/**
 * لوحة متابعة الكمبيوتر: ورشة اليوم + فلوس الشهر + المشاريع النشطة.
 */
export function DesktopHomeBoard() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    function refresh() {
      setTick((n) => n + 1);
    }
    window.addEventListener(PROJECTS_UPDATED_EVENT, refresh);
    window.addEventListener("upvc-accounting-updated", refresh);
    window.addEventListener("upvc-customers-updated", refresh);
    return () => {
      window.removeEventListener(PROJECTS_UPDATED_EVENT, refresh);
      window.removeEventListener("upvc-accounting-updated", refresh);
      window.removeEventListener("upvc-customers-updated", refresh);
    };
  }, []);

  void tick;

  const customerById = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const c of mergeCustomers()) map.set(c.id, c);
    return map;
  }, [tick]);

  const inWorkshop = listWorkshopProjects({ includeHeld: false });
  const queued = listQueuedProjects({ includeHeld: false });
  const awaiting = listAwaitingDeliveryProjects();
  const nextUpId = queued[0]?.id ?? null;

  const monthReport =
    typeof window === "undefined"
      ? { collected: 0, outstanding: 0, net: 0, expenses: 0 }
      : buildAccountingReport("month");

  // مصروف الشهر على الرئيسية = كل المصروفات بتاريخ الشهر
  // (مش بس شغل متسلّم) عشان فواتير الموبايل تظهر فوراً على الكمبيوتر
  const monthExpenseTotal =
    typeof window === "undefined"
      ? 0
      : (() => {
          const from = startOfPeriod("month");
          const to = todayIsoDate();
          return loadExpenses()
            .filter((e) => (!from || e.date >= from) && e.date <= to)
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        })();

  const todayLabel =
    typeof window === "undefined" ? "" : formatDate(todayIsoDate());

  const activeProjects =
    typeof window === "undefined"
      ? []
      : listAllProjects()
          .filter(isAccountedProject)
          .sort(compareProjectsByWorkflowThenDate)
          .slice(0, 20)
          .map((project) => {
            const money = getProjectMoneySummary(project.id);
            return { project, money };
          });

  return (
    <div className="hidden flex-col gap-6 lg:flex">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الرئيسية</h1>
          {todayLabel ? (
            <p className="mt-1 text-sm text-muted">{todayLabel}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={ROUTES.design.hub}
            className="flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white"
          >
            طلب جديد
          </Link>
          <Link
            href={ROUTES.accounting.newPayment}
            className="flex h-10 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground"
          >
            استلام دفعة
          </Link>
          <Link
            href={ROUTES.accounting.newExpense}
            className="flex h-10 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground"
          >
            تسجيل مصروف
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-4 gap-3">
        <KpiTile
          label="باقي عند العملاء"
          value={formatCurrency(monthReport.outstanding)}
          href={ROUTES.accounting.receivables}
          color="text-[#E85A8A]"
        />
        <KpiTile
          label="محصّل الشهر"
          value={formatCurrency(monthReport.collected)}
          href={ROUTES.accounting.payments}
          color="text-[#2F9B7A]"
        />
        <KpiTile
          label="مصروف الشهر"
          value={formatCurrency(monthExpenseTotal)}
          href={ROUTES.accounting.expenses}
          color="text-[#C45C26]"
        />
        <KpiTile
          label="مكسب الشهر"
          value={formatCurrency(monthReport.collected - monthExpenseTotal)}
          href={ROUTES.accounting.reports}
          color={
            monthReport.collected - monthExpenseTotal >= 0
              ? "text-[#1F6B55]"
              : "text-[#E85A8A]"
          }
        />
      </section>

      <section className="grid grid-cols-3 gap-3">
        <WorkshopColumn
          title="قيد التنفيذ"
          href={ROUTES.workshop}
          count={inWorkshop.length}
          empty="مفيش شغل قيد التنفيذ"
          projects={inWorkshop}
          customerById={customerById}
        />
        <WorkshopColumn
          title="في الانتظار"
          href={ROUTES.workshop}
          count={queued.length}
          empty="قائمة الانتظار فارغة"
          projects={queued}
          customerById={customerById}
          nextUpId={nextUpId}
        />
        <WorkshopColumn
          title="جاهز للتسليم"
          href={ROUTES.workshop}
          count={awaiting.length}
          empty="مفيش شغل مستني التسليم"
          projects={awaiting}
          customerById={customerById}
        />
      </section>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-bold text-foreground">المشاريع النشطة</h2>
            <Link
              href={ROUTES.orders}
              className="text-xs font-semibold text-primary"
            >
              كل الطلبات
            </Link>
          </div>
          {activeProjects.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">
              مفيش شغل دخل الحساب بعد — سجّل دفعة من المقايسات.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-start text-sm">
                <thead className="bg-background text-[11px] text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">المشروع</th>
                    <th className="px-3 py-2.5 font-semibold">العميل</th>
                    <th className="px-3 py-2.5 font-semibold">الحالة</th>
                    <th className="px-3 py-2.5 text-end font-semibold">البيع</th>
                    <th className="px-3 py-2.5 text-end font-semibold">مدفوع</th>
                    <th className="px-3 py-2.5 text-end font-semibold">مصروف</th>
                    <th className="px-4 py-2.5 text-end font-semibold">باقي</th>
                  </tr>
                </thead>
                <tbody>
                  {activeProjects.map(({ project, money }) => (
                    <tr
                      key={project.id}
                      className="border-t border-border hover:bg-primary-soft/40"
                    >
                      <td className="px-4 py-2.5">
                        <Link
                          href={ROUTES.design.editor(
                            project.customerId,
                            project.id
                          )}
                          className="font-bold text-foreground"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-muted">
                        {customerName(customerById, project.customerId)}
                      </td>
                      <td className="px-3 py-2.5">
                        <WorkflowBadge
                          workflow={project.workflow}
                          project={project}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums">
                        {formatCurrency(money.sale)}
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums text-[#2F9B7A]">
                        {formatCurrency(money.paid)}
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums text-[#C45C26]">
                        {formatCurrency(money.expenses)}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-end tabular-nums font-semibold ${
                          money.remaining > 0
                            ? "text-[#E85A8A]"
                            : "text-[#2F9B7A]"
                        }`}
                      >
                        {formatCurrency(money.remaining)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-3">
          <Link
            href={ROUTES.accounting.reports}
            className="rounded-2xl border border-border bg-card px-5 py-5 transition-colors hover:bg-primary-soft/30"
          >
            <p className="text-xs font-medium text-muted">مكسب هذا الشهر</p>
            <p
              className={`mt-2 text-3xl font-bold tabular-nums tracking-tight ${
                monthReport.net >= 0 ? "text-[#1F6B55]" : "text-[#E85A8A]"
              }`}
            >
              {formatCurrency(monthReport.net)}{" "}
              <span className="text-base font-semibold text-muted">ج.م</span>
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              من الشغل المتسلّم هذا الشهر · محصّل{" "}
              {formatCurrency(monthReport.collected)} ج.م − مصروف{" "}
              {formatCurrency(monthReport.expenses)} ج.م
            </p>
            <p className="mt-4 text-sm font-bold text-primary">فتح تقارير الربح</p>
          </Link>

          <nav className="overflow-hidden rounded-2xl border border-border bg-card">
            <p className="border-b border-border px-4 py-2.5 text-xs font-bold text-muted">
              اختصارات
            </p>
            <ul className="flex flex-col">
              <ShortcutLink href={ROUTES.accounting.receivables}>
                فلوس لِيا برا
              </ShortcutLink>
              <ShortcutLink href={ROUTES.accounting.expenses}>
                المصروفات
              </ShortcutLink>
              <ShortcutLink href={ROUTES.accounting.reports}>
                تقارير الربح
              </ShortcutLink>
              <ShortcutLink href={ROUTES.hr.hub}>
                الموظفين والرواتب
              </ShortcutLink>
              <ShortcutLink href={ROUTES.accounting.storeInbox} last>
                فواتير المحل
              </ShortcutLink>
            </ul>
          </nav>
        </aside>
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  href,
  color,
}: {
  label: string;
  href: string;
  value: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-border bg-card px-5 py-4 transition-colors hover:bg-primary-soft/40"
    >
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums xl:text-3xl ${color}`}>
        {value}
        <span className="mr-1 text-sm font-semibold text-muted">ج.م</span>
      </p>
    </Link>
  );
}

function ShortcutLink({
  href,
  children,
  last = false,
}: {
  href: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <li className={last ? "" : "border-b border-border"}>
      <Link
        href={href}
        className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-primary-soft/40"
      >
        {children}
        <span className="text-muted" aria-hidden>
          ‹
        </span>
      </Link>
    </li>
  );
}

function WorkshopColumn({
  title,
  href,
  count,
  empty,
  projects,
  customerById,
  nextUpId,
}: {
  title: string;
  href: string;
  count: number;
  empty: string;
  projects: Project[];
  customerById: Map<string, Customer>;
  nextUpId?: string | null;
}) {
  return (
    <section className="flex min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        <Link href={href} className="text-xs font-semibold text-primary">
          فتح الورشة · {count}
        </Link>
      </div>
      {projects.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2 p-3">
          {projects.slice(0, 8).map((project) => {
            const visual = WORKFLOW_VISUAL[project.workflow];
            const remaining = getProjectMoneySummary(project.id).remaining;
            const isNext = project.id === nextUpId;
            return (
              <li key={project.id}>
                <Link
                  href={ROUTES.design.editor(project.customerId, project.id)}
                  className={`block rounded-xl border border-s-[3px] px-3 py-2.5 transition-colors hover:bg-primary-soft/40 ${visual.rail} ${
                    isNext
                      ? "border-primary bg-primary-soft/50"
                      : "border-border bg-background"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-bold text-foreground">
                      {project.name}
                    </p>
                    {isNext ? (
                      <span className="shrink-0 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                        التالي
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-muted">
                    {customerName(customerById, project.customerId)}
                  </p>
                  <p
                    className={`mt-1.5 text-[12px] font-semibold tabular-nums ${
                      remaining > 0 ? "text-[#E85A8A]" : "text-[#2F9B7A]"
                    }`}
                  >
                    باقي {formatCurrency(remaining)} ج.م
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
