"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataBackupPanel } from "@/components/settings/DataBackupPanel";
import { useTheme } from "@/components/settings/ThemeProvider";
import { useUnit } from "@/components/settings/UnitProvider";
import { ROUTES } from "@/lib/routes";
import type { LengthUnit } from "@/lib/units";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { unit, setUnit } = useUnit();

  return (
    <AppShell>
      <PageHeader title="الإعدادات" />

      <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3.5 text-sm">
          اللغة: العربية
        </div>

        <div className="border-b border-border px-4 py-3.5">
          <p className="text-sm font-medium text-foreground">وحدة القياس</p>
          <p className="mt-0.5 text-xs text-muted">
            تظهر في مقاسات النوافذ والأبواب
          </p>
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

        <div className="px-4 py-3.5">
          <p className="text-sm font-medium text-foreground">المظهر</p>
          <button
            type="button"
            onClick={toggleTheme}
            className="mt-3 flex h-11 w-full items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold transition-colors hover:bg-primary-soft"
          >
            {theme === "dark"
              ? "التبديل للوضع الفاتح"
              : "التبديل للوضع الداكن"}
          </button>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        <Link
          href={ROUTES.settingsCompany}
          className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 transition-colors hover:bg-primary-soft/50"
        >
          <div className="min-w-0 text-right">
            <p className="text-sm font-medium text-foreground">بيانات الشركة</p>
            <p className="mt-0.5 text-xs text-muted">
              اسم الشركة · الهاتف · الرقم الضريبي
            </p>
          </div>
          <span className="shrink-0 text-muted" aria-hidden>
            ‹
          </span>
        </Link>
        <Link
          href={ROUTES.settingsPricing}
          className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 transition-colors hover:bg-primary-soft/50"
        >
          <div className="min-w-0 text-right">
            <p className="text-sm font-medium text-foreground">تسعير البيع</p>
            <p className="mt-0.5 text-xs text-muted">
              هامش الربح · المصنعية · حد أدنى متر
            </p>
          </div>
          <span className="shrink-0 text-muted" aria-hidden>
            ‹
          </span>
        </Link>
        <Link
          href={ROUTES.settingsDesign}
          className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-primary-soft/50"
        >
          <div className="min-w-0 text-right">
            <p className="text-sm font-medium text-foreground">ترتيب الأشكال</p>
            <p className="mt-0.5 text-xs text-muted">
              رتّب التمبلتات في قائمة اختيار الشكل
            </p>
          </div>
          <span className="shrink-0 text-muted" aria-hidden>
            ‹
          </span>
        </Link>
      </section>

      <DataBackupPanel />
    </AppShell>
  );
}
