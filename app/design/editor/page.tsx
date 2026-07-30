import Link from "next/link";
import { DesignWorkspace } from "@/components/DesignWorkspace";

type Props = {
  searchParams: Promise<{ customer?: string; project?: string }>;
};

export default async function EditorPage({ searchParams }: Props) {
  const params = await searchParams;

  if (!params.customer) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="font-semibold text-foreground">اختَر عميل أولاً</p>
        <Link href="/orders" className="text-sm text-primary">
          فتح الطلبات
        </Link>
      </div>
    );
  }

  if (!params.project) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="font-semibold text-foreground">اختَر مشروع أولاً</p>
        <Link
          href={`/design/projects?customer=${params.customer}`}
          className="text-sm text-primary"
        >
          مشاريع العميل
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <main className="flex-1 px-3 pb-6 pt-3">
        <DesignWorkspace
          customerId={params.customer}
          projectId={params.project}
        />
      </main>
    </div>
  );
}
