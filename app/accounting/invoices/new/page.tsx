import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { InvoiceForm } from "@/components/accounting/InvoiceForm";
import { ROUTES } from "@/lib/routes";

export default function NewInvoicePage() {
  return (
    <AppShell>
      <PageHeader
        backHref={ROUTES.accounting.invoices}
        backLabel="الفواتير"
        title="فاتورة جديدة"
        description="سجّل مبلغ على عميل أو مشروع"
      />
      <div className="mt-4">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted">
              جاري التحميل…
            </div>
          }
        >
          <InvoiceForm />
        </Suspense>
      </div>
    </AppShell>
  );
}
