"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  mergeCustomers,
  type Customer,
} from "@/lib/customers";
import { resolveCustomerBalance } from "@/lib/customer-balance";
import { itemTotalPrice } from "@/lib/design-items";
import {
  deleteProject,
  getItemsForProject,
  getProjectsForCustomer,
  listAllProjects,
  PROJECTS_UPDATED_EVENT,
  type Project,
} from "@/lib/projects";
import { formatCurrency, smartSearchMatch } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import { WORKFLOW_LABELS } from "@/lib/workshop";

type Tab = "customers" | "projects";

function statusLabel(project: Project): string {
  return WORKFLOW_LABELS[project.workflow];
}

function mergeProjects(): Project[] {
  if (typeof window === "undefined") return listAllProjects();
  return listAllProjects();
}

function balanceMap(list: Customer[]): Record<string, number> {
  if (typeof window === "undefined") return {};
  const next: Record<string, number> = {};
  for (const customer of list) {
    next[customer.id] = resolveCustomerBalance(customer);
  }
  return next;
}
function projectSaleTotal(projectId: string): number {
  return getItemsForProject(projectId).reduce(
    (sum, item) => sum + itemTotalPrice(item),
    0
  );
}

function customerSaleTotal(customerId: string): number {
  return getProjectsForCustomer(customerId).reduce(
    (sum, project) => sum + projectSaleTotal(project.id),
    0
  );
}

function FolderIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2h8.5A1.5 1.5 0 0 1 21 9.5v7A1.5 1.5 0 0 1 19.5 18h-15A1.5 1.5 0 0 1 3 16.5v-9z" />
    </svg>
  );
}

function PeopleIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="9" cy="8" r="3" fill={active ? "currentColor" : "none"} />
      <circle cx="16.5" cy="9" r="2.25" fill={active ? "currentColor" : "none"} />
      <path d="M3.5 18c1.2-2.8 3.2-4 5.5-4s4.3 1.2 5.5 4" />
      <path d="M14 18c.6-1.6 1.7-2.5 3.2-2.5 1.1 0 2 .4 2.8 1.2" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 shrink-0 text-muted transition-transform duration-300 ${
        open ? "rotate-180" : ""
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function SearchIcon() {
  return (
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
  );
}

export function OrdersBrowser() {
  const [tab, setTab] = useState<Tab>("customers");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [collapsedOverride, setCollapsedOverride] = useState<Set<string>>(
    () => new Set()
  );
  const [allCustomers, setAllCustomers] = useState(mergeCustomers);
  const [allProjects, setAllProjects] = useState(mergeProjects);
  const [balances, setBalances] = useState(() => balanceMap(mergeCustomers()));
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    function refresh() {
      const mergedCustomers = mergeCustomers();
      setAllCustomers(mergedCustomers);
      setBalances(balanceMap(mergedCustomers));
      setAllProjects(mergeProjects());
    }
    window.addEventListener("upvc-accounting-updated", refresh);
    window.addEventListener("upvc-customers-updated", refresh);
    window.addEventListener(PROJECTS_UPDATED_EVENT, refresh);
    return () => {
      window.removeEventListener("upvc-accounting-updated", refresh);
      window.removeEventListener("upvc-customers-updated", refresh);
      window.removeEventListener(PROJECTS_UPDATED_EVENT, refresh);
    };
  }, []);

  function handleDeleteProject(project: Project) {
    const label = project.name.trim() || "المشروع";
    if (
      !window.confirm(
        `هل تريد حذف «${label}» نهائياً؟ سيتم حذف جميع البنود المرتبطة به، ولا يمكن التراجع.`
      )
    ) {
      return;
    }
    deleteProject(project.id);
    setAllProjects(mergeProjects());
  }

  const customerById = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const customer of allCustomers) map.set(customer.id, customer);
    return map;
  }, [allCustomers]);

  const projectsByCustomer = useMemo(() => {
    const map = new Map<string, Project[]>();
    for (const project of allProjects) {
      const list = map.get(project.customerId) ?? [];
      list.push(project);
      map.set(project.customerId, list);
    }
    for (const [, list] of map) {
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    return map;
  }, [allProjects]);

  const filteredCustomers = useMemo(() => {
    return allCustomers.filter((customer) => {
      const linked = projectsByCustomer.get(customer.id) ?? [];
      const customerMatch = smartSearchMatch(deferredQuery, [
        customer.name,
        customer.phone,
        customer.address,
        customer.note,
      ]);
      if (customerMatch) return true;
      return linked.some((project) =>
        smartSearchMatch(deferredQuery, [
          project.name,
          project.location,
          statusLabel(project),
        ])
      );
    });
  }, [allCustomers, deferredQuery, projectsByCustomer]);

  const autoExpandIds = useMemo(() => {
    if (!deferredQuery.trim()) return new Set<string>();
    const ids = new Set<string>();
    for (const customer of filteredCustomers) {
      const customerOnly = smartSearchMatch(deferredQuery, [
        customer.name,
        customer.phone,
        customer.address,
        customer.note,
      ]);
      if (customerOnly) continue;
      const linked = projectsByCustomer.get(customer.id) ?? [];
      if (
        linked.some((project) =>
          smartSearchMatch(deferredQuery, [
            project.name,
            project.location,
            statusLabel(project),
          ])
        )
      ) {
        ids.add(customer.id);
      }
    }
    return ids;
  }, [deferredQuery, filteredCustomers, projectsByCustomer]);

  const filteredProjects = useMemo(() => {
    return allProjects
      .filter((project) => {
        const customer = customerById.get(project.customerId);
        return smartSearchMatch(deferredQuery, [
          project.name,
          project.location,
          statusLabel(project),
          customer?.name,
          customer?.phone,
        ]);
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [allProjects, customerById, deferredQuery]);

  function isExpanded(id: string) {
    if (collapsedOverride.has(id)) return false;
    return expandedId === id || autoExpandIds.has(id);
  }

  function toggleCustomer(id: string) {
    if (isExpanded(id)) {
      setExpandedId(null);
      if (autoExpandIds.has(id)) {
        setCollapsedOverride((prev) => new Set(prev).add(id));
      }
      return;
    }
    setExpandedId(id);
    setCollapsedOverride((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="relative block">
        <span className="sr-only">بحث</span>
        <SearchIcon />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCollapsedOverride(new Set());
          }}
          placeholder={
            tab === "customers"
              ? "ابحث عن عميل أو مشروع…"
              : "ابحث عن مشروع أو عميل…"
          }
          className="w-full rounded-2xl border border-border bg-card py-3 pr-11 pl-4 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>

      <div
        role="tablist"
        aria-label="تصفية الطلبات"
        className="grid grid-cols-2 border-b border-border"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "projects"}
          onClick={() => setTab("projects")}
          className={`relative flex flex-col items-center gap-1 pb-2.5 pt-1 text-xs font-semibold transition-colors duration-300 ${
            tab === "projects" ? "text-primary" : "text-muted"
          }`}
        >
          <FolderIcon active={tab === "projects"} />
          المشاريع
          {tab === "projects" ? (
            <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-primary" />
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "customers"}
          onClick={() => setTab("customers")}
          className={`relative flex flex-col items-center gap-1 pb-2.5 pt-1 text-xs font-semibold transition-colors duration-300 ${
            tab === "customers" ? "text-primary" : "text-muted"
          }`}
        >
          <PeopleIcon active={tab === "customers"} />
          العملاء
          {tab === "customers" ? (
            <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-primary" />
          ) : null}
        </button>
      </div>

      {tab === "customers" ? (
        filteredCustomers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center">
            <p className="text-sm text-muted">
              {deferredQuery.trim()
                ? "لا يوجد عميل مطابق للبحث"
                : "لا يوجد عملاء بعد — ابدأ بطلب جديد"}
            </p>
            {!deferredQuery.trim() ? (
              <Link
                href={ROUTES.design.hub}
                className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
              >
                طلب جديد
              </Link>
            ) : null}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {filteredCustomers.map((customer) => {
              const linked = projectsByCustomer.get(customer.id) ?? [];
              const open = isExpanded(customer.id);
              const sale = customerSaleTotal(customer.id);
              const balance = balances[customer.id] ?? customer.balance;
              const owes = balance > 0;

              return (
                <li
                  key={customer.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_10px_rgba(15,20,28,0.04)]"
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => toggleCustomer(customer.id)}
                    className="flex w-full items-start gap-3 p-4 text-start transition-colors hover:bg-primary-soft/40 active:bg-primary-soft/60"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                      {customer.name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-bold text-foreground">
                        {customer.name}
                      </h2>
                      <p className="mt-0.5 truncate text-sm text-muted" dir="ltr">
                        {customer.phone}
                        {customer.address ? ` • ${customer.address}` : ""}
                      </p>
                      <p className="mt-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        متبقي فواتير:{" "}
                        {owes
                          ? `${formatCurrency(balance)} ج.م`
                          : "لا يوجد"}{" "}
                        • بيع: {formatCurrency(sale)} ج.م
                      </p>
                    </div>
                    <ChevronIcon open={open} />
                  </button>

                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                      open
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="border-t border-border bg-background/50 px-4 py-3">
                        <p className="mb-2 text-xs font-semibold text-muted">
                          المشاريع ({linked.length})
                        </p>
                        {linked.length === 0 ? (
                          <p className="py-3 text-center text-sm text-muted">
                            لا توجد مشاريع لهذا العميل
                          </p>
                        ) : (
                          <ul className="flex flex-col gap-1">
                            {linked.map((project, index) => {
                              const projectSale = projectSaleTotal(project.id);
                              return (
                                <li key={project.id}>
                                  <div className="flex items-center gap-1 rounded-xl pe-1 transition-colors hover:bg-card">
                                    <Link
                                      href={ROUTES.design.editor(
                                        customer.id,
                                        project.id
                                      )}
                                      className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2.5 active:bg-card"
                                    >
                                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                                        {index + 1}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-foreground">
                                          {project.name}
                                          {project.location ? (
                                            <span className="font-normal text-muted">
                                              {" "}
                                              · {project.location}
                                            </span>
                                          ) : null}
                                        </p>
                                        <p className="mt-0.5 text-xs text-muted">
                                          {statusLabel(project)}
                                          {projectSale > 0
                                            ? ` · بيع: ${formatCurrency(projectSale)} ج.م`
                                            : ""}
                                        </p>
                                      </div>
                                    </Link>
                                    <button
                                      type="button"
                                      aria-label={`حذف ${project.name}`}
                                      onClick={() =>
                                        handleDeleteProject(project)
                                      }
                                      className="shrink-0 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#E85A8A] transition-colors hover:bg-[#E85A8A]/10"
                                    >
                                      حذف
                                    </button>
                                    {project.workflow === "quote" ? (
                                      <Link
                                        href={ROUTES.accounting.depositForProject(
                                          customer.id,
                                          project.id
                                        )}
                                        className="shrink-0 rounded-lg bg-primary px-2.5 py-2 text-xs font-semibold text-white"
                                      >
                                        دفعة
                                      </Link>
                                    ) : null}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        <div className="mt-2 flex gap-2">
                          <Link
                            href={ROUTES.design.newProject(customer.id)}
                            className="flex-1 rounded-xl border border-dashed border-primary/40 py-2 text-center text-xs font-semibold text-primary transition-colors hover:bg-primary-soft"
                          >
                            مشروع جديد
                          </Link>
                          <Link
                            href={ROUTES.design.editCustomer(customer.id)}
                            className="flex-1 rounded-xl border border-border py-2 text-center text-xs font-semibold text-muted transition-colors hover:bg-card"
                          >
                            تعديل العميل
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center">
          <p className="text-sm text-muted">
            {deferredQuery.trim()
              ? "لا يوجد مشروع مطابق للبحث"
              : "لا توجد مشاريع بعد — ابدأ بطلب جديد"}
          </p>
          {!deferredQuery.trim() ? (
            <Link
              href={ROUTES.design.hub}
              className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
            >
              طلب جديد
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filteredProjects.map((project) => {
            const customer = customerById.get(project.customerId);
            const projectSale = projectSaleTotal(project.id);
            return (
              <li key={project.id}>
                <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_2px_10px_rgba(15,20,28,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30">
                  <Link
                    href={ROUTES.design.editor(
                      project.customerId,
                      project.id
                    )}
                    className="block active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-foreground">
                          {project.name}
                        </h3>
                        <p className="mt-0.5 text-sm text-muted">
                          {customer?.name ?? "عميل"}
                          {project.location ? ` · ${project.location}` : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          project.workflow === "workshop"
                            ? "bg-primary text-white"
                            : project.workflow === "queued"
                              ? "bg-primary-soft text-primary"
                              : "bg-background text-muted"
                        }`}
                      >
                        {statusLabel(project)}
                      </span>
                    </div>
                    {projectSale > 0 ? (
                      <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        بيع: {formatCurrency(projectSale)} ج.م
                      </p>
                    ) : null}
                  </Link>
                  <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-border pt-3">
                    {project.workflow === "quote" ? (
                      <Link
                        href={ROUTES.accounting.depositForProject(
                          project.customerId,
                          project.id
                        )}
                        className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        تسجيل دفعة
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleDeleteProject(project)}
                      className="rounded-xl border border-[#E85A8A]/35 px-3 py-2 text-xs font-semibold text-[#E85A8A] transition-colors hover:bg-[#E85A8A]/10"
                    >
                      حذف المشروع
                    </button>
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
