"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { TemplateOrderEditor } from "@/components/design/TemplateOrderEditor";
import { ROUTES } from "@/lib/routes";

export default function DesignSettingsPage() {
  return (
    <AppShell mainClassName="flex flex-1 flex-col gap-4 px-4 pb-24 pt-2">
      <PageHeader
        backHref={ROUTES.settings}
        backLabel="رجوع للإعدادات"
        title="ترتيب الأشكال"
        description="رتّب ظهور التمبلتات في شاشة اختيار الشكل"
      />
      <section className="rounded-2xl border border-border bg-card p-3">
        <TemplateOrderEditor />
      </section>
    </AppShell>
  );
}
