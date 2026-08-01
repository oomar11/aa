"use client";

import { useState } from "react";
import {
  clearSavedNeonConnectionString,
  getSavedNeonConnectionString,
  maskNeonConnectionString,
  saveNeonConnectionString,
} from "@/lib/storage/neon-connection";
import { testPostgresKv } from "@/lib/storage/postgres-kv";
import { resetWorkshopSync } from "@/lib/storage/shared-client";
import { useWorkshopSync } from "@/components/settings/SharedDataProvider";

/**
 * ربط Neon بلصق Connection string من داخل البرنامج — بدون Vercel env.
 */
export function NeonConnectPanel() {
  const sync = useWorkshopSync();
  const [saved, setSaved] = useState<string | null>(() =>
    typeof window === "undefined" ? null : getSavedNeonConnectionString()
  );
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleConnect() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const normalized = saveNeonConnectionString(url);
      const test = await testPostgresKv(normalized);
      if (!test.ok) {
        clearSavedNeonConnectionString();
        setSaved(null);
        throw new Error(test.error || "فشل اختبار الاتصال");
      }
      setSaved(normalized);
      await resetWorkshopSync();
      setUrl("");
      setMessage(
        "تم الربط بنجاح. انسخ نفس الرابط والصقه على باقي أجهزة الورشة مرة واحدة."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر الربط");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopySaved() {
    const current = getSavedNeonConnectionString();
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current);
      setMessage("تم نسخ رابط Neon — الصقه على الأجهزة الأخرى في الإعدادات");
      setError("");
    } catch {
      setError("تعذر النسخ — انسخ الرابط يدوياً من Neon");
    }
  }

  function handleDisconnect() {
    if (
      !window.confirm(
        "فصل Neon من هذا الجهاز فقط؟ البيانات على Neon تبقى، والجهاز يرجع للتخزين المحلي/السيرفر."
      )
    ) {
      return;
    }
    clearSavedNeonConnectionString();
    setSaved(null);
    void resetWorkshopSync();
    setMessage("تم فصل Neon من هذا الجهاز");
    setError("");
  }

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3.5 text-right">
        <p className="text-sm font-medium text-foreground">ربط Neon بسهولة</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          من موقع Neon انسخ Connection string، الصقه هنا، واضغط ربط. نفس
          الرابط يتعمل على كل جهاز في الورشة مرة واحدة — من غير إعدادات Vercel.
        </p>
      </div>

      <div className="flex flex-col gap-2 px-4 py-3.5 text-right">
        {saved ? (
          <>
            <p className="rounded-xl border border-[#2F9B7A]/35 bg-[#2F9B7A]/10 px-3 py-2 text-xs leading-relaxed text-foreground">
              متصل بـ Neon على هذا الجهاز
              {sync.backend === "neon" ? " — المزامنة شغّالة" : ""}.
              <span className="mt-1 block break-all font-mono text-[11px] text-muted">
                {maskNeonConnectionString(saved)}
              </span>
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleCopySaved()}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white disabled:opacity-60"
            >
              نسخ الرابط لباقي الأجهزة
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleDisconnect}
              className="flex h-11 w-full items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold disabled:opacity-60"
            >
              فصل Neon من هذا الجهاز
            </button>
          </>
        ) : (
          <>
            <ol className="list-decimal space-y-1 pr-4 text-xs leading-relaxed text-muted">
              <li>افتح Neon → مشروعك → Connection string</li>
              <li>اختَر URI وانسخ الرابط كامل</li>
              <li>الصقه في المربع تحت واضغط ربط</li>
            </ol>
            <textarea
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              rows={3}
              dir="ltr"
              placeholder="postgresql://..."
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-left font-mono text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              disabled={busy || !url.trim()}
              onClick={() => void handleConnect()}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "جاري الربط…" : "ربط Neon"}
            </button>
          </>
        )}

        {message ? (
          <p className="text-xs font-medium text-[#2F9B7A]">{message}</p>
        ) : null}
        {error ? (
          <p className="text-xs font-medium text-[#E85A8A]">{error}</p>
        ) : null}
      </div>
    </section>
  );
}
