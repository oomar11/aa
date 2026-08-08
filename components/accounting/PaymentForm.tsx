"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  deletePayment,
  loadPayments,
  PAYMENT_METHOD_LABELS,
  todayIsoDate,
  upsertPayment,
  type Payment,
  type PaymentMethod,
} from "@/lib/accounting";
import { getCustomerById } from "@/lib/customers";
import { getProjectById } from "@/lib/projects";
import { getProjectMoneySummary } from "@/lib/project-money";
import { ROUTES } from "@/lib/routes";
import {
  ensureCustomerLinkedToStore,
  hasStoreBridgeCredentials,
  isStoreBridgeActive,
  loadStoreBridgeConfig,
  postStorePartyLedger,
  syncMoneyToStore,
  syncProjectSaleToStore,
  withStoreBridgeMeta,
} from "@/lib/store-bridge";
import { formatCurrency } from "@/lib/utils";
import { NumericInput } from "@/components/ui/NumericInput";
import { PaymentProjectPicker } from "@/components/accounting/PaymentProjectPicker";

/**
 * استلام أو تعديل دفعة على مشروع.
 * مع ربط المتجر: تُسجَّل كإيداع في خزنة المتجر (مصدر الحقيقة).
 */
export function PaymentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editPaymentId = searchParams.get("payment") ?? "";
  const presetProjectId = searchParams.get("project") ?? "";

  const [hydrated, setHydrated] = useState(false);
  const [existing, setExisting] = useState<Payment | null>(null);
  const [missingEdit, setMissingEdit] = useState(false);

  const [paymentId, setPaymentId] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [projectId, setProjectId] = useState(presetProjectId);
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayIsoDate);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [projectError, setProjectError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bridgeOn, setBridgeOn] = useState(false);
  const [bridgeSafeName, setBridgeSafeName] = useState("");

  const isEditing = Boolean(existing);

  useEffect(() => {
    const cfg = loadStoreBridgeConfig();
    setBridgeOn(isStoreBridgeActive(cfg));
    setBridgeSafeName(cfg?.safeName || "");
  }, []);

  useEffect(() => {
    if (editPaymentId) {
      const found = loadPayments().find((p) => p.id === editPaymentId);
      if (!found) {
        setMissingEdit(true);
        setExisting(null);
        setHydrated(true);
        return;
      }
      setExisting(found);
      setPaymentId(found.id);
      setCreatedAt(found.createdAt);
      setProjectId(found.projectId ?? "");
      setAmount(found.amount);
      setDate(found.date);
      setMethod(found.method);
      setNote(found.note ?? "");
      setHydrated(true);
      return;
    }

    setExisting(null);
    setPaymentId("");
    setCreatedAt("");
    setProjectId(presetProjectId);
    setDate(todayIsoDate());
    setMethod("cash");
    setNote("");
    if (presetProjectId) {
      const money = getProjectMoneySummary(presetProjectId);
      setAmount(money.remaining > 0 ? money.remaining : 0);
    } else {
      setAmount(0);
    }
    setHydrated(true);
  }, [editPaymentId, presetProjectId]);

  const selected = projectId ? getProjectById(projectId) : undefined;
  const money = projectId ? getProjectMoneySummary(projectId) : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const selectedProject = projectId ? getProjectById(projectId) : undefined;
    if (!selectedProject) {
      setError("اختر المشروع");
      setProjectError(true);
      return;
    }

    if (amount <= 0) {
      setError("أدخل مبلغاً أكبر من صفر");
      return;
    }

    const id = paymentId || `pay-${Date.now()}`;
    const customer = getCustomerById(selectedProject.customerId);
    const cfg = loadStoreBridgeConfig();
    const bridgeActive = isStoreBridgeActive(cfg);

    setSaving(true);
    setError("");
    try {
      let storeBridge = existing?.storeBridge;
      if (bridgeActive && cfg) {
        const sync = await syncMoneyToStore(
          {
            kind: "payment",
            externalKey: id,
            amount,
            description: [
              "ورشة · دفعة",
              customer?.name,
              selectedProject.name,
              PAYMENT_METHOD_LABELS[method],
            ]
              .filter(Boolean)
              .join(" · "),
            notes: note.trim() || undefined,
            occurredAt: date ? `${date}T12:00:00.000Z` : undefined,
            safeId: cfg.safeId,
          },
          cfg
        );
        storeBridge = withStoreBridgeMeta(
          amount,
          sync.safe_id || cfg.safeId,
          sync.reference_id
        );
      }

      // حساب العميل في المحل: بيع المشروع + تحصيل الدفعة
      if (hasStoreBridgeCredentials(cfg) && customer && cfg) {
        const storeCustomerId = await ensureCustomerLinkedToStore(
          customer,
          cfg
        );
        if (storeCustomerId) {
          const sale = getProjectMoneySummary(selectedProject.id).sale;
          await syncProjectSaleToStore(
            {
              storeCustomerId,
              projectId: selectedProject.id,
              projectName: selectedProject.name,
              saleAmount: sale,
              occurredAt: date ? `${date}T12:00:00.000Z` : undefined,
            },
            cfg
          );
          await postStorePartyLedger(
            {
              storeCustomerId,
              sourceRef: `pay:${id}`,
              entryType: "workshop_collection",
              amount,
              direction: "credit",
              occurredAt: date ? `${date}T12:00:00.000Z` : undefined,
              notes: note.trim() || PAYMENT_METHOD_LABELS[method],
              projectLabel: selectedProject.name,
            },
            cfg
          );
        }
      }

      upsertPayment({
        id,
        customerId: selectedProject.customerId,
        projectId: selectedProject.id,
        amount,
        date,
        method,
        note: note.trim() || undefined,
        createdAt: createdAt || new Date().toISOString(),
        storeBridge,
      });

      if (isEditing) {
        router.replace(
          ROUTES.design.account(selectedProject.customerId, selectedProject.id)
        );
        return;
      }
      router.replace(ROUTES.workshop);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر حفظ الدفعة أو مزامنة خزنة المتجر"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!paymentId) return;
    if (!window.confirm("حذف هذه الدفعة؟")) return;
    const project = projectId ? getProjectById(projectId) : undefined;
    const cfg = loadStoreBridgeConfig();
    setSaving(true);
    setError("");
    try {
      if (isStoreBridgeActive(cfg) && (existing?.storeBridge || cfg)) {
        await syncMoneyToStore(
          {
            kind: "payment",
            externalKey: paymentId,
            amount: 0,
            description: "ورشة · حذف دفعة",
            safeId: existing?.storeBridge?.safeId || cfg?.safeId,
          },
          cfg
        );
      }
      if (hasStoreBridgeCredentials(cfg) && existing && cfg) {
        const cust = getCustomerById(existing.customerId);
        const storeCustomerId = cust
          ? await ensureCustomerLinkedToStore(cust, cfg)
          : null;
        if (storeCustomerId) {
          await postStorePartyLedger(
            {
              storeCustomerId,
              sourceRef: `pay:${paymentId}`,
              entryType: "workshop_void",
              amount: 0,
              direction: "credit",
              notes: "حذف دفعة ورشة",
            },
            cfg
          );
        }
      }
      deletePayment(paymentId);
      if (project) {
        router.replace(ROUTES.design.account(project.customerId, project.id));
      } else {
        router.replace(ROUTES.accounting.payments);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "تعذر حذف الدفعة من خزنة المتجر"
      );
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

  if (!hydrated) {
    return (
      <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted">
        جاري التحميل…
      </div>
    );
  }

  if (missingEdit) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
        الدفعة غير موجودة
      </p>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex w-full flex-col gap-4">
      <p className="rounded-2xl border border-primary/20 bg-primary-soft/40 px-3.5 py-3 text-xs leading-relaxed text-foreground">
        {isEditing
          ? "عدّل المبلغ أو التاريخ أو طريقة الدفع. التغيير يحدّث حساب المشروع فوراً."
          : "سجّل المبلغ على المشروع. أي دفعة على مقايسة تدخل قائمة انتظار الورشة."}
        {bridgeOn
          ? ` · تتحمل على خزنة المتجر${bridgeSafeName ? ` (${bridgeSafeName})` : ""}.`
          : " · خزنة المتجر غير مربوطة (إعدادات)."}
      </p>

      <PaymentProjectPicker
        value={projectId}
        onChange={(id) => {
          setProjectId(id);
          setProjectError(false);
          setError("");
          if (!isEditing) {
            const next = getProjectMoneySummary(id);
            if (next.remaining > 0) setAmount(next.remaining);
          }
        }}
        error={projectError}
        includeDone
        required
      />

      {selected && money ? (
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-3 text-center">
          <div>
            <p className="text-[10px] text-muted">الحساب</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums">
              {formatCurrency(money.sale)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted">مدفوع</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-[#2F9B7A]">
              {formatCurrency(money.paid)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted">باقي</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-[#E85A8A]">
              {formatCurrency(money.remaining)}
            </p>
          </div>
        </div>
      ) : null}

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">
          المبلغ (ج.م) <span className="text-[#E85A8A]">*</span>
        </span>
        <NumericInput
          value={amount}
          onChange={(value) => {
            setAmount(value);
            setError("");
          }}
          min={0}
          blankZero
          className={`${fieldClass} text-left`}
          dir="ltr"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">التاريخ</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`${fieldClass} text-left`}
          dir="ltr"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">طريقة الدفع</span>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          className={fieldClass}
        >
          {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map(
            (key) => (
              <option key={key} value={key}>
                {PAYMENT_METHOD_LABELS[key]}
              </option>
            )
          )}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">
          ملاحظة <span className="font-normal text-muted">(اختياري)</span>
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="مثال: دفعة أولى"
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
        {saving
          ? "جاري الحفظ…"
          : isEditing
            ? "حفظ التعديل"
            : "حفظ الدفعة"}
      </button>

      {isEditing ? (
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleDelete()}
          className="flex h-11 w-full items-center justify-center rounded-2xl border border-[#E85A8A]/35 text-sm font-semibold text-[#E85A8A] disabled:opacity-60"
        >
          حذف الدفعة
        </button>
      ) : null}
    </form>
  );
}
