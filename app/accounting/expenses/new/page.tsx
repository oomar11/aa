import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExpenseForm } from "@/components/accounting/ExpenseForm";
import { ROUTES } from "@/lib/routes";

export default function NewExpensePage() {
  return (
    <AppShell>
      <PageHeader
        backHref={ROUTES.accounting.expenses}
        backLabel="المصروفات"
        title="مصروف جديد"
      />
      <div className="mt-4">
        <ExpenseForm />
      </div>
    </AppShell>
  );
}
