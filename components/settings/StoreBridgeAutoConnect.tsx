"use client";

import { useEffect } from "react";
import { ensureStoreBridgeBootstrapped } from "@/lib/store-bridge-bootstrap";
import { syncAssignedStoreInvoiceExpenses } from "@/lib/store-bridge";
import { startStoreLedgerMirror } from "@/lib/store-ledger-mirror";

/** يفعّل ربط المتجر تلقائياً، ويحدّث كشف العميل لما تتغير حسابات الورشة. */
export function StoreBridgeAutoConnect() {
  useEffect(() => {
    let cancelled = false;

    async function bootstrapAndSync() {
      await ensureStoreBridgeBootstrapped();
      if (cancelled) return;
      startStoreLedgerMirror();
      // استيراد فواتير المحل المعيّنة كمصروفات على أي جهاز (موبايل → كمبيوتر)
      await syncAssignedStoreInvoiceExpenses().catch(() => 0);
    }

    void bootstrapAndSync();

    function onVisible() {
      if (document.visibilityState !== "visible") return;
      void syncAssignedStoreInvoiceExpenses().catch(() => 0);
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);
  return null;
}
