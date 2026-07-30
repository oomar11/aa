"use client";

import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { ScreenBack } from "@/components/ScreenBack";
import { TemplateOrderEditor } from "@/components/TemplateOrderEditor";

export default function DesignSettingsPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-24 pt-2">
        <div className="px-1">
          <ScreenBack href="/settings" className="mb-2">
            رجوع للإعدادات
          </ScreenBack>
          <h1 className="text-xl font-bold">ترتيب الأشكال</h1>
          <p className="mt-1 text-xs text-muted">
            رتّب ظهور التمبلتات في شاشة اختيار الشكل
          </p>
        </div>

        <section className="rounded-2xl border border-border bg-card p-3">
          <TemplateOrderEditor />
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
