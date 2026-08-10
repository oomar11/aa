"use client";

import { useEffect, useState } from "react";
import {
  clearStoreBridgeConfig,
  DEFAULT_STORE_URL,
  fetchStoreBridgeStatus,
  fetchStoreSafes,
  isStoreBridgeActive,
  loadStoreBridgeConfig,
  MANAGED_BRIDGE_SECRET,
  resyncAllWorkshopMoneyToStore,
  saveStoreBridgeConfig,
  type StoreBridgeConfig,
  type StoreSafeRow,
} from "@/lib/store-bridge";
import { ensureStoreBridgeBootstrapped } from "@/lib/store-bridge-bootstrap";
import { formatCurrency } from "@/lib/utils";

/**
 * ربط الورشة بخزنة المتجر — المتجر هو مصدر الحقيقة للنقد.
 * الافتراضي: ربط تلقائي من سيرفر الورشة (بدون لصق مفتاح).
 */
export function StoreBridgePanel() {
  const [config, setConfig] = useState<StoreBridgeConfig | null>(null);
  const [serverManaged, setServerManaged] = useState(false);
  const [baseUrl, setBaseUrl] = useState(DEFAULT_STORE_URL);
  const [secret, setSecret] = useState("");
  const [safeId, setSafeId] = useState("");
  const [safes, setSafes] = useState<StoreSafeRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    void (async () => {
      const status = await fetchStoreBridgeStatus().catch(() => ({
        configured: false as const,
      }));
      setServerManaged(Boolean(status.configured));
      const boot = await ensureStoreBridgeBootstrapped();
      const current = boot || loadStoreBridgeConfig();
      setConfig(current);
      if (current) {
        setBaseUrl(current.baseUrl);
        setSecret(current.managed ? "" : current.secret);
        setSafeId(current.safeId);
      }
      if (current && (current.managed || status.configured)) {
        try {
          const rows = await fetchStoreSafes(current);
          setSafes(rows);
        } catch {
          /* ignore */
        }
      }
    })();
  }, []);

  async function connectManaged(preferredSafeId?: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const status = await fetchStoreBridgeStatus();
      if (!status.configured) {
        throw new Error("السيرفر مش مضبوط — راجع WORKSHOP_BRIDGE_SECRET");
      }
      const draft: StoreBridgeConfig = {
        baseUrl: status.storeUrl || DEFAULT_STORE_URL,
        secret: MANAGED_BRIDGE_SECRET,
        safeId: preferredSafeId || safeId || "",
        safeName: undefined,
        enabled: true,
        updatedAt: new Date().toISOString(),
        managed: true,
      };
      const rows = await fetchStoreSafes(draft);
      setSafes(rows);
      const chosen =
        rows.find((s) => s.id === (preferredSafeId || safeId)) ||
        rows[0] ||
        undefined;
      if (!chosen) {
        throw new Error("مفيش خزنة نشطة في المتجر — أنشئ خزنة من المتجر أولاً");
      }
      const next: StoreBridgeConfig = {
        ...draft,
        safeId: chosen.id,
        safeName: chosen.name,
      };
      saveStoreBridgeConfig(next);
      setConfig(next);
      setSafeId(chosen.id);
      setServerManaged(true);
      setMessage(
        `مربوط تلقائياً ✓ الخزنة: ${chosen.name} — الرصيد ${formatCurrency(Number(chosen.balance) || 0)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر الربط");
    } finally {
      setBusy(false);
    }
  }

  async function connectManual(preferredSafeId?: string) {
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
        managed: false,
      };
      saveStoreBridgeConfig(next);
      setConfig(next);
      setSafeId(chosen.id);
      setBaseUrl(url);
      setMessage(
        `تم الربط ✓ الخزنة: ${chosen.name} — الرصيد ${formatCurrency(Number(chosen.balance) || 0)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر الربط");
    } finally {
      setBusy(false);
    }
  }

  async function saveSafeOnly() {
    const current = loadStoreBridgeConfig();
    if (!current || !safeId) return;
    const chosen = safes.find((s) => s.id === safeId);
    const next: StoreBridgeConfig = {
      ...current,
      safeId,
      safeName: chosen?.name || current.safeName,
      enabled: true,
    };
    saveStoreBridgeConfig(next);
    setConfig(next);
    setMessage(`تم اختيار الخزنة: ${next.safeName || next.safeId}`);
  }

  function handleDisconnect() {
    if (serverManaged || config?.managed) {
      setError("الربط تلقائي من السيرفر — مش محتاج فصل يدوي");
      return;
    }
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

  async function resyncNow() {
    const cfg = loadStoreBridgeConfig();
    if (!isStoreBridgeActive(cfg) || !cfg) {
      setError("اربط المتجر أولاً");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await resyncAllWorkshopMoneyToStore(cfg);
      const errHint =
        result.errors.length > 0
          ? ` · ${result.errors.length} خطأ (أولها: ${result.errors[0]})`
          : "";
      setMessage(
        `اتزامنت ${result.payments} دفعة و ${result.expenses} مصروف و ${result.sales} بيع مشروع${errHint}`
      );
      if (result.errors.length > 0) {
        setError(result.errors.slice(0, 3).join(" · "));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إعادة المزامنة");
    } finally {
      setBusy(false);
    }
  }

  const active = isStoreBridgeActive(config);
  const managed = serverManaged || Boolean(config?.managed);

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3.5">
        <p className="text-sm font-bold text-foreground">خزنة المتجر (الأساس)</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          {managed
            ? "الربط تلقائي من سيرفر الورشة — مش محتاج تدخل مفتاح. اختَر الخزنة الافتراضية للدفعات والمصروفات."
            : "خُد المفتاح من المتجر ← الإعدادات ← الضريبة والخزن ← «جسر الورش»، أو فعّل WORKSHOP_BRIDGE_SECRET على سيرفر الورشة للربط التلقائي."}
        </p>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        {active ? (
          <div className="rounded-xl border border-[#2F9B7A]/30 bg-[#2F9B7A]/10 px-3 py-2.5 text-xs text-foreground">
            {managed ? "مربوط تلقائياً ✓" : "مربوط ✓"} · الخزنة:{" "}
            <span className="font-bold">{config?.safeName || config?.safeId}</span>
          </div>
        ) : managed ? (
          <div className="rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-muted">
            السيرفر جاهز — جاري اختيار الخزنة…
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-muted">
            لسه مش مربوط — اضغط الزر تحت.
          </div>
        )}

        {safes.length > 0 ? (
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

        {managed ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void (active ? saveSafeOnly() : connectManaged())
              }
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-bold text-white disabled:opacity-60"
            >
              {busy
                ? "جاري التحديث…"
                : active
                  ? "حفظ الخزنة"
                  : "تفعيل الربط التلقائي"}
            </button>
            {active ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void resyncNow()}
                className="flex h-11 w-full items-center justify-center rounded-2xl border border-border bg-background text-sm font-bold text-foreground disabled:opacity-60"
              >
                {busy ? "جاري المزامنة…" : "إعادة مزامنة المتجر (دفعات + مصروفات)"}
              </button>
            ) : null}
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void connectManual()}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-bold text-white disabled:opacity-60"
            >
              {busy ? "جاري الربط…" : active ? "إعادة الربط / تحديث الخزنة" : "ربط الآن"}
            </button>

            {active ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void resyncNow()}
                  className="flex h-11 w-full items-center justify-center rounded-2xl border border-border bg-background text-sm font-bold text-foreground disabled:opacity-60"
                >
                  {busy ? "جاري المزامنة…" : "إعادة مزامنة المتجر (دفعات + مصروفات)"}
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="h-10 rounded-xl text-sm font-semibold text-[#E85A8A]"
                >
                  فصل الربط
                </button>
              </>
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
          </>
        )}
      </div>
    </section>
  );
}
