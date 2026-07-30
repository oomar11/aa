"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  customers,
  loadLocalCustomers,
  type Customer,
} from "@/lib/customers";
import {
  loadLocalProjects,
  projects as seedProjects,
  type Project,
} from "@/lib/projects";

function statusLabel(status: Project["status"]): string {
  return status === "open" ? "مفتوح" : "مكتمل";
}

export function HomeDashboard() {
  const [allCustomers, setAllCustomers] = useState<Customer[]>(customers);
  const [allProjects, setAllProjects] = useState<Project[]>(seedProjects);

  useEffect(() => {
    const localCustomers = loadLocalCustomers();
    const localIds = new Set(localCustomers.map((c) => c.id));
    setAllCustomers([
      ...localCustomers,
      ...customers.filter((c) => !localIds.has(c.id)),
    ]);

    const localProjects = loadLocalProjects();
    const localProjectIds = new Set(localProjects.map((p) => p.id));
    setAllProjects([
      ...localProjects,
      ...seedProjects.filter((p) => !localProjectIds.has(p.id)),
    ]);
  }, []);

  const customerById = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const customer of allCustomers) map.set(customer.id, customer);
    return map;
  }, [allCustomers]);

  const recentProjects = useMemo(() => {
    return [...allProjects]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5);
  }, [allProjects]);

  return (
    <div className="flex flex-col gap-5 px-4 pt-2">
      <section className="rounded-2xl bg-primary px-4 py-5 text-primary-foreground shadow-[0_8px_24px_rgba(43,125,233,0.28)]">
        <p className="text-xs font-medium opacity-85">مرحباً بك في</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">UPVC Design</h1>
        <p className="mt-2 text-sm leading-relaxed opacity-90">
          من هنا تبدأ طلب جديد، أو تفتح آخر المشاريع. الطلبات والخامات من الشريط
          تحت.
        </p>
        <Link
          href="/design"
          className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-white text-sm font-bold text-primary transition-all duration-300 hover:brightness-105 active:scale-[0.98]"
        >
          طلب جديد
        </Link>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-foreground">آخر المشاريع</h2>
          <Link
            href="/orders"
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
                    href={`/design/editor?customer=${project.customerId}&project=${project.id}`}
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
                          project.status === "open"
                            ? "bg-primary-soft text-primary"
                            : "bg-background text-muted"
                        }`}
                      >
                        {statusLabel(project.status)}
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
