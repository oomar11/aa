"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { mergeCustomers, type Customer } from "@/lib/customers";
import { resolveCustomerBalance } from "@/lib/customer-balance";
import { itemTotalPrice } from "@/lib/design-items";
import {
  deleteProject,
  getItemsForProject,
  getProjectsForCustomer,
  listAllProjects,
  PROJECTS_UPDATED_EVENT,
  type Project,
  type ProjectWorkflow,
} from "@/lib/projects";
import { formatCurrency, smartSearchMatch } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import {
  compareProjectsByWorkflowThenDate,
  DELIVERY_LABELS,
  HOLD_VISUAL,
  isProjectOnHold,
  projectDeliveryStatus,
  WORKFLOW_LABELS,
  WORKFLOW_VISUAL,
} from "@/lib/workshop";
import { WorkflowBadge } from "@/components/workshop/WorkflowBadge";
import { ProjectMoneyLine } from "@/components/projects/ProjectMoneyLine";

type ViewTab = "quotes" | "all" | "customers";
type WorkflowFilter =
  | "all"
  | ProjectWorkflow
  | "held"
  | "awaiting"
  | "delivered";

function statusLabel(project: Project): string {
  if (isProjectOnHold(project)) {
    return `متوقف${project.holdReason ? ` ${project.holdReason}` : ""}`;
  }
  if (project.workflow === "done") {
    const delivery = projectDeliveryStatus(project);
    if (delivery) return DELIVERY_LABELS[delivery];
  }
  return WORKFLOW_LABELS[project.workflow];
}

function matchesWorkflowFilter(
  project: Project,
  filter: WorkflowFilter
): boolean {
  if (filter === "all") return true;
  if (filter === "held") return isProjectOnHold(project);
  if (filter === "awaiting") {
    return projectDeliveryStatus(project) === "awaiting";
  }
  if (filter === "delivered") {
    return projectDeliveryStatus(project) === "delivered";
  }
  if (filter === "workshop" || filter === "queued") {
    return project.workflow === filter && !isProjectOnHold(project);
  }
  return project.workflow === filter;
}

const ADVANCED_FILTERS: { id: WorkflowFilter; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "quote", label: WORKFLOW_LABELS.quote },
  { id: "queued", label: WORKFLOW_LABELS.queued },
  { id: "workshop", label: WORKFLOW_LABELS.workshop },
  { id: "held", label: "متوقف" },
  { id: "awaiting", label: DELIVERY_LABELS.awaiting },
  { id: "delivered", label: DELIVERY_LABELS.delivered },
];

