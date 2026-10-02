"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { todayIsoDate } from "@/lib/accounting";
import {
  deleteSupplierDiscount,
  loadSupplierDiscounts,
  supplierDiscountsTotal,
  upsertSupplierDiscount,
  type SupplierDiscount,
} from "@/lib/supplier-discounts";
import { hasStoreBridgeCredentials, type StorePartyRow } from "@/lib/store-bridge";
import { formatCurrency, formatDate, smartSearchMatch } from "@/lib/utils";
import { NumericInput } from "@/components/ui/NumericInput";
import { StoreSupplierPicker } from "@/components/accounting/StoreSupplierPicker";

const fieldClass =
  "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

/**
 * خصومات مكتسبة من الموردين: بتتسجل كمبلغ على اسم المورد وبتتحسب ضمن المكاسب.
 */
export function SupplierDiscountsBrowser() {
  const [discounts, setDiscounts] = useState<SupplierDiscount[]>(() =>
    typeof window === "undefined" ? [] : loadSupplierDiscounts()
  );
  const [bridgeCreds, setBridgeCreds] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayIsoDate());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    function refresh() {
      setDiscounts(loadSupplierDiscounts());
      setBridgeCreds(hasStoreBridgeCredentials());
    }
    refresh();
    window.addEventListener("upvc-accounting-updated", refresh);
    window.addEventListener("upvc-store-bridge-updated", refresh);
    return () => {
      window.removeEventListener("upvc-accounting-updated", refresh);
      window.removeEventListener("upvc-store-bridge-updated", refresh);
    };
  }, []);

  const rows = useMemo(
    () =>
      [...discounts]
        .filter((d) => smartSearchMatch(query, [d.supplierName, d.note]))
        .sort((a, b) => {
          const byDate = b.date.localeCompare(a.date);
          return byDate !== 0 ? byDate : b.createdAt.localeCompare(a.createdAt);
        }),
    [discounts, query]
  );

  const monthTotal = useMemo(() => {
    const prefix = todayIsoDate().slice(0, 7);
    return supplierDiscountsTotal(discounts.filter((d) => d.date.startsWith(prefix)));
  }, [discounts]);

  function resetForm() {
    setEditingId("");
    setSupplierId("");
    setSupplierName("");
    setAmount(0);
    setDate(todayIsoDate());
    setNote("");
    setError("");
  }

  function pickSupplier(id: string, supplier?: StorePartyRow) {
    setSupplierId(id);
    if (supplier?.name) setSupplierName(supplier.name);
    setError("");
  }

  function startEdit(d: SupplierDiscount) {
    setEditingId(d.id);
    setSupplierId(d.storeSupplierId ?? "");
    setSupplierName(d.supplierName);
    setAmount(d.amount);
    setDate(d.date);
    setNote(d.note ?? "");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const name = supplierName.trim();
    if (!name) {
      setError("أدخل اسم المورد");
      return;
    }
    if (amount <= 0) {
      setError("أدخل مبلغ الخصم");
      return;
    }
    const existing = editingId
      ? discounts.find((d) => d.id === editingId)
      : undefined;
    upsertSupplierDiscount({
      id: existing?.id ?? `sdisc-${Date.now()}`,
      storeSupplierId: supplierId || undefined,
      supplierName: name,
      amount,
      date,
      note: note.trim() || undefined,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    });
    setDiscounts(loadSupplierDiscounts());
    resetForm();
  }

  function handleDelete(d: SupplierDiscount) {
    if (!window.confirm("هل تريد حذف هذا الخصم؟")) return;
    deleteSupplierDiscount(d.id);
    setDiscounts(loadSupplierDiscounts());
    if (editingId === d.id) resetForm();
  }

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4"
      >
        <p className="text-xs leading-relaxed text-muted">
          سجّل الخصم اللي خدته من المورد كمبلغ. مفيش فلوس بتتسحب من الخزنة — المبلغ
          بيتضاف على المكاسب في الفترة بتاريخ الخصم.
        </p>

        {bridgeCreds ? (
          <StoreSupplierPicker value={supplierId} onChange={pickSupplier} />
        ) : null}

        <label className="flex flex-col gap-1.5 text-right">
          <span className="text-xs font-medium text-muted">اسم المورد</span>
          <input
            type="text"
            value={supplierName}
            onChange={(e) => {
              setSupplierName(e.target.value);
              setError("");
            }}
            placeholder="اسم المورد صاحب الحساب"
            className={fieldClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-right">
          <span className="text-xs font-medium text-muted">مبلغ الخصم (ج.م)</span>
          <NumericInput
            value={amount}
            onChange={(value) => {
              setAmount(value);
              setError("");
            }}
            min={0}
            blankZero
            className={`${fieldClass} text-left text-xl font-bold tabular-nums`}
            dir="ltr"
            inputMode="decimal"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-right">
          <span className="text-xs font-medium text-muted">التاريخ</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${fieldClass} text-left`}
            dir="ltr"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-right">
          <span className="text-xs font-medium text-muted">ملاحظة (اختياري)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="مثال: خصم على فاتورة رقم…"
            className={`${fieldClass} resize-none`}
          />
        </label>

        {error ? (
          <p className="text-sm font-medium text-[#b5543f]">{error}</p>
        ) : null}

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-[#2F9B7A] text-sm font-bold text-white transition-all hover:brightness-105 active:scale-[0.98]"
          >
            {editingId ? "حفظ التعديل" : "تسجيل الخصم"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="h-12 rounded-2xl border border-border bg-card px-4 text-sm font-bold text-foreground"
            >
              إلغاء
            </button>
          ) : null}
        </div>
      </form>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-border bg-card px-3.5 py-3">
            <p className="text-[11px] text-muted">إجمالي الخصومات</p>
            <p className="mt-1 text-base font-bold tabular-nums text-[#2F9B7A]">
              {formatCurrency(supplierDiscountsTotal(discounts))} ج.م
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-3.5 py-3">
            <p className="text-[11px] text-muted">خصومات هذا الشهر</p>
            <p className="mt-1 text-base font-bold tabular-nums text-[#2F9B7A]">
              {formatCurrency(monthTotal)} ج.م
            </p>
          </div>
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="بحث باسم المورد أو الملاحظة…"
          className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted">
            مفيش خصومات مسجلة
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((d) => (
              <li
                key={d.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">
                    {d.supplierName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {formatDate(d.date)}
                    {d.note ? ` · ${d.note}` : ""}
                  </p>
                  <div className="mt-1.5 flex gap-3 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => startEdit(d)}
                      className="text-primary"
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(d)}
                      className="text-[#b5543f]"
                    >
                      حذف
                    </button>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-bold tabular-nums text-[#2F9B7A]">
                  +{formatCurrency(d.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
