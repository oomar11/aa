"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getAccountingSummary,
  loadExpenses,
  loadPayments,
  type AccountingSummary,
} from "@/lib/accounting";
import {
  isCollectibleRemainingProject,
  workshopMoneyTotals,
} from "@/lib/accounting-scope";
import { mergeCustomers, type Customer } from "@/lib/customers";
import { DEFAULT_COMPANY, loadCompany, type Company } from "@/lib/company";
import { listAllProjects, type Project } from "@/lib/projects";
import {
  compareProjectsByWorkflowThenDate,
  DELIVERY_LABELS,
  WORKFLOW_VISUAL,
} from "@/lib/workshop";
import { getProjectMoneySummary } from "@/lib/project-money";
import { ROUTES } from "@/lib/routes";
import { ensureStoreBridgeBootstrapped } from "@/lib/store-bridge-bootstrap";
import { formatCurrency } from "@/lib/utils";
import { WorkflowBadge } from "@/components/workshop/WorkflowBadge";
import { StoreInboxBanner } from "@/components/accounting/StoreInboxBanner";
import { WorkshopSyncBanner } from "@/components/settings/WorkshopSyncBanner";

const links = [
  {
    href: ROUTES.accounting.receivables,
    title: "فلوس لِيا برا",
    description: "عليه فلوس · اتسلّم · الشغل اتسلّم ولا لأ",
    accent: "bg-[#E85A8A]",
  },
  {
    href: ROUTES.accounting.activity,
    title: "المتابعات",
    description: "دا قال إيه · دا عمل إيه · وعود الدفع",
    accent: "bg-[#4A7C9B]",
  },
  {
    href: ROUTES.accounting.reports,
    title: "تقارير الربح",
    description: "بتكسب ولا لأ — من الشغل اللي اتسلّم",
    accent: "bg-[#C47A12]",
  },
  {
    href: ROUTES.accounting.storeInbox,
    title: "فواتير المحل",
    description: "تعيين فواتير المحل على شغلانات الورشة",
    accent: "bg-[#6B5B95]",
  },
  {
    href: ROUTES.accounting.payments,
    title: "الدفعات",
    description: "كل ما استلمته من العملاء",
    accent: "bg-primary",
  },
  {
    href: ROUTES.accounting.expenses,
    title: "مصروفات الورشة",
    description: "نقدي من الخزنة أو آجل على مورد + إضافة مورد سريع",
    accent: "bg-[#E8956F]",
  },
  {
    href: ROUTES.hr.hub,
    title: "رواتب الموظفين",
    description: "حضور · سلف · صرف أجور يظهر في المصروفات والخزنة",
    accent: "bg-[#5B6ABF]",
  },
  {
    href: ROUTES.accounting.newSupply,
    title: "توريد خارجي",
    description: "شراء ببنود متعددة على مورد المحل (نقدي أو آجل)",
    accent: "bg-[#8B5E3C]",
  },
  {
    href: ROUTES.accounting.ledger,
    title: "سجل الحركة",
    description: "دخول وخروج الفلوس بالترتيب",
    accent: "bg-[#2F9B7A]",
  },
] as const;

type ProjectMoneyRow = {
  project: Project;
  customerName: string;
  sale: number;
  paid: number;
  remaining: number;
  expenses: number;
};

function readSummary(): AccountingSummary {
  if (typeof window === "undefined") {
    return { sales: 0, collected: 0, outstanding: 0, expenses: 0, net: 0 };
  }
  const { sales, outstanding } = workshopMoneyTotals();
  return getAccountingSummary(
    loadPayments(),
    loadExpenses(),
    sales,
    outstanding
  );
}

function readCompany(): Company {
  if (typeof window === "undefined") return DEFAULT_COMPANY;
  return loadCompany();
}

function readProjectRows(): ProjectMoneyRow[] {
  if (typeof window === "undefined") return [];
  const customerById = new Map<string, Customer>();
  for (const c of mergeCustomers()) customerById.set(c.id, c);

  return listAllProjects()
    .filter(isCollectibleRemainingProject)
    .map((project) => {
      const money = getProjectMoneySummary(project.id);
      return {
        project,
        customerName: customerById.get(project.customerId)?.name ?? "عميل",
        sale: money.sale,
        paid: money.paid,
        remaining: money.remaining,
        expenses: money.expenses,
      };
    })
    .sort((a, b) => {
      if (b.remaining !== a.remaining) return b.remaining - a.remaining;
      return compareProjectsByWorkflowThenDate(a.project, b.project);
    });
}

