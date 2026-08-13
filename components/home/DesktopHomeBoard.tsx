"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isAccountedProject } from "@/lib/accounting-scope";
import { buildAccountingReport } from "@/lib/accounting-reports";
import { mergeCustomers, type Customer } from "@/lib/customers";
import { getProjectMoneySummary } from "@/lib/project-money";
import {
  listAllProjects,
  PROJECTS_UPDATED_EVENT,
  type Project,
} from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import { formatCurrency } from "@/lib/utils";
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
 * لوحة متابعة الكمبيوتر: ورشة + فلوس + مشاريع + مكسب الشهر.
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

  const customerById = (() => {
    const map = new Map<string, Customer>();
    for (const c of mergeCustomers()) map.set(c.id, c);
    return map;
  })();

  const inWorkshop = listWorkshopProjects({ includeHeld: false });
  const queued = listQueuedProjects({ includeHeld: false });
  const awaiting = listAwaitingDeliveryProjects();

  const monthReport =
    typeof window === "undefined"
      ? { collected: 0, outstanding: 0, net: 0, expenses: 0 }
      : buildAccountingReport("month");

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
    <div className="hidden flex-col gap-5 lg:flex">
      <div className="grid grid-cols-3 gap-2.5 xl:grid-cols-6">
        <KpiTile
          label="قيد التنفيذ"
          value={String(inWorkshop.length)}
          href={ROUTES.workshop}
          color="text-wf-workshop"
        />
        <KpiTile
          label="في الانتظار"
          value={String(queued.length)}
          href={ROUTES.workshop}
          color="text-wf-queued"
        />
        <KpiTile
          label="جاهز للتسليم"
          value={String(awaiting.length)}
          href={ROUTES.workshop}
          color="text-wf-done"
        />
        <KpiTile
          label="باقي عند العملاء"
          value={`${formatCurrency(monthReport.outstanding)}`}
          href={ROUTES.accounting.receivables}
          color="text-[#E85A8A]"
        />
        <KpiTile
          label="محصّل الشهر"
          value={`${formatCurrency(monthReport.collected)}`}
          href={ROUTES.accounting.payments}
          color="text-[#2F9B7A]"
        />
        <KpiTile
          label="مكسب الشهر"
          value={`${formatCurrency(monthReport.net)}`}
          href={ROUTES.accounting.reports}
          color={monthReport.net >= 0 ? "text-[#1F6B55]" : "text-[#E85A8A]"}
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href={ROUTES.design.hub}
          className="flex h-12 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-white shadow-[0_6px_18px_rgba(43,125,233,0.28)]"
        >
          طلب جديد
        </Link>
        <Link
          href={ROUTES.accounting.newPayment}
          className="flex h-12 items-center justify-center rounded-2xl border border-border bg-card text-sm font-bold text-foreground"
        >
          استلام دفعة
        </Link>
      </div>

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

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
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
            <p className="px-4 py-8 text-center text-sm text-muted">
              مفيش شغل دخل الحساب بعد — سجّل دفعة من المقايسات.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-start text-sm">
                <thead className="bg-background text-[11px] text-muted">
                  <tr>
                    <th className="px-4 py-2 font-semibold">المشروع</th>
                    <th className="px-3 py-2 font-semibold">العميل</th>
                    <th className="px-3 py-2 font-semibold">الحالة</th>
                    <th className="px-3 py-2 text-end font-semibold">البيع</th>
                    <th className="px-3 py-2 text-end font-semibold">مدفوع</th>
                    <th className="px-4 py-2 text-end font-semibold">باقي</th>
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

        <Link
          href={ROUTES.accounting.reports}
          className="flex flex-col justify-between rounded-2xl bg-[#1F6B55] px-5 py-5 text-white shadow-[0_8px_24px_rgba(47,155,122,0.28)]"
        >
          <div>
            <p className="text-xs font-medium opacity-85">
              {monthReport.net >= 0 ? "بتكسب هذا الشهر" : "خسارة هذا الشهر"}
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">
              {formatCurrency(monthReport.net)} ج.م
            </p>
            <p className="mt-2 text-xs opacity-80">
              محصّل {formatCurrency(monthReport.collected)} − مصروف{" "}
              {formatCurrency(monthReport.expenses)}
            </p>
          </div>
          <p className="mt-6 text-sm font-bold">فتح تقارير الربح ‹</p>
        </Link>
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
  value: string;
  href: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-border bg-card px-3 py-3 transition-colors hover:bg-primary-soft/40"
    >
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${color}`}>{value}</p>
    </Link>
  );
}

function WorkshopColumn({
  title,
  href,
  count,
  empty,
  projects,
  customerById,
}: {
  title: string;
  href: string;
  count: number;
  empty: string;
  projects: Project[];
  customerById: Map<string, Customer>;
}) {
  return (
    <section className="flex min-h-[14rem] flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-baseline justify-between border-b border-border px-3 py-2.5">
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        <Link href={href} className="text-xs font-semibold tabular-nums text-primary">
          {count}
        </Link>
      </div>
      {projects.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5 p-2">
          {projects.slice(0, 8).map((project) => {
            const visual = WORKFLOW_VISUAL[project.workflow];
            return (
              <li key={project.id}>
                <Link
                  href={ROUTES.design.editor(project.customerId, project.id)}
                  className={`block rounded-xl border border-s-[3px] border-border bg-background px-2.5 py-2 hover:bg-primary-soft/40 ${visual.rail}`}
                >
                  <p className="truncate text-xs font-bold text-foreground">
                    {project.name}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-muted">
                    {customerName(customerById, project.customerId)}
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
