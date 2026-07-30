"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { ROUTES } from "@/lib/routes";

export type ProfilesTab = "brands" | "systems";

const TABS: {
  id: ProfilesTab;
  label: string;
  hint: string;
  step: number;
}[] = [
  {
    id: "brands",
    step: 1,
    label: "أسعار البراندات",
    hint: "سعر العود لكل صنف",
  },
  {
    id: "systems",
    step: 2,
    label: "أنظمة القطع",
    hint: "العيدان + التخصيم + ربط البراند",
  },
];

type Props = {
  active: ProfilesTab;
};

/** تبويبات واضحة بدل التنقل بين صفحتين */
export function ProfilesSectionTabs({ active }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setTab = useCallback(
    (tab: ProfilesTab) => {
      const next = new URLSearchParams(searchParams.toString());
      if (tab === "brands") {
        next.delete("tab");
      } else {
        next.set("tab", tab);
      }
      const qs = next.toString();
      router.replace(
        qs ? `${ROUTES.materials.profiles}?${qs}` : ROUTES.materials.profiles,
        { scroll: false }
      );
    },
    [router, searchParams]
  );

  return (
    <div
      className="grid grid-cols-2 gap-2"
      role="tablist"
      aria-label="أقسام القطاعات"
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => setTab(tab.id)}
            className={`rounded-xl border p-2.5 text-right transition-colors ${
              isActive
                ? "border-primary bg-primary-soft/35"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <div className="flex items-center justify-end gap-2">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/20 text-muted"
                }`}
              >
                {tab.step}
              </span>
              <p
                className={`text-xs font-bold ${
                  isActive ? "text-primary" : "text-foreground"
                }`}
              >
                {tab.label}
              </p>
            </div>
            <p className="mt-1 text-[10px] text-muted">{tab.hint}</p>
          </button>
        );
      })}
    </div>
  );
}

export function parseProfilesTab(raw: string | null | undefined): ProfilesTab {
  return raw === "systems" ? "systems" : "brands";
}
