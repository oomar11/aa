import { MaterialCategoryShell } from "@/components/materials/MaterialCategoryShell";
import { MaterialSystemsEditor } from "@/components/materials/MaterialSystemsEditor";

export default function ProfilesMaterialsPage() {
  return (
    <MaterialCategoryShell title="القطاعات">
      <MaterialSystemsEditor category="profiles" />
    </MaterialCategoryShell>
  );
}
