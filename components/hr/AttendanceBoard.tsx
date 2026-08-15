"use client";

import { useEffect, useState } from "react";
import { todayIsoDate } from "@/lib/accounting";
import {
  ATTENDANCE_STATUS_LABELS,
  HR_UPDATED_EVENT,
  listActiveEmployees,
  loadAttendance,
  setAttendance,
  type AttendanceRecord,
  type AttendanceStatus,
  type Employee,
} from "@/lib/hr";
import { formatDate } from "@/lib/utils";

const STATUSES: AttendanceStatus[] = ["present", "absent", "off", "holiday"];

const STATUS_CLASS: Record<AttendanceStatus, string> = {
  present: "bg-[#2F9B7A] text-white",
  absent: "bg-[#E85A8A] text-white",
  off: "bg-[#C47A12] text-white",
  holiday: "border border-border bg-card text-foreground",
};

export function AttendanceBoard() {
  const [date, setDate] = useState(todayIsoDate);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rows, setRows] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    function refresh() {
      setEmployees(listActiveEmployees());
      setRows(loadAttendance());
    }
    refresh();
    window.addEventListener(HR_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(HR_UPDATED_EVENT, refresh);
  }, []);

  const attendanceByEmployee = new Map<string, AttendanceStatus>();
  for (const row of rows) {
    if (row.date === date) attendanceByEmployee.set(row.employeeId, row.status);
  }

  const presentCount = employees.filter(
    (row) => attendanceByEmployee.get(row.id) === "present"
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1.5 text-right">
          <span className="text-sm font-medium">اليوم</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <p className="text-xs text-muted">
          {formatDate(date)} · حاضر {presentCount} من {employees.length}
        </p>
      </div>

      {employees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
          أضف موظفين أولاً من قائمة الموظفين
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card lg:block">
            <table className="w-full min-w-[680px] text-start text-sm">
              <thead className="bg-background text-[11px] text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">الموظف</th>
                  <th className="px-3 py-2.5 font-semibold">الوظيفة</th>
                  {STATUSES.map((status) => (
                    <th key={status} className="px-3 py-2.5 text-center font-semibold">
                      {ATTENDANCE_STATUS_LABELS[status]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => {
                  const current = attendanceByEmployee.get(employee.id);
                  return (
                    <tr
                      key={employee.id}
                      className="border-t border-border hover:bg-primary-soft/20"
                    >
                      <td className="px-4 py-2 font-bold">{employee.name}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted">
                        {employee.role}
                      </td>
                      {STATUSES.map((status) => {
                        const selected = current === status;
                        return (
                          <td key={status} className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setAttendance({
                                  employeeId: employee.id,
                                  date,
                                  status: selected ? null : status,
                                })
                              }
                              className={`min-w-[4.5rem] rounded-xl px-2 py-1.5 text-[11px] font-bold transition-all ${
                                selected
                                  ? STATUS_CLASS[status]
                                  : "border border-border bg-background text-muted"
                              }`}
                            >
                              {selected ? "✓" : "—"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-2 lg:hidden">
          {employees.map((employee) => {
            const current = attendanceByEmployee.get(employee.id);
            return (
              <li
                key={employee.id}
                className="rounded-2xl border border-border bg-card px-3.5 py-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-bold">{employee.name}</p>
                  <p className="shrink-0 text-[11px] text-muted">
                    {employee.role}
                  </p>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {STATUSES.map((status) => {
                    const selected = current === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() =>
                          setAttendance({
                            employeeId: employee.id,
                            date,
                            status: selected ? null : status,
                          })
                        }
                        className={`rounded-xl px-1.5 py-2 text-[11px] font-bold transition-all active:scale-[0.98] ${
                          selected
                            ? STATUS_CLASS[status]
                            : "border border-border bg-background text-muted"
                        }`}
                      >
                        {ATTENDANCE_STATUS_LABELS[status]}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
        </>
      )}
    </div>
  );
}
