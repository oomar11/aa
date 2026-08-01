"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { BackChevron } from "@/components/layout/BackChevron";
import { NavBack } from "@/components/layout/NavBack";
import {
  ProjectPdfExporter,
  type ProjectPdfExporterHandle,
} from "@/components/design/ProjectPdfExporter";
import {
  EstimatedCostPdfExporter,
  type EstimatedCostPdfExporterHandle,
} from "@/components/design/EstimatedCostPdfExporter";
import {
  PurchaseOrderPdfExporter,
  type PurchaseOrderPdfExporterHandle,
} from "@/components/design/PurchaseOrderPdfExporter";
import {
  ProjectReportsMenu,
  type ProjectReportAction,
} from "@/components/design/ProjectReportsMenu";
import { TemplatePickerModal } from "@/components/design/TemplatePickerModal";
import { WindowPreview } from "@/components/design/WindowPreview";
import {
  createItemFromTemplate,
  itemAreaSqm,
  itemTotalPrice,
  type DesignItem,
} from "@/lib/design-items";
import { suggestItemName } from "@/lib/item-naming";
import {
  getItemsForProject,
  getProjectById,
  saveItemsForProject,
  type Project,
} from "@/lib/projects";
import { projectMaterialDefaultsFrom } from "@/lib/project-materials";
import { getProjectMoneySummary } from "@/lib/project-money";
import { formatCurrency } from "@/lib/utils";
import { formatSizePair, type LengthUnit } from "@/lib/units";
import { useUnit } from "@/components/settings/UnitProvider";
import type { LayoutNode } from "@/lib/window-layout";
import { ROUTES } from "@/lib/routes";

