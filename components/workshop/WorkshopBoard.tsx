"use client";

import Link from "next/link";
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { mergeCustomers, type Customer } from "@/lib/customers";
import {
  HOLD_REASON_OPTIONS,
  PROJECTS_UPDATED_EVENT,
  type Project,
  type ProjectWorkflow,
} from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import {
  completeWorkshopProject,
  DELIVERY_VISUAL,
  HOLD_VISUAL,
  holdProject,
  listAwaitingDeliveryProjects,
  listDeliveredProjects,
  listHeldProjects,
  listQueuedProjects,
  listWorkshopProjects,
  markProjectAwaitingDelivery,
  markProjectDelivered,
  moveInQueue,
  resumeProject,
  returnToQueue,
  startWorkshopProject,
  WORKFLOW_VISUAL,
} from "@/lib/workshop";
import { WorkflowBadge } from "@/components/workshop/WorkflowBadge";
import { ProjectMoneyLine } from "@/components/projects/ProjectMoneyLine";

const QUEUE_FLIP_MS = 320;
const QUEUE_FLIP_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

type TabId = "workshop" | "queued" | "held" | "awaiting" | "delivered";

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
 * صفحة العمل اليومي — تبويب واحد نشط بدل خمسة أقسام فارغة.
 */
export function WorkshopBoard() {
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<TabId>("workshop");
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
  const delivered = listDeliveredProjects();

  // أول تبويب فيه شغل — مرة واحدة عند التحميل
  useEffect(() => {
    if (inWorkshop.length > 0) setTab("workshop");
    else if (queued.length > 0) setTab("queued");
    else if (awaiting.length > 0) setTab("awaiting");
    else if (held.length > 0) setTab("held");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const queueIds = useMemo(() => queued.map((p) => p.id).join("|"), [queued]);

  useLayoutEffect(() => {
    if (tab !== "queued") return;
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
        const duration = Math.min(480, QUEUE_FLIP_MS + Math.abs(dy) * 0.15);
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
  }, [queueIds, movingId, tab]);

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

  const tabs: {
    id: TabId;
    label: string;
    count: number;
    visual: { text: string; soft: string; border: string; dot: string };
  }[] = [
    {
      id: "workshop",
      label: "تنفيذ",
      count: inWorkshop.length,
      visual: WORKFLOW_VISUAL.workshop,
    },
    {
      id: "queued",
      label: "انتظار",
      count: queued.length,
      visual: WORKFLOW_VISUAL.queued,
    },
    { id: "held", label: "متوقف", count: held.length, visual: HOLD_VISUAL },
    {
      id: "awaiting",
      label: "تسليم",
      count: awaiting.length,
      visual: DELIVERY_VISUAL.awaiting,
    },
    {
      id: "delivered",
      label: "تم",
      count: delivered.length,
      visual: DELIVERY_VISUAL.delivered,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="حالات الورشة"
        className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                active
                  ? `${t.visual.soft} ${t.visual.border} ${t.visual.text}`
                  : "border-border bg-card text-muted"
              }`}
            >
              <span
                className={`me-1.5 inline-block h-1.5 w-1.5 rounded-full ${t.visual.dot}`}
              />
              {t.label}
              <span className="ms-1 tabular-nums opacity-80">{t.count}</span>
            </button>
          );
        })}
      </div>

      {tab === "workshop" ? (
        <ProjectList
          projects={inWorkshop}
          empty="لا يوجد مشروع قيد التنفيذ — ابدأ من الانتظار"
          emptyAction={{ href: undefined, onSelectTab: () => setTab("queued"), label: "قائمة الانتظار" }}
          renderRow={(project) => (
            <ProjectRow
              project={project}
              tone="workshop"
              customerLabel={customerName(customerById, project.customerId)}
              primaryAction={
                <button
                  type="button"
                  onClick={() => {
                    if (
                      !window.confirm(
                        "إكمال التنفيذ؟ سيصبح جاهزاً للتسليم."
                      )
                    )
                      return;
                    completeWorkshopProject(project.id);
                    setTick((n) => n + 1);
                  }}
                  className="rounded-xl bg-wf-workshop px-3 py-1.5 text-[11px] font-bold text-white"
                >
                  إكمال التنفيذ
                </button>
              }
              menuActions={[
                {
                  label: "إيقاف",
                  onClick: () => handleHold(project.id),
                },
                {
                  label: "إعادة للانتظار",
                  onClick: () => {
                    returnToQueue(project.id);
                    setTick((n) => n + 1);
                  },
                },
              ]}
            />
          )}
        />
      ) : null}

      {tab === "queued" ? (
        queued.length === 0 ? (
          <EmptyBox>
            قائمة الانتظار فارغة.{" "}
            <Link
              href={ROUTES.accounting.newPayment}
              className="font-semibold text-primary"
            >
              استلام دفعة
            </Link>
          </EmptyBox>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {queued.map((project, index) => (
              <ProjectRow
                key={project.id}
                project={project}
                tone="queued"
                badge={index === 0 ? "التالي" : `#${index + 1}`}
                highlight={index === 0}
                moving={movingId === project.id}
                listRef={(el) => {
                  if (el) queueItemRefs.current.set(project.id, el);
                  else queueItemRefs.current.delete(project.id);
                }}
                customerLabel={customerName(customerById, project.customerId)}
                primaryAction={
                  <button
                    type="button"
                    onClick={() => {
                      startWorkshopProject(project.id);
                      setTick((n) => n + 1);
                      setTab("workshop");
                    }}
                    className="rounded-xl bg-wf-queued px-3 py-1.5 text-[11px] font-bold text-white"
                  >
                    بدء التنفيذ
                  </button>
                }
                menuActions={[
                  {
                    label: "إيقاف",
                    onClick: () => handleHold(project.id),
                  },
                  {
                    label: "تحريك لأعلى",
                    disabled: index === 0 || movingId !== null,
                    onClick: () => handleMoveInQueue(project.id, "up"),
                  },
                  {
                    label: "تحريك لأسفل",
                    disabled:
                      index === queued.length - 1 || movingId !== null,
                    onClick: () => handleMoveInQueue(project.id, "down"),
                  },
                ]}
              />
            ))}
          </ul>
        )
      ) : null}

      {tab === "held" ? (
        <ProjectList
          projects={held}
          empty="مفيش شغل واقف دلوقتي"
          renderRow={(project) => (
            <ProjectRow
              project={project}
              tone="hold"
              customerLabel={customerName(customerById, project.customerId)}
              holdReason={project.holdReason}
              primaryAction={
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
              }
              menuActions={
                project.workflow !== "workshop"
                  ? [
                      {
                        label: "ابدأ دلوقتي",
                        onClick: () => {
                          startWorkshopProject(project.id);
                          setTick((n) => n + 1);
                          setTab("workshop");
                        },
                      },
                    ]
                  : []
              }
            />
          )}
        />
      ) : null}

      {tab === "awaiting" ? (
        <ProjectList
          projects={awaiting}
          empty="مفيش شغل مستني التسليم"
          renderRow={(project) => (
            <ProjectRow
              project={project}
              tone="awaiting"
              customerLabel={customerName(customerById, project.customerId)}
              primaryAction={
                <button
                  type="button"
                  onClick={() => {
                    markProjectDelivered(project.id);
                    setTick((n) => n + 1);
                  }}
                  className="rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white"
                >
                  تم التسليم
                </button>
              }
              menuActions={[]}
            />
          )}
        />
      ) : null}

      {tab === "delivered" ? (
        <ProjectList
          projects={delivered}
          empty="لسه مفيش تسليم مسجّل"
          renderRow={(project) => (
            <ProjectRow
              project={project}
              tone="delivered"
              customerLabel={customerName(customerById, project.customerId)}
              deliveredAt={project.deliveredAt}
              primaryAction={
                <button
                  type="button"
                  onClick={() => {
                    markProjectAwaitingDelivery(project.id);
                    setTick((n) => n + 1);
                    setTab("awaiting");
                  }}
                  className="rounded-xl border border-border bg-card px-3 py-1.5 text-[11px] font-semibold"
                >
                  رجّع لجاهز للتسليم
                </button>
              }
              menuActions={[]}
            />
          )}
        />
      ) : null}
    </div>
  );
}

