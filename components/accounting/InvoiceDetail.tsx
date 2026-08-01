"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  cancelInvoice,
  INVOICE_STATUS_LABELS,
  invoicePaidAmount,
  invoiceRemaining,
  loadInvoices,
  loadPayments,
  PAYMENT_METHOD_LABELS,
  type Invoice,
  type Payment,
} from "@/lib/accounting";
import {
  customers,
  loadLocalCustomers,
  type Customer,
} from "@/lib/customers";
import { getProjectById } from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import { formatCurrency, formatDate } from "@/lib/utils";

function mergeCustomers(): Customer[] {
  if (typeof window === "undefined") return customers;
  const local = loadLocalCustomers();
  const localIds = new Set(local.map((c) => c.id));
  return [...local, ...customers.filter((c) => !localIds.has(c.id))];
}

function readInvoice(id: string): Invoice | null {
  if (typeof window === "undefined") return null;
  return loadInvoices().find((i) => i.id === id) ?? null;
}

export function InvoiceDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const invoiceId = params.id;

  const [invoice, setInvoice] = useState<Invoice | null>(() =>
    readInvoice(invoiceId)
  );
  const [payments, setPayments] = useState<Payment[]>(() =>
    typeof window === "undefined"
      ? []
      : loadPayments().filter((p) => p.invoiceId === invoiceId)
  );
  const [customer, setCustomer] = useState<Customer | null>(() => {
    const found = readInvoice(invoiceId);
    if (!found) return null;
    return mergeCustomers().find((c) => c.id === found.customerId) ?? null;
  });

  useEffect(() => {
    function refresh() {
      const found = loadInvoices().find((i) => i.id === invoiceId) ?? null;
      setInvoice(found);
      setPayments(loadPayments().filter((p) => p.invoiceId === invoiceId));
      if (found) {
        setCustomer(
          mergeCustomers().find((c) => c.id === found.customerId) ?? null
        );
      }
    }
    window.addEventListener("upvc-accounting-updated", refresh);
    return () => window.removeEventListener("upvc-accounting-updated", refresh);
  }, [invoiceId]);

  const projectName = useMemo(() => {
    if (!invoice?.projectId) return null;
    return getProjectById(invoice.projectId)?.name ?? null;
  }, [invoice]);

  if (!invoice) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
        الفاتورة مش موجودة
      </div>
    );
  }

  const paid = invoicePaidAmount(invoice.id);
  const remaining = invoiceRemaining(invoice);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold">{invoice.number}</p>
            <p className="mt-1 text-xs text-muted">
              {formatDate(invoice.date)}
              {customer ? ` · ${customer.name}` : ""}
            </p>
            {projectName ? (
              <p className="mt-1 text-xs text-muted">مشروع: {projectName}</p>
            ) : null}
          </div>
          <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
            {INVOICE_STATUS_LABELS[invoice.status]}
          </span>
        </div>

        <ul className="mt-4 flex flex-col gap-2 border-t border-border pt-3">
          {invoice.lines.map((line) => (
            <li
              key={line.id}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <span className="text-foreground">{line.description}</span>
              <span className="shrink-0 font-bold tabular-nums">
                {formatCurrency(line.amount)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
          <div>
            <p className="text-[10px] text-muted">الإجمالي</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums">
              {formatCurrency(invoice.total)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted">المدفوع</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-[#2F9B7A]">
              {formatCurrency(paid)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted">المتبقي</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-[#E85A8A]">
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>

        {invoice.note ? (
          <p className="mt-3 text-xs leading-relaxed text-muted">
            {invoice.note}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold">التحصيل على الفاتورة</h2>
          {invoice.status !== "cancelled" && remaining > 0 ? (
            <Link
              href={`${ROUTES.accounting.newPayment}?customer=${invoice.customerId}&invoice=${invoice.id}`}
              className="text-xs font-semibold text-primary"
            >
              + دفعة
            </Link>
          ) : null}
        </div>
        {payments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center text-xs text-muted">
            لا توجد دفعات على هذه الفاتورة بعد
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="rounded-2xl border border-border bg-card px-3.5 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold tabular-nums text-[#2F9B7A]">
                    {formatCurrency(payment.amount)} ج.م
                  </p>
                  <p className="text-xs text-muted">
                    {PAYMENT_METHOD_LABELS[payment.method]}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {formatDate(payment.date)}
                  {payment.note ? ` · ${payment.note}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {invoice.status !== "cancelled" ? (
        <button
          type="button"
          onClick={() => {
            if (!window.confirm("تلغي الفاتورة؟")) return;
            cancelInvoice(invoice.id);
            router.replace(ROUTES.accounting.invoices);
          }}
          className="flex h-11 items-center justify-center rounded-xl border border-[#E85A8A]/40 text-sm font-semibold text-[#E85A8A]"
        >
          إلغاء الفاتورة
        </button>
      ) : null}
    </div>
  );
}
