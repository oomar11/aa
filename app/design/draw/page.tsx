import { ScreenBack } from "@/components/ScreenBack";
import { DrawingEditor } from "@/components/drawing/DrawingEditor";

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
              ? `/design/editor?customer=${params.customer}&project=${params.project}`
              : "/"
          }
        >
          {params.customer && params.project ? "الرجوع للمشروع" : "الرجوع للرئيسية"}
        </ScreenBack>
        <p className="text-center font-semibold text-foreground">بيانات الرسم غير مكتملة</p>
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

