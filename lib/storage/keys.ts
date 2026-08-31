/** مفاتيح التخزين — مصدر واحد لكل البيانات المحفوظة */

export const STORAGE_KEYS = {
  unit: "upvc-unit",
  customers: "upvc-customers",
  projects: "upvc-projects",
  deletedProjects: "upvc-deleted-projects",
  projectItems: "upvc-project-items",
  materialSystems: "upvc-material-systems",
  templateOrder: "upvc-template-order",
  company: "upvc-company",
  pricing: "upvc-pricing",
  invoices: "upvc-invoices",
  payments: "upvc-payments",
  expenses: "upvc-expenses",
  /** ملاحظات المتابعة: قال / عمل / وعد */
  activityNotes: "upvc-activity-notes",
  /** موظفون الورشة */
  employees: "upvc-employees",
  /** حضور يومي */
  attendance: "upvc-attendance",
  /** سلف الموظفين */
  advances: "upvc-advances",
  /** صرف الرواتب */
  payroll: "upvc-payroll",
  /** تعيين عمال على شغلانة */
  projectAssignments: "upvc-project-assignments",
  /** ربط خزنة المتجر (محلي للجهاز — لا يُرفع للقاعدة لتجنب تسريب المفتاح) */
  storeBridge: "upvc-store-bridge",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/** مفتاح tombstone للعملاء المحذوفين (غير مدرج تاريخياً في STORAGE_KEYS) */
export const DELETED_CUSTOMERS_KEY = "upvc-deleted-customers";

/**
 * بيانات الورشة المشتركة — نفس القيم لكل الأجهزة على نفس السيرفر.
 * وحدة القياس وترتيب التمبلتات تبقى محلية لكل جهاز.
 * إعدادات جسر المتجر محلية فقط (فيها السر).
 */
export const SHARED_STORAGE_KEYS = [
  STORAGE_KEYS.customers,
  DELETED_CUSTOMERS_KEY,
  STORAGE_KEYS.projects,
  STORAGE_KEYS.deletedProjects,
  STORAGE_KEYS.projectItems,
  STORAGE_KEYS.materialSystems,
  STORAGE_KEYS.company,
  STORAGE_KEYS.pricing,
  STORAGE_KEYS.invoices,
  STORAGE_KEYS.payments,
  STORAGE_KEYS.expenses,
  STORAGE_KEYS.activityNotes,
  STORAGE_KEYS.employees,
  STORAGE_KEYS.attendance,
  STORAGE_KEYS.advances,
  STORAGE_KEYS.payroll,
  STORAGE_KEYS.projectAssignments,
] as const;

export type SharedStorageKey = (typeof SHARED_STORAGE_KEYS)[number];

export function isSharedStorageKey(key: string): key is SharedStorageKey {
  return (SHARED_STORAGE_KEYS as readonly string[]).includes(key);
}

/** أحداث واجهة تُطلق عند تغيّر مفتاح مشترك (مزامنة بين الشاشات) */
export const SHARED_KEY_EVENTS: Record<SharedStorageKey, string[]> = {
  [STORAGE_KEYS.customers]: ["upvc-customers-updated"],
  [DELETED_CUSTOMERS_KEY]: ["upvc-customers-updated"],
  [STORAGE_KEYS.projects]: ["upvc-projects-updated", "upvc-accounting-updated"],
  [STORAGE_KEYS.deletedProjects]: [
    "upvc-projects-updated",
    "upvc-accounting-updated",
  ],
  [STORAGE_KEYS.projectItems]: [
    "upvc-projects-updated",
    "upvc-accounting-updated",
  ],
  [STORAGE_KEYS.materialSystems]: [
    "upvc-material-catalog-updated",
    "upvc-mesh-catalog-updated",
    "upvc-accessory-brands-updated",
  ],
  [STORAGE_KEYS.company]: ["upvc-company-updated"],
  [STORAGE_KEYS.pricing]: ["upvc-pricing-updated"],
  [STORAGE_KEYS.invoices]: ["upvc-accounting-updated"],
  [STORAGE_KEYS.payments]: ["upvc-accounting-updated"],
  [STORAGE_KEYS.expenses]: ["upvc-accounting-updated"],
  [STORAGE_KEYS.activityNotes]: ["upvc-activity-updated"],
  [STORAGE_KEYS.employees]: ["upvc-hr-updated"],
  [STORAGE_KEYS.attendance]: ["upvc-hr-updated"],
  [STORAGE_KEYS.advances]: ["upvc-hr-updated"],
  [STORAGE_KEYS.payroll]: ["upvc-hr-updated", "upvc-accounting-updated"],
  [STORAGE_KEYS.projectAssignments]: ["upvc-hr-updated", "upvc-projects-updated"],
};

/** أحداث مزامنة الكتالوج بين الشاشات */
export const CATALOG_EVENTS = {
  catalogUpdated: "upvc-material-catalog-updated",
  meshUpdated: "upvc-mesh-catalog-updated",
  accessoryBrandsUpdated: "upvc-accessory-brands-updated",
} as const;
