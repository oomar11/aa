"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExpenseForm } from "@/components/accounting/ExpenseForm";
import { ROUTES } from "@/lib/routes";

function NewExpenseContent() {
  const searchParams = useSearchParams();
  const isEditing = Boolean(searchParams.get("expense"));
  const fromProject = Boolean(searchParams.get("project"));

  return (
    <>
      <PageHeader
        backHref={
          fromProject && !isEditing
            ? ROUTES.workshop
            : ROUTES.accounting.expenses
        }
        backLabel={fromProject && !isEditing ? "الورشة" : "المصروفات"}
        title={isEditing ? "تعديل مصروف" : "تسجيل مصروف"}
        description={
          isEditing
            ? "عدّل المبلغ أو المشروع — يظهر في الحساب والربح والخزنة"
            : "مصروف ورشة عام أو مربوط بمشروع"
        }
      />
      <div className="mt-4">
        <ExpenseForm />
      </div>
    </>
  );
}

export default function NewExpensePage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted">
            جاري التحميل…
          </div>
        }
      >
        <NewExpenseContent />
      </Suspense>
    </AppShell>
  );
}
