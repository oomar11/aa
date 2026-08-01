import { Suspense } from "react";
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
        title="سجل المصروفات"
        description="عرض مصروفات المشاريع — التسجيل من داخل كل مشروع"
      />
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
