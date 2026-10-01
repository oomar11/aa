"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WindowLogo } from "@/components/brand/WindowLogo";
import { loadCompany } from "@/lib/company";
import { ROUTES } from "@/lib/routes";

export function Header() {
  // بيبدأ بالاسم الافتراضي دايماً (زي السيرفر بالظبط) عشان الـ hydration ميعملش
  // تعارض، وبعدين بيتحدّث من localStorage بعد أول تركيب — تحديث بعد المزامنة عادي.
  const [companyName, setCompanyName] = useState("الوهيدي");

  useEffect(() => {
    function refresh() {
      setCompanyName(loadCompany().name || "الوهيدي");
    }
    refresh();
    window.addEventListener("upvc-company-updated", refresh);
    return () => window.removeEventListener("upvc-company-updated", refresh);
  }, []);

  return (
    <header className="flex items-center justify-between px-4 pt-4 pb-2 print:hidden lg:hidden">
      <Link href={ROUTES.home} className="flex min-w-0 items-center gap-2.5">
        <WindowLogo />
        <span className="truncate text-lg font-bold tracking-tight text-foreground">
          {companyName}
        </span>
      </Link>
    </header>
  );
}
