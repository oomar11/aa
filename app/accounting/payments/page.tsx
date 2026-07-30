import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaymentsBrowser } from "@/components/accounting/PaymentsBrowser";
import { ROUTES } from "@/lib/routes";

export default function PaymentsPage() {
  return (
    <AppShell>
      <PageHeader
        backHref={ROUTES.accounting.hub}
        backLabel="الحسابات"
        title="التحصيل"
        description="دفعات العملاء الواردة"
      />
      <div className="mt-4">
        <PaymentsBrowser />
      </div>
    </AppShell>
  );
}
