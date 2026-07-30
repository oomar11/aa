import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { MaterialSystemsEditor } from "@/components/MaterialSystemsEditor";
import { ScreenBack } from "@/components/ScreenBack";

export default function AccessoriesMaterialsPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-24 pt-2">
        <ScreenBack href="/materials" className="mb-1 px-1">
          رجوع للخامات
        </ScreenBack>

        <div className="px-1">
          <h1 className="text-xl font-bold">الاكسسوار</h1>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            أنظمة الاكسسوار · البراندات · قواعد المفصلي والجرار
          </p>
        </div>

        <Link
          href="/materials/accessories/brands"
          className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5 transition-colors hover:border-primary/40 hover:bg-primary-soft/30"
        >
          <div className="min-w-0 text-right">
            <p className="text-sm font-semibold text-foreground">
              براندات الاكسسوار
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              مفصلات · سبلونة · سكاك · تراك · عجل · فرش · تقابل — لكل فئة
            </p>
          </div>
          <span
            className="shrink-0 text-lg text-muted"
            aria-hidden
          >
            ‹
          </span>
        </Link>

        <MaterialSystemsEditor category="accessories" />
      </main>
      <BottomNav />
    </div>
  );
}
