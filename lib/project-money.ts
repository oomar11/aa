import { itemTotalPrice } from "@/lib/design-items";
import { getItemsForProject } from "@/lib/projects";
import { projectPaidTotal } from "@/lib/workshop";

export type ProjectMoneySummary = {
  /** إجمالي بيع بنود المقايسة */
  sale: number;
  /** مجموع الدفعات المسجّلة على المشروع */
  paid: number;
  /** المتبقي = البيع − المدفوع (لا يقل عن صفر) */
  remaining: number;
};

export function projectSaleTotal(projectId: string): number {
  return getItemsForProject(projectId).reduce(
    (sum, item) => sum + itemTotalPrice(item),
    0
  );
}

export function getProjectMoneySummary(projectId: string): ProjectMoneySummary {
  const sale = projectSaleTotal(projectId);
  const paid = projectPaidTotal(projectId);
  return {
    sale,
    paid,
    remaining: Math.max(0, sale - paid),
  };
}
