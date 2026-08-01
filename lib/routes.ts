/**
 * خريطة مسارات التطبيق — مرجع واحد لكل الروابط والتسميات العربية
 *
 * التدفق الرئيسي (4 أبواب — كل باب لشغل واحد):
 *   الورشة → الشغل الحالي + الطابور + آخر المشاريع
 *   الطلبات → العملاء/المقايسات + طلب جديد + استلام عربون
 *   الحسابات → فواتير · تحصيل · مصروفات
 *   الخامات → قطاعات · اكسسوار · زجاج · سلك · حديد
 */

export const ROUTES = {
  /** الصفحة الأولى = الورشة (يوم الشغل) */
  home: "/",
  /** توافق قديم — يوجّه للورشة */
  workshop: "/",
  profile: "/profile",
  settings: "/settings",
  settingsDesign: "/settings/design",
  settingsCompany: "/settings/company",
  orders: "/orders",

  design: {
    hub: "/design",
    newCustomer: "/design/new-customer",
    customers: "/design/customers",
    projects: (customerId: string) =>
      `/design/projects?customer=${customerId}`,
    newProject: (customerId: string) =>
      `/design/projects/new?customer=${customerId}`,
    editor: (customerId: string, projectId: string) =>
      `/design/editor?customer=${customerId}&project=${projectId}`,
    draw: (customerId: string, projectId: string, itemId: string) =>
      `/design/draw?customer=${customerId}&project=${projectId}&item=${itemId}`,
    projectSettings: (customerId: string, projectId: string) =>
      `/design/project-settings?customer=${customerId}&project=${projectId}`,
  },

  accounting: {
    hub: "/accounting",
    invoices: "/accounting/invoices",
    newInvoice: "/accounting/invoices/new",
    invoice: (id: string) => `/accounting/invoices/${id}`,
    payments: "/accounting/payments",
    newPayment: "/accounting/payments/new",
    /** تحصيل عربون لمشروع معيّن */
    depositForProject: (customerId: string, projectId: string) =>
      `/accounting/payments/new?customer=${customerId}&project=${projectId}`,
    expenses: "/accounting/expenses",
    newExpense: "/accounting/expenses/new",
  },

  materials: {
    hub: "/materials",
    profiles: "/materials/profiles",
    profileSystem: (systemId: string) => `/materials/profiles/${systemId}`,
    accessories: "/materials/accessories",
    accessoryBrands: "/materials/accessories/brands",
    accessorySystem: (systemId: string) =>
      `/materials/accessories/${systemId}`,
    deductions: "/materials/deductions",
    glass: "/materials/glass",
    glassSystem: (systemId: string) => `/materials/glass/${systemId}`,
    iron: "/materials/iron",
    ironSystem: (systemId: string) => `/materials/iron/${systemId}`,
    mesh: "/materials/mesh",
  },
} as const;

/** الأقسام الظاهرة في شريط التنقل السفلي — 4 أبواب بدون تكرار */
export const APP_SECTIONS = [
  {
    id: "workshop",
    label: "الورشة",
    description: "الشغل الحالي والطابور وآخر المشاريع",
    href: ROUTES.home,
    color: "#2B7DE9",
  },
  {
    id: "orders",
    label: "الطلبات",
    description: "المقايسات والعملاء + طلب جديد + عربون",
    href: ROUTES.orders,
    color: "#E85A8A",
  },
  {
    id: "accounting",
    label: "الحسابات",
    description: "فواتير · تحصيل · مصروفات",
    href: ROUTES.accounting.hub,
    color: "#2F9B7A",
  },
  {
    id: "materials",
    label: "الخامات",
    description: "قطاعات · اكسسوار · تخصيمات · زجاج · سلك · حديد",
    href: ROUTES.materials.hub,
    color: "#E8956F",
  },
] as const;
