"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  customers,
  loadLocalCustomers,
  type Customer,
} from "@/lib/customers";
import { listAllProjects, type Project } from "@/lib/projects";
import { smartSearchMatch } from "@/lib/utils";
import { WORKFLOW_LABELS } from "@/lib/workshop";

function mergeCustomers(): Customer[] {
  if (typeof window === "undefined") return customers;
  const local = loadLocalCustomers();
  const localIds = new Set(local.map((c) => c.id));
  return [...local, ...customers.filter((c) => !localIds.has(c.id))];
}

type Props = {
  value: string;
  onChange: (projectId: string) => void;
  error?: boolean;
};

/**
 * اختيار مشروع لاستلام دفعة: بحث بالاسم/الهاتف/الموقع ثم بطاقات واضحة.
 */
export function PaymentProjectPicker({ value, onChange, error }: Props) {
  const [allCustomers] = useState(mergeCustomers);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(!value);
  const deferredQuery = useDeferredValue(query);
  const searchRef = useRef<HTMLInputElement>(null);

  const customerById = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const customer of allCustomers) map.set(customer.id, customer);
    return map;
  }, [allCustomers]);

  const openProjects = useMemo(() => {
    return listAllProjects()
      .filter((p) => p.workflow !== "done")
      .sort((a, b) => {
        // المقايسات أولاً (الأقرب لاستلام دفعة)
        if (a.workflow === "quote" && b.workflow !== "quote") return -1;
        if (b.workflow === "quote" && a.workflow !== "quote") return 1;
        const ca = customerById.get(a.customerId)?.name ?? "";
        const cb = customerById.get(b.customerId)?.name ?? "";
        if (ca !== cb) return ca.localeCompare(cb, "ar");
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }, [customerById]);

  const selected = useMemo(
    () => openProjects.find((p) => p.id === value),
    [openProjects, value]
  );

  const selectedCustomer = selected
    ? customerById.get(selected.customerId)
    : undefined;

  const filtered = useMemo(() => {
    return openProjects.filter((project) => {
      const customer = customerById.get(project.customerId);
      return smartSearchMatch(deferredQuery, [
        project.name,
        project.location,
        customer?.name,
        customer?.phone,
        WORKFLOW_LABELS[project.workflow],
      ]);
    });
  }, [openProjects, customerById, deferredQuery]);

  useEffect(() => {
    if (open && !selected) {
      searchRef.current?.focus();
    }
  }, [open, selected]);

  function selectProject(project: Project) {
    onChange(project.id);
    setQuery("");
    setOpen(false);
  }

  function clearSelection() {
    onChange("");
    setQuery("");
    setOpen(true);
  }

  if (selected && !open) {
    return (
      <div className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">
          المشروع <span className="text-[#E85A8A]">*</span>
        </span>
        <div
          className={`rounded-2xl border bg-card p-3.5 ${
            error ? "border-[#E85A8A]" : "border-primary/35"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">
                {selected.name}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted">
                {selectedCustomer?.name ?? "عميل"}
                {selectedCustomer?.phone ? ` · ${selectedCustomer.phone}` : ""}
                {selected.location ? ` · ${selected.location}` : ""}
              </p>
              <span className="mt-2 inline-block rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                {WORKFLOW_LABELS[selected.workflow]}
              </span>
            </div>
            <button
              type="button"
              onClick={clearSelection}
              className="shrink-0 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-background"
            >
              تغيير
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 text-right">
      <span className="text-sm font-medium">
        المشروع <span className="text-[#E85A8A]">*</span>
      </span>

      <div className="relative">
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="ابحث باسم العميل أو المشروع أو الهاتف…"
          className={`h-12 w-full rounded-2xl border bg-card py-3 ps-10 pe-4 text-sm outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 ${
            error ? "border-[#E85A8A]" : "border-border"
          }`}
          autoComplete="off"
        />
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
      </div>

      {selected ? (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="self-start text-xs font-semibold text-primary"
        >
          إلغاء والعودة للاختيار الحالي
        </button>
      ) : null}

      <div
        className={`max-h-64 overflow-y-auto rounded-2xl border border-border bg-card ${
          open ? "" : "hidden"
        }`}
      >
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">
            {openProjects.length === 0
              ? "لا توجد مشاريع مفتوحة"
              : "لا توجد نتائج مطابقة للبحث"}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((project) => {
              const customer = customerById.get(project.customerId);
              const isActive = project.id === value;
              return (
                <li key={project.id}>
                  <button
                    type="button"
                    onClick={() => selectProject(project)}
                    className={`flex w-full items-start justify-between gap-3 px-3.5 py-3 text-right transition-colors ${
                      isActive
                        ? "bg-primary-soft"
                        : "hover:bg-background active:bg-background"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">
                        {project.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {customer?.name ?? "عميل"}
                        {customer?.phone ? ` · ${customer.phone}` : ""}
                      </p>
                      {project.location ? (
                        <p className="mt-0.5 truncate text-[11px] text-muted">
                          {project.location}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        project.workflow === "quote"
                          ? "bg-background text-muted"
                          : "bg-primary-soft text-primary"
                      }`}
                    >
                      {WORKFLOW_LABELS[project.workflow]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
