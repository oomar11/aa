import { MaterialCategoryShell } from "@/components/materials/MaterialCategoryShell";
import { MaterialSystemsEditor } from "@/components/materials/MaterialSystemsEditor";
import { materialsAccessoriesBreadcrumb } from "@/lib/materials-navigation";

export default function AccessoriesMaterialsPage() {
  return (
    <MaterialCategoryShell
      title="الاكسسوار"
      description="اختَر نظام واضغط تفاصيل: الأسعار وقواعد المفصلي والجرار من مكان واحد."
      breadcrumb={materialsAccessoriesBreadcrumb()}
    >
      <MaterialSystemsEditor category="accessories" />
    </MaterialCategoryShell>
  );
}
