"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  deletePayment,
  loadPayments,
  todayIsoDate,
  upsertPayment,
  type Payment,
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
import { StoreSafePicker } from "@/components/accounting/StoreSafePicker";

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
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [projectError, setProjectError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bridgeOn, setBridgeOn] = useState(false);
  const [safeId, setSafeId] = useState("");
  const [bridgeSafeName, setBridgeSafeName] = useState("");

  const isEditing = Boolean(existing);

  useEffect(() => {
    function refreshBridge() {
      const cfg = loadStoreBridgeConfig();
      setBridgeOn(isStoreBridgeActive(cfg));
      if (!safeId) {
        setSafeId(
          existing?.storeBridge?.safeId || cfg?.safeId || ""
        );
        setBridgeSafeName(cfg?.safeName || "");
      }
    }
    refreshBridge();
    window.addEventListener("upvc-store-bridge-updated", refreshBridge);
    return () =>
      window.removeEventListener("upvc-store-bridge-updated", refreshBridge);
  }, [existing?.storeBridge?.safeId, safeId]);

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
      setNote(found.note ?? "");
      setSafeId(found.storeBridge?.safeId || "");
      setBridgeSafeName(found.storeBridge?.safeName || "");
      setHydrated(true);
      return;
    }

    setExisting(null);
    setPaymentId("");
    setCreatedAt("");
    setProjectId(presetProjectId);
    setDate(todayIsoDate());
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
    const chosenSafeId = (
      safeId ||
      existing?.storeBridge?.safeId ||
      cfg?.safeId ||
      ""
    ).trim();
    const chosenSafeName = (
      bridgeSafeName ||
      existing?.storeBridge?.safeName ||
      cfg?.safeName ||
      ""
    ).trim();

    if (bridgeActive && !chosenSafeId) {
      setError("اختر خزنة من خزن النظام");
      return;
    }

    const localBridge = chosenSafeId
      ? {
          safeId: chosenSafeId,
          safeName: chosenSafeName || undefined,
          syncedAmount: existing?.storeBridge?.syncedAmount ?? 0,
          syncedAt: existing?.storeBridge?.syncedAt ?? "",
          referenceId: existing?.storeBridge?.referenceId,
        }
      : existing?.storeBridge;

    setSaving(true);
    setError("");
    try {
      // Local-first: avoid orphan store cash if local save never runs
      upsertPayment({
        id,
        customerId: selectedProject.customerId,
        projectId: selectedProject.id,
        amount,
        date,
        method: existing?.method ?? "cash",
        note: note.trim() || undefined,
        createdAt: createdAt || new Date().toISOString(),
        storeBridge: localBridge,
      });

      let storeBridge = existing?.storeBridge;
      let syncWarning = "";
      let safeSynced = false;
      if (bridgeActive && cfg) {
        try {
          const sync = await syncMoneyToStore(
            {
              kind: "payment",
              externalKey: id,
              amount,
              description: [
                "ورشة · دفعة",
                customer?.name,
                selectedProject.name,
                chosenSafeName,
              ]
                .filter(Boolean)
                .join(" · "),
              notes: note.trim() || undefined,
              occurredAt: date ? `${date}T12:00:00.000Z` : undefined,
              safeId: chosenSafeId,
            },
            cfg
          );
          storeBridge = withStoreBridgeMeta(
            amount,
            sync.safe_id || chosenSafeId,
            sync.reference_id,
            chosenSafeName
          );
          safeSynced = true;
          upsertPayment({
            id,
            customerId: selectedProject.customerId,
            projectId: selectedProject.id,
            amount,
            date,
            method: existing?.method ?? "cash",
            note: note.trim() || undefined,
            createdAt: createdAt || new Date().toISOString(),
            storeBridge,
          });

          if (hasStoreBridgeCredentials(cfg) && customer) {
            try {
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
                    includeInCustomerLedger: true,
                    localPartyId: customer.id,
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
                    notes: note.trim() || chosenSafeName || undefined,
                    projectLabel: selectedProject.name,
                    details: {
                      kind: "aa_payment",
                      project_id: selectedProject.id,
                      payment_id: id,
                      local_party_id: customer.id,
                      customer_id: customer.id,
                    },
                  },
                  cfg
                );
              }
            } catch (ledgerErr) {
              syncWarning =
                `الخزنة اتسجّلت في المتجر، لكن فشل كشف الحساب: ${
                  ledgerErr instanceof Error
                    ? ledgerErr.message
                    : "خطأ غير معروف"
                }. جاري إعادة المحاولة تلقائياً.`;
              const { scheduleStoreLedgerMirror } = await import(
                "@/lib/store-ledger-mirror"
              );
              scheduleStoreLedgerMirror(600);
            }
          }
        } catch (err) {
          syncWarning =
            err instanceof Error
              ? err.message
              : "فشلت مزامنة خزنة المتجر";
          if (safeSynced) {
            syncWarning = `الخزنة اتسجّلت — ${syncWarning}. استخدم إعادة المزامنة من الإعدادات.`;
          }
        }
      }

      if (syncWarning) {
        setError(`تم الحفظ محلياً — ${syncWarning}`);
        setSaving(false);
        return;
      }

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
          : "تعذر حفظ الدفعة"
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
              details: {
                kind: "aa_payment",
                project_id: existing.projectId || null,
                payment_id: paymentId,
                local_party_id: existing.customerId,
                customer_id: existing.customerId,
              },
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
          ? "عدّل المبلغ أو التاريخ أو الخزنة. التغيير يحدّث حساب المشروع فوراً."
          : "سجّل المبلغ على المشروع واختر الخزنة. أي دفعة على مقايسة تدخل قائمة انتظار الورشة."}
        {bridgeOn
          ? " · هتتسجل إيداع في الخزنة اللي هتختارها."
          : " · خزن النظام مش مربوطة — من الإعدادات."}
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

      <StoreSafePicker
        label="طريقة الدفع"
        variant="choices"
        value={safeId}
        preferredSafeId={existing?.storeBridge?.safeId}
        onChange={(id, safe) => {
          setSafeId(id);
          setBridgeSafeName(safe?.name || "");
          setError("");
        }}
      />

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
