"use client";

import { useEffect } from "react";
import { ensureStoreBridgeBootstrapped } from "@/lib/store-bridge-bootstrap";
import { startStoreLedgerMirror } from "@/lib/store-ledger-mirror";

/** يفعّل ربط المتجر تلقائياً، ويحدّث كشف العميل لما تتغير حسابات الورشة. */
export function StoreBridgeAutoConnect() {
  useEffect(() => {
    void ensureStoreBridgeBootstrapped().then(() => {
      startStoreLedgerMirror();
    });
  }, []);
  return null;
}
