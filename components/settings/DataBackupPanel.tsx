"use client";

import { useRef, useState } from "react";
import {
  CLEAN_START_VERSION,
  clearBusinessData,
  DATA_VERSION_KEY,
} from "@/lib/clean-start";
import { STORAGE_KEYS } from "@/lib/storage/keys";

const BACKUP_KEYS = [
  ...Object.values(STORAGE_KEYS),
  "upvc-deleted-customers",
  DATA_VERSION_KEY,
];

type BackupPayload = {
  version: 1;
  exportedAt: string;
  data: Record<string, string | null>;
};

/**
 * تصدير / استيراد نسخة احتياطية من بيانات الجهاز.
 */
export function DataBackupPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleExport() {
    const data: Record<string, string | null> = {};
    for (const key of BACKUP_KEYS) {
      data[key] = localStorage.getItem(key);
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
      try {
        const parsed = JSON.parse(String(reader.result)) as BackupPayload;
        if (!parsed || parsed.version !== 1 || !parsed.data) {
          throw new Error("ملف غير صالح");
        }
        if (
          !window.confirm(
            "سيتم استبدال البيانات الحالية على هذا الجهاز بالنسخة المستوردة. هل تريد المتابعة؟"
          )
        ) {
          return;
        }
        for (const [key, value] of Object.entries(parsed.data)) {
          if (value === null || value === undefined) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(key, value);
          }
        }
        setMessage("تم الاستيراد — جاري إعادة تحميل الصفحة…");
        setError("");
        window.setTimeout(() => window.location.reload(), 600);
      } catch {
        setError("تعذر قراءة ملف النسخة الاحتياطية");
        setMessage("");
      }
    };
    reader.readAsText(file);
  }

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3.5 text-right">
        <p className="text-sm font-medium text-foreground">نسخة احتياطية</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          البيانات محفوظة على هذا الجهاز فقط. صدّر نسخة بانتظام حتى لا تُفقد عند
          مسح المتصفح.
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
          onClick={() => fileRef.current?.click()}
          className="flex h-11 w-full items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold"
        >
          استيراد نسخة احتياطية
        </button>
        <button
          type="button"
          onClick={() => {
            if (
              !window.confirm(
                "هل تريد مسح العملاء والمشاريع والحسابات والبدء من جديد؟ إعدادات الشركة والخامات تبقى."
              )
            ) {
              return;
            }
            clearBusinessData();
            localStorage.setItem(DATA_VERSION_KEY, CLEAN_START_VERSION);
            setMessage("تم المسح — جاري إعادة التحميل…");
            window.setTimeout(() => window.location.reload(), 500);
          }}
          className="flex h-11 w-full items-center justify-center rounded-xl border border-[#E85A8A]/35 text-sm font-semibold text-[#E85A8A]"
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
      </div>
    </section>
  );
}
