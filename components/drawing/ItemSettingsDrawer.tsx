"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  FRAME_COLORS,
  type DesignItem,
  type FrameColorId,
} from "@/lib/design-items";
import {
  DISCOUNT_OPTIONS,
  GLASS_OPTIONS,
  SYSTEM_OPTIONS,
  type DiscountId,
  type GlassId,
  type SystemId,
} from "@/lib/item-catalogs";
import { suggestItemName } from "@/lib/item-naming";

export type ItemSettingsPatch = {
  name: string;
  nameIsCustom: boolean;
  qty: number;
  notes: string;
  specialPrice: number | null;
  discountId: DiscountId;
  systemId: SystemId;
  glassId: GlassId;
  frameColor: FrameColorId;
};

type Props = {
  open: boolean;
  item: DesignItem;
  onClose: () => void;
  onConfirm: (patch: ItemSettingsPatch) => void;
};

function toDraft(item: DesignItem): ItemSettingsPatch {
  return {
    name: item.name || suggestItemName(item),
    nameIsCustom: Boolean(item.nameIsCustom),
    qty: Math.max(1, item.qty || 1),
    notes: item.notes ?? "",
    specialPrice:
      item.specialPrice != null && Number.isFinite(item.specialPrice)
        ? item.specialPrice
        : null,
    discountId: (item.discountId as DiscountId) || "none",
    systemId: (item.systemId as SystemId) || "none",
    glassId: (item.glassId as GlassId) || "none",
    frameColor: (item.frameColor as FrameColorId) || "white",
  };
}

