"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getAccountingSummary,
  loadExpenses,
  loadPayments,
} from "@/lib/accounting";
import { workshopMoneyTotals } from "@/lib/accounting-scope";
import { mergeCustomers, type Customer } from "@/lib/customers";
import {
  PROJECTS_UPDATED_EVENT,
  type Project,
} from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import { formatCurrency } from "@/lib/utils";
import {
  listAwaitingDeliveryProjects,
  listQueuedProjects,
  listWorkshopProjects,
  WORKFLOW_VISUAL,
} from "@/lib/workshop";
import { WorkflowBadge } from "@/components/workshop/WorkflowBadge";
import { StoreInboxBanner } from "@/components/accounting/StoreInboxBanner";

function customerName(
  map: Map<string, Customer>,
  customerId: string
): string {
  return map.get(customerId)?.name ?? "عميل";
}

export function HomeDashboard() {
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
  const nextUp = queued[0] ?? null;

  const summary = useMemo(() => {
    if (typeof window === "undefined") {
      return { outstanding: 0, collected: 0 };
    }
    const { sales, outstanding } = workshopMoneyTotals();
    const full = getAccountingSummary(
      loadPayments(),
      loadExpenses(),
      sales,
      outstanding
    );
    return { outstanding: full.outstanding, collected: full.collected };
  }, [tick]);

  return (
    <div className="flex flex-col gap-5">
      <StoreInboxBanner />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatTile
          label="قيد التنفيذ"
          value={inWorkshop.length}
          href={ROUTES.workshop}
          color="text-wf-workshop"
        />
        <StatTile
          label="في الانتظار"
          value={queued.length}
          href={ROUTES.workshop}
          color="text-wf-queued"
        />
        <StatTile
          label="جاهز للتسليم"
          value={awaiting.length}
          href={ROUTES.workshop}
          color="text-wf-done"
        />
        <StatTile
          label="باقي عند العملاء"
          valueLabel={`${formatCurrency(summary.outstanding)}`}
          href={ROUTES.accounting.hub}
          color="text-[#E85A8A]"
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href={ROUTES.design.hub}
          className="flex h-14 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-white shadow-[0_6px_18px_rgba(43,125,233,0.28)] transition-all active:scale-[0.98]"
        >
          طلب جديد
        </Link>
        <Link
          href={ROUTES.accounting.newPayment}
          className="flex h-14 items-center justify-center rounded-2xl border border-border bg-card text-sm font-bold text-foreground transition-all active:scale-[0.98]"
        >
          استلام دفعة
        </Link>
      </div>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between px-0.5">
          <h2 className="text-sm font-bold text-foreground">التالي للتنفيذ</h2>
          <Link
            href={ROUTES.workshop}
            className="text-xs font-semibold text-primary"
          >
            الورشة
          </Link>
        </div>
        {nextUp ? (
          <ProjectCard
            project={nextUp}
            customerLabel={customerName(customerById, nextUp.customerId)}
          />
        ) : (
          <EmptyHint>
            مفيش مشاريع في الانتظار — سجّل دفعة من المقايسات.
          </EmptyHint>
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between px-0.5">
          <h2 className="text-sm font-bold text-foreground">جاهز للتسليم</h2>
          <span className="text-xs font-semibold tabular-nums text-muted">
            {awaiting.length}
          </span>
        </div>
        {awaiting.length === 0 ? (
          <EmptyHint>مفيش شغل مستني التسليم.</EmptyHint>
        ) : (
          <ul className="flex flex-col gap-2">
            {awaiting.slice(0, 4).map((project) => (
              <li key={project.id}>
                <ProjectCard
                  project={project}
                  customerLabel={customerName(
                    customerById,
                    project.customerId
                  )}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  valueLabel,
  href,
  color,
}: {
  label: string;
  value?: number;
  valueLabel?: string;
  href: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-border bg-card px-3 py-3 transition-all active:scale-[0.98]"
    >
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${color}`}>
        {valueLabel ?? value}
      </p>
    </Link>
  );
}

function ProjectCard({
  project,
  customerLabel,
}: {
  project: Project;
  customerLabel: string;
}) {
  const visual = WORKFLOW_VISUAL[project.workflow];
  return (
    <Link
      href={ROUTES.design.editor(project.customerId, project.id)}
      className={`flex items-center justify-between gap-3 rounded-2xl border border-s-[3px] bg-card px-3.5 py-3 transition-all active:scale-[0.99] ${visual.rail} border-border`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <WorkflowBadge workflow={project.workflow} />
          <p className="truncate text-sm font-bold text-foreground">
            {project.name}
          </p>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">
          {customerLabel}
          {project.location ? ` · ${project.location}` : ""}
        </p>
      </div>
      <span className="shrink-0 text-muted" aria-hidden>
        ‹
      </span>
    </Link>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted">
      {children}
    </div>
  );
}
