import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { MaterialHubIcon } from "@/components/materials/MaterialHubIcons";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";
import {
  MATERIAL_HUB_GROUPS,
  MATERIAL_HUB_ITEMS,
} from "@/lib/material-systems";
import { ROUTES } from "@/lib/routes";

const SETTINGS_LINKS = [
  {
    href: ROUTES.settings,
    title: "الإعدادات",
    description: "وحدة القياس · الشركة · التسعير · الأشكال",
  },
  {
    href: ROUTES.settingsCompany,
    title: "بيانات الشركة",
    description: "الاسم · الهاتف · الرقم الضريبي",
  },
  {
    href: ROUTES.settingsPricing,
    title: "تسعير البيع",
    description: "هامش الربح · المصنعية",
  },
] as const;

export default function MorePage() {
  return (
    <AppShell mainClassName="flex flex-1 flex-col gap-5 px-4 pb-24 pt-1">
      <h1 className="text-xl font-bold text-foreground">المزيد</h1>

      <InstallAppButton />

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-bold text-foreground">الخامات</h2>
        <ul className="overflow-hidden rounded-2xl border border-border bg-card">
          {MATERIAL_HUB_ITEMS.map((item, i) => (
            <li
              key={item.id}
              className={i > 0 ? "border-t border-border" : undefined}
            >
              <Link
                href={item.href}
                className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-primary-soft/40 active:bg-primary-soft/60"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ background: item.accent }}
                  aria-hidden
                >
                  <MaterialHubIcon id={item.id} />
                </span>
                <p className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                  {item.label}
                </p>
                <span className="shrink-0 text-lg text-muted" aria-hidden>
                  ‹
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href={ROUTES.materials.hub}
          className="px-1 text-xs font-semibold text-primary"
        >
          كل الخامات ←
        </Link>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-bold text-foreground">الإعدادات</h2>
        <ul className="overflow-hidden rounded-2xl border border-border bg-card">
          {SETTINGS_LINKS.map((link, i) => (
            <li
              key={link.href}
              className={i > 0 ? "border-t border-border" : undefined}
            >
              <Link
                href={link.href}
                className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-primary-soft/40"
              >
                <div className="min-w-0 text-right">
                  <p className="text-sm font-medium text-foreground">
                    {link.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{link.description}</p>
                </div>
                <span className="shrink-0 text-muted" aria-hidden>
                  ‹
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* إبقاء المجموعات ظاهرة للمرجعية بدون إزعاج */}
      <p className="px-1 text-[11px] text-muted">
        {MATERIAL_HUB_GROUPS.map((g) => g.title).join(" · ")}
      </p>
    </AppShell>
  );
}
