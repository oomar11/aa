import { ProjectList } from "@/components/ProjectList";

type Props = {
  searchParams: Promise<{ customer?: string }>;
};

export default async function ProjectsPage({ searchParams }: Props) {
  const params = await searchParams;
  const customerId = params.customer;

  if (!customerId) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-foreground font-semibold">مفيش عميل محدد</p>
        <a href="/design/customers" className="text-sm text-primary">
          رجوع لاختيار عميل
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <header className="px-4 pt-5 pb-2 text-center">
        <p className="text-sm font-medium text-primary">UPVC Design</p>
      </header>
      <main className="flex-1 px-4 pb-16">
        <ProjectList customerId={customerId} />
      </main>
    </div>
  );
}
