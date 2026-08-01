"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import {
  PAYMENT_METHOD_LABELS,
  todayIsoDate,
  upsertPayment,
  type PaymentMethod,
} from "@/lib/accounting";
import {
  customers,
  loadLocalCustomers,
  type Customer,
} from "@/lib/customers";
import { listAllProjects, type Project } from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import { queueProjectAfterPayment } from "@/lib/workshop";
import { NumericInput } from "@/components/ui/NumericInput";

function mergeCustomers(): Customer[] {
  if (typeof window === "undefined") return customers;
  const local = loadLocalCustomers();
  const localIds = new Set(local.map((c) => c.id));
  return [...local, ...customers.filter((c) => !localIds.has(c.id))];
}

/**
 * استلام دفعة: المشروع + المبلغ فقط.
 * أي مبلغ مربوط بمشروع يدخله قائمة انتظار الورشة تلقائياً.
 */
export function PaymentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetProjectId = searchParams.get("project") ?? "";

  const [allCustomers] = useState(mergeCustomers);
  const [projectId, setProjectId] = useState(presetProjectId);
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayIsoDate);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const customerById = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const customer of allCustomers) map.set(customer.id, customer);
    return map;
  }, [allCustomers]);

  const openProjects = useMemo(() => {
    return listAllProjects()
      .filter((p) => p.workflow !== "done")
      .sort((a, b) => {
        const ca = customerById.get(a.customerId)?.name ?? "";
        const cb = customerById.get(b.customerId)?.name ?? "";
        if (ca !== cb) return ca.localeCompare(cb, "ar");
        return a.name.localeCompare(b.name, "ar");
      });
  }, [customerById]);

  const selectedProject: Project | undefined = useMemo(
    () => openProjects.find((p) => p.id === projectId),
    [openProjects, projectId]
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedProject) {
      setError("اختر المشروع");
      return;
    }
    if (amount <= 0) {
      setError("أدخل مبلغاً أكبر من صفر");
      return;
    }

    upsertPayment({
      id: `pay-${Date.now()}`,
      customerId: selectedProject.customerId,
      projectId: selectedProject.id,
      amount,
      date,
      method,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    });

    queueProjectAfterPayment(selectedProject.id, amount, date);
    router.replace(ROUTES.home);
  }

  const fieldClass =
    "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <p className="rounded-2xl border border-primary/20 bg-primary-soft/40 px-3.5 py-3 text-xs leading-relaxed text-foreground">
        سجّل المبلغ وحدّد المشروع. إذا وُجدت دفعات على المشروع يدخل قائمة انتظار
        الورشة تلقائياً — وإلا يبقى مقايسة فقط في الطلبات.
      </p>

      <label className="flex flex-col gap-1.5 text-right">
        <span className="text-sm font-medium">
          المشروع <span className="text-[#E85A8A]">*</span>
        </span>
        <select
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setError("");
          }}
          className={fieldClass}
        >
          <option value="">اختر مشروعاً…</option>
          {openProjects.map((project) => {
            const customer = customerById.get(project.customerId);
            return (
              <option key={project.id} value={project.id}>
                {customer?.name ?? "عميل"} — {project.name}
              </option>
            );
          })}
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
        className="mt-2 flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98]"
      >
        حفظ الدفعة
      </button>
    </form>
  );
}
