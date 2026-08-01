"use client";

import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { getProjectById } from "@/lib/projects";
import { ROUTES } from "@/lib/routes";

export function ExpensesPageHeader() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project") ?? "";
  const project = projectId ? getProjectById(projectId) : undefined;

  if (project) {
    return (
      <PageHeader
        backHref={ROUTES.design.editor(project.customerId, project.id)}
        backLabel="المشروع"
        title="مصروفات المشروع"
        description="إجمالي المصروف · السجل · تسجيل مصروف جديد"
      />
    );
  }

  return (
    <PageHeader
      backHref={ROUTES.accounting.hub}
      backLabel="الحسابات"
      title="المصروفات"
      description="إجمالي المصروف · السجل · تسجيل مصروف جديد"
    />
  );
}
