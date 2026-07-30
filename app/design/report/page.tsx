import Link from "next/link";
import { ProjectReport } from "@/components/design/ProjectReport";
import { ROUTES } from "@/lib/routes";

type Props = {
  searchParams: Promise<{ customer?: string; project?: string }>;
};

export default async function ProjectReportPage({ searchParams }: Props) {
  const params = await searchParams;

  if (!params.customer) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="font-semibold text-foreground">اختَر عميل أولاً</p>
        <Link href={ROUTES.orders} className="text-sm text-primary">
          فتح الطلبات
        </Link>
      </div>
    );
  }

  if (!params.project) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="font-semibold text-foreground">اختَر مشروع أولاً</p>
        <Link
          href={ROUTES.design.projects(params.customer)}
          className="text-sm text-primary"
        >
          مشاريع العميل
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#f4f6f9] print:bg-white">
      <main className="pb-8 pt-0 print:pb-0">
        <ProjectReport
          customerId={params.customer}
          projectId={params.project}
        />
      </main>
    </div>
  );
}
