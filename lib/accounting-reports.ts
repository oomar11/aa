import {
  loadExpenses,
  loadPayments,
  todayIsoDate,
  type Expense,
  type Payment,
} from "@/lib/accounting";
import { isDeliveredProject } from "@/lib/accounting-scope";
import { mergeCustomers } from "@/lib/customers";
import { getProjectMoneySummary } from "@/lib/project-money";
import { listAllProjects, type Project } from "@/lib/projects";

export type ReportPeriod = "all" | "month" | "quarter" | "year" | "custom";

export type ReportDateRange = {
  fromDate?: string | null;
  toDate?: string;
};

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
  deliveredAt?: string;
};

export type AccountingReport = {
  period: ReportPeriod;
  /** بداية الفترة (ISO تاريخ) إن وُجدت */
  fromDate: string | null;
  toDate: string;
  /** بيع الشغل المتسلّم في الفترة */
  sales: number;
  /** محصّل الشغل المتسلّم في الفترة */
  collected: number;
  /** مصروف الشغل المتسلّم + المصروف العام في الفترة */
  expenses: number;
  /** المحصّل − المصروف */
  net: number;
  /** باقي على الشغل المتسلّم الظاهر في التقرير */
  outstanding: number;
  projectRows: ProjectProfitRow[];
  paymentCount: number;
  expenseCount: number;
};

export function startOfPeriod(period: ReportPeriod, now = new Date()): string | null {
  if (period === "all" || period === "custom") return null;
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

export function inPeriod(isoDate: string, from: string | null, to: string): boolean {
  if (from && isoDate < from) return false;
  return isoDate <= to;
}

/** مجموع كل المصروفات بتاريخها داخل الفترة (مشروط بتاريخ المصروف، مش التسليم). */
export function expensesTotalInPeriod(
  period: ReportPeriod = "month",
  expenses: Expense[] = loadExpenses(),
  range?: ReportDateRange
): number {
  const toDate = range?.toDate || todayIsoDate();
  const fromDate =
    range && "fromDate" in range
      ? range.fromDate ?? null
      : startOfPeriod(period);
  return expenses
    .filter((expense) => inPeriod(expense.date, fromDate, toDate))
    .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
}

/** الشغل المتسلّم يدخل الفترة حسب تاريخ التسليم؛ من غير تاريخ يظهر في «كل الوقت» فقط. */
function isDeliveredInReportPeriod(
  project: Project,
  fromDate: string | null,
  toDate: string,
  allTime: boolean
): boolean {
  if (!isDeliveredProject(project)) return false;
  const deliveredAt = project.deliveredAt;
  if (!deliveredAt) return allTime;
  return inPeriod(deliveredAt, fromDate, toDate);
}

export const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
  all: "كل الوقت",
  month: "هذا الشهر",
  quarter: "هذا الربع",
  year: "هذه السنة",
  custom: "فترة مخصصة",
};

export function reportBounds(
  period: ReportPeriod,
  now = new Date()
): { fromDate: string | null; toDate: string } {
  return {
    fromDate: startOfPeriod(period, now),
    toDate: now.toISOString().slice(0, 10),
  };
}

/**
 * تقرير ربحية من الشغل اللي خلص واتسلّم.
 * الفترة على تاريخ التسليم؛ المكسب = محصّل الشغل − مصروفه − المصروف العام في الفترة.
 */
export function buildAccountingReport(
  period: ReportPeriod = "month",
  payments: Payment[] = loadPayments(),
  expenses: Expense[] = loadExpenses(),
  projects: Project[] = listAllProjects(),
  range?: ReportDateRange
): AccountingReport {
  const toDate = range?.toDate || todayIsoDate();
  const fromDate =
    range && "fromDate" in range
      ? range.fromDate ?? null
      : startOfPeriod(period);
  const allTime = !fromDate;
  const customers = mergeCustomers();
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const includedProjects = projects.filter((project) =>
    isDeliveredInReportPeriod(project, fromDate, toDate, allTime)
  );
  const includedIds = new Set(includedProjects.map((project) => project.id));

  const jobPayments = payments.filter(
    (p) => p.projectId != null && includedIds.has(p.projectId)
  );
  const jobExpenses = expenses.filter(
    (e) => e.projectId != null && includedIds.has(e.projectId)
  );
  const generalPeriodExpenses = expenses.filter(
    (e) => !e.projectId && inPeriod(e.date, fromDate, toDate)
  );

  let sales = 0;
  let collected = 0;
  let jobExpenseTotal = 0;
  let outstanding = 0;
  const projectRows: ProjectProfitRow[] = [];

  for (const project of includedProjects) {
    const money = getProjectMoneySummary(project.id);
    const paid = payments
      .filter((p) => p.projectId === project.id)
      .reduce((s, p) => s + p.amount, 0);
    const projectExp = expenses
      .filter((e) => e.projectId === project.id)
      .reduce((s, e) => s + e.amount, 0);
    const remaining = Math.max(0, money.sale - paid);
    sales += money.sale;
    collected += paid;
    jobExpenseTotal += projectExp;
    outstanding += remaining;

    projectRows.push({
      projectId: project.id,
      customerId: project.customerId,
      projectName: project.name,
      customerName: customerById.get(project.customerId)?.name ?? "عميل",
      sale: money.sale,
      paid,
      remaining,
      expenses: projectExp,
      profit: paid - projectExp,
      workflow: project.workflow,
      deliveredAt: project.deliveredAt,
    });
  }

  projectRows.sort((a, b) => b.profit - a.profit);

  const overhead = generalPeriodExpenses.reduce((s, e) => s + e.amount, 0);
  const expenseTotal = jobExpenseTotal + overhead;

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
    paymentCount: jobPayments.length,
    expenseCount: jobExpenses.length + generalPeriodExpenses.length,
  };
}
