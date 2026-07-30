import {
  customerOutstanding,
  loadInvoices,
  loadPayments,
} from "@/lib/accounting";
import type { Customer } from "@/lib/customers";

/**
 * رصيد العميل للعرض:
 * لو فيه حركة محاسبة (فاتورة أو دفعة) نستخدم المتبقي المحسوب،
 * وإلا نرجع الرصيد المخزّن على العميل.
 */
export function resolveCustomerBalance(customer: Customer): number {
  const invoices = loadInvoices();
  const payments = loadPayments();
  const hasActivity =
    invoices.some((i) => i.customerId === customer.id) ||
    payments.some((p) => p.customerId === customer.id);

  if (!hasActivity) return customer.balance;
  return customerOutstanding(customer.id, invoices, payments);
}
