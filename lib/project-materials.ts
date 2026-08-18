import type { DesignItem } from "@/lib/design-items";
import {
  findSystem,
  getDefaultGlassBottleId,
  getDefaultSystemId,
  normalizeAccessoryDetails,
  resolveGlassBottleId,
  type AccessorySystemDetails,
  type MaterialCatalog,
} from "@/lib/material-systems";
import type { Project } from "@/lib/projects";

export type ProjectAccessorySource = "catalog" | "custom";

/** خامات افتراضية للمشروع — تُورَّث للبنود الجديدة */
export type ProjectMaterialDefaults = {
  systemId?: string;
  accessoryId?: string;
  /** من الكتالوج أو قواعد مخصصة للمشروع */
  accessorySource?: ProjectAccessorySource;
  /** اسم نظام الاكسسوار المخصص (للعرض والحساب) */
  accessoryCustomName?: string;
  /** قواعد الاكسسوار عند accessorySource === "custom" */
  accessoryDetails?: AccessorySystemDetails;
  glassPane1Id?: string;
  glassPane2Id?: string;
  glassGeorgian?: boolean;
};

export function projectUsesCustomAccessory(
  project?: ProjectMaterialDefaults | null
): boolean {
  return (
    project?.accessorySource === "custom" &&
    project.accessoryDetails != null
  );
}

export function projectAccessoryDisplayName(
  project?: ProjectMaterialDefaults | null,
  catalog?: MaterialCatalog
): string | null {
  if (!project) return null;
  if (projectUsesCustomAccessory(project)) {
    return project.accessoryCustomName?.trim() || "اكسسوار مخصص للمشروع";
  }
  if (!project.accessoryId || project.accessoryId === "none") return null;
  return findSystem("accessories", project.accessoryId, catalog)?.name ?? null;
}

export function normalizeProjectAccessoryDetails(
  raw: unknown,
  catalog?: MaterialCatalog
): AccessorySystemDetails {
  return normalizeAccessoryDetails(raw, catalog?.accessoryBrands ?? []);
}

export function defaultProjectMaterialDefaults(
  catalog?: MaterialCatalog
): ProjectMaterialDefaults {
  return {
    systemId: getDefaultSystemId("profiles", catalog),
    accessoryId: getDefaultSystemId("accessories", catalog),
    accessorySource: "catalog",
    glassPane1Id: getDefaultGlassBottleId(catalog),
    glassGeorgian: false,
  };
}

export function projectMaterialDefaultsFrom(
  project?: Pick<Project, keyof ProjectMaterialDefaults> | null
): ProjectMaterialDefaults | null {
  if (!project) return null;
  if (
    !project.systemId &&
    !project.accessoryId &&
    project.accessorySource !== "custom" &&
    !project.accessoryDetails &&
    !project.glassPane1Id &&
    project.glassPane2Id == null &&
    project.glassGeorgian == null
  ) {
    return null;
  }
  return {
    systemId: project.systemId,
    accessoryId: project.accessoryId,
    accessorySource: project.accessorySource,
    accessoryCustomName: project.accessoryCustomName,
    accessoryDetails: project.accessoryDetails,
    glassPane1Id: project.glassPane1Id,
    glassPane2Id: project.glassPane2Id,
    glassGeorgian: project.glassGeorgian,
  };
}

export function resolveItemSystemId(
  item: Pick<DesignItem, "systemId">,
  project?: ProjectMaterialDefaults | null,
  catalog?: MaterialCatalog
): string | undefined {
  if (item.systemId && item.systemId !== "none") return item.systemId;
  if (project?.systemId && project.systemId !== "none") return project.systemId;
  const def = getDefaultSystemId("profiles", catalog);
  return def !== "none" ? def : undefined;
}

export function itemHasOwnAccessory(
  item: Pick<DesignItem, "accessoryId">
): boolean {
  return item.accessoryId != null && item.accessoryId !== "none";
}

export function resolveItemAccessoryId(
  item: Pick<DesignItem, "accessoryId">,
  project?: ProjectMaterialDefaults | null,
  catalog?: MaterialCatalog
): string | undefined {
  if (itemHasOwnAccessory(item)) return item.accessoryId;
  if (projectUsesCustomAccessory(project)) return undefined;
  if (project?.accessoryId && project.accessoryId !== "none") {
    return project.accessoryId;
  }
  const def = getDefaultSystemId("accessories", catalog);
  return def !== "none" ? def : undefined;
}

export function resolveProjectAccessoryDetails(
  project?: ProjectMaterialDefaults | null,
  catalog?: MaterialCatalog
): { details: AccessorySystemDetails; systemName: string } | null {
  if (!projectUsesCustomAccessory(project) || !project?.accessoryDetails) {
    return null;
  }
  return {
    details: normalizeProjectAccessoryDetails(project.accessoryDetails, catalog),
    systemName:
      project.accessoryCustomName?.trim() || "اكسسوار مخصص للمشروع",
  };
}

/** قيمة محفوظة: البند سنجل صراحة — متعملش وراثة دبل المشروع */
export const GLASS_PANE2_NONE = "none";

export function itemHasOwnGlass(
  item: Pick<DesignItem, "glassPane1Id" | "glassPane2Id" | "glassGeorgian">
): boolean {
  return (
    Boolean(item.glassPane1Id) ||
    item.glassPane2Id != null ||
    item.glassGeorgian != null
  );
}

export function resolveItemGlassPane1Id(
  item: Pick<DesignItem, "glassPane1Id">,
  project?: ProjectMaterialDefaults | null,
  catalog?: MaterialCatalog
): string {
  return (
    resolveGlassBottleId(item.glassPane1Id) ??
    resolveGlassBottleId(project?.glassPane1Id) ??
    getDefaultGlassBottleId(catalog)
  );
}

export function resolveItemGlassPane2Id(
  item: Pick<DesignItem, "glassPane1Id" | "glassPane2Id" | "glassGeorgian">,
  project?: ProjectMaterialDefaults | null
): string | undefined {
  if (item.glassPane2Id === GLASS_PANE2_NONE) return undefined;
  const own = resolveGlassBottleId(item.glassPane2Id);
  if (own) return own;
  // زجاج البند مختار لوحده (حتى لو سنجل من غير زجاجة تانية) — متعملش وراثة دبل المشروع
  if (itemHasOwnGlass(item)) return undefined;
  return resolveGlassBottleId(project?.glassPane2Id);
}

export function resolveItemGlassGeorgian(
  item: Pick<DesignItem, "glassPane1Id" | "glassPane2Id" | "glassGeorgian">,
  project?: ProjectMaterialDefaults | null
): boolean {
  if (item.glassGeorgian != null) return Boolean(item.glassGeorgian);
  if (itemHasOwnGlass(item)) return false;
  if (project?.glassGeorgian != null) return Boolean(project.glassGeorgian);
  return false;
}

/** بند مع خامات محلولة من المشروع (للحساب والعرض) */
export function effectiveItemMaterials(
  item: DesignItem,
  project?: ProjectMaterialDefaults | null,
  catalog?: MaterialCatalog
): DesignItem {
  const pane2 = resolveItemGlassPane2Id(item, project);
  return {
    ...item,
    systemId: resolveItemSystemId(item, project, catalog),
    accessoryId: resolveItemAccessoryId(item, project, catalog),
    glassPane1Id: resolveItemGlassPane1Id(item, project, catalog),
    glassPane2Id: pane2,
    glassGeorgian: resolveItemGlassGeorgian(item, project),
  };
}
