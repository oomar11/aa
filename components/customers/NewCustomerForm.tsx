"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ContactPickerButton } from "@/components/customers/ContactPickerButton";
import { pickContactFromDevice } from "@/lib/contact-picker";
import { upsertCustomer, type Customer } from "@/lib/customers";
import {
  hasStoreBridgeCredentials,
  loadStoreBridgeConfig,
  upsertStoreCustomer,
} from "@/lib/store-bridge";

export function NewCustomerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handlePickContact() {
    setError("");
    setPicking(true);
    try {
      const result = await pickContactFromDevice();
      if (!result.ok) {
        if (result.reason !== "cancelled") {
          setError(result.message);
        }
        return;
      }
      setName(result.contact.name);
      setPhone(result.contact.phone);
      if (result.contact.address) {
        setAddress(result.contact.address);
      }
    } finally {
      setPicking(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setError("أدخل اسم العميل");
      return;
    }
    if (!trimmedPhone) {
      setError("أدخل رقم الهاتف");
      return;
    }

    const customer: Customer = {
      id: `local-${Date.now()}`,
      name: trimmedName,
      phone: trimmedPhone,
      address: address.trim() || undefined,
      note: note.trim() || undefined,
      balance: 0,
      lastDealAt: new Date().toISOString().slice(0, 10),
      projectsCount: 0,
    };

    setSaving(true);
    setError("");
    try {
      const cfg = loadStoreBridgeConfig();
      if (hasStoreBridgeCredentials(cfg)) {
        const synced = await upsertStoreCustomer(
          {
            localPartyId: customer.id,
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            notes: customer.note,
          },
          cfg
        );
        customer.storeCustomerId = synced.storeCustomerId;
      }
      upsertCustomer(customer);
      router.replace(`/design/projects/new?customer=${customer.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر حفظ العميل أو مزامنته مع المحل"
      );
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <ContactPickerButton
        label="إضافة من جهات الاتصال"
        picking={picking}
        onPick={handlePickContact}
      />

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
          رقم الهاتف <span className="text-[#E85A8A]">*</span>
        </span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setError("");
          }}
          placeholder="01xxxxxxxxx"
          autoComplete="tel"
          className={`${fieldClass} text-left`}
          dir="ltr"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium text-foreground">
          العنوان <span className="font-normal text-muted">(اختياري)</span>
        </span>
        <input
          type="text"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setError("");
          }}
          placeholder="العنوان"
          autoComplete="street-address"
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium text-foreground">
          ملاحظة <span className="font-normal text-muted">(اختياري)</span>
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className={`${fieldClass} resize-none`}
        />
      </label>

      {error ? (
        <p className="text-sm font-medium text-[#E85A8A]">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="mt-2 flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
      >
        {saving ? "جاري الحفظ..." : "حفظ ومتابعة لإنشاء مشروع"}
      </button>
    </form>
  );
}
