"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import {
  invoiceRemaining,
  loadInvoices,
  PAYMENT_METHOD_LABELS,
  todayIsoDate,
  upsertPayment,
  type Invoice,
  type PaymentKind,
  type PaymentMethod,
} from "@/lib/accounting";
import {
  customers,
  loadLocalCustomers,
  type Customer,
} from "@/lib/customers";
import { getProjectsForCustomer, type Project } from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import { applyDepositToProject } from "@/lib/workshop";
import { NumericInput } from "@/components/ui/NumericInput";
import { formatCurrency } from "@/lib/utils";

function mergeCustomers(): Customer[] {
  if (typeof window === "undefined") return customers;
  const local = loadLocalCustomers();
  const localIds = new Set(local.map((c) => c.id));
  return [...local, ...customers.filter((c) => !localIds.has(c.id))];
}

function remainingForInvoice(invoiceId: string): number {
  const invoice = loadInvoices().find((i) => i.id === invoiceId);
  return invoice ? invoiceRemaining(invoice) : 0;
}

export function PaymentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetCustomerId = searchParams.get("customer") ?? "";
  const presetInvoiceId = searchParams.get("invoice") ?? "";
  const presetProjectId = searchParams.get("project") ?? "";

  const [allCustomers] = useState(mergeCustomers);
  const [customerId, setCustomerId] = useState(presetCustomerId);
  const [invoiceId, setInvoiceId] = useState(presetInvoiceId);
  const [projectId, setProjectId] = useState(presetProjectId);
  const [kind, setKind] = useState<PaymentKind>(
    presetProjectId ? "deposit" : "payment"
  );
  const [amount, setAmount] = useState(() =>
    presetInvoiceId ? remainingForInvoice(presetInvoiceId) : 0
  );
  const [date, setDate] = useState(todayIsoDate);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const customerProjects = useMemo(() => {
    if (!customerId) return [] as Project[];
    return getProjectsForCustomer(customerId).filter(
      (p) => p.workflow !== "done"
    );
  }, [customerId]);

  const openInvoices = useMemo(() => {
    if (!customerId) return [] as Invoice[];
    return loadInvoices().filter(
      (invoice) =>
        invoice.customerId === customerId &&
        invoice.status !== "cancelled" &&
        invoiceRemaining(invoice) > 0
    );
  }, [customerId]);

  const selectedInvoice = useMemo(() => {
    if (!invoiceId) return undefined;
    return (
      openInvoices.find((i) => i.id === invoiceId) ??
      loadInvoices().find(
        (i) => i.id === invoiceId && i.customerId === customerId
      )
    );
  }, [invoiceId, openInvoices, customerId]);

  const validInvoiceId = selectedInvoice?.id ?? "";

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!customerId) {
      setError("اختر العميل");
      return;
    }
    if (amount <= 0) {
      setError("أدخل مبلغاً أكبر من صفر");
      return;
    }
    if (kind === "deposit" && !projectId) {
      setError("اختر المشروع لتسجيل العربون");
      return;
    }

    const resolvedProjectId =
      projectId || selectedInvoice?.projectId || undefined;

    upsertPayment({
      id: `pay-${Date.now()}`,
      customerId,
      invoiceId: validInvoiceId || undefined,
      projectId: resolvedProjectId,
      kind,
      amount,
      date,
      method,
      note:
        note.trim() ||
        (kind === "deposit" ? "عربون" : undefined),
      createdAt: new Date().toISOString(),
    });

    if (kind === "deposit" && resolvedProjectId) {
      applyDepositToProject(resolvedProjectId, amount, date);
    }

    router.replace(
      kind === "deposit" ? ROUTES.home : ROUTES.accounting.payments
    );
  }

  const fieldClass =
    "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <fieldset className="flex flex-col gap-2 text-right">
        <legend className="text-sm font-medium">نوع التحصيل</legend>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setKind("deposit")}
            className={`h-11 rounded-2xl border text-sm font-semibold ${
              kind === "deposit"
                ? "border-primary bg-primary text-white"
                : "border-border bg-card text-foreground"
            }`}
          >
            عربون
          </button>
          <button
            type="button"
            onClick={() => setKind("payment")}
            className={`h-11 rounded-2xl border text-sm font-semibold ${
              kind === "payment"
                ? "border-primary bg-primary text-white"
                : "border-border bg-card text-foreground"
            }`}
          >
            دفعة عادية
          </button>
        </div>
        {kind === "deposit" ? (
          <p className="text-[11px] leading-relaxed text-muted">
            يسجّل العربون المشروع في قائمة انتظار الورشة تلقائياً.
          </p>
        ) : null}
      </fieldset>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">
          العميل <span className="text-[#E85A8A]">*</span>
        </span>
        <select
          value={customerId}
          onChange={(e) => {
            setCustomerId(e.target.value);
            setInvoiceId("");
            setProjectId("");
            setAmount(0);
            setError("");
          }}
          className={fieldClass}
        >
          <option value="">اختر عميلاً…</option>
          {allCustomers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">
          المشروع{" "}
          {kind === "deposit" ? (
            <span className="text-[#E85A8A]">*</span>
          ) : (
            <span className="font-normal text-muted">(اختياري)</span>
          )}
        </span>
        <select
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setError("");
          }}
          disabled={!customerId}
          className={fieldClass}
        >
          <option value="">اختر مشروعاً…</option>
          {customerProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
              {project.workflow === "quote" ? " — مقايسة" : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">
          الفاتورة <span className="font-normal text-muted">(اختياري)</span>
        </span>
        <select
          value={validInvoiceId}
          onChange={(e) => {
            const nextId = e.target.value;
            setInvoiceId(nextId);
            setAmount(nextId ? remainingForInvoice(nextId) : 0);
            const inv = openInvoices.find((i) => i.id === nextId);
            if (inv?.projectId) setProjectId(inv.projectId);
            setError("");
          }}
          disabled={!customerId}
          className={fieldClass}
        >
          <option value="">بدون ربط بفاتورة</option>
          {openInvoices.map((invoice) => (
            <option key={invoice.id} value={invoice.id}>
              {invoice.number} — متبقي {formatCurrency(invoiceRemaining(invoice))}
            </option>
          ))}
          {selectedInvoice &&
          !openInvoices.some((i) => i.id === selectedInvoice.id) ? (
            <option value={selectedInvoice.id}>
              {selectedInvoice.number}
            </option>
          ) : null}
        </select>
      </label>

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
          rows={3}
          className={`${fieldClass} resize-none`}
        />
      </label>

      {error ? (
        <p className="text-sm font-medium text-[#E85A8A]">{error}</p>
      ) : null}

      <button
        type="submit"
        className="mt-2 flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98]"
      >
        {kind === "deposit" ? "حفظ العربون والإضافة إلى قائمة الانتظار" : "حفظ التحصيل"}
      </button>
    </form>
  );
}
