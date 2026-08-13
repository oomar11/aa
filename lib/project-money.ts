import { loadExpenses, loadPayments, type Expense, type Payment } from "@/lib/accounting";
import { itemTotalPrice } from "@/lib/design-items";
import {
  getItemsForProject,
  getProjectById,
  listAllProjects,
  type Project,
  type ProjectDiscountType,
} from "@/lib/projects";
import { projectPaidTotal } from "@/lib/workshop";

export type ProjectMoneySummary = {
  /** مجموع بيع البنود قبل خصم المشروع */
  subtotal: number;
  /** نوع خصم المشروع إن وُجد */
  discountType: ProjectDiscountType | null;
  /** قيمة الخصم المخزّنة (مبلغ أو نسبة) */
  discountValue: number;
  /** مبلغ الخصم بالجنيه */
  discountAmount: number;
  /** صافي الحساب بعد الخصم — ده اللي على العميل */
  sale: number;
  /** مجموع الدفعات المسجّلة على المشروع */
  paid: number;
  /** المتبقي على العميل = البيع − المدفوع */
  remaining: number;
  /** مجموع مصروفات المشروع */
  expenses: number;
};

function roundMoney(amount: number): number {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

export function projectItemsSubtotal(projectId: string): number {
  return roundMoney(
    getItemsForProject(projectId).reduce(
      (sum, item) => sum + itemTotalPrice(item),
      0
    )
  );
}

export function applyProjectDiscount(
  subtotal: number,
  type?: ProjectDiscountType | null,
  value?: number | null
): { discountAmount: number; sale: number } {
  const base = Math.max(0, roundMoney(subtotal));
  const raw = Math.max(0, Number(value) || 0);
  if (!type || raw <= 0 || base <= 0) {
    return { discountAmount: 0, sale: base };
  }
  const discountAmount = roundMoney(
    type === "percent"
      ? Math.min(base, (base * Math.min(raw, 100)) / 100)
      : Math.min(base, raw)
  );
  return {
    discountAmount,
    sale: roundMoney(Math.max(0, base - discountAmount)),
  };
}

export function projectDiscountFromProject(project: Project | undefined): {
  discountType: ProjectDiscountType | null;
  discountValue: number;
  discountAmount: number;
  sale: number;
  subtotal: number;
} {
  const subtotal = project ? projectItemsSubtotal(project.id) : 0;
  const applied = applyProjectDiscount(
    subtotal,
    project?.discountType,
    project?.discountValue
  );
  return {
    subtotal,
    discountType: applied.discountAmount > 0 ? project?.discountType ?? null : null,
    discountValue:
      applied.discountAmount > 0 ? Number(project?.discountValue) || 0 : 0,
    discountAmount: applied.discountAmount,
    sale: applied.sale,
  };
}

/** صافي بيع المشروع بعد خصم المشروع (للتوافق مع الاستدعاءات القديمة) */
export function projectSaleTotal(projectId: string): number {
  return getProjectMoneySummary(projectId).sale;
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
  const project = getProjectById(projectId);
  const discounted = projectDiscountFromProject(project);
  const paid = projectPaidTotal(projectId);
  const expenses = projectExpenseTotal(projectId);
  return {
    ...discounted,
    paid,
    remaining: Math.max(0, discounted.sale - paid),
    expenses,
  };
}

/**
 * مبلغ البيع اللي يترحل لكشف العميل في المحل.
 * لو المشروع مدفوع زيادة وفيه شغل تاني عليه باقي، نرفع قيد البيع
 * لحد المدفوع عشان الزيادة ما تتحولش رصيد دائن يخصم من المشروع التاني.
 */
export function projectLedgerSaleAmount(projectId: string): number {
  const money = getProjectMoneySummary(projectId);
  const project = getProjectById(projectId);
  if (!project || money.paid <= money.sale) return money.sale;
  const hasOtherRemaining = listAllProjects().some((other) => {
    if (other.id === projectId || other.customerId !== project.customerId) {
      return false;
    }
    if (other.workflow === "quote") return false;
    return getProjectMoneySummary(other.id).remaining > 0.004;
  });
  if (!hasOtherRemaining) return money.sale;
  return roundMoney(Math.max(money.sale, money.paid));
}

export function projectDiscountLabel(money: ProjectMoneySummary): string | null {
  if (money.discountAmount <= 0) return null;
  if (money.discountType === "percent") {
    return `خصم ${money.discountValue}%`;
  }
  return "خصم مبلغ";
}
