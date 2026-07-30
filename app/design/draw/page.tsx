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
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 bg-background px-6 py-6">
        <ScreenBack
          href={
            params.customer && params.project
              ? ROUTES.design.editor(params.customer, params.project)
              : ROUTES.orders
          }
        >
          {params.customer && params.project
            ? "الرجوع لبنود المشروع"
            : "الرجوع للطلبات"}
        </ScreenBack>
        <p className="text-center font-semibold text-foreground">
          بيانات الرسم غير مكتملة
        </p>
      </div>
    );
  }

  return (
    <DrawingEditor
      customerId={params.customer}
      projectId={params.project}
      itemId={params.item}
    />
  );
}
