import {
  FRAME_COLORS,
  isExtraChargeItem,
  normalizeFrameColor,
  type DesignItem,
} from "@/lib/design-items";
import {
  findGlassBottle,
  findSystem,
  getIronSystem,
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
  if (isExtraChargeItem(item)) return [];
  const cat = catalog ?? loadMaterialCatalog();
  const mats = effectiveItemMaterials(item, project, cat);
  const rows: ReportMaterialRow[] = [];

  rows.push({
    label: "اللون",
    value: FRAME_COLORS[normalizeFrameColor(item.frameColor)].label,
  });

  const profile = findSystem("profiles", mats.systemId, cat);
  if (profile?.name) {
    rows.push({ label: "القطاعات", value: profile.name });
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

  {
    const iron = getIronSystem(cat);
    if (iron.name) {
      rows.push({ label: "الحديد", value: iron.name });
    }
  }

  return rows;
}

/** صفوف أمر تشغيل الورشة: نوع القطاع واللون والزجاج فقط — بدون أسعار أو اكسسوار */
export function workshopOrderMaterialRows(
  item: DesignItem,
  project?: ProjectMaterialDefaults | null,
  catalog?: MaterialCatalog
): ReportMaterialRow[] {
  if (isExtraChargeItem(item)) return [];
  const cat = catalog ?? loadMaterialCatalog();
  const mats = effectiveItemMaterials(item, project, cat);

  const profile = findSystem("profiles", mats.systemId, cat);
  const color = FRAME_COLORS[normalizeFrameColor(item.frameColor)].label;

  let glassLabel = "—";
  const glass1 = findGlassBottle(mats.glassPane1Id, cat);
  if (glass1?.name) {
    const glass2 = findGlassBottle(mats.glassPane2Id, cat);
    glassLabel = glass1.name;
    if (glass2?.name) {
      glassLabel = `${glass1.name} + ${glass2.name}`;
      if (mats.glassGeorgian) glassLabel += " · جورجيا";
    }
  }

  return [
    { label: "نوع القطاع", value: profile?.name?.trim() || "—" },
    { label: "اللون", value: color },
    { label: "الزجاج", value: glassLabel },
  ];
}
