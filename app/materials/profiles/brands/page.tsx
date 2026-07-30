import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { ProfileBrandsEditor } from "@/components/ProfileBrandsEditor";
import { ScreenBack } from "@/components/ScreenBack";

export default function ProfileBrandsPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-24 pt-2">
        <ScreenBack href="/materials/profiles" className="mb-1 px-1">
          رجوع للقطاعات
        </ScreenBack>

        <div className="px-1">
          <h1 className="text-xl font-bold">براندات القطاعات</h1>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            سيتي · بريمير · وأي براند تاني — مع أسعار الحلق والضلفة والباكتة
            والسوقاس لكل متر
          </p>
        </div>

        <ProfileBrandsEditor embedded />
      </main>
      <BottomNav />
    </div>
  );
}
