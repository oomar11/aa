import Link from "next/link";
import { AppBreadcrumb } from "@/components/AppBreadcrumb";
import { BottomNav } from "@/components/BottomNav";
import { ScreenBack } from "@/components/ScreenBack";

export default function DesignPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <header className="px-4 pt-5 pb-2">
        <ScreenBack href="/orders">رجوع للطلبات</ScreenBack>
        <AppBreadcrumb
          className="mt-3"
          items={[
            { label: "الطلبات", href: "/orders" },
            { label: "طلب جديد" },
          ]}
        />
        <h1 className="mt-3 text-center text-2xl font-bold text-foreground">
          طلب جديد
        </h1>
        <p className="mt-1 text-center text-sm text-muted">
          اختَر عميل جديد أو عميل موجود عشان تبدأ المشروع
        </p>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 pb-24 pt-8">
        <div className="flex w-full max-w-sm flex-col gap-3">
          <Link
            href="/design/new-customer"
            className="flex h-16 items-center justify-center rounded-2xl bg-[#4BA3F5] text-lg font-semibold text-white shadow-[0_6px_20px_rgba(75,163,245,0.35)] transition-all duration-300 hover:brightness-105 active:scale-[0.98]"
          >
            عميل جديد
          </Link>
          <Link
            href="/design/customers"
            className="flex h-16 items-center justify-center rounded-2xl bg-[#E85A8A] text-lg font-semibold text-white shadow-[0_6px_20px_rgba(232,90,138,0.35)] transition-all duration-300 hover:brightness-105 active:scale-[0.98]"
          >
            عميل موجود
          </Link>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
