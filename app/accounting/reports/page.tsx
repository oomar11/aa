import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfitReport } from "@/components/accounting/ProfitReport";
import { ROUTES } from "@/lib/routes";

export default function AccountingReportsPage() {
  return (
    <AppShell>
      <PageHeader
        backHref={ROUTES.accounting.hub}
        backLabel="الحسابات"
        title="تقارير الربح"
        description="من الشغل اللي خلص واتسلّم — حسب تاريخ التسليم"
        className="px-1 print:hidden"
      />
      <div className="mt-4">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted">
              جاري التحميل…
            </div>
          }
        >
          <ProfitReport />
        </Suspense>
      </div>
    </AppShell>
  );
}
