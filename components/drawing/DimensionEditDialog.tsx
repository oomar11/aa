"use client";

import { useEffect, useState } from "react";
import {
  minLengthInUnit,
  unitLabel,
  type LengthUnit,
} from "@/lib/units";

type Props = {
  open: boolean;
  initialValue: number;
  unit: LengthUnit;
  onClose: () => void;
  onConfirm: (value: number) => void;
};

export function DimensionEditDialog({
  open,
  initialValue,
  unit,
  onClose,
  onConfirm,
}: Props) {
  const [raw, setRaw] = useState("");
  const [fresh, setFresh] = useState(true);
  const min = minLengthInUnit(unit);
  const label = unitLabel(unit);

  useEffect(() => {
    if (!open) return;
    setRaw(String(initialValue));
    setFresh(true);
  }, [open, initialValue]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Enter") {
        const n = Number(raw);
        if (Number.isFinite(n) && n >= min) onConfirm(n);
        return;
      }
      if (/^[0-9.]$/.test(e.key)) {
        e.preventDefault();
        press(e.key);
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        backspace();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, raw, fresh, min, onClose, onConfirm]);

  if (!open) return null;

  function press(key: string) {
    setRaw((prev) => {
      if (fresh) {
        setFresh(false);
        return key === "." ? "0." : key;
      }
      if (key === "." && prev.includes(".")) return prev;
      if (prev === "0" && key !== ".") return key;
      if (prev.length >= 7) return prev;
      return prev + key;
    });
  }

  function backspace() {
    setFresh(false);
    setRaw((prev) => (prev.length <= 1 ? "0" : prev.slice(0, -1)));
  }

  function clearAll() {
    setFresh(false);
    setRaw("0");
  }

  function submit() {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < min) return;
    onConfirm(n);
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
  const keyClass =
    "aspect-[1.35] rounded-xl bg-primary text-2xl font-bold text-primary-foreground shadow-sm transition-all hover:brightness-105 active:scale-[0.98]";
  const secondaryClass =
    "flex aspect-[1.2] items-center justify-center rounded-xl border border-border bg-background text-xl font-bold text-foreground transition-colors hover:bg-primary-soft active:scale-[0.98]";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={`إدخال المقاس بـ${label}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[280px] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(15,20,28,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border bg-primary-soft/50 px-3 py-3 text-center">
          <p
            className="text-3xl font-semibold tabular-nums tracking-wide text-foreground"
            dir="ltr"
          >
            {raw || "0"}
          </p>
          <p className="mt-0.5 text-xs font-medium text-muted">{label}</p>
        </div>

        <div className="grid grid-cols-3 gap-1.5 p-2">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              className={keyClass}
            >
              {k}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-1.5 px-2 pb-2">
          <button
            type="button"
            onClick={backspace}
            aria-label="مسح رقم"
            className="flex aspect-[1.35] items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-all hover:brightness-105 active:scale-[0.98]"
          >
            <BackspaceIcon />
          </button>
          <button
            type="button"
            onClick={() => press("0")}
            className={keyClass}
          >
            0
          </button>
          <button
            type="button"
            onClick={() => press(".")}
            className={keyClass}
          >
            .
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5 border-t border-border px-2 py-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="إلغاء"
            className={secondaryClass}
          >
            ✕
          </button>
          <button
            type="button"
            onClick={clearAll}
            aria-label="مسح الكل"
            className={secondaryClass}
          >
            ≪
          </button>
          <button
            type="button"
            onClick={submit}
            aria-label="تأكيد"
            className="flex aspect-[1.2] items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground shadow-sm transition-all hover:brightness-105 active:scale-[0.98]"
          >
            ✓
          </button>
        </div>
      </div>
    </div>
  );
}

function BackspaceIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M9 6h11a1 1 0 011 1v10a1 1 0 01-1 1H9l-5-6 5-6z" strokeLinejoin="round" />
      <path d="M12 10l4 4M16 10l-4 4" strokeLinecap="round" />
    </svg>
  );
}
