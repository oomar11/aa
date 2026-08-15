import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { AttendanceBoard } from "@/components/hr/AttendanceBoard";
import { HrSectionNav } from "@/components/hr/HrSectionNav";
import { ROUTES } from "@/lib/routes";

export default function AttendancePage() {
  return (
    <AppShell>
      <HrSectionNav />
      <PageHeader
        backHref={ROUTES.hr.hub}
        backLabel="الموظفين"
        title="الحضور"
        description="سجّل حاضر أو غايب لكل عامل"
        hideBackOnDesktop
      />
      <div className="mt-4">
        <AttendanceBoard />
      </div>
    </AppShell>
  );
}
