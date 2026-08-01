import { STORAGE_KEYS } from "@/lib/storage/keys";

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
  "upvc-deleted-customers",
] as const;

/**
 * مسح بيانات العملاء/المشاريع/المحاسبة من الجهاز.
 * لا يمس إعدادات الثيم أو الشركة أو الخامات.
 */
export function clearBusinessData() {
  if (typeof window === "undefined") return;
  for (const key of BUSINESS_KEYS) {
    localStorage.removeItem(key);
  }
}

/**
 * ترحيل لمرة واحدة: يمسح بيانات التجربة القديمة عند أول فتح بعد التحديث.
 */
export function runCleanStartMigration(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(DATA_VERSION_KEY) === CLEAN_START_VERSION) {
    return false;
  }
  clearBusinessData();
  localStorage.setItem(DATA_VERSION_KEY, CLEAN_START_VERSION);
  return true;
}
