"use client";

import { ROUTES } from "@/lib/routes";

export function HomeIcon({ active }: { active: boolean }) {
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

export function OrdersIcon({ active }: { active: boolean }) {
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

export function WorkshopIcon({ active }: { active: boolean }) {
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

export function AccountingIcon({ active }: { active: boolean }) {
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

export function MoreIcon({ active }: { active: boolean }) {
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

export function ReportsIcon({ active }: { active: boolean }) {
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
      <path d="M4 19V9" />
      <path d="M10 19V5" />
      <path d="M16 19v-7" />
      <path d="M22 19V8" />
    </svg>
  );
}

export function HrIcon({ active }: { active: boolean }) {
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
      <path d="M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5 1.34 3.5 3 3.5Z" />
      <path d="M8 11c1.66 0 3-1.57 3-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11Z" />
      <path d="M3 20v-1c0-2.76 2.24-5 5-5h.5" />
      <path d="M21 20v-1c0-2.76-2.24-5-5-5h-.5" />
      <path d="M9.5 20v-1.2c0-2 1.8-3.8 4-3.8h1c2.2 0 4 1.8 4 3.8V20" />
    </svg>
  );
}

/** RTL: أول عنصر يمين → الرئيسية يمين، المزيد شمال */
export const NAV_ITEMS = [
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
      p.startsWith("/hr") ||
      p.startsWith("/materials") ||
      p.startsWith("/settings") ||
      p.startsWith("/profile"),
  },
] as const;

/** قائمة الكمبيوتر: الأبواب الخمسة + الموظفين كباب مستقل */
export const DESKTOP_NAV_ITEMS = [
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
    href: ROUTES.hr.hub,
    label: "الموظفين",
    Icon: HrIcon,
    match: (p: string) => p.startsWith("/hr"),
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
