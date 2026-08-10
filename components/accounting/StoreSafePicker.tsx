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
        if (chosen && chosen.id !== value) {
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

  if (!bridgeOn) {
    return (
      <p className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted">
        خزنة المتجر غير مربوطة — من الإعدادات.
      </p>
    );
  }

  if (loading && safes.length === 0) {
    return (
      <p className="text-xs text-muted">جاري تحميل الخزن…</p>
    );
  }

  if (error && safes.length === 0) {
    return <p className="text-sm font-medium text-[#E85A8A]">{error}</p>;
  }

  if (safes.length === 0) {
    return (
      <p className="text-xs text-muted">مفيش خزنة نشطة في المتجر.</p>
    );
  }

  return (
    <label className={`flex flex-col gap-1.5 text-right ${className || ""}`}>
      <span className="text-sm font-medium">
        {label} <span className="text-[#E85A8A]">*</span>
      </span>
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
    </label>
  );
}
