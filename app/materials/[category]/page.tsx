import { notFound } from "next/navigation";
import { MaterialCategoryShell } from "@/components/materials/MaterialCategoryShell";
import { MaterialSystemsEditor } from "@/components/materials/MaterialSystemsEditor";
import {
  MATERIAL_CATEGORIES,
  type MaterialCategory,
} from "@/lib/material-systems";

const VALID = new Set(MATERIAL_CATEGORIES.map((c) => c.id));

const CATEGORY_META: Record<
  Exclude<MaterialCategory, "profiles" | "accessories">,
  { title: string; description: string }
> = {
  glass: {
    title: "الزجاج",
    description: "كتالوج الزجاجات · التدبيل · جورجيا",
  },
  iron: {
    title: "الحديد",
    description: "تسليح الحلق · الضلفة · السوقاس — مفصلي وجرار",
  },
};

type Props = {
  params: Promise<{ category: string }>;
};

export default async function MaterialCategoryPage({ params }: Props) {
  const { category } = await params;
  if (!VALID.has(category as MaterialCategory)) notFound();
  if (category === "accessories" || category === "profiles") notFound();

  const meta = CATEGORY_META[category as keyof typeof CATEGORY_META];

  return (
    <MaterialCategoryShell title={meta.title} description={meta.description}>
      <MaterialSystemsEditor category={category as MaterialCategory} />
    </MaterialCategoryShell>
  );
}
