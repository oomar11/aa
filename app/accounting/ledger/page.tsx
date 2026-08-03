import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { MoneyLedger } from "@/components/accounting/MoneyLedger";
import { ROUTES } from "@/lib/routes";

export default function MoneyLedgerPage() {
  return (
    <AppShell>
      <PageHeader
        backHref={ROUTES.accounting.hub}
        backLabel="الحسابات"
        title="سجل الحركة"
        description="دخول وخروج الفلوس — تحصيل ومصروف"
      />
      <div className="mt-4">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted">
              جاري التحميل…
            </div>
          }
        >
          <MoneyLedger />
        </Suspense>
      </div>
    </AppShell>
  );
}
