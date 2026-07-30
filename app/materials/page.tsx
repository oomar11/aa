import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { MaterialHubIcon } from "@/components/materials/MaterialHubIcons";
import { MATERIAL_HUB_ITEMS } from "@/lib/material-systems";
import { ROUTES } from "@/lib/routes";

export default function MaterialsPage() {
  return (
    <AppShell>
      <PageHeader
        backHref={ROUTES.home}
        backLabel="رجوع للرئيسية"
        title="الخامات"
        description="قطاعات · اكسسوار · زجاج · سلك · حديد — وربطها بالتصميمات"
      />

      <section className="mt-4 grid grid-cols-2 gap-3">
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
            <MaterialHubIcon id={item.id} />
            <span className="text-base font-semibold">{item.label}</span>
          </Link>
        ))}
      </section>

      <p className="mt-4 px-1 text-center text-[11px] leading-relaxed text-muted">
        السلك والبراندات لهم صفحات خاصة داخل الخامات. كل تصميم يختار القطاعات
        والاكسسوار والزجاج والسلك.
      </p>
    </AppShell>
  );
}