const LONG_PRESS_MS = 320;
const MOVE_CANCEL_PX = 14;
const GHOST_W = 148;
/** Minimum edge band for drag auto-pan (px). */
const AUTO_SCROLL_EDGE_MIN_PX = 130;
/** Portion of the viewport used as an auto-pan band on each side. */
const AUTO_SCROLL_EDGE_RATIO = 0.28;
/** Peak auto-pan speed (px/frame) at the deepest edge point. */
const AUTO_SCROLL_MAX_PX = 18;
const TRASH_SAFE_PX = 112;
/** Reorder settle animation — soft and readable. */
const REORDER_MS = 420;
const REORDER_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** Move item at `from` so it ends at index `to` (the highlighted card's slot). */
function moveItemToSlot<T>(list: T[], from: number, to: number): T[] {
  if (
    from < 0 ||
    to < 0 ||
    from >= list.length ||
    to >= list.length ||
    from === to
  ) {
    return list;
  }
  const next = list.slice();
  const [moved] = next.splice(from, 1);
  // `to` is the desired final index (= highlighted card index before the move).
  // splice(from) then splice(to) already yields that final index in both directions.
  next.splice(to, 0, moved);
  return next;
}

function autoScrollSpeed(progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  // Smoothstep: slow at the start of the band, then ramps up gradually.
  const eased = t * t * (3 - 2 * t);
  return Math.max(1, Math.round(AUTO_SCROLL_MAX_PX * eased));
}

type Props = {
  customerId?: string;
  projectId?: string;
};

type DragSession = {
  id: string;
  pointerId: number;
  originX: number;
  originY: number;
  offsetX: number;
  offsetY: number;
  fromIndex: number;
};

type DropHit = {
  insertIndex: number;
  highlightId: string;
};

export function DesignWorkspace({ customerId, projectId }: Props) {
  const router = useRouter();
  const { unit } = useUnit();
  const [project, setProject] = useState<Project | undefined>();
  const [items, setItems] = useState<DesignItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pdfExporterRef = useRef<ProjectPdfExporterHandle>(null);
  const purchaseOrderRef = useRef<PurchaseOrderPdfExporterHandle>(null);
  const estimatedCostRef = useRef<EstimatedCostPdfExporterHandle>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPoint, setDragPoint] = useState({ x: 0, y: 0 });
  const [overTrash, setOverTrash] = useState(false);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const itemsRef = useRef(items);
  const projectIdRef = useRef(projectId);
  const dragSessionRef = useRef<DragSession | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);
  const trashRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const autoScrollRafRef = useRef<number | null>(null);
  const lockedScrollYRef = useRef(0);
  const lockedScrollMaxRef = useRef(0);
  const prevCardRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const pendingFlipFromRef = useRef<Map<string, DOMRect> | null>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    projectIdRef.current = projectId;
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    setProject(getProjectById(projectId));
    setItems(getItemsForProject(projectId));
  }, [projectId]);

  const totals = useMemo(() => {
    const area = items.reduce((sum, item) => sum + itemAreaSqm(item), 0);
    const price = items.reduce((sum, item) => sum + itemTotalPrice(item), 0);
    const qty = items.reduce((sum, item) => sum + item.qty, 0);
    return { area, price, qty };
  }, [items]);

  const [money, setMoney] = useState(() =>
    projectId && typeof window !== "undefined"
      ? getProjectMoneySummary(projectId)
      : null
  );

  useEffect(() => {
    if (!projectId) {
      setMoney(null);
      return;
    }
    const id = projectId;
    function refresh() {
      setMoney(getProjectMoneySummary(id));
    }
    refresh();
    window.addEventListener("upvc-accounting-updated", refresh);
    window.addEventListener("upvc-projects-updated", refresh);
    return () => {
      window.removeEventListener("upvc-accounting-updated", refresh);
      window.removeEventListener("upvc-projects-updated", refresh);
    };
  }, [projectId, items]);

  const draggingItem = useMemo(
    () => items.find((item) => item.id === draggingId) ?? null,
    [items, draggingId]
  );

  const persist = useCallback((next: DesignItem[]) => {
    setItems(next);
    const id = projectIdRef.current;
    if (id) saveItemsForProject(id, next);
  }, []);

  function drawHref(itemId: string) {
    if (!customerId || !projectId) return "#";
    return `/design/draw?customer=${customerId}&project=${projectId}&item=${itemId}`;
  }

  function handleConfirmTemplate(templateId: string, layout: LayoutNode) {
    if (!customerId || !projectId) return;
    const proj = getProjectById(projectId);
    const item = createItemFromTemplate(
      templateId,
      layout,
      items.length + 1,
      projectMaterialDefaultsFrom(proj)
    );
    persist([item, ...items]);
    setPickerOpen(false);
    router.push(drawHref(item.id));
  }

  function handleShare() {
    if (!customerId || !projectId) return;
    if (!pdfExporterRef.current) {
      window.alert("تعذر بدء مشاركة PDF. حدّث الصفحة وحاول تاني.");
      return;
    }
    void pdfExporterRef.current.openShare();
  }

  function handleReportAction(action: ProjectReportAction) {
    if (!customerId || !projectId) return;
    if (action === "purchase-order") {
      if (!purchaseOrderRef.current) {
        window.alert("تعذر فتح طلبية المشتريات. حدّث الصفحة وحاول تاني.");
        return;
      }
      void purchaseOrderRef.current.openShare();
      return;
    }
    if (action === "estimated-cost") {
      if (!estimatedCostRef.current) {
        window.alert("تعذر فتح التكلفة التقديرية. حدّث الصفحة وحاول تاني.");
        return;
      }
      void estimatedCostRef.current.openShare();
    }
  }

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const hitTestTrash = useCallback((clientX: number, clientY: number) => {
    const el = trashRef.current;
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }, []);

  const hitTestDrop = useCallback(
    (clientX: number, clientY: number, activeId: string): DropHit | null => {
      const current = itemsRef.current;
      const from = current.findIndex((item) => item.id === activeId);
      if (from < 0) return null;

      // Still over the original card → stay put, no highlight.
      const originEl = cardRefs.current.get(activeId);
      if (originEl) {
        const rect = originEl.getBoundingClientRect();
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          return null;
        }
      }

      // 1) Prefer the card the finger is actually inside.
      for (let i = 0; i < current.length; i++) {
        const item = current[i];
        if (item.id === activeId) continue;
        const el = cardRefs.current.get(item.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          if (i === from) return null;
          // Take this card's slot index directly.
          return { insertIndex: i, highlightId: item.id };
        }
      }

      // 2) Otherwise pick the nearest card, but only within a clear radius.
      let bestTargetId: string | null = null;
      let bestTargetIndex = -1;
      let bestDist = Number.POSITIVE_INFINITY;

      for (let i = 0; i < current.length; i++) {
        const item = current[i];
        if (item.id === activeId) continue;
        const el = cardRefs.current.get(item.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(clientX - cx, clientY - cy);
        const reach = Math.max(rect.width, rect.height) * 0.75;
        if (dist <= reach && dist < bestDist) {
          bestDist = dist;
          bestTargetId = item.id;
          bestTargetIndex = i;
        }
      }

      if (!bestTargetId || bestTargetIndex < 0 || bestTargetIndex === from) {
        return null;
      }

      // Dropping on a card always means: occupy that card's current index.
      return { insertIndex: bestTargetIndex, highlightId: bestTargetId };
    },
    []
  );

  const unlockPageScroll = useCallback(() => {
    const html = document.documentElement;
    const body = document.body;
    const y = lockedScrollYRef.current;

    html.style.overscrollBehavior = "";
    body.style.overscrollBehavior = "";
    html.style.touchAction = "";
    body.style.touchAction = "";
    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.right = "";
    body.style.width = "";
    window.scrollTo(0, y);
  }, []);

  const endDrag = useCallback(
    (clientX: number, clientY: number) => {
      const session = dragSessionRef.current;
      if (!session) return;

      if (autoScrollRafRef.current != null) {
        cancelAnimationFrame(autoScrollRafRef.current);
        autoScrollRafRef.current = null;
      }

      const id = session.id;
      const over = hitTestTrash(clientX, clientY);
      dragSessionRef.current = null;
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 400);

      if (over) {
        setPendingDeleteId(id);
      } else {
        const hit = hitTestDrop(clientX, clientY, id);
        const current = itemsRef.current;
        const from = current.findIndex((item) => item.id === id);
        if (hit && from >= 0 && hit.insertIndex !== from) {
          // Snapshot first positions before React reorders the grid (FLIP).
          const firsts = new Map<string, DOMRect>();
          for (const [cardId, el] of cardRefs.current) {
            firsts.set(cardId, el.getBoundingClientRect());
          }
          pendingFlipFromRef.current = firsts;
          persist(moveItemToSlot(current, from, hit.insertIndex));
        }
      }

      // Always clear the fixed-body lock here so scrolling returns immediately.
      unlockPageScroll();
      setDraggingId(null);
      setOverTrash(false);
      setInsertIndex(null);
      setHighlightId(null);
    },
    [hitTestDrop, hitTestTrash, persist, unlockPageScroll]
  );

  const pendingDeleteItem = useMemo(
    () => items.find((item) => item.id === pendingDeleteId) ?? null,
    [items, pendingDeleteId]
  );

  function confirmDelete() {
    if (!pendingDeleteId) return;
    persist(itemsRef.current.filter((item) => item.id !== pendingDeleteId));
    setPendingDeleteId(null);
  }

  function cancelDelete() {
    setPendingDeleteId(null);
  }

  const refreshDragTargets = useCallback(
    (clientX: number, clientY: number) => {
      const session = dragSessionRef.current;
      if (!session) return;
      setDragPoint({ x: clientX, y: clientY });
      const over = hitTestTrash(clientX, clientY);
      setOverTrash(over);
      if (!over) {
        const hit = hitTestDrop(clientX, clientY, session.id);
        setInsertIndex(hit?.insertIndex ?? null);
        setHighlightId(hit?.highlightId ?? null);
      } else {
        setInsertIndex(null);
        setHighlightId(null);
      }
    },
    [hitTestDrop, hitTestTrash]
  );

  useEffect(() => {
    if (!draggingId) return;

    const html = document.documentElement;
    const body = document.body;

    // Hard-lock native scroll + pull-to-refresh while holding a card.
    if (body.style.position !== "fixed") {
      lockedScrollYRef.current = window.scrollY;
      lockedScrollMaxRef.current = Math.max(
        0,
        html.scrollHeight - window.innerHeight
      );
      html.style.overscrollBehavior = "none";
      body.style.overscrollBehavior = "none";
      html.style.touchAction = "none";
      body.style.touchAction = "none";
      body.style.position = "fixed";
      body.style.top = `-${lockedScrollYRef.current}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
    }

    function preventTouchScroll(ev: TouchEvent) {
      ev.preventDefault();
    }

    function preventWheel(ev: WheelEvent) {
      ev.preventDefault();
    }

    document.addEventListener("touchmove", preventTouchScroll, {
      passive: false,
    });
    document.addEventListener("wheel", preventWheel, { passive: false });

    const tick = () => {
      if (!dragSessionRef.current) {
        autoScrollRafRef.current = null;
        return;
      }

      const { x, y } = lastPointerRef.current;
      const vh = window.innerHeight;
      const edge = Math.max(
        AUTO_SCROLL_EDGE_MIN_PX,
        Math.round(vh * AUTO_SCROLL_EDGE_RATIO)
      );
      const topZone = edge;
      const bottomZoneEnd = vh - TRASH_SAFE_PX;
      const bottomZoneStart = bottomZoneEnd - edge;
      let dy = 0;

      if (y < topZone) {
        dy = -autoScrollSpeed((topZone - y) / edge);
      } else if (y > bottomZoneStart && !hitTestTrash(x, y)) {
        // Keep panning through the lower band, including near the trash shelf,
        // but stop once the finger is actually over the trash hit area.
        const depth = Math.min(edge, Math.max(0, y - bottomZoneStart));
        dy = autoScrollSpeed(depth / edge);
      }

      if (dy !== 0) {
        const next = Math.max(
          0,
          Math.min(lockedScrollMaxRef.current, lockedScrollYRef.current + dy)
        );
        if (next !== lockedScrollYRef.current) {
          lockedScrollYRef.current = next;
          body.style.top = `-${next}px`;
          refreshDragTargets(x, y);
        }
      }

      autoScrollRafRef.current = window.requestAnimationFrame(tick);
    };

    autoScrollRafRef.current = window.requestAnimationFrame(tick);

    return () => {
      document.removeEventListener("touchmove", preventTouchScroll);
      document.removeEventListener("wheel", preventWheel);
      if (autoScrollRafRef.current != null) {
        cancelAnimationFrame(autoScrollRafRef.current);
        autoScrollRafRef.current = null;
      }
      // Clear lock styles explicitly (do not restore polluted "prev" values).
      unlockPageScroll();
    };
  }, [draggingId, hitTestTrash, refreshDragTargets, unlockPageScroll]);

  useEffect(() => {
    return () => clearLongPress();
  }, [clearLongPress]);

  // FLIP animation when cards change order/position in the grid.
  useLayoutEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const nextRects = new Map<string, DOMRect>();
    for (const [id, el] of cardRefs.current) {
      nextRects.set(id, el.getBoundingClientRect());
    }

    const firsts = pendingFlipFromRef.current ?? prevCardRectsRef.current;
    pendingFlipFromRef.current = null;

    if (!prefersReduced) {
      for (const [id, el] of cardRefs.current) {
        if (id === draggingId) continue;
        const prev = firsts.get(id);
        const next = nextRects.get(id);
        if (!prev || !next) continue;

        const dx = prev.left - next.left;
        const dy = prev.top - next.top;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;

        const distance = Math.hypot(dx, dy);
        // Slightly longer travel → slightly longer settle, still soft.
        const duration = Math.min(560, REORDER_MS + distance * 0.12);

        el.style.transition = "none";
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        el.style.zIndex = "2";
        // Force invert paint before releasing to the final slot.
        void el.getBoundingClientRect();
        el.style.transition = `transform ${duration}ms ${REORDER_EASE}`;
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

    prevCardRectsRef.current = nextRects;
  }, [items, draggingId]);

  function startDrag(
    itemId: string,
    pointerId: number,
    clientX: number,
    clientY: number,
    cardEl: HTMLElement
  ) {
    const rect = cardEl.getBoundingClientRect();
    const fromIndex = itemsRef.current.findIndex((item) => item.id === itemId);
    dragSessionRef.current = {
      id: itemId,
      pointerId,
      originX: clientX,
      originY: clientY,
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top,
      fromIndex,
    };
    lastPointerRef.current = { x: clientX, y: clientY };

    // Lock immediately so the browser cannot scroll/refresh before React effects run.
    const html = document.documentElement;
    const body = document.body;
    if (body.style.position !== "fixed") {
      lockedScrollYRef.current = window.scrollY;
      lockedScrollMaxRef.current = Math.max(
        0,
        html.scrollHeight - window.innerHeight
      );
      html.style.overscrollBehavior = "none";
      body.style.overscrollBehavior = "none";
      html.style.touchAction = "none";
      body.style.touchAction = "none";
      body.style.position = "fixed";
      body.style.top = `-${lockedScrollYRef.current}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
    }

    setDragPoint({ x: clientX, y: clientY });
    setDraggingId(itemId);
    setOverTrash(false);
    // No highlight while still in the original place.
    setInsertIndex(null);
    setHighlightId(null);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(12);
    }
  }

  function updateDragPoint(clientX: number, clientY: number) {
    const session = dragSessionRef.current;
    if (!session) return;
    lastPointerRef.current = { x: clientX, y: clientY };
    refreshDragTargets(clientX, clientY);
  }

  function handleCardPointerDown(
    itemId: string,
    e: ReactPointerEvent<HTMLElement>
  ) {
    if (e.button !== 0) return;

    const cardEl = e.currentTarget;
    const startX = e.clientX;
    const startY = e.clientY;
    const pointerId = e.pointerId;
    let activated = false;
    let cancelled = false;

    clearLongPress();
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      if (cancelled) return;
      activated = true;
      try {
        cardEl.setPointerCapture(pointerId);
      } catch {
        // Older browsers may not support capture on this element.
      }
      startDrag(itemId, pointerId, startX, startY, cardEl);
    }, LONG_PRESS_MS);

    function onMove(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return;
      if (activated) {
        ev.preventDefault();
        updateDragPoint(ev.clientX, ev.clientY);
        return;
      }
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      // Finger moved: this is a scroll/swipe, not a long-press drag.
      if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
        cancelled = true;
        clearLongPress();
        cleanup();
      }
    }

    function onUp(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return;
      clearLongPress();
      if (activated) {
        endDrag(ev.clientX, ev.clientY);
      }
      cleanup();
    }

    function onCancel(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return;
      clearLongPress();
      if (activated && dragSessionRef.current) {
        endDrag(ev.clientX, ev.clientY);
      } else {
        cancelled = true;
      }
      cleanup();
    }

    function cleanup() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      try {
        if (cardEl.hasPointerCapture(pointerId)) {
          cardEl.releasePointerCapture(pointerId);
        }
      } catch {
        // ignore
      }
    }

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  }

  function handleCardClick(e: ReactMouseEvent) {
    if (suppressClickRef.current || draggingId) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function openItem(itemId: string) {
    const href = drawHref(itemId);
    if (href !== "#") router.push(href);
  }

  function handleCardContextMenu(e: ReactMouseEvent) {
    // Item cards support long-press dragging, so suppress the browser link menu.
    e.preventDefault();
  }

  function setCardRef(id: string, el: HTMLElement | null) {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }

  const ghostLeft =
    dragPoint.x - (dragSessionRef.current?.offsetX ?? GHOST_W / 2);
  const ghostTop =
    dragPoint.y - (dragSessionRef.current?.offsetY ?? 100);

  return (
    <div
      className={`relative flex flex-col gap-3 ${
        draggingId ? "touch-none select-none" : ""
      }`}
    >
      <header className="flex items-center justify-between rounded-2xl bg-primary px-3 py-2.5 text-primary-foreground shadow-[0_6px_18px_rgba(43,125,233,0.28)]">
        <NavBack
          href={
            customerId
              ? `/design/projects?customer=${customerId}`
              : "/orders"
          }
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/15"
          aria-label="رجوع لمشاريع العميل"
        >
          <BackChevron />
        </NavBack>

        <div className="min-w-0 flex-1 px-2 text-center">
          <p className="truncate text-sm font-bold">
            {project?.name ?? "بنود المشروع"}
          </p>
          <p className="truncate text-[10px] opacity-80">بنود المشروع</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {customerId && projectId ? (
            <Link
              href={ROUTES.design.expenses(customerId, projectId)}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15"
              aria-label="مصروفات المشروع"
              title="مصروفات المشروع"
            >
              <ExpenseIcon />
            </Link>
          ) : null}
          <Link
            href={
              customerId && projectId
                ? ROUTES.design.projectSettings(customerId, projectId)
                : "/settings"
            }
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15"
            aria-label="إعدادات المشروع"
          >
            <SettingsIcon />
          </Link>
          <ProjectReportsMenu
            disabled={!customerId || !projectId}
            onSelect={handleReportAction}
          />
          <button
            type="button"
            onClick={handleShare}
            disabled={!customerId || !projectId}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15 disabled:opacity-60"
            aria-label="مشاركة PDF"
            title="مشاركة PDF"
          >
            <ShareIcon />
          </button>
        </div>
      </header>

      {money ? (
        <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-border bg-card px-2 py-2.5">
          <div className="text-center">
            <p className="text-[9px] text-muted">البيع</p>
            <p className="mt-0.5 text-[11px] font-bold tabular-nums text-foreground">
              {formatCurrency(money.sale)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-muted">المدفوع</p>
            <p className="mt-0.5 text-[11px] font-bold tabular-nums text-[#2F9B7A]">
              {formatCurrency(money.paid)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-muted">المتبقي</p>
            <p
              className={`mt-0.5 text-[11px] font-bold tabular-nums ${
                money.remaining > 0 ? "text-[#E85A8A]" : "text-[#2F9B7A]"
              }`}
            >
              {formatCurrency(money.remaining)}
            </p>
          </div>
          <Link
            href={
              customerId && projectId
                ? ROUTES.design.expenses(customerId, projectId)
                : "#"
            }
            className="text-center transition-opacity hover:opacity-80"
          >
            <p className="text-[9px] text-muted">المصروف</p>
            <p className="mt-0.5 text-[11px] font-bold tabular-nums text-[#C45C26]">
              {formatCurrency(money.expenses)}
            </p>
          </Link>
        </div>
      ) : null}

      {customerId && projectId ? (
        <>
          <ProjectPdfExporter
            ref={pdfExporterRef}
            customerId={customerId}
            projectId={projectId}
            projectName={project?.name}
          />
          <PurchaseOrderPdfExporter
            ref={purchaseOrderRef}
            customerId={customerId}
            projectId={projectId}
            projectName={project?.name}
          />
          <EstimatedCostPdfExporter
            ref={estimatedCostRef}
            customerId={customerId}
            projectId={projectId}
            projectName={project?.name}
          />
        </>
      ) : null}

      <ul
        className={`grid grid-cols-2 auto-rows-fr gap-3 ${
          draggingId ? "touch-none" : ""
        }`}
      >
        <li className="h-full min-h-0">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex h-full w-full flex-col overflow-hidden rounded-xl border-2 border-dashed border-primary/40 bg-card text-primary shadow-[0_1px_4px_rgba(15,20,28,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:bg-primary-soft active:scale-[0.98]"
            aria-label="إضافة بند جديد"
          >
            <div className="flex aspect-square w-full shrink-0 items-center justify-center border-b border-dashed border-primary/30 bg-primary-soft/40 p-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-3xl font-light leading-none text-white shadow-[0_6px_16px_rgba(43,125,233,0.3)]">
                +
              </span>
            </div>
            <div className="flex h-[92px] flex-col items-center justify-center gap-1 p-2.5">
              <span className="text-sm font-semibold">بند جديد</span>
              <span className="text-[10px] text-muted">اختر نموذجاً جاهزاً</span>
            </div>
          </button>
        </li>

        {items.map((item, index) => {
          const isDragging = draggingId === item.id;
          const isDropTarget =
            Boolean(draggingId) &&
            !overTrash &&
            highlightId === item.id &&
            !isDragging;

          return (
            <li
              key={item.id}
              ref={(el) => setCardRef(item.id, el)}
              className="relative h-full min-h-0 touch-pan-y will-change-transform"
              data-item-id={item.id}
            >
              <button
                type="button"
                onPointerDown={(e) => handleCardPointerDown(item.id, e)}
                onClick={(e) => {
                  handleCardClick(e);
                  if (!e.defaultPrevented) openItem(item.id);
                }}
                onContextMenu={handleCardContextMenu}
                className={`flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card shadow-[0_1px_4px_rgba(15,20,28,0.05)] transition-[opacity,transform,box-shadow,border-color,background-color] duration-200 select-none touch-pan-y ${
                  isDragging
                    ? "scale-[0.97] border-border opacity-35 touch-none"
                    : isDropTarget
                      ? "scale-[1.02] border-primary bg-primary-soft/40 shadow-[0_0_0_2px_rgba(43,125,233,0.4)]"
                      : "border-border hover:-translate-y-0.5"
                }`}
                style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
                aria-label={
                  isDropTarget && insertIndex != null
                    ? `إسقاط في الموضع ${insertIndex + 1}`
                    : undefined
                }
              >
                <ItemCardBody
                  item={item}
                  index={index}
                  unit={unit}
                  emphasizeIndex={isDropTarget}
                />
              </button>
            </li>
          );
        })}
      </ul>

      <div
        className={`rounded-2xl border border-border bg-card p-4 transition-opacity ${
          draggingId ? "opacity-40" : ""
        }`}
      >
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">إجمالي العدد</span>
          <span className="font-semibold">{totals.qty}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-muted">إجمالي المساحة</span>
          <span className="font-semibold">{totals.area.toFixed(2)} م²</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <span className="font-medium text-foreground">الإجمالي</span>
          <span className="text-lg font-bold text-primary">
            {formatCurrency(Math.round(totals.price))} ج.م
          </span>
        </div>
      </div>

      {draggingId ? (
        <div
          ref={trashRef}
          className={`fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-md items-center justify-center px-4 pb-6 pt-3 transition-all duration-200 ${
            overTrash ? "translate-y-0" : "translate-y-0"
          }`}
          aria-label="سلة المحذوفات"
        >
          <div
            className={`flex w-full items-center justify-center gap-3 rounded-2xl border-2 px-4 py-4 shadow-[0_-8px_28px_rgba(15,20,28,0.12)] transition-all duration-200 ${
              overTrash
                ? "scale-[1.02] border-red-500 bg-red-500 text-white"
                : "border-red-300 bg-red-50 text-red-700 dark:border-red-500/50 dark:bg-red-950/80 dark:text-red-200"
            }`}
          >
            <TrashIcon active={overTrash} />
            <div className="text-right">
              <p className="text-sm font-bold">
                {overTrash ? "أفلت للحذف" : "سلة المحذوفات"}
              </p>
              <p
                className={`text-[11px] ${
                  overTrash ? "text-white/85" : "opacity-75"
                }`}
              >
                اسحب البند هنا لحذفه نهائيًا
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {draggingItem ? (
        <div
          className="pointer-events-none fixed z-[60] w-[148px] overflow-hidden rounded-xl border border-primary/50 bg-card opacity-95 shadow-[0_16px_36px_rgba(15,20,28,0.24)]"
          style={{
            left: ghostLeft,
            top: ghostTop,
            transform: overTrash
              ? "scale(0.86) rotate(-4deg)"
              : highlightId
                ? "scale(1.06)"
                : "scale(1.03)",
            transition: `transform 180ms ${REORDER_EASE}`,
          }}
          aria-hidden
        >
          <ItemCardBody
            item={draggingItem}
            index={
              insertIndex != null
                ? insertIndex
                : Math.max(
                    0,
                    items.findIndex((i) => i.id === draggingItem.id)
                  )
            }
            unit={unit}
            compact
          />
        </div>
      ) : null}

      <TemplatePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={handleConfirmTemplate}
      />

      {pendingDeleteItem ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 px-4 pb-8 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-item-title"
          onClick={cancelDelete}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-[0_16px_40px_rgba(15,20,28,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="delete-item-title"
              className="text-right text-base font-bold text-foreground"
            >
              تأكيد الحذف
            </h2>
            <p className="mt-2 text-right text-sm text-muted">
              هل تريد حذف «
              {pendingDeleteItem.name?.trim() ||
                suggestItemName(pendingDeleteItem)}
              » نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 rounded-xl bg-red-500 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600"
              >
                حذف
              </button>
              <button
                type="button"
                onClick={cancelDelete}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-primary-soft"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ItemCardBody({
  item,
  index,
  unit,
  compact = false,
  emphasizeIndex = false,
}: {
  item: DesignItem;
  index: number;
  unit: LengthUnit;
  compact?: boolean;
  emphasizeIndex?: boolean;
}) {
  const area = itemAreaSqm(item);
  const price = itemTotalPrice(item);

  return (
    <>
      <div
        className={`flex items-center justify-center border-b border-border bg-primary-soft/50 p-3 ${
          compact ? "aspect-[4/3]" : "aspect-square shrink-0"
        }`}
      >
        <WindowPreview
          style={item.style}
          templateId={item.templateId}
          layout={item.layout}
          panes={item.panes}
          frameColor={item.frameColor}
          widthMm={item.widthMm}
          heightMm={item.heightMm}
          className={`h-full w-auto max-w-full ${
            compact ? "max-h-[88px]" : "max-h-[128px]"
          }`}
        />
      </div>

      <div
        className={`flex gap-2 overflow-hidden p-2.5 ${
          compact ? "min-h-[72px]" : "h-[92px]"
        }`}
      >
        <div className="flex min-w-[2.25rem] flex-col items-center justify-center border-l border-border pl-2 text-center">
          <span className="text-[9px] text-muted">uPVC</span>
          <span
            className={`text-xl font-bold leading-none transition-colors duration-200 ${
              emphasizeIndex ? "text-primary" : "text-foreground"
            }`}
          >
            {index + 1}
          </span>
          <span
            className={`mt-0.5 text-[9px] ${
              emphasizeIndex ? "font-semibold text-primary" : "text-muted"
            }`}
          >
            {emphasizeIndex ? "هنا" : "بند"}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center text-right">
          <p className="truncate text-[11px] font-semibold text-foreground">
            {item.name?.trim() || suggestItemName(item)}
          </p>
          <p
            className="mt-0.5 truncate text-[11px] font-medium text-foreground"
            dir="ltr"
          >
            {formatSizePair(item.widthMm, item.heightMm, unit)}
          </p>
          {!compact ? (
            <p className="mt-0.5 truncate text-[10px] text-muted">
              عدد {item.qty} · {area.toFixed(2)} م²
            </p>
          ) : null}
          <p className="mt-0.5 truncate text-[11px] font-bold text-primary">
            {formatCurrency(Math.round(price))} ج.م
          </p>
        </div>
      </div>
    </>
  );
}

function TrashIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-7 w-7 shrink-0 transition-transform ${
        active ? "scale-110" : ""
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M7 7l1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function ExpenseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 14h3M14 14h2" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.07 7.07 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.55-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.42.34.68.24l2.39-.96c.5.39 1.04.7 1.63.94l.36 2.54c.05.24.26.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.59-.24 1.13-.55 1.63-.94l2.39.96c.26.1.54 0 .68-.24l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.4 13.2l7.2 4.1M15.6 6.7l-7.2 4.1" />
    </svg>
  );
}


