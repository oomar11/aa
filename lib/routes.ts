/**
 * خريطة مسارات التطبيق — مرجع واحد لكل الروابط والتسميات العربية
 *
 * التدفق الرئيسي (5 أبواب):
 *   الرئيسية → ملخص اليوم + اختصارات
 *   الطلبات → العملاء والمقايسات + طلب جديد
 *   الورشة → تنفيذ + انتظار + متوقف + تسليم
 *   الحسابات → دفعات · مصروفات · حركة
 *   المزيد → خامات · إعدادات · نسخ احتياطي
 */

export const ROUTES = {
  /** الصفحة الأولى = الرئيسية */
  home: "/",
  /** العمل اليومي في الورشة */
  workshop: "/workshop",
  /** قائمة المزيد: خامات وإعدادات */
  more: "/more",
  /** توافق قديم */
  profile: "/profile",
  settings: "/settings",
  settingsDesign: "/settings/design",
  settingsCompany: "/settings/company",
  settingsPricing: "/settings/pricing",
  orders: "/orders",

  design: {
    hub: "/design",
    newCustomer: "/design/new-customer",
    customers: "/design/customers",
    editCustomer: (customerId: string) =>
      `/design/customers/edit?customer=${customerId}`,
    projects: (customerId: string) =>
      `/design/projects?customer=${customerId}`,
    newProject: (customerId: string) =>
      `/design/projects/new?customer=${customerId}`,
    editor: (customerId: string, projectId: string, tab?: string) => {
      const base = `/design/editor?customer=${customerId}&project=${projectId}`;
      return tab ? `${base}&tab=${tab}` : base;
    },
    draw: (customerId: string, projectId: string, itemId: string) =>
      `/design/draw?customer=${customerId}&project=${projectId}&item=${itemId}`,
    projectSettings: (customerId: string, projectId: string) =>
      `/design/project-settings?customer=${customerId}&project=${projectId}`,
    /** حساب المشروع — يفتح تبويب الحساب داخل المحرر */
    account: (customerId: string, projectId: string) =>
      `/design/editor?customer=${customerId}&project=${projectId}&tab=account`,
    /** مصروفات المشروع — يفتح تبويب المصروفات داخل المحرر */
    expenses: (customerId: string, projectId: string) =>
      `/design/editor?customer=${customerId}&project=${projectId}&tab=expenses`,
  },

  accounting: {
    hub: "/accounting",
    payments: "/accounting/payments",
    newPayment: "/accounting/payments/new",
    /** تحصيل دفعة لمشروع محدد */
    depositForProject: (customerId: string, projectId: string) =>
      `/accounting/payments/new?customer=${customerId}&project=${projectId}`,
    /** تعديل دفعة موجودة */
    editPayment: (paymentId: string) =>
      `/accounting/payments/new?payment=${paymentId}`,
    /** مصروفات الورشة — تسجيل وعرض */
    expenses: "/accounting/expenses",
    newExpense: "/accounting/expenses/new",
    /** سجل حركة الفلوس (تحصيل + مصروف) */
    ledger: "/accounting/ledger",
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

/** الأقسام الظاهرة في شريط التنقل السفلي — 5 أبواب */
export const APP_SECTIONS = [
  {
    id: "home",
    label: "الرئيسية",
    description: "ملخص اليوم والاختصارات",
    href: ROUTES.home,
    color: "#2B7DE9",
  },
  {
    id: "orders",
    label: "الطلبات",
    description: "المقايسات والمشاريع + طلب جديد",
    href: ROUTES.orders,
    color: "#E85A8A",
  },
  {
    id: "workshop",
    label: "الورشة",
    description: "قيد التنفيذ وقائمة الانتظار",
    href: ROUTES.workshop,
    color: "#C47A12",
  },
  {
    id: "accounting",
    label: "الحسابات",
    description: "دفعات · مصروفات · حركة",
    href: ROUTES.accounting.hub,
    color: "#2F9B7A",
  },
  {
    id: "more",
    label: "المزيد",
    description: "خامات · إعدادات · نسخ احتياطي",
    href: ROUTES.more,
    color: "#6B7C93",
  },
] as const;