function mergeProjects(): Project[] {
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

export function OrdersBrowser() {
  const [tab, setTab] = useState<ViewTab>("quotes");
  const [query, setQuery] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState<WorkflowFilter>("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
        `هل تريد حذف «${label}» نهائياً؟ سيتم حذف جميع البنود المرتبطة به.`
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
      list.sort(compareProjectsByWorkflowThenDate);
    }
    return map;
  }, [allProjects]);

  const quoteCount = useMemo(
    () => allProjects.filter((p) => p.workflow === "quote").length,
    [allProjects]
  );

  const filteredProjects = useMemo(() => {
    return allProjects
      .filter((project) => {
        if (tab === "quotes" && project.workflow !== "quote") return false;
        if (!matchesWorkflowFilter(project, workflowFilter)) return false;
        const customer = customerById.get(project.customerId);
        return smartSearchMatch(deferredQuery, [
          project.name,
          project.location,
          statusLabel(project),
          customer?.name,
          customer?.phone,
        ]);
      })
      .sort(compareProjectsByWorkflowThenDate);
  }, [allProjects, customerById, deferredQuery, tab, workflowFilter]);

  const filteredCustomers = useMemo(() => {
    return allCustomers.filter((customer) => {
      const linked = projectsByCustomer.get(customer.id) ?? [];
      if (workflowFilter !== "all") {
        if (!linked.some((p) => matchesWorkflowFilter(p, workflowFilter)))
          return false;
      }
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
  }, [allCustomers, deferredQuery, projectsByCustomer, workflowFilter]);

  return (
    <div className="flex flex-col gap-3">
      <label className="relative block">
        <span className="sr-only">بحث</span>
        <SearchIcon />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن مشروع أو عميل…"
          className="w-full rounded-2xl border border-border bg-card py-3 pr-11 pl-4 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>

      <div
        role="tablist"
        aria-label="عرض الطلبات"
        className="grid grid-cols-3 border-b border-border"
      >
        {(
          [
            { id: "quotes" as const, label: `المقايسات (${quoteCount})` },
            { id: "all" as const, label: "كل المشاريع" },
            { id: "customers" as const, label: "العملاء" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={tab === opt.id}
            onClick={() => {
              setTab(opt.id);
              if (opt.id === "quotes") setWorkflowFilter("all");
            }}
            className={`relative pb-2.5 pt-1 text-xs font-semibold transition-colors ${
              tab === opt.id ? "text-primary" : "text-muted"
            }`}
          >
            {opt.label}
            {tab === opt.id ? (
              <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-primary" />
            ) : null}
          </button>
        ))}
      </div>

      {tab !== "quotes" ? (
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-xs font-semibold text-muted"
          >
            {showAdvanced ? "إخفاء الفلتر" : "فلتر متقدم"}
            {workflowFilter !== "all" ? " · مفعّل" : ""}
          </button>
          {showAdvanced ? (
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {ADVANCED_FILTERS.map((opt) => {
                const active = workflowFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setWorkflowFilter(opt.id)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                      active
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-card text-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "customers" ? (
        filteredCustomers.length === 0 ? (
          <EmptyState query={deferredQuery} />
        ) : (
          <ul className="flex flex-col gap-3">
            {filteredCustomers.map((customer) => {
              const linkedRaw = projectsByCustomer.get(customer.id) ?? [];
              const linked =
                workflowFilter === "all"
                  ? linkedRaw
                  : linkedRaw.filter((p) =>
                      matchesWorkflowFilter(p, workflowFilter)
                    );
              const open = expandedId === customer.id;
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
                    onClick={() =>
                      setExpandedId((prev) =>
                        prev === customer.id ? null : customer.id
                      )
                    }
                    className="flex w-full items-start gap-3 p-4 text-start transition-colors hover:bg-primary-soft/40"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                      {customer.name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-bold text-foreground">
                        {customer.name}
                      </h2>
                      <p
                        className="mt-0.5 truncate text-sm text-muted"
                        dir="ltr"
                      >
                        {customer.phone}
                      </p>
                      <p className="mt-1.5 text-xs font-semibold text-emerald-600">
                        متبقي:{" "}
                        {owes
                          ? `${formatCurrency(balance)} ج.م`
                          : "لا يوجد"}{" "}
                        · بيع: {formatCurrency(sale)} ج.م
                      </p>
                    </div>
                    <ChevronIcon open={open} />
                  </button>

                  {open ? (
                    <div className="border-t border-border bg-background/50 px-4 py-3">
                      {linked.length === 0 ? (
                        <p className="py-3 text-center text-sm text-muted">
                          لا توجد مشاريع
                        </p>
                      ) : (
                        <ul className="flex flex-col gap-1">
                          {linked.map((project) => (
                            <li key={project.id}>
                              <Link
                                href={ROUTES.design.editor(
                                  customer.id,
                                  project.id
                                )}
                                className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-card"
                              >
                                <WorkflowBadge
                                  workflow={project.workflow}
                                  project={project}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold">
                                    {project.name}
                                  </p>
                                  <ProjectMoneyLine
                                    projectId={project.id}
                                    className="mt-1"
                                  />
                                </div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-2 flex gap-2">
                        <Link
                          href={ROUTES.design.newProject(customer.id)}
                          className="flex-1 rounded-xl border border-dashed border-primary/40 py-2 text-center text-xs font-semibold text-primary"
                        >
                          مشروع جديد
                        </Link>
                        <Link
                          href={ROUTES.design.editCustomer(customer.id)}
                          className="flex-1 rounded-xl border border-border py-2 text-center text-xs font-semibold text-muted"
                        >
                          تعديل العميل
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )
      ) : filteredProjects.length === 0 ? (
        <EmptyState query={deferredQuery} />
      ) : (
        <ul className="flex flex-col gap-3">
          {filteredProjects.map((project) => {
            const customer = customerById.get(project.customerId);
            const visual = isProjectOnHold(project)
              ? HOLD_VISUAL
              : WORKFLOW_VISUAL[project.workflow];
            return (
              <li key={project.id}>
                <div
                  className={`rounded-2xl border border-s-[3px] bg-card p-4 shadow-[0_2px_10px_rgba(15,20,28,0.04)] ${visual.rail} border-border`}
                >
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
                      <WorkflowBadge
                        workflow={project.workflow}
                        project={project}
                      />
                    </div>
                    <ProjectMoneyLine projectId={project.id} className="mt-2" />
                  </Link>
                  <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-border pt-3">
                    {project.workflow === "quote" ? (
                      <Link
                        href={ROUTES.accounting.depositForProject(
                          project.customerId,
                          project.id
                        )}
                        className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white"
                      >
                        تسجيل دفعة
                      </Link>
                    ) : null}
                    <RowMenu
                      onDelete={() => handleDeleteProject(project)}
                      editCustomerHref={ROUTES.design.editCustomer(
                        project.customerId
                      )}
                    />
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

function EmptyState({ query }: { query: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center">
      <p className="text-sm text-muted">
        {query.trim()
          ? "لا توجد نتائج"
          : "لا توجد مشاريع بعد — ابدأ بطلب جديد"}
      </p>
      {!query.trim() ? (
        <Link
          href={ROUTES.design.hub}
          className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
        >
          طلب جديد
        </Link>
      ) : null}
    </div>
  );
}

function RowMenu({
  onDelete,
  editCustomerHref,
}: {
  onDelete: () => void;
  editCustomerHref: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold"
        aria-label="المزيد"
      >
        ⋯
      </button>
      {open ? (
        <div className="absolute left-0 top-[calc(100%+4px)] z-20 min-w-[140px] overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg">
          <Link
            href={editCustomerHref}
            className="block px-3 py-2 text-right text-xs font-semibold hover:bg-primary-soft"
            onClick={() => setOpen(false)}
          >
            تعديل العميل
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="block w-full px-3 py-2 text-right text-xs font-semibold text-[#E85A8A] hover:bg-[#E85A8A]/10"
          >
            حذف المشروع
          </button>
        </div>
      ) : null}
    </div>
  );
}
