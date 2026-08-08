import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExternalSupplyForm } from "@/components/accounting/ExternalSupplyForm";
import { ROUTES } from "@/lib/routes";

export default function NewExternalSupplyPage() {
  return (
    <AppShell>
      <PageHeader
        backHref={ROUTES.accounting.hub}
        backLabel="الحسابات"
        title="توريد خارجي"
        description="أي خامات من برّا تتسجل على مورد في المحل عشان تحاسبه"
      />
      <div className="mt-4">
        <ExternalSupplyForm />
      </div>
    </AppShell>
  );
}
