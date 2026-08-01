import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { OrdersBrowser } from "@/components/orders/OrdersBrowser";
import { ROUTES } from "@/lib/routes";

export default function OrdersPage() {
  return (
    <AppShell mainClassName="flex flex-1 flex-col gap-3 px-4 pb-20 pt-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground">الطلبات</h1>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            العملاء والمقايسات وأحدث المشاريع. بعد تسجيل دفعة يدخل المشروع
            الورشة.
          </p>
        </div>
        <Link
          href={ROUTES.design.hub}
          className="shrink-0 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          طلب جديد
        </Link>
      </div>
      <OrdersBrowser />
    </AppShell>
  );
}
