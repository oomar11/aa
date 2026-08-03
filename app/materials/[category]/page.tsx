import { notFound } from "next/navigation";
import { MaterialCategoryShell } from "@/components/materials/MaterialCategoryShell";
import { MaterialSystemsEditor } from "@/components/materials/MaterialSystemsEditor";
import {
  MATERIAL_CATEGORIES,
  type MaterialCategory,
} from "@/lib/material-systems";

const VALID = new Set(MATERIAL_CATEGORIES.map((c) => c.id));

type Props = {
  params: Promise<{ category: string }>;
};

/** صفحات الفئات العامة — الزجاج فقط (الحديد والقطاعات والاكسسوار لهم صفحات مستقلة) */
export default async function MaterialCategoryPage({ params }: Props) {
  const { category } = await params;
  if (category !== "glass") notFound();
  if (!VALID.has(category as MaterialCategory)) notFound();

  return (
    <MaterialCategoryShell title="الزجاج">
      <MaterialSystemsEditor category="glass" />
    </MaterialCategoryShell>
  );
}
