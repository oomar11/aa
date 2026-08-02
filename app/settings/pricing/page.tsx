import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { PricingForm } from "@/components/settings/PricingForm";
import { ROUTES } from "@/lib/routes";

export default function PricingSettingsPage() {
  return (
    <AppShell>
      <PageHeader
        backHref={ROUTES.settings}
        backLabel="الإعدادات"
        title="تسعير البيع"
        description="اختر نظام التسعير · هامش · مصنعية · سعر المتر للقطاع"
      />
      <div className="mt-4">
        <PricingForm />
      </div>
    </AppShell>
  );
}
