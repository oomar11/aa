import type { Crumb } from "@/components/layout/AppBreadcrumb";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { AppShell } from "@/components/layout/AppShell";
import { ScreenBack } from "@/components/layout/ScreenBack";

type MaterialDetailShellProps = {
  backHref: string;
  backLabel: string;
  breadcrumb?: Crumb[];
  children: React.ReactNode;
};

/** غلاف موحد لصفحات تفاصيل أنظمة الخامات */
export function MaterialDetailShell({
  backHref,
  backLabel,
  breadcrumb,
  children,
}: MaterialDetailShellProps) {
  return (
    <AppShell mainClassName="flex flex-1 flex-col gap-3 px-4 pb-24 pt-2">
      <ScreenBack href={backHref} className="mb-1 px-1">
        {backLabel}
      </ScreenBack>
      {breadcrumb && breadcrumb.length > 0 ? (
        <AppBreadcrumb className="px-1" items={breadcrumb} />
      ) : null}
      {children}
    </AppShell>
  );
}
