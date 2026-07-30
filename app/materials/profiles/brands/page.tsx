import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { MaterialWorkflowGuide } from "@/components/materials/MaterialWorkflowGuide";
import { ProfileBrandsEditor } from "@/components/materials/ProfileBrandsEditor";
import {
  materialsProfileBrandsBreadcrumb,
  profileWorkflowSteps,
} from "@/lib/materials-navigation";
import { ROUTES } from "@/lib/routes";

export default function ProfileBrandsPage() {
  return (
    <AppShell mainClassName="flex flex-1 flex-col gap-3 px-4 pb-24 pt-2">
      <PageHeader
        backHref={ROUTES.materials.profiles}
        backLabel="رجوع للقطاعات"
        breadcrumb={materialsProfileBrandsBreadcrumb()}
        title="براندات القطاعات"
        description="سيتي بريمير وغيرها — سعر العود + طوله. بعد ما تحفظ، اربط البراند من تفاصيل كل نظام قطاعات."
      />
      <MaterialWorkflowGuide steps={profileWorkflowSteps("brands")} />
      <ProfileBrandsEditor embedded />
    </AppShell>
  );
}
