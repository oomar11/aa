import Link from "next/link";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenBack } from "@/components/layout/ScreenBack";
import { ROUTES } from "@/lib/routes";

export default function DesignPage() {
  return (
    <AppShell
      showHeader={false}
      fullHeight
      mainClassName="flex flex-1 flex-col px-4 pb-24 pt-5"
    >
      <ScreenBack href={ROUTES.orders}>العودة إلى الطلبات</ScreenBack>
      <AppBreadcrumb
        className="mt-3"
        items={[
          { label: "الطلبات", href: ROUTES.orders },
          { label: "طلب جديد" },
        ]}
      />
      <div className="mt-6 flex flex-1 flex-col items-center">
        <h1 className="text-center text-2xl font-bold text-foreground">
          طلب جديد
        </h1>
        <p className="mt-1 text-center text-sm text-muted">
          اختر عميلاً جديداً أو عميلاً موجوداً لبدء المقايسة. بعد التسجيل تُدار
          المشاريع من باب الطلبات.
        </p>

        <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
          <Link
            href={ROUTES.design.newCustomer}
            className="flex h-16 items-center justify-center rounded-2xl bg-[#4BA3F5] text-lg font-semibold text-white shadow-[0_6px_20px_rgba(75,163,245,0.35)] transition-all duration-300 hover:brightness-105 active:scale-[0.98]"
          >
            عميل جديد
          </Link>
          <Link
            href={ROUTES.design.customers}
            className="flex h-16 items-center justify-center rounded-2xl bg-[#E85A8A] text-lg font-semibold text-white shadow-[0_6px_20px_rgba(232,90,138,0.35)] transition-all duration-300 hover:brightness-105 active:scale-[0.98]"
          >
            عميل موجود
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
