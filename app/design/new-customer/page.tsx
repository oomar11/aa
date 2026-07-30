import { NewCustomerForm } from "@/components/NewCustomerForm";
import { AppBreadcrumb } from "@/components/AppBreadcrumb";
import { BottomNav } from "@/components/BottomNav";
import { ScreenBack } from "@/components/ScreenBack";

export default function NewCustomerPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <header className="px-4 pt-5 pb-3">
        <ScreenBack href="/design">رجوع</ScreenBack>
        <AppBreadcrumb
          className="mt-3"
          items={[
            { label: "الطلبات", href: "/orders" },
            { label: "طلب جديد", href: "/design" },
            { label: "عميل جديد" },
          ]}
        />
        <div className="mt-3 text-center">
          <h1 className="text-xl font-bold text-foreground">عميل جديد</h1>
          <p className="mt-1 text-xs text-muted">
            سجّل بيانات العميل قبل إنشاء المشروع
          </p>
        </div>
      </header>

      <main className="flex-1 px-4 pb-24">
        <NewCustomerForm />
      </main>
      <BottomNav />
    </div>
  );
}