function ProjectList({
  projects,
  empty,
  emptyAction,
  renderRow,
}: {
  projects: Project[];
  empty: string;
  emptyAction?: {
    href?: string;
    onSelectTab?: () => void;
    label: string;
  };
  renderRow: (project: Project) => ReactNode;
}) {
  if (projects.length === 0) {
    return (
      <EmptyBox>
        {empty}
        {emptyAction?.href ? (
          <>
            {" — "}
            <Link
              href={emptyAction.href}
              className="font-semibold text-primary"
            >
              {emptyAction.label}
            </Link>
          </>
        ) : null}
        {emptyAction?.onSelectTab ? (
          <>
            {" — "}
            <button
              type="button"
              onClick={emptyAction.onSelectTab}
              className="font-semibold text-primary"
            >
              {emptyAction.label}
            </button>
          </>
        ) : null}
      </EmptyBox>
    );
  }
  return (
    <ul className="flex flex-col gap-2.5">
      {projects.map((project) => (
        <Fragment key={project.id}>{renderRow(project)}</Fragment>
      ))}
    </ul>
  );
}

function EmptyBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm leading-relaxed text-muted">
      {children}
    </div>
  );
}

type RowTone = "workshop" | "queued" | "hold" | "awaiting" | "delivered";

type MenuAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

