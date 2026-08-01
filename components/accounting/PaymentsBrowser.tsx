"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  deletePayment,
  loadPayments,
  PAYMENT_METHOD_LABELS,
  type Payment,
} from "@/lib/accounting";
import {
  customers,
  loadLocalCustomers,
  type Customer,
} from "@/lib/customers";
import { getProjectById } from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import { formatCurrency, formatDate, smartSearchMatch } from "@/lib/utils";

function mergeCustomers(): Customer[] {
  if (typeof window === "undefined") return customers;
  const local = loadLocalCustomers();
  const localIds = new Set(local.map((c) => c.id));
  return [...local, ...customers.filter((c) => !localIds.has(c.id))];
}

export function PaymentsBrowser() {
  const [payments, setPayments] = useState<Payment[]>(() =>
    typeof window === "undefined" ? [] : loadPayments()
  );
  const [allCustomers, setAllCustomers] = useState(mergeCustomers);
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    function refresh() {
      setPayments(loadPayments());
      setAllCustomers(mergeCustomers());
      setTick((n) => n + 1);
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
    void tick;
    return [...payments]
      .filter((payment) => {
        const customer = customerById.get(payment.customerId);
        const project = payment.projectId
          ? getProjectById(payment.projectId)
          : undefined;
        return smartSearchMatch(query, [
          customer?.name,
          customer?.phone,
          project?.name,
          payment.note,
          PAYMENT_METHOD_LABELS[payment.method],
        ]);
      })
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
  }, [payments, customerById, query, tick]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="بحث بالعميل أو المشروع…"
          className="h-11 flex-1 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <Link
          href={ROUTES.accounting.newPayment}
          className="flex h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white"
        >
          دفعة
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
          لا توجد دفعات بعد — اضغط «دفعة» لتسجيل مبلغ
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {filtered.map((payment) => {
            const customer = customerById.get(payment.customerId);
            const project = payment.projectId
              ? getProjectById(payment.projectId)
              : undefined;
            return (
              <li
                key={payment.id}
                className="rounded-2xl border border-border bg-card p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#2F9B7A] tabular-nums">
                      {formatCurrency(payment.amount)} ج.م
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {customer?.name ?? "عميل"}
                      {project ? ` · ${project.name}` : ""}
                      {" · "}
                      {formatDate(payment.date)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {PAYMENT_METHOD_LABELS[payment.method]}
                      {payment.note ? ` · ${payment.note}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm("هل تريد حذف هذه الدفعة؟")) return;
                      deletePayment(payment.id);
                    }}
                    className="shrink-0 text-xs font-semibold text-[#E85A8A]"
                  >
                    حذف
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
