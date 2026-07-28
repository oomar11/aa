import Link from "next/link";
import { ProjectSettingsForm } from "@/components/ProjectSettingsForm";

type Props = {
  searchParams: Promise<{ customer?: string; project?: string }>;
};

export default async function ProjectSettingsPage({ searchParams }: Props) {
  const params = await searchParams;

  if (!params.customer || !params.project) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="font-semibold text-foreground">بيانات المشروع ناقصة</p>
        <Link href="/design/customers" className="text-sm text-primary">
          رجوع
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <header className="px-4 pt-5 pb-3 text-center">
        <p className="text-sm font-medium text-primary">UPVC Design</p>
        <h1 className="mt-2 text-xl font-bold text-foreground">
          إعدادات المشروع
        </h1>
        <p className="mt-1 text-xs text-muted">عدّل اسم المشروع وعنوانه وحالته</p>
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
