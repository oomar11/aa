"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  deletePayment,
  loadPayments,
  paymentChannelLabel,
  type Payment,
} from "@/lib/accounting";
import { getCustomerById, mergeCustomers, type Customer } from "@/lib/customers";
import { getProjectById } from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import { formatCurrency, formatDate, smartSearchMatch } from "@/lib/utils";
import { syncProjectMoneyFromPayments } from "@/lib/workshop";
import {
  ensureCustomerLinkedToStore,
  hasStoreBridgeCredentials,
  isStoreBridgeActive,
  loadStoreBridgeConfig,
  postStorePartyLedger,
  syncMoneyToStore,
} from "@/lib/store-bridge";

export function PaymentsBrowser() {
  const [payments, setPayments] = useState<Payment[]>(() =>
    typeof window === "undefined" ? [] : loadPayments()
  );
  const [allCustomers, setAllCustomers] = useState(mergeCustomers);
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

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
          paymentChannelLabel(payment),
        ]);
      })
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
  }, [payments, customerById, query, tick]);

  async function handleDelete(payment: Payment) {
    if (!window.confirm("هل تريد حذف هذه الدفعة؟")) return;
    setActionError("");
    setBusyId(payment.id);
    const cfg = loadStoreBridgeConfig();
    try {
      if (isStoreBridgeActive(cfg) && (payment.storeBridge || cfg)) {
        await syncMoneyToStore(
          {
            kind: "payment",
            externalKey: payment.id,
            amount: 0,
            description: "ورشة · حذف دفعة",
            safeId: payment.storeBridge?.safeId || cfg?.safeId,
          },
          cfg
        );
      }
      if (hasStoreBridgeCredentials(cfg) && cfg) {
        const cust =
          getCustomerById(payment.customerId) ||
          customerById.get(payment.customerId);
        const storeCustomerId = cust
          ? await ensureCustomerLinkedToStore(cust, cfg)
          : null;
        if (storeCustomerId) {
          await postStorePartyLedger(
            {
              storeCustomerId,
              sourceRef: `pay:${payment.id}`,
              entryType: "workshop_void",
              amount: 0,
              direction: "credit",
              notes: "حذف دفعة ورشة",
              details: {
                kind: "aa_payment",
                project_id: payment.projectId || null,
                payment_id: payment.id,
                local_party_id: payment.customerId,
                customer_id: payment.customerId,
              },
            },
            cfg
          );
        }
      }
      const projectId = payment.projectId;
      deletePayment(payment.id);
      if (projectId) syncProjectMoneyFromPayments(projectId);
      setPayments(loadPayments());
    } catch (err) {
      setActionError(
        err instanceof Error
          ? `فشل إلغاء الدفعة في المتجر: ${err.message}`
          : "فشل إلغاء الدفعة في المتجر"
      );
    } finally {
      setBusyId(null);
    }
  }

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

      {actionError ? (
        <p className="rounded-xl border border-[#E85A8A]/35 bg-[#E85A8A]/10 px-3 py-2 text-xs font-medium text-[#E85A8A]">
          {actionError}
        </p>
      ) : null}

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
                      {paymentChannelLabel(payment)}
                      {payment.note ? ` · ${payment.note}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="flex items-center gap-3">
                      <Link
                        href={ROUTES.accounting.editPayment(payment.id)}
                        className="text-xs font-semibold text-primary"
                      >
                        تعديل
                      </Link>
                      <button
                        type="button"
                        disabled={busyId === payment.id}
                        onClick={() => void handleDelete(payment)}
                        className="text-xs font-semibold text-[#E85A8A] disabled:opacity-50"
                      >
                        {busyId === payment.id ? "…" : "حذف"}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
