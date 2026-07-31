import { MaterialDetailShell } from "@/components/layout/MaterialDetailShell";
import { IronSystemDetailEditor } from "@/components/materials/IronSystemDetailEditor";
import { materialsIronBreadcrumb } from "@/lib/materials-navigation";
import { ROUTES } from "@/lib/routes";
import { SINGLE_IRON_SYSTEM_ID } from "@/lib/material-systems";

/** الحديد سيستم واحد — الصفحة تفتح التفاصيل مباشرة */
export default function IronMaterialsPage() {
  return (
    <MaterialDetailShell
      backHref={ROUTES.materials.hub}
      backLabel="رجوع للخامات"
      breadcrumb={materialsIronBreadcrumb()}
    >
      <IronSystemDetailEditor systemId={SINGLE_IRON_SYSTEM_ID} />
    </MaterialDetailShell>
  );
}
