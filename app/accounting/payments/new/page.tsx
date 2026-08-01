import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaymentForm } from "@/components/accounting/PaymentForm";
import { ROUTES } from "@/lib/routes";

export default function NewPaymentPage() {
  return (
    <AppShell>
      <PageHeader
        backHref={ROUTES.accounting.payments}
        backLabel="الدفعات"
        title="استلام دفعة"
        description="ابحث عن المشروع وسجّل المبلغ — يدخل قائمة انتظار الورشة تلقائياً"
      />
      <div className="mt-4">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted">
              جاري التحميل…
            </div>
          }
        >
          <PaymentForm />
        </Suspense>
      </div>
    </AppShell>
  );
}
