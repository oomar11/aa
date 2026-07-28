import { notFound } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { NavBack } from "@/components/NavBack";
import { ProfileSystemDetailEditor } from "@/components/ProfileSystemDetailEditor";

type Props = {
  params: Promise<{ systemId: string }>;
};

export default async function ProfileSystemPage({ params }: Props) {
  const { systemId } = await params;
  if (!systemId?.trim()) notFound();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-24 pt-2">
        <NavBack
          href="/materials/profiles"
          className="mb-1 inline-flex px-1 text-sm font-medium text-primary"
        >
          ← رجوع للقطاعات
        </NavBack>
        <ProfileSystemDetailEditor systemId={systemId} />
      </main>
      <BottomNav />
    </div>
  );
}
