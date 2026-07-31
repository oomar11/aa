import { AppShell } from "@/components/layout/AppShell";
import { WorkshopBoard } from "@/components/workshop/WorkshopBoard";

export default function WorkshopPage() {
  return (
    <AppShell mainClassName="flex flex-1 flex-col gap-3 px-4 pb-20 pt-1">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-foreground">الورشة</h1>
        <p className="mt-0.5 text-xs text-muted">
          الشغل الحالي + طابور المشاريع اللي استلمنا عليها عربون
        </p>
      </div>
      <WorkshopBoard />
    </AppShell>
  );
}
