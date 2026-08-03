import { AppShell } from "@/components/layout/AppShell";
import { HomeDashboard } from "@/components/home/HomeDashboard";

/** الصفحة الأولى: ملخص اليوم والاختصارات */
export default function HomePage() {
  return (
    <AppShell mainClassName="flex flex-1 flex-col gap-3 px-4 pb-20 pt-1">
      <h1 className="text-xl font-bold text-foreground">الرئيسية</h1>
      <HomeDashboard />
    </AppShell>
  );
}
