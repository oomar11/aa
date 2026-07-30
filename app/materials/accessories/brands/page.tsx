import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccessoryBrandsEditor } from "@/components/materials/AccessoryBrandsEditor";
import { ROUTES } from "@/lib/routes";

export default function AccessoryBrandsPage() {
  return (
    <AppShell mainClassName="flex flex-1 flex-col gap-3 px-4 pb-24 pt-2">
      <PageHeader
        backHref={ROUTES.materials.accessories}
        backLabel="رجوع للاكسسوار"
        title="براندات الاكسسوار"
        description="قائمة أسعار فورنا يوليو 2026 مُحمّلة افتراضياً — عدّل الأسعار أو أضف براندات جديدة، ثم اختارها داخل تفاصيل كل نظام اكسسوار."
      />
      <AccessoryBrandsEditor embedded />
    </AppShell>
  );
}
