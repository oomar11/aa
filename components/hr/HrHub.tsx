"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ScreenBack } from "@/components/layout/ScreenBack";
import { HrSectionNav } from "@/components/hr/HrSectionNav";
import {
  currentMonthRange,
  HR_UPDATED_EVENT,
  hrHubSummary,
  periodLabel,
} from "@/lib/hr";
import { ROUTES } from "@/lib/routes";
import { formatCurrency } from "@/lib/utils";

const LINKS = [
  {
    href: ROUTES.hr.employees,
    title: "الموظفين",
    description: "ملف العامل · الوظيفة · اليومية أو الشهري",
  },
  {
    href: ROUTES.hr.attendance,
    title: "الحضور",
    description: "حاضر · غايب · أجازة — لليوم",
  },
  {
    href: ROUTES.hr.advances,
    title: "السلف",
    description: "بتتخصم تلقائي عند صرف الراتب",
  },
  {
    href: ROUTES.hr.payroll,
    title: "صرف الرواتب",
    description: "يسجّل مصروف أجور ويسحب من الخزنة",
  },
] as const;

export function HrHub() {
  const [summary, setSummary] = useState(() =>
    typeof window === "undefined"
      ? {
          activeCount: 0,
          presentToday: 0,
          openAdvances: 0,
          monthPaid: 0,
          monthPayrollCount: 0,
          periodFrom: "",
          periodTo: "",
        }
      : hrHubSummary()
  );

  useEffect(() => {
    function refresh() {
      setSummary(hrHubSummary());
    }
    refresh();
    window.addEventListener(HR_UPDATED_EVENT, refresh);
    window.addEventListener("upvc-accounting-updated", refresh);
    return () => {
      window.removeEventListener(HR_UPDATED_EVENT, refresh);
      window.removeEventListener("upvc-accounting-updated", refresh);
    };
  }, []);

  const month = currentMonthRange();

  return (
    <div className="flex flex-col gap-5">
      <ScreenBack href={ROUTES.more} className="lg:hidden">
        المزيد
      </ScreenBack>
      <HrSectionNav />
      <section className="rounded-2xl bg-[#5B6ABF] px-4 py-5 text-white shadow-[0_8px_24px_rgba(91,106,191,0.28)] lg:px-6 lg:py-6">
        <p className="text-xs font-medium opacity-85">الموارد البشرية</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">الموظفين</h1>
        <p className="mt-1 text-xs opacity-80">
          مربوط بالحسابات والورشة — الراتب مصروف أجور
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
          <HubStat label="شغالين" value={String(summary.activeCount)} />
          <HubStat
            label="حضور اليوم"
            value={`${summary.presentToday}`}
          />
          <HubStat
            label="سلف مفتوحة"
            value={`${formatCurrency(summary.openAdvances)} ج.م`}
          />
          <HubStat
            label={periodLabel(month.from, month.to)}
            value={`${formatCurrency(summary.monthPaid)} ج.م`}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2.5 lg:grid lg:grid-cols-4 lg:gap-3">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/30 active:scale-[0.99] lg:flex-col lg:items-start lg:gap-2 lg:p-5"
          >
            <span
              className="h-10 w-1.5 shrink-0 rounded-full bg-[#5B6ABF] lg:h-1.5 lg:w-10"
              aria-hidden
            />
            <div className="min-w-0 flex-1 text-right lg:w-full">
              <p className="text-sm font-bold text-foreground">{link.title}</p>
              <p className="mt-0.5 text-xs text-muted">{link.description}</p>
            </div>
            <span className="text-muted lg:hidden" aria-hidden>
              ‹
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}

function HubStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 px-3 py-2.5">
      <p className="text-[11px] opacity-80">{label}</p>
      <p className="mt-0.5 text-sm font-bold tabular-nums lg:text-lg">{value}</p>
    </div>
  );
}
