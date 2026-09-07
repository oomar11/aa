/**
 * موارد بشرية الورشة: موظفون · حضور · سلف · مكافآت · رواتب تراكمية · تعيين على شغلانة.
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
import { projectSaleTotal } from "@/lib/project-money";
import { getProjectById } from "@/lib/projects";
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

export type PayType = "daily" | "monthly" | "percent" | "manual";

export type EmployeeStatus = "active" | "left";

export type Employee = {
  id: string;
  name: string;
  phone?: string;
  role: EmployeeRole;
  payType: PayType;
  wage: number;
  /** نسبة افتراضية من صافي بيع الشغلانة (لنوع «نسبة من الشغل») */
  commissionPercent?: number;
  hiredAt: string;
  status: EmployeeStatus;
  note?: string;
  createdAt: string;
};

export const PAY_TYPE_LABELS: Record<PayType, string> = {
  daily: "يومية",
  monthly: "شهري",
  percent: "نسبة من الشغل",
  manual: "بدون ثابت",
};

export const PAY_TYPES: PayType[] = ["daily", "monthly", "percent", "manual"];

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

export type Bonus = {
  id: string;
  employeeId: string;
  amount: number;
  date: string;
  note?: string;
  projectId?: string;
  createdAt: string;
  settledAmount?: number;
  payrollId?: string;
};

export type PayrollDeduction = {
  advanceId: string;
  amount: number;
};

export type PayrollDaySettlement = {
  date: string;
  amount: number;
};

export type PayrollMonthSettlement = {
  month: string;
  amount: number;
};

export type PayrollShareSettlement = {
  assignmentId: string;
  amount: number;
};

export type PayrollBonusSettlement = {
  bonusId: string;
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
  payType?: PayType;
  bonusesAdded?: number;
  percentAmount?: number;
  manualAmount?: number;
  /** توافق قديم: أيام حضور اتسددت بالكامل */
  settledDates?: string[];
  daySettlements?: PayrollDaySettlement[];
  monthSettlements?: PayrollMonthSettlement[];
  shareSettlements?: PayrollShareSettlement[];
  bonusSettlements?: PayrollBonusSettlement[];
};

