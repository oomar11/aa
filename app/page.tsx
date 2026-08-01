import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { WorkshopBoard } from "@/components/workshop/WorkshopBoard";
import { ROUTES } from "@/lib/routes";

/** الصفحة الأولى = يوم الورشة (مش لوحة مكررة) */
export default function HomePage() {
  return (
    <AppShell mainClassName="flex flex-1 flex-col gap-3 px-4 pb-20 pt-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground">الورشة</h1>
          <p className="mt-0.5 text-xs text-muted">
            الشغل الحالي والطابور — المقايسات من الطلبات
          </p>
        </div>
        <Link
          href={ROUTES.design.hub}
          className="shrink-0 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          طلب جديد
        </Link>
      </div>
      <WorkshopBoard />
    </AppShell>
  );
}
