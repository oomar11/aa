import Link from "next/link";
import { NavBack } from "@/components/NavBack";
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
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="font-semibold text-foreground">بيانات الرسم غير مكتملة</p>
        {params.customer && params.project ? (
          <NavBack
            href={`/design/editor?customer=${params.customer}&project=${params.project}`}
            className="text-sm text-primary"
          >
            الرجوع للمشروع
          </NavBack>
        ) : (
          <Link href="/" className="text-sm text-primary">
            الرجوع للرئيسية
          </Link>
        )}
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

