"use client";

import { useEffect, useState } from "react";
import {
  clearStoreBridgeConfig,
  DEFAULT_STORE_URL,
  fetchStoreSafes,
  isStoreBridgeActive,
  loadStoreBridgeConfig,
  saveStoreBridgeConfig,
  type StoreBridgeConfig,
  type StoreSafeRow,
} from "@/lib/store-bridge";
import { formatCurrency } from "@/lib/utils";

/**
 * ربط الورشة بخزنة المتجر — المتجر هو مصدر الحقيقة للنقد.
 */
export function StoreBridgePanel() {
  const [config, setConfig] = useState<StoreBridgeConfig | null>(null);
  const [baseUrl, setBaseUrl] = useState(DEFAULT_STORE_URL);
  const [secret, setSecret] = useState("");
  const [safeId, setSafeId] = useState("");
  const [safes, setSafes] = useState<StoreSafeRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    const current = loadStoreBridgeConfig();
    setConfig(current);
    if (current) {
      setBaseUrl(current.baseUrl);
      setSecret(current.secret);
      setSafeId(current.safeId);
    }
  }, []);

  async function connectNow(preferredSafeId?: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const url = (baseUrl || DEFAULT_STORE_URL).trim();
      const key = secret.trim();
      if (!url || !key) {
        throw new Error("رابط المتجر والمفتاح مطلوبان");
      }
      const rows = await fetchStoreSafes({ baseUrl: url, secret: key });
      setSafes(rows);
      const chosen =
        rows.find((s) => s.id === (preferredSafeId || safeId)) ||
        rows[0] ||
        undefined;
      if (!chosen) {
        throw new Error("مفيش خزنة نشطة في المتجر — أنشئ خزنة من المتجر أولاً");
      }
      const next: StoreBridgeConfig = {
        baseUrl: url,
        secret: key,
        safeId: chosen.id,
        safeName: chosen.name,
        enabled: true,
        updatedAt: new Date().toISOString(),
      };
      saveStoreBridgeConfig(next);
      setConfig(next);
      setSafeId(chosen.id);
      setBaseUrl(url);
      setSecret(key);
      setMessage(
        `تم الربط ✓ الخزنة: ${chosen.name} — الرصيد ${formatCurrency(Number(chosen.balance) || 0)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر الربط");
    } finally {
      setBusy(false);
    }
  }

  function handleDisconnect() {
    if (
      !window.confirm(
        "فصل ربط خزنة المتجر؟ الدفعات والمصروفات الجديدة مش هتتسجل في خزنة المتجر."
      )
    ) {
      return;
    }
    clearStoreBridgeConfig();
    setConfig(null);
    setSafeId("");
    setSafes([]);
    setSecret("");
    setBaseUrl(DEFAULT_STORE_URL);
    setMessage("تم فصل الربط");
    setError("");
  }

  const active = isStoreBridgeActive(config);

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3.5">
        <p className="text-sm font-bold text-foreground">خزنة المتجر (الأساس)</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          أدخل رابط المتجر ومفتاح WORKSHOP_BRIDGE_SECRET ثم «ربط الآن». بعدها
          الدفعات تدخل خزنة المتجر، والعملاء والتوريدات تتسجل تلقائياً.
        </p>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        {active ? (
          <div className="rounded-xl border border-[#2F9B7A]/30 bg-[#2F9B7A]/10 px-3 py-2.5 text-xs text-foreground">
            مربوط ✓ · الخزنة:{" "}
            <span className="font-bold">{config?.safeName || config?.safeId}</span>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-muted">
            لسه مش مربوط — اضغط الزر تحت.
          </div>
        )}

        {safes.length > 1 || (active && safes.length > 0) ? (
          <label className="flex flex-col gap-1.5 text-right">
            <span className="text-xs font-medium text-muted">الخزنة</span>
            <select
              value={safeId}
              onChange={(e) => setSafeId(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            >
              {safes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {formatCurrency(Number(s.balance) || 0)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {error ? (
          <p className="text-sm font-medium text-[#E85A8A]">{error}</p>
        ) : null}
        {message ? (
          <p className="text-sm font-medium text-[#2F9B7A]">{message}</p>
        ) : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => void connectNow()}
          className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-bold text-white disabled:opacity-60"
        >
          {busy ? "جاري الربط…" : active ? "إعادة الربط / تحديث الخزنة" : "ربط الآن"}
        </button>

        {active ? (
          <button
            type="button"
            onClick={handleDisconnect}
            className="h-10 rounded-xl text-sm font-semibold text-[#E85A8A]"
          >
            فصل الربط
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          className="text-xs font-semibold text-muted"
        >
          {advanced ? "إخفاء الإعدادات المتقدمة" : "إعدادات متقدمة"}
        </button>

        {advanced ? (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3">
            <label className="flex flex-col gap-1.5 text-right">
              <span className="text-xs font-medium text-muted">رابط المتجر</span>
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                dir="ltr"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-right">
              <span className="text-xs font-medium text-muted">مفتاح الربط</span>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                dir="ltr"
                autoComplete="off"
              />
            </label>
          </div>
        ) : null}
      </div>
    </section>
  );
}
