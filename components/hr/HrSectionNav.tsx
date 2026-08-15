"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/routes";

const ITEMS = [
  {
    href: ROUTES.hr.hub,
    label: "ملخص",
    match: (p: string) => p === "/hr" || p === "/hr/",
  },
  {
    href: ROUTES.hr.employees,
    label: "الموظفين",
    match: (p: string) => p.startsWith("/hr/employees"),
  },
  {
    href: ROUTES.hr.attendance,
    label: "الحضور",
    match: (p: string) => p.startsWith("/hr/attendance"),
  },
  {
    href: ROUTES.hr.advances,
    label: "السلف",
    match: (p: string) => p.startsWith("/hr/advances"),
  },
  {
    href: ROUTES.hr.payroll,
    label: "الرواتب",
    match: (p: string) => p.startsWith("/hr/payroll"),
  },
] as const;

/**
 * تبويبات قسم الموظفين على الكمبيوتر — الموبايل يفضل كروت الملخص.
 */
export function HrSectionNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="أقسام الموظفين"
      className="mb-4 hidden rounded-xl border border-border bg-card p-1 lg:grid lg:grid-cols-5"
    >
      {ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-center text-sm font-bold transition-colors ${
              active
                ? "bg-primary text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
