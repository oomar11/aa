import {
  DELETED_CUSTOMERS_KEY,
  STORAGE_KEYS,
} from "@/lib/storage/keys";
import { clearSharedBusinessKeys } from "@/lib/storage/shared-client";

/** يرفع مرة واحدة لمسح بيانات التجربة والبدء نظيفاً */
export const DATA_VERSION_KEY = "upvc-data-version";
export const CLEAN_START_VERSION = "3-clean-start";

const BUSINESS_KEYS = [
  STORAGE_KEYS.customers,
  STORAGE_KEYS.projects,
  STORAGE_KEYS.deletedProjects,
  STORAGE_KEYS.projectItems,
  STORAGE_KEYS.invoices,
  STORAGE_KEYS.payments,
  STORAGE_KEYS.expenses,
  DELETED_CUSTOMERS_KEY,
] as const;

/**
 * مسح بيانات العملاء/المشاريع/المحاسبة من الورشة المشتركة والجهاز.
 * لا يمس إعدادات الثيم أو الشركة أو الخامات.
 */
export function clearBusinessData() {
  if (typeof window === "undefined") return;
  void clearSharedBusinessKeys(BUSINESS_KEYS);
}

/**
 * ترحيل لمرة واحدة: يمسح بيانات التجربة القديمة عند أول فتح بعد التحديث.
 * يبقى محلياً حتى لا يمسح بيانات الورشة المشتركة لكل الأجهزة.
 */
export function runCleanStartMigration(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(DATA_VERSION_KEY) === CLEAN_START_VERSION) {
    return false;
  }
  // لا نمسح السيرفر هنا — الترحيل القديمّي القديم فقط لبيانات التجربة القديمة على الجهاز
  for (const key of BUSINESS_KEYS) {
    localStorage.removeItem(key);
  }
  localStorage.setItem(DATA_VERSION_KEY, CLEAN_START_VERSION);
  return true;
}

export { BUSINESS_KEYS };
