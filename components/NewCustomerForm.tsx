"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  CUSTOMERS_STORAGE_KEY,
  loadLocalCustomers,
  type Customer,
} from "@/lib/customers";

function saveLocalCustomer(customer: Customer) {
  const existing = loadLocalCustomers();
  localStorage.setItem(
    CUSTOMERS_STORAGE_KEY,
    JSON.stringify([customer, ...existing])
  );
}

export function NewCustomerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setError("اكتب اسم العميل");
      return;
    }
    if (!trimmedPhone) {
      setError("اكتب رقم التليفون");
      return;
    }

    const customer: Customer = {
      id: `local-${Date.now()}`,
      name: trimmedName,
      phone: trimmedPhone,
      note: note.trim() || undefined,
      balance: 0,
      lastDealAt: new Date().toISOString().slice(0, 10),
      projectsCount: 0,
    };

    saveLocalCustomer(customer);
    router.push(`/design/projects/new?customer=${customer.id}`);
  }

  const fieldClass =
    "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium text-foreground">
          الاسم <span className="text-[#E85A8A]">*</span>
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          placeholder="اسم العميل"
          autoComplete="name"
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium text-foreground">
          رقم التليفون <span className="text-[#E85A8A]">*</span>
        </span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setError("");
          }}
          placeholder="01xxxxxxxxx"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          className={`${fieldClass} text-left`}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium text-foreground">
          ملاحظة <span className="text-muted font-normal">(اختياري)</span>
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="أي تفاصيل مهمة عن العميل…"
          rows={3}
          className={`${fieldClass} resize-none`}
        />
      </label>

      {error ? (
        <p className="text-sm font-medium text-[#E85A8A]">{error}</p>
      ) : null}

      <div className="mt-2 flex gap-3">
        <Link
          href="/design"
          className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-border bg-card text-sm font-semibold transition-colors hover:bg-primary-soft"
        >
          رجوع
        </Link>
        <button
          type="submit"
          className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98]"
        >
          حفظ ومتابعة
        </button>
      </div>
    </form>
  );
}
