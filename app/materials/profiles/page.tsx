import { MaterialCategoryShell } from "@/components/materials/MaterialCategoryShell";
import { MaterialSystemsEditor } from "@/components/materials/MaterialSystemsEditor";
import { materialsProfilesBreadcrumb } from "@/lib/materials-navigation";

export default function ProfilesMaterialsPage() {
  return (
    <MaterialCategoryShell
      title="القطاعات"
      description="كل سيستم فيه أسعاره + العيدان والتخصيم"
      breadcrumb={materialsProfilesBreadcrumb()}
    >
      <MaterialSystemsEditor category="profiles" />
    </MaterialCategoryShell>
  );
}
