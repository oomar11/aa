"use client";

import { useRef, useState } from "react";
import {
  BUSINESS_KEYS,
  CLEAN_START_VERSION,
  clearBusinessData,
  DATA_VERSION_KEY,
} from "@/lib/clean-start";
import {
  DELETED_CUSTOMERS_KEY,
  SHARED_STORAGE_KEYS,
  STORAGE_KEYS,
} from "@/lib/storage/keys";
import {
  refreshWorkshopData,
  sharedGetItem,
  sharedRemoveItem,
  sharedSetItem,
  uploadLocalWorkshopData,
} from "@/lib/storage/shared-client";
import { useWorkshopSync } from "@/components/settings/SharedDataProvider";

const BACKUP_KEYS = [
  ...Object.values(STORAGE_KEYS),
  DELETED_CUSTOMERS_KEY,
  DATA_VERSION_KEY,
];

type BackupPayload = {
  version: 1;
  exportedAt: string;
  data: Record<string, string | null>;
};

function backendLabel(backend: string) {
  if (backend === "postgres") return "قاعدة بيانات Postgres (سحابية)";
  if (backend === "file") return "ملف ورشة على السيرفر";
  return "جارٍ الاتصال…";
}

/**
 * مزامنة الورشة + تصدير / استيراد نسخة احتياطية.
 */
export function DataBackupPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const sync = useWorkshopSync();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function handleExport() {
    const data: Record<string, string | null> = {};
    for (const key of BACKUP_KEYS) {
      if ((SHARED_STORAGE_KEYS as readonly string[]).includes(key)) {
        data[key] = sharedGetItem(key);
      } else {
        data[key] = localStorage.getItem(key);
      }
    }

    const payload: BackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `upvc-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("تم تنزيل النسخة الاحتياطية");
    setError("");
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      void (async () => {
        try {
          const parsed = JSON.parse(String(reader.result)) as BackupPayload;
          if (!parsed || parsed.version !== 1 || !parsed.data) {
            throw new Error("ملف غير صالح");
          }
          if (
            !window.confirm(
              "سيتم استبدال بيانات الورشة المشتركة بالنسخة المستوردة لكل الأجهزة. هل تريد المتابعة؟"
            )
          ) {
            return;
          }
          setBusy(true);
          for (const [key, value] of Object.entries(parsed.data)) {
            if ((SHARED_STORAGE_KEYS as readonly string[]).includes(key)) {
              if (value === null || value === undefined) {
                sharedRemoveItem(key);
              } else {
                sharedSetItem(key, value);
              }
            } else if (value === null || value === undefined) {
              localStorage.removeItem(key);
            } else {
              localStorage.setItem(key, value);
            }
          }
          await uploadLocalWorkshopData();
          setMessage("تم الاستيراد والمزامنة — جاري إعادة تحميل الصفحة…");
          setError("");
          window.setTimeout(() => window.location.reload(), 700);
        } catch {
          setError("تعذر قراءة ملف النسخة الاحتياطية");
          setMessage("");
        } finally {
          setBusy(false);
        }
      })();
    };
    reader.readAsText(file);
  }

  async function handleRefresh() {
    setBusy(true);
    setError("");
    const status = await refreshWorkshopData();
    setBusy(false);
    if (status.error) {
      setError(status.error);
      setMessage("");
      return;
    }
    setMessage("تم تحديث البيانات من قاعدة الورشة");
  }

  async function handleUploadLocal() {
    if (
      !window.confirm(
        "رفع بيانات هذا الجهاز كمصدر أساسي للورشة؟ سيظهر للجميع نفس البيانات."
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    const status = await uploadLocalWorkshopData();
    setBusy(false);
    if (status.error) {
      setError(status.error);
      setMessage("");
      return;
    }
    setMessage("تم رفع بيانات الجهاز ومزامنتها للورشة");
  }

  return (
    <>
      <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3.5 text-right">
          <p className="text-sm font-medium text-foreground">
            قاعدة بيانات الورشة المشتركة
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            العملاء والمشاريع والحسابات والخامات وبيانات الشركة واحدة لكل الأجهزة
            على نفس الرابط. الثيم ووحدة القياس تبقى خاصة بكل جهاز.
          </p>
        </div>
        <div className="flex flex-col gap-2 px-4 py-3.5 text-right">
          <p className="text-xs text-muted">
            الحالة:{" "}
            <span className="font-medium text-foreground">
              {sync.syncing
                ? "جاري المزامنة…"
                : sync.ready
                  ? "متصل"
                  : "يتحمّل…"}
            </span>
          </p>
          <p className="text-xs text-muted">
            التخزين:{" "}
            <span className="font-medium text-foreground">
              {backendLabel(sync.backend)}
            </span>
          </p>
          {sync.updatedAt ? (
            <p className="text-xs text-muted">
              آخر تحديث على السيرفر:{" "}
              {new Date(sync.updatedAt).toLocaleString("ar-EG")}
            </p>
          ) : null}
          {sync.error ? (
            <p className="text-xs font-medium text-[#E85A8A]">{sync.error}</p>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleRefresh()}
            className="mt-1 flex h-11 w-full items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold disabled:opacity-60"
          >
            تحديث من الورشة الآن
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleUploadLocal()}
            className="flex h-11 w-full items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold disabled:opacity-60"
          >
            رفع بيانات هذا الجهاز للورشة
          </button>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3.5 text-right">
          <p className="text-sm font-medium text-foreground">نسخة احتياطية</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            صدّر نسخة JSON بانتظام. الاستيراد يستبدل بيانات الورشة المشتركة
            للجميع.
          </p>
        </div>
        <div className="flex flex-col gap-2 px-4 py-3.5">
          <button
            type="button"
            onClick={handleExport}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white"
          >
            تصدير نسخة احتياطية
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="flex h-11 w-full items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold disabled:opacity-60"
          >
            استيراد نسخة احتياطية
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (
                !window.confirm(
                  "هل تريد مسح العملاء والمشاريع والحسابات من الورشة بالكامل والبدء من جديد؟ إعدادات الشركة والخامات تبقى."
                )
              ) {
                return;
              }
              clearBusinessData();
              localStorage.setItem(DATA_VERSION_KEY, CLEAN_START_VERSION);
              setMessage("تم المسح — جاري إعادة التحميل…");
              window.setTimeout(() => window.location.reload(), 700);
            }}
            className="flex h-11 w-full items-center justify-center rounded-xl border border-[#E85A8A]/35 text-sm font-semibold text-[#E85A8A] disabled:opacity-60"
          >
            مسح البيانات والبدء نظيفاً
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = "";
            }}
          />
          {message ? (
            <p className="text-xs font-medium text-[#2F9B7A]">{message}</p>
          ) : null}
          {error ? (
            <p className="text-xs font-medium text-[#E85A8A]">{error}</p>
          ) : null}
          <p className="text-[11px] leading-relaxed text-muted">
            مفاتيح الأعمال التي تُمسح: {BUSINESS_KEYS.length} مفاتيح مشتركة.
          </p>
        </div>
      </section>
    </>
  );
}
