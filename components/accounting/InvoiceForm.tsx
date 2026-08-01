"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import {
  loadInvoices,
  nextInvoiceNumber,
  todayIsoDate,
  upsertInvoice,
  type InvoiceLine,
} from "@/lib/accounting";
import { mergeCustomers } from "@/lib/customers";
import { getProjectById, getProjectsForCustomer } from "@/lib/projects";
import { projectSaleTotal } from "@/lib/project-money";
import { ROUTES } from "@/lib/routes";
import { formatCurrency } from "@/lib/utils";
import { NumericInput } from "@/components/ui/NumericInput";

export function InvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetCustomerId = searchParams.get("customer") ?? "";

  const [allCustomers] = useState(mergeCustomers);
  const [customerId, setCustomerId] = useState(presetCustomerId);
  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState(todayIsoDate);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const projects = useMemo(() => {
    if (!customerId) return [];
    return getProjectsForCustomer(customerId);
  }, [customerId]);

  const validProjectId = projects.some((p) => p.id === projectId)
    ? projectId
    : "";

  const selectedSale =
    validProjectId && typeof window !== "undefined"
      ? projectSaleTotal(validProjectId)
      : 0;

  function applyProject(nextProjectId: string) {
    setProjectId(nextProjectId);
    setError("");
    if (!nextProjectId) return;

    const project = getProjectById(nextProjectId);
    const sale = projectSaleTotal(nextProjectId);
    if (sale > 0) {
      setAmount(sale);
    }
    if (project && !description.trim()) {
      setDescription(`توريد وتركيب — ${project.name}`);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!customerId) {
      setError("اختر العميل");
      return;
    }
    if (!description.trim()) {
      setError("اكتب وصف الفاتورة");
      return;
    }
    if (amount <= 0) {
      setError("أدخل مبلغاً أكبر من صفر");
      return;
    }

    const invoices = loadInvoices();
    const line: InvoiceLine = {
      id: `line-${Date.now()}`,
      description: description.trim(),
      amount,
    };
    const id = `inv-${Date.now()}`;
    upsertInvoice({
      id,
      number: nextInvoiceNumber(invoices),
      customerId,
      projectId: validProjectId || undefined,
      date,
      lines: [line],
      total: amount,
      note: note.trim() || undefined,
      status: "issued",
      createdAt: new Date().toISOString(),
    });
    router.replace(ROUTES.accounting.invoice(id));
  }

  const fieldClass =
    "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">
          العميل <span className="text-[#E85A8A]">*</span>
        </span>
        <select
          value={customerId}
          onChange={(e) => {
            setCustomerId(e.target.value);
            setProjectId("");
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
          المشروع <span className="font-normal text-muted">(اختياري)</span>
        </span>
        <select
          value={validProjectId}
          onChange={(e) => applyProject(e.target.value)}
          disabled={!customerId}
          className={fieldClass}
        >
          <option value="">بدون مشروع</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        {validProjectId && selectedSale > 0 ? (
          <p className="text-[11px] text-muted">
            إجمالي بيع البنود:{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(selectedSale)} ج.م
            </span>
            {" — "}
            يُملأ المبلغ تلقائياً ويمكن تعديله
          </p>
        ) : validProjectId ? (
          <p className="text-[11px] text-muted">
            لا يوجد بيع على البنود بعد — أدخل المبلغ يدوياً
          </p>
        ) : null}
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
        <span className="text-sm font-medium">
          الوصف <span className="text-[#E85A8A]">*</span>
        </span>
        <input
          type="text"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setError("");
          }}
          placeholder="مثال: توريد وتركيب"
          className={fieldClass}
        />
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
        حفظ الفاتورة
      </button>
    </form>
  );
}
