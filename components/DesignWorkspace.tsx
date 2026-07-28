"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { TemplatePickerModal } from "@/components/TemplatePickerModal";
import { WindowPreview } from "@/components/WindowPreview";
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
import { formatCurrency } from "@/lib/utils";
import { formatSizePair, type LengthUnit } from "@/lib/units";
import { useUnit } from "@/components/UnitProvider";
import type { LayoutNode } from "@/lib/window-layout";

const LONG_PRESS_MS = 320;
const MOVE_CANCEL_PX = 14;
const GHOST_W = 148;
const AUTO_SCROLL_EDGE_PX = 64;
const AUTO_SCROLL_MAX_PX = 10;
const TRASH_SAFE_PX = 112;

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
};

export function DesignWorkspace({ customerId, projectId }: Props) {
  const router = useRouter();
  const { unit } = useUnit();
  const [project, setProject] = useState<Project | undefined>();
  const [items, setItems] = useState<DesignItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPoint, setDragPoint] = useState({ x: 0, y: 0 });
  const [overTrash, setOverTrash] = useState(false);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
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
    const item = createItemFromTemplate(templateId, layout, items.length + 1);
    persist([item, ...items]);
    setPickerOpen(false);
    router.push(drawHref(item.id));
  }

  function handleShare() {
    const text = items
      .map(
        (item, i) =>
          `${i + 1}- ${item.name}: ${formatSizePair(item.widthMm, item.heightMm, unit)} · عدد ${item.qty} · ${formatCurrency(Math.round(itemTotalPrice(item)))} ج.م`
      )
      .join("\n");

    const payload = `طلب تصميم UPVC${project ? ` — ${project.name}` : ""}${customerId ? ` (عميل ${customerId})` : ""}\n${text}\nالإجمالي: ${formatCurrency(Math.round(totals.price))} ج.م`;

    if (navigator.share) {
      void navigator.share({ title: "UPVC Design", text: payload });
      return;
    }

    void navigator.clipboard?.writeText(payload);
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

  const hitTestInsertIndex = useCallback(
    (clientX: number, clientY: number, activeId: string) => {
      const current = itemsRef.current;
      let bestIndex = current.findIndex((item) => item.id === activeId);
      if (bestIndex < 0) bestIndex = current.length;
      let bestDist = Number.POSITIVE_INFINITY;

      for (let i = 0; i < current.length; i++) {
        const item = current[i];
        if (item.id === activeId) continue;
        const el = cardRefs.current.get(item.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = (clientX - cx) ** 2 + (clientY - cy) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          bestIndex = clientX < cx ? i : i + 1;
        }
      }

      const from = current.findIndex((item) => item.id === activeId);
      if (from >= 0 && bestIndex > from) bestIndex -= 1;
      return Math.max(0, Math.min(current.length - 1, bestIndex));
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
        const toIndex = hitTestInsertIndex(clientX, clientY, id);
        const next = [...itemsRef.current];
        const from = next.findIndex((item) => item.id === id);
        if (from >= 0 && toIndex !== from) {
          const [moved] = next.splice(from, 1);
          next.splice(toIndex, 0, moved);
          persist(next);
        }
      }

      // Always clear the fixed-body lock here so scrolling returns immediately.
      unlockPageScroll();
      setDraggingId(null);
      setOverTrash(false);
      setInsertIndex(null);
    },
    [hitTestInsertIndex, hitTestTrash, persist, unlockPageScroll]
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
        setInsertIndex(hitTestInsertIndex(clientX, clientY, session.id));
      } else {
        setInsertIndex(null);
      }
    },
    [hitTestInsertIndex, hitTestTrash]
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
      const topZone = AUTO_SCROLL_EDGE_PX;
      const bottomZoneStart = vh - TRASH_SAFE_PX - AUTO_SCROLL_EDGE_PX;
      const bottomZoneEnd = vh - TRASH_SAFE_PX;
      let dy = 0;

      if (y < topZone) {
        const t = (topZone - y) / topZone;
        dy = -Math.ceil(AUTO_SCROLL_MAX_PX * t * t);
      } else if (
        y > bottomZoneStart &&
        y < bottomZoneEnd &&
        !hitTestTrash(x, y)
      ) {
        const t = (y - bottomZoneStart) / AUTO_SCROLL_EDGE_PX;
        dy = Math.ceil(AUTO_SCROLL_MAX_PX * t * t);
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

  function startDrag(
    itemId: string,
    pointerId: number,
    clientX: number,
    clientY: number,
    cardEl: HTMLElement
  ) {
    const rect = cardEl.getBoundingClientRect();
    dragSessionRef.current = {
      id: itemId,
      pointerId,
      originX: clientX,
      originY: clientY,
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top,
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
    setInsertIndex(itemsRef.current.findIndex((item) => item.id === itemId));
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
        <div className="flex items-center gap-1">
          <Link
            href={
              customerId && projectId
                ? `/design/project-settings?customer=${customerId}&project=${projectId}`
                : "/settings"
            }
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15"
            aria-label="إعدادات المشروع"
          >
            <SettingsIcon />
          </Link>
          <button
            type="button"
            onClick={handleShare}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15"
            aria-label="مشاركة"
          >
            <ShareIcon />
          </button>
        </div>

        <div className="min-w-0 flex-1 px-2 text-center">
          <p className="truncate text-sm font-bold">
            {project?.name ?? "مساحة التصميم"}
          </p>
          <p className="truncate text-[10px] opacity-80">بنود المشروع</p>
        </div>

        <Link
          href={customerId ? "/design/customers" : "/design"}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15"
          aria-label="رجوع للعملاء"
        >
          <BackIcon />
        </Link>
      </header>

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
              <span className="text-[10px] text-muted">اختَر تمبلت جاهز</span>
            </div>
          </button>
        </li>

        {items.map((item, index) => {
          const isDragging = draggingId === item.id;
          const isDropTarget =
            draggingId &&
            insertIndex !== null &&
            !overTrash &&
            insertIndex === index &&
            draggingId !== item.id;

          return (
            <li
              key={item.id}
              ref={(el) => setCardRef(item.id, el)}
              className="relative h-full min-h-0 touch-pan-y"
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
                className={`flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card shadow-[0_1px_4px_rgba(15,20,28,0.05)] transition-[opacity,transform,box-shadow,border-color] duration-200 select-none touch-pan-y ${
                  isDragging
                    ? "scale-[0.97] border-border opacity-35 touch-none"
                    : isDropTarget
                      ? "border-primary shadow-[0_0_0_2px_rgba(43,125,233,0.35)]"
                      : "border-border hover:-translate-y-0.5"
                }`}
                style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
              >
                <ItemCardBody item={item} index={index} unit={unit} />
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
          className="pointer-events-none fixed z-[60] w-[148px] overflow-hidden rounded-xl border border-border bg-card opacity-90 shadow-[0_12px_32px_rgba(15,20,28,0.22)]"
          style={{
            left: ghostLeft,
            top: ghostTop,
            transform: overTrash ? "scale(0.88) rotate(-3deg)" : "scale(1.04)",
            transition: "transform 120ms ease",
          }}
          aria-hidden
        >
          <ItemCardBody
            item={draggingItem}
            index={Math.max(
              0,
              items.findIndex((i) => i.id === draggingItem.id)
            )}
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
}: {
  item: DesignItem;
  index: number;
  unit: LengthUnit;
  compact?: boolean;
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
          <span className="text-xl font-bold leading-none text-foreground">
            {index + 1}
          </span>
          <span className="mt-0.5 text-[9px] text-muted">بند</span>
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

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
