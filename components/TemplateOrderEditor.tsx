"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { TemplatePreview } from "@/components/TemplatePreview";
import {
  getDefaultTemplateOrder,
  getOrderedTemplates,
  loadTemplateOrder,
  moveItemToSlot,
  resetTemplateOrder,
  saveTemplateOrder,
} from "@/lib/template-order";
import type { WindowTemplate } from "@/lib/window-templates";

const LONG_PRESS_MS = 280;
const MOVE_CANCEL_PX = 12;
const GHOST_W = 112;
const REORDER_MS = 380;
const REORDER_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const AUTO_SCROLL_EDGE = 90;
const AUTO_SCROLL_MAX = 14;

type DragSession = {
  id: string;
  pointerId: number;
  originX: number;
  originY: number;
  offsetX: number;
  offsetY: number;
  fromIndex: number;
};

export function TemplateOrderEditor() {
  const [order, setOrder] = useState<string[]>(getDefaultTemplateOrder);
  const [templates, setTemplates] = useState<WindowTemplate[]>(() =>
    getOrderedTemplates(getDefaultTemplateOrder())
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPoint, setDragPoint] = useState({ x: 0, y: 0 });
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const orderRef = useRef(order);
  const dragSessionRef = useRef<DragSession | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const autoScrollRafRef = useRef<number | null>(null);
  const lockedScrollYRef = useRef(0);
  const lockedScrollMaxRef = useRef(0);
  const prevCardRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const pendingFlipFromRef = useRef<Map<string, DOMRect> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const ids = loadTemplateOrder();
    // Sync saved preference after mount (localStorage unavailable during SSR).
    queueMicrotask(() => {
      setOrder(ids);
      setTemplates(getOrderedTemplates(ids));
    });
  }, []);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const persist = useCallback((ids: string[]) => {
    const saved = saveTemplateOrder(ids);
    setOrder(saved);
    setTemplates(getOrderedTemplates(saved));
    setSavedFlash(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setSavedFlash(false), 2000);
  }, []);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

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

  const hitTestDrop = useCallback(
    (clientX: number, clientY: number, activeId: string) => {
      const current = orderRef.current;
      const from = current.indexOf(activeId);
      if (from < 0) return null;

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

      for (let i = 0; i < current.length; i++) {
        const id = current[i]!;
        if (id === activeId) continue;
        const el = cardRefs.current.get(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          return { insertIndex: i, highlightId: id };
        }
      }

      let bestId: string | null = null;
      let bestIndex = -1;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < current.length; i++) {
        const id = current[i]!;
        if (id === activeId) continue;
        const el = cardRefs.current.get(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const dist = Math.hypot(
          clientX - (rect.left + rect.width / 2),
          clientY - (rect.top + rect.height / 2)
        );
        const reach = Math.max(rect.width, rect.height) * 0.7;
        if (dist <= reach && dist < bestDist) {
          bestDist = dist;
          bestId = id;
          bestIndex = i;
        }
      }

      if (!bestId || bestIndex < 0 || bestIndex === from) return null;
      return { insertIndex: bestIndex, highlightId: bestId };
    },
    []
  );

  const refreshDragTargets = useCallback(
    (clientX: number, clientY: number) => {
      const session = dragSessionRef.current;
      if (!session) return;
      setDragPoint({ x: clientX, y: clientY });
      const hit = hitTestDrop(clientX, clientY, session.id);
      setHighlightId(hit?.highlightId ?? null);
    },
    [hitTestDrop]
  );

  const endDrag = useCallback(
    (clientX: number, clientY: number) => {
      const session = dragSessionRef.current;
      if (!session) return;

      if (autoScrollRafRef.current != null) {
        cancelAnimationFrame(autoScrollRafRef.current);
        autoScrollRafRef.current = null;
      }

      const id = session.id;
      dragSessionRef.current = null;

      const hit = hitTestDrop(clientX, clientY, id);
      const current = orderRef.current;
      const from = current.indexOf(id);
      if (hit && from >= 0 && hit.insertIndex !== from) {
        const firsts = new Map<string, DOMRect>();
        for (const [cardId, el] of cardRefs.current) {
          firsts.set(cardId, el.getBoundingClientRect());
        }
        pendingFlipFromRef.current = firsts;
        persist(moveItemToSlot(current, from, hit.insertIndex));
      }

      unlockPageScroll();
      setDraggingId(null);
      setHighlightId(null);
    },
    [hitTestDrop, persist, unlockPageScroll]
  );

  useEffect(() => {
    if (!draggingId) return;

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

    function preventTouchScroll(ev: TouchEvent) {
      ev.preventDefault();
    }
    function preventWheel(ev: WheelEvent) {
      ev.preventDefault();
    }
    function preventSelect(ev: Event) {
      ev.preventDefault();
    }

    document.addEventListener("touchmove", preventTouchScroll, {
      passive: false,
    });
    document.addEventListener("wheel", preventWheel, { passive: false });
    document.addEventListener("selectstart", preventSelect);
    window.getSelection()?.removeAllRanges();

    const tick = () => {
      if (!dragSessionRef.current) {
        autoScrollRafRef.current = null;
        return;
      }
      const { x, y } = lastPointerRef.current;
      const vh = window.innerHeight;
      let dy = 0;
      if (y < AUTO_SCROLL_EDGE) {
        const t = (AUTO_SCROLL_EDGE - y) / AUTO_SCROLL_EDGE;
        dy = -Math.max(1, Math.round(AUTO_SCROLL_MAX * t * t * (3 - 2 * t)));
      } else if (y > vh - AUTO_SCROLL_EDGE) {
        const t = (y - (vh - AUTO_SCROLL_EDGE)) / AUTO_SCROLL_EDGE;
        dy = Math.max(1, Math.round(AUTO_SCROLL_MAX * t * t * (3 - 2 * t)));
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
      document.removeEventListener("selectstart", preventSelect);
      if (autoScrollRafRef.current != null) {
        cancelAnimationFrame(autoScrollRafRef.current);
        autoScrollRafRef.current = null;
      }
      unlockPageScroll();
    };
  }, [draggingId, refreshDragTargets, unlockPageScroll]);

  useEffect(() => () => clearLongPress(), [clearLongPress]);

  useLayoutEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const nodes = Array.from(cardRefs.current.entries());
    const nextRects = new Map<string, DOMRect>();
    for (const [id, el] of nodes) {
      nextRects.set(id, el.getBoundingClientRect());
    }

    const firsts = pendingFlipFromRef.current ?? prevCardRectsRef.current;
    pendingFlipFromRef.current = null;

    if (!prefersReduced) {
      for (const [id, el] of nodes) {
        if (id === draggingId) continue;
        const prev = firsts.get(id);
        const next = nextRects.get(id);
        if (!prev || !next) continue;
        const dx = prev.left - next.left;
        const dy = prev.top - next.top;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
        playFlip(el, dx, dy);
      }
    }

    prevCardRectsRef.current = nextRects;
  }, [order, draggingId]);

  function startDrag(
    id: string,
    pointerId: number,
    clientX: number,
    clientY: number,
    el: HTMLElement
  ) {
    const fromIndex = orderRef.current.indexOf(id);
    if (fromIndex < 0) return;
    const rect = el.getBoundingClientRect();
    window.getSelection()?.removeAllRanges();
    dragSessionRef.current = {
      id,
      pointerId,
      originX: clientX,
      originY: clientY,
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top,
      fromIndex,
    };
    lastPointerRef.current = { x: clientX, y: clientY };
    setDragPoint({ x: clientX, y: clientY });
    setDraggingId(id);
    try {
      el.setPointerCapture(pointerId);
    } catch {
      /* ignore */
    }
  }

  function onCardPointerDown(e: ReactPointerEvent<HTMLElement>, id: string) {
    if (e.button !== 0) return;
    // Avoid native text selection / callouts while preparing a long-press drag.
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    const el = e.currentTarget;
    const startX = e.clientX;
    const startY = e.clientY;
    clearLongPress();

    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      startDrag(id, e.pointerId, startX, startY, el);
    }, LONG_PRESS_MS);

    function onMove(ev: PointerEvent) {
      if (dragSessionRef.current) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
        clearLongPress();
        cleanup();
      }
    }

    function onUp() {
      clearLongPress();
      cleanup();
    }

    function cleanup() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function onCardPointerMove(e: ReactPointerEvent<HTMLElement>) {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== e.pointerId) return;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    refreshDragTargets(e.clientX, e.clientY);
  }

  function onCardPointerUp(e: ReactPointerEvent<HTMLElement>) {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== e.pointerId) return;
    endDrag(e.clientX, e.clientY);
  }

  function moveBy(id: string, delta: number) {
    const from = order.indexOf(id);
    if (from < 0) return;
    const to = from + delta;
    if (to < 0 || to >= order.length) return;
    const firsts = new Map<string, DOMRect>();
    for (const [cardId, el] of cardRefs.current) {
      firsts.set(cardId, el.getBoundingClientRect());
    }
    pendingFlipFromRef.current = firsts;
    persist(moveItemToSlot(order, from, to));
  }

  function handleReset() {
    const ids = resetTemplateOrder();
    setOrder(ids);
    setTemplates(getOrderedTemplates(ids));
    setSavedFlash(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setSavedFlash(false), 2000);
  }

  const draggingTemplate =
    templates.find((t) => t.id === draggingId) ?? null;

  return (
    <div
      className={`flex flex-col gap-3 ${
        draggingId ? "touch-none select-none" : "select-none"
      }`}
    >
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">ترتيب التمبلتات</p>
          <p className="mt-0.5 text-xs text-muted">
            اضغط مطوّلاً واسحب لإعادة الترتيب — أو استخدم الأسهم
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all duration-300 ${
            savedFlash
              ? "bg-primary/15 text-primary opacity-100"
              : "pointer-events-none bg-transparent text-muted opacity-0"
          }`}
          aria-live="polite"
        >
          تم الحفظ
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {templates.map((tpl, index) => {
          const active = tpl.id === draggingId;
          const highlighted = tpl.id === highlightId;
          return (
            <div
              key={tpl.id}
              ref={(node) => {
                if (node) cardRefs.current.set(tpl.id, node);
                else cardRefs.current.delete(tpl.id);
              }}
              className={`relative flex flex-col overflow-hidden rounded-xl border bg-card select-none transition-[box-shadow,border-color,opacity] ${
                active
                  ? "pointer-events-none border-transparent opacity-30 touch-none"
                  : highlighted
                    ? "border-primary shadow-[0_0_0_3px_rgba(43,125,233,0.18)]"
                    : "border-border"
              }`}
              style={{
                touchAction: draggingId ? "none" : "manipulation",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none",
                userSelect: "none",
              }}
              onPointerDown={(e) => onCardPointerDown(e, tpl.id)}
              onPointerMove={onCardPointerMove}
              onPointerUp={onCardPointerUp}
              onPointerCancel={onCardPointerUp}
              onContextMenu={(e) => e.preventDefault()}
            >
              <div className="flex h-[6.5rem] items-center justify-center p-2">
                <TemplatePreview
                  layout={tpl.layout}
                  className="h-full w-full max-h-full max-w-full pointer-events-none"
                />
              </div>
              <div className="flex items-center justify-between border-t border-border px-1 py-1">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary-soft hover:text-primary disabled:opacity-30"
                  aria-label="تحريك لليسار في الترتيب"
                  disabled={index === 0 || Boolean(draggingId)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveBy(tpl.id, -1);
                  }}
                >
                  <ArrowIcon dir="prev" />
                </button>
                <span className="text-[10px] font-semibold tabular-nums text-muted">
                  {index + 1}
                </span>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary-soft hover:text-primary disabled:opacity-30"
                  aria-label="تحريك لليمين في الترتيب"
                  disabled={index === templates.length - 1 || Boolean(draggingId)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveBy(tpl.id, 1);
                  }}
                >
                  <ArrowIcon dir="next" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleReset}
        className="mt-1 flex h-11 w-full items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:bg-primary-soft"
      >
        استعادة الترتيب الافتراضي
      </button>

      {draggingTemplate ? (
        <div
          className="pointer-events-none fixed z-[60] overflow-hidden rounded-xl border border-primary bg-card p-2 shadow-[0_16px_40px_rgba(15,20,28,0.22)]"
          style={{
            width: GHOST_W,
            height: GHOST_W,
            left: dragPoint.x - GHOST_W / 2,
            top: dragPoint.y - GHOST_W / 2,
            transform: "rotate(-3deg) scale(1.04)",
          }}
        >
          <TemplatePreview
            layout={draggingTemplate.layout}
            className="h-full w-full"
          />
        </div>
      ) : null}
    </div>
  );
}

function ArrowIcon({ dir }: { dir: "prev" | "next" }) {
  // RTL: "prev" moves earlier in order (visual right), "next" later (visual left)
  const d =
    dir === "prev"
      ? "M9 6l6 6-6 6"
      : "M15 6l-6 6 6 6";
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden
    >
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function playFlip(el: HTMLElement, dx: number, dy: number) {
  el.style.transition = "none";
  el.style.transform = `translate(${dx}px, ${dy}px)`;
  void el.offsetWidth;
  el.style.transition = `transform ${REORDER_MS}ms ${REORDER_EASE}`;
  el.style.transform = "";
}
