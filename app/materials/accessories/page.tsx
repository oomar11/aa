import { MaterialCategoryShell } from "@/components/materials/MaterialCategoryShell";
import { MaterialSystemsEditor } from "@/components/materials/MaterialSystemsEditor";
import { ROUTES } from "@/lib/routes";

export default function AccessoriesMaterialsPage() {
  return (
    <MaterialCategoryShell
      title="الاكسسوار"
      description="أنظمة الاكسسوار · البراندات · قواعد المفصلي والجرار"
      brandLink={{
        href: ROUTES.materials.accessoryBrands,
        title: "براندات الاكسسوار",
        description: "مفصلات · سبلونة · سكاك · تراك · عجل · فرش — لكل فئة",
      }}
    >
      <MaterialSystemsEditor category="accessories" />
    </MaterialCategoryShell>
  );
}
