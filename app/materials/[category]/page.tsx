import { notFound } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { MeshCategoriesEditor } from "@/components/MeshCategoriesEditor";
import { MaterialSystemsEditor } from "@/components/MaterialSystemsEditor";
import { MeshTypesEditor } from "@/components/MeshTypesEditor";
import { ScreenBack } from "@/components/ScreenBack";
import {
  MATERIAL_CATEGORIES,
  type MaterialCategory,
} from "@/lib/material-systems";

const VALID = new Set(MATERIAL_CATEGORIES.map((c) => c.id));

type Props = {
  params: Promise<{ category: string }>;
};

export default async function MaterialCategoryPage({ params }: Props) {
  const { category } = await params;
  if (!VALID.has(category as MaterialCategory)) notFound();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-24 pt-2">
        <ScreenBack href="/materials" className="mb-1 px-1">
          رجوع للخامات
        </ScreenBack>
        <MaterialSystemsEditor category={category as MaterialCategory} />
        {category === "accessories" ? (
          <>
            <MeshCategoriesEditor />
            <MeshTypesEditor />
          </>
        ) : null}
      </main>
      <BottomNav />
    </div>
  );
}
