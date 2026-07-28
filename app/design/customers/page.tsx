import { CustomerList } from "@/components/CustomerList";
import { NavBack } from "@/components/NavBack";

export default function CustomersPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <header className="px-4 pt-5 pb-3 text-center">
        <p className="text-sm font-medium text-primary">UPVC Design</p>
        <h1 className="mt-2 text-xl font-bold text-foreground">قاعدة العملاء</h1>
        <p className="mt-1 text-xs text-muted">اختَر عميل عشان تشوف مشاريعه</p>
      </header>

      <main className="flex-1 px-4 pb-16">
        <CustomerList />

        <NavBack
          href="/design"
          className="mt-6 block text-center text-sm font-medium text-muted transition-colors hover:text-primary"
        >
          رجوع
        </NavBack>
      </main>
    </div>
  );
}
