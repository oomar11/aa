import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { InvoicesBrowser } from "@/components/accounting/InvoicesBrowser";
import { ROUTES } from "@/lib/routes";

export default function InvoicesPage() {
  return (
    <AppShell>
      <PageHeader
        backHref={ROUTES.accounting.hub}
        backLabel="الحسابات"
        title="الفواتير"
        description="فواتير العملاء والمتبقي على كل فاتورة"
      />
      <div className="mt-4">
        <InvoicesBrowser />
      </div>
    </AppShell>
  );
}
