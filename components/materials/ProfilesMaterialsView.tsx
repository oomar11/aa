"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MaterialSystemsEditor } from "@/components/materials/MaterialSystemsEditor";
import { ProfileBrandsEditor } from "@/components/materials/ProfileBrandsEditor";
import { ProfilesConceptGuide } from "@/components/materials/ProfilesConceptGuide";
import {
  ProfilesSectionTabs,
  parseProfilesTab,
} from "@/components/materials/ProfilesSectionTabs";
import { defaultProfileBrands, loadMaterialCatalog, PROFILE_BRANDS_UPDATED } from "@/lib/material-systems";

function ProfilesMaterialsContent() {
  const searchParams = useSearchParams();
  const tab = parseProfilesTab(searchParams.get("tab"));
  const [brandCount, setBrandCount] = useState<number | null>(null);

  useEffect(() => {
    const refresh = () => {
      const cat = loadMaterialCatalog();
      setBrandCount((cat.profileBrands ?? defaultProfileBrands()).length);
    };
    queueMicrotask(refresh);
    window.addEventListener(PROFILE_BRANDS_UPDATED, refresh);
    return () => window.removeEventListener(PROFILE_BRANDS_UPDATED, refresh);
  }, [tab]);

  return (
    <div className="flex flex-col gap-3">
      <ProfilesConceptGuide />
      <ProfilesSectionTabs active={tab} />

      {tab === "systems" && brandCount === 0 ? (
        <p
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-foreground"
          role="status"
        >
          لازم تضيف براند أسعار الأول — ارجع لتبويب «أسعار البراندات» واعمل براند
          (مثلاً سيتي أو بريمير)، بعدين ارجع هنا واربطه بالنظام.
        </p>
      ) : null}

      <div
        role="tabpanel"
        aria-label={tab === "brands" ? "أسعار البراندات" : "أنظمة القطع"}
      >
        {tab === "brands" ? (
          <ProfileBrandsEditor embedded />
        ) : (
          <MaterialSystemsEditor category="profiles" />
        )}
      </div>
    </div>
  );
}

export function ProfilesMaterialsView() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted">
          جاري التحميل…
        </div>
      }
    >
      <ProfilesMaterialsContent />
    </Suspense>
  );
}

export { parseProfilesTab };
