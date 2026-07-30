"use client";

import { FormEvent, useState } from "react";
import {
  DEFAULT_COMPANY,
  loadCompany,
  saveCompany,
  type Company,
} from "@/lib/company";

function initialCompany(): Company {
  if (typeof window === "undefined") return DEFAULT_COMPANY;
  return loadCompany();
}

export function CompanyForm() {
  const [form, setForm] = useState<Company>(initialCompany);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof Company>(key: K, value: Company[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setError("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("اكتب اسم الشركة");
      return;
    }
    saveCompany(form);
    setForm(loadCompany());
    setSaved(true);
  }

  const fieldClass =
    "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <p className="rounded-2xl border border-border bg-primary-soft/60 px-4 py-3 text-xs leading-relaxed text-foreground">
        البرنامج لشركة واحدة فقط. البيانات دي بتظهر في الحسابات والهيدر.
      </p>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">
          اسم الشركة <span className="text-[#E85A8A]">*</span>
        </span>
        <input
          type="text"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          className={fieldClass}
          placeholder="اسم الشركة"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">رقم التليفون</span>
        <input
          type="tel"
          value={form.phone ?? ""}
          onChange={(e) => update("phone", e.target.value)}
          className={`${fieldClass} text-left`}
          dir="ltr"
          placeholder="01xxxxxxxxx"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">العنوان</span>
        <input
          type="text"
          value={form.address ?? ""}
          onChange={(e) => update("address", e.target.value)}
          className={fieldClass}
          placeholder="عنوان الشركة / الورشة"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">البريد الإلكتروني</span>
        <input
          type="email"
          value={form.email ?? ""}
          onChange={(e) => update("email", e.target.value)}
          className={`${fieldClass} text-left`}
          dir="ltr"
          placeholder="info@company.com"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">الرقم الضريبي</span>
        <input
          type="text"
          value={form.taxNumber ?? ""}
          onChange={(e) => update("taxNumber", e.target.value)}
          className={`${fieldClass} text-left`}
          dir="ltr"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">السجل التجاري</span>
        <input
          type="text"
          value={form.commercialRegister ?? ""}
          onChange={(e) => update("commercialRegister", e.target.value)}
          className={`${fieldClass} text-left`}
          dir="ltr"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">ملاحظة</span>
        <textarea
          value={form.note ?? ""}
          onChange={(e) => update("note", e.target.value)}
          rows={3}
          className={`${fieldClass} resize-none`}
          placeholder="أي تفاصيل مهمة عن الشركة…"
        />
      </label>

      {error ? (
        <p className="text-sm font-medium text-[#E85A8A]">{error}</p>
      ) : null}
      {saved ? (
        <p className="text-sm font-medium text-[#2F9B7A]">تم حفظ بيانات الشركة</p>
      ) : null}

      <button
        type="submit"
        className="mt-2 flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98]"
      >
        حفظ بيانات الشركة
      </button>
    </form>
  );
}
