import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileBrandsEditor } from "@/components/materials/ProfileBrandsEditor";
import { ROUTES } from "@/lib/routes";

export default function ProfileBrandsPage() {
  return (
    <AppShell mainClassName="flex flex-1 flex-col gap-3 px-4 pb-24 pt-2">
      <PageHeader
        backHref={ROUTES.materials.profiles}
        backLabel="رجوع للقطاعات"
        title="براندات القطاعات"
        description="سيتي بريمير (فبراير 2025) بالعود: سعر العود + طول العود — لأي براند"
      />
      <ProfileBrandsEditor embedded />
    </AppShell>
  );
}
