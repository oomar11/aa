"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmployeeForm } from "@/components/hr/EmployeeForm";
import { ROUTES } from "@/lib/routes";

function EmployeeFormContent() {
  const searchParams = useSearchParams();
  const isEditing = Boolean(searchParams.get("employee"));

  return (
    <>
      <PageHeader
        backHref={ROUTES.hr.employees}
        backLabel="الموظفين"
        title={isEditing ? "تعديل موظف" : "موظف جديد"}
        description={isEditing ? "الاسم · الوظيفة · الأجر" : "أضف عامل الورشة"}
      />
      <div className="mt-4">
        <EmployeeForm />
      </div>
    </>
  );
}

export default function NewEmployeePage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted">
            جاري التحميل…
          </div>
        }
      >
        <EmployeeFormContent />
      </Suspense>
    </AppShell>
  );
}
