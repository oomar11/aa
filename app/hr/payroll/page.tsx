import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { PayrollBoard } from "@/components/hr/PayrollBoard";
import { HrSectionNav } from "@/components/hr/HrSectionNav";
import { ROUTES } from "@/lib/routes";

export default function PayrollPage() {
  return (
    <AppShell>
      <HrSectionNav />
      <PageHeader
        backHref={ROUTES.hr.hub}
        backLabel="الموظفين"
        title="صرف الرواتب"
        description="رصيد تراكمي — يومية ونسبة ومكافأة وبدون ثابت"
        hideBackOnDesktop
      />
      <div className="mt-4">
        <PayrollBoard />
      </div>
    </AppShell>
  );
}
