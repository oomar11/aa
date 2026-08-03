import { AppShell } from "@/components/layout/AppShell";
import { ScreenBack } from "@/components/layout/ScreenBack";

type MaterialDetailShellProps = {
  backHref: string;
  backLabel?: string;
  breadcrumb?: unknown;
  children: React.ReactNode;
};

/** غلاف موحد لصفحات تفاصيل أنظمة الخامات — رجوع فقط */
export function MaterialDetailShell({
  backHref,
  backLabel = "رجوع",
  children,
}: MaterialDetailShellProps) {
  return (
    <AppShell mainClassName="flex flex-1 flex-col gap-3 px-4 pb-24 pt-2">
      <ScreenBack href={backHref} className="mb-1 px-1">
        {backLabel}
      </ScreenBack>
      {children}
    </AppShell>
  );
}
