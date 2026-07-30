import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { AccessoryBrandsEditor } from "@/components/AccessoryBrandsEditor";
import { ScreenBack } from "@/components/ScreenBack";

export default function AccessoryBrandsPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-24 pt-2">
        <ScreenBack href="/materials/accessories" className="mb-1 px-1">
          رجوع للاكسسوار
        </ScreenBack>

        <div className="px-1">
          <h1 className="text-xl font-bold">براندات الاكسسوار</h1>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            قائمة أسعار فورنا يوليو 2026 مُحمّلة افتراضياً — عدّل الأسعار أو أضف
            براندات جديدة، ثم اختارها داخل تفاصيل كل نظام اكسسوار.
          </p>
        </div>

        <AccessoryBrandsEditor embedded />
      </main>
      <BottomNav />
    </div>
  );
}
