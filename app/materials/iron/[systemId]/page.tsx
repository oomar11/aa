import { notFound } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { IronSystemDetailEditor } from "@/components/IronSystemDetailEditor";
import { ScreenBack } from "@/components/ScreenBack";

type Props = {
  params: Promise<{ systemId: string }>;
};

export default async function IronSystemPage({ params }: Props) {
  const { systemId } = await params;
  if (!systemId?.trim()) notFound();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-24 pt-2">
        <ScreenBack href="/materials/iron" className="mb-1 px-1">
          رجوع للحديد
        </ScreenBack>
        <IronSystemDetailEditor systemId={systemId} />
      </main>
      <BottomNav />
    </div>
  );
}
