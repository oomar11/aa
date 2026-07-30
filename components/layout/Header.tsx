"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { loadCompany } from "@/lib/company";

function WindowLogo() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 text-primary-foreground"
        fill="none"
        aria-hidden
      >
        <rect x="4" y="3" width="7" height="18" rx="1.5" fill="currentColor" />
        <rect x="13" y="3" width="7" height="18" rx="1.5" fill="currentColor" />
      </svg>
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="currentColor"
      aria-hidden
    >
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.07 7.07 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.55-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.42.34.68.24l2.39-.96c.5.39 1.04.7 1.63.94l.36 2.54c.05.24.26.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.59-.24 1.13-.55 1.63-.94l2.39.96c.26.1.54 0 .68-.24l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z" />
    </svg>
  );
}

export function Header() {
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

  return (
    <header className="flex items-center justify-between px-4 pt-4 pb-2">
      <Link href="/" className="flex min-w-0 items-center gap-2.5">
        <WindowLogo />
        <span className="truncate text-lg font-bold tracking-tight text-foreground">
          {companyName}
        </span>
      </Link>
      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />
        <Link
          href="/settings"
          className="flex h-10 w-10 items-center justify-center rounded-full text-primary transition-colors duration-300 hover:bg-primary-soft"
          aria-label="الإعدادات"
        >
          <SettingsIcon />
        </Link>
      </div>
    </header>
  );
}
