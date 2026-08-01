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
  HOLD_REASON_OPTIONS,
  PROJECTS_UPDATED_EVENT,
  type Project,
  type ProjectWorkflow,
} from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import { formatCurrency } from "@/lib/utils";
import {
  completeWorkshopProject,
  DELIVERY_VISUAL,
  HOLD_VISUAL,
  holdProject,
  listAwaitingDeliveryProjects,
  listHeldProjects,
  listQueuedProjects,
  listWorkshopProjects,
  markProjectDelivered,
  moveInQueue,
  resumeProject,
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

function askHoldReason(): string | null {
  const presets = HOLD_REASON_OPTIONS.join(" · ");
  const value = window.prompt(
    `سبب التوقف؟\n(${presets})`,
    HOLD_REASON_OPTIONS[0]
  );
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed || HOLD_REASON_OPTIONS[0];
}

/**
 * صفحة العمل اليومي:
 * - قيد التنفيذ · قائمة الانتظار · متوقف · جاهز للتسليم
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
  const inWorkshop = listWorkshopProjects({ includeHeld: false });
  const queued = listQueuedProjects({ includeHeld: false });
  const held = listHeldProjects();
  const awaiting = listAwaitingDeliveryProjects();

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

  function handleHold(projectId: string) {
    const reason = askHoldReason();
    if (reason === null) return;
    holdProject(projectId, reason);
    setTick((n) => n + 1);
  }

  const workshopV = WORKFLOW_VISUAL.workshop;
  const queuedV = WORKFLOW_VISUAL.queued;
  const holdV = HOLD_VISUAL;
  const awaitV = DELIVERY_VISUAL.awaiting;

  return (
    <div className="flex flex-col gap-5">
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        role="group"
        aria-label="ملخص الورشة"
      >
        <SummaryTile
          label="قيد التنفيذ"
          value={inWorkshop.length}
          visual={workshopV}
        />
        <SummaryTile
          label="في الانتظار"
          value={queued.length}
          visual={queuedV}
        />
        <SummaryTile label="متوقف" value={held.length} visual={holdV} />
        <SummaryTile
          label="جاهز للتسليم"
          value={awaiting.length}
          visual={awaitV}
        />
      </div>

      <section className="flex flex-col gap-3">
        <SectionHead
          title="قيد التنفيذ"
          count={inWorkshop.length}
          visual={workshopV}
        />
        {inWorkshop.length === 0 ? (
          <EmptyBox visual={workshopV}>
            لا يوجد مشروع قيد التنفيذ حالياً — ابدأ من قائمة الانتظار أدناه
          </EmptyBox>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {inWorkshop.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                tone="workshop"
                customerLabel={customerName(customerById, project.customerId)}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          !window.confirm(
                            "هل تريد إكمال تنفيذ هذا المشروع؟ سيصبح جاهزاً للتسليم."
                          )
                        ) {
                          return;
                        }
                        completeWorkshopProject(project.id);
                        setTick((n) => n + 1);
                      }}
                      className="rounded-xl bg-wf-workshop px-3 py-1.5 text-[11px] font-bold text-white"
                    >
                      إكمال التنفيذ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHold(project.id)}
                      className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-800"
                    >
                      إيقاف
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        returnToQueue(project.id);
                        setTick((n) => n + 1);
                      }}
                      className="rounded-xl border border-border bg-card px-3 py-1.5 text-[11px] font-semibold"
                    >
                      إعادة للانتظار
                    </button>
                  </>
                }
              />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHead
          title="قائمة الانتظار"
          count={queued.length}
          visual={queuedV}
        />
        {queued.length === 0 ? (
          <EmptyBox visual={queuedV}>
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
          </EmptyBox>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {queued.map((project, index) => (
              <ProjectRow
                key={project.id}
                project={project}
                tone="queued"
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
                      onClick={() => {
                        startWorkshopProject(project.id);
                        setTick((n) => n + 1);
                      }}
                      className="rounded-xl bg-wf-queued px-3 py-1.5 text-[11px] font-bold text-white transition-transform active:scale-95"
                    >
                      بدء التنفيذ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHold(project.id)}
                      className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-800"
                    >
                      إيقاف
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

      <section className="flex flex-col gap-3">
        <SectionHead title="متوقف" count={held.length} visual={holdV} />
        {held.length === 0 ? (
          <EmptyBox visual={holdV}>مفيش شغل واقف دلوقتي.</EmptyBox>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {held.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                tone="hold"
                customerLabel={customerName(customerById, project.customerId)}
                holdReason={project.holdReason}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        resumeProject(project.id);
                        setTick((n) => n + 1);
                      }}
                      className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-950"
                    >
                      {project.workflow === "workshop"
                        ? "كمّل التنفيذ"
                        : "رجّع للانتظار"}
                    </button>
                    {project.workflow !== "workshop" ? (
                      <button
                        type="button"
                        onClick={() => {
                          startWorkshopProject(project.id);
                          setTick((n) => n + 1);
                        }}
                        className="rounded-xl bg-wf-workshop px-3 py-1.5 text-[11px] font-bold text-white"
                      >
                        ابدأ دلوقتي
                      </button>
                    ) : null}
                  </>
                }
              />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHead
          title="جاهز للتسليم"
          count={awaiting.length}
          visual={awaitV}
        />
        {awaiting.length === 0 ? (
          <EmptyBox visual={awaitV}>
            مفيش شغل مستني التسليم — لما تكمّل التنفيذ يظهر هنا.
          </EmptyBox>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {awaiting.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                tone="awaiting"
                customerLabel={customerName(customerById, project.customerId)}
                actions={
                  <button
                    type="button"
                    onClick={() => {
                      markProjectDelivered(project.id);
                      setTick((n) => n + 1);
                    }}
                    className="rounded-xl bg-wf-done px-3 py-1.5 text-[11px] font-bold text-white"
                  >
                    تم التسليم
                  </button>
                }
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

type TileVisual = {
  border: string;
  soft: string;
  text: string;
  dot: string;
};

function SummaryTile({
  label,
  value,
  visual,
}: {
  label: string;
  value: number;
  visual: TileVisual;
}) {
  return (
    <div className={`rounded-2xl border ${visual.border} ${visual.soft} px-3.5 py-3`}>
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${visual.dot}`} />
        <p className={`text-[11px] font-bold ${visual.text}`}>{label}</p>
      </div>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${visual.text}`}>
        {value}
      </p>
    </div>
  );
}

function SectionHead({
  title,
  count,
  visual,
}: {
  title: string;
  count: number;
  visual: { text: string; dot: string };
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 px-1">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${visual.dot}`} />
        <h2 className={`text-base font-bold ${visual.text}`}>{title}</h2>
      </div>
      <span className={`text-xs font-semibold tabular-nums ${visual.text}`}>
        {count}
      </span>
    </div>
  );
}

function EmptyBox({
  visual,
  children,
}: {
  visual: { border: string; soft: string };
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-dashed ${visual.border} ${visual.soft} px-4 py-8 text-center text-sm leading-relaxed text-muted`}
    >
      {children}
    </div>
  );
}

type RowTone = "workshop" | "queued" | "hold" | "awaiting";

function ProjectRow({
  project,
  customerLabel,
  tone,
  badge,
  highlight,
  moving,
  listRef,
  holdReason,
  actions,
}: {
  project: Project;
  customerLabel: string;
  tone: RowTone;
  badge?: string;
  highlight?: boolean;
  moving?: boolean;
  listRef?: (el: HTMLLIElement | null) => void;
  holdReason?: string;
  actions: ReactNode;
}) {
  const editorHref = ROUTES.design.editor(project.customerId, project.id);
  const visual =
    tone === "hold"
      ? HOLD_VISUAL
      : tone === "awaiting"
        ? DELIVERY_VISUAL.awaiting
        : WORKFLOW_VISUAL[tone as ProjectWorkflow];

  const workflowForBadge: ProjectWorkflow =
    tone === "hold"
      ? project.workflow === "workshop"
        ? "workshop"
        : "queued"
      : tone === "awaiting"
        ? "done"
        : tone;

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
              {tone === "hold" ? (
                <span
                  className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide ${HOLD_VISUAL.badgeSolid}`}
                >
                  متوقف
                </span>
              ) : tone === "awaiting" ? (
                <span
                  className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide ${DELIVERY_VISUAL.awaiting.badgeSolid}`}
                >
                  جاهز للتسليم
                </span>
              ) : badge ? (
                <WorkflowBadge workflow={workflowForBadge} solid={highlight}>
                  {badge}
                </WorkflowBadge>
              ) : (
                <WorkflowBadge workflow={workflowForBadge} solid />
              )}
              <p className="truncate text-sm font-bold text-foreground">
                {project.name}
              </p>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted">
              {customerLabel}
              {project.location ? ` · ${project.location}` : ""}
            </p>
            {holdReason ? (
              <p className={`mt-1 text-[11px] font-semibold ${HOLD_VISUAL.text}`}>
                واقف على: {holdReason}
              </p>
            ) : null}
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
