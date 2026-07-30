import { NewProjectForm } from "@/components/customers/NewProjectForm";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenBack } from "@/components/layout/ScreenBack";
import { ROUTES } from "@/lib/routes";

type Props = {
  searchParams: Promise<{ customer?: string }>;
};

export default async function NewProjectPage({ searchParams }: Props) {
  const params = await searchParams;
  const customerId = params.customer;

  if (!customerId) {
    return (
      <AppShell
        showHeader={false}
        fullHeight
        mainClassName="flex flex-1 flex-col gap-3 px-6 py-6"
      >
        <ScreenBack href={ROUTES.orders}>رجوع للطلبات</ScreenBack>
        <p className="text-center font-semibold text-foreground">مفيش عميل محدد</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      showHeader={false}
      fullHeight
      mainClassName="flex flex-1 flex-col px-4 pb-24 pt-5"
    >
      <ScreenBack href={ROUTES.design.projects(customerId)}>
        رجوع للمشاريع
      </ScreenBack>
      <AppBreadcrumb
        className="mt-3"
        items={[
          { label: "الطلبات", href: ROUTES.orders },
          {
            label: "مشاريع العميل",
            href: ROUTES.design.projects(customerId),
          },
          { label: "مشروع جديد" },
        ]}
      />
      <div className="mt-3 text-center">
        <h1 className="text-xl font-bold text-foreground">مشروع جديد</h1>
        <p className="mt-1 text-xs text-muted">اكتب اسم المشروع وعنوانه</p>
      </div>
      <div className="mt-4 flex-1">
        <NewProjectForm customerId={customerId} />
      </div>
    </AppShell>
  );
}
