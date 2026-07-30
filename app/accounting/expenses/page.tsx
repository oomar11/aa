import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExpensesBrowser } from "@/components/accounting/ExpensesBrowser";
import { ROUTES } from "@/lib/routes";

export default function ExpensesPage() {
  return (
    <AppShell>
      <PageHeader
        backHref={ROUTES.accounting.hub}
        backLabel="الحسابات"
        title="المصروفات"
        description="مصروفات الشركة (خامات، نقل، إيجار…)"
      />
      <div className="mt-4">
        <ExpensesBrowser />
      </div>
    </AppShell>
  );
}
