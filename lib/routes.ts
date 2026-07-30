/**
 * خريطة مسارات التطبيق — مرجع واحد لكل الروابط والتسميات العربية
 *
 * التدفق الرئيسي:
 *   الرئيسية → تصميم → عميل → مشروع → قائمة البنود → محرر الرسم
 *   الرئيسية → خامات → (قطاعات | اكسسوار | زجاج | سلك | حديد)
 *   الرئيسية → طلبات
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
    profileBrands: "/materials/profiles/brands",
    profileSystem: (systemId: string) => `/materials/profiles/${systemId}`,
    accessories: "/materials/accessories",
    accessoryBrands: "/materials/accessories/brands",
    accessorySystem: (systemId: string) =>
      `/materials/accessories/${systemId}`,
    glass: "/materials/glass",
    glassSystem: (systemId: string) => `/materials/glass/${systemId}`,
    iron: "/materials/iron",
    ironSystem: (systemId: string) => `/materials/iron/${systemId}`,
    mesh: "/materials/mesh",
  },
} as const;

/** أقسام التطبيق الثلاثة — للعرض في الواجهة */
export const APP_SECTIONS = [
  {
    id: "design",
    label: "التصميم",
    description: "عميل → مشروع → بنود → رسم وحساب",
    href: ROUTES.design.hub,
    color: "#4BA3F5",
  },
  {
    id: "orders",
    label: "الطلبات",
    description: "تصفح العملاء والمشاريع والإجماليات",
    href: ROUTES.orders,
    color: "#E85A8A",
  },
  {
    id: "materials",
    label: "الخامات",
    description: "قطاعات · اكسسوار · زجاج · سلك · حديد",
    href: ROUTES.materials.hub,
    color: "#E8956F",
  },
] as const;
