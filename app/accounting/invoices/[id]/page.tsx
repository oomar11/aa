import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { InvoiceDetail } from "@/components/accounting/InvoiceDetail";
import { ROUTES } from "@/lib/routes";

export default function InvoiceDetailPage() {
  return (
    <AppShell>
      <PageHeader
        backHref={ROUTES.accounting.invoices}
        backLabel="الفواتير"
        title="تفاصيل الفاتورة"
      />
      <div className="mt-4">
        <InvoiceDetail />
      </div>
    </AppShell>
  );
}
