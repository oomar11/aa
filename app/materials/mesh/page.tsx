import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { MeshCategoriesEditor } from "@/components/materials/MeshCategoriesEditor";
import { MeshTypesEditor } from "@/components/materials/MeshTypesEditor";
import { materialsMeshBreadcrumb } from "@/lib/materials-navigation";
import { ROUTES } from "@/lib/routes";

export default function MeshMaterialsPage() {
  return (
    <AppShell mainClassName="flex flex-1 flex-col gap-3 px-4 pb-24 pt-2">
      <PageHeader
        backHref={ROUTES.materials.hub}
        backLabel="رجوع للخامات"
        breadcrumb={materialsMeshBreadcrumb()}
        title="السلك"
        description="تصنيفات وأنواع السلك — الأسعار والحساب في التصميم"
      />
      <MeshCategoriesEditor />
      <MeshTypesEditor />
    </AppShell>
  );
}
