import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { PayrollBoard } from "@/components/hr/PayrollBoard";
import { ROUTES } from "@/lib/routes";

export default function PayrollPage() {
  return (
    <AppShell>
      <PageHeader
        backHref={ROUTES.hr.hub}
        backLabel="الموظفين"
        title="صرف الرواتب"
        description="يومية أو شهري — مصروف أجور في الحسابات"
      />
      <div className="mt-4">
        <PayrollBoard />
      </div>
    </AppShell>
  );
}