export function ItemSettingsDrawer({ open, item, onClose, onConfirm }: Props) {
  const [draft, setDraft] = useState<ItemSettingsPatch>(() => toDraft(item));
  const [specialText, setSpecialText] = useState(
    item.specialPrice != null && item.specialPrice > 0
      ? String(item.specialPrice)
      : ""
  );

  useEffect(() => {
    if (!open) return;
    const next = toDraft(item);
    setDraft(next);
    setSpecialText(
      next.specialPrice != null && next.specialPrice > 0
        ? String(next.specialPrice)
        : ""
    );
  }, [open, item]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function commit() {
    const parsed = specialText.trim() === "" ? null : Number(specialText);
    const trimmed = draft.name.trim();
    onConfirm({
      ...draft,
      name: trimmed || suggestItemName(item),
      nameIsCustom: trimmed ? draft.nameIsCustom : false,
      specialPrice:
        parsed != null && Number.isFinite(parsed) && parsed > 0 ? parsed : null,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex"
      role="dialog"
      aria-modal="true"
      aria-label="تفاصيل البند"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="إغلاق"
        onClick={onClose}
      />

      <aside
        className="relative z-10 flex h-full w-[min(86vw,340px)] max-w-full flex-col border-r border-border bg-background shadow-[8px_0_40px_rgba(15,20,28,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-3 py-3">
          <div className="min-w-0 text-right">
            <h2 className="text-base font-bold text-foreground">تفاصيل البند</h2>
            <p className="text-[11px] text-muted">الاسم · العدد · السعر · النظام</p>
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

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          <Section title="اسم البند">
            <div className="space-y-2">
              <input
                type="text"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    name: e.target.value,
                    nameIsCustom: true,
                  }))
                }
                placeholder="اسم البند"
                className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary focus:bg-card"
              />
              <button
                type="button"
                onClick={() => {
                  const smart = suggestItemName({
                    ...item,
                    ...draft,
                    specialPrice:
                      specialText.trim() === ""
                        ? null
                        : Number(specialText) || null,
                  });
                  setDraft((d) => ({
                    ...d,
                    name: smart,
                    nameIsCustom: false,
                  }));
                }}
                className="flex w-full items-center justify-center rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft"
              >
                تسمية ذكية من الرسم
              </button>
              {!draft.nameIsCustom && (
                <p className="text-[11px] text-muted">
                  الاسم يتحدث تلقائياً مع الرسم
                </p>
              )}
              {draft.nameIsCustom && (
                <p className="text-[11px] text-muted">
                  اسم مخصص — مش هيتغيّر مع الرسم
                </p>
              )}
            </div>
          </Section>

          <Section title="عدد">
            <div className="flex items-center overflow-hidden rounded-2xl border border-border bg-background">
              <button
                type="button"
                className="flex h-11 w-12 items-center justify-center text-xl font-bold text-primary transition-colors hover:bg-primary-soft"
                aria-label="إنقاص"
                onClick={() =>
                  setDraft((d) => ({ ...d, qty: Math.max(1, d.qty - 1) }))
                }
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={draft.qty}
                onChange={(e) => {
                  const n = Math.max(1, Math.floor(Number(e.target.value) || 1));
                  setDraft((d) => ({ ...d, qty: n }));
                }}
                className="h-11 min-w-0 flex-1 border-x border-border bg-card text-center text-base font-semibold text-foreground outline-none"
              />
              <button
                type="button"
                className="flex h-11 w-12 items-center justify-center text-xl font-bold text-primary transition-colors hover:bg-primary-soft"
                aria-label="زيادة"
                onClick={() =>
                  setDraft((d) => ({ ...d, qty: d.qty + 1 }))
                }
              >
                +
              </button>
            </div>
          </Section>

          <Section title="مذكرة">
            <textarea
              value={draft.notes}
              onChange={(e) =>
                setDraft((d) => ({ ...d, notes: e.target.value }))
              }
              rows={3}
              placeholder="اكتب ملاحظة على البند…"
              className="w-full resize-none rounded-2xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary focus:bg-card"
            />
          </Section>

          <Section title="السعر الخاص">
            <input
              type="number"
              min={0}
              inputMode="decimal"
              value={specialText}
              onChange={(e) => setSpecialText(e.target.value)}
              placeholder="اتركه فاضي للحساب العادي"
              className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary focus:bg-card"
            />
          </Section>

          <Section title="مخطط مالي">
            <RadioList
              name="discount"
              options={DISCOUNT_OPTIONS.map((o) => ({
                id: o.id,
                label: o.label,
              }))}
              value={draft.discountId}
              onChange={(id) =>
                setDraft((d) => ({ ...d, discountId: id as DiscountId }))
              }
            />
          </Section>

          <Section title="نظام النوافذ">
            <RadioList
              name="system"
              options={SYSTEM_OPTIONS}
              value={draft.systemId}
              onChange={(id) =>
                setDraft((d) => ({ ...d, systemId: id as SystemId }))
              }
            />
          </Section>

          <Section title="نوع الزجاج">
            <RadioList
              name="glass"
              options={GLASS_OPTIONS}
              value={draft.glassId}
              onChange={(id) =>
                setDraft((d) => ({ ...d, glassId: id as GlassId }))
              }
            />
          </Section>

          <Section title="لون الإطار">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(FRAME_COLORS) as FrameColorId[]).map((id) => {
                const c = FRAME_COLORS[id];
                const active = draft.frameColor === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({ ...d, frameColor: id }))
                    }
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs transition-colors ${
                      active
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-background text-foreground hover:bg-primary-soft/60"
                    }`}
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-black/10"
                      style={{ background: c.hex }}
                    />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </Section>
        </div>

        <footer className="grid shrink-0 grid-cols-2 gap-3 border-t border-border bg-card p-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 items-center justify-center rounded-2xl border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:bg-primary-soft"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={commit}
            className="flex h-12 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition-all hover:brightness-105 active:scale-[0.98]"
          >
            حسناً
          </button>
        </footer>
      </aside>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-3 shadow-[0_8px_24px_rgba(15,20,28,0.04)]">
      <h3 className="mb-2 text-xs font-bold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function RadioList({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      {options.map((opt, i) => {
        const active = value === opt.id;
        return (
          <label
            key={opt.id}
            className={`flex cursor-pointer items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
              i > 0 ? "border-t border-border" : ""
            } ${active ? "bg-primary-soft" : "hover:bg-primary-soft/40"}`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                active ? "border-primary" : "border-border"
              }`}
            >
              {active && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </span>
            <input
              type="radio"
              name={name}
              checked={active}
              onChange={() => onChange(opt.id)}
              className="sr-only"
            />
            <span
              className={
                active ? "font-semibold text-primary" : "text-foreground"
              }
            >
              {opt.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
