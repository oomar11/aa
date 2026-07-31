"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  customers,
  loadLocalCustomers,
  type Customer,
} from "@/lib/customers";
import {
  listAllProjects,
  PROJECTS_UPDATED_EVENT,
  type Project,
} from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import { formatCurrency } from "@/lib/utils";
import {
  completeWorkshopProject,
  getNextUpProject,
  listQueuedProjects,
  listWorkshopProjects,
  moveInQueue,
  returnToQueue,
  scheduleProjectWithDeposit,
  startWorkshopProject,
  WORKFLOW_LABELS,
} from "@/lib/workshop";
import { NumericInput } from "@/components/ui/NumericInput";
import { todayIsoDate } from "@/lib/accounting";

function mergeCustomers(): Customer[] {
  if (typeof window === "undefined") return customers;
  const local = loadLocalCustomers();
  const localIds = new Set(local.map((c) => c.id));
  return [...local, ...customers.filter((c) => !localIds.has(c.id))];
}

function customerName(
  map: Map<string, Customer>,
  customerId: string
): string {
  return map.get(customerId)?.name ?? "عميل";
}

export function WorkshopBoard() {
  const [tick, setTick] = useState(0);
  const [depositProjectId, setDepositProjectId] = useState<string | null>(
    null
  );
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositError, setDepositError] = useState("");

  useEffect(() => {
    function refresh() {
      setTick((n) => n + 1);
    }
    window.addEventListener(PROJECTS_UPDATED_EVENT, refresh);
    window.addEventListener("upvc-accounting-updated", refresh);
    return () => {
      window.removeEventListener(PROJECTS_UPDATED_EVENT, refresh);
      window.removeEventListener("upvc-accounting-updated", refresh);
    };
  }, []);

  const customerById = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const c of mergeCustomers()) map.set(c.id, c);
    return map;
  }, [tick]);

  // إعادة حساب عند كل تحديث للمشاريع/التحصيل
  void tick;
  const inWorkshop = listWorkshopProjects();
  const queued = listQueuedProjects();
  const nextUp = getNextUpProject();
  const quotes = listAllProjects()
    .filter((p) => p.workflow === "quote")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  function submitDeposit(projectId: string) {
    if (depositAmount <= 0) {
      setDepositError("ادخل مبلغ العربون");
      return;
    }
    scheduleProjectWithDeposit({
      projectId,
      amount: depositAmount,
      date: todayIsoDate(),
    });
    setDepositProjectId(null);
    setDepositAmount(0);
    setDepositError("");
  }

  return (
    <div className="flex flex-col gap-5">
      {nextUp ? (
        <section className="rounded-2xl border border-primary/25 bg-primary-soft/40 px-4 py-4">
          <p className="text-[11px] font-semibold tracking-wide text-primary">
            الشغلانة اللي عليها الدور
          </p>
          <p className="mt-1 text-lg font-bold text-foreground">{nextUp.name}</p>
          <p className="mt-0.5 text-xs text-muted">
            {customerName(customerById, nextUp.customerId)}
            {nextUp.location ? ` · ${nextUp.location}` : ""}
            {nextUp.depositAmount
              ? ` · عربون ${formatCurrency(nextUp.depositAmount)}`
              : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => startWorkshopProject(nextUp.id)}
              className="rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white transition-all hover:brightness-105 active:scale-[0.98]"
            >
              ابدأ في الورشة
            </button>
            <Link
              href={ROUTES.design.editor(nextUp.customerId, nextUp.id)}
              className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition-all hover:border-primary/30"
            >
              فتح البنود
            </Link>
          </div>
        </section>
      ) : inWorkshop.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted">
          مفيش شغل مجدول — استلم عربون على مقايسة عشان تدخل الطابور
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2 px-1">
          <h2 className="text-base font-bold text-foreground">
            في الورشة دلوقتي
          </h2>
          <span className="text-xs text-muted">{inWorkshop.length}</span>
        </div>
        {inWorkshop.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted">
            مفيش مشروع تحت التنفيذ حالياً
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {inWorkshop.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                customerLabel={customerName(customerById, project.customerId)}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => completeWorkshopProject(project.id)}
                      className="rounded-xl bg-primary px-3 py-1.5 text-[11px] font-bold text-white"
                    >
                      تمّ التنفيذ
                    </button>
                    <button
                      type="button"
                      onClick={() => returnToQueue(project.id)}
                      className="rounded-xl border border-border bg-card px-3 py-1.5 text-[11px] font-semibold"
                    >
                      رجّع للطابور
                    </button>
                  </>
                }
              />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2 px-1">
          <h2 className="text-base font-bold text-foreground">
            طابور الورشة
          </h2>
          <span className="text-xs text-muted">
            عربون بس · {queued.length}
          </span>
        </div>
        <p className="px-1 text-xs leading-relaxed text-muted">
          المقايسات مش بتدخل هنا غير بعد استلام العربون — عشان يبقى واضح إيه
          اللي عليه الدور.
        </p>
        {queued.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted">
            الطابور فاضي
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {queued.map((project, index) => (
              <ProjectRow
                key={project.id}
                project={project}
                badge={`#${index + 1}`}
                customerLabel={customerName(customerById, project.customerId)}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => startWorkshopProject(project.id)}
                      className="rounded-xl bg-primary px-3 py-1.5 text-[11px] font-bold text-white"
                    >
                      ابدأ
                    </button>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveInQueue(project.id, "up")}
                      className="rounded-xl border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index === queued.length - 1}
                      onClick={() => moveInQueue(project.id, "down")}
                      className="rounded-xl border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-40"
                    >
                      ↓
                    </button>
                  </>
                }
              />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2 px-1">
          <h2 className="text-base font-bold text-foreground">
            مقايسات بدون عربون
          </h2>
          <span className="text-xs text-muted">{quotes.length}</span>
        </div>
        {quotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted">
            مفيش مقايسات معلّقة
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {quotes.map((project) => (
              <li key={project.id}>
                <div className="rounded-2xl border border-border bg-card p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">
                        {project.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {customerName(customerById, project.customerId)}
                        {project.location ? ` · ${project.location}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold text-muted">
                      {WORKFLOW_LABELS.quote}
                    </span>
                  </div>

                  {depositProjectId === project.id ? (
                    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                      <label className="flex flex-col gap-1 text-right">
                        <span className="text-xs font-medium">
                          مبلغ العربون (ج.م)
                        </span>
                        <NumericInput
                          value={depositAmount}
                          onChange={(v) => {
                            setDepositAmount(v);
                            setDepositError("");
                          }}
                          min={0}
                          blankZero
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-left outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                          dir="ltr"
                        />
                      </label>
                      {depositError ? (
                        <p className="text-xs font-medium text-[#E85A8A]">
                          {depositError}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => submitDeposit(project.id)}
                          className="rounded-xl bg-primary px-3 py-1.5 text-[11px] font-bold text-white"
                        >
                          استلام وجدولة
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDepositProjectId(null);
                            setDepositError("");
                          }}
                          className="rounded-xl border border-border px-3 py-1.5 text-[11px] font-semibold"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDepositProjectId(project.id);
                          setDepositAmount(0);
                          setDepositError("");
                        }}
                        className="rounded-xl bg-primary px-3 py-1.5 text-[11px] font-bold text-white"
                      >
                        استلام عربون
                      </button>
                      <Link
                        href={ROUTES.design.editor(
                          project.customerId,
                          project.id
                        )}
                        className="rounded-xl border border-border px-3 py-1.5 text-[11px] font-semibold"
                      >
                        فتح المقايسة
                      </Link>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ProjectRow({
  project,
  customerLabel,
  badge,
  actions,
}: {
  project: Project;
  customerLabel: string;
  badge?: string;
  actions: ReactNode;
}) {
  return (
    <li className="rounded-2xl border border-border bg-card p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {badge ? (
              <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {badge}
              </span>
            ) : null}
            <p className="truncate text-sm font-bold text-foreground">
              {project.name}
            </p>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">
            {customerLabel}
            {project.location ? ` · ${project.location}` : ""}
          </p>
          {project.depositAmount ? (
            <p className="mt-1 text-[11px] font-medium text-primary">
              عربون {formatCurrency(project.depositAmount)}
              {project.depositAt ? ` · ${project.depositAt}` : ""}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
          {WORKFLOW_LABELS[project.workflow]}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {actions}
        <Link
          href={ROUTES.design.editor(project.customerId, project.id)}
          className="rounded-xl border border-border px-3 py-1.5 text-[11px] font-semibold"
        >
          البنود
        </Link>
      </div>
    </li>
  );
}
