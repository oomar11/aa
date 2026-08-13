import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
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
      <AppShell
        showHeader={false}
        mainClassName="flex flex-1 flex-col items-center justify-center gap-3 px-6 pb-20 pt-6 text-center"
      >
        <p className="font-semibold text-foreground">اختر عميلاً أولاً</p>
        <Link href={ROUTES.orders} className="text-sm text-primary">
          فتح الطلبات
        </Link>
      </AppShell>
    );
  }

  if (!params.project) {
    return (
      <AppShell
        showHeader={false}
        mainClassName="flex flex-1 flex-col items-center justify-center gap-3 px-6 pb-20 pt-6 text-center"
      >
        <p className="font-semibold text-foreground">اختر مشروعاً أولاً</p>
        <Link
          href={ROUTES.design.projects(params.customer)}
          className="text-sm text-primary"
        >
          مشاريع العميل
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell
      showHeader={false}
      fullHeight
      mainClassName="flex flex-1 flex-col px-3 pb-20 pt-3"
    >
      <DesignWorkspace
        customerId={params.customer}
        projectId={params.project}
        initialTab={tab}
      />
    </AppShell>
  );
}
