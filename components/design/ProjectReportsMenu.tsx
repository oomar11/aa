"use client";

import { useEffect, useId, useRef, useState } from "react";

export type ProjectReportAction = "purchase-order";

type Props = {
  disabled?: boolean;
  onSelect: (action: ProjectReportAction) => void;
};

/**
 * قائمة ⋮ لتقارير المشروع (طلبية مشتريات وغيرها لاحقًا).
 * زر المشاركة منفصل ويظل كما هو.
 */
export function ProjectReportsMenu({ disabled, onSelect }: Props) {
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

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-label="تقارير المشروع"
        title="تقارير المشروع"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15 disabled:opacity-60"
      >
        <MoreIcon />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="تقارير المشروع"
          className="absolute top-[calc(100%+6px)] left-0 z-50 min-w-[200px] overflow-hidden rounded-xl border border-border bg-card py-1 text-foreground shadow-[0_12px_28px_rgba(15,20,28,0.18)]"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-right text-sm font-semibold transition-colors hover:bg-primary-soft"
            onClick={() => {
              setOpen(false);
              onSelect("purchase-order");
            }}
          >
            <span>طلبية مشتريات</span>
            <span className="text-[10px] font-medium text-muted">PDF</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}
