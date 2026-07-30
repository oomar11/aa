import { CustomerList } from "@/components/customers/CustomerList";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenBack } from "@/components/layout/ScreenBack";
import { ROUTES } from "@/lib/routes";

export default function CustomersPage() {
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
          { label: "عميل موجود" },
        ]}
      />
      <div className="mt-3 text-center">
        <h1 className="text-xl font-bold text-foreground">عميل موجود</h1>
        <p className="mt-1 text-xs text-muted">
          اختَر عميل عشان تشوف مشاريعه أو تضيف مشروع جديد
        </p>
      </div>
      <div className="mt-4 flex-1">
        <CustomerList />
      </div>
    </AppShell>
  );
}
