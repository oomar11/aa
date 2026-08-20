"use client";

import Link from "next/link";
import { useWorkshopSync } from "@/components/settings/SharedDataProvider";
import { ROUTES } from "@/lib/routes";

/**
 * تنبيه واضح لما بيانات الورشة مش مشتركة بين التليفون والكمبيوتر.
 */
export function WorkshopSyncBanner() {
  const sync = useWorkshopSync();

  if (!sync.ready || sync.syncing) return null;
  if (sync.neonConfigured || sync.backend === "neon" || sync.backend === "postgres") {
    return null;
  }
  if (sync.durable && sync.backend !== "file" && sync.backend !== "unknown") {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#E8A838]/45 bg-[#E8A838]/12 px-3.5 py-3 text-right">
      <p className="text-sm font-bold text-foreground">
        بيانات التليفون مش هتوصل للكمبيوتر لوحدها
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        اربط Neon بنفس الرابط على التليفون والكمبيوتر من الإعدادات — غير كده كل
        جهاز بيشوف مصروفاته لوحده.
      </p>
      <Link
        href={ROUTES.settings}
        className="mt-2 inline-flex text-xs font-bold text-primary hover:underline"
      >
        فتح ربط Neon من الإعدادات
      </Link>
    </div>
  );
}
