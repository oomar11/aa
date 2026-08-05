import { isAccountedProject } from "@/lib/accounting-scope";
import { mergeCustomers, type Customer } from "@/lib/customers";
import { getProjectMoneySummary } from "@/lib/project-money";
import { listAllProjects, type Project } from "@/lib/projects";
import {
  DELIVERY_LABELS,
  projectDeliveryStatus,
  WORKFLOW_LABELS,
} from "@/lib/workshop";

export type ReceivableFilter =
  | "all"
  | "owed"
  | "paid"
  | "not_delivered"
  | "delivered";

export type ReceivableRow = {
  project: Project;
  customerName: string;
  customerPhone: string;
  sale: number;
  paid: number;
  remaining: number;
  expenses: number;
  /** المحصّل ناقص مصروف المشروع */
  profit: number;
  workflowLabel: string;
  deliveryLabel: string | null;
  delivered: boolean;
};

export type ReceivablesTotals = {
  sale: number;
  paid: number;
  remaining: number;
  expenses: number;
  profit: number;
  owedCount: number;
  paidCount: number;
  notDeliveredCount: number;
};

/**
 * شغل عليه حساب (مش مقايسة) — لمتابعة الفلوس اللي برا:
 * اتسلّم ولا لأ، اتدفع ولا لأ.
 */
export function listReceivableRows(
  projects: Project[] = listAllProjects(),
  customers: Customer[] = mergeCustomers()
): ReceivableRow[] {
  const customerById = new Map(customers.map((c) => [c.id, c]));

  return projects
    .filter(isAccountedProject)
    .map((project) => {
      const money = getProjectMoneySummary(project.id);
      const customer = customerById.get(project.customerId);
      const delivery = projectDeliveryStatus(project);
      return {
        project,
        customerName: customer?.name ?? "عميل",
        customerPhone: customer?.phone ?? "",
        sale: money.sale,
        paid: money.paid,
        remaining: money.remaining,
        expenses: money.expenses,
        profit: money.paid - money.expenses,
        workflowLabel: WORKFLOW_LABELS[project.workflow],
        deliveryLabel: delivery ? DELIVERY_LABELS[delivery] : null,
        delivered: delivery === "delivered",
      };
    })
    .sort((a, b) => {
      if (b.remaining !== a.remaining) return b.remaining - a.remaining;
      return (
        new Date(b.project.createdAt).getTime() -
        new Date(a.project.createdAt).getTime()
      );
    });
}

export function filterReceivableRows(
  rows: ReceivableRow[],
  filter: ReceivableFilter
): ReceivableRow[] {
  switch (filter) {
    case "owed":
      return rows.filter((r) => r.remaining > 0);
    case "paid":
      return rows.filter((r) => r.remaining <= 0);
    case "not_delivered":
      return rows.filter(
        (r) => r.project.workflow === "done" && !r.delivered
      );
    case "delivered":
      return rows.filter((r) => r.delivered);
    default:
      return rows;
  }
}

export function receivablesTotals(rows: ReceivableRow[]): ReceivablesTotals {
  let sale = 0;
  let paid = 0;
  let remaining = 0;
  let expenses = 0;
  let owedCount = 0;
  let paidCount = 0;
  let notDeliveredCount = 0;

  for (const row of rows) {
    sale += row.sale;
    paid += row.paid;
    remaining += row.remaining;
    expenses += row.expenses;
    if (row.remaining > 0) owedCount += 1;
    else paidCount += 1;
    if (row.project.workflow === "done" && !row.delivered) {
      notDeliveredCount += 1;
    }
  }

  return {
    sale,
    paid,
    remaining,
    expenses,
    profit: paid - expenses,
    owedCount,
    paidCount,
    notDeliveredCount,
  };
}

export const RECEIVABLE_FILTER_LABELS: Record<ReceivableFilter, string> = {
  all: "الكل",
  owed: "عليه فلوس",
  paid: "اتسلّم فلوسه",
  not_delivered: "شغل متسلّمش",
  delivered: "اتسلّم الشغل",
};
