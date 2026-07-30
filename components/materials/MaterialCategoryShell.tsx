import type { Crumb } from "@/components/layout/AppBreadcrumb";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { MaterialWorkflowGuide } from "@/components/materials/MaterialWorkflowGuide";
import type { MaterialWorkflowStep } from "@/lib/materials-navigation";
import { ROUTES } from "@/lib/routes";

type MaterialCategoryShellProps = {
  title: string;
  description: string;
  breadcrumb?: Crumb[];
  workflowSteps?: MaterialWorkflowStep[];
  children: React.ReactNode;
};

/** غلاف موحد لصفحات فئات الخامات (قطاعات، اكسسوار، زجاج، حديد) */
export function MaterialCategoryShell({
  title,
  description,
  breadcrumb,
  workflowSteps,
  children,
}: MaterialCategoryShellProps) {
  return (
    <AppShell mainClassName="flex flex-1 flex-col gap-3 px-4 pb-24 pt-2">
      <PageHeader
        backHref={ROUTES.materials.hub}
        backLabel="رجوع للخامات"
        breadcrumb={breadcrumb}
        title={title}
        description={description}
      />
      {workflowSteps ? <MaterialWorkflowGuide steps={workflowSteps} /> : null}
      {children}
    </AppShell>
  );
}
