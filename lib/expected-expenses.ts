import { isAccountedProject } from "@/lib/accounting-scope";
import { getCustomerById } from "@/lib/customers";
import { isExtraChargeItem } from "@/lib/design-items";
import { calcItemMaterialsCost } from "@/lib/project-estimated-cost";
import { getProjectMoneySummary, projectExpenseTotal } from "@/lib/project-money";
import {
  getItemsForProject,
  getProjectById,
  listAllProjects,
  type Project,
} from "@/lib/projects";

export type ExpectedExpenseRow = {
  projectId: string;
  customerId: string;
  projectName: string;
  customerName: string;
  expected: number;
  actual: number;
  /** المتوقع − المسجّل (سالب = صرف زيادة عن المقايسة) */
  leftover: number;
  hasCost: boolean;
};

export type ExpectedExpenseTotals = {
  expected: number;
  actual: number;
  leftover: number;
  jobs: number;
};

function roundMoney(amount: number): number {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

/** شغل اتقفل: مكتمل + متسلّم + الحساب متسدد */
function isSettledDelivered(project: Project): boolean {
  if (project.workflow !== "done") return false;
  if (project.deliveryStatus !== "delivered") return false;
  return getProjectMoneySummary(project.id).remaining <= 0;
}

/**
 * مصروف الخامات المتوقع للمشروع من أسعار الكتالوج (نفس التكلفة التقديرية).
 */
export function projectExpectedExpense(projectId: string): {
  expected: number;
  hasCost: boolean;
} {
  if (typeof window === "undefined") {
    return { expected: 0, hasCost: false };
  }
  const project = getProjectById(projectId);
  if (!project) return { expected: 0, hasCost: false };

  let expected = 0;
  let hasCost = false;
  for (const item of getItemsForProject(projectId)) {
    if (isExtraChargeItem(item)) continue;
    const cost = calcItemMaterialsCost(item, project);
    if (cost.hasCost) {
      hasCost = true;
      expected += cost.afterDiscount;
    }
  }
  return { expected: roundMoney(expected), hasCost };
}

/** شغل الورشة المفتوح: دخل الحساب ومش مقفول تسليم+حساب */
export function listExpectedExpenseRows(
  projects: Project[] = listAllProjects()
): ExpectedExpenseRow[] {
  const rows: ExpectedExpenseRow[] = [];
  for (const project of projects) {
    if (!isAccountedProject(project) || isSettledDelivered(project)) continue;
    const { expected, hasCost } = projectExpectedExpense(project.id);
    const actual = roundMoney(projectExpenseTotal(project.id));
    if (!hasCost && actual <= 0 && expected <= 0) continue;
    rows.push({
      projectId: project.id,
      customerId: project.customerId,
      projectName: project.name,
      customerName: getCustomerById(project.customerId)?.name ?? "عميل",
      expected,
      actual,
      leftover: roundMoney(expected - actual),
      hasCost,
    });
  }
  return rows.sort((a, b) => b.leftover - a.leftover);
}

export function expectedExpenseTotals(
  rows: ExpectedExpenseRow[]
): ExpectedExpenseTotals {
  return rows.reduce<ExpectedExpenseTotals>(
    (sum, row) => ({
      expected: roundMoney(sum.expected + row.expected),
      actual: roundMoney(sum.actual + row.actual),
      leftover: roundMoney(sum.leftover + row.leftover),
      jobs: sum.jobs + 1,
    }),
    { expected: 0, actual: 0, leftover: 0, jobs: 0 }
  );
}
