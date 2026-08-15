/**
 * ترحيل باكب البرنامج القديم (clients/projects/contracts…) إلى صيغة الورشة الحالية.
 * الأبعاد في الباكب القديم بالسنتيمتر → تُحوَّل إلى مليمتر.
 */

import type { Customer } from "@/lib/customers";
import {
  defaultPaneConfig,
  type DesignItem,
  type FrameColorId,
  type PaneConfig,
  type PaneOpening,
  type WindowStyle,
} from "@/lib/design-items";
import type { Company } from "@/lib/company";
import type {
  Expense,
  Payment,
} from "@/lib/accounting";
import type { Project, ProjectWorkflow } from "@/lib/projects";
import type {
  Advance,
  AttendanceRecord,
  AttendanceStatus,
  Employee,
  PayType,
  Payroll,
  ProjectAssignment,
} from "@/lib/hr";
import {
  DELETED_CUSTOMERS_KEY,
  SHARED_STORAGE_KEYS,
  STORAGE_KEYS,
  type SharedStorageKey,
} from "@/lib/storage/keys";
import { CLEAN_START_VERSION, DATA_VERSION_KEY } from "@/lib/clean-start";
import {
  cols,
  ensurePaneIds,
  listPaneIds,
  pane,
  rows,
  type LayoutNode,
} from "@/lib/window-layout";

export type LegacyClient = {
  id: number | string;
  name: string;
  phone?: string;
  address?: string;
  createdAt?: string;
};

export type LegacyProjectItem = {
  id?: string | number;
  name?: string;
  profileType?: string;
  width?: number;
  height?: number;
  quantity?: number;
  unitPrice?: number;
  total?: number;
  notes?: string;
  pricingMethod?: string;
  glassType?: string;
  color?: string;
};

export type LegacyProject = {
  id: number | string;
  clientId: number | string;
  name: string;
  description?: string;
  status?: string;
  startDate?: string;
  deadline?: string;
  createdAt?: string;
  updatedAt?: string;
  totalAmount?: number;
  paidAmount?: number;
  items?: LegacyProjectItem[];
  includeInstallation?: boolean;
  priority?: string;
};

export type LegacyContract = {
  id: number | string;
  projectId: number | string;
  type: string;
  amount?: number;
  details?: string;
  date?: string;
};

export type LegacyExpense = {
  id: number | string;
  category?: string;
  amount?: number;
  date?: string;
  description?: string;
  type?: string;
  projectId?: number | string | null;
};

export type LegacySettings = {
  companyName?: string;
  phone?: string;
  address?: string;
  contractTerms?: string;
  watermarkText?: string;
};

export type LegacyBackup = {
  clients?: LegacyClient[];
  projects?: LegacyProject[];
  contracts?: LegacyContract[];
  expenses?: LegacyExpense[];
  settings?: LegacySettings | LegacySettings[];
  itemTypes?: unknown[];
  defaultStages?: unknown[];
  employees?: unknown[];
  attendance?: unknown[];
  advances?: unknown[];
  payroll?: unknown[];
  projectAssignments?: unknown[];
  notifications?: unknown[];
};

export type UpvcBackupPayload = {
  version: 1;
  exportedAt: string;
  data: Record<string, string | null>;
  meta?: {
    source: "legacy-workshop";
    summary: LegacyImportSummary;
  };
};

export type LegacyImportSummary = {
  customers: number;
  projects: number;
  items: number;
  payments: number;
  expenses: number;
  employees: number;
  skippedKeys: string[];
};

const MONEY_CONTRACT_TYPES = new Set(["receipt", "agreement"]);

export function isLegacyBackup(value: unknown): value is LegacyBackup {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  if ("version" in obj && "data" in obj) return false;
  return (
    Array.isArray(obj.clients) ||
    Array.isArray(obj.projects) ||
    Array.isArray(obj.contracts)
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function strField(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function pickField(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] != null && row[key] !== "") return row[key];
  }
  return undefined;
}

function asId(prefix: string, id: number | string): string {
  return `${prefix}-${id}`;
}

function mapLegacyRole(raw: string): string {
  const n = raw.toLowerCase();
  if (/قص|قطع|cut/.test(n)) return "قص";
  if (/لحام|weld/.test(n)) return "لحام";
  if (/اكسسوار|إكسسوار|access/.test(n)) return "اكسسوار";
  if (/زجاج|glass/.test(n)) return "زجاج";
  if (/تركيب|install/.test(n)) return "تركيب";
  if (/محاسب|account/.test(n)) return "محاسب";
  if (/إدار|ادار|مدير|admin/.test(n)) return "إدارة";
  return raw || "أخرى";
}

function mapLegacyPayType(row: Record<string, unknown>): PayType {
  const raw = strField(
    pickField(row, ["payType", "wageType", "salaryType", "type"])
  ).toLowerCase();
  if (/daily|يوم/.test(raw)) return "daily";
  if (/month|شهر/.test(raw)) return "monthly";
  const daily = num(pickField(row, ["dailyWage", "dayWage", "daily"]), 0);
  const monthly = num(pickField(row, ["salary", "monthlyWage", "wage", "amount"]), 0);
  if (daily > 0 && monthly <= 0) return "daily";
  return "monthly";
}