function ProjectRow({
  project,
  customerLabel,
  tone,
  badge,
  highlight,
  moving,
  listRef,
  holdReason,
  deliveredAt,
  primaryAction,
  menuActions,
}: {
  project: Project;
  customerLabel: string;
  tone: RowTone;
  badge?: string;
  highlight?: boolean;
  moving?: boolean;
  listRef?: (el: HTMLLIElement | null) => void;
  holdReason?: string;
  deliveredAt?: string;
  primaryAction: ReactNode;
  menuActions: MenuAction[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const editorHref = ROUTES.design.editor(project.customerId, project.id);
  const visual =
    tone === "hold"
      ? HOLD_VISUAL
      : tone === "awaiting"
        ? DELIVERY_VISUAL.awaiting
        : tone === "delivered"
          ? DELIVERY_VISUAL.delivered
          : WORKFLOW_VISUAL[tone as ProjectWorkflow];

  const workflowForBadge: ProjectWorkflow =
    tone === "hold"
      ? project.workflow === "workshop"
        ? "workshop"
        : "queued"
      : tone === "awaiting" || tone === "delivered"
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
                  className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${HOLD_VISUAL.badgeSolid}`}
                >
                  متوقف
                </span>
              ) : tone === "awaiting" ? (
                <span
                  className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${DELIVERY_VISUAL.awaiting.badgeSolid}`}
                >
                  جاهز للتسليم
                </span>
              ) : tone === "delivered" ? (
                <span
                  className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${DELIVERY_VISUAL.delivered.badgeSolid}`}
                >
                  تم التسليم
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
            {deliveredAt ? (
              <p className={`mt-1 text-[11px] font-medium ${visual.text}`}>
                تاريخ التسليم {deliveredAt}
              </p>
            ) : null}
            <ProjectMoneyLine projectId={project.id} className="mt-1" />
          </div>
          <span className="shrink-0 text-muted" aria-hidden>
            ‹
          </span>
        </div>
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        {primaryAction}
        {menuActions.length > 0 ? (
          <div className="relative ms-auto">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-xl border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold"
              aria-label="المزيد"
            >
              ⋯
            </button>
            {menuOpen ? (
              <div className="absolute left-0 bottom-[calc(100%+4px)] z-20 min-w-[140px] overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg">
                {menuActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    disabled={action.disabled}
                    onClick={() => {
                      setMenuOpen(false);
                      action.onClick();
                    }}
                    className="block w-full px-3 py-2 text-right text-xs font-semibold disabled:opacity-40 hover:bg-primary-soft"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}
