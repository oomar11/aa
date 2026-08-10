"use client";

import { useEffect } from "react";
import { ensureStoreBridgeBootstrapped } from "@/lib/store-bridge-bootstrap";

/** يفعّل ربط المتجر تلقائياً عند فتح أي شاشة. */
export function StoreBridgeAutoConnect() {
  useEffect(() => {
    void ensureStoreBridgeBootstrapped();
  }, []);
  return null;
}
