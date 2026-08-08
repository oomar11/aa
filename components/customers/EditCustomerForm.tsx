"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ContactPickerButton } from "@/components/customers/ContactPickerButton";
import { pickContactFromDevice } from "@/lib/contact-picker";
import {
  deleteCustomer,
  getCustomerById,
  upsertCustomer,
  type Customer,
} from "@/lib/customers";
import { ROUTES } from "@/lib/routes";
import {
  hasStoreBridgeCredentials,
  loadStoreBridgeConfig,
  upsertStoreCustomer,
} from "@/lib/store-bridge";

type Props = {
  customerId: string;
};

export function EditCustomerForm({ customerId }: Props) {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const found = getCustomerById(customerId);
    if (!found) return;
    setCustomer(found);
    setName(found.name);
    setPhone(found.phone);
    setAddress(found.address ?? "");
    setNote(found.note ?? "");
  }, [customerId]);

  async function handlePickContact() {
    setError("");
    setSaved(false);
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
    if (!customer) return;
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

    setSaving(true);
    setError("");
    try {
      let storeCustomerId = customer.storeCustomerId;
      const cfg = loadStoreBridgeConfig();
      if (hasStoreBridgeCredentials(cfg)) {
        const synced = await upsertStoreCustomer(
          {
            localPartyId: customer.id,
            name: trimmedName,
            phone: trimmedPhone,
            address: address.trim() || undefined,
            notes: note.trim() || undefined,
          },
          cfg
        );
        storeCustomerId = synced.storeCustomerId;
      }
      upsertCustomer({
        ...customer,
        name: trimmedName,
        phone: trimmedPhone,
        address: address.trim() || undefined,
        note: note.trim() || undefined,
        storeCustomerId,
      });
      setSaved(true);
      window.setTimeout(() => {
        router.replace(ROUTES.design.projects(customerId));
      }, 350);
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

  function handleDelete() {
    if (!customer) return;
    if (
      !window.confirm(
        `هل تريد حذف العميل «${customer.name}»؟ لا يمكن التراجع إن لم تكن له مشاريع.`
      )
    ) {
      return;
    }
    try {
      deleteCustomer(customer.id);
      router.replace(ROUTES.orders);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "تعذر حذف العميل"
      );
    }
  }

  const fieldClass =
    "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

  if (!customer) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
        العميل غير موجود
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <ContactPickerButton
        label="تعبئة من جهات الاتصال"
        picking={picking}
        onPick={handlePickContact}
      />

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">
          الاسم <span className="text-[#E85A8A]">*</span>
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
            setSaved(false);
          }}
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">
          رقم الهاتف <span className="text-[#E85A8A]">*</span>
        </span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setError("");
            setSaved(false);
          }}
          className={fieldClass}
          dir="ltr"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">العنوان</span>
        <input
          type="text"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setSaved(false);
          }}
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">ملاحظة</span>
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setSaved(false);
          }}
          rows={2}
          className={`${fieldClass} resize-none`}
        />
      </label>

      {error ? (
        <p className="text-sm font-medium text-[#E85A8A]">{error}</p>
      ) : null}
      {saved ? (
        <p className="text-sm font-medium text-emerald-600">تم الحفظ</p>
      ) : null}

      <button
        type="submit"
        className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-white"
      >
        حفظ التعديلات
      </button>

      <button
        type="button"
        onClick={handleDelete}
        className="flex h-12 w-full items-center justify-center rounded-2xl border border-[#E85A8A]/40 text-sm font-semibold text-[#E85A8A]"
      >
        حذف العميل
      </button>
    </form>
  );
}
