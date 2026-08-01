"use client";

import { useState, type ReactNode } from "react";
import { runCleanStartMigration } from "@/lib/clean-start";

/**
 * عند أول فتح بعد التحديث: يمسح بيانات التجربة القديمة.
 */
export function CleanStartGate({ children }: { children: ReactNode }) {
  const [ready] = useState(() => {
    if (typeof window === "undefined") return true;
    runCleanStartMigration();
    return true;
  });

  if (!ready) return null;
  return children;
}
