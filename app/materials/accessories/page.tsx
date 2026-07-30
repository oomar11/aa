import { MaterialCategoryShell } from "@/components/materials/MaterialCategoryShell";
import { MaterialSystemsEditor } from "@/components/materials/MaterialSystemsEditor";
import {
  accessoryWorkflowSteps,
  materialsAccessoriesBreadcrumb,
} from "@/lib/materials-navigation";

export default function AccessoriesMaterialsPage() {
  return (
    <MaterialCategoryShell
      title="الاكسسوار"
      description="أنظمة المفصلي والجرار — مرتبطة بأسعار البراندات"
      breadcrumb={materialsAccessoriesBreadcrumb()}
      workflowSteps={accessoryWorkflowSteps("systems")}
    >
      <MaterialSystemsEditor category="accessories" />
    </MaterialCategoryShell>
  );
}
