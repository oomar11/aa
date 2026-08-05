import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReceivablesBrowser } from "@/components/accounting/ReceivablesBrowser";
import { ROUTES } from "@/lib/routes";

export default function ReceivablesPage() {
  return (
    <AppShell>
      <PageHeader
        backHref={ROUTES.accounting.hub}
        backLabel="الحسابات"
        title="فلوس لِيا برا"
        description="الشغل اللي عليه فلوس ومتسلّمش — وإيه اللي اتسلّم"
      />
      <div className="mt-4">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted">
              جاري التحميل…
            </div>
          }
        >
          <ReceivablesBrowser />
        </Suspense>
      </div>
    </AppShell>
  );
}
