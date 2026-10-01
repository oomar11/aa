import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenBack } from "@/components/layout/ScreenBack";
import { EmployeeDetail } from "@/components/hr/EmployeeDetail";
import { ROUTES } from "@/lib/routes";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EmployeeDetailPage({ params }: Props) {
  const { id } = await params;
  if (!id?.trim()) notFound();

  return (
    <AppShell>
      <ScreenBack href={ROUTES.hr.hub} className="mb-2">
        الموظفين
      </ScreenBack>
      <EmployeeDetail employeeId={id} />
    </AppShell>
  );
}
