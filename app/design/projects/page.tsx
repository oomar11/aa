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
        <ScreenBack href="/design/customers">رجوع لاختيار عميل</ScreenBack>
        <p className="text-center font-semibold text-foreground">مفيش عميل محدد</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <header className="px-4 pt-5 pb-3">
        <ScreenBack href="/design/customers">رجوع للعملاء</ScreenBack>
        <div className="mt-3 text-center">
          <p className="text-sm font-medium text-primary">UPVC Design</p>
        </div>
      </header>
      <main className="flex-1 px-4 pb-16">
        <ProjectList customerId={customerId} />
      </main>
    </div>
  );
}
