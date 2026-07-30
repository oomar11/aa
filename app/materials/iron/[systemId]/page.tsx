import { notFound } from "next/navigation";
import { MaterialDetailShell } from "@/components/layout/MaterialDetailShell";
import { IronSystemDetailEditor } from "@/components/materials/IronSystemDetailEditor";
import { materialsIronSystemBreadcrumb } from "@/lib/materials-navigation";
import { ROUTES } from "@/lib/routes";

type Props = {
  params: Promise<{ systemId: string }>;
};

export default async function IronSystemPage({ params }: Props) {
  const { systemId } = await params;
  if (!systemId?.trim()) notFound();

  return (
    <MaterialDetailShell
      backHref={ROUTES.materials.iron}
      backLabel="رجوع للحديد"
      breadcrumb={materialsIronSystemBreadcrumb()}
    >
      <IronSystemDetailEditor systemId={systemId} />
    </MaterialDetailShell>
  );
}
