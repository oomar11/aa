import type { Customer } from "@/lib/customers";
import { isCollectibleRemainingProject } from "@/lib/accounting-scope";
import { listAllProjects } from "@/lib/projects";
import { getProjectMoneySummary } from "@/lib/project-money";

/**
 * متبقي العميل = مجموع (بيع − مدفوع) للمشاريع المكتملة فقط
 * (سواء اتسلّم الشغل أو لأ).
 */
export function customerProjectsRemaining(customerId: string): number {
  return listAllProjects()
    .filter(
      (p) => p.customerId === customerId && isCollectibleRemainingProject(p)
    )
    .reduce((sum, p) => sum + getProjectMoneySummary(p.id).remaining, 0);
}

/**
 * رصيد العميل الظاهر في الواجهة: متبقي الشغل المكتمل.
 * إن لم يكن له مشاريع، نرجع الرصيد المخزّن القديم إن وُجد.
 */
export function resolveCustomerBalance(customer: Customer): number {
  const projects = listAllProjects().filter(
    (p) => p.customerId === customer.id
  );
  if (projects.length === 0) return Math.max(0, customer.balance);
  return customerProjectsRemaining(customer.id);
}

/** إجمالي بيع مشاريع العميل غير المقايسة */
export function customerProjectsSale(customerId: string): number {
  return listAllProjects()
    .filter((p) => p.customerId === customerId && p.workflow !== "quote")
    .reduce((sum, p) => sum + getProjectMoneySummary(p.id).sale, 0);
}

/** إجمالي مدفوع على مشاريع العميل */
export function customerProjectsPaid(customerId: string): number {
  return listAllProjects()
    .filter((p) => p.customerId === customerId)
    .reduce((sum, p) => sum + getProjectMoneySummary(p.id).paid, 0);
}
