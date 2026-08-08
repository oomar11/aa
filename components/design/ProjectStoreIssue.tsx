"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  todayIsoDate,
  upsertExpense,
} from "@/lib/accounting";
import {
  createStoreWorkshopIssue,
  hasStoreBridgeCredentials,
  searchStoreProducts,
  type StoreProductRow,
} from "@/lib/store-bridge";
import { formatCurrency } from "@/lib/utils";
import { NumericInput } from "@/components/ui/NumericInput";

type CartLine = {
  productId: string;
  name: string;
  unit: string;
  stock: number;
  quantity: number;
  unitPrice: number;
};

type Props = {
  projectId: string;
  projectName: string;
  onDone?: (expenseId: string) => void;
  onCancel?: () => void;
};

function roundMoney(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * صرف خامات من مخزون المحل مباشرة على المشروع (موبايل).
 * فاتورة «للورشة» + مصروف خامات بدون سحب خزنة.
 */
export function ProjectStoreIssue({
  projectId,
  projectName,
  onDone,
  onCancel,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StoreProductRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"amount" | "percent">(
    "amount"
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const bridgeOk = hasStoreBridgeCredentials();

  const runSearch = useCallback(async (q: string) => {
    if (!hasStoreBridgeCredentials()) {
      setResults([]);
      setSearchError("اربط المتجر من الإعدادات أولاً");
      return;
    }
    setSearching(true);
    setSearchError("");
    try {
      const rows = await searchStoreProducts(q);
      setResults(rows);
    } catch (err) {
      setResults([]);
      setSearchError(err instanceof Error ? err.message : "تعذر البحث");
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!bridgeOk) return;
    const t = window.setTimeout(() => {
      void runSearch(query);
    }, 280);
    return () => window.clearTimeout(t);
  }, [query, bridgeOk, runSearch]);

  const subtotal = useMemo(
    () =>
      roundMoney(
        cart.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
      ),
    [cart]
  );

  const discountAmount = useMemo(() => {
    const raw =
      discountType === "percent" ? (subtotal * discount) / 100 : discount;
    return roundMoney(Math.min(Math.max(0, raw), subtotal));
  }, [discount, discountType, subtotal]);

  const grandTotal = useMemo(
    () => roundMoney(Math.max(0, subtotal - discountAmount)),
    [subtotal, discountAmount]
  );

  function addProduct(p: StoreProductRow) {
    setError("");
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        const nextQty = Math.min(existing.quantity + 1, Math.max(0, p.stock));
        if (nextQty <= existing.quantity && existing.quantity >= p.stock) {
          setError(`المخزون المتاح لـ «${p.name}» هو ${p.stock}`);
          return prev;
        }
        return prev.map((l) =>
          l.productId === p.id ? { ...l, quantity: nextQty, stock: p.stock } : l
        );
      }
      if (p.stock <= 0) {
        setError(`«${p.name}» نفذ من المخزون`);
        return prev;
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          unit: p.unit || "قطعة",
          stock: p.stock,
          quantity: 1,
          unitPrice: Number(p.sale_price) || 0,
        },
      ];
    });
  }

  function updateLine(
    productId: string,
    patch: Partial<Pick<CartLine, "quantity" | "unitPrice">>
  ) {
    setError("");
    setCart((prev) =>
      prev.map((l) => {
        if (l.productId !== productId) return l;
        const quantity =
          patch.quantity != null
            ? Math.max(0, Number(patch.quantity) || 0)
            : l.quantity;
        const unitPrice =
          patch.unitPrice != null
            ? Math.max(0, Number(patch.unitPrice) || 0)
            : l.unitPrice;
        return { ...l, quantity, unitPrice };
      })
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!bridgeOk) {
      setError("اربط المتجر من الإعدادات أولاً");
      return;
    }
    if (!cart.length) {
      setError("أضف صنفاً واحداً على الأقل");
      return;
    }
    for (const line of cart) {
      if (!(line.quantity > 0)) {
        setError(`أدخل كمية لـ «${line.name}»`);
        return;
      }
      if (line.quantity > line.stock + 0.0005) {
        setError(`الكمية أكبر من المخزون لـ «${line.name}» (متاح ${line.stock})`);
        return;
      }
    }

    setSaving(true);
    setError("");
    try {
      const result = await createStoreWorkshopIssue({
        items: cart.map((l) => ({
          product_id: l.productId,
          quantity: l.quantity,
          unit_price: l.unitPrice,
          discount: 0,
        })),
        discountAmount: discount,
        discountType,
        projectKey: projectId,
        projectName,
        notes: note.trim() || undefined,
        // store-system client_operations.client_op_id is UUID
        clientOpId: crypto.randomUUID(),
      });

      const lines = (result.items_summary || [])
        .slice(0, 4)
        .map((l) => l.name || "صنف")
        .filter(Boolean);
      const expenseId = `exp-store-${result.invoice_id}`;
      upsertExpense({
        id: expenseId,
        category: "خامات",
        description: `فاتورة محل ${result.invoice_number}`,
        amount: Number(result.total) || grandTotal,
        date: todayIsoDate(),
        projectId,
        note: [
          lines.length ? lines.join(" · ") : undefined,
          note.trim() || undefined,
        ]
          .filter(Boolean)
          .join(" — "),
        createdAt: new Date().toISOString(),
        storeInvoiceId: result.invoice_id,
        storeInvoiceNumber: result.invoice_number,
      });

      onDone?.(expenseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر صرف الخامات");
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-[#E8956F] focus:ring-2 focus:ring-[#E8956F]/20";

  if (!bridgeOk) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-muted">
        <p>اربط المتجر من الإعدادات عشان تصرف خامات من المخزون.</p>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="self-start text-xs font-semibold text-[#C45C26]"
          >
            رجوع
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div>
          <h2 className="text-sm font-bold text-foreground">صرف من المحل</h2>
          <p className="mt-0.5 text-xs text-muted">
            يخصم المخزون ويتسجّل مصروف خامات على المشروع
          </p>
        </div>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-semibold text-muted"
          >
            إلغاء
          </button>
        ) : null}
      </div>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-xs font-medium text-muted">بحث صنف</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="مثال: عود حلق"
          className={fieldClass}
          autoFocus
        />
      </label>

      {searchError ? (
        <p className="text-xs font-medium text-red-600">{searchError}</p>
      ) : null}

      <div className="max-h-48 overflow-y-auto rounded-2xl border border-border bg-card">
        {searching ? (
          <p className="px-4 py-6 text-center text-xs text-muted">جاري البحث…</p>
        ) : results.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted">
            {query.trim() ? "لا توجد نتائج" : "اكتب للبحث في أصناف المحل"}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => addProduct(p)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-right transition-colors active:bg-background"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {p.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {p.sku || "—"} · متاح {p.stock} {p.unit || ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-[#C45C26]">
                    {formatCurrency(p.sale_price)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {cart.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="px-0.5 text-xs font-bold text-muted">السلة</h3>
          {cart.map((line) => (
            <div
              key={line.productId}
              className="rounded-2xl border border-border bg-card p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {line.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    متاح {line.stock} {line.unit}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(line.productId)}
                  className="text-[11px] font-semibold text-red-600"
                >
                  حذف
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-right">
                  <span className="text-[11px] text-muted">الكمية</span>
                  <NumericInput
                    value={line.quantity}
                    onChange={(value) =>
                      updateLine(line.productId, { quantity: value })
                    }
                    min={0}
                    max={line.stock}
                    blankZero
                    className={`${fieldClass} py-2 text-left tabular-nums`}
                    dir="ltr"
                    inputMode="decimal"
                  />
                </label>
                <label className="flex flex-col gap-1 text-right">
                  <span className="text-[11px] text-muted">سعر الوحدة</span>
                  <NumericInput
                    value={line.unitPrice}
                    onChange={(value) =>
                      updateLine(line.productId, { unitPrice: value })
                    }
                    min={0}
                    blankZero
                    className={`${fieldClass} py-2 text-left tabular-nums`}
                    dir="ltr"
                    inputMode="decimal"
                  />
                </label>
              </div>
              <p className="mt-2 text-left text-xs font-semibold tabular-nums text-foreground">
                {formatCurrency(roundMoney(line.quantity * line.unitPrice))} ج.م
              </p>
            </div>
          ))}

          <div className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted">خصم الفاتورة</span>
              <select
                value={discountType}
                onChange={(e) =>
                  setDiscountType(e.target.value === "percent" ? "percent" : "amount")
                }
                className="rounded-xl border border-border bg-background px-2 py-1 text-xs"
              >
                <option value="amount">ج.م</option>
                <option value="percent">%</option>
              </select>
            </div>
            <NumericInput
              value={discount}
              onChange={setDiscount}
              min={0}
              blankZero
              className={`${fieldClass} mt-2 py-2 text-left tabular-nums`}
              dir="ltr"
              inputMode="decimal"
            />
          </div>

          <label className="flex flex-col gap-1.5 text-right">
            <span className="text-xs font-medium text-muted">ملاحظة (اختياري)</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: عود حلق للشباك"
              className={fieldClass}
            />
          </label>

          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#C45C26] to-[#E8956F] px-4 py-4 text-white">
            <div className="flex items-center justify-between text-xs opacity-90">
              <span>الإجمالي قبل الخصم</span>
              <span className="tabular-nums">{formatCurrency(subtotal)} ج.م</span>
            </div>
            {discountAmount > 0 ? (
              <div className="mt-1 flex items-center justify-between text-xs opacity-90">
                <span>الخصم</span>
                <span className="tabular-nums">
                  −{formatCurrency(discountAmount)} ج.م
                </span>
              </div>
            ) : null}
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">
              {formatCurrency(grandTotal)}
              <span className="mr-1.5 text-sm font-semibold opacity-85">ج.م</span>
            </p>
          </div>
        </section>
      ) : null}

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving || cart.length === 0}
        className="rounded-2xl bg-[#C45C26] px-4 py-3.5 text-sm font-bold text-white shadow-[0_6px_16px_rgba(196,92,38,0.28)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "جاري الصرف…" : "تأكيد الصرف وتسجيل المصروف"}
      </button>
    </form>
  );
}
