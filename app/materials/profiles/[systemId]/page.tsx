import { notFound } from "next/navigation";
import { MaterialDetailShell } from "@/components/layout/MaterialDetailShell";
import { ProfileSystemDetailEditor } from "@/components/materials/ProfileSystemDetailEditor";
import { ROUTES } from "@/lib/routes";

type Props = {
  params: Promise<{ systemId: string }>;
};

export default async function ProfileSystemPage({ params }: Props) {
  const { systemId } = await params;
  if (!systemId?.trim()) notFound();

  return (
    <MaterialDetailShell
      backHref={ROUTES.materials.profiles}
      backLabel="رجوع للقطاعات"
    >
      <ProfileSystemDetailEditor systemId={systemId} />
    </MaterialDetailShell>
  );
}
