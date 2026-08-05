import {
  loadExpenses,
  loadPayments,
  type Expense,
  type Payment,
} from "@/lib/accounting";
import { isAccountedProject } from "@/lib/accounting-scope";
import { mergeCustomers } from "@/lib/customers";
import { getProjectMoneySummary } from "@/lib/project-money";
import { listAllProjects, type Project } from "@/lib/projects";

export type ReportPeriod = "all" | "month" | "quarter" | "year";

export type ProjectProfitRow = {
  projectId: string;
  customerId: string;
  projectName: string;
  customerName: string;
  sale: number;
  paid: number;
  remaining: number;
  expenses: number;
  /** ربح تقديري = محصّل − مصروف */
  profit: number;
  workflow: Project["workflow"];
};

export type AccountingReport = {
  period: ReportPeriod;
  /** بداية الفترة (ISO تاريخ) إن وُجدت */
  fromDate: string | null;
  toDate: string;
  /** بيع المشاريع غير المقايسة */
  sales: number;
  /** دفعات ضمن الفترة */
  collected: number;
  /** مصروفات ضمن الفترة */
  expenses: number;
  /** المحصّل − المصروف */
  net: number;
  /** باقي عند العملاء (شغل عليه حساب) */
  outstanding: number;
  projectRows: ProjectProfitRow[];
  paymentCount: number;
  expenseCount: number;
};

function startOfPeriod(period: ReportPeriod, now = new Date()): string | null {
  if (period === "all") return null;
  const y = now.getFullYear();
  const m = now.getMonth();
  if (period === "month") {
    return new Date(y, m, 1).toISOString().slice(0, 10);
  }
  if (period === "quarter") {
    const qStart = Math.floor(m / 3) * 3;
    return new Date(y, qStart, 1).toISOString().slice(0, 10);
  }
  return new Date(y, 0, 1).toISOString().slice(0, 10);
}

function inPeriod(isoDate: string, from: string | null, to: string): boolean {
  if (from && isoDate < from) return false;
  return isoDate <= to;
}

export const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
  all: "كل الوقت",
  month: "هذا الشهر",
  quarter: "هذا الربع",
  year: "هذه السنة",
};

/**
 * تقرير ربحية: هل الورشة بتكسب؟
 * المحصّل والمصروف يُفلتران بالتاريخ؛ البيع والباقي من حالة المشاريع الحالية.
 */
export function buildAccountingReport(
  period: ReportPeriod = "month",
  payments: Payment[] = loadPayments(),
  expenses: Expense[] = loadExpenses(),
  projects: Project[] = listAllProjects()
): AccountingReport {
  const toDate = new Date().toISOString().slice(0, 10);
  const fromDate = startOfPeriod(period);
  const customers = mergeCustomers();
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const periodPayments = payments.filter((p) =>
    inPeriod(p.date, fromDate, toDate)
  );
  const periodExpenses = expenses.filter((e) =>
    inPeriod(e.date, fromDate, toDate)
  );

  const collected = periodPayments.reduce((s, p) => s + p.amount, 0);
  const expenseTotal = periodExpenses.reduce((s, e) => s + e.amount, 0);

  let sales = 0;
  let outstanding = 0;
  const projectRows: ProjectProfitRow[] = [];

  for (const project of projects) {
    if (!isAccountedProject(project)) continue;
    const money = getProjectMoneySummary(project.id);
    sales += money.sale;
    outstanding += money.remaining;

    const periodPaid = periodPayments
      .filter((p) => p.projectId === project.id)
      .reduce((s, p) => s + p.amount, 0);
    const periodExp = periodExpenses
      .filter((e) => e.projectId === project.id)
      .reduce((s, e) => s + e.amount, 0);

    // اعرض المشروع لو فيه حركة في الفترة أو باقي أو مصروف إجمالي
    if (
      period === "all" ||
      periodPaid > 0 ||
      periodExp > 0 ||
      money.remaining > 0
    ) {
      projectRows.push({
        projectId: project.id,
        customerId: project.customerId,
        projectName: project.name,
        customerName: customerById.get(project.customerId)?.name ?? "عميل",
        sale: money.sale,
        paid: period === "all" ? money.paid : periodPaid,
        remaining: money.remaining,
        expenses: period === "all" ? money.expenses : periodExp,
        profit:
          period === "all"
            ? money.paid - money.expenses
            : periodPaid - periodExp,
        workflow: project.workflow,
      });
    }
  }

  projectRows.sort((a, b) => b.profit - a.profit);

  return {
    period,
    fromDate,
    toDate,
    sales,
    collected,
    expenses: expenseTotal,
    net: collected - expenseTotal,
    outstanding,
    projectRows,
    paymentCount: periodPayments.length,
    expenseCount: periodExpenses.length,
  };
}
