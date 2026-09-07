import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BonusesBoard } from "@/components/hr/BonusesBoard";
import { HrSectionNav } from "@/components/hr/HrSectionNav";
import { ROUTES } from "@/lib/routes";

export default function BonusesPage() {
  return (
    <AppShell>
      <HrSectionNav />
      <PageHeader
        backHref={ROUTES.hr.hub}
        backLabel="الموظفين"
        title="المكافآت"
        description="بتدخل المستحق التراكمي — المصروف عند صرف الراتب"
        hideBackOnDesktop
      />
      <div className="mt-4">
        <BonusesBoard />
      </div>
    </AppShell>
  );
}
