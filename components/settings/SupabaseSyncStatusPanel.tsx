"use client";

import { useWorkshopSync } from "@/components/settings/SharedDataProvider";

function backendLabel(backend: string) {
  if (backend === "postgres") return "Supabase Postgres (عبر السيرفر)";
  if (backend === "file") return "ملف مؤقت على السيرفر";
  return "جارٍ الاتصال…";
}

/**
 * حالة مزامنة الورشة — الربط يتم من DATABASE_URL على Vercel (Supabase).
 */
export function SupabaseSyncStatusPanel() {
  const sync = useWorkshopSync();

  const connected = sync.durable && sync.backend === "postgres";
  const needsSetup = sync.ready && !connected && !sync.syncing;

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3.5 text-right">
        <p className="text-sm font-medium text-foreground">
          مزامنة الورشة (Supabase)
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          متصل بمشروع Supabase workshop-windoor — التليفون والكمبيوتر يتزامنوا
          تلقائياً.
        </p>
      </div>
      <div className="flex flex-col gap-2 px-4 py-3.5 text-right">
        <p className="text-xs text-muted">
          الحالة:{" "}
          <span className="font-medium text-foreground">
            {sync.syncing
              ? "جاري المزامنة…"
              : sync.ready
                ? connected
                  ? "متصل"
                  : "غير مربوط"
                : "يتحمّل…"}
          </span>
          {" · "}
          {backendLabel(sync.backend)}
        </p>

        {connected ? (
          <p className="rounded-xl border border-[#2F9B7A]/35 bg-[#2F9B7A]/10 px-3 py-2 text-xs leading-relaxed text-foreground">
            بيانات الورشة مشتركة عبر Supabase — كل الأجهزة تشوف نفس
            العملاء والمشاريع والحسابات.
          </p>
        ) : needsSetup ? (
          <p className="rounded-xl border border-[#E8A838]/40 bg-[#E8A838]/10 px-3 py-2 text-xs leading-relaxed text-foreground">
            المزامنة مع Supabase غير متاحة حالياً — تحقق من اتصال السيرفر
            بالإنترنت أو راجع إعدادات Supabase.
          </p>
        ) : null}

        {sync.error ? (
          <p className="text-xs font-medium text-[#E85A8A]">{sync.error}</p>
        ) : null}
      </div>
    </section>
  );
}
