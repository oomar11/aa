import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccessoryBrandsEditor } from "@/components/materials/AccessoryBrandsEditor";
import { MaterialWorkflowGuide } from "@/components/materials/MaterialWorkflowGuide";
import {
  accessoryWorkflowSteps,
  materialsAccessoryBrandsBreadcrumb,
} from "@/lib/materials-navigation";
import { ROUTES } from "@/lib/routes";

export default function AccessoryBrandsPage() {
  return (
    <AppShell mainClassName="flex flex-1 flex-col gap-3 px-4 pb-24 pt-2">
      <PageHeader
        backHref={ROUTES.materials.accessories}
        backLabel="رجوع للاكسسوار"
        breadcrumb={materialsAccessoryBrandsBreadcrumb()}
        title="براندات الاكسسوار"
        description="أسعار المفصلات والسبلونة والسكاك والتراك والعجل والفرش — قائمة فورنا 2026 مُحمّلة افتراضياً"
      />
      <MaterialWorkflowGuide steps={accessoryWorkflowSteps("brands")} />
      <AccessoryBrandsEditor embedded />
    </AppShell>
  );
}
