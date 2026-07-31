"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  customers,
  loadLocalCustomers,
  type Customer,
} from "@/lib/customers";
import { loadCompany } from "@/lib/company";
import {
  listAllProjects,
  PROJECTS_UPDATED_EVENT,
} from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import {
  getNextUpProject,
  listWorkshopProjects,
  WORKFLOW_LABELS,
} from "@/lib/workshop";

function mergeCustomers(): Customer[] {
  if (typeof window === "undefined") return customers;
  const localCustomers = loadLocalCustomers();
  const localIds = new Set(localCustomers.map((c) => c.id));
  return [
    ...localCustomers,
    ...customers.filter((c) => !localIds.has(c.id)),
  ];
}

export function HomeDashboard() {
  const [companyName, setCompanyName] = useState(() =>
    typeof window === "undefined"
      ? "UPVC Design"
      : loadCompany().name || "UPVC Design"
  );
  const [tick, setTick] = useState(0);
  const [allCustomers] = useState(mergeCustomers);

  useEffect(() => {
    function refreshCompany() {
      setCompanyName(loadCompany().name || "UPVC Design");
    }
    function refreshProjects() {
      setTick((n) => n + 1);
    }
    window.addEventListener("upvc-company-updated", refreshCompany);
    window.addEventListener(PROJECTS_UPDATED_EVENT, refreshProjects);
    return () => {
      window.removeEventListener("upvc-company-updated", refreshCompany);
      window.removeEventListener(PROJECTS_UPDATED_EVENT, refreshProjects);
    };
  }, []);

  const customerById = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const customer of allCustomers) map.set(customer.id, customer);
    return map;
  }, [allCustomers]);

  const allProjects = useMemo(() => listAllProjects(), [tick]);

  const recentProjects = useMemo(() => {
    return [...allProjects]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5);
  }, [allProjects]);

  const workshopCount = useMemo(() => listWorkshopProjects().length, [tick]);
  const nextUp = useMemo(() => getNextUpProject(), [tick]);

  return (
    <div className="flex flex-col gap-5 px-4 pt-2">
      <section className="rounded-2xl bg-primary px-4 py-5 text-primary-foreground shadow-[0_8px_24px_rgba(43,125,233,0.28)]">
        <p className="text-xs font-medium opacity-85">مرحباً بك في</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{companyName}</h1>
        <p className="mt-2 text-sm leading-relaxed opacity-90">
          المقايسة من الطلبات — والورشة للشغل اللي عليه عربون. آخر المشاريع تحت.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            href={ROUTES.design.hub}
            className="flex h-12 items-center justify-center rounded-xl bg-white text-sm font-bold text-primary transition-all duration-300 hover:brightness-105 active:scale-[0.98]"
          >
            طلب جديد
          </Link>
          <Link
            href={ROUTES.workshop}
            className="flex h-12 items-center justify-center rounded-xl border border-white/40 bg-white/15 text-sm font-bold text-white transition-all duration-300 hover:bg-white/25 active:scale-[0.98]"
          >
            الورشة
          </Link>
        </div>
      </section>

      <Link
        href={ROUTES.workshop}
        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 active:scale-[0.99]"
      >
        <div className="min-w-0 text-right">
          <p className="text-sm font-bold text-foreground">شغل الورشة</p>
          <p className="mt-0.5 text-xs text-muted">
            {workshopCount > 0
              ? `${workshopCount} تحت التنفيذ`
              : "مفيش شغل حالياً"}
            {nextUp ? ` · التالي: ${nextUp.name}` : ""}
          </p>
        </div>
        <span className="text-muted" aria-hidden>
          ‹
        </span>
      </Link>

      <Link
        href={ROUTES.accounting.hub}
        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 active:scale-[0.99]"
      >
        <div className="min-w-0 text-right">
          <p className="text-sm font-bold text-foreground">حسابات الشركة</p>
          <p className="mt-0.5 text-xs text-muted">
            فواتير · تحصيل · مصروفات
          </p>
        </div>
        <span className="text-muted" aria-hidden>
          ‹
        </span>
      </Link>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-foreground">آخر المشاريع</h2>
          <Link
            href={ROUTES.orders}
            className="text-xs font-semibold text-primary transition-opacity hover:opacity-80"
          >
            كل الطلبات
          </Link>
        </div>

        {recentProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
            لسه مفيش مشاريع — ابدأ بـ «طلب جديد»
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {recentProjects.map((project) => {
              const customer = customerById.get(project.customerId);
              return (
                <li key={project.id}>
                  <Link
                    href={ROUTES.design.editor(project.customerId, project.id)}
                    className="block rounded-2xl border border-border bg-card p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">
                          {project.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {customer?.name ?? "عميل"}
                          {project.location ? ` · ${project.location}` : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          project.workflow === "workshop"
                            ? "bg-primary text-white"
                            : project.workflow === "queued"
                              ? "bg-primary-soft text-primary"
                              : project.workflow === "done"
                                ? "bg-background text-muted"
                                : "bg-background text-muted"
                        }`}
                      >
                        {WORKFLOW_LABELS[project.workflow]}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
