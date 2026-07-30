import { NewCustomerForm } from "@/components/customers/NewCustomerForm";
import { ScreenBack } from "@/components/layout/ScreenBack";

export default function NewCustomerPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <header className="px-4 pt-5 pb-3">
        <ScreenBack href="/design">رجوع</ScreenBack>
        <div className="mt-3 text-center">
          <p className="text-sm font-medium text-primary">UPVC Design</p>
          <h1 className="mt-2 text-xl font-bold text-foreground">عميل جديد</h1>
          <p className="mt-1 text-xs text-muted">سجّل بيانات العميل قبل بدء التصميم</p>
        </div>
      </header>

      <main className="flex-1 px-4 pb-16">
        <NewCustomerForm />
      </main>
    </div>
  );
}
