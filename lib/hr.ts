/**
 * موارد بشرية الورشة: موظفون · حضور · سلف · رواتب · تعيين على شغلانة.
 * التخزين مشترك (Supabase) مثل العملاء والحسابات.
 */

import {
  deleteExpense,
  getExpenseById,
  todayIsoDate,
  upsertExpense,
  type Expense,
  type StoreBridgeMeta,
} from "@/lib/accounting";
import { STORAGE_KEYS } from "@/lib/storage/keys";
import { sharedGetItem, sharedSetItem } from "@/lib/storage/shared-client";

export const HR_UPDATED_EVENT = "upvc-hr-updated";

export const EMPLOYEE_ROLES = [
  "قص",
  "لحام",
  "اكسسوار",
  "زجاج",
  "تركيب",
  "محاسب",
  "إدارة",
  "أخرى",
] as const;

export type EmployeeRole = (typeof EMPLOYEE_ROLES)[number] | string;

export type PayType = "daily" | "monthly";

export type EmployeeStatus = "active" | "left";

export type Employee = {
  id: string;
  name: string;
  phone?: string;
  role: EmployeeRole;
  payType: PayType;
  wage: number;
  hiredAt: string;
  status: EmployeeStatus;
  note?: string;
  createdAt: string;
};

export const PAY_TYPE_LABELS: Record<PayType, string> = {
  daily: "يومية",
  monthly: "شهري",
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: "شغال",
  left: "ساب",
};

export type AttendanceStatus = "present" | "absent" | "off" | "holiday";

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "حاضر",
  absent: "غايب",
  off: "أجازة",
  holiday: "إجازة رسمية",
};

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
};

export type Advance = {
  id: string;
  employeeId: string;
  amount: number;
  date: string;
  note?: string;
  createdAt: string;
  /** مجموع ما خُصم من هذه السلفة عبر الرواتب */
  settledAmount?: number;
  /** آخر راتب خصم منها */
  payrollId?: string;
  /** مصروف الأجور الذي سحب المبلغ من الخزنة */
  expenseId?: string;
  /** مزامنة الخزنة في المتجر (إن وُجد الربط) */
  storeBridge?: StoreBridgeMeta;
};

export type PayrollDeduction = {
  advanceId: string;
  amount: number;
};

export type PayrollStatus = "draft" | "paid";

export type Payroll = {
  id: string;
  employeeId: string;
  periodFrom: string;
  periodTo: string;
  daysWorked: number;
  baseAmount: number;
  advancesDeducted: number;
  netAmount: number;
  date: string;
  expenseId?: string;
  projectId?: string;
  status: PayrollStatus;
  note?: string;
  createdAt: string;
  deductions: PayrollDeduction[];
  storeBridge?: StoreBridgeMeta;
};

export type ProjectAssignment = {
  id: string;
  projectId: string;
  employeeId: string;
  assignedAt: string;
};

export type PayrollPreview = {
  employee: Employee;
  periodFrom: string;
  periodTo: string;
  daysWorked: number;
  baseAmount: number;
  openAdvances: number;
  advancesDeducted: number;
  netAmount: number;
  leftoverAdvances: number;
  deductions: PayrollDeduction[];
  alreadyPaid: Payroll | undefined;
};

function roundMoney(amount: number): number {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

function readArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sharedGetItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, items: T[]) {
  if (typeof window === "undefined") return;
  sharedSetItem(key, JSON.stringify(items));
  window.dispatchEvent(new Event(HR_UPDATED_EVENT));
}

export function loadEmployees(): Employee[] {
  return readArray<Employee>(STORAGE_KEYS.employees);
}

export function saveEmployees(employees: Employee[]) {
  writeArray(STORAGE_KEYS.employees, employees);
}

export function getEmployeeById(employeeId: string): Employee | undefined {
  return loadEmployees().find((row) => row.id === employeeId);
}

