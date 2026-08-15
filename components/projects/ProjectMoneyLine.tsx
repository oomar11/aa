"use client";

import { getProjectMoneySummary } from "@/lib/project-money";
import { formatCurrency } from "@/lib/utils";

type Props = {
  projectId: string;
  className?: string;
};

/** سطر مختصر: حساب · مدفوع · باقي · مصروف */
export function ProjectMoneyLine({ projectId, className = "" }: Props) {
  const money = getProjectMoneySummary(projectId);

  return (
    <p
      className={`text-[11px] font-medium leading-relaxed text-muted ${className}`}
    >
      حساب{" "}
      <span className="tabular-nums text-foreground">
        {formatCurrency(money.sale)}
      </span>
      {" · "}
      مدفوع{" "}
      <span className="tabular-nums text-[#2F9B7A]">
        {formatCurrency(money.paid)}
      </span>
      {" · "}
      باقي{" "}
      <span
        className={`tabular-nums ${
          money.remaining > 0 ? "text-[#E85A8A]" : "text-[#2F9B7A]"
        }`}
      >
        {formatCurrency(money.remaining)}
      </span>
      {" · "}
      مصروف{" "}
      <span className="tabular-nums text-[#C45C26]">
        {formatCurrency(money.expenses)}
      </span>
    </p>
  );
}
