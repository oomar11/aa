"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { NumericInput } from "@/components/ui/NumericInput";
import {
  EXTRA_CHARGE_PRESETS,
  createExtraChargeItem,
  isExtraChargeItem,
  type DesignItem,
} from "@/lib/design-items";
import { formatCurrency } from "@/lib/utils";

type Props = {
  open: boolean;
  initial?: DesignItem | null;
  onClose: () => void;
  onConfirm: (item: DesignItem) => void;
};

export function ExtraChargeEditor({
  open,
  initial,
  onClose,
  onConfirm,
}: Props) {
  if (!open) return null;
  return (
    <ExtraChargeForm
      key={initial?.id ?? "new"}
      initial={initial}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

function ExtraChargeForm({
  initial,
  onClose,
  onConfirm,
}: Omit<Props, "open">) {
  const titleId = useId();
  const editing = Boolean(initial && isExtraChargeItem(initial));
  const [name, setName] = useState(
    initial && isExtraChargeItem(initial)
      ? initial.name?.trim() || "تركيب"
      : "تركيب"
  );
  const [qty, setQty] = useState(
    initial && isExtraChargeItem(initial) ? Math.max(1, initial.qty || 1) : 1
  );
  const [unitPrice, setUnitPrice] = useState(
    initial && isExtraChargeItem(initial)
      ? Number.isFinite(Number(initial.specialPrice))
        ? Number(initial.specialPrice)
        : 0
      : 0
  );
  const [notes, setNotes] = useState(
    initial && isExtraChargeItem(initial) ? initial.notes ?? "" : ""
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const total =
    Math.max(1, qty) *
    (Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : 0);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim() || "إضافة";
    onConfirm(
      createExtraChargeItem({
        id: editing && initial ? initial.id : undefined,
        name: trimmed,
        qty,
        unitPrice,
        notes,
      })
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(86dvh,640px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(15,20,28,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="min-w-0 text-right">
            <h2 id={titleId} className="text-base font-bold text-foreground">
              {editing ? "تعديل إضافة" : "بند إضافي"}
            </h2>
            <p className="text-xs text-muted">
              تركيب أو أي حاجة زيادة مش شباك — تظهر على الفاتورة والحساب
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-primary-soft hover:text-primary"
            aria-label="إغلاق"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <p className="mb-2 text-[11px] font-semibold text-muted">نوع الإضافة</p>
            <div className="flex flex-wrap gap-1.5">
              {EXTRA_CHARGE_PRESETS.map((preset) => {
                const active = name.trim() === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setName(preset)}
                    className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                      active
                        ? "bg-primary text-white"
                        : "bg-primary-soft text-primary hover:bg-primary/15"
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-[11px] font-semibold text-muted">
                الاسم على الفاتورة
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال تركيب الدور الثالث"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-primary"
              />
            </label>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-muted">
                  العدد
                </span>
                <NumericInput
                  value={qty}
                  onChange={setQty}
                  min={1}
                  fallback={1}
                  round
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold tabular-nums text-foreground outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-muted">
                  سعر القطعة
                </span>
                <NumericInput
                  value={unitPrice}
                  onChange={setUnitPrice}
                  min={0}
                  fallback={0}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold tabular-nums text-foreground outline-none focus:border-primary"
                />
              </label>
            </div>

            <label className="mt-3 block">
              <span className="mb-1 block text-[11px] font-semibold text-muted">
                ملاحظة (اختياري)
              </span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="تفاصيل الزيادة اللي العميل طلبها"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>

            <p className="mt-3 text-[12px] text-muted">
              الإجمالي{" "}
              <span className="font-bold tabular-nums text-foreground">
                {formatCurrency(total)} ج.م
              </span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-border px-4 py-3">
            <button
              type="submit"
              className="flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              {editing ? "حفظ" : "إضافة على الفاتورة"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 items-center justify-center rounded-xl border border-border text-sm font-bold text-muted transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
