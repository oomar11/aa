import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmployeesBrowser } from "@/components/hr/EmployeesBrowser";
import { ROUTES } from "@/lib/routes";

export default function HrEmployeesPage() {
  return (
    <AppShell>
      <PageHeader
        backHref={ROUTES.hr.hub}
        backLabel="الموظفين"
        title="قائمة الموظفين"
        description="الملف · الوظيفة · الأجر"
      />
      <div className="mt-4">
        <EmployeesBrowser />
      </div>
    </AppShell>
  );
}
