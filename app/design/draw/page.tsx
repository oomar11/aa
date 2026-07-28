import Link from "next/link";
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
        <Link href="/design/customers" className="text-sm text-primary">
          الرجوع للعملاء
        </Link>
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
