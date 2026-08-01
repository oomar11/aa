"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

export type ProjectMoreAction =
  | "share-quote"
  | "purchase-order"
  | "estimated-cost";

type Props = {
  disabled?: boolean;
  expensesHref?: string;
  settingsHref?: string;
  onSelect: (action: ProjectMoreAction) => void;
};

/**
 * قائمة «المزيد» لهيدر المشروع — بدل تكدس الأيقونات.
 */
export function ProjectMoreMenu({
  disabled,
  expensesHref,
  settingsHref,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(action: ProjectMoreAction) {
    setOpen(false);
    onSelect(action);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-label="المزيد"
        title="المزيد"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition-colors hover:bg-white/15 disabled:opacity-60"
      >
        المزيد
        <MoreIcon />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="إجراءات المشروع"
          className="absolute top-[calc(100%+6px)] left-0 z-50 min-w-[210px] overflow-hidden rounded-xl border border-border bg-card py-1 text-foreground shadow-[0_12px_28px_rgba(15,20,28,0.18)]"
        >
          {expensesHref ? (
            <Link
              href={expensesHref}
              role="menuitem"
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-right text-sm font-semibold transition-colors hover:bg-primary-soft"
              onClick={() => setOpen(false)}
            >
              مصروفات المشروع
            </Link>
          ) : null}
          {settingsHref ? (
            <Link
              href={settingsHref}
              role="menuitem"
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-right text-sm font-semibold transition-colors hover:bg-primary-soft"
              onClick={() => setOpen(false)}
            >
              إعدادات المشروع
            </Link>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-right text-sm font-semibold transition-colors hover:bg-primary-soft"
            onClick={() => pick("share-quote")}
          >
            <span>مشاركة المقايسة</span>
            <span className="text-[10px] font-medium text-muted">PDF</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-right text-sm font-semibold transition-colors hover:bg-primary-soft"
            onClick={() => pick("purchase-order")}
          >
            <span>طلبية مشتريات</span>
            <span className="text-[10px] font-medium text-muted">PDF</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-right text-sm font-semibold transition-colors hover:bg-primary-soft"
            onClick={() => pick("estimated-cost")}
          >
            <span>تكلفة تقديرية</span>
            <span className="text-[10px] font-medium text-muted">PDF</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** توافق قديم */
export type ProjectReportAction = "purchase-order" | "estimated-cost";
export function ProjectReportsMenu({
  disabled,
  onSelect,
}: {
  disabled?: boolean;
  onSelect: (action: ProjectReportAction) => void;
}) {
  return (
    <ProjectMoreMenu
      disabled={disabled}
      onSelect={(action) => {
        if (action === "purchase-order" || action === "estimated-cost") {
          onSelect(action);
        }
      }}
    />
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}
