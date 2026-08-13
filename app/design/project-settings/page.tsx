import { AppShell } from "@/components/layout/AppShell";
import { ProjectSettingsForm } from "@/components/design/ProjectSettingsForm";
import { ScreenBack } from "@/components/layout/ScreenBack";
import { ROUTES } from "@/lib/routes";

type Props = {
  searchParams: Promise<{ customer?: string; project?: string }>;
};

export default async function ProjectSettingsPage({ searchParams }: Props) {
  const params = await searchParams;

  if (!params.customer || !params.project) {
    return (
      <AppShell
        showHeader={false}
        mainClassName="flex flex-1 flex-col gap-3 px-6 py-6"
      >
        <ScreenBack href={ROUTES.orders}>العودة إلى الطلبات</ScreenBack>
        <p className="text-center font-semibold text-foreground">
          بيانات المشروع ناقصة
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell
      showHeader={false}
      mainClassName="flex flex-1 flex-col px-4 pb-20 pt-5"
    >
      <ScreenBack href={ROUTES.design.editor(params.customer, params.project)}>
        رجوع لبنود المشروع
      </ScreenBack>
      <div className="mt-3 lg:text-start">
        <h1 className="text-center text-xl font-bold text-foreground lg:text-start">
          إعدادات المشروع
        </h1>
        <p className="mt-1 text-center text-xs text-muted lg:text-start">
          عدّل اسم المشروع وعنوانه وحالته
        </p>
      </div>
      <div className="mt-4 w-full max-w-md lg:max-w-xl">
        <ProjectSettingsForm
          customerId={params.customer}
          projectId={params.project}
        />
      </div>
    </AppShell>
  );
}
