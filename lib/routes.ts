/**
 * خريطة مسارات التطبيق — مرجع واحد لكل الروابط والتسميات العربية
 *
 * التدفق الرئيسي:
 *   الرئيسية → آخر المشاريع + طلب جديد
 *   الطلبات → العملاء/المشاريع + طلب جديد → عميل → مشروع → بنود → رسم
 *   الخامات → (قطاعات | اكسسوار | زجاج | سلك | حديد)
 */

export const ROUTES = {
  home: "/",
  profile: "/profile",
  settings: "/settings",
  settingsDesign: "/settings/design",
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

/** الأقسام الظاهرة في شريط التنقل السفلي */
export const APP_SECTIONS = [
  {
    id: "home",
    label: "الرئيسية",
    description: "آخر المشاريع وطلب جديد",
    href: ROUTES.home,
    color: "#2B7DE9",
  },
  {
    id: "orders",
    label: "الطلبات",
    description: "كل العملاء والمشاريع + طلب جديد",
    href: ROUTES.orders,
    color: "#E85A8A",
  },
  {
    id: "materials",
    label: "الخامات",
    description: "قطاعات · اكسسوار · تخصيمات · زجاج · سلك · حديد",
    href: ROUTES.materials.hub,
    color: "#E8956F",
  },
] as const;
