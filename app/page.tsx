import { AppShell } from "@/components/layout/AppShell";
import { HomeActions } from "@/components/home/HomeActions";

export default function HomePage() {
  return (
    <AppShell mainClassName="flex-1 pb-20">
      <HomeActions />
    </AppShell>
  );
}
