import Link from "next/link";
import { NewProjectForm } from "@/components/NewProjectForm";

type Props = {
  searchParams: Promise<{ customer?: string }>;
};

export default async function NewProjectPage({ searchParams }: Props) {
  const params = await searchParams;
  const customerId = params.customer;

  if (!customerId) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="font-semibold text-foreground">مفيش عميل محدد</p>
        <Link href="/design/customers" className="text-sm text-primary">
          رجوع لاختيار عميل
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <header className="px-4 pt-5 pb-3 text-center">
        <p className="text-sm font-medium text-primary">UPVC Design</p>
        <h1 className="mt-2 text-xl font-bold text-foreground">مشروع جديد</h1>
        <p className="mt-1 text-xs text-muted">اكتب اسم المشروع وعنوانه</p>
      </header>

      <main className="flex-1 px-4 pb-16">
        <NewProjectForm customerId={customerId} />
      </main>
    </div>
  );
}
