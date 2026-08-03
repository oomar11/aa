"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/routes";

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10.5V20h12v-9.5" />
    </svg>
  );
}

function OrdersIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
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

function WorkshopIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 20h16" />
      <path d="M6 20V10l6-4 6 4v10" />
      <path d="M10 20v-4h4v4" />
      <path d="M9 12h.01M15 12h.01" />
    </svg>
  );
}

function AccountingIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
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

function MoreIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="6" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** RTL: أول عنصر يمين → الرئيسية يمين، المزيد شمال */
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
    href: ROUTES.workshop,
    label: "الورشة",
    Icon: WorkshopIcon,
    match: (p: string) => p.startsWith("/workshop"),
  },
  {
    href: ROUTES.accounting.hub,
    label: "الحسابات",
    Icon: AccountingIcon,
    match: (p: string) => p.startsWith("/accounting"),
  },
  {
    href: ROUTES.more,
    label: "المزيد",
    Icon: MoreIcon,
    match: (p: string) =>
      p.startsWith("/more") ||
      p.startsWith("/materials") ||
      p.startsWith("/settings") ||
      p.startsWith("/profile"),
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-20">
      <div className="mx-auto w-full max-w-lg border-t border-border bg-card/95 backdrop-blur-sm lg:max-w-5xl">
        <div className="flex h-14 items-center justify-around px-1">
          {items.map(({ href, label, Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={label}
                href={href}
                className={`flex min-w-12 flex-col items-center gap-0.5 transition-colors duration-300 ${
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
