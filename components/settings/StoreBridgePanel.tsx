"use client";

import { useEffect, useState } from "react";
import {
  clearStoreBridgeConfig,
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
  const [baseUrl, setBaseUrl] = useState(
    "https://store-system-rho.vercel.app"
  );
  const [secret, setSecret] = useState("");
  const [safeId, setSafeId] = useState("");
  const [safes, setSafes] = useState<StoreSafeRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const current = loadStoreBridgeConfig();
    setConfig(current);
    if (current) {
      setBaseUrl(current.baseUrl);
      setSecret(current.secret);
      setSafeId(current.safeId);
    }
  }, []);

  async function handleLoadSafes() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const rows = await fetchStoreSafes({
        baseUrl: baseUrl.trim(),
        secret: secret.trim(),
      });
      setSafes(rows);
      if (rows.length === 0) {
        setError("مفيش خزائن نشطة في المتجر");
      } else {
        setMessage(`تم تحميل ${rows.length} خزنة`);
        if (!safeId || !rows.some((s) => s.id === safeId)) {
          setSafeId(rows[0]!.id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل الخزن");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!baseUrl.trim() || !secret.trim()) {
        throw new Error("أدخل رابط المتجر ومفتاح الربط");
      }
      const rows = await fetchStoreSafes({
        baseUrl: baseUrl.trim(),
        secret: secret.trim(),
      });
      setSafes(rows);
      const chosen =
        rows.find((s) => s.id === safeId) || rows[0] || undefined;
      if (!chosen) {
        throw new Error("مفيش خزنة نشطة — أنشئ خزنة في المتجر أولاً");
      }
      const next: StoreBridgeConfig = {
        baseUrl: baseUrl.trim(),
        secret: secret.trim(),
        safeId: chosen.id,
        safeName: chosen.name,
        enabled: true,
        updatedAt: new Date().toISOString(),
      };
      saveStoreBridgeConfig(next);
      setConfig(next);
      setSafeId(chosen.id);
      setMessage(
        `تم الربط — الخزنة الأساسية: ${chosen.name} (${formatCurrency(Number(chosen.balance) || 0)})`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر الحفظ");
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
    setSecret("");
    setSafeId("");
    setSafes([]);
    setMessage("تم فصل الربط من هذا الجهاز / بيانات الورشة المشتركة");
    setError("");
  }

  const active = isStoreBridgeActive(config);

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3.5">
        <p className="text-sm font-bold text-foreground">خزنة المتجر (الأساس)</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          المتجر وخزنته هما مصدر الحقيقة للنقد. كل دفعة من الورشة = إيداع، وكل
          مصروف = سحب. تراجع الحسابات من شاشة الخزنة في المتجر.
        </p>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        {active ? (
          <div className="rounded-xl border border-[#2F9B7A]/30 bg-[#2F9B7A]/10 px-3 py-2.5 text-xs text-foreground">
            مربوط · الخزنة:{" "}
            <span className="font-bold">{config?.safeName || config?.safeId}</span>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-muted">
            غير مربوط — سجّل الدفعات محلياً فقط لحد ما تربط خزنة المتجر.
          </div>
        )}

        <label className="flex flex-col gap-1.5 text-right">
          <span className="text-xs font-medium text-muted">رابط المتجر</span>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://store-system-rho.vercel.app"
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            dir="ltr"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-right">
          <span className="text-xs font-medium text-muted">
            مفتاح الربط (WORKSHOP_BRIDGE_SECRET)
          </span>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="نفس المفتاح على Vercel للمتجر"
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            dir="ltr"
            autoComplete="off"
          />
        </label>

        {(safes.length > 0 || config?.safeId) && (
          <label className="flex flex-col gap-1.5 text-right">
            <span className="text-xs font-medium text-muted">الخزنة الافتراضية</span>
            <select
              value={safeId}
              onChange={(e) => setSafeId(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            >
              {safes.length > 0
                ? safes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {formatCurrency(Number(s.balance) || 0)}
                    </option>
                  ))
                : config?.safeId
                  ? (
                      <option value={config.safeId}>
                        {config.safeName || config.safeId}
                      </option>
                    )
                  : null}
            </select>
          </label>
        )}

        {error ? (
          <p className="text-sm font-medium text-[#E85A8A]">{error}</p>
        ) : null}
        {message ? (
          <p className="text-sm font-medium text-[#2F9B7A]">{message}</p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleLoadSafes()}
            className="flex h-11 flex-1 items-center justify-center rounded-xl border border-border text-sm font-semibold disabled:opacity-60"
          >
            {busy ? "…" : "تحميل الخزن"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSave()}
            className="flex h-11 flex-1 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "جاري الحفظ…" : "حفظ الربط"}
          </button>
        </div>

        {active ? (
          <button
            type="button"
            onClick={handleDisconnect}
            className="h-10 rounded-xl text-sm font-semibold text-[#E85A8A]"
          >
            فصل الربط
          </button>
        ) : null}
      </div>
    </section>
  );
}
