"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createStoreExternalPurchase,
  hasStoreBridgeCredentials,
  isStoreBridgeActive,
  loadStoreBridgeConfig,
  searchStoreSuppliers,
  upsertStoreSupplier,
  type StorePartyRow,
} from "@/lib/store-bridge";
import { listAllProjects } from "@/lib/projects";
import { upsertExpense } from "@/lib/accounting";
import { ROUTES } from "@/lib/routes";
import { formatCurrency } from "@/lib/utils";
import { StoreSafePicker } from "@/components/accounting/StoreSafePicker";

type Line = {
  description: string;
  quantity: number;
  unit_price: number;
};

/**
 * توريد خارجي لورشة PVC → فاتورة شراء على مورد في المحل.
 */
export function ExternalSupplyForm() {
  const router = useRouter();
  const [bridgeOk, setBridgeOk] = useState(false);
  const [supplierQuery, setSupplierQuery] = useState("");
  const [suppliers, setSuppliers] = useState<StorePartyRow[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [showQuick, setShowQuick] = useState(false);
  const [lines, setLines] = useState<Line[]>([
    { description: "", quantity: 1, unit_price: 0 },
  ]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [safeId, setSafeId] = useState("");

  const projects = useMemo(() => listAllProjects(), []);

  useEffect(() => {
    function refresh() {
      const cfg = loadStoreBridgeConfig();
      setBridgeOk(hasStoreBridgeCredentials(cfg));
      if (!safeId) setSafeId(cfg?.safeId || "");
    }
    refresh();
    window.addEventListener("upvc-store-bridge-updated", refresh);
    return () =>
      window.removeEventListener("upvc-store-bridge-updated", refresh);
  }, [safeId]);

  useEffect(() => {
    if (!bridgeOk) return;
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
  }, [bridgeOk, supplierQuery]);

  const total = lines.reduce(
    (sum, line) =>
      sum + Math.max(0, line.quantity) * Math.max(0, line.unit_price),
    0
  );

  async function handleQuickSupplier() {
    setError("");
    const name = quickName.trim();
    if (!name) {
      setError("اسم المورد مطلوب");
      return;
    }
    setSaving(true);
    try {
      const result = await upsertStoreSupplier({
        localPartyId: `aa-sup-${Date.now()}`,
        name,
        phone: quickPhone.trim() || undefined,
      });
      setSupplierId(result.storeSupplierId);
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
      setSaving(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!bridgeOk) {
      setError("اربط المتجر من الإعدادات أولاً");
      return;
    }
    if (!supplierId) {
      setError("اختر مورداً أو أضفه سريعاً");
      return;
    }
    const items = lines
      .map((line) => {
        const quantity = Math.max(0, Number(line.quantity) || 0);
        const unit_price = Math.max(0, Number(line.unit_price) || 0);
        const lineTotal = quantity * unit_price;
        return {
          description: line.description.trim() || "توريد ورشة",
          quantity: quantity || 1,
          unit_price: quantity ? unit_price : lineTotal,
          total: lineTotal,
        };
      })
      .filter((line) => line.total > 0);

    if (!items.length || total <= 0) {
      setError("أضف بند توريد بمبلغ أكبر من صفر");
      return;
    }
    if (paidAmount > total + 0.001) {
      setError("المدفوع أكبر من الإجمالي");
      return;
    }
    if (paidAmount > 0 && !safeId.trim()) {
      setError("اختر الخزنة عند الدفع النقدي");
      return;
    }

    const cfg = loadStoreBridgeConfig();
    const sourceRef = `supply-${Date.now()}`;
    setSaving(true);
    try {
      const result = await createStoreExternalPurchase(
        {
          supplierId,
          items,
          subtotal: total,
          total,
          paidAmount: Math.max(0, paidAmount),
          safeId:
            paidAmount > 0 && isStoreBridgeActive(cfg) ? safeId.trim() : null,
          notes: notes.trim() || undefined,
          createdAt: date ? `${date}T12:00:00.000Z` : undefined,
          sourceRef,
        },
        cfg
      );

      if (projectId) {
        const project = projects.find((p) => p.id === projectId);
        upsertExpense({
          id: `exp-supply-${sourceRef}`,
          category: "خامات",
          amount: total,
          date,
          description: `توريد محل ${result.invoiceNumber}`,
          note: items
            .slice(0, 4)
            .map((i) => i.description)
            .join(" · "),
          projectId,
          storeInvoiceId: result.invoiceId,
          storeInvoiceNumber: result.invoiceNumber,
          createdAt: new Date().toISOString(),
        });
        // Do not syncMoneyToStore — cash already handled by purchase API when paid.
        void project;
      }

      router.replace(ROUTES.accounting.hub);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ التوريد");
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

  if (!bridgeOk) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        اربط المتجر من الإعدادات أولاً لتسجيل التوريد على مورد.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold">المورد</h2>
          <button
            type="button"
            onClick={() => setShowQuick((v) => !v)}
            className="rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary"
          >
            {showQuick ? "إخفاء" : "إضافة مورد سريع"}
          </button>
        </div>

        {showQuick ? (
          <div className="mb-3 space-y-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3">
            <input
              className={fieldClass}
              placeholder="اسم المورد"
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
            />
            <input
              className={fieldClass}
              placeholder="الهاتف (اختياري)"
              value={quickPhone}
              onChange={(e) => setQuickPhone(e.target.value)}
              dir="ltr"
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleQuickSupplier()}
              className="w-full rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              حفظ المورد واختياره
            </button>
          </div>
        ) : null}

        <input
          className={fieldClass}
          placeholder="بحث عن مورد..."
          value={supplierQuery}
          onChange={(e) => setSupplierQuery(e.target.value)}
        />
        <p className="mt-1 text-[11px] text-muted">
          {searching ? "جاري البحث..." : `${suppliers.length} مورد`}
        </p>
        <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
          {suppliers.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSupplierId(s.id)}
              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-right text-sm ${
                supplierId === s.id
                  ? "border-primary bg-primary/10 font-bold"
                  : "border-border bg-background"
              }`}
            >
              <span>{s.name}</span>
              <span className="text-[11px] text-muted" dir="ltr">
                {s.phone || "—"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-bold">بنود التوريد</h2>
        {lines.map((line, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-3">
            <input
              className={`${fieldClass} sm:col-span-3`}
              placeholder="الوصف (قطاع / إكسسوار / زجاج...)"
              value={line.description}
              onChange={(e) => {
                const next = [...lines];
                next[index] = { ...line, description: e.target.value };
                setLines(next);
              }}
            />
            <input
              className={fieldClass}
              type="number"
              min={0}
              step="any"
              placeholder="الكمية"
              value={line.quantity || ""}
              onChange={(e) => {
                const next = [...lines];
                next[index] = {
                  ...line,
                  quantity: Number(e.target.value) || 0,
                };
                setLines(next);
              }}
            />
            <input
              className={fieldClass}
              type="number"
              min={0}
              step="any"
              placeholder="سعر الوحدة"
              value={line.unit_price || ""}
              onChange={(e) => {
                const next = [...lines];
                next[index] = {
                  ...line,
                  unit_price: Number(e.target.value) || 0,
                };
                setLines(next);
              }}
            />
            <div className="flex items-center justify-between rounded-2xl border border-border px-3 text-sm">
              <span className="text-muted">الإجمالي</span>
              <span className="font-bold">
                {formatCurrency(line.quantity * line.unit_price)}
              </span>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setLines((prev) => [
              ...prev,
              { description: "", quantity: 1, unit_price: 0 },
            ])
          }
          className="rounded-xl border border-border px-3 py-2 text-xs font-bold"
        >
          + بند
        </button>
      </div>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">التاريخ</span>
        <input
          type="date"
          className={fieldClass}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">مدفوع نقداً من خزنة المحل</span>
        <input
          type="number"
          min={0}
          step="any"
          className={fieldClass}
          value={paidAmount || ""}
          onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
        />
        <span className="text-[11px] text-muted">
          اتركه صفر للشراء الآجل (مديونية على المورد)
        </span>
      </label>

      {paidAmount > 0 ? (
        <StoreSafePicker
          value={safeId}
          label="الخزنة المسحوب منها"
          onChange={(id) => setSafeId(id)}
        />
      ) : null}

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">ربط بمشروع (اختياري)</span>
        <select
          className={fieldClass}
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value="">بدون مشروع</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">ملاحظات</span>
        <textarea
          className={fieldClass}
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm">
        <span>إجمالي التوريد</span>
        <span className="text-lg font-black">{formatCurrency(total)}</span>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {saving ? "جاري الحفظ..." : "تسجيل التوريد على المورد"}
      </button>
    </form>
  );
}
