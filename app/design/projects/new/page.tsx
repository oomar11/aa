import { AppBreadcrumb } from "@/components/AppBreadcrumb";
import { BottomNav } from "@/components/BottomNav";
import { ScreenBack } from "@/components/ScreenBack";
import { NewProjectForm } from "@/components/NewProjectForm";

type Props = {
  searchParams: Promise<{ customer?: string }>;
};

export default async function NewProjectPage({ searchParams }: Props) {
  const params = await searchParams;
  const customerId = params.customer;

  if (!customerId) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 bg-background px-6 py-6">
        <ScreenBack href="/orders">رجوع للطلبات</ScreenBack>
        <p className="text-center font-semibold text-foreground">مفيش عميل محدد</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <header className="px-4 pt-5 pb-3">
        <ScreenBack href={`/design/projects?customer=${customerId}`}>
          رجوع للمشاريع
        </ScreenBack>
        <AppBreadcrumb
          className="mt-3"
          items={[
            { label: "الطلبات", href: "/orders" },
            {
              label: "مشاريع العميل",
              href: `/design/projects?customer=${customerId}`,
            },
            { label: "مشروع جديد" },
          ]}
        />
        <div className="mt-3 text-center">
          <h1 className="text-xl font-bold text-foreground">مشروع جديد</h1>
          <p className="mt-1 text-xs text-muted">اكتب اسم المشروع وعنوانه</p>
        </div>
      </header>

      <main className="flex-1 px-4 pb-24">
        <NewProjectForm customerId={customerId} />
      </main>
      <BottomNav />
    </div>
  );
}
