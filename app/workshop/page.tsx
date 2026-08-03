import { AppShell } from "@/components/layout/AppShell";
import { WorkshopBoard } from "@/components/workshop/WorkshopBoard";

/** العمل اليومي في الورشة */
export default function WorkshopPage() {
  return (
    <AppShell mainClassName="flex flex-1 flex-col gap-3 px-4 pb-20 pt-1">
      <h1 className="text-xl font-bold text-foreground">الورشة</h1>
      <WorkshopBoard />
    </AppShell>
  );
}
