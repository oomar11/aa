import {
  FRAME_COLORS,
  type DesignItem,
  type FrameColorId,
} from "@/lib/design-items";
import {
  findGlassBottle,
  findSystem,
  loadMaterialCatalog,
  type MaterialCatalog,
} from "@/lib/material-systems";
import {
  effectiveItemMaterials,
  projectAccessoryDisplayName,
  projectUsesCustomAccessory,
  type ProjectMaterialDefaults,
} from "@/lib/project-materials";

export type ReportMaterialRow = {
  label: string;
  value: string;
};

/** يجهّز صفوف الخامات المعروضة في تقرير العميل */
export function reportMaterialRows(
  item: DesignItem,
  project?: ProjectMaterialDefaults | null,
  catalog?: MaterialCatalog
): ReportMaterialRow[] {
  const cat = catalog ?? loadMaterialCatalog();
  const mats = effectiveItemMaterials(item, project, cat);
  const rows: ReportMaterialRow[] = [];

  const frameId = (item.frameColor ?? "white") as FrameColorId;
  const frameLabel = FRAME_COLORS[frameId]?.label ?? frameId;
  rows.push({ label: "لون الإطار", value: frameLabel });

  const profile = findSystem("profiles", mats.systemId, cat);
  if (profile?.name) {
    rows.push({ label: "نظام القطاعات", value: profile.name });
  }

  let accessoryName: string | null = null;
  if (mats.accessoryId && mats.accessoryId !== "none") {
    accessoryName = findSystem("accessories", mats.accessoryId, cat)?.name ?? null;
  } else if (projectUsesCustomAccessory(project)) {
    accessoryName = projectAccessoryDisplayName(project, cat);
  }
  if (accessoryName) {
    rows.push({ label: "الاكسسوار", value: accessoryName });
  }

  const glass1 = findGlassBottle(mats.glassPane1Id, cat);
  if (glass1?.name) {
    const glass2 = findGlassBottle(mats.glassPane2Id, cat);
    let glassLabel = glass1.name;
    if (glass2?.name) {
      glassLabel = `${glass1.name} + ${glass2.name}`;
      if (mats.glassGeorgian) glassLabel += " · جورجيا";
    }
    rows.push({ label: "الزجاج", value: glassLabel });
  }

  if (mats.ironId && mats.ironId !== "none") {
    const iron = findSystem("iron", mats.ironId, cat);
    if (iron?.name) {
      rows.push({ label: "الحديد", value: iron.name });
    }
  }

  return rows;
}
