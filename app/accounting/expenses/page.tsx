import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ExpensesBrowser } from "@/components/accounting/ExpensesBrowser";
import { ExpensesPageHeader } from "@/components/accounting/ExpensesPageHeader";

export default function ExpensesPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted">
            جاري التحميل…
          </div>
        }
      >
        <ExpensesPageHeader />
      </Suspense>
      <div className="mt-4">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted">
              جاري التحميل…
            </div>
          }
        >
          <ExpensesBrowser />
        </Suspense>
      </div>
    </AppShell>
  );
}
