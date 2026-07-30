/** مفاتيح التخزين المحلي — مصدر واحد لكل البيانات المحفوظة */

export const STORAGE_KEYS = {
  theme: "upvc-theme",
  unit: "upvc-unit",
  customers: "upvc-customers",
  projects: "upvc-projects",
  projectItems: "upvc-project-items",
  materialSystems: "upvc-material-systems",
  templateOrder: "upvc-template-order",
  company: "upvc-company",
  invoices: "upvc-invoices",
  payments: "upvc-payments",
  expenses: "upvc-expenses",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/** أحداث مزامنة الكتالوج بين الشاشات */
export const CATALOG_EVENTS = {
  catalogUpdated: "upvc-material-catalog-updated",
  meshUpdated: "upvc-mesh-catalog-updated",
  accessoryBrandsUpdated: "upvc-accessory-brands-updated",
} as const;
