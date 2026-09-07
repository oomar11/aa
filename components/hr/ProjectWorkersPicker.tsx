"use client";

import { useEffect, useMemo, useState } from "react";
import { NumericInput } from "@/components/ui/NumericInput";
import {
  HR_UPDATED_EVENT,
  listAssignedEmployeeIds,
  loadEmployees,
  loadProjectAssignments,
  PAY_TYPE_LABELS,
  setAssignmentSharePercent,
  toggleProjectEmployee,
  type Employee,
  type ProjectAssignment,
} from "@/lib/hr";
import { projectSaleTotal } from "@/lib/project-money";
import { formatCurrency } from "@/lib/utils";

type Props = {
  projectId: string;
  compact?: boolean;
};

/**
 * اختيار عمال الشغلانة — يظهر في إعدادات المشروع وحسابه والورشة.
 */
export function ProjectWorkersPicker({ projectId, compact = false }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [open, setOpen] = useState(!compact);
  const [error, setError] = useState("");

  useEffect(() => {
    function refresh() {
      const assignedIds = listAssignedEmployeeIds(projectId);
      setAssignments(
        loadProjectAssignments().filter((row) => row.projectId === projectId)
      );
      setEmployees(
        loadEmployees()
          .filter((row) => row.status !== "left" || assignedIds.includes(row.id))
          .sort((a, b) => a.name.localeCompare(b.name, "ar"))
      );
    }
    refresh();
    window.addEventListener(HR_UPDATED_EVENT, refresh);
    window.addEventListener("upvc-projects-updated", refresh);
    return () => {
      window.removeEventListener(HR_UPDATED_EVENT, refresh);
      window.removeEventListener("upvc-projects-updated", refresh);
    };
  }, [projectId]);

  const assignmentByEmployee = useMemo(() => {
    const map = new Map<string, ProjectAssignment>();
    for (const row of assignments) map.set(row.employeeId, row);
    return map;
  }, [assignments]);

  const selected = assignments.map((row) => row.employeeId);
  const names = employees
    .filter((row) => selected.includes(row.id))
    .map((row) => row.name);
  const sale = projectSaleTotal(projectId);

  if (employees.length === 0) {
    return compact ? null : (
      <p className="text-xs text-muted">
        مفيش موظفين — أضفهم من المزيد ← الموظفين
      </p>
    );
  }

  function handleToggle(employeeId: string) {
    setError("");
    try {
      toggleProjectEmployee(projectId, employeeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تعديل التعيين");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl border border-border bg-card px-3 py-1.5 text-[11px] font-semibold"
        >
          {names.length > 0 ? `عمال (${names.length})` : "تعيين عمال"}
        </button>
      ) : (
        <p className="text-sm font-bold text-foreground">عمال الشغلانة</p>
      )}

      {!compact && names.length > 0 ? (
        <p className="text-xs text-muted">{names.join(" · ")}</p>
      ) : null}

      {error ? (
        <p className="text-[11px] font-medium text-[#E85A8A]">{error}</p>
      ) : null}

      {open ? (
        <ul className="flex flex-col gap-1">
          {employees.map((employee) => {
            const assignment = assignmentByEmployee.get(employee.id);
            const on = Boolean(assignment);
            const percent =
              assignment?.sharePercent ??
              (employee.payType === "percent"
                ? Number(employee.commissionPercent) || 0
                : 0);
            const estimate =
              on && employee.payType === "percent" && percent > 0
                ? Math.round((sale * Math.min(percent, 100)) / 100)
                : 0;
            return (
              <li key={employee.id}>
                <div className="rounded-xl border border-border bg-card px-3 py-2">
                  <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">
                      {employee.name}
                      <span className="ms-2 text-[11px] text-muted">
                        {employee.role}
                        {" · "}
                        {PAY_TYPE_LABELS[employee.payType]}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => handleToggle(employee.id)}
                    />
                  </label>
                  {on && employee.payType === "percent" ? (
                    <div className="mt-2 flex items-center gap-2">
                      <NumericInput
                        value={percent}
                        onChange={(value) =>
                          setAssignmentSharePercent(projectId, employee.id, value)
                        }
                        min={0}
                        max={100}
                        className="h-9 w-24 rounded-lg border border-border bg-background px-2 text-sm"
                      />
                      <span className="text-[11px] text-muted">
                        % من البيع
                        {sale > 0
                          ? ` · ${formatCurrency(estimate)} ج.م`
                          : " · بعد تحديد الحساب"}
                      </span>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : compact && names.length > 0 ? (
        <p className="px-0.5 text-[11px] text-muted">{names.join(" · ")}</p>
      ) : null}
    </div>
  );
}
