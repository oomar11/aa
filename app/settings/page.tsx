"use client";

import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { useTheme } from "@/components/ThemeProvider";
import { useUnit } from "@/components/UnitProvider";
import type { LengthUnit } from "@/lib/units";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { unit, setUnit } = useUnit();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-20 pt-2">
        <h1 className="px-1 text-xl font-bold">الإعدادات</h1>

        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3.5 text-sm">
            اللغة: العربية
          </div>

          <div className="border-b border-border px-4 py-3.5">
            <p className="text-sm font-medium text-foreground">وحدة القياس</p>
            <p className="mt-0.5 text-xs text-muted">
              بتظهر في مقاسات الشباك والأبواب
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
              {theme === "dark" ? "التبديل للوضع الفاتح" : "التبديل للوضع الداكن"}
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <Link
            href="/settings/design"
            className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-primary-soft/50"
          >
            <div className="min-w-0 text-right">
              <p className="text-sm font-medium text-foreground">
                إعدادات التصميم
              </p>
              <p className="mt-0.5 text-xs text-muted">
                ترتيب التمبلتات في قائمة الاختيار
              </p>
            </div>
            <span className="shrink-0 text-muted" aria-hidden>
              ‹
            </span>
          </Link>
        </section>

        <Link
          href="/"
          className="mx-auto mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          العودة للرئيسية
        </Link>
      </main>
      <BottomNav />
    </div>
  );
}
