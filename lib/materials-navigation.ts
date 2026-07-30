import type { Crumb } from "@/components/layout/AppBreadcrumb";
import { ROUTES } from "@/lib/routes";

/** مسار التنقل لقسم الخامات — مرجع واحد لكل الصفحات */
export const MATERIALS_HUB_CRUMB: Crumb = {
  label: "الخامات",
  href: ROUTES.materials.hub,
};

export function materialsHubBreadcrumb(): Crumb[] {
  return [MATERIALS_HUB_CRUMB];
}

export function materialsProfilesBreadcrumb(): Crumb[] {
  return [MATERIALS_HUB_CRUMB, { label: "القطاعات" }];
}

export function materialsProfileSystemBreadcrumb(systemName?: string): Crumb[] {
  return [
    MATERIALS_HUB_CRUMB,
    { label: "القطاعات", href: ROUTES.materials.profiles },
    { label: systemName?.trim() || "تفاصيل النظام" },
  ];
}

export function materialsAccessoriesBreadcrumb(): Crumb[] {
  return [MATERIALS_HUB_CRUMB, { label: "الاكسسوار" }];
}

export function materialsAccessorySystemBreadcrumb(systemName?: string): Crumb[] {
  return [
    MATERIALS_HUB_CRUMB,
    { label: "الاكسسوار", href: ROUTES.materials.accessories },
    { label: systemName?.trim() || "تفاصيل النظام" },
  ];
}

export function materialsGlassBreadcrumb(): Crumb[] {
  return [MATERIALS_HUB_CRUMB, { label: "الزجاج" }];
}

export function materialsGlassSystemBreadcrumb(systemName?: string): Crumb[] {
  return [
    MATERIALS_HUB_CRUMB,
    { label: "الزجاج", href: ROUTES.materials.glass },
    { label: systemName?.trim() || "تفاصيل الزجاجة" },
  ];
}

export function materialsIronBreadcrumb(): Crumb[] {
  return [MATERIALS_HUB_CRUMB, { label: "الحديد" }];
}

export function materialsIronSystemBreadcrumb(systemName?: string): Crumb[] {
  return [
    MATERIALS_HUB_CRUMB,
    { label: "الحديد", href: ROUTES.materials.iron },
    { label: systemName?.trim() || "تفاصيل النظام" },
  ];
}

export function materialsMeshBreadcrumb(): Crumb[] {
  return [MATERIALS_HUB_CRUMB, { label: "السلك" }];
}

export function materialsDeductionsBreadcrumb(): Crumb[] {
  return [MATERIALS_HUB_CRUMB, { label: "التخصيمات" }];
}

/** خطوات العمل لصفحات فيها أكثر من مرحلة (اختياري) */
export type MaterialWorkflowStep = {
  step: number;
  title: string;
  description: string;
  href?: string;
  active?: boolean;
};
