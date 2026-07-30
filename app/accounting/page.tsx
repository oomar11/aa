import { AppShell } from "@/components/layout/AppShell";
import { AccountingHub } from "@/components/accounting/AccountingHub";

export default function AccountingPage() {
  return (
    <AppShell mainClassName="flex-1 px-4 pb-20 pt-2">
      <AccountingHub />
    </AppShell>
  );
}
