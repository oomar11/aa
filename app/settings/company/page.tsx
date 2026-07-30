import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { CompanyForm } from "@/components/settings/CompanyForm";
import { ROUTES } from "@/lib/routes";

export default function CompanySettingsPage() {
  return (
    <AppShell>
      <PageHeader
        backHref={ROUTES.settings}
        backLabel="الإعدادات"
        title="بيانات الشركة"
        description="البرنامج لشركة واحدة — عدّل الاسم وبيانات التواصل والضرائب"
      />
      <div className="mt-4">
        <CompanyForm />
      </div>
    </AppShell>
  );
}