export function listActiveEmployees(): Employee[] {
  return loadEmployees()
    .filter((row) => row.status !== "left")
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

export function upsertEmployee(employee: Employee) {
  const all = [
    employee,
    ...loadEmployees().filter((row) => row.id !== employee.id),
  ];
  saveEmployees(all);
}

export function deleteEmployee(employeeId: string) {
  const paid = loadPayroll().some(
    (row) => row.employeeId === employeeId && row.status === "paid"
  );
  if (paid) {
    throw new Error("لا يمكن حذف موظف له رواتب مصروفة — غيّر حالته إلى «ساب»");
  }
  saveEmployees(loadEmployees().filter((row) => row.id !== employeeId));
  saveAttendance(
    loadAttendance().filter((row) => row.employeeId !== employeeId)
  );
  for (const advance of loadAdvances().filter(
    (row) => row.employeeId === employeeId
  )) {
    if (advance.expenseId) deleteExpense(advance.expenseId);
  }
  saveAdvances(loadAdvances().filter((row) => row.employeeId !== employeeId));
  savePayroll(loadPayroll().filter((row) => row.employeeId !== employeeId));
  saveProjectAssignments(
    loadProjectAssignments().filter((row) => row.employeeId !== employeeId)
  );
}

export function loadAttendance(): AttendanceRecord[] {
  return readArray<AttendanceRecord>(STORAGE_KEYS.attendance);
}

export function saveAttendance(rows: AttendanceRecord[]) {
  writeArray(STORAGE_KEYS.attendance, rows);
}

export function attendanceId(employeeId: string, date: string): string {
  return `att-${employeeId}-${date}`;
}

export function getAttendance(
  employeeId: string,
  date: string
): AttendanceRecord | undefined {
  const id = attendanceId(employeeId, date);
  return loadAttendance().find(
    (row) => row.id === id || (row.employeeId === employeeId && row.date === date)
  );
}

export function setAttendance(input: {
  employeeId: string;
  date: string;
  status: AttendanceStatus | null;
  note?: string;
}) {
  const id = attendanceId(input.employeeId, input.date);
  const rest = loadAttendance().filter(
    (row) =>
      row.id !== id &&
      !(row.employeeId === input.employeeId && row.date === input.date)
  );
  if (!input.status) {
    saveAttendance(rest);
    return;
  }
  saveAttendance([
    {
      id,
      employeeId: input.employeeId,
      date: input.date,
      status: input.status,
      note: input.note?.trim() || undefined,
    },
    ...rest,
  ]);
}

export function countPresentDays(
  employeeId: string,
  fromDate: string,
  toDate: string,
  rows: AttendanceRecord[] = loadAttendance()
): number {
  return rows.filter(
    (row) =>
      row.employeeId === employeeId &&
      row.status === "present" &&
      row.date >= fromDate &&
      row.date <= toDate
  ).length;
}

export function loadAdvances(): Advance[] {
  return readArray<Advance>(STORAGE_KEYS.advances);
}

export function saveAdvances(rows: Advance[]) {
  writeArray(STORAGE_KEYS.advances, rows);
}

export function advanceOpenAmount(advance: Advance): number {
  return roundMoney(
    Math.max(0, (Number(advance.amount) || 0) - (Number(advance.settledAmount) || 0))
  );
}

export function isAdvanceOpen(advance: Advance): boolean {
  return advanceOpenAmount(advance) > 0.004;
}

export function listOpenAdvances(
  employeeId: string,
  rows: Advance[] = loadAdvances()
): Advance[] {
  return rows
    .filter((row) => row.employeeId === employeeId && isAdvanceOpen(row))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}

export function employeeOpenAdvancesTotal(employeeId: string): number {
  return roundMoney(
    listOpenAdvances(employeeId).reduce((sum, row) => sum + advanceOpenAmount(row), 0)
  );
}

export function upsertAdvance(advance: Advance) {
  const all = [advance, ...loadAdvances().filter((row) => row.id !== advance.id)];
  saveAdvances(all);
}

export function getAdvanceById(advanceId: string): Advance | undefined {
  return loadAdvances().find((row) => row.id === advanceId);
}

function advanceExpenseDescription(employee: Employee) {
  return `سلفة ${employee.name}`;
}

export type RegisterAdvanceInput = {
  employeeId: string;
  amount: number;
  date?: string;
  note?: string;
  storeBridge?: StoreBridgeMeta;
};

/** تسجيل سلفة + مصروف أجور نقدي (يتسحب من الخزنة عند الربط) */
export function registerAdvance(input: RegisterAdvanceInput): Advance {
  const employee = getEmployeeById(input.employeeId);
  if (!employee) {
    throw new Error("الموظف غير موجود");
  }
  const amount = roundMoney(input.amount);
  if (!(amount > 0)) {
    throw new Error("أدخل مبلغ السلفة");
  }

  const advanceId = `adv-${Date.now()}`;
  const date = input.date || todayIsoDate();
  const createdAt = new Date().toISOString();
  const note = input.note?.trim() || undefined;
  const expenseId = `exp-${advanceId}`;

  upsertExpense({
    id: expenseId,
    category: "أجور",
    description: advanceExpenseDescription(employee),
    amount,
    date,
    note,
    createdAt,
    settlement: "cash",
    employeeId: employee.id,
    advanceId,
    storeBridge: input.storeBridge,
  });

  const advance: Advance = {
    id: advanceId,
    employeeId: employee.id,
    amount,
    date,
    note,
    createdAt,
    expenseId,
    storeBridge: input.storeBridge,
  };
  upsertAdvance(advance);
  return advance;
}

export function attachAdvanceStoreBridge(
  advanceId: string,
  storeBridge: StoreBridgeMeta
) {
  const advance = getAdvanceById(advanceId);
  if (!advance) return;
  const next: Advance = { ...advance, storeBridge };
  upsertAdvance(next);
  if (advance.expenseId) {
    const expense = getExpenseById(advance.expenseId);
    if (expense) {
      upsertExpense({ ...expense, storeBridge });
    }
  }
}

export function deleteAdvance(advanceId: string) {
  const existing = loadAdvances().find((row) => row.id === advanceId);
  if (existing && (existing.settledAmount ?? 0) > 0.004) {
    throw new Error("لا يمكن حذف سلفة اتخصمت من راتب");
  }
  if (existing?.expenseId) {
    deleteExpense(existing.expenseId);
  }
  saveAdvances(loadAdvances().filter((row) => row.id !== advanceId));
}

export function loadPayroll(): Payroll[] {
  return readArray<Payroll>(STORAGE_KEYS.payroll);
}

export function savePayroll(rows: Payroll[]) {
  writeArray(STORAGE_KEYS.payroll, rows);
}

export function getPayrollById(payrollId: string): Payroll | undefined {
  return loadPayroll().find((row) => row.id === payrollId);
}

export function findPaidPayroll(
  employeeId: string,
  periodFrom: string,
  periodTo: string
): Payroll | undefined {
  return loadPayroll().find(
    (row) =>
      row.employeeId === employeeId &&
      row.periodFrom === periodFrom &&
      row.periodTo === periodTo &&
      row.status === "paid"
  );
}

export function loadProjectAssignments(): ProjectAssignment[] {
  return readArray<ProjectAssignment>(STORAGE_KEYS.projectAssignments);
}

export function saveProjectAssignments(rows: ProjectAssignment[]) {
  writeArray(STORAGE_KEYS.projectAssignments, rows);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("upvc-projects-updated"));
  }
}