export function AccountingHub() {
  const [company, setCompany] = useState(readCompany);
  const [summary, setSummary] = useState(readSummary);
  const [projectRows, setProjectRows] = useState(readProjectRows);

  useEffect(() => {
    function refresh() {
      setCompany(loadCompany());
      setSummary(readSummary());
      setProjectRows(readProjectRows());
    }
    window.addEventListener("upvc-accounting-updated", refresh);
    window.addEventListener("upvc-company-updated", refresh);
    window.addEventListener("upvc-projects-updated", refresh);
    window.addEventListener("upvc-customers-updated", refresh);
    return () => {
      window.removeEventListener("upvc-accounting-updated", refresh);
      window.removeEventListener("upvc-company-updated", refresh);
      window.removeEventListener("upvc-projects-updated", refresh);
      window.removeEventListener("upvc-customers-updated", refresh);
    };
  }, []);

  useEffect(() => {
    void ensureStoreBridgeBootstrapped();
  }, []);

  const openRemaining = useMemo(
    () => projectRows.filter((row) => row.remaining > 0).slice(0, 12),
    [projectRows]
  );

  return (
    <div className="flex flex-col gap-5">
      <StoreInboxBanner />
      <WorkshopSyncBanner />

      <section className="rounded-2xl bg-[#1F6B55] px-4 py-5 text-white shadow-[0_8px_24px_rgba(47,155,122,0.28)]">
        <p className="text-xs font-medium opacity-85">الحسابات</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {company.name}
        </h1>
        <div className="mt-4">
          <Link
            href={ROUTES.accounting.newPayment}
            className="flex h-12 items-center justify-center rounded-xl bg-white text-sm font-bold text-[#1F6B55] transition-all hover:brightness-105 active:scale-[0.98]"
          >
            استلام دفعة
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5">
        <SummaryTile label="إجمالي الحسابات" value={summary.sales} tone="neutral" />
        <SummaryTile label="المحصّل" value={summary.collected} tone="good" />
        <SummaryTile
          label="الباقي عند العملاء"
          value={summary.outstanding}
          tone="warn"
        />
        <SummaryTile
          label="مصروفات الورشة"
          value={summary.expenses}
          tone="expense"
        />
        <SummaryTile
          label="المحصّل ناقص المصروف"
          value={summary.net}
          tone={summary.net >= 0 ? "good" : "warn"}
          wide
        />
      </section>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-2 px-0.5">
          <h2 className="text-sm font-bold text-foreground">
            شغل مكتمل عليه باقي
          </h2>
          <Link
            href={ROUTES.accounting.receivables}
            className="text-xs font-bold text-primary"
          >
            كل الفلوس البرا
          </Link>
        </div>
        {openRemaining.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted">
            مفيش شغل مكتمل عليه باقي حالياً
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {openRemaining.map((row) => {
              const visual = WORKFLOW_VISUAL[row.project.workflow];
              const delivery = row.project.deliveryStatus;
              return (
                <li key={row.project.id}>
                  <Link
                    href={ROUTES.design.account(
                      row.project.customerId,
                      row.project.id
                    )}
                    className={`flex items-center justify-between gap-3 rounded-2xl border border-s-[3px] bg-card px-3.5 py-3 transition-all active:scale-[0.99] ${visual.rail} border-border`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <WorkflowBadge workflow={row.project.workflow} />
                        <p className="truncate text-sm font-bold text-foreground">
                          {row.project.name}
                        </p>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {row.customerName}
                        {" · حساب "}
                        {formatCurrency(row.sale)}
                        {" · مدفوع "}
                        {formatCurrency(row.paid)}
                        {delivery
                          ? ` · ${DELIVERY_LABELS[delivery]}`
                          : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-end">
                      <p className="text-[10px] text-muted">باقي</p>
                      <p className="text-sm font-bold tabular-nums text-[#E85A8A]">
                        {formatCurrency(row.remaining)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/30 active:scale-[0.99]"
          >
            <span
              className={`h-10 w-1.5 shrink-0 rounded-full ${link.accent}`}
              aria-hidden
            />
            <div className="min-w-0 flex-1 text-right">
              <p className="text-sm font-bold text-foreground">{link.title}</p>
              <p className="mt-0.5 text-xs text-muted">{link.description}</p>
            </div>
            <span className="text-muted" aria-hidden>
              ‹
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
  wide,
}: {
  label: string;
  value: number;
  tone: "good" | "warn" | "neutral" | "expense";
  wide?: boolean;
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
    <div
      className={`rounded-2xl border border-border bg-card px-3.5 py-3 ${
        wide ? "col-span-2" : ""
      }`}
    >
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`mt-1 text-base font-bold tabular-nums ${toneClass}`}>
        {formatCurrency(value)} ج.م
      </p>
    </div>
  );
}
