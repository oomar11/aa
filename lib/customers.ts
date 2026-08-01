import { STORAGE_KEYS } from "@/lib/storage/keys";
import { listAllProjects } from "@/lib/projects";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address?: string;
  note?: string;
  balance: number;
  lastDealAt: string;
  projectsCount: number;
};

/** @deprecated استخدم STORAGE_KEYS.customers */
export const CUSTOMERS_STORAGE_KEY = STORAGE_KEYS.customers;

export const CUSTOMERS_UPDATED_EVENT = "upvc-customers-updated";

export function loadLocalCustomers(): Customer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Customer[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function notifyCustomersUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CUSTOMERS_UPDATED_EVENT));
}

/** دمج المحلي مع البذرة بدون تكرار بالمعرّف */
export function mergeCustomers(): Customer[] {
  if (typeof window === "undefined") return customers;
  const local = loadLocalCustomers();
  const localIds = new Set(local.map((c) => c.id));
  const deleted = new Set(loadDeletedCustomerIds());
  return [
    ...local.filter((c) => !deleted.has(c.id)),
    ...customers.filter((c) => !localIds.has(c.id) && !deleted.has(c.id)),
  ];
}

export function getCustomerById(customerId: string): Customer | undefined {
  return mergeCustomers().find((c) => c.id === customerId);
}

export function upsertCustomer(customer: Customer) {
  if (typeof window === "undefined") return;
  const existing = loadLocalCustomers().filter((c) => c.id !== customer.id);
  // إن كان من البذرة ولم يُحفظ محلياً بعد — انسخه محلياً مع التعديل
  localStorage.setItem(
    CUSTOMERS_STORAGE_KEY,
    JSON.stringify([customer, ...existing])
  );
  notifyCustomersUpdated();
}

export function deleteCustomer(customerId: string) {
  if (typeof window === "undefined") return;
  const hasProjects = listAllProjects().some((p) => p.customerId === customerId);
  if (hasProjects) {
    throw new Error("لا يمكن حذف عميل له مشاريع");
  }
  // إخفاء عميل البذرة: خزّنه كمحذوف عبر قائمة محلية فارغة من هذا id + tombstone
  const existing = loadLocalCustomers().filter((c) => c.id !== customerId);
  // لو كان من البذرة فقط، احفظ نسخة محذوفة بعلامة — نستخدم قائمة deleted
  const deletedKey = "upvc-deleted-customers";
  const deletedRaw = localStorage.getItem(deletedKey);
  let deleted: string[] = [];
  try {
    deleted = deletedRaw ? (JSON.parse(deletedRaw) as string[]) : [];
  } catch {
    deleted = [];
  }
  if (!deleted.includes(customerId)) deleted.push(customerId);
  localStorage.setItem(deletedKey, JSON.stringify(deleted));
  localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(existing));
  notifyCustomersUpdated();
}

export function loadDeletedCustomerIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("upvc-deleted-customers");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** عدد مشاريع العميل الفعلي */
export function customerProjectsCount(customerId: string): number {
  return listAllProjects().filter((p) => p.customerId === customerId).length;
}

export const customers: Customer[] = [
  {
    id: "1",
    name: "أحمد محمد",
    phone: "01001234567",
    address: "المعادي",
    balance: 12500,
    lastDealAt: "2026-07-18",
    projectsCount: 4,
  },
  {
    id: "2",
    name: "محمود علي",
    phone: "01009876543",
    address: "مدينة نصر",
    balance: 0,
    lastDealAt: "2026-06-02",
    projectsCount: 2,
  },
  {
    id: "3",
    name: "سارة حسن",
    phone: "01112223344",
    address: "الشيخ زايد",
    balance: 4800,
    lastDealAt: "2026-07-22",
    projectsCount: 3,
  },
  {
    id: "4",
    name: "يوسف إبراهيم",
    phone: "01223334455",
    address: "6 أكتوبر",
    balance: 22000,
    lastDealAt: "2026-05-14",
    projectsCount: 7,
  },
  {
    id: "5",
    name: "نورا عبد الرحمن",
    phone: "01556667788",
    address: "مصر الجديدة",
    balance: 0,
    lastDealAt: "2026-07-01",
    projectsCount: 1,
  },
  {
    id: "6",
    name: "خالد فتحي",
    phone: "01005556666",
    address: "الجيزة",
    balance: 3500,
    lastDealAt: "2026-04-28",
    projectsCount: 5,
  },
];
