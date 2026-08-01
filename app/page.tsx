import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { WorkshopBoard } from "@/components/workshop/WorkshopBoard";
import { ROUTES } from "@/lib/routes";

/** الصفحة الأولى: العمل اليومي في الورشة */
export default function HomePage() {
  return (
    <AppShell mainClassName="flex flex-1 flex-col gap-3 px-4 pb-20 pt-1">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-foreground">الورشة</h1>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          هنا الشغل اليوم: قيد التنفيذ وقائمة الانتظار. الطلب الجديد من باب
          الطلبات.
        </p>
      </div>
      <WorkshopBoard />
      <Link
        href={ROUTES.orders}
        className="rounded-2xl border border-dashed border-border bg-card px-4 py-3 text-center text-sm font-semibold text-primary"
      >
        الذهاب إلى الطلبات ←
      </Link>
    </AppShell>
  );
}
