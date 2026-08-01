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
  const existing = loadLocalCustomers().filter((c) => c.id !== customerId);
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

/** لا بذرة — البداية نظيفة */
export const customers: Customer[] = [];
