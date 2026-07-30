import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { MeshCategoriesEditor } from "@/components/MeshCategoriesEditor";
import { MeshTypesEditor } from "@/components/MeshTypesEditor";
import { ScreenBack } from "@/components/ScreenBack";

export default function MeshMaterialsPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-24 pt-2">
        <ScreenBack href="/materials" className="mb-1 px-1">
          رجوع للخامات
        </ScreenBack>

        <div className="px-1">
          <h1 className="text-xl font-bold">السلك</h1>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            تصنيفات وأنواع السلك — الأسعار والحساب في التصميم وشريط الخامات
          </p>
        </div>

        <MeshCategoriesEditor />
        <MeshTypesEditor />
      </main>
      <BottomNav />
    </div>
  );
}
