import { getProjectMoneySummary } from "@/lib/project-money";
import { listAllProjects, type Project } from "@/lib/projects";

/**
 * مشروع يدخل «إجمالي الحسابات»:
 * خد عربون أو دخل ورشة (مش مقايسة خام).
 */
export function isAccountedProject(project: Project): boolean {
  return project.workflow !== "quote";
}

/**
 * مشروع يدخل «الباقي عند العملاء»:
 * شغل مكتمل تصنيعاً — سواء اتسلّم أو لأ.
 */
export function isCollectibleRemainingProject(project: Project): boolean {
  return project.workflow === "done";
}

export type WorkshopMoneyTotals = {
  /** مجموع بيع المشاريع غير المقايسة */
  sales: number;
  /** مجموع الباقي على الشغل المكتمل فقط */
  outstanding: number;
};

/** إجماليات الحسابات حسب قواعد الفلترة */
export function workshopMoneyTotals(
  projects: Project[] = listAllProjects()
): WorkshopMoneyTotals {
  let sales = 0;
  let outstanding = 0;
  for (const project of projects) {
    const money = getProjectMoneySummary(project.id);
    if (isAccountedProject(project)) {
      sales += money.sale;
    }
    if (isCollectibleRemainingProject(project)) {
      outstanding += money.remaining;
    }
  }
  return { sales, outstanding };
}
