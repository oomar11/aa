import { notFound } from "next/navigation";
import { MaterialDetailShell } from "@/components/layout/MaterialDetailShell";
import { GlassSystemDetailEditor } from "@/components/materials/GlassSystemDetailEditor";
import { materialsGlassSystemBreadcrumb } from "@/lib/materials-navigation";
import { ROUTES } from "@/lib/routes";

type Props = {
  params: Promise<{ systemId: string }>;
};

export default async function GlassSystemPage({ params }: Props) {
  const { systemId } = await params;
  if (!systemId?.trim()) notFound();

  return (
    <MaterialDetailShell
      backHref={ROUTES.materials.glass}
      backLabel="رجوع للزجاج"
      breadcrumb={materialsGlassSystemBreadcrumb()}
    >
      <GlassSystemDetailEditor systemId={systemId} />
    </MaterialDetailShell>
  );
}
