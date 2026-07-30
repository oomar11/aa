import { MaterialCategoryShell } from "@/components/materials/MaterialCategoryShell";
import { MaterialSystemsEditor } from "@/components/materials/MaterialSystemsEditor";
import {
  materialsProfilesBreadcrumb,
  profileWorkflowSteps,
} from "@/lib/materials-navigation";

export default function ProfilesMaterialsPage() {
  return (
    <MaterialCategoryShell
      title="القطاعات"
      description="خطوتين: براندات الأسعار → أنظمة البروفيل. كل نظام بيتربط ببراند عشان التسعير في الرسم."
      breadcrumb={materialsProfilesBreadcrumb()}
      workflowSteps={profileWorkflowSteps("systems")}
    >
      <MaterialSystemsEditor category="profiles" />
    </MaterialCategoryShell>
  );
}
