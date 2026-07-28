"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  customers,
  loadLocalCustomers,
  type Customer,
} from "@/lib/customers";
import { getProjectsForCustomer, type Project } from "@/lib/projects";
import { formatCurrency, formatDate } from "@/lib/utils";

type Props = {
  customerId: string;
};

export function ProjectList({ customerId }: Props) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [projectList, setProjectList] = useState<Project[]>([]);

  useEffect(() => {
    const all = [...loadLocalCustomers(), ...customers];
    setCustomer(all.find((c) => c.id === customerId) ?? null);
    setProjectList(getProjectsForCustomer(customerId));
  }, [customerId]);

  const openCount = useMemo(
    () => projectList.filter((p) => p.status === "open").length,
    [projectList]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs text-muted">العميل</p>
        <h1 className="mt-1 text-xl font-bold text-foreground">
          {customer?.name ?? "عميل"}
        </h1>
        {customer?.phone ? (
          <p className="mt-0.5 text-sm text-muted" dir="ltr">
            {customer.phone}
          </p>
        ) : null}
        <div className="mt-3 flex gap-4 text-xs text-muted">
          <span>
            المشاريع:{" "}
            <strong className="text-foreground">{projectList.length}</strong>
          </span>
          <span>
            مفتوحة: <strong className="text-foreground">{openCount}</strong>
          </span>
          {customer ? (
            <span>
              باقي عليه:{" "}
              <strong
                className={
                  customer.balance > 0 ? "text-[#E85A8A]" : "text-foreground"
                }
              >
                {customer.balance > 0
                  ? `${formatCurrency(customer.balance)} ج.م`
                  : "مفيش"}
              </strong>
            </span>
          ) : null}
        </div>
      </div>

      <Link
        href={`/design/projects/new?customer=${customerId}`}
        className="flex min-h-[100px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-card text-primary transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:bg-primary-soft active:scale-[0.98]"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-2xl font-light leading-none text-white">
          +
        </span>
        <span className="text-sm font-semibold">مشروع جديد</span>
      </Link>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">المشاريع</h2>
        <p className="text-xs text-muted">اختَر مشروع عشان تشوف البنود</p>
      </div>

      {projectList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted">
          مفيش مشاريع لهذا العميل بعد
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {projectList.map((project) => (
            <li key={project.id}>
              <Link
                href={`/design/editor?customer=${customerId}&project=${project.id}`}
                className="block rounded-2xl border border-border bg-card p-4 shadow-[0_2px_10px_rgba(15,20,28,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-foreground">
                      {project.name}
                    </h3>
                    {project.location ? (
                      <p className="mt-0.5 text-xs text-muted">
                        {project.location}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      project.status === "open"
                        ? "bg-primary-soft text-primary"
                        : "bg-background text-muted"
                    }`}
                  >
                    {project.status === "open" ? "مفتوح" : "مكتمل"}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm">
                  <div>
                    <p className="text-[11px] text-muted">تاريخ الإنشاء</p>
                    <p className="mt-0.5 font-semibold">
                      {formatDate(project.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted">عدد البنود</p>
                    <p className="mt-0.5 font-semibold">{project.itemsCount}</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/design/customers"
        className="block text-center text-sm font-medium text-muted transition-colors hover:text-primary"
      >
        رجوع للعملاء
      </Link>
    </div>
  );
}
