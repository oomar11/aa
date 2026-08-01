import {
  customerOutstanding,
  loadInvoices,
  loadPayments,
} from "@/lib/accounting";
import type { Customer } from "@/lib/customers";
import { listAllProjects } from "@/lib/projects";
import { getProjectMoneySummary } from "@/lib/project-money";

/**
 * متبقي الفواتير على العميل (مفوتر − مدفوع على فواتير/عميل).
 */
export function resolveCustomerBalance(customer: Customer): number {
  const invoices = loadInvoices();
  const payments = loadPayments();
  const hasActivity =
    invoices.some((i) => i.customerId === customer.id) ||
    payments.some((p) => p.customerId === customer.id);

  if (!hasActivity) return Math.max(0, customer.balance);
  return customerOutstanding(customer.id, invoices, payments);
}

/**
 * متبقي بيع مشاريع العميل (مجموع متبقي البنود بعد الدفعات).
 */
export function customerProjectsRemaining(customerId: string): number {
  return listAllProjects()
    .filter((p) => p.customerId === customerId)
    .reduce((sum, p) => sum + getProjectMoneySummary(p.id).remaining, 0);
}
