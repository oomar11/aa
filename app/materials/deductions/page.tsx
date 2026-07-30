import { MaterialDetailShell } from "@/components/layout/MaterialDetailShell";
import { CutDeductionsEditor } from "@/components/materials/CutDeductionsEditor";
import { materialsDeductionsBreadcrumb } from "@/lib/materials-navigation";
import { ROUTES } from "@/lib/routes";

export default function CutDeductionsPage() {
  return (
    <MaterialDetailShell
      backHref={ROUTES.materials.hub}
      backLabel="رجوع للخامات"
      breadcrumb={materialsDeductionsBreadcrumb()}
    >
      <CutDeductionsEditor />
    </MaterialDetailShell>
  );
}
