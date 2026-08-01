"use client";

import { useEffect, useState } from "react";
import { TemplatePreview } from "@/components/design/TemplatePreview";
import { getOrderedTemplates } from "@/lib/template-order";
import type { LayoutNode } from "@/lib/window-layout";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (templateId: string, layout: LayoutNode) => void;
};

export function TemplatePickerModal({ open, onClose, onConfirm }: Props) {
  const templates = open ? getOrderedTemplates() : [];
  const [selectedId, setSelectedId] = useState<string>("");
  const [wasOpen, setWasOpen] = useState(false);

  if (open && !wasOpen) {
    setWasOpen(true);
    setSelectedId(templates[0]?.id ?? "");
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const selected = templates.find((t) => t.id === selectedId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-picker-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(86dvh,640px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(15,20,28,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="min-w-0 text-right">
            <h2
              id="template-picker-title"
              className="text-base font-bold text-foreground"
            >
              اختيار التمبلت
            </h2>
            <p className="text-xs text-muted">اختر شكل الشباك ثم أكّد</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-primary-soft hover:text-primary"
            aria-label="إغلاق"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="grid grid-cols-3 gap-2.5">
            {templates.map((tpl) => {
              const active = tpl.id === selectedId;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedId(tpl.id)}
                  className={`flex h-[7.25rem] items-center justify-center overflow-hidden rounded-xl border p-2 transition-all active:scale-[0.97] ${
                    active
                      ? "border-primary bg-primary-soft shadow-[0_0_0_3px_rgba(43,125,233,0.18)]"
                      : "border-border bg-background hover:border-primary/40 hover:bg-primary-soft/40"
                  }`}
                  aria-pressed={active}
                  aria-label={tpl.id}
                >
                  <TemplatePreview
                    layout={tpl.layout}
                    className="h-full w-full max-h-full max-w-full"
                  />
                </button>
              );
            })}
          </div>
        </div>

        <footer className="grid grid-cols-2 gap-3 border-t border-border p-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 items-center justify-center rounded-2xl border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:bg-primary-soft"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => {
              if (!selected) return;
              onConfirm(selected.id, selected.layout);
            }}
            className="flex h-12 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98]"
          >
            تأكيد
          </button>
        </footer>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
