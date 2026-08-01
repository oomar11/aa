"use client";

import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  mergeCustomers,
  type Customer,
} from "@/lib/customers";
import {
  PROJECTS_UPDATED_EVENT,
  type Project,
} from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import { formatCurrency } from "@/lib/utils";
import {
  completeWorkshopProject,
  listQueuedProjects,
  listWorkshopProjects,
  moveInQueue,
  returnToQueue,
  startWorkshopProject,
  WORKFLOW_VISUAL,
} from "@/lib/workshop";
import { WorkflowBadge } from "@/components/workshop/WorkflowBadge";

const QUEUE_FLIP_MS = 320;
const QUEUE_FLIP_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function customerName(
  customerById: Map<string, Customer>,
  customerId: string
): string {
  return customerById.get(customerId)?.name ?? "عميل";
}

/**
 * صفحة العمل اليومي:
 * - قيد التنفيذ في الورشة (أخضر)
 * - قائمة الانتظار بعد الدفع (برتقالي)
 */
export function WorkshopBoard() {
  const [tick, setTick] = useState(0);
  const [movingId, setMovingId] = useState<string | null>(null);
  const queueItemRefs = useRef(new Map<string, HTMLLIElement>());
  const pendingFlipFromRef = useRef<Map<string, DOMRect> | null>(null);
  const prevQueueRectsRef = useRef(new Map<string, DOMRect>());

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

  void tick;
  const inWorkshop = listWorkshopProjects();
  const queued = listQueuedProjects();

  const queueIds = useMemo(() => queued.map((p) => p.id).join("|"), [queued]);

  useLayoutEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const nextRects = new Map<string, DOMRect>();
    for (const [id, el] of queueItemRefs.current) {
      nextRects.set(id, el.getBoundingClientRect());
    }

    const firsts = pendingFlipFromRef.current ?? prevQueueRectsRef.current;
    pendingFlipFromRef.current = null;

    if (!prefersReduced) {
      for (const [id, el] of queueItemRefs.current) {
        const prev = firsts.get(id);
        const next = nextRects.get(id);
        if (!prev || !next) continue;

        const dy = prev.top - next.top;
        if (Math.abs(dy) < 0.5) continue;

        const duration = Math.min(
          480,
          QUEUE_FLIP_MS + Math.abs(dy) * 0.15
        );

        el.style.transition = "none";
        el.style.transform = `translateY(${dy}px)`;
        el.style.zIndex = id === movingId ? "5" : "2";
        void el.getBoundingClientRect();
        el.style.transition = `transform ${duration}ms ${QUEUE_FLIP_EASE}`;
        el.style.transform = "";

        const clear = (event: TransitionEvent) => {
          if (event.propertyName !== "transform") return;
          el.style.transition = "";
          el.style.zIndex = "";
          el.removeEventListener("transitionend", clear);
        };
        el.addEventListener("transitionend", clear);
        window.setTimeout(() => {
          el.style.transition = "";
          el.style.zIndex = "";
          el.removeEventListener("transitionend", clear);
        }, duration + 80);
      }
    }

    prevQueueRectsRef.current = nextRects;
    if (movingId) {
      window.setTimeout(() => setMovingId(null), QUEUE_FLIP_MS + 40);
    }
  }, [queueIds, movingId]);

  function captureQueueRects() {
    const rects = new Map<string, DOMRect>();
    for (const [id, el] of queueItemRefs.current) {
      rects.set(id, el.getBoundingClientRect());
    }
    pendingFlipFromRef.current = rects;
  }

  function handleMoveInQueue(projectId: string, direction: "up" | "down") {
    captureQueueRects();
    setMovingId(projectId);
    moveInQueue(projectId, direction);
    setTick((n) => n + 1);
  }

  const workshopV = WORKFLOW_VISUAL.workshop;
  const queuedV = WORKFLOW_VISUAL.queued;

  return (
    <div className="flex flex-col gap-5">
      <div
        className="grid grid-cols-2 gap-2"
        role="group"
        aria-label="ملخص الورشة"
      >
        <div
          className={`rounded-2xl border ${workshopV.border} ${workshopV.soft} px-3.5 py-3`}
        >
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${workshopV.dot}`} />
            <p className={`text-[11px] font-bold ${workshopV.text}`}>
              قيد التنفيذ
            </p>
          </div>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${workshopV.text}`}>
            {inWorkshop.length}
          </p>
        </div>
        <div
          className={`rounded-2xl border ${queuedV.border} ${queuedV.soft} px-3.5 py-3`}
        >
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${queuedV.dot}`} />
            <p className={`text-[11px] font-bold ${queuedV.text}`}>
              في الانتظار
            </p>
          </div>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${queuedV.text}`}>
            {queued.length}
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${workshopV.dot}`} />
            <h2 className={`text-base font-bold ${workshopV.text}`}>
              قيد التنفيذ
            </h2>
          </div>
          <span className={`text-xs font-semibold tabular-nums ${workshopV.text}`}>
            {inWorkshop.length}
          </span>
        </div>
        {inWorkshop.length === 0 ? (
          <div
            className={`rounded-2xl border border-dashed ${workshopV.border} ${workshopV.soft} px-4 py-8 text-center text-sm text-muted`}
          >
            لا يوجد مشروع قيد التنفيذ حالياً — ابدأ من قائمة الانتظار أدناه
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {inWorkshop.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                workflow="workshop"
                customerLabel={customerName(customerById, project.customerId)}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          !window.confirm(
                            "هل تريد إكمال تنفيذ هذا المشروع؟"
                          )
                        ) {
                          return;
                        }
                        completeWorkshopProject(project.id);
                      }}
                      className="rounded-xl bg-wf-workshop px-3 py-1.5 text-[11px] font-bold text-white"
                    >
                      إكمال التنفيذ
                    </button>
                    <button
                      type="button"
                      onClick={() => returnToQueue(project.id)}
                      className="rounded-xl border border-border bg-card px-3 py-1.5 text-[11px] font-semibold"
                    >
                      إعادة إلى قائمة الانتظار
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
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${queuedV.dot}`} />
            <h2 className={`text-base font-bold ${queuedV.text}`}>
              قائمة الانتظار
            </h2>
          </div>
          <span className={`text-xs font-semibold tabular-nums ${queuedV.text}`}>
            {queued.length}
          </span>
        </div>
        {queued.length === 0 ? (
          <div
            className={`rounded-2xl border border-dashed ${queuedV.border} ${queuedV.soft} px-4 py-8 text-center text-sm leading-relaxed text-muted`}
          >
            قائمة الانتظار فارغة.
            <br />
            سجّل دفعة من{" "}
            <Link
              href={ROUTES.accounting.newPayment}
              className="font-semibold text-primary"
            >
              الحسابات
            </Link>{" "}
            وحدد المشروع ليدخل هنا.
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {queued.map((project, index) => (
              <ProjectRow
                key={project.id}
                project={project}
                workflow="queued"
                badge={index === 0 ? "التالي للتنفيذ" : `#${index + 1}`}
                highlight={index === 0}
                moving={movingId === project.id}
                listRef={(el) => {
                  if (el) queueItemRefs.current.set(project.id, el);
                  else queueItemRefs.current.delete(project.id);
                }}
                customerLabel={customerName(customerById, project.customerId)}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => startWorkshopProject(project.id)}
                      className="rounded-xl bg-wf-queued px-3 py-1.5 text-[11px] font-bold text-white transition-transform active:scale-95"
                    >
                      بدء التنفيذ
                    </button>
                    <button
                      type="button"
                      disabled={index === 0 || movingId !== null}
                      onClick={() => handleMoveInQueue(project.id, "up")}
                      className="rounded-xl border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold transition-all active:scale-95 disabled:opacity-40"
                      aria-label="تحريك لأعلى"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={
                        index === queued.length - 1 || movingId !== null
                      }
                      onClick={() => handleMoveInQueue(project.id, "down")}
                      className="rounded-xl border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold transition-all active:scale-95 disabled:opacity-40"
                      aria-label="تحريك لأسفل"
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
    </div>
  );
}

function ProjectRow({
  project,
  customerLabel,
  workflow,
  badge,
  highlight,
  moving,
  listRef,
  actions,
}: {
  project: Project;
  customerLabel: string;
  workflow: "workshop" | "queued";
  badge?: string;
  highlight?: boolean;
  moving?: boolean;
  listRef?: (el: HTMLLIElement | null) => void;
  actions: ReactNode;
}) {
  const editorHref = ROUTES.design.editor(project.customerId, project.id);
  const visual = WORKFLOW_VISUAL[workflow];

  return (
    <li
      ref={listRef}
      className={`rounded-2xl border border-s-[3px] bg-card p-3.5 will-change-transform ${visual.rail} ${
        highlight
          ? `${visual.border} shadow-[0_4px_16px_rgba(196,122,18,0.14)]`
          : "border-border"
      } ${
        moving
          ? "shadow-[0_8px_24px_rgba(196,122,18,0.18)] ring-1 ring-wf-queued/25"
          : ""
      }`}
    >
      <Link
        href={editorHref}
        className="block active:opacity-80"
        aria-label={`فتح ${project.name}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {badge ? (
                <WorkflowBadge workflow={workflow} solid={highlight}>
                  {badge}
                </WorkflowBadge>
              ) : (
                <WorkflowBadge workflow={workflow} solid />
              )}
              <p className="truncate text-sm font-bold text-foreground">
                {project.name}
              </p>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted">
              {customerLabel}
              {project.location ? ` · ${project.location}` : ""}
            </p>
            {project.depositAmount ? (
              <p className={`mt-1 text-[11px] font-medium ${visual.text}`}>
                مدفوع {formatCurrency(project.depositAmount)}
              </p>
            ) : null}
          </div>
          <span className="shrink-0 text-muted" aria-hidden>
            ‹
          </span>
        </div>
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        {actions}
      </div>
    </li>
  );
}
