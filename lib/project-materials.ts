import type { DesignItem } from "@/lib/design-items";
import {
  getDefaultGlassBottleId,
  getDefaultSystemId,
  resolveGlassBottleId,
  type MaterialCatalog,
} from "@/lib/material-systems";
import type { Project } from "@/lib/projects";

/** خامات افتراضية للمشروع — تُورَّث للبنود الجديدة */
export type ProjectMaterialDefaults = {
  systemId?: string;
  accessoryId?: string;
  glassPane1Id?: string;
  glassPane2Id?: string;
  glassGeorgian?: boolean;
};

export function defaultProjectMaterialDefaults(
  catalog?: MaterialCatalog
): ProjectMaterialDefaults {
  return {
    systemId: getDefaultSystemId("profiles", catalog),
    accessoryId: getDefaultSystemId("accessories", catalog),
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
    !project.glassPane1Id &&
    project.glassPane2Id == null &&
    project.glassGeorgian == null
  ) {
    return null;
  }
  return {
    systemId: project.systemId,
    accessoryId: project.accessoryId,
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

export function resolveItemAccessoryId(
  item: Pick<DesignItem, "accessoryId">,
  project?: ProjectMaterialDefaults | null,
  catalog?: MaterialCatalog
): string | undefined {
  if (item.accessoryId && item.accessoryId !== "none") return item.accessoryId;
  if (project?.accessoryId && project.accessoryId !== "none") {
    return project.accessoryId;
  }
  const def = getDefaultSystemId("accessories", catalog);
  return def !== "none" ? def : undefined;
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
  item: Pick<DesignItem, "glassPane2Id">,
  project?: ProjectMaterialDefaults | null
): string | undefined {
  return (
    resolveGlassBottleId(item.glassPane2Id) ??
    resolveGlassBottleId(project?.glassPane2Id)
  );
}

export function resolveItemGlassGeorgian(
  item: Pick<DesignItem, "glassGeorgian">,
  project?: ProjectMaterialDefaults | null
): boolean {
  if (item.glassGeorgian != null) return Boolean(item.glassGeorgian);
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
