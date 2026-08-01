import type { ReactNode } from "react";
import type { Project, ProjectWorkflow } from "@/lib/projects";
import {
  DELIVERY_LABELS,
  DELIVERY_VISUAL,
  HOLD_VISUAL,
  isProjectOnHold,
  projectDeliveryStatus,
  WORKFLOW_VISUAL,
} from "@/lib/workshop";

type Props = {
  workflow: ProjectWorkflow;
  /** solid للتمييز القوي (التالي / قيد الشغل) */
  solid?: boolean;
  className?: string;
  children?: ReactNode;
  /** مشروع كامل — يعرض متوقف / جاهز للتسليم / تم التسليم عند اللزوم */
  project?: Pick<Project, "holdReason" | "workflow" | "deliveryStatus" | "deliveredAt">;
};

/** شارة حالة المشروع — ألوان موحّدة عبر التطبيق */
export function WorkflowBadge({
  workflow,
  solid = false,
  className = "",
  children,
  project,
}: Props) {
  if (project && isProjectOnHold(project as Project)) {
    return (
      <span
        className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide ${
          solid ? HOLD_VISUAL.badgeSolid : HOLD_VISUAL.badge
        } ${className}`}
      >
        {children ?? `متوقف${project.holdReason ? ` · ${project.holdReason}` : ""}`}
      </span>
    );
  }

  if (project && project.workflow === "done") {
    const delivery = projectDeliveryStatus(project as Project);
    if (delivery) {
      const visual = DELIVERY_VISUAL[delivery];
      return (
        <span
          className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide ${
            solid ? visual.badgeSolid : visual.badge
          } ${className}`}
        >
          {children ?? DELIVERY_LABELS[delivery]}
        </span>
      );
    }
  }

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
