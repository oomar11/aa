import Link from "next/link";
import { DesignWorkspace } from "@/components/design/DesignWorkspace";
import { ROUTES } from "@/lib/routes";

type Props = {
  searchParams: Promise<{
    customer?: string;
    project?: string;
    tab?: string;
  }>;
};

export default async function EditorPage({ searchParams }: Props) {
  const params = await searchParams;
  const tab =
    params.tab === "account" || params.tab === "expenses"
      ? params.tab
      : "items";

  if (!params.customer) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-3 bg-background px-6 text-center lg:max-w-5xl">
        <p className="font-semibold text-foreground">اختر عميلاً أولاً</p>
        <Link href={ROUTES.orders} className="text-sm text-primary">
          فتح الطلبات
        </Link>
      </div>
    );
  }

  if (!params.project) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-3 bg-background px-6 text-center lg:max-w-5xl">
        <p className="font-semibold text-foreground">اختر مشروعاً أولاً</p>
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
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-background lg:max-w-5xl">
      <main className="flex-1 px-3 pb-6 pt-3">
        <DesignWorkspace
          customerId={params.customer}
          projectId={params.project}
          initialTab={tab}
        />
      </main>
    </div>
  );
}
