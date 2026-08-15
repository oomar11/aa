import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { AdvancesBoard } from "@/components/hr/AdvancesBoard";
import { ROUTES } from "@/lib/routes";

export default function AdvancesPage() {
  return (
    <AppShell>
      <PageHeader
        backHref={ROUTES.hr.hub}
        backLabel="الموظفين"
        title="السلف"
        description="بتتخصم من الراتب عند الصرف"
      />
      <div className="mt-4">
        <AdvancesBoard />
      </div>
    </AppShell>
  );
}
