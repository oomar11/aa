"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";
import { DataBackupPanel } from "@/components/settings/DataBackupPanel";
import { useUnit } from "@/components/settings/UnitProvider";
import { ROUTES } from "@/lib/routes";
import type { LengthUnit } from "@/lib/units";

export default function SettingsPage() {
  const { unit, setUnit } = useUnit();

  return (
    <AppShell>
      <PageHeader backHref={ROUTES.more} title="الإعدادات" />

      <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="px-4 py-3.5">
          <p className="text-sm font-medium text-foreground">وحدة القياس</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(
              [
                { id: "mm", label: "مليمتر (مم)" },
                { id: "cm", label: "سنتيمتر (سم)" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setUnit(option.id as LengthUnit)}
                className={`h-11 rounded-xl border text-sm font-semibold transition-colors ${
                  unit === option.id
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-background text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        <Link
          href={ROUTES.settingsCompany}
          className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 transition-colors hover:bg-primary-soft/50"
        >
          <p className="text-sm font-medium text-foreground">بيانات الشركة</p>
          <span className="shrink-0 text-muted" aria-hidden>
            ‹
          </span>
        </Link>
        <Link
          href={ROUTES.settingsPricing}
          className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 transition-colors hover:bg-primary-soft/50"
        >
          <p className="text-sm font-medium text-foreground">تسعير البيع</p>
          <span className="shrink-0 text-muted" aria-hidden>
            ‹
          </span>
        </Link>
        <Link
          href={ROUTES.settingsDesign}
          className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-primary-soft/50"
        >
          <p className="text-sm font-medium text-foreground">ترتيب الأشكال</p>
          <span className="shrink-0 text-muted" aria-hidden>
            ‹
          </span>
        </Link>
      </section>

      <InstallAppButton className="mt-4" />

      <DataBackupPanel />
    </AppShell>
  );
}
