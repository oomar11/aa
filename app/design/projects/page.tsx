import { AppBreadcrumb } from "@/components/AppBreadcrumb";
import { BottomNav } from "@/components/BottomNav";
import { ScreenBack } from "@/components/ScreenBack";
import { ProjectList } from "@/components/ProjectList";

type Props = {
  searchParams: Promise<{ customer?: string }>;
};

export default async function ProjectsPage({ searchParams }: Props) {
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
        <ScreenBack href="/orders">رجوع للطلبات</ScreenBack>
        <AppBreadcrumb
          className="mt-3"
          items={[
            { label: "الطلبات", href: "/orders" },
            { label: "مشاريع العميل" },
          ]}
        />
      </header>
      <main className="flex-1 px-4 pb-24">
        <ProjectList customerId={customerId} />
      </main>
      <BottomNav />
    </div>
  );
}