export function listAssignedEmployeeIds(projectId: string): string[] {
  return loadProjectAssignments()
    .filter((row) => row.projectId === projectId)
    .map((row) => row.employeeId);
}

export function listAssignedEmployees(projectId: string): Employee[] {
  const ids = new Set(listAssignedEmployeeIds(projectId));
  return loadEmployees()
    .filter((row) => ids.has(row.id))
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

export function assignedEmployeeNames(projectId: string): string {
  return listAssignedEmployees(projectId)
    .map((row) => row.name)
    .join(" · ");
}

export function toggleProjectEmployee(projectId: string, employeeId: string) {
  const all = loadProjectAssignments();
  const existing = all.find(
    (row) => row.projectId === projectId && row.employeeId === employeeId
  );
  if (existing) {
    saveProjectAssignments(all.filter((row) => row.id !== existing.id));
    return;
  }
  saveProjectAssignments([
    {
      id: `asg-${projectId}-${employeeId}`,
      projectId,
      employeeId,
      assignedAt: new Date().toISOString(),
    },
    ...all,
  ]);
}

export function currentMonthRange(now = new Date()): {
  from: string;
  to: string;
} {
  const y = now.getFullYear();
  const m = now.getMonth();
  const from = new Date(y, m, 1).toISOString().slice(0, 10);
  const to = new Date(y, m + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

export function periodLabel(from: string, to: string): string {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return `${from} — ${to}`;
  }
  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === 1
  ) {
    const last = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    if (end.getDate() === last.getDate()) {
      return new Intl.DateTimeFormat("ar-EG", {
        month: "long",
        year: "numeric",
      }).format(start);
    }
  }
  return `${from} — ${to}`;
}

function planAdvanceDeductions(
  advances: Advance[],
  cap: number
): { deductions: PayrollDeduction[]; deducted: number } {
  let remaining = roundMoney(Math.max(0, cap));
  const deductions: PayrollDeduction[] = [];
  for (const advance of advances) {
    if (remaining <= 0.004) break;
    const open = advanceOpenAmount(advance);
    if (open <= 0.004) continue;
    const take = roundMoney(Math.min(open, remaining));
    if (take <= 0.004) continue;
    deductions.push({ advanceId: advance.id, amount: take });
    remaining = roundMoney(remaining - take);
  }
  const deducted = roundMoney(deductions.reduce((sum, row) => sum + row.amount, 0));
  return { deductions, deducted };
}

export function previewPayroll(
  employee: Employee,
  periodFrom: string,
  periodTo: string
): PayrollPreview {
  const daysWorked = countPresentDays(employee.id, periodFrom, periodTo);
  const baseAmount =
    employee.payType === "daily"
      ? roundMoney(employee.wage * daysWorked)
      : roundMoney(employee.wage);
  const alreadyPaid = findPaidPayroll(employee.id, periodFrom, periodTo);
  const openList = listOpenAdvances(employee.id);
  const openAdvances = roundMoney(
    openList.reduce((sum, row) => sum + advanceOpenAmount(row), 0)
  );
  const { deductions, deducted } = planAdvanceDeductions(openList, baseAmount);
  const netAmount = roundMoney(Math.max(0, baseAmount - deducted));
  return {
    employee,
    periodFrom,
    periodTo,
    daysWorked,
    baseAmount,
    openAdvances,
    advancesDeducted: deducted,
    netAmount,
    leftoverAdvances: roundMoney(Math.max(0, openAdvances - deducted)),
    deductions,
    alreadyPaid,
  };
}

function applyDeductions(
  advances: Advance[],
  deductions: PayrollDeduction[],
  payrollId: string,
  reverse: boolean
): Advance[] {
  const delta = new Map<string, number>();
  for (const row of deductions) {
    delta.set(row.advanceId, (delta.get(row.advanceId) ?? 0) + row.amount);
  }
  return advances.map((advance) => {
    const change = delta.get(advance.id);
    if (!change) return advance;
    const nextSettled = roundMoney(
      Math.max(
        0,
        (Number(advance.settledAmount) || 0) + (reverse ? -change : change)
      )
    );
    const fullySettled = nextSettled >= roundMoney(advance.amount) - 0.004;
    return {
      ...advance,
      settledAmount: nextSettled > 0.004 ? nextSettled : undefined,
      payrollId: reverse
        ? advance.payrollId === payrollId
          ? fullySettled
            ? advance.payrollId
            : undefined
          : advance.payrollId
        : fullySettled
          ? payrollId
          : advance.payrollId ?? payrollId,
    };
  });
}

function payrollExpenseDescription(employee: Employee, from: string, to: string) {
  return `راتب ${employee.name} · ${periodLabel(from, to)}`;
}

export type PayPayrollInput = {
  employee: Employee;
  periodFrom: string;
  periodTo: string;
  date?: string;
  projectId?: string;
  note?: string;
  storeBridge?: StoreBridgeMeta;
};

export function payEmployeePayroll(input: PayPayrollInput): Payroll {
  const preview = previewPayroll(
    input.employee,
    input.periodFrom,
    input.periodTo
  );
  if (preview.alreadyPaid) {
    throw new Error("الراتب للفترة دي متصرف قبل كده");
  }

  const payrollId = `payr-${input.employee.id}-${input.periodFrom}-${Date.now()}`;
  const date = input.date || todayIsoDate();
  const createdAt = new Date().toISOString();
  const leftoverNote =
    preview.leftoverAdvances > 0.004
      ? `باقي سلف ${preview.leftoverAdvances} ج.م`
      : undefined;
  const note = [input.note?.trim(), leftoverNote].filter(Boolean).join(" · ");

  let expenseId: string | undefined;
  if (preview.netAmount > 0.004) {
    expenseId = `exp-${payrollId}`;
    const expense: Expense = {
      id: expenseId,
      category: "أجور",
      description: payrollExpenseDescription(
        input.employee,
        input.periodFrom,
        input.periodTo
      ),
      amount: preview.netAmount,
      date,
      projectId: input.projectId || undefined,
      note: note || undefined,
      createdAt,
      settlement: "cash",
      employeeId: input.employee.id,
      payrollId,
      storeBridge: input.storeBridge,
    };
    upsertExpense(expense);
  }

  const payroll: Payroll = {
    id: payrollId,
    employeeId: input.employee.id,
    periodFrom: input.periodFrom,
    periodTo: input.periodTo,
    daysWorked: preview.daysWorked,
    baseAmount: preview.baseAmount,
    advancesDeducted: preview.advancesDeducted,
    netAmount: preview.netAmount,
    date,
    expenseId,
    projectId: input.projectId || undefined,
    status: "paid",
    note: note || undefined,
    createdAt,
    deductions: preview.deductions,
    storeBridge: input.storeBridge,
  };

  saveAdvances(
    applyDeductions(loadAdvances(), preview.deductions, payrollId, false)
  );
  savePayroll([payroll, ...loadPayroll()]);
  return payroll;
}

export function attachPayrollStoreBridge(
  payrollId: string,
  storeBridge: StoreBridgeMeta
) {
  const payroll = getPayrollById(payrollId);
  if (!payroll) return;
  const next: Payroll = { ...payroll, storeBridge };
  savePayroll([next, ...loadPayroll().filter((row) => row.id !== payrollId)]);
  if (payroll.expenseId) {
    const expense = getExpenseById(payroll.expenseId);
    if (expense) {
      upsertExpense({ ...expense, storeBridge });
    }
  }
}

export function deletePaidPayroll(payrollId: string) {
  const payroll = getPayrollById(payrollId);
  if (!payroll) return;
  saveAdvances(
    applyDeductions(loadAdvances(), payroll.deductions ?? [], payrollId, true)
  );
  if (payroll.expenseId) {
    deleteExpense(payroll.expenseId);
  }
  savePayroll(loadPayroll().filter((row) => row.id !== payrollId));
}

export function hrHubSummary(now = new Date()) {
  const employees = loadEmployees();
  const active = employees.filter((row) => row.status !== "left");
  const today = todayIsoDate();
  const presentToday = active.filter(
    (row) => getAttendance(row.id, today)?.status === "present"
  ).length;
  const openAdvances = roundMoney(
    loadAdvances().reduce((sum, row) => sum + advanceOpenAmount(row), 0)
  );
  const { from, to } = currentMonthRange(now);
  const monthPayroll = loadPayroll().filter(
    (row) =>
      row.status === "paid" && row.periodFrom >= from && row.periodFrom <= to
  );
  const monthPaid = roundMoney(
    monthPayroll.reduce((sum, row) => sum + row.netAmount, 0)
  );
  return {
    activeCount: active.length,
    presentToday,
    openAdvances,
    monthPaid,
    monthPayrollCount: monthPayroll.length,
    periodFrom: from,
    periodTo: to,
  };
}
