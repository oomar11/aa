import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { OrdersBrowser } from "@/components/orders/OrdersBrowser";

export default function OrdersPage() {
  return (
    <AppShell mainClassName="flex flex-1 flex-col gap-3 px-4 pb-20 pt-1">
      <PageHeader
        title="الطلبات"
        description="العملاء والمشاريع المرتبطة بهم"
      />
      <OrdersBrowser />
    </AppShell>
  );
}
