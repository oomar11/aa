import { MaterialCategoryShell } from "@/components/materials/MaterialCategoryShell";
import { MaterialSystemsEditor } from "@/components/materials/MaterialSystemsEditor";
import { materialsAccessoriesBreadcrumb } from "@/lib/materials-navigation";

export default function AccessoriesMaterialsPage() {
  return (
    <MaterialCategoryShell
      title="الاكسسوار"
      description="نظام الاكسسوار مربوط بالرسم والتكلفة: اختر نظاماً ثم سجّل أسعار السبلونات وباقي القطع."
      breadcrumb={materialsAccessoriesBreadcrumb()}
    >
      <MaterialSystemsEditor category="accessories" />
    </MaterialCategoryShell>
  );
}
