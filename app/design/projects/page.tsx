import { ProjectList } from "@/components/customers/ProjectList";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenBack } from "@/components/layout/ScreenBack";
import { ROUTES } from "@/lib/routes";

type Props = {
  searchParams: Promise<{ customer?: string }>;
};

export default async function ProjectsPage({ searchParams }: Props) {
  const params = await searchParams;
  const customerId = params.customer;

  if (!customerId) {
    return (
      <AppShell
        showHeader={false}
        fullHeight
        mainClassName="flex flex-1 flex-col gap-3 px-6 py-6"
      >
        <ScreenBack href={ROUTES.orders}>العودة إلى الطلبات</ScreenBack>
        <p className="text-center font-semibold text-foreground">لم يُحدد عميل</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      showHeader={false}
      fullHeight
      mainClassName="flex flex-1 flex-col px-4 pb-24 pt-5"
    >
      <ScreenBack href={ROUTES.orders}>العودة إلى الطلبات</ScreenBack>
      <AppBreadcrumb
        className="mt-3"
        items={[
          { label: "الطلبات", href: ROUTES.orders },
          { label: "مشاريع العميل" },
        ]}
      />
      <div className="mt-4 flex-1">
        <ProjectList customerId={customerId} />
      </div>
    </AppShell>
  );
}
