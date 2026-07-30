import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { ScreenBack } from "@/components/ScreenBack";
import { MATERIAL_HUB_ITEMS } from "@/lib/material-systems";

export default function MaterialsPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-20 pt-2">
        <div className="px-1">
          <ScreenBack href="/" className="mb-2">
            رجوع للرئيسية
          </ScreenBack>
          <h1 className="text-xl font-bold">الخامات</h1>
          <p className="mt-1 text-xs text-muted">
            قطاعات · اكسسوار · زجاج · سلك · حديد — وربطها بالتصميمات
          </p>
        </div>

        <section className="grid grid-cols-2 gap-3">
          {MATERIAL_HUB_ITEMS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex min-h-[132px] flex-col items-center justify-center gap-3 rounded-2xl p-4 text-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]"
              style={{
                background: item.accent,
                boxShadow: `0 6px 20px ${item.shadow}`,
              }}
            >
              <HubIcon id={item.id} />
              <span className="text-base font-semibold">{item.label}</span>
            </Link>
          ))}
        </section>

        <p className="px-1 text-center text-[11px] leading-relaxed text-muted">
          السلك له صفحة خاصة — مش داخل الاكسسوار. كل تصميم يختار القطاعات
          والاكسسوار والزجاج والسلك.
        </p>
      </main>
      <BottomNav />
    </div>
  );
}

function HubIcon({ id }: { id: string }) {
  const cls = "h-10 w-10";
  if (id === "profiles") {
    return (
      <svg viewBox="0 0 40 40" className={cls} fill="none" aria-hidden>
        <rect x="6" y="8" width="10" height="24" rx="2" fill="currentColor" />
        <rect
          x="24"
          y="8"
          width="10"
          height="24"
          rx="2"
          fill="currentColor"
          opacity="0.7"
        />
        <path
          d="M16 12h8M16 20h8M16 28h8"
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="1.5"
        />
      </svg>
    );
  }
  if (id === "accessories") {
    return (
      <svg viewBox="0 0 40 40" className={cls} fill="none" aria-hidden>
        <circle cx="20" cy="14" r="6" fill="currentColor" />
        <rect x="17" y="18" width="6" height="14" rx="2" fill="currentColor" />
        <circle
          cx="20"
          cy="14"
          r="2.5"
          fill="rgba(0,0,0,0.2)"
        />
      </svg>
    );
  }
  if (id === "glass") {
    return (
      <svg viewBox="0 0 40 40" className={cls} fill="none" aria-hidden>
        <rect
          x="8"
          y="6"
          width="24"
          height="28"
          rx="3"
          fill="currentColor"
          opacity="0.85"
        />
        <path
          d="M12 10l16 20"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (id === "mesh") {
    return (
      <svg viewBox="0 0 40 40" className={cls} fill="none" aria-hidden>
        <rect
          x="7"
          y="7"
          width="26"
          height="26"
          rx="3"
          fill="currentColor"
          opacity="0.85"
        />
        <path
          d="M10 13h20M10 20h20M10 27h20M13 10v20M20 10v20M27 10v20"
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="1.2"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 40" className={cls} fill="none" aria-hidden>
      <rect x="7" y="18" width="26" height="8" rx="1.5" fill="currentColor" />
      <rect
        x="10"
        y="10"
        width="6"
        height="20"
        rx="1"
        fill="currentColor"
        opacity="0.75"
      />
      <rect
        x="24"
        y="10"
        width="6"
        height="20"
        rx="1"
        fill="currentColor"
        opacity="0.75"
      />
    </svg>
  );
}
