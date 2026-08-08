import { DELETED_CUSTOMERS_KEY, STORAGE_KEYS } from "@/lib/storage/keys";
import {
  sharedGetItem,
  sharedSetItem,
} from "@/lib/storage/shared-client";
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
  /** معرف العميل في المحل (مصدر الحقيقة المحاسبي) */
  storeCustomerId?: string;
};

/** @deprecated استخدم STORAGE_KEYS.customers */
export const CUSTOMERS_STORAGE_KEY = STORAGE_KEYS.customers;

export const CUSTOMERS_UPDATED_EVENT = "upvc-customers-updated";

export function loadLocalCustomers(): Customer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sharedGetItem(CUSTOMERS_STORAGE_KEY);
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
  sharedSetItem(
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
  const deletedRaw = sharedGetItem(DELETED_CUSTOMERS_KEY);
  let deleted: string[] = [];
  try {
    deleted = deletedRaw ? (JSON.parse(deletedRaw) as string[]) : [];
  } catch {
    deleted = [];
  }
  if (!deleted.includes(customerId)) deleted.push(customerId);
  sharedSetItem(DELETED_CUSTOMERS_KEY, JSON.stringify(deleted));
  sharedSetItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(existing));
  notifyCustomersUpdated();
}

export function loadDeletedCustomerIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sharedGetItem(DELETED_CUSTOMERS_KEY);
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
