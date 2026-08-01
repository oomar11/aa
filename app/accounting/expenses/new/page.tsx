import { Suspense } from "react";
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
        title="مصروف مشروع"
        description="اختر المشروع وسجّل المبلغ والوصف — بدون حساب المشروع"
      />
      <div className="mt-4">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted">
              جاري التحميل…
            </div>
          }
        >
          <ExpenseForm />
        </Suspense>
      </div>
    </AppShell>
  );
}
