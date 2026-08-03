import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { MaterialHubIcon } from "@/components/materials/MaterialHubIcons";
import {
  MATERIAL_HUB_GROUPS,
  MATERIAL_HUB_ITEMS,
} from "@/lib/material-systems";
import { ROUTES } from "@/lib/routes";

export default function MaterialsPage() {
  return (
    <AppShell mainClassName="flex flex-1 flex-col gap-3 px-4 pb-24 pt-2">
      <PageHeader
        backHref={ROUTES.more}
        title="الخامات"
      />

      <div className="flex flex-col gap-5">
        {MATERIAL_HUB_GROUPS.map((group) => {
          const items = MATERIAL_HUB_ITEMS.filter((i) => i.group === group.id);
          return (
            <section key={group.id} className="flex flex-col gap-2">
              <h2 className="px-1 text-sm font-bold text-foreground">
                {group.title}
              </h2>

              <ul className="overflow-hidden rounded-2xl border border-border bg-card">
                {items.map((item, i) => (
                  <li
                    key={item.id}
                    className={i > 0 ? "border-t border-border" : undefined}
                  >
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-3.5 transition-colors hover:bg-primary-soft/40 active:bg-primary-soft/60"
                    >
                      <span
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
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
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
