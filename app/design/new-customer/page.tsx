import { NewCustomerForm } from "@/components/customers/NewCustomerForm";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenBack } from "@/components/layout/ScreenBack";
import { ROUTES } from "@/lib/routes";

export default function NewCustomerPage() {
  return (
    <AppShell
      showHeader={false}
      fullHeight
      mainClassName="flex flex-1 flex-col px-4 pb-24 pt-5"
    >
      <ScreenBack href={ROUTES.design.hub}>رجوع</ScreenBack>
      <AppBreadcrumb
        className="mt-3"
        items={[
          { label: "الطلبات", href: ROUTES.orders },
          { label: "طلب جديد", href: ROUTES.design.hub },
          { label: "عميل جديد" },
        ]}
      />
      <div className="mt-3 text-center">
        <h1 className="text-xl font-bold text-foreground">عميل جديد</h1>
        <p className="mt-1 text-xs text-muted">
          سجّل بيانات العميل قبل إنشاء المشروع
        </p>
      </div>
      <div className="mt-4 flex-1">
        <NewCustomerForm />
      </div>
    </AppShell>
  );
}
