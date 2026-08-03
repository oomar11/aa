import { MaterialCategoryShell } from "@/components/materials/MaterialCategoryShell";
import { MaterialSystemsEditor } from "@/components/materials/MaterialSystemsEditor";

export default function AccessoriesMaterialsPage() {
  return (
    <MaterialCategoryShell title="الاكسسوار">
      <MaterialSystemsEditor category="accessories" />
    </MaterialCategoryShell>
  );
}
