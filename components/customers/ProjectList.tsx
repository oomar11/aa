"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCustomerById, type Customer } from "@/lib/customers";
import { resolveCustomerBalance } from "@/lib/customer-balance";
import {
  deleteProject,
  getProjectsForCustomer,
  PROJECTS_UPDATED_EVENT,
  type Project,
} from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import { formatCurrency, formatDate } from "@/lib/utils";
import { WORKFLOW_VISUAL } from "@/lib/workshop";
import { WorkflowBadge } from "@/components/workshop/WorkflowBadge";

type Props = {
  customerId: string;
};

function readCustomer(customerId: string): Customer | null {
  return getCustomerById(customerId) ?? null;
}

function snapshot(customerId: string) {
  const found = readCustomer(customerId);
  return {
    customer: found,
    balance:
      found && typeof window !== "undefined"
        ? resolveCustomerBalance(found)
        : found?.balance ?? 0,
    projectList:
      typeof window === "undefined" ? [] : getProjectsForCustomer(customerId),
  };
}

export function ProjectList({ customerId }: Props) {
  const initial = snapshot(customerId);
  const [activeCustomerId, setActiveCustomerId] = useState(customerId);
  const [customer, setCustomer] = useState<Customer | null>(initial.customer);
  const [balance, setBalance] = useState(initial.balance);
  const [projectList, setProjectList] = useState<Project[]>(initial.projectList);

  if (customerId !== activeCustomerId) {
    const next = snapshot(customerId);
    setActiveCustomerId(customerId);
    setCustomer(next.customer);
    setBalance(next.balance);
    setProjectList(next.projectList);
  }

  useEffect(() => {
    function refresh() {
      const next = snapshot(customerId);
      setCustomer(next.customer);
      setBalance(next.balance);
      setProjectList(next.projectList);
    }
    window.addEventListener("upvc-accounting-updated", refresh);
    window.addEventListener(PROJECTS_UPDATED_EVENT, refresh);
    return () => {
      window.removeEventListener("upvc-accounting-updated", refresh);
      window.removeEventListener(PROJECTS_UPDATED_EVENT, refresh);
    };
  }, [customerId]);

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
    const next = snapshot(customerId);
    setCustomer(next.customer);
    setBalance(next.balance);
    setProjectList(next.projectList);
  }

  const openCount = useMemo(
    () => projectList.filter((p) => p.workflow !== "done").length,
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
              متبقي:{" "}
              <strong
                className={
                  balance > 0 ? "text-[#E85A8A]" : "text-foreground"
                }
              >
                {balance > 0
                  ? `${formatCurrency(balance)} ج.م`
                  : "لا يوجد"}
              </strong>
            </span>
          ) : null}
        </div>
      </div>

      <Link
        href={ROUTES.design.newProject(customerId)}
        className="flex min-h-[100px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-card text-primary transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:bg-primary-soft active:scale-[0.98]"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-2xl font-light leading-none text-white">
          +
        </span>
        <span className="text-sm font-semibold">مشروع جديد</span>
      </Link>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">المشاريع</h2>
        <p className="text-xs text-muted">اختر مشروعاً لعرض البنود</p>
      </div>

      {projectList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted">
          لا توجد مشاريع لهذا العميل حالياً
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {projectList.map((project) => {
            const visual = WORKFLOW_VISUAL[project.workflow];
            return (
            <li key={project.id}>
              <div
                className={`rounded-2xl border border-s-[3px] bg-card p-4 shadow-[0_2px_10px_rgba(15,20,28,0.04)] transition-all duration-300 hover:-translate-y-0.5 ${visual.rail} border-border`}
              >
                <Link
                  href={ROUTES.design.editor(customerId, project.id)}
                  className="block active:scale-[0.99]"
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
                    <WorkflowBadge workflow={project.workflow} />
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

                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                  <Link
                    href={ROUTES.design.editor(customerId, project.id)}
                    className="min-w-[7rem] flex-1 rounded-xl bg-primary-soft px-3 py-2 text-center text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    فتح البنود
                  </Link>
                  {project.workflow === "quote" ? (
                    <Link
                      href={ROUTES.accounting.depositForProject(
                        customerId,
                        project.id
                      )}
                      className="min-w-[7rem] flex-1 rounded-xl bg-primary px-3 py-2 text-center text-xs font-semibold text-white"
                    >
                      تسجيل دفعة
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleDeleteProject(project)}
                    className="min-w-[7rem] flex-1 rounded-xl border border-[#E85A8A]/35 bg-background px-3 py-2 text-center text-xs font-semibold text-[#E85A8A] transition-colors hover:bg-[#E85A8A]/10"
                  >
                    حذف
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
