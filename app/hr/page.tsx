import { AppShell } from "@/components/layout/AppShell";
import { HrHub } from "@/components/hr/HrHub";

export default function HrPage() {
  return (
    <AppShell mainClassName="flex-1 px-4 pb-20 pt-2">
      <HrHub />
    </AppShell>
  );
}
