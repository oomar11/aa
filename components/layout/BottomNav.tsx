"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/layout/app-nav";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 print:hidden lg:hidden">
      <div className="mx-auto w-full max-w-lg border-t border-border bg-card/95 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-around px-1">
          {NAV_ITEMS.map(({ href, label, Icon, match }) => {
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
