import { loadExpenses, loadPayments, type Expense, type Payment } from "@/lib/accounting";
import { itemTotalPrice } from "@/lib/design-items";
import { getItemsForProject } from "@/lib/projects";
import { projectPaidTotal } from "@/lib/workshop";

export type ProjectMoneySummary = {
  /** إجمالي بيع بنود المقايسة */
  sale: number;
  /** مجموع الدفعات المسجّلة على المشروع */
  paid: number;
  /** المتبقي على العميل = البيع − المدفوع */
  remaining: number;
  /** مجموع مصروفات المشروع */
  expenses: number;
};

export function projectSaleTotal(projectId: string): number {
  return getItemsForProject(projectId).reduce(
    (sum, item) => sum + itemTotalPrice(item),
    0
  );
}

export function projectExpenseTotal(projectId: string): number {
  return loadExpenses()
    .filter((e) => e.projectId === projectId)
    .reduce((sum, e) => sum + e.amount, 0);
}

export function listProjectExpenses(projectId: string): Expense[] {
  return loadExpenses()
    .filter((e) => e.projectId === projectId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/** دفعات المشروع مرتبة من الأحدث */
export function listProjectPayments(projectId: string): Payment[] {
  return loadPayments()
    .filter((p) => p.projectId === projectId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getProjectMoneySummary(projectId: string): ProjectMoneySummary {
  const sale = projectSaleTotal(projectId);
  const paid = projectPaidTotal(projectId);
  const expenses = projectExpenseTotal(projectId);
  return {
    sale,
    paid,
    remaining: Math.max(0, sale - paid),
    expenses,
  };
}
