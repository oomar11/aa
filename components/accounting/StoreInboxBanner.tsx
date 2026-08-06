"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  STORE_INBOX_UPDATED_EVENT,
  countPendingStoreInvoices,
} from "@/components/accounting/StoreInvoiceInboxPanel";
import { ROUTES } from "@/lib/routes";
import {
  hasStoreBridgeCredentials,
  syncAssignedStoreInvoiceExpenses,
} from "@/lib/store-bridge";

/** بانر يظهر عند وجود فواتير محل معلّقة */
export function StoreInboxBanner() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!hasStoreBridgeCredentials()) {
        if (!cancelled) setCount(0);
        return;
      }
      await syncAssignedStoreInvoiceExpenses().catch(() => 0);
      const n = await countPendingStoreInvoices();
      if (!cancelled) setCount(n);
    }
    void load();
    function onUpdate() {
      void load();
    }
    window.addEventListener(STORE_INBOX_UPDATED_EVENT, onUpdate);
    window.addEventListener("upvc-store-bridge-updated", onUpdate);
    window.addEventListener("focus", onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener(STORE_INBOX_UPDATED_EVENT, onUpdate);
      window.removeEventListener("upvc-store-bridge-updated", onUpdate);
      window.removeEventListener("focus", onUpdate);
    };
  }, []);

  if (count <= 0) return null;

  return (
    <Link
      href={ROUTES.accounting.storeInbox}
      className="flex items-center justify-between gap-3 rounded-2xl border border-[#6B5B95]/35 bg-[#6B5B95]/10 px-4 py-3 transition-colors hover:bg-[#6B5B95]/15"
    >
      <div>
        <p className="text-sm font-bold text-foreground">
          عندك {count} فاتورة من المحل
        </p>
        <p className="mt-0.5 text-[11px] text-muted">
          عيّنها على شغلانة — أو سيّبها وارجع لها بعدين
        </p>
      </div>
      <span className="shrink-0 text-sm font-bold text-[#6B5B95]">فتح ‹</span>
    </Link>
  );
}
