import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { OrdersBrowser } from "@/components/OrdersBrowser";
import Link from "next/link";

export default function OrdersPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-20 pt-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground">الطلبات</h1>
            <p className="mt-0.5 text-xs text-muted">
              كل العملاء والمشاريع من مكان واحد
            </p>
          </div>
          <Link
            href="/design"
            className="shrink-0 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            طلب جديد
          </Link>
        </div>
        <OrdersBrowser />
      </main>
      <BottomNav />
    </div>
  );
}
