"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getAccountingSummary,
  loadExpenses,
  loadInvoices,
  loadPayments,
  type AccountingSummary,
} from "@/lib/accounting";
import { DEFAULT_COMPANY, loadCompany, type Company } from "@/lib/company";
import { ROUTES } from "@/lib/routes";
import { formatCurrency } from "@/lib/utils";

const links = [
  {
    href: ROUTES.accounting.payments,
    title: "الدفعات",
    description: "استلام فلوس العميل وربطها بمشروع",
    accent: "bg-primary",
  },
  {
    href: ROUTES.accounting.invoices,
    title: "الفواتير",
    description: "فواتير البيع والمتبقي",
    accent: "bg-[#2F9B7A]",
  },
  {
    href: ROUTES.accounting.expenses,
    title: "سجل المصروفات",
    description: "عرض مصروفات كل المشاريع — التسجيل من داخل المشروع",
    accent: "bg-[#E8956F]",
  },
  {
    href: ROUTES.settingsCompany,
    title: "بيانات الشركة",
    description: "الاسم · الهاتف · السجل الضريبي",
    accent: "bg-[#6B7C93]",
  },
] as const;

function readSummary(): AccountingSummary {
  if (typeof window === "undefined") {
    return { invoiced: 0, collected: 0, outstanding: 0, expenses: 0, net: 0 };
  }
  return getAccountingSummary(loadInvoices(), loadPayments(), loadExpenses());
}

function readCompany(): Company {
  if (typeof window === "undefined") return DEFAULT_COMPANY;
  return loadCompany();
}

export function AccountingHub() {
  const [company, setCompany] = useState(readCompany);
  const [summary, setSummary] = useState(readSummary);

  useEffect(() => {
    function refresh() {
      setCompany(loadCompany());
      setSummary(
        getAccountingSummary(loadInvoices(), loadPayments(), loadExpenses())
      );
    }
    window.addEventListener("upvc-accounting-updated", refresh);
    window.addEventListener("upvc-company-updated", refresh);
    return () => {
      window.removeEventListener("upvc-accounting-updated", refresh);
      window.removeEventListener("upvc-company-updated", refresh);
    };
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl bg-[#1F6B55] px-4 py-5 text-white shadow-[0_8px_24px_rgba(47,155,122,0.28)]">
        <p className="text-xs font-medium opacity-85">الحسابات</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {company.name}
        </h1>
        <p className="mt-2 text-sm leading-relaxed opacity-90">
          استلم دفعات العملاء من هنا. مصروفات كل مشروع تُسجَّل من داخل المشروع
          نفسه.
        </p>
        <div className="mt-4">
          <Link
            href={ROUTES.accounting.newPayment}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-white text-sm font-bold text-[#1F6B55] transition-all hover:brightness-105 active:scale-[0.98]"
          >
            استلام دفعة
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5">
        <SummaryTile label="المحصّل" value={summary.collected} tone="good" />
        <SummaryTile label="المفوتر" value={summary.invoiced} tone="neutral" />
        <SummaryTile
          label="المتبقي عند العملاء"
          value={summary.outstanding}
          tone="warn"
        />
        <SummaryTile
          label="صافي بعد المصروفات"
          value={summary.net}
          tone={summary.net >= 0 ? "good" : "warn"}
        />
      </section>

      <section className="flex flex-col gap-2.5">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 active:scale-[0.99]"
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${link.accent} text-sm font-bold text-white`}
              aria-hidden
            >
              {link.title.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1 text-right">
              <p className="text-sm font-bold text-foreground">{link.title}</p>
              <p className="mt-0.5 text-xs text-muted">{link.description}</p>
            </div>
            <span className="text-muted" aria-hidden>
              ‹
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "good" | "warn";
}) {
  const valueClass =
    tone === "good"
      ? "text-[#2F9B7A]"
      : tone === "warn"
        ? "text-[#E85A8A]"
        : "text-foreground";

  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-3">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className={`mt-1 text-base font-bold tabular-nums ${valueClass}`}>
        {formatCurrency(value)}
        <span className="mr-1 text-[10px] font-semibold text-muted">ج.م</span>
      </p>
    </div>
  );
}
