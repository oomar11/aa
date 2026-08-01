import type { ReactNode } from "react";
import type { ProjectWorkflow } from "@/lib/projects";
import { WORKFLOW_VISUAL } from "@/lib/workshop";

type Props = {
  workflow: ProjectWorkflow;
  /** solid للتمييز القوي (التالي / قيد الشغل) */
  solid?: boolean;
  className?: string;
  children?: ReactNode;
};

/** شارة حالة المشروع — ألوان موحّدة عبر التطبيق */
export function WorkflowBadge({
  workflow,
  solid = false,
  className = "",
  children,
}: Props) {
  const visual = WORKFLOW_VISUAL[workflow];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide ${
        solid ? visual.badgeSolid : visual.badge
      } ${className}`}
    >
      {children ?? visual.label}
    </span>
  );
}
