"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadCompany } from "@/lib/company";
import { ROUTES } from "@/lib/routes";

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
      <Link href={ROUTES.home} className="flex min-w-0 items-center gap-2.5">
        <WindowLogo />
        <span className="truncate text-lg font-bold tracking-tight text-foreground">
          {companyName}
        </span>
      </Link>
    </header>
  );
}
