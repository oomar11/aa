import { MaterialCategoryShell } from "@/components/materials/MaterialCategoryShell";
import { ProfilesMaterialsView } from "@/components/materials/ProfilesMaterialsView";
import { materialsProfilesBreadcrumb } from "@/lib/materials-navigation";

export default function ProfilesMaterialsPage() {
  return (
    <MaterialCategoryShell
      title="القطاعات"
      description="كل سيستم فيه قطاعاته بأسعارها + العيدان والتخصيم"
      breadcrumb={materialsProfilesBreadcrumb()}
    >
      <ProfilesMaterialsView />
    </MaterialCategoryShell>
  );
}
