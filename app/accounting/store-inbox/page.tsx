"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { StoreInvoiceInboxPanel } from "@/components/accounting/StoreInvoiceInboxPanel";
import { ROUTES } from "@/lib/routes";

export default function StoreInvoiceInboxPage() {
  return (
    <AppShell>
      <PageHeader backHref={ROUTES.accounting.hub} title="فواتير المحل" />
      <div className="mt-4">
        <StoreInvoiceInboxPanel />
      </div>
    </AppShell>
  );
}
