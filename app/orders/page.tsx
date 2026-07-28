import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { OrdersBrowser } from "@/components/OrdersBrowser";

export default function OrdersPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-20 pt-1">
        <div>
          <h1 className="text-xl font-bold text-foreground">الطلبات</h1>
          <p className="mt-0.5 text-xs text-muted">
            العملاء والمشاريع المرتبطة بهم
          </p>
        </div>
        <OrdersBrowser />
      </main>
      <BottomNav />
    </div>
  );
}
