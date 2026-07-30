import { AppShell } from "@/components/layout/AppShell";
import { HomeDashboard } from "@/components/home/HomeDashboard";

export default function HomePage() {
  return (
    <AppShell mainClassName="flex-1 pb-20">
      <HomeDashboard />
    </AppShell>
  );
}
