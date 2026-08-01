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
  listQueuedProjects,
  listWorkshopProjects,
  moveInQueue,
  returnToQueue,
  startWorkshopProject,
  WORKFLOW_LABELS,
} from "@/lib/workshop";

const QUEUE_FLIP_MS = 320;
const QUEUE_FLIP_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

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

/**
 * صفحة العمل اليومي:
 * - قيد التنفيذ في الورشة
 * - قائمة الانتظار (بعد العربون)
 * - أحدث المشاريع
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
  const recentProjects = [...listAllProjects()]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

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

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2 px-1">
          <h2 className="text-base font-bold text-foreground">قيد التنفيذ</h2>
          <span className="text-xs text-muted">{inWorkshop.length}</span>
        </div>
        {inWorkshop.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted">
            لا يوجد مشروع قيد التنفيذ حالياً — ابدأ من قائمة الانتظار أدناه
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
                      إكمال التنفيذ
                    </button>
                    <Link
                      href={ROUTES.accounting.expenseForProject(
                        project.customerId,
                        project.id
                      )}
                      className="rounded-xl border border-[#E8956F]/40 bg-[#E8956F]/10 px-3 py-1.5 text-[11px] font-semibold text-[#C45C26]"
                    >
                      مصروف
                    </Link>
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
          <h2 className="text-base font-bold text-foreground">
            قائمة الانتظار
          </h2>
          <span className="text-xs text-muted">{queued.length}</span>
        </div>
        {queued.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm leading-relaxed text-muted">
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
                      className="rounded-xl bg-primary px-3 py-1.5 text-[11px] font-bold text-white transition-transform active:scale-95"
                    >
                      بدء التنفيذ
                    </button>
                    <Link
                      href={ROUTES.accounting.expenseForProject(
                        project.customerId,
                        project.id
                      )}
                      className="rounded-xl border border-[#E8956F]/40 bg-[#E8956F]/10 px-3 py-1.5 text-[11px] font-semibold text-[#C45C26]"
                    >
                      مصروف
                    </Link>
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
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-foreground">
            أحدث المشاريع
          </h2>
          <Link
            href={ROUTES.orders}
            className="text-xs font-semibold text-primary"
          >
            جميع الطلبات
          </Link>
        </div>
        {recentProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted">
            لا توجد مشاريع بعد — أنشئ طلباً جديداً من صفحة الطلبات
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentProjects.map((project) => (
              <li key={project.id}>
                <Link
                  href={ROUTES.design.editor(project.customerId, project.id)}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-3.5 py-3 transition-all hover:border-primary/30 active:scale-[0.99]"
                >
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
                    {WORKFLOW_LABELS[project.workflow]}
                  </span>
                </Link>
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
  highlight,
  moving,
  listRef,
  actions,
}: {
  project: Project;
  customerLabel: string;
  badge?: string;
  highlight?: boolean;
  moving?: boolean;
  listRef?: (el: HTMLLIElement | null) => void;
  actions: ReactNode;
}) {
  const editorHref = ROUTES.design.editor(project.customerId, project.id);

  return (
    <li
      ref={listRef}
      className={`rounded-2xl border bg-card p-3.5 will-change-transform ${
        highlight
          ? "border-primary/35 shadow-[0_4px_16px_rgba(43,125,233,0.12)]"
          : "border-border"
      } ${
        moving
          ? "shadow-[0_8px_24px_rgba(43,125,233,0.18)] ring-1 ring-primary/25"
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
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold transition-colors duration-300 ${
                    highlight
                      ? "bg-primary text-white"
                      : "bg-primary-soft text-primary"
                  }`}
                >
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
