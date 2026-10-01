"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildAccountingReport } from "@/lib/accounting-reports";
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
import { WorkshopSyncBanner } from "@/components/settings/WorkshopSyncBanner";
import { DesktopHomeBoard } from "@/components/home/DesktopHomeBoard";
import {
  AddExpenseIcon,
  NewOrderIcon,
  ReceivePaymentIcon,
} from "@/components/home/HomeIcons";

function customerName(
  map: Map<string, Customer>,
  customerId: string
): string {
  return map.get(customerId)?.name ?? "عميل";
}

export function HomeDashboard() {
  const [tick, setTick] = useState(0);
  // بيانات الحسابات/المشاريع مخزّنة محلياً في المتصفح، فالسيرفر ميقدرش يعرضها.
  // بنسيب أول عرض (سيرفر وعميل) فاضي زي بعضه بالظبط عشان الـ hydration ميتعارضش،
  // وبعد أول تركيب بنملاه بالبيانات الحقيقية.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    function refresh() {
      setTick((n) => n + 1);
    }
    function markMounted() {
      setMounted(true);
    }
    markMounted();
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
    if (mounted) {
      for (const c of mergeCustomers()) map.set(c.id, c);
    }
    return map;
  }, [tick, mounted]);

  const inWorkshop = mounted
    ? listWorkshopProjects({ includeHeld: false })
    : [];
  const queued = mounted ? listQueuedProjects({ includeHeld: false }) : [];
  const awaiting = mounted ? listAwaitingDeliveryProjects() : [];
  const nextUp = queued[0] ?? null;

  // الباقي عند العملاء إجمالي على كل الشغل (مش بس الشهر ده)، وملخص الشهر
  // من نفس التقرير المستخدم في نسخة الكمبيوتر.
  const { outstanding, monthReport } = useMemo(() => {
    if (!mounted) {
      return {
        outstanding: 0,
        monthReport: { collected: 0, expenses: 0, net: 0 },
      };
    }
    return {
      outstanding: workshopMoneyTotals().outstanding,
      monthReport: buildAccountingReport("month"),
    };
  }, [tick, mounted]);

  return (
    <div className="flex flex-col gap-5">
      <StoreInboxBanner />
      <div className="hidden lg:block">
        <WorkshopSyncBanner />
      </div>
      <DesktopHomeBoard />

      <div className="flex flex-col gap-5 lg:hidden">
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-bold text-foreground">حالة الورشة</h2>
            <Link
              href={ROUTES.workshop}
              className="text-xs font-semibold text-primary"
            >
              فتح الورشة
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2 p-3">
            <WorkshopCountPill
              label="تنفيذ"
              value={inWorkshop.length}
              visual={WORKFLOW_VISUAL.workshop}
            />
            <WorkshopCountPill
              label="انتظار"
              value={queued.length}
              visual={WORKFLOW_VISUAL.queued}
            />
            <WorkshopCountPill
              label="تسليم"
              value={awaiting.length}
              visual={WORKFLOW_VISUAL.done}
            />
          </div>
          <div className="px-3 pb-3">
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
          </div>
        </section>

        <div className="grid grid-cols-3 gap-2">
          <Link
            href={ROUTES.design.hub}
            className="flex h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-primary text-xs font-bold text-white shadow-[0_6px_18px_rgba(13,106,107,0.28)] transition-all active:scale-[0.98]"
          >
            <NewOrderIcon className="h-5 w-5" />
            طلب جديد
          </Link>
          <Link
            href={ROUTES.accounting.newPayment}
            className="flex h-16 flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-card text-xs font-bold text-foreground transition-all active:scale-[0.98]"
          >
            <ReceivePaymentIcon className="h-5 w-5" />
            استلام دفعة
          </Link>
          <Link
            href={ROUTES.accounting.newExpense}
            className="flex h-16 flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-card text-xs font-bold text-foreground transition-all active:scale-[0.98]"
          >
            <AddExpenseIcon className="h-5 w-5" />
            تسجيل مصروف
          </Link>
        </div>

        <Link
          href={ROUTES.accounting.receivables}
          className="flex items-center justify-between gap-3 rounded-2xl border border-[#b5543f]/30 bg-[#b5543f]/8 px-4 py-4 transition-colors active:scale-[0.99]"
        >
          <div>
            <p className="text-sm font-bold text-[#b5543f]">باقي عند العملاء</p>
            <p className="mt-0.5 text-[11px] text-muted">
              فلوس على شغل خرج ولسه متسلّمش
            </p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-[#b5543f]">
            {formatCurrency(outstanding)}{" "}
            <span className="text-xs font-semibold text-muted">ج.م</span>
          </p>
        </Link>

        <div className="grid grid-cols-3 gap-2">
          <MonthStat label="محصّل الشهر" value={monthReport.collected} color="text-[#2F9B7A]" />
          <MonthStat label="مصروف الشهر" value={monthReport.expenses} color="text-[#C45C26]" />
          <MonthStat
            label="مكسب الشهر"
            value={monthReport.net}
            color={monthReport.net >= 0 ? "text-[#1F6B55]" : "text-[#b5543f]"}
          />
        </div>

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
    </div>
  );
}

function WorkshopCountPill({
  label,
  value,
  visual,
}: {
  label: string;
  value: number;
  visual: (typeof WORKFLOW_VISUAL)[keyof typeof WORKFLOW_VISUAL];
}) {
  return (
    <div className={`rounded-xl px-2 py-2.5 text-center ${visual.soft}`}>
      <p className={`text-xl font-bold tabular-nums ${visual.text}`}>
        {value}
      </p>
      <p className={`mt-0.5 text-[11px] font-semibold ${visual.text}`}>
        {label}
      </p>
    </div>
  );
}

function MonthStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-2 py-2.5 text-center">
      <p className={`text-sm font-bold tabular-nums ${color}`}>
        {formatCurrency(value)}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-muted">{label}</p>
    </div>
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
