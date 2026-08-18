import {
  FRAME_COLORS,
  isExtraChargeItem,
  normalizeFrameColor,
  normalizePaneConfig,
  resolvePaneMeshKind,
  type DesignItem,
} from "@/lib/design-items";
import {
  defaultMeshTypeForKind,
  findGlassBottle,
  findMeshType,
  findSystem,
  meshKindLabel,
  type MaterialCatalog,
  loadMaterialCatalog,
} from "@/lib/material-systems";
import {
  effectiveItemMaterials,
  projectAccessoryDisplayName,
  projectUsesCustomAccessory,
  type ProjectMaterialDefaults,
} from "@/lib/project-materials";
import { listPaneIds } from "@/lib/window-layout";

export type ReportMaterialRow = {
  label: string;
  value: string;
};

function dash(value?: string | null): string {
  const t = value?.trim();
  return t ? t : "—";
}

function itemGlassLabel(
  item: Pick<DesignItem, "glassPane1Id" | "glassPane2Id" | "glassGeorgian">,
  catalog: MaterialCatalog
): string {
  const glass1 = findGlassBottle(item.glassPane1Id, catalog);
  if (!glass1?.name) return "—";
  const glass2 = findGlassBottle(item.glassPane2Id, catalog);
  if (!glass2?.name) return glass1.name;
  return item.glassGeorgian
    ? `${glass1.name} + ${glass2.name} · جورجيا`
    : `${glass1.name} + ${glass2.name}`;
}

function itemMeshLabel(
  item: DesignItem,
  catalog: MaterialCatalog
): string {
  const panes = item.panes ?? {};
  const ids = item.layout
    ? listPaneIds(item.layout)
    : Object.keys(panes);
  const names: string[] = [];
  const seen = new Set<string>();

  for (const id of ids) {
    const cfg = normalizePaneConfig(panes[id]);
    if (!cfg.mesh) continue;
    const kind = resolvePaneMeshKind(cfg, cfg.opening, catalog);
    const meshType =
      findMeshType(cfg.meshTypeId, catalog) ??
      defaultMeshTypeForKind(kind, catalog);
    const name =
      meshType?.name?.trim() || meshKindLabel(kind, catalog) || "سلك";
    if (seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }

  return names.length > 0 ? names.join(" · ") : "بدون";
}

function itemAccessoryLabel(
  mats: DesignItem,
  project: ProjectMaterialDefaults | null | undefined,
  catalog: MaterialCatalog
): string | null {
  if (mats.accessoryId && mats.accessoryId !== "none") {
    return findSystem("accessories", mats.accessoryId, catalog)?.name ?? null;
  }
  if (projectUsesCustomAccessory(project)) {
    return projectAccessoryDisplayName(project, catalog);
  }
  return null;
}

/** يجهّز صفوف الخامات المعروضة في تقرير العميل / عرض السعر */
export function reportMaterialRows(
  item: DesignItem,
  project?: ProjectMaterialDefaults | null,
  catalog?: MaterialCatalog
): ReportMaterialRow[] {
  if (isExtraChargeItem(item)) return [];
  const cat = catalog ?? loadMaterialCatalog();
  const mats = effectiveItemMaterials(item, project, cat);
  const profile = findSystem("profiles", mats.systemId, cat);

  return [
    {
      label: "اللون",
      value: FRAME_COLORS[normalizeFrameColor(item.frameColor)].label,
    },
    { label: "القطاع", value: dash(profile?.name) },
    { label: "الاكسسوار", value: dash(itemAccessoryLabel(mats, project, cat)) },
    { label: "الزجاج", value: itemGlassLabel(mats, cat) },
    { label: "السلك", value: itemMeshLabel(item, cat) },
  ];
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

  return [
    { label: "نوع القطاع", value: dash(profile?.name) },
    { label: "اللون", value: color },
    { label: "الزجاج", value: itemGlassLabel(mats, cat) },
  ];
}
