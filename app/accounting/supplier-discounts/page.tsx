import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SupplierDiscountsBrowser } from "@/components/accounting/SupplierDiscountsBrowser";
import { ROUTES } from "@/lib/routes";

export default function SupplierDiscountsPage() {
  return (
    <AppShell>
      <PageHeader
        backHref={ROUTES.accounting.hub}
        backLabel="الحسابات"
        title="خصومات الموردين"
        description="خصم مكتسب على حساب مورد — بيقلّل اللي عليك وبيتحسب من المكاسب"
      />
      <div className="mt-4">
        <SupplierDiscountsBrowser />
      </div>
    </AppShell>
  );
}
