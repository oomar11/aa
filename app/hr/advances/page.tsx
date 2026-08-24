import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { AdvancesBoard } from "@/components/hr/AdvancesBoard";
import { HrSectionNav } from "@/components/hr/HrSectionNav";
import { ROUTES } from "@/lib/routes";

export default function AdvancesPage() {
  return (
    <AppShell>
      <HrSectionNav />
      <PageHeader
        backHref={ROUTES.hr.hub}
        backLabel="الموظفين"
        title="السلف"
        description="مصروف أجور من الخزنة — بيتخصم من الراتب عند الصرف"
        hideBackOnDesktop
      />
      <div className="mt-4">
        <AdvancesBoard />
      </div>
    </AppShell>
  );
}
