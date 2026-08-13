"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaymentForm } from "@/components/accounting/PaymentForm";
import { ROUTES } from "@/lib/routes";

function NewPaymentContent() {
  const searchParams = useSearchParams();
  const isEditing = Boolean(searchParams.get("payment"));

  return (
    <>
      <PageHeader
        backHref={
          isEditing ? ROUTES.accounting.payments : ROUTES.accounting.payments
        }
        backLabel="الدفعات"
        title={isEditing ? "تعديل دفعة" : "استلام دفعة"}
        description={
          isEditing
            ? "عدّل المبلغ أو التاريخ أو الخزنة"
            : "ابحث عن المشروع واختر الخزنة وسجّل المبلغ — يدخل قائمة انتظار الورشة تلقائياً"
        }
      />
      <div className="mt-4">
        <PaymentForm />
      </div>
    </>
  );
}

export default function NewPaymentPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted">
            جاري التحميل…
          </div>
        }
      >
        <NewPaymentContent />
      </Suspense>
    </AppShell>
  );
}
