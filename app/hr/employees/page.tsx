import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmployeesBrowser } from "@/components/hr/EmployeesBrowser";
import { HrSectionNav } from "@/components/hr/HrSectionNav";
import { ROUTES } from "@/lib/routes";

export default function HrEmployeesPage() {
  return (
    <AppShell>
      <HrSectionNav />
      <PageHeader
        backHref={ROUTES.hr.hub}
        backLabel="الموظفين"
        title="قائمة الموظفين"
        description="الملف · الوظيفة · الأجر"
        hideBackOnDesktop
      />
      <div className="mt-4">
        <EmployeesBrowser />
      </div>
    </AppShell>
  );
}
