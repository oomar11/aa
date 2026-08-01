/**
 * ترحيل باكب البرنامج القديم (clients/projects/contracts…) إلى صيغة الورشة الحالية.
 * الأبعاد في الباكب القديم بالسنتيمتر → تُحوَّل إلى مليمتر.
 */

import type { Customer } from "@/lib/customers";
import type { DesignItem, FrameColorId, WindowStyle } from "@/lib/design-items";
import type { Company } from "@/lib/company";
import type {
  Expense,
  Invoice,
  InvoiceStatus,
  Payment,
} from "@/lib/accounting";
import type { Project, ProjectWorkflow } from "@/lib/projects";
import {
  DELETED_CUSTOMERS_KEY,
  SHARED_STORAGE_KEYS,
  STORAGE_KEYS,
  type SharedStorageKey,
} from "@/lib/storage/keys";
import { CLEAN_START_VERSION, DATA_VERSION_KEY } from "@/lib/clean-start";

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
  invoices: number;
  payments: number;
  expenses: number;
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

function asId(prefix: string, id: number | string): string {
  return `${prefix}-${id}`;
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

function inferStyle(name: string): WindowStyle {
  const n = name.toLowerCase();
  if (n.includes("باب") || n.includes("door")) return "door";
  if (n.includes("جرار") || n.includes("سحاب") || n.includes("sliding")) {
    return "sliding-2";
  }
  if (n.includes("قلاب") || n.includes("tilt")) return "casement-1";
  if (n.includes("ثابت") || n.includes("fixed")) return "fixed";
  if (n.includes("مفصلي") || n.includes("ضلفت")) return "casement-2";
  return "casement-1";
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

  return {
    id,
    name,
    nameIsCustom: true,
    style: inferStyle(name),
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
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];
  let itemsCount = 0;
  let queueCursor = 1;

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

    const invoiceTotal = Math.max(
      totalAmount > 0 ? totalAmount : 0,
      Math.round(saleFromItems * 100) / 100,
      paidAmount
    );

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

    if (invoiceTotal > 0) {
      const invoiceId = asId("inv", project.id);
      let invoiceStatus: InvoiceStatus = "issued";
      if (paidAmount <= 0) invoiceStatus = "issued";
      else if (paidAmount + 0.01 >= invoiceTotal) invoiceStatus = "paid";
      else invoiceStatus = "partial";

      invoices.push({
        id: invoiceId,
        number: `INV-${String(project.id).padStart(4, "0")}`,
        customerId: customer.id,
        projectId,
        date: (project.startDate ?? project.createdAt ?? "").slice(0, 10) ||
          new Date().toISOString().slice(0, 10),
        lines: [
          {
            id: `${invoiceId}-line-1`,
            description: converted.name,
            amount: invoiceTotal,
          },
        ],
        total: invoiceTotal,
        note: "مستورد من البرنامج القديم",
        status: invoiceStatus,
        createdAt: project.createdAt ?? new Date().toISOString(),
      });
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

    const invoice = invoices.find((i) => i.projectId === project.id);
    const kindLabel =
      contract.type === "agreement" ? "اتفاق / مقدمة" : "إيصال استلام";
    payments.push({
      id: asId("pay", contract.id),
      customerId: project.customerId,
      invoiceId: invoice?.id,
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
      const invoice = invoices.find((i) => i.projectId === converted.id);
      payments.push({
        id: asId("pay-adj", project.id),
        customerId: converted.customerId,
        invoiceId: invoice?.id,
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
    const owed = invoices
      .filter((i) => i.customerId === customer.id && i.status !== "cancelled")
      .reduce((sum, i) => sum + i.total, 0);
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
      "employees",
      "attendance",
      "advances",
      "payroll",
      "projectAssignments",
      "notifications",
    ] as const
  ).filter((key) => {
    const value = backup[key];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });

  const sharedData = {
    [STORAGE_KEYS.customers]: JSON.stringify(customers),
    [DELETED_CUSTOMERS_KEY]: JSON.stringify([]),
    [STORAGE_KEYS.projects]: JSON.stringify(convertedProjects),
    [STORAGE_KEYS.deletedProjects]: JSON.stringify([]),
    [STORAGE_KEYS.projectItems]: JSON.stringify(projectItems),
    [STORAGE_KEYS.materialSystems]: null,
    [STORAGE_KEYS.company]: JSON.stringify(company),
    [STORAGE_KEYS.pricing]: null,
    [STORAGE_KEYS.invoices]: JSON.stringify(invoices),
    [STORAGE_KEYS.payments]: JSON.stringify(payments),
    [STORAGE_KEYS.expenses]: JSON.stringify(expenses),
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
      invoices: invoices.length,
      payments: payments.length,
      expenses: expenses.length,
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
  return `تم ترحيل ${summary.customers} عميل، ${summary.projects} مشروع، ${summary.items} بند، ${summary.payments} دفعة، ${summary.invoices} فاتورة، ${summary.expenses} مصروف${skipped}`;
}
