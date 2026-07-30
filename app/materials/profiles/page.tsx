import { MaterialCategoryShell } from "@/components/materials/MaterialCategoryShell";
import { ProfilesMaterialsView } from "@/components/materials/ProfilesMaterialsView";
import { materialsProfilesBreadcrumb } from "@/lib/materials-navigation";

export default function ProfilesMaterialsPage() {
  return (
    <MaterialCategoryShell
      title="القطاعات"
      description="تبويبين: أسعار البراندات (كم سعر العود) ثم أنظمة القطع (التقطيع والتخصيم)"
      breadcrumb={materialsProfilesBreadcrumb()}
    >
      <ProfilesMaterialsView />
    </MaterialCategoryShell>
  );
}
