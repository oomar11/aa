import type { Crumb } from "@/components/layout/AppBreadcrumb";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ROUTES } from "@/lib/routes";

type MaterialCategoryShellProps = {
  title: string;
  description?: string;
  breadcrumb?: Crumb[];
  workflowSteps?: unknown;
  children: React.ReactNode;
};

/** غلاف موحد لصفحات فئات الخامات — رجوع + عنوان فقط */
export function MaterialCategoryShell({
  title,
  description,
  breadcrumb,
  children,
}: MaterialCategoryShellProps) {
  return (
    <AppShell mainClassName="flex flex-1 flex-col gap-3 px-4 pb-24 pt-2">
      <PageHeader
        backHref={ROUTES.materials.hub}
        title={title}
        description={description}
        breadcrumb={breadcrumb}
      />
      {children}
    </AppShell>
  );
}
