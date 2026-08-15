"use client";

import { useEffect, useState } from "react";
import {
  HR_UPDATED_EVENT,
  listAssignedEmployeeIds,
  loadEmployees,
  toggleProjectEmployee,
  type Employee,
} from "@/lib/hr";

type Props = {
  projectId: string;
  compact?: boolean;
};

/**
 * اختيار عمال الشغلانة — يظهر في إعدادات المشروع وحسابه والورشة.
 */
export function ProjectWorkersPicker({ projectId, compact = false }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(!compact);

  useEffect(() => {
    function refresh() {
      const assignedIds = listAssignedEmployeeIds(projectId);
      setSelected(assignedIds);
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

  const names = employees
    .filter((row) => selected.includes(row.id))
    .map((row) => row.name);

  if (employees.length === 0) {
    return compact ? null : (
      <p className="text-xs text-muted">
        مفيش موظفين — أضفهم من المزيد ← الموظفين
      </p>
    );
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

      {open ? (
        <ul className="flex flex-col gap-1">
          {employees.map((employee) => {
            const on = selected.includes(employee.id);
            return (
              <li key={employee.id}>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    {employee.name}
                    <span className="ms-2 text-[11px] text-muted">
                      {employee.role}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleProjectEmployee(projectId, employee.id)}
                  />
                </label>
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
