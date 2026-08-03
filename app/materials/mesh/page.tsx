import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { MeshCategoriesEditor } from "@/components/materials/MeshCategoriesEditor";
import { MeshTypesEditor } from "@/components/materials/MeshTypesEditor";
import { ROUTES } from "@/lib/routes";

export default function MeshMaterialsPage() {
  return (
    <AppShell mainClassName="flex flex-1 flex-col gap-3 px-4 pb-24 pt-2">
      <PageHeader backHref={ROUTES.materials.hub} title="السلك" />
      <p className="px-1 text-[10px] font-bold tracking-wide text-muted">
        ١ — التصنيفات
      </p>
      <MeshCategoriesEditor />
      <p className="px-1 text-[10px] font-bold tracking-wide text-muted">
        ٢ — الأنواع والأسعار
      </p>
      <MeshTypesEditor />
    </AppShell>
  );
}
