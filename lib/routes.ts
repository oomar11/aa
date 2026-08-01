/**
 * خريطة مسارات التطبيق — مرجع واحد لكل الروابط والتسميات العربية
 *
 * التدفق الرئيسي (4 أبواب — كل باب لغرض واحد):
 *   الورشة → العمل الحالي + قائمة الانتظار + أحدث المشاريع
 *   الطلبات → العملاء والمقايسات + طلب جديد + تسجيل العربون
 *   الحسابات → فواتير · تحصيل · مصروفات
 *   الخامات → قطاعات · اكسسوار · زجاج · سلك · حديد
 */

export const ROUTES = {
  /** الصفحة الأولى = الورشة (العمل اليومي) */
  home: "/",
  /** توافق قديم — يوجّه إلى الورشة */
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
    /** تحصيل عربون لمشروع محدد */
    depositForProject: (customerId: string, projectId: string) =>
      `/accounting/payments/new?customer=${customerId}&project=${projectId}`,
    expenses: "/accounting/expenses",
    newExpense: "/accounting/expenses/new",
    /** مصروف مربوط بمشروع محدد */
    expenseForProject: (customerId: string, projectId: string) =>
      `/accounting/expenses/new?customer=${customerId}&project=${projectId}`,
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

/** الأقسام الظاهرة في شريط التنقل السفلي — 4 أبواب دون تكرار */
export const APP_SECTIONS = [
  {
    id: "workshop",
    label: "الورشة",
    description: "العمل الحالي وقائمة الانتظار وأحدث المشاريع",
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
    description: "فواتير · دفعات · مصروفات",
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