function mapLegacyAttendanceStatus(raw: unknown): AttendanceStatus | null {
  if (raw === true || raw === 1) return "present";
  if (raw === false || raw === 0) return "absent";
  const n = strField(raw).toLowerCase();
  if (!n) return null;
  if (/present|حاضر|حضور/.test(n)) return "present";
  if (/absent|غائب|غايب|غياب/.test(n)) return "absent";
  if (/holiday|رسمي/.test(n)) return "holiday";
  if (/off|vacation|leave|إجاز|اجاز|أجاز/.test(n)) return "off";
  return null;
}

function convertLegacyHr(
  backup: LegacyBackup,
  validProjectIds: Set<string>
): {
  employees: Employee[];
  attendance: AttendanceRecord[];
  advances: Advance[];
  payroll: Payroll[];
  assignments: ProjectAssignment[];
} {
  const employeeIdMap = new Map<string, string>();
  const employees: Employee[] = [];
  for (const item of backup.employees ?? []) {
    const row = asRecord(item);
    if (!row) continue;
    const legacyId = pickField(row, ["id", "employeeId"]) ?? employees.length + 1;
    const id = asId("emp", legacyId as string | number);
    employeeIdMap.set(String(legacyId), id);
    const payType = mapLegacyPayType(row);
    const wage = num(
      pickField(
        row,
        payType === "daily"
          ? ["dailyWage", "dayWage", "daily", "wage", "salary", "amount"]
          : ["salary", "monthlyWage", "wage", "amount", "dailyWage"]
      ),
      0
    );
    const hiredAt = strField(
      pickField(row, ["hiredAt", "hireDate", "startDate", "createdAt"])
    ).slice(0, 10);
    const statusRaw = strField(pickField(row, ["status", "active"])).toLowerCase();
    employees.push({
      id,
      name: strField(pickField(row, ["name", "fullName", "employeeName"])) || `موظف ${legacyId}`,
      phone: strField(pickField(row, ["phone", "mobile", "tel"])) || undefined,
      role: mapLegacyRole(
        strField(pickField(row, ["role", "job", "position", "title"]))
      ),
      payType,
      wage,
      hiredAt: hiredAt || new Date().toISOString().slice(0, 10),
      status:
        /left|inactive|سابق|ساب|off/.test(statusRaw) || row.active === false
          ? "left"
          : "active",
      note: strField(pickField(row, ["note", "notes", "comment"])) || undefined,
      createdAt:
        strField(pickField(row, ["createdAt"])) || new Date().toISOString(),
    });
  }

  const attendance: AttendanceRecord[] = [];
  for (const item of backup.attendance ?? []) {
    const row = asRecord(item);
    if (!row) continue;
    const legacyEmp = pickField(row, ["employeeId", "empId", "staffId"]);
    const employeeId = employeeIdMap.get(String(legacyEmp ?? ""));
    if (!employeeId) continue;
    const date = strField(pickField(row, ["date", "day"])).slice(0, 10);
    if (!date) continue;
    const status = mapLegacyAttendanceStatus(
      pickField(row, ["status", "present", "state", "type"])
    );
    if (!status) continue;
    attendance.push({
      id: `att-${employeeId}-${date}`,
      employeeId,
      date,
      status,
      note: strField(pickField(row, ["note", "notes"])) || undefined,
    });
  }

  const advances: Advance[] = [];
  for (const item of backup.advances ?? []) {
    const row = asRecord(item);
    if (!row) continue;
    const legacyEmp = pickField(row, ["employeeId", "empId", "staffId"]);
    const employeeId = employeeIdMap.get(String(legacyEmp ?? ""));
    if (!employeeId) continue;
    const amount = num(pickField(row, ["amount", "value"]), 0);
    if (amount <= 0) continue;
    const date = strField(pickField(row, ["date", "createdAt"])).slice(0, 10);
    advances.push({
      id: asId("adv", (pickField(row, ["id"]) as string | number) ?? advances.length + 1),
      employeeId,
      amount,
      date: date || new Date().toISOString().slice(0, 10),
      note: strField(pickField(row, ["note", "notes", "description"])) || undefined,
      createdAt: strField(pickField(row, ["createdAt"])) || new Date().toISOString(),
    });
  }

  const payroll: Payroll[] = [];
  for (const item of backup.payroll ?? []) {
    const row = asRecord(item);
    if (!row) continue;
    const legacyEmp = pickField(row, ["employeeId", "empId", "staffId"]);
    const employeeId = employeeIdMap.get(String(legacyEmp ?? ""));
    if (!employeeId) continue;
    const periodFrom = strField(
      pickField(row, ["periodFrom", "from", "fromDate", "startDate"])
    ).slice(0, 10);
    const periodTo = strField(
      pickField(row, ["periodTo", "to", "toDate", "endDate"])
    ).slice(0, 10);
    const date = strField(pickField(row, ["date", "paidAt", "createdAt"])).slice(0, 10);
    const net = num(pickField(row, ["netAmount", "net", "amount", "paid"]), 0);
    const base = num(pickField(row, ["baseAmount", "base", "gross"]), net);
    payroll.push({
      id: asId("payr", (pickField(row, ["id"]) as string | number) ?? payroll.length + 1),
      employeeId,
      periodFrom: periodFrom || date || new Date().toISOString().slice(0, 10),
      periodTo: periodTo || periodFrom || date || new Date().toISOString().slice(0, 10),
      daysWorked: num(pickField(row, ["daysWorked", "days"]), 0),
      baseAmount: base,
      advancesDeducted: num(pickField(row, ["advancesDeducted", "deduction", "advances"]), 0),
      netAmount: net,
      date: date || new Date().toISOString().slice(0, 10),
      status: "paid",
      note: strField(pickField(row, ["note", "notes"])) || "مستورد من الباكب القديم",
      createdAt: strField(pickField(row, ["createdAt"])) || new Date().toISOString(),
      deductions: [],
    });
  }

  const assignments: ProjectAssignment[] = [];
  for (const item of backup.projectAssignments ?? []) {
    const row = asRecord(item);
    if (!row) continue;
    const employeeId = employeeIdMap.get(
      String(pickField(row, ["employeeId", "empId"]) ?? "")
    );
    const projectId = asId(
      "p",
      (pickField(row, ["projectId"]) as string | number) ?? ""
    );
    if (!employeeId || !validProjectIds.has(projectId)) continue;
    assignments.push({
      id: `asg-${projectId}-${employeeId}`,
      projectId,
      employeeId,
      assignedAt:
        strField(pickField(row, ["assignedAt", "createdAt", "date"])) ||
        new Date().toISOString(),
    });
  }

  return { employees, attendance, advances, payroll, assignments };
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cmToMm(cm: unknown): number {
  const n = num(cm, 0);
  if (n <= 0) return 1000;
  // القيم الكبيرة جداً قد تكون أصلاً بالمليمتر
  if (n >= 800) return Math.round(n);
  return Math.round(n * 10);
}

function inferFrameColor(color?: string): FrameColorId {
  const c = (color ?? "").trim().toLowerCase();
  if (!c) return "white";
  if (c.includes("بيج") || c.includes("beige") || c.includes("كريمي")) {
    return "beige";
  }
  if (c.includes("رماد") || c.includes("gray") || c.includes("grey")) {
    return "gray";
  }
  if (c.includes("خشب") || c.includes("wood") || c.includes("بلوط")) {
    return "wood";
  }
  if (c.includes("أسود") || c.includes("اسود") || c.includes("black") || c.includes("أنثرا")) {
    return "black";
  }
  return "white";
}

type OpeningFamily = "door" | "sliding" | "tilt" | "casement" | "fixed";

type SideFixed = "left" | "right" | null;

type ApproxDrawing = {
  style: WindowStyle;
  templateId: string;
  layout: LayoutNode;
  panes: Record<string, PaneConfig>;
};

export type ApproxDrawingHints = {
  /** عرض البند بالسنتيمتر (من الباكب القديم) */
  widthCm?: number;
  /** ارتفاع البند بالسنتيمتر (من الباكب القديم) */
  heightCm?: number;
};

/** تصحيح إملاء شائع في أسماء البنود القديمة */
function normalizeItemName(name: string): string {
  return name
    .replace(/\u0640/g, "")
    .replace(/ضافة/g, "ضلفة")
    .replace(/بلكونه/g, "بلكونة")
    .replace(/جمام/g, "حمام")
    .replace(/باب\s*حما(?!م)/g, "باب حمام")
    .replace(/باندا|باندة|بندة/g, "بنل")
    .replace(/بلكونة\s*فصلي/g, "بلكونة مفصلي")
    .replace(/\s+/g, " ")
    .trim();
}

/** عدد الضلف من الاسم إن وُجد */
function extractLeafCount(name: string): number | null {
  const n = normalizeItemName(name);
  const digit = n.match(/(\d+)\s*ضلف/);
  if (digit) {
    const count = Number(digit[1]);
    if (Number.isFinite(count) && count >= 1) return Math.min(6, count);
  }
  if (/دبل/.test(n)) return 2;
  if (/ضلفتين|٢\s*ضلف|2\s*ضلفة/.test(n)) return 2;
  if (/ثلاث(?:ة)?\s*ضلف|٣\s*ضلف|3\s*ضلفة/.test(n)) return 3;
  if (/أربع(?:ة)?\s*ضلف|٤\s*ضلف|4\s*ضلفة/.test(n)) return 4;
  if (/واحد(?:ة)?\s*ضلف|1\s*ضلفة|ضلفة\s*واحد/.test(n)) return 1;
  return null;
}

function heightSuggestsDoor(heightCm?: number): boolean {
  return typeof heightCm === "number" && Number.isFinite(heightCm) && heightCm >= 170;
}

function widthSuggestsWide(widthCm?: number): boolean {
  return typeof widthCm === "number" && Number.isFinite(widthCm) && widthCm >= 140;
}

function inferOpeningFamily(
  name: string,
  hints?: ApproxDrawingHints
): OpeningFamily {
  const n = normalizeItemName(name);
  // بنود غير نوافذ (ستائر/سلك/صيانة…) — ثابت بسيط
  if (/^(صيانة|ستارة|ستاير|سلك|واجهة|تت|شش|1)$/.test(n) || /ستارة|بلاك\s*اوت|واجهة/.test(n)) {
    return "fixed";
  }
  if (/باب/.test(n)) {
    if (/جرار|سحاب/.test(n)) return "sliding";
    return "door";
  }
  // بلكونة عالية ≈ باب بلكونة
  if (/بلكونة/.test(n) && heightSuggestsDoor(hints?.heightCm)) {
    if (/جرار|سحاب/.test(n)) return "sliding";
    return "door";
  }
  if (/جرار|سحاب/.test(n)) return "sliding";
  if (/قلاب/.test(n)) return "tilt";
  if (/مفصلي|دوران/.test(n)) return "casement";
  if (/ثابت/.test(n) && !/قلاب|مفصلي|جرار|باب/.test(n)) return "fixed";
  if (/حمام/.test(n)) return "tilt";
  if (/بلكونة|صاله|صالة|غرفه|غرفة|مطبخ|نوم/.test(n)) {
    // شباك غرفة/مطبخ عريض بدون نوع → جرار غالباً
    if (widthSuggestsWide(hints?.widthCm) && extractLeafCount(n) != null && extractLeafCount(n)! >= 3) {
      return "sliding";
    }
    return "sliding";
  }
  // شباك N ضلفة بدون نوع فتح — العريض جرار
  if (/شباك|شبك/.test(n) && widthSuggestsWide(hints?.widthCm) && (extractLeafCount(n) ?? 0) >= 3) {
    return "sliding";
  }
  return "casement";
}

function hasExplicitHingeSide(name: string): boolean {
  return /يفتح\s*(شمال|يمين)|فتح\s*(شمال|يمين)|لليمين|برا\s*للي|ضلفة\s*(شمال|يمين)|(?:^|\s)(شمال|يمين)(?:\s|$)/.test(
    name
  );
}

function defaultLeafCount(family: OpeningFamily, name: string): number {
  const explicit = extractLeafCount(name);
  if (explicit != null) return explicit;
  switch (family) {
    case "sliding":
      return 2;
    case "casement":
      // «مفصلي يفتح شمال» بدون عدد → ضلفة واحدة
      if (hasExplicitHingeSide(name)) return 1;
      return /مفصلي/.test(name) ? 2 : 1;
    case "door":
      return 1;
    case "tilt":
      return 1;
    case "fixed":
      return 1;
  }
}

function styleForFamily(family: OpeningFamily, leafCount: number): WindowStyle {
  if (family === "door") return "door";
  if (family === "sliding") return leafCount >= 3 ? "sliding-3" : "sliding-2";
  if (family === "fixed") return "fixed";
  if (family === "tilt") return leafCount >= 2 ? "casement-2" : "casement-1";
  return leafCount >= 2 ? "casement-2" : "casement-1";
}

function templateIdFor(
  leafCount: number,
  topFixed: boolean,
  sideFixed: SideFixed,
  exhaustTop: boolean
): string {
  if (sideFixed === "right") return "t12-right-full-left-2h";
  if (sideFixed === "left") return "t11-left-full-right-2h";
  if (exhaustTop) {
    if (leafCount <= 1) return "t05-2h";
    if (leafCount === 2) return "t10-t-top-2";
    return "t08-t-top-3";
  }
  if (topFixed) {
    if (leafCount <= 1) return "t05-2h";
    if (leafCount === 2) return "t10-t-top-2";
    return "t08-t-top-3";
  }
  if (leafCount <= 1) return "t01-single";
  if (leafCount === 2) return "t02-2v";
  if (leafCount === 3) return "t03-3v";
  return "t04-4v";
}

function buildStableCols(leafCount: number, idPrefix: string): LayoutNode {
  const count = Math.max(1, Math.min(6, leafCount));
  if (count === 1) return pane(`${idPrefix}-1`);
  return {
    type: "split",
    dir: "v",
    ratios: Array.from({ length: count }, () => 1),
    children: Array.from({ length: count }, (_, i) =>
      pane(`${idPrefix}-${i + 1}`)
    ),
  };
}

function detectSideFixed(name: string): SideFixed {
  if (/ثابت\s*يمين/.test(name)) return "right";
  if (/ثابت\s*(شمال|يسار)/.test(name)) return "left";
  return null;
}

function detectTopFixed(name: string, sideFixed: SideFixed): boolean {
  if (sideFixed) return false;
  return (
    /ثابت\s*علو|ثابت\s*فوق|ثابت\s*بالطول|شفاط\s*علو/.test(name) ||
    (/\+\s*ثابت/.test(name) && !/ثابت\s*(يمين|شمال|يسار)/.test(name)) ||
    (/ثابت/.test(name) && /\+/.test(name) && !/ثابت\s*(يمين|شمال|يسار)/.test(name))
  );
}

function buildApproxLayout(
  leafCount: number,
  idPrefix: string,
  topFixed: boolean,
  sideFixed: SideFixed,
  exhaustTop: boolean
): LayoutNode {
  const operable = buildStableCols(leafCount, idPrefix);
  if (sideFixed === "right") {
    // SVG L→R: اليمين = آخر عمود
    return cols([0.72, operable], [0.28, pane(`${idPrefix}-side`)]);
  }
  if (sideFixed === "left") {
    return cols([0.28, pane(`${idPrefix}-side`)], [0.72, operable]);
  }
  if (exhaustTop) {
    return rows(
      [0.3, pane(`${idPrefix}-top`)],
      [0.7, operable]
    );
  }
  if (!topFixed) return operable;
  return rows(
    [0.28, pane(`${idPrefix}-top`)],
    [0.72, operable]
  );
}

function hingeOpening(index: number, name: string): PaneOpening {
  if (/شمال/.test(name) && !/يمين/.test(name)) {
    return "casement-left";
  }
  if (/يمين|لليمين|لليمن|برا\s*للي/.test(name) && !/شمال/.test(name)) {
    return "casement-right";
  }
  return index % 2 === 0 ? "casement-right" : "casement-left";
}

function slidingOpening(index: number, reversed: boolean): PaneOpening {
  const even: PaneOpening = reversed ? "sliding-left" : "sliding-right";
  const odd: PaneOpening = reversed ? "sliding-right" : "sliding-left";
  return index % 2 === 0 ? even : odd;
}

/**
 * رسم تقريبي من اسم البند القديم (مفيش بيانات رسم في الباكب).
 * يكفي للمعاينة والتعديل لاحقاً.
 */
export function approxDrawingFromName(
  rawName: string,
  itemId: string,
  hints?: ApproxDrawingHints
): ApproxDrawing {
  const name = normalizeItemName(rawName);
  const family = inferOpeningFamily(name, hints);
  const sideFixed = family === "door" ? null : detectSideFixed(name);
  const hasExhaust = /شفاط/.test(name);
  const exhaustTop = hasExhaust && /علو/.test(name);
  const topFixed = detectTopFixed(name, sideFixed) && !exhaustTop;
  const isPanelDoor = /بنل|بانل|panel|ساندوتش/.test(name);
  const wantsMesh = /شبك|سلك/.test(name) && !/ستارة|بلاك/.test(name);
  const reversedSliding = /معكوس/.test(name);
  let leafCount = defaultLeafCount(family, name);

  // شفاط علوي: ضلفة تشغيل واحدة تحت إن مفيش عدد صريح
  if (exhaustTop && extractLeafCount(name) == null && family !== "door") {
    leafCount = 1;
  }
  // شفاط جانبي مع ضلفة واحدة → ضلفة فتح + ضلفة شفاط
  if (hasExhaust && !exhaustTop && leafCount <= 1 && family !== "door") {
    leafCount = 2;
  }

  const idPrefix = `leg-${itemId}`.replace(/[^a-zA-Z0-9_-]/g, "");
  const useTopFixed = (topFixed || exhaustTop) && family !== "door";
  const layout = ensurePaneIds(
    buildApproxLayout(
      Math.max(1, leafCount),
      idPrefix,
      useTopFixed && !exhaustTop,
      sideFixed,
      exhaustTop && family !== "door"
    )
  );
  const ids = listPaneIds(layout);
  const panes: Record<string, PaneConfig> = {};

  const sideId =
    sideFixed != null
      ? ids.find((id) => id.endsWith("-side")) ?? null
      : null;
  const topId =
    useTopFixed || exhaustTop
      ? ids.find((id) => id.endsWith("-top")) ?? null
      : null;
  const operableIds = ids.filter((id) => id !== sideId && id !== topId);

  ids.forEach((id) => {
    const operableIndex = operableIds.indexOf(id);
    let opening: PaneOpening = "fixed";
    let isDoor = false;

    if (id === sideId || (id === topId && !exhaustTop)) {
      opening = "fixed";
    } else if (id === topId && exhaustTop) {
      opening = "exhaust";
    } else if (
      hasExhaust &&
      !exhaustTop &&
      operableIndex === operableIds.length - 1 &&
      family !== "door"
    ) {
      opening = "exhaust";
    } else if (family === "door") {
      isDoor = true;
      opening = hingeOpening(Math.max(0, operableIndex), name);
    } else if (family === "sliding") {
      opening = slidingOpening(Math.max(0, operableIndex), reversedSliding);
      isDoor =
        /باب/.test(name) ||
        (/بلكونة/.test(name) && heightSuggestsDoor(hints?.heightCm));
    } else if (family === "tilt") {
      opening = "tilt";
    } else if (family === "fixed") {
      opening = "fixed";
    } else {
      opening = hingeOpening(Math.max(0, operableIndex), name);
    }

    panes[id] = defaultPaneConfig({
      opening,
      isDoor,
      sandwichPanels: isDoor && isPanelDoor,
      mesh: wantsMesh && opening !== "exhaust",
      bouclier: false,
    });
  });

  // ضلفتين مفصلي أو باب مفصلي: مقابض متقابلة + بوكلير
  const pairFamilies: OpeningFamily[] = ["casement", "door"];
  if (
    pairFamilies.includes(family) &&
    leafCount === 2 &&
    !hasExhaust &&
    operableIds.length >= 2
  ) {
    panes[operableIds[0]!] = defaultPaneConfig({
      ...panes[operableIds[0]!],
      opening: "casement-right",
      isDoor: family === "door" || panes[operableIds[0]!]?.isDoor,
      sandwichPanels:
        (family === "door" || panes[operableIds[0]!]?.isDoor) && isPanelDoor,
      bouclier: true,
    });
    panes[operableIds[1]!] = defaultPaneConfig({
      ...panes[operableIds[1]!],
      opening: "casement-left",
      isDoor: family === "door" || panes[operableIds[1]!]?.isDoor,
      sandwichPanels:
        (family === "door" || panes[operableIds[1]!]?.isDoor) && isPanelDoor,
      bouclier: true,
    });
  }

  return {
    style: styleForFamily(family, leafCount),
    templateId: templateIdFor(
      leafCount,
      useTopFixed && !exhaustTop,
      sideFixed,
      exhaustTop
    ),
    layout,
    panes,
  };
}

function mapProjectWorkflow(
  status: string | undefined,
  paidAmount: number
): { workflow: ProjectWorkflow; status: "open" | "done" } {
  const s = (status ?? "").toLowerCase();
  if (s === "completed" || s === "done" || s === "finished") {
    return { workflow: "done", status: "done" };
  }
  // مدفوع → قائمة انتظار فقط. التنفيذ يبدأ يدوياً من الورشة.
  if (paidAmount > 0) {
    return { workflow: "queued", status: "open" };
  }
  return { workflow: "quote", status: "open" };
}

function mapExpenseCategory(category?: string): string {
  const c = (category ?? "").trim();
  if (!c) return "مصروفات عامة";
  if (c === "مصنعيات" || c === "عمالة" || c === "أجور") return "أجور";
  if (c === "خامات" || c === "نقل" || c === "إيجار" || c === "كهرباء ومرافق" || c === "صيانة" || c === "مصروفات عامة") {
    return c;
  }
  return c;
}

function buildItemNotes(item: LegacyProjectItem): string {
  const parts: string[] = [];
  if (item.profileType?.trim()) parts.push(`قطاع: ${item.profileType.trim()}`);
  if (item.glassType?.trim()) parts.push(`زجاج: ${item.glassType.trim()}`);
  if (item.color?.trim()) parts.push(`لون: ${item.color.trim()}`);
  if (item.notes?.trim()) parts.push(item.notes.trim());
  return parts.join(" · ");
}

function convertItem(
  item: LegacyProjectItem,
  index: number,
  projectId: string
): DesignItem {
  const qty = Math.max(1, Math.round(num(item.quantity, 1)));
  const unitPrice = num(item.unitPrice, 0);
  const total = num(item.total, unitPrice * qty);
  const perUnit =
    item.pricingMethod !== "per_meter"
      ? unitPrice > 0
        ? unitPrice
        : qty > 0
          ? total / qty
          : total
      : null;

  const widthMm = cmToMm(item.width);
  const heightMm = cmToMm(item.height);
  const area = (widthMm * heightMm) / 1_000_000;
  const pricePerSqm =
    item.pricingMethod === "per_meter"
      ? unitPrice
      : area > 0 && perUnit
        ? perUnit / area
        : 2600;

  const name = (item.name ?? `بند ${index + 1}`).trim() || `بند ${index + 1}`;
  const id = item.id != null ? String(item.id) : `${projectId}-item-${index + 1}`;
  const drawing = approxDrawingFromName(name, id, {
    widthCm: num(item.width, 0) || undefined,
    heightCm: num(item.height, 0) || undefined,
  });

  return {
    id,
    name,
    nameIsCustom: true,
    style: drawing.style,
    templateId: drawing.templateId,
    layout: drawing.layout,
    panes: drawing.panes,
    frameColor: inferFrameColor(item.color),
    widthMm,
    heightMm,
    qty,
    pricePerSqm: Number.isFinite(pricePerSqm) ? Math.round(pricePerSqm) : 2600,
    notes: buildItemNotes(item) || undefined,
    specialPrice: perUnit != null && perUnit > 0 ? Math.round(perUnit * 100) / 100 : null,
    discountId: "none",
  };
}

function readSettings(backup: LegacyBackup): LegacySettings | null {
  const raw = backup.settings;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

/**
 * يحوّل باكب البرنامج القديم إلى snapshot مفاتيح الورشة المشتركة.
 */
export function convertLegacyBackup(backup: LegacyBackup): {
  sharedData: Record<SharedStorageKey, string | null>;
  localData: Record<string, string | null>;
  summary: LegacyImportSummary;
} {
  const clients = Array.isArray(backup.clients) ? backup.clients : [];
  const projects = Array.isArray(backup.projects) ? backup.projects : [];
  const contracts = Array.isArray(backup.contracts) ? backup.contracts : [];
  const expensesRaw = Array.isArray(backup.expenses) ? backup.expenses : [];

  const customerByLegacyId = new Map<string, Customer>();
  const customers: Customer[] = clients.map((client) => {
    const id = asId("c", client.id);
    const customer: Customer = {
      id,
      name: (client.name ?? "").trim() || `عميل ${client.id}`,
      phone: (client.phone ?? "").trim(),
      address: client.address?.trim() || undefined,
      balance: 0,
      lastDealAt: client.createdAt ?? new Date().toISOString(),
      projectsCount: 0,
    };
    customerByLegacyId.set(String(client.id), customer);
    return customer;
  });

  const projectItems: Record<string, DesignItem[]> = {};
  const convertedProjects: Project[] = [];
  const payments: Payment[] = [];
  let itemsCount = 0;
  let queueCursor = 1;
  /** بيع المشروع من البنود / totalAmount — لحساب المتبقي على العميل */
  const projectSaleById = new Map<string, number>();

  for (const project of projects) {
    const projectId = asId("p", project.id);
    const customer = customerByLegacyId.get(String(project.clientId));
    if (!customer) continue;

    const paidAmount = num(project.paidAmount, 0);
    const totalAmount = num(project.totalAmount, 0);
    const { workflow, status } = mapProjectWorkflow(project.status, paidAmount);

    const items = (project.items ?? []).map((item, index) =>
      convertItem(item, index, projectId)
    );
    projectItems[projectId] = items;
    itemsCount += items.length;

    const saleFromItems = items.reduce((sum, item) => {
      const qty = Math.max(1, item.qty || 1);
      if (item.specialPrice != null && item.specialPrice > 0) {
        return sum + item.specialPrice * qty;
      }
      return sum + ((item.widthMm * item.heightMm) / 1_000_000) * item.pricePerSqm * qty;
    }, 0);

    const saleTotal = Math.max(
      totalAmount > 0 ? totalAmount : 0,
      Math.round(saleFromItems * 100) / 100,
      paidAmount
    );
    projectSaleById.set(projectId, saleTotal);

    let depositAt: string | undefined;
    if (paidAmount > 0) {
      depositAt = (project.startDate
        ? `${project.startDate}T00:00:00.000Z`
        : project.createdAt) ?? new Date().toISOString();
    }

    const converted: Project = {
      id: projectId,
      customerId: customer.id,
      name: (project.name ?? "").trim() || `مشروع ${project.id}`,
      location: project.description?.trim() || undefined,
      createdAt: project.createdAt ?? new Date().toISOString(),
      status,
      workflow,
      depositAt,
      depositAmount: paidAmount > 0 ? paidAmount : undefined,
      queueOrder:
        workflow === "queued" || workflow === "workshop"
          ? queueCursor++
          : undefined,
      itemsCount: items.length,
    };
    convertedProjects.push(converted);

    customer.projectsCount += 1;
    if (project.createdAt) {
      if (
        !customer.lastDealAt ||
        new Date(project.createdAt).getTime() >
          new Date(customer.lastDealAt).getTime()
      ) {
        customer.lastDealAt = project.createdAt;
      }
    }
  }

  const projectByLegacyId = new Map(
    projects.map((p) => [String(p.id), convertedProjects.find((x) => x.id === asId("p", p.id))])
  );

  for (const contract of contracts) {
    const amount = num(contract.amount, 0);
    if (amount <= 0) continue;
    if (!MONEY_CONTRACT_TYPES.has(contract.type)) continue;

    const project = projectByLegacyId.get(String(contract.projectId));
    if (!project) continue;

    const kindLabel =
      contract.type === "agreement" ? "اتفاق / مقدمة" : "إيصال استلام";
    payments.push({
      id: asId("pay", contract.id),
      customerId: project.customerId,
      projectId: project.id,
      kind: contract.type === "agreement" ? "deposit" : "payment",
      amount,
      date: (contract.date ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10),
      method: "cash",
      note: [kindLabel, contract.details?.trim()].filter(Boolean).join(" — "),
      createdAt: contract.date ?? new Date().toISOString(),
    });
  }

  // أي مشروع له paidAmount بدون عقود مالية كافية → دفعة تكميلية
  for (const project of projects) {
    const converted = projectByLegacyId.get(String(project.id));
    if (!converted) continue;
    const paidAmount = num(project.paidAmount, 0);
    if (paidAmount <= 0) continue;
    const already = payments
      .filter((p) => p.projectId === converted.id)
      .reduce((sum, p) => sum + p.amount, 0);
    const remainder = Math.round((paidAmount - already) * 100) / 100;
    if (remainder > 0.01) {
      payments.push({
        id: asId("pay-adj", project.id),
        customerId: converted.customerId,
        projectId: converted.id,
        kind: "payment",
        amount: remainder,
        date:
          (project.updatedAt ?? project.createdAt ?? "").slice(0, 10) ||
          new Date().toISOString().slice(0, 10),
        method: "cash",
        note: "تسوية من إجمالي المدفوع (البرنامج القديم)",
        createdAt: project.updatedAt ?? project.createdAt ?? new Date().toISOString(),
      });
    }
  }

  for (const customer of customers) {
    const owned = convertedProjects.filter((p) => p.customerId === customer.id);
    const owed = owned.reduce(
      (sum, p) => sum + (projectSaleById.get(p.id) ?? 0),
      0
    );
    const paid = payments
      .filter((p) => p.customerId === customer.id)
      .reduce((sum, p) => sum + p.amount, 0);
    customer.balance = Math.max(0, Math.round((owed - paid) * 100) / 100);
  }

  const expenses: Expense[] = expensesRaw.map((expense) => {
    const projectId =
      expense.projectId != null && expense.projectId !== ""
        ? asId("p", expense.projectId)
        : undefined;
    const linked =
      projectId && projectItems[projectId] ? projectId : undefined;
    return {
      id: asId("exp", expense.id),
      category: mapExpenseCategory(expense.category),
      description: (expense.description ?? "").trim() || "مصروف",
      amount: num(expense.amount, 0),
      date: (expense.date ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10),
      projectId: linked,
      note: expense.type === "project" ? "مصروف مشروع (مستورد)" : undefined,
      createdAt: expense.date
        ? `${String(expense.date).slice(0, 10)}T00:00:00.000Z`
        : new Date().toISOString(),
    };
  });

  const settings = readSettings(backup);
  const company: Company = {
    name: settings?.companyName?.trim() || "ويندور",
    phone: settings?.phone?.trim() || undefined,
    address: settings?.address?.trim() || undefined,
    note: settings?.contractTerms?.trim() || undefined,
  };

  const skippedKeys = (
    [
      "itemTypes",
      "defaultStages",
      "notifications",
    ] as const
  ).filter((key) => {
    const value = backup[key];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });

  const hr = convertLegacyHr(
    backup,
    new Set(convertedProjects.map((project) => project.id))
  );

  const sharedData = {
    [STORAGE_KEYS.customers]: JSON.stringify(customers),
    [DELETED_CUSTOMERS_KEY]: JSON.stringify([]),
    [STORAGE_KEYS.projects]: JSON.stringify(convertedProjects),
    [STORAGE_KEYS.deletedProjects]: JSON.stringify([]),
    [STORAGE_KEYS.projectItems]: JSON.stringify(projectItems),
    [STORAGE_KEYS.materialSystems]: null,
    [STORAGE_KEYS.company]: JSON.stringify(company),
    [STORAGE_KEYS.pricing]: null,
    [STORAGE_KEYS.invoices]: JSON.stringify([]),
    [STORAGE_KEYS.payments]: JSON.stringify(payments),
    [STORAGE_KEYS.expenses]: JSON.stringify(expenses),
    [STORAGE_KEYS.employees]: JSON.stringify(hr.employees),
    [STORAGE_KEYS.attendance]: JSON.stringify(hr.attendance),
    [STORAGE_KEYS.advances]: JSON.stringify(hr.advances),
    [STORAGE_KEYS.payroll]: JSON.stringify(hr.payroll),
    [STORAGE_KEYS.projectAssignments]: JSON.stringify(hr.assignments),
  } as Record<SharedStorageKey, string | null>;

  // تأكيد أن كل المفاتيح المشتركة موجودة
  for (const key of SHARED_STORAGE_KEYS) {
    if (!(key in sharedData)) sharedData[key] = null;
  }

  const localData: Record<string, string | null> = {
    [STORAGE_KEYS.unit]: "cm",
    [DATA_VERSION_KEY]: CLEAN_START_VERSION,
  };

  return {
    sharedData,
    localData,
    summary: {
      customers: customers.length,
      projects: convertedProjects.length,
      items: itemsCount,
      payments: payments.length,
      expenses: expenses.length,
      employees: hr.employees.length,
      skippedKeys,
    },
  };
}

/** يبني ملف باكب بصيغة البرنامج الحالي (للإدخال من الإعدادات أو السكربت) */
export function buildUpvcBackupFromLegacy(backup: LegacyBackup): UpvcBackupPayload {
  const { sharedData, localData, summary } = convertLegacyBackup(backup);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      ...sharedData,
      ...localData,
    },
    meta: {
      source: "legacy-workshop",
      summary,
    },
  };
}

export function formatLegacyImportSummary(summary: LegacyImportSummary): string {
  const skipped =
    summary.skippedKeys.length > 0
      ? ` (تخطّينا: ${summary.skippedKeys.join("، ")} — مش مدعومين في البرنامج الحالي)`
      : "";
  const employeesBit =
    summary.employees > 0 ? `، ${summary.employees} موظف` : "";
  return `تم ترحيل ${summary.customers} عميل، ${summary.projects} مشروع، ${summary.items} بند، ${summary.payments} دفعة، ${summary.expenses} مصروف${employeesBit}${skipped}`;
}
