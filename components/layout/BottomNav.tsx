"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/routes";

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" />
    </svg>
  );
}

function OrdersIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 4h8a2 2 0 0 1 2 2v14l-6-3-6 3V6a2 2 0 0 1 2-2z" />
      <path d="M10 9h4M10 13h3" />
    </svg>
  );
}

function AccountingIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h5M8 16h3" />
    </svg>
  );
}

function MaterialsIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="4" y="4" width="6" height="16" rx="1.5" />
      <rect x="14" y="4" width="6" height="16" rx="1.5" />
      <path d="M10 8h4M10 12h4M10 16h4" />
    </svg>
  );
}

/** RTL: أول عنصر في الـ DOM يظهر يمين → الرئيسية يمين، الخامات شمال */
const items = [
  {
    href: ROUTES.home,
    label: "الرئيسية",
    Icon: HomeIcon,
    match: (p: string) => p === "/",
  },
  {
    href: ROUTES.orders,
    label: "الطلبات",
    Icon: OrdersIcon,
    match: (p: string) => p.startsWith("/orders") || p.startsWith("/design"),
  },
  {
    href: ROUTES.accounting.hub,
    label: "الحسابات",
    Icon: AccountingIcon,
    match: (p: string) =>
      p.startsWith("/accounting") || p.startsWith("/settings/company"),
  },
  {
    href: ROUTES.materials.hub,
    label: "الخامات",
    Icon: MaterialsIcon,
    match: (p: string) => p.startsWith("/materials"),
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-20">
      <div className="mx-auto w-full max-w-md border-t border-border bg-card/95 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-around px-2">
          {items.map(({ href, label, Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={`flex min-w-14 flex-col items-center gap-0.5 transition-colors duration-300 ${
                  active ? "text-primary" : "text-muted"
                }`}
                aria-label={label}
                aria-current={active ? "page" : undefined}
              >
                <Icon active={active} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
