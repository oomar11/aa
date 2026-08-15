import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { AttendanceBoard } from "@/components/hr/AttendanceBoard";
import { ROUTES } from "@/lib/routes";

export default function AttendancePage() {
  return (
    <AppShell>
      <PageHeader
        backHref={ROUTES.hr.hub}
        backLabel="الموظفين"
        title="الحضور"
        description="سجّل حاضر أو غايب لكل عامل"
      />
      <div className="mt-4">
        <AttendanceBoard />
      </div>
    </AppShell>
  );
}
