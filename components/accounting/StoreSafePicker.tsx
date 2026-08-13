"use client";

import { useEffect, useState } from "react";
import {
  fetchStoreSafes,
  isStoreBridgeActive,
  loadStoreBridgeConfig,
  type StoreSafeRow,
} from "@/lib/store-bridge";
import { formatCurrency } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (safeId: string, safe?: StoreSafeRow) => void;
  /** عند التعديل: خزنة الحركة السابقة */
  preferredSafeId?: string;
  label?: string;
  className?: string;
  /** أزرار للخزن (طريقة الدفع) أو قائمة منسدلة */
  variant?: "select" | "choices";
};

/**
 * اختيار خزنة المتجر للحركة النقدية (دفعة / مصروف / توريد).
 * الافتراضي = خزنة الربط في الإعدادات، مع إمكانية التغيير لكل عملية.
 */
export function StoreSafePicker({
  value,
  onChange,
  preferredSafeId,
  label = "خزنة المتجر",
  className,
  variant = "select",
}: Props) {
  const [safes, setSafes] = useState<StoreSafeRow[]>([]);
  const [bridgeOn, setBridgeOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const cfg = loadStoreBridgeConfig();
      const active = isStoreBridgeActive(cfg);
      setBridgeOn(active);
      if (!active || !cfg) {
        setSafes([]);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const rows = await fetchStoreSafes(cfg);
        if (cancelled) return;
        setSafes(rows);
        const preferred =
          preferredSafeId ||
          value ||
          cfg.safeId ||
          rows[0]?.id ||
          "";
        const chosen =
          rows.find((s) => s.id === preferred) || rows[0] || undefined;
        if (chosen) {
          onChange(chosen.id, chosen);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "تعذر تحميل الخزن"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void refresh();
    window.addEventListener("upvc-store-bridge-updated", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("upvc-store-bridge-updated", refresh);
    };
    // preferred/value intentionally not in deps — only seed once per mount/bridge update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const heading = (
    <span className="text-sm font-medium">
      {label}{" "}
      {bridgeOn && safes.length > 0 ? (
        <span className="text-[#E85A8A]">*</span>
      ) : null}
    </span>
  );

  if (!bridgeOn) {
    return (
      <div className={`flex flex-col gap-1.5 text-right ${className || ""}`}>
        {heading}
        <p className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted">
          خزن النظام غير مربوطة — من الإعدادات.
        </p>
      </div>
    );
  }

  if (loading && safes.length === 0) {
    return (
      <div className={`flex flex-col gap-1.5 text-right ${className || ""}`}>
        {heading}
        <p className="text-xs text-muted">جاري تحميل الخزن…</p>
      </div>
    );
  }

  if (error && safes.length === 0) {
    return (
      <div className={`flex flex-col gap-1.5 text-right ${className || ""}`}>
        {heading}
        <p className="text-sm font-medium text-[#E85A8A]">{error}</p>
      </div>
    );
  }

  if (safes.length === 0) {
    return (
      <div className={`flex flex-col gap-1.5 text-right ${className || ""}`}>
        {heading}
        <p className="text-xs text-muted">مفيش خزنة نشطة في النظام.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 text-right ${className || ""}`}>
      {heading}
      {variant === "choices" ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {safes.map((s) => {
            const selected = s.id === value;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onChange(s.id, s)}
                className={`rounded-2xl px-3 py-2.5 text-right transition-all active:scale-[0.98] ${
                  selected
                    ? "bg-primary text-white"
                    : "border border-border bg-card text-foreground hover:border-primary/40"
                }`}
              >
                <span className="block text-sm font-bold">{s.name}</span>
                <span
                  className={`mt-0.5 block text-[11px] tabular-nums ${
                    selected ? "text-white/80" : "text-muted"
                  }`}
                >
                  الرصيد {formatCurrency(Number(s.balance) || 0)}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <select
          value={value}
          onChange={(e) => {
            const id = e.target.value;
            const safe = safes.find((s) => s.id === id);
            onChange(id, safe);
          }}
          className="h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          required
        >
          {safes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {formatCurrency(Number(s.balance) || 0)}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
