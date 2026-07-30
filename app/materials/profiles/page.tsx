import { MaterialCategoryShell } from "@/components/materials/MaterialCategoryShell";
import { MaterialSystemsEditor } from "@/components/materials/MaterialSystemsEditor";
import { ROUTES } from "@/lib/routes";

export default function ProfilesMaterialsPage() {
  return (
    <MaterialCategoryShell
      title="القطاعات"
      description="تسعير بالعود بعد تخصيم مقاس القطع (سعر العود ÷ طوله) — معادلات التخصيم في تفاصيل السيستم"
      brandLink={{
        href: ROUTES.materials.profileBrands,
        title: "براندات القطاعات",
        description:
          "سيتي · بريمير · … — أسعار الحلق والضلفة والباكتة والسوقاس",
      }}
    >
      <MaterialSystemsEditor category="profiles" />
    </MaterialCategoryShell>
  );
}
