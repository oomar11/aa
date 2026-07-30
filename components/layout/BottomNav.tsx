"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="3.5" fill={active ? "currentColor" : "none"} />
      <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
    </svg>
  );
}

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

/** RTL: أول عنصر في الـ DOM يظهر يمين → الرئيسية يمين، الحساب شمال */
const items = [
  { href: "/", label: "الرئيسية", Icon: HomeIcon },
  { href: "/profile", label: "الحساب", Icon: ProfileIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-20">
      <div className="mx-auto w-full max-w-md border-t border-border bg-card/95 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-around px-10">
          {items.map(({ href, label, Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex min-w-16 flex-col items-center gap-0.5 transition-colors duration-300 ${
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