export type ProjectAssignment = {
  id: string;
  projectId: string;
  employeeId: string;
  assignedAt: string;
  /** نسبة هذا العامل من صافي بيع الشغلانة */
  sharePercent?: number;
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

export type OpenShareLine = {
  assignmentId: string;
  projectId: string;
  projectName: string;
  percent: number;
  sale: number;
  amount: number;
};

export type OpenMonthLine = {
  month: string;
  amount: number;
};

export type OpenDayLine = {
  date: string;
  amount: number;
};

export type BalancePreview = {
  employee: Employee;
  unpaidDays: number;
  unpaidDayDates: string[];
  dayLines: OpenDayLine[];
  dailyAmount: number;
  unpaidMonths: number;
  unpaidMonthKeys: string[];
  monthLines: OpenMonthLine[];
  monthlyAmount: number;
  percentAmount: number;
  percentLines: OpenShareLine[];
  bonusAmount: number;
  openBonuses: Bonus[];
  accruedAmount: number;
  openAdvances: number;
  advancesDeducted: number;
  netAmount: number;
  leftoverAdvances: number;
  deductions: PayrollDeduction[];
  accountLabel: string;
};

type EarningItem =
  | { kind: "day"; date: string; amount: number }
  | { kind: "month"; month: string; amount: number }
  | { kind: "share"; assignmentId: string; amount: number }
  | { kind: "bonus"; bonusId: string; amount: number };

function roundMoney(amount: number): number {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function isoDateYmd(year: number, monthIndex0: number, day: number): string {
  return `${year}-${pad2(monthIndex0 + 1)}-${pad2(day)}`;
}

function monthKeyFromIso(isoDate: string): string {
  return (isoDate || "").slice(0, 7);
}

function monthRange(monthKey: string): { from: string; to: string } {
  const [yRaw, mRaw] = monthKey.split("-");
  const year = Number(yRaw);
  const month = Number(mRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1) {
    return { from: monthKey, to: monthKey };
  }
  const last = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${pad2(month)}-01`,
    to: `${year}-${pad2(month)}-${pad2(last)}`,
  };
}

function listMonthKeysInclusive(fromIso: string, toIso: string): string[] {
  const fromKey = monthKeyFromIso(fromIso);
  const toKey = monthKeyFromIso(toIso);
  if (!/^\d{4}-\d{2}$/.test(fromKey) || !/^\d{4}-\d{2}$/.test(toKey)) {
    return [];
  }
  const [fy, fm] = fromKey.split("-").map(Number);
  const [ty, tm] = toKey.split("-").map(Number);
  const keys: string[] = [];
  let y = fy;
  let m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    keys.push(`${y}-${pad2(m)}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return keys;
}

export function normalizePayType(value: unknown): PayType {
  if (
    value === "daily" ||
    value === "monthly" ||
    value === "percent" ||
    value === "manual"
  ) {
    return value;
  }
  return "monthly";
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
  return readArray<Employee>(STORAGE_KEYS.employees).map((row) => ({
    ...row,
    payType: normalizePayType(row.payType),
    wage: Math.max(0, Number(row.wage) || 0),
    commissionPercent:
      row.commissionPercent == null
        ? undefined
        : Math.max(0, Number(row.commissionPercent) || 0),
  }));
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
  saveBonuses(loadBonuses().filter((row) => row.employeeId !== employeeId));
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

export function loadBonuses(): Bonus[] {
  return readArray<Bonus>(STORAGE_KEYS.bonuses);
}

export function saveBonuses(rows: Bonus[]) {
  writeArray(STORAGE_KEYS.bonuses, rows);
}

export function bonusOpenAmount(bonus: Bonus): number {
  return roundMoney(
    Math.max(0, (Number(bonus.amount) || 0) - (Number(bonus.settledAmount) || 0))
  );
}

export function isBonusOpen(bonus: Bonus): boolean {
  return bonusOpenAmount(bonus) > 0.004;
}

export function listOpenBonuses(
  employeeId: string,
  rows: Bonus[] = loadBonuses()
): Bonus[] {
  return rows
    .filter((row) => row.employeeId === employeeId && isBonusOpen(row))
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)
    );
}

export function employeeOpenBonusesTotal(employeeId: string): number {
  return roundMoney(
    listOpenBonuses(employeeId).reduce((sum, row) => sum + bonusOpenAmount(row), 0)
  );
}

export function upsertBonus(bonus: Bonus) {
  const all = [bonus, ...loadBonuses().filter((row) => row.id !== bonus.id)];
  saveBonuses(all);
}

export function getBonusById(bonusId: string): Bonus | undefined {
  return loadBonuses().find((row) => row.id === bonusId);
}

export type RegisterBonusInput = {
  employeeId: string;
  amount: number;
  date?: string;
  note?: string;
  projectId?: string;
};

/** تسجيل مكافأة على المستحق — المصروف يتسجل عند صرف الراتب فقط */
export function registerBonus(input: RegisterBonusInput): Bonus {
  const employee = getEmployeeById(input.employeeId);
  if (!employee) {
    throw new Error("الموظف غير موجود");
  }
  const amount = roundMoney(input.amount);
  if (!(amount > 0)) {
    throw new Error("أدخل مبلغ المكافأة");
  }
  const bonus: Bonus = {
    id: `bon-${Date.now()}`,
    employeeId: employee.id,
    amount,
    date: input.date || todayIsoDate(),
    note: input.note?.trim() || undefined,
    projectId: input.projectId || undefined,
    createdAt: new Date().toISOString(),
  };
  upsertBonus(bonus);
  return bonus;
}

export function deleteBonus(bonusId: string) {
  const existing = loadBonuses().find((row) => row.id === bonusId);
  if (existing && (existing.settledAmount ?? 0) > 0.004) {
    throw new Error("لا يمكن حذف مكافأة اتخصمت من راتب");
  }
  saveBonuses(loadBonuses().filter((row) => row.id !== bonusId));
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

export function getAssignment(
  projectId: string,
  employeeId: string
): ProjectAssignment | undefined {
  return loadProjectAssignments().find(
    (row) => row.projectId === projectId && row.employeeId === employeeId
  );
}

function assignmentSettledTotal(
  assignmentId: string,
  payrolls: Payroll[] = loadPayroll()
): number {
  let sum = 0;
  for (const payroll of payrolls) {
    if (payroll.status !== "paid") continue;
    for (const row of payroll.shareSettlements ?? []) {
      if (row.assignmentId === assignmentId) sum += Number(row.amount) || 0;
    }
  }
  return roundMoney(sum);
}

export function assignmentShareAmount(assignment: ProjectAssignment, employee?: Employee): number {
  const worker = employee ?? getEmployeeById(assignment.employeeId);
  const percent =
    assignment.sharePercent ??
    (worker?.payType === "percent" ? worker.commissionPercent : undefined) ??
    0;
  if (!(percent > 0)) return 0;
  const sale = projectSaleTotal(assignment.projectId);
  return roundMoney((Math.max(0, sale) * Math.min(percent, 100)) / 100);
}

export function assignmentOpenShareAmount(
  assignment: ProjectAssignment,
  employee?: Employee
): number {
  const full = assignmentShareAmount(assignment, employee);
  return roundMoney(Math.max(0, full - assignmentSettledTotal(assignment.id)));
}

export function toggleProjectEmployee(projectId: string, employeeId: string) {
  const all = loadProjectAssignments();
  const existing = all.find(
    (row) => row.projectId === projectId && row.employeeId === employeeId
  );
  if (existing) {
    if (assignmentSettledTotal(existing.id) > 0.004) {
      throw new Error("لا يمكن فك العامل — فيه نسبة اتصرِفت من الشغلانة دي");
    }
    saveProjectAssignments(all.filter((row) => row.id !== existing.id));
    return;
  }
  const employee = getEmployeeById(employeeId);
  saveProjectAssignments([
    {
      id: `asg-${projectId}-${employeeId}`,
      projectId,
      employeeId,
      assignedAt: new Date().toISOString(),
      sharePercent:
        employee?.payType === "percent"
          ? Math.max(0, Number(employee.commissionPercent) || 0) || undefined
          : undefined,
    },
    ...all,
  ]);
}

export function setAssignmentSharePercent(
  projectId: string,
  employeeId: string,
  sharePercent: number
) {
  const all = loadProjectAssignments();
  const existing = all.find(
    (row) => row.projectId === projectId && row.employeeId === employeeId
  );
  if (!existing) return;
  const nextPercent = Math.max(0, Math.min(100, roundMoney(sharePercent)));
  saveProjectAssignments(
    all.map((row) =>
      row.id === existing.id
        ? { ...row, sharePercent: nextPercent > 0 ? nextPercent : undefined }
        : row
    )
  );
}

export function currentMonthRange(now = new Date()): {
  from: string;
  to: string;
} {
  const y = now.getFullYear();
  const m = now.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  return { from: isoDateYmd(y, m, 1), to: isoDateYmd(y, m, last) };
}

export function periodLabel(from: string, to: string): string {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
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

function payrollHasStructuredSettlements(payroll: Payroll): boolean {
  return Boolean(
    (payroll.daySettlements && payroll.daySettlements.length > 0) ||
      (payroll.monthSettlements && payroll.monthSettlements.length > 0) ||
      (payroll.shareSettlements && payroll.shareSettlements.length > 0) ||
      (payroll.bonusSettlements && payroll.bonusSettlements.length > 0) ||
      (payroll.settledDates && payroll.settledDates.length > 0) ||
      (payroll.manualAmount ?? 0) > 0.004
  );
}

function paidDayAmount(
  employeeId: string,
  date: string,
  wage: number,
  payrolls: Payroll[]
): number {
  let sum = 0;
  for (const payroll of payrolls) {
    if (payroll.status !== "paid" || payroll.employeeId !== employeeId) continue;
    if (payrollHasStructuredSettlements(payroll)) {
      if (payroll.settledDates?.includes(date)) {
        sum += wage;
        continue;
      }
      for (const row of payroll.daySettlements ?? []) {
        if (row.date === date) sum += Number(row.amount) || 0;
      }
      continue;
    }
    if (payroll.payType === "monthly") continue;
    if (date >= payroll.periodFrom && date <= payroll.periodTo) {
      sum += wage;
    }
  }
  return roundMoney(Math.min(wage, Math.max(0, sum)));
}

function paidMonthAmount(
  employeeId: string,
  monthKey: string,
  wage: number,
  payrolls: Payroll[]
): number {
  let sum = 0;
  for (const payroll of payrolls) {
    if (payroll.status !== "paid" || payroll.employeeId !== employeeId) continue;
    if (payrollHasStructuredSettlements(payroll)) {
      for (const row of payroll.monthSettlements ?? []) {
        if (row.month === monthKey) sum += Number(row.amount) || 0;
      }
      continue;
    }
    if (payroll.payType === "daily") continue;
    if (!payroll.payType && payroll.daysWorked > 0) continue;
    const periodMonths = listMonthKeysInclusive(
      payroll.periodFrom,
      payroll.periodTo
    );
    if (periodMonths[0] === monthKey) {
      sum += Number(payroll.baseAmount) || wage;
    }
  }
  return roundMoney(Math.min(wage, Math.max(0, sum)));
}

function listPresentDates(employeeId: string, attendance: AttendanceRecord[]): string[] {
  return attendance
    .filter((row) => row.employeeId === employeeId && row.status === "present")
    .map((row) => row.date)
    .sort();
}

function openDayLines(
  employee: Employee,
  attendance: AttendanceRecord[],
  payrolls: Payroll[]
): OpenDayLine[] {
  if (employee.payType !== "daily") return [];
  const wage = roundMoney(employee.wage);
  if (!(wage > 0)) return [];
  const hiredAt = employee.hiredAt || "0000-01-01";
  const lines: OpenDayLine[] = [];
  for (const date of listPresentDates(employee.id, attendance)) {
    if (date < hiredAt) continue;
    const open = roundMoney(wage - paidDayAmount(employee.id, date, wage, payrolls));
    if (open > 0.004) lines.push({ date, amount: open });
  }
  return lines;
}

function openMonthLines(employee: Employee, payrolls: Payroll[], today: string): OpenMonthLine[] {
  if (employee.payType !== "monthly") return [];
  const wage = roundMoney(employee.wage);
  if (!(wage > 0)) return [];
  const from = employee.hiredAt || today;
  const keys = listMonthKeysInclusive(from, today);
  const lines: OpenMonthLine[] = [];
  for (const month of keys) {
    const open = roundMoney(
      wage - paidMonthAmount(employee.id, month, wage, payrolls)
    );
    if (open > 0.004) lines.push({ month, amount: open });
  }
  return lines;
}

function openShareLines(
  employee: Employee,
  assignments: ProjectAssignment[]
): OpenShareLine[] {
  if (employee.payType !== "percent") return [];
  const lines: OpenShareLine[] = [];
  for (const assignment of assignments) {
    if (assignment.employeeId !== employee.id) continue;
    const amount = assignmentOpenShareAmount(assignment, employee);
    if (!(amount > 0.004)) continue;
    const percent =
      assignment.sharePercent ?? employee.commissionPercent ?? 0;
    const project = getProjectById(assignment.projectId);
    lines.push({
      assignmentId: assignment.id,
      projectId: assignment.projectId,
      projectName: project?.name || "شغلانة",
      percent,
      sale: projectSaleTotal(assignment.projectId),
      amount,
    });
  }
  return lines.sort((a, b) => a.projectName.localeCompare(b.projectName, "ar"));
}

function earningItemsFromPreview(preview: BalancePreview): EarningItem[] {
  const items: EarningItem[] = [];
  for (const line of preview.dayLines) {
    items.push({ kind: "day", date: line.date, amount: line.amount });
  }
  for (const line of preview.monthLines) {
    items.push({ kind: "month", month: line.month, amount: line.amount });
  }
  for (const line of preview.percentLines) {
    items.push({
      kind: "share",
      assignmentId: line.assignmentId,
      amount: line.amount,
    });
  }
  for (const bonus of preview.openBonuses) {
    items.push({
      kind: "bonus",
      bonusId: bonus.id,
      amount: bonusOpenAmount(bonus),
    });
  }
  return items;
}

function allocateEarnings(
  items: EarningItem[],
  target: number
): {
  taken: number;
  daySettlements: PayrollDaySettlement[];
  monthSettlements: PayrollMonthSettlement[];
  shareSettlements: PayrollShareSettlement[];
  bonusSettlements: PayrollBonusSettlement[];
} {
  let remaining = roundMoney(Math.max(0, target));
  const daySettlements: PayrollDaySettlement[] = [];
  const monthSettlements: PayrollMonthSettlement[] = [];
  const shareSettlements: PayrollShareSettlement[] = [];
  const bonusSettlements: PayrollBonusSettlement[] = [];
  for (const item of items) {
    if (remaining <= 0.004) break;
    const take = roundMoney(Math.min(item.amount, remaining));
    if (take <= 0.004) continue;
    if (item.kind === "day") daySettlements.push({ date: item.date, amount: take });
    if (item.kind === "month") {
      monthSettlements.push({ month: item.month, amount: take });
    }
    if (item.kind === "share") {
      shareSettlements.push({ assignmentId: item.assignmentId, amount: take });
    }
    if (item.kind === "bonus") {
      bonusSettlements.push({ bonusId: item.bonusId, amount: take });
    }
    remaining = roundMoney(remaining - take);
  }
  const taken = roundMoney(
    daySettlements.reduce((sum, row) => sum + row.amount, 0) +
      monthSettlements.reduce((sum, row) => sum + row.amount, 0) +
      shareSettlements.reduce((sum, row) => sum + row.amount, 0) +
      bonusSettlements.reduce((sum, row) => sum + row.amount, 0)
  );
  return {
    taken,
    daySettlements,
    monthSettlements,
    shareSettlements,
    bonusSettlements,
  };
}

function accountLabelFromPreview(preview: Pick<
  BalancePreview,
  "employee" | "unpaidDays" | "unpaidMonths" | "percentAmount" | "bonusAmount"
>): string {
  const parts: string[] = [];
  if (preview.employee.payType === "daily" && preview.unpaidDays > 0) {
    parts.push(`${preview.unpaidDays} يوم حاضر`);
  }
  if (preview.employee.payType === "monthly" && preview.unpaidMonths > 0) {
    parts.push(
      preview.unpaidMonths === 1 ? "شهر" : `${preview.unpaidMonths} شهور`
    );
  }
  if (preview.employee.payType === "percent" && preview.percentAmount > 0.004) {
    parts.push("نسبة شغل");
  }
  if (preview.employee.payType === "manual") {
    parts.push("بدون ثابت");
  }
  if (preview.bonusAmount > 0.004) {
    parts.push("مكافآت");
  }
  return parts.join(" · ") || PAY_TYPE_LABELS[preview.employee.payType];
}

export function previewEmployeeBalance(employee: Employee): BalancePreview {
  const payrolls = loadPayroll().filter((row) => row.employeeId === employee.id);
  const attendance = loadAttendance();
  const assignments = loadProjectAssignments();
  const today = todayIsoDate();
  const dayLines = openDayLines(employee, attendance, payrolls);
  const monthLines = openMonthLines(employee, payrolls, today);
  const percentLines = openShareLines(employee, assignments);
  const openBonuses = listOpenBonuses(employee.id);
  const dailyAmount = roundMoney(dayLines.reduce((sum, row) => sum + row.amount, 0));
  const monthlyAmount = roundMoney(
    monthLines.reduce((sum, row) => sum + row.amount, 0)
  );
  const percentAmount = roundMoney(
    percentLines.reduce((sum, row) => sum + row.amount, 0)
  );
  const bonusAmount = roundMoney(
    openBonuses.reduce((sum, row) => sum + bonusOpenAmount(row), 0)
  );
  const accruedAmount = roundMoney(
    dailyAmount + monthlyAmount + percentAmount + bonusAmount
  );
  const openList = listOpenAdvances(employee.id);
  const openAdvances = roundMoney(
    openList.reduce((sum, row) => sum + advanceOpenAmount(row), 0)
  );
  const { deductions, deducted } = planAdvanceDeductions(openList, accruedAmount);
  const preview: BalancePreview = {
    employee,
    unpaidDays: dayLines.length,
    unpaidDayDates: dayLines.map((row) => row.date),
    dayLines,
    dailyAmount,
    unpaidMonths: monthLines.length,
    unpaidMonthKeys: monthLines.map((row) => row.month),
    monthLines,
    monthlyAmount,
    percentAmount,
    percentLines,
    bonusAmount,
    openBonuses,
    accruedAmount,
    openAdvances,
    advancesDeducted: deducted,
    netAmount: roundMoney(Math.max(0, accruedAmount - deducted)),
    leftoverAdvances: roundMoney(Math.max(0, openAdvances - deducted)),
    deductions,
    accountLabel: "",
  };
  preview.accountLabel = accountLabelFromPreview(preview);
  return preview;
}

export function employeeAccruedNet(employeeId: string): number {
  const employee = getEmployeeById(employeeId);
  if (!employee) return 0;
  return previewEmployeeBalance(employee).netAmount;
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
      : employee.payType === "monthly"
        ? roundMoney(employee.wage)
        : 0;
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

function applyAmountMap<T extends { id: string; settledAmount?: number; payrollId?: string; amount: number }>(
  rows: T[],
  deltas: Map<string, number>,
  payrollId: string,
  reverse: boolean
): T[] {
  return rows.map((row) => {
    const change = deltas.get(row.id);
    if (!change) return row;
    const nextSettled = roundMoney(
      Math.max(0, (Number(row.settledAmount) || 0) + (reverse ? -change : change))
    );
    const fullySettled = nextSettled >= roundMoney(row.amount) - 0.004;
    return {
      ...row,
      settledAmount: nextSettled > 0.004 ? nextSettled : undefined,
      payrollId: reverse
        ? row.payrollId === payrollId
          ? fullySettled
            ? row.payrollId
            : undefined
          : row.payrollId
        : fullySettled
          ? payrollId
          : row.payrollId ?? payrollId,
    };
  });
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
  return applyAmountMap(advances, delta, payrollId, reverse);
}

function applyBonusSettlements(
  bonuses: Bonus[],
  settlements: PayrollBonusSettlement[],
  payrollId: string,
  reverse: boolean
): Bonus[] {
  const delta = new Map<string, number>();
  for (const row of settlements) {
    delta.set(row.bonusId, (delta.get(row.bonusId) ?? 0) + row.amount);
  }
  return applyAmountMap(bonuses, delta, payrollId, reverse);
}

function payrollExpenseDescription(employee: Employee, detail: string) {
  return detail ? `أجر ${employee.name} · ${detail}` : `أجر ${employee.name}`;
}

function settlementPeriod(
  date: string,
  days: PayrollDaySettlement[],
  months: PayrollMonthSettlement[]
): { from: string; to: string } {
  const dates = days.map((row) => row.date).sort();
  const monthKeys = months.map((row) => row.month).sort();
  const fromCandidates = [
    dates[0],
    monthKeys[0] ? monthRange(monthKeys[0]).from : undefined,
    date,
  ].filter(Boolean) as string[];
  const toCandidates = [
    dates[dates.length - 1],
    monthKeys[monthKeys.length - 1]
      ? monthRange(monthKeys[monthKeys.length - 1]).to
      : undefined,
    date,
  ].filter(Boolean) as string[];
  fromCandidates.sort();
  toCandidates.sort();
  return {
    from: fromCandidates[0] || date,
    to: toCandidates[toCandidates.length - 1] || date,
  };
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

export type PayBalanceInput = {
  employee: Employee;
  /** إجمالي المستحق المراد تسديده. فارغ = كل المستحق. لليدوي: المبلغ الإضافي فوق المكافآت. */
  amount?: number;
  date?: string;
  projectId?: string;
  note?: string;
  storeBridge?: StoreBridgeMeta;
};

export function payEmployeeBalance(input: PayBalanceInput): Payroll {
  const employee = getEmployeeById(input.employee.id) ?? input.employee;
  const preview = previewEmployeeBalance(employee);
  const items = earningItemsFromPreview(preview);

  let targetGross: number;
  let manualAmount = 0;
  if (input.amount == null) {
    if (employee.payType === "manual" && preview.accruedAmount <= 0.004) {
      throw new Error("أدخل مبلغ الصرف للعامل بدون راتب ثابت");
    }
    targetGross = preview.accruedAmount;
  } else {
    const requested = roundMoney(input.amount);
    if (!(requested > 0)) {
      throw new Error("أدخل مبلغ الصرف");
    }
    if (employee.payType === "manual") {
      const fromAccrued = roundMoney(Math.min(requested, preview.accruedAmount));
      manualAmount = roundMoney(Math.max(0, requested - fromAccrued));
      targetGross = fromAccrued;
    } else {
      if (preview.accruedAmount <= 0.004) {
        throw new Error("مفيش مستحق متراكم للصرف");
      }
      targetGross = roundMoney(Math.min(requested, preview.accruedAmount));
    }
  }

  const allocated = allocateEarnings(items, targetGross);
  const gross = roundMoney(allocated.taken + manualAmount);
  if (!(gross > 0.004)) {
    throw new Error("مفيش مبلغ للصرف");
  }

  const openList = listOpenAdvances(employee.id);
  const { deductions, deducted } = planAdvanceDeductions(openList, gross);
  const netAmount = roundMoney(Math.max(0, gross - deducted));
  const leftoverAdvances = roundMoney(
    Math.max(
      0,
      openList.reduce((sum, row) => sum + advanceOpenAmount(row), 0) - deducted
    )
  );

  const date = input.date || todayIsoDate();
  const period = settlementPeriod(
    date,
    allocated.daySettlements,
    allocated.monthSettlements
  );
  const payrollId = `payr-${employee.id}-${date}-${Date.now()}`;
  const createdAt = new Date().toISOString();
  const bonusesAdded = roundMoney(
    allocated.bonusSettlements.reduce((sum, row) => sum + row.amount, 0)
  );
  const percentAmount = roundMoney(
    allocated.shareSettlements.reduce((sum, row) => sum + row.amount, 0)
  );
  const dailyPaid = roundMoney(
    allocated.daySettlements.reduce((sum, row) => sum + row.amount, 0)
  );
  const monthlyPaid = roundMoney(
    allocated.monthSettlements.reduce((sum, row) => sum + row.amount, 0)
  );
  const detailParts = [
    allocated.daySettlements.length
      ? `${allocated.daySettlements.length} يوم`
      : "",
    allocated.monthSettlements.length
      ? allocated.monthSettlements.length === 1
        ? "شهر"
        : `${allocated.monthSettlements.length} شهور`
      : "",
    percentAmount > 0.004 ? "نسبة شغل" : "",
    bonusesAdded > 0.004 ? "مكافأة" : "",
    manualAmount > 0.004 ? "مبلغ يدوي" : "",
  ].filter(Boolean);
  const leftoverNote =
    leftoverAdvances > 0.004 ? `باقي سلف ${leftoverAdvances} ج.م` : undefined;
  const note = [input.note?.trim(), leftoverNote].filter(Boolean).join(" · ");

  let expenseId: string | undefined;
  if (netAmount > 0.004) {
    expenseId = `exp-${payrollId}`;
    const expense: Expense = {
      id: expenseId,
      category: "أجور",
      description: payrollExpenseDescription(employee, detailParts.join(" + ")),
      amount: netAmount,
      date,
      projectId: input.projectId || undefined,
      note: note || undefined,
      createdAt,
      settlement: "cash",
      employeeId: employee.id,
      payrollId,
      storeBridge: input.storeBridge,
    };
    upsertExpense(expense);
  }

  const payroll: Payroll = {
    id: payrollId,
    employeeId: employee.id,
    periodFrom: period.from,
    periodTo: period.to,
    daysWorked: allocated.daySettlements.length,
    baseAmount: roundMoney(dailyPaid + monthlyPaid + percentAmount + manualAmount),
    advancesDeducted: deducted,
    netAmount,
    date,
    expenseId,
    projectId: input.projectId || undefined,
    status: "paid",
    note: note || undefined,
    createdAt,
    deductions,
    storeBridge: input.storeBridge,
    payType: employee.payType,
    bonusesAdded: bonusesAdded > 0.004 ? bonusesAdded : undefined,
    percentAmount: percentAmount > 0.004 ? percentAmount : undefined,
    manualAmount: manualAmount > 0.004 ? manualAmount : undefined,
    daySettlements:
      allocated.daySettlements.length > 0 ? allocated.daySettlements : undefined,
    monthSettlements:
      allocated.monthSettlements.length > 0
        ? allocated.monthSettlements
        : undefined,
    shareSettlements:
      allocated.shareSettlements.length > 0
        ? allocated.shareSettlements
        : undefined,
    bonusSettlements:
      allocated.bonusSettlements.length > 0
        ? allocated.bonusSettlements
        : undefined,
  };

  saveAdvances(applyDeductions(loadAdvances(), deductions, payrollId, false));
  saveBonuses(
    applyBonusSettlements(
      loadBonuses(),
      allocated.bonusSettlements,
      payrollId,
      false
    )
  );
  savePayroll([payroll, ...loadPayroll()]);
  return payroll;
}

export function payEmployeePayroll(input: PayPayrollInput): Payroll {
  const preview = previewPayroll(
    input.employee,
    input.periodFrom,
    input.periodTo
  );
  if (preview.alreadyPaid) {
    throw new Error("الراتب للفترة دي متصرف قبل كده");
  }
  if (preview.baseAmount <= 0.004) {
    throw new Error("مفيش أجر للفترة دي");
  }
  return payEmployeeBalance({
    employee: input.employee,
    amount: preview.baseAmount,
    date: input.date,
    projectId: input.projectId,
    note: input.note,
    storeBridge: input.storeBridge,
  });
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
  saveBonuses(
    applyBonusSettlements(
      loadBonuses(),
      payroll.bonusSettlements ?? [],
      payrollId,
      true
    )
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
  const openBonuses = roundMoney(
    loadBonuses().reduce((sum, row) => sum + bonusOpenAmount(row), 0)
  );
  const openAccrued = roundMoney(
    active.reduce((sum, employee) => sum + previewEmployeeBalance(employee).netAmount, 0)
  );
  const { from, to } = currentMonthRange(now);
  const monthPayroll = loadPayroll().filter(
    (row) => row.status === "paid" && row.date >= from && row.date <= to
  );
  const monthPaid = roundMoney(
    monthPayroll.reduce((sum, row) => sum + row.netAmount, 0)
  );
  return {
    activeCount: active.length,
    presentToday,
    openAdvances,
    openBonuses,
    openAccrued,
    monthPaid,
    monthPayrollCount: monthPayroll.length,
    periodFrom: from,
    periodTo: to,
  };
}
