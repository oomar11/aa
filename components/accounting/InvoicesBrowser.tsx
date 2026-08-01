"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  INVOICE_STATUS_LABELS,
  invoiceRemaining,
  loadInvoices,
  loadPayments,
  type Invoice,
  type Payment,
} from "@/lib/accounting";
import {
  customers,
  loadLocalCustomers,
  type Customer,
} from "@/lib/customers";
import { ROUTES } from "@/lib/routes";
import { formatCurrency, formatDate, smartSearchMatch } from "@/lib/utils";

function mergeCustomers(): Customer[] {
  if (typeof window === "undefined") return customers;
  const local = loadLocalCustomers();
  const localIds = new Set(local.map((c) => c.id));
  return [...local, ...customers.filter((c) => !localIds.has(c.id))];
}

export function InvoicesBrowser() {
  const [invoices, setInvoices] = useState<Invoice[]>(() =>
    typeof window === "undefined" ? [] : loadInvoices()
  );
  const [payments, setPayments] = useState<Payment[]>(() =>
    typeof window === "undefined" ? [] : loadPayments()
  );
  const [allCustomers, setAllCustomers] = useState(mergeCustomers);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function refresh() {
      setInvoices(loadInvoices());
      setPayments(loadPayments());
      setAllCustomers(mergeCustomers());
    }
    window.addEventListener("upvc-accounting-updated", refresh);
    return () => window.removeEventListener("upvc-accounting-updated", refresh);
  }, []);

  const customerById = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const customer of allCustomers) map.set(customer.id, customer);
    return map;
  }, [allCustomers]);

  const filtered = useMemo(() => {
    return [...invoices]
      .filter((invoice) => {
        const customer = customerById.get(invoice.customerId);
        return smartSearchMatch(query, [
          invoice.number,
          customer?.name,
          customer?.phone,
          invoice.note,
        ]);
      })
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime() ||
          b.number.localeCompare(a.number)
      );
  }, [invoices, customerById, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="بحث برقم الفاتورة أو العميل…"
          className="h-11 flex-1 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <Link
          href={ROUTES.accounting.newInvoice}
          className="flex h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white"
        >
          فاتورة
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
          لا توجد فواتير مطابقة
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {filtered.map((invoice) => {
            const customer = customerById.get(invoice.customerId);
            const remaining = invoiceRemaining(invoice, payments);
            return (
              <li key={invoice.id}>
                <Link
                  href={ROUTES.accounting.invoice(invoice.id)}
                  className="block rounded-2xl border border-border bg-card p-3.5 transition-all hover:-translate-y-0.5 hover:border-primary/30 active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">
                        {invoice.number}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {customer?.name ?? "عميل"} · {formatDate(invoice.date)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {INVOICE_STATUS_LABELS[invoice.status]}
                    </span>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <p className="text-sm font-bold tabular-nums text-foreground">
                      {formatCurrency(invoice.total)} ج.م
                    </p>
                    {invoice.status !== "cancelled" && remaining > 0 ? (
                      <p className="text-xs font-semibold text-[#E85A8A]">
                        متبقي {formatCurrency(remaining)}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
