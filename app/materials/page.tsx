import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { MaterialHubIcon } from "@/components/materials/MaterialHubIcons";
import { MaterialsHubIntro } from "@/components/materials/MaterialsHubIntro";
import { materialsHubBreadcrumb } from "@/lib/materials-navigation";
import { MATERIAL_HUB_ITEMS } from "@/lib/material-systems";

export default function MaterialsPage() {
  return (
    <AppShell mainClassName="flex flex-1 flex-col gap-3 px-4 pb-24 pt-2">
      <PageHeader
        breadcrumb={materialsHubBreadcrumb()}
        title="الخامات"
        description="أسعار وأنظمة القطاعات والاكسسوار والزجاج والسلك والحديد — بتظهر في التصميم تلقائياً"
      />

      <MaterialsHubIntro />

      <section className="grid grid-cols-2 gap-3">
        {MATERIAL_HUB_ITEMS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex min-h-[148px] flex-col items-center justify-center gap-2 rounded-2xl p-4 text-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]"
            style={{
              background: item.accent,
              boxShadow: `0 6px 20px ${item.shadow}`,
            }}
          >
            <MaterialHubIcon id={item.id} />
            <span className="text-base font-semibold">{item.label}</span>
            <span className="line-clamp-2 text-center text-[10px] leading-snug text-white/85">
              {item.description}
            </span>
          </Link>
        ))}
      </section>
    </AppShell>
  );
}
