import { AppShell } from "@/components/layout/AppShell";
import { ScreenBack } from "@/components/layout/ScreenBack";
import { DrawingEditor } from "@/components/drawing/DrawingEditor";
import { ROUTES } from "@/lib/routes";

type Props = {
  searchParams: Promise<{
    customer?: string;
    project?: string;
    item?: string;
  }>;
};

export default async function DrawPage({ searchParams }: Props) {
  const params = await searchParams;

  if (!params.customer || !params.project || !params.item) {
    return (
      <AppShell
        showHeader={false}
        showBottomNav={false}
        showSidebar
        mainClassName="flex flex-1 flex-col gap-3 px-6 py-6"
      >
        <ScreenBack
          href={
            params.customer && params.project
              ? ROUTES.design.editor(params.customer, params.project)
              : ROUTES.orders
          }
        >
          {params.customer && params.project
            ? "الرجوع لبنود المشروع"
            : "العودة إلى الطلبات"}
        </ScreenBack>
        <p className="text-center font-semibold text-foreground">
          بيانات الرسم غير مكتملة
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell
      showHeader={false}
      showBottomNav={false}
      showSidebar
      fullHeight
      mainClassName="flex flex-1 flex-col px-0 pb-0 pt-0 lg:px-0 lg:pb-0"
    >
      <DrawingEditor
        customerId={params.customer}
        projectId={params.project}
        itemId={params.item}
      />
    </AppShell>
  );
}
