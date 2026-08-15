"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { WindowLogo } from "@/components/brand/WindowLogo";
import { DESKTOP_NAV_ITEMS, ReportsIcon } from "@/components/layout/app-nav";
import { loadCompany } from "@/lib/company";
import { ROUTES } from "@/lib/routes";

/**
 * قائمة جانبية للكمبيوتر — الأبواب الخمسة + الموظفين + تقارير الربح.
 * في RTL تظهر يمين الشاشة.
 */
export function DesktopSidebar() {
  const pathname = usePathname();
  const [companyName, setCompanyName] = useState(() =>
    typeof window === "undefined"
      ? "UPVC Design"
      : loadCompany().name || "UPVC Design"
  );

  useEffect(() => {
    function refresh() {
      setCompanyName(loadCompany().name || "UPVC Design");
    }
    window.addEventListener("upvc-company-updated", refresh);
    return () => window.removeEventListener("upvc-company-updated", refresh);
  }, []);

  const reportsActive = pathname.startsWith(ROUTES.accounting.reports);

  return (
    <aside className="desktop-sidebar hidden h-dvh w-60 shrink-0 flex-col border-e border-border bg-card print:hidden lg:sticky lg:top-0 lg:flex">
      <Link
        href={ROUTES.home}
        className="flex items-center gap-2.5 px-4 py-5"
      >
        <WindowLogo />
        <span className="truncate text-base font-bold tracking-tight text-foreground">
          {companyName}
        </span>
      </Link>

      <nav aria-label="أقسام البرنامج" className="flex flex-1 flex-col gap-1 px-3 pb-4">
        {DESKTOP_NAV_ITEMS.map(({ href, label, Icon, match }) => {
          const active =
            href === ROUTES.accounting.hub
              ? match(pathname) && !reportsActive
              : match(pathname);
          return (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "bg-primary-soft text-primary"
                  : "text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              <Icon active={active} />
              {label}
            </Link>
          );
        })}

        <div className="my-2 border-t border-border" />

        <Link
          href={ROUTES.accounting.reports}
          aria-current={reportsActive ? "page" : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
            reportsActive
              ? "bg-primary-soft text-primary"
              : "text-muted hover:bg-background hover:text-foreground"
          }`}
        >
          <ReportsIcon active={reportsActive} />
          تقارير الربح
        </Link>
      </nav>
    </aside>
  );
}
