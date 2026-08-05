import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActivityBrowser } from "@/components/accounting/ActivityBrowser";
import { ROUTES } from "@/lib/routes";

export default function ActivityPage() {
  return (
    <AppShell>
      <PageHeader
        backHref={ROUTES.accounting.hub}
        backLabel="الحسابات"
        title="المتابعات"
        description="دا قال إيه · دا عمل إيه · وعود الدفع"
      />
      <div className="mt-4">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted">
              جاري التحميل…
            </div>
          }
        >
          <ActivityBrowser />
        </Suspense>
      </div>
    </AppShell>
  );
}
