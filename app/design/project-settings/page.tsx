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
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 bg-background px-6 py-6">
        <ScreenBack href={ROUTES.orders}>العودة إلى الطلبات</ScreenBack>
        <p className="text-center font-semibold text-foreground">
          بيانات المشروع ناقصة
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <header className="px-4 pt-5 pb-3">
        <ScreenBack
          href={ROUTES.design.editor(params.customer, params.project)}
        >
          رجوع لبنود المشروع
        </ScreenBack>
        <div className="mt-3 text-center">
          <h1 className="text-xl font-bold text-foreground">إعدادات المشروع</h1>
          <p className="mt-1 text-xs text-muted">
            عدّل اسم المشروع وعنوانه وحالته
          </p>
        </div>
      </header>

      <main className="flex-1 px-4 pb-16">
        <ProjectSettingsForm
          customerId={params.customer}
          projectId={params.project}
        />
      </main>
    </div>
  );
}
