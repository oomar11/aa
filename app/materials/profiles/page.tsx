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
      description="أنظمة البروفيل — العيدان ومعادلات التخصيم — مرتبطة بأسعار البراندات"
      breadcrumb={materialsProfilesBreadcrumb()}
      workflowSteps={profileWorkflowSteps("systems")}
    >
      <MaterialSystemsEditor category="profiles" />
    </MaterialCategoryShell>
  );
}
