"use client";

import { useEffect, useState } from "react";
import { ContactPickerButton } from "@/components/customers/ContactPickerButton";
import { pickContactFromDevice } from "@/lib/contact-picker";
import {
  searchStoreSuppliers,
  upsertStoreSupplier,
  type StorePartyRow,
} from "@/lib/store-bridge";
import { formatCurrency } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (supplierId: string, supplier?: StorePartyRow) => void;
  /** تعطيل البحث/الإضافة أثناء الحفظ */
  disabled?: boolean;
  className?: string;
};

/**
 * بحث واختيار مورد المحل + إضافة مورد سريع (يدوي أو من جهات الاتصال).
 */
export function StoreSupplierPicker({
  value,
  onChange,
  disabled = false,
  className,
}: Props) {
  const [supplierQuery, setSupplierQuery] = useState("");
  const [suppliers, setSuppliers] = useState<StorePartyRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(async () => {
      setSearching(true);
      try {
        const rows = await searchStoreSuppliers(supplierQuery);
        if (!cancelled) setSuppliers(rows);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "تعذر بحث الموردين");
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [supplierQuery]);

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
      const name = result.contact.name.trim();
      const phone = result.contact.phone.trim();
      if (!name) {
        setShowQuick(true);
        setQuickName("");
        setQuickPhone(phone);
        setError("الجهة بدون اسم — أكمل البيانات يدوياً");
        return;
      }
      setBusy(true);
      try {
        const created = await upsertStoreSupplier({
          localPartyId: `aa-sup-${Date.now()}`,
          name,
          phone: phone || undefined,
        });
        onChange(created.storeSupplierId, created.supplier);
        setSuppliers((prev) => {
          const others = prev.filter((s) => s.id !== created.storeSupplierId);
          return [created.supplier, ...others];
        });
        setShowQuick(false);
        setQuickName("");
        setQuickPhone("");
      } catch (err) {
        setShowQuick(true);
        setQuickName(name);
        setQuickPhone(phone);
        setError(err instanceof Error ? err.message : "تعذر إضافة المورد");
      } finally {
        setBusy(false);
      }
    } finally {
      setPicking(false);
    }
  }

  async function handleQuickSupplier() {
    setError("");
    const name = quickName.trim();
    if (!name) {
      setError("اسم المورد مطلوب");
      return;
    }
    setBusy(true);
    try {
      const result = await upsertStoreSupplier({
        localPartyId: `aa-sup-${Date.now()}`,
        name,
        phone: quickPhone.trim() || undefined,
      });
      onChange(result.storeSupplierId, result.supplier);
      setSuppliers((prev) => {
        const others = prev.filter((s) => s.id !== result.storeSupplierId);
        return [result.supplier, ...others];
      });
      setShowQuick(false);
      setQuickName("");
      setQuickPhone("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إضافة المورد");
    } finally {
      setBusy(false);
    }
  }

  const fieldClass =
    "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

  const locked = disabled || busy || picking;

  return (
    <div
      className={`rounded-2xl border border-border bg-card p-4 ${className ?? ""}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-foreground">المورد</h2>
        <button
          type="button"
          disabled={locked}
          onClick={() => setShowQuick((v) => !v)}
          className="rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary disabled:opacity-60"
        >
          {showQuick ? "إخفاء" : "إضافة مورد سريع"}
        </button>
      </div>

      {showQuick ? (
        <div className="mb-3 space-y-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3">
          <ContactPickerButton
            label="إضافة من جهات الاتصال"
            picking={picking}
            onPick={() => void handlePickContact()}
          />
          <input
            className={fieldClass}
            placeholder="اسم المورد"
            value={quickName}
            disabled={locked}
            onChange={(e) => setQuickName(e.target.value)}
          />
          <input
            className={fieldClass}
            placeholder="الهاتف (اختياري)"
            value={quickPhone}
            disabled={locked}
            onChange={(e) => setQuickPhone(e.target.value)}
            dir="ltr"
          />
          <button
            type="button"
            disabled={locked}
            onClick={() => void handleQuickSupplier()}
            className="w-full rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "جاري الحفظ…" : "حفظ المورد واختياره"}
          </button>
        </div>
      ) : null}

      <input
        className={fieldClass}
        placeholder="بحث عن مورد..."
        value={supplierQuery}
        disabled={locked}
        onChange={(e) => setSupplierQuery(e.target.value)}
      />
      <p className="mt-1 text-[11px] text-muted">
        {searching ? "جاري البحث..." : `${suppliers.length} مورد`}
      </p>
      <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
        {suppliers.map((s) => {
          const balance = Number(s.balance) || 0;
          return (
            <button
              key={s.id}
              type="button"
              disabled={locked}
              onClick={() => onChange(s.id, s)}
              className={`flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-2 text-right text-sm disabled:opacity-60 ${
                value === s.id
                  ? "border-primary bg-primary/10 font-bold"
                  : "border-border bg-background"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate">{s.name}</span>
                <span className="mt-0.5 block text-[11px] font-normal text-muted" dir="ltr">
                  {s.phone || "—"}
                </span>
              </span>
              <span className="shrink-0 text-left">
                <span className="block text-[10px] font-medium text-muted">
                  الحساب
                </span>
                <span
                  className={`block text-xs font-bold tabular-nums ${
                    balance > 0
                      ? "text-[#C45C26]"
                      : balance < 0
                        ? "text-[#2F9B7A]"
                        : "text-muted"
                  }`}
                  dir="ltr"
                >
                  {formatCurrency(balance)} ج.م
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="mt-2 text-xs font-medium text-[#E85A8A]">{error}</p>
      ) : null}
    </div>
  );
}
