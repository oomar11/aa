"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { mergeCustomers, type Customer } from "@/lib/customers";
import { resolveCustomerBalance } from "@/lib/customer-balance";
import { formatCurrency, formatDate, smartSearchMatch } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import {
  fetchStoreCustomerBusinessLines,
  hasStoreBridgeCredentials,
  loadStoreBridgeConfig,
} from "@/lib/store-bridge";

const LINE_LABELS: Record<"wire" | "store" | "workshop", string> = {
  wire: "سلك",
  store: "محل",
  workshop: "ورشة",
};

const LINE_CLASS: Record<"wire" | "store" | "workshop", string> = {
  wire: "bg-emerald-50 text-emerald-800 border-emerald-200",
  store: "bg-sky-50 text-sky-800 border-sky-200",
  workshop: "bg-amber-50 text-amber-900 border-amber-200",
};

function balanceMap(list: Customer[]): Record<string, number> {
  if (typeof window === "undefined") return {};
  const next: Record<string, number> = {};
  for (const customer of list) {
    next[customer.id] = resolveCustomerBalance(customer);
  }
  return next;
}

export function CustomerList() {
  const [query, setQuery] = useState("");
  const [allCustomers, setAllCustomers] = useState(mergeCustomers);
  const [balances, setBalances] = useState(() => balanceMap(mergeCustomers()));
  const [linesByStoreId, setLinesByStoreId] = useState<
    Record<string, Array<"wire" | "store" | "workshop">>
  >({});
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    function refresh() {
      const merged = mergeCustomers();
      setAllCustomers(merged);
      setBalances(balanceMap(merged));
    }
    window.addEventListener("upvc-accounting-updated", refresh);
    window.addEventListener("upvc-customers-updated", refresh);
    return () => {
      window.removeEventListener("upvc-accounting-updated", refresh);
      window.removeEventListener("upvc-customers-updated", refresh);
    };
  }, []);

  useEffect(() => {
    const cfg = loadStoreBridgeConfig();
    if (!hasStoreBridgeCredentials(cfg)) return;
    const ids = allCustomers
      .map((c) => c.storeCustomerId)
      .filter((id): id is string => Boolean(id));
    if (ids.length === 0) return;
    let cancelled = false;
    void fetchStoreCustomerBusinessLines(ids, cfg).then((map) => {
      if (!cancelled) setLinesByStoreId(map);
    });
    return () => {
      cancelled = true;
    };
  }, [allCustomers]);

  const filtered = allCustomers.filter((customer) =>
    smartSearchMatch(deferredQuery, [
      customer.name,
      customer.phone,
      customer.address,
      customer.note,
    ])
  );

  return (
    <div className="flex flex-col gap-4">
      <label className="relative block">
        <span className="sr-only">بحث عن عميل</span>
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالاسم أو الموبايل أو العنوان…"
          className="w-full rounded-2xl border border-border bg-card py-3 pr-11 pl-4 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
          لا يوجد عميل مطابق للبحث
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((customer) => {
            const balance = balances[customer.id] ?? customer.balance;
            const owes = balance > 0;
            const lines = customer.storeCustomerId
              ? linesByStoreId[customer.storeCustomerId] || []
              : [];
            return (
              <li key={customer.id}>
                <Link
                  href={ROUTES.design.newProject(customer.id)}
                  className="block rounded-2xl border border-border bg-card p-4 shadow-[0_2px_10px_rgba(15,20,28,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-foreground">
                        {customer.name}
                      </h2>
                      <p className="mt-0.5 text-sm text-muted" dir="ltr">
                        {customer.phone}
                      </p>
                      {lines.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {lines.map((line) => (
                            <span
                              key={line}
                              className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${LINE_CLASS[line]}`}
                            >
                              {LINE_LABELS[line]}
                            </span>
                          ))}
                          {lines.length > 1 ? (
                            <span className="inline-flex rounded-md border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] font-bold text-muted">
                              أكتر من حاجة
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      {customer.address ? (
                        <p className="mt-0.5 text-xs text-muted">
                          {customer.address}
                        </p>
                      ) : null}
                      {customer.note ? (
                        <p className="mt-1 text-xs text-muted line-clamp-2">
                          ملاحظة: {customer.note}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                      مشروع جديد
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
                    <div>
                      <p className="text-[11px] text-muted">متبقي</p>
                      <p
                        className={`mt-0.5 text-sm font-bold ${
                          owes ? "text-[#E85A8A]" : "text-emerald-600"
                        }`}
                      >
                        {owes
                          ? `${formatCurrency(balance)} ج.م`
                          : "لا يوجد"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted">آخر تعامل</p>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">
                        {formatDate(customer.lastDealAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted">المشاريع</p>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">
                        {customer.projectsCount}
                      </p>
                    </div>
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
