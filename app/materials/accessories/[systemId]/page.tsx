import { notFound } from "next/navigation";
import { MaterialDetailShell } from "@/components/layout/MaterialDetailShell";
import { AccessorySystemDetailEditor } from "@/components/materials/AccessorySystemDetailEditor";
import { materialsAccessorySystemBreadcrumb } from "@/lib/materials-navigation";
import { ROUTES } from "@/lib/routes";

type Props = {
  params: Promise<{ systemId: string }>;
};

export default async function AccessorySystemPage({ params }: Props) {
  const { systemId } = await params;
  if (!systemId?.trim()) notFound();

  return (
    <MaterialDetailShell
      backHref={ROUTES.materials.accessories}
      backLabel="رجوع للاكسسوار"
      breadcrumb={materialsAccessorySystemBreadcrumb()}
    >
      <AccessorySystemDetailEditor systemId={systemId} />
    </MaterialDetailShell>
  );
}
