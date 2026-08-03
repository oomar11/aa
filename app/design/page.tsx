import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ROUTES } from "@/lib/routes";

export default function DesignPage() {
  return (
    <AppShell
      showHeader={false}
      fullHeight
      mainClassName="flex flex-1 flex-col px-4 pb-24 pt-5"
    >
      <PageHeader backHref={ROUTES.orders} title="طلب جديد" />

      <div className="mt-8 flex w-full flex-col gap-3">
        <Link
          href={ROUTES.design.newCustomer}
          className="flex h-14 items-center justify-center rounded-2xl bg-primary text-base font-semibold text-white shadow-[0_6px_18px_rgba(43,125,233,0.28)] transition-all active:scale-[0.98]"
        >
          عميل جديد
        </Link>
        <Link
          href={ROUTES.design.customers}
          className="flex h-14 items-center justify-center rounded-2xl border border-border bg-card text-base font-semibold text-foreground transition-all active:scale-[0.98]"
        >
          عميل موجود
        </Link>
      </div>
    </AppShell>
  );
}
