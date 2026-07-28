import type { DesignItem, PaneOpening } from "@/lib/design-items";
import { listPaneIds, type LayoutNode } from "@/lib/window-layout";

type OpeningFamily =
  | "sliding"
  | "drawer"
  | "casement"
  | "tilt"
  | "fixed"
  | "exhaust"
  | "panel"
  | "mixed";

function openingFamily(opening: PaneOpening): Exclude<OpeningFamily, "mixed"> {
  if (opening === "sliding-left" || opening === "sliding-right") return "sliding";
  if (opening === "drawer-left" || opening === "drawer-right") return "drawer";
  if (
    opening === "casement-left" ||
    opening === "casement-right" ||
    opening === "door-left" ||
    opening === "door-right" ||
    opening === "tilt-turn" ||
    opening === "tilt-turn-left"
  ) {
    return "casement";
  }
  if (opening === "tilt" || opening === "tilt-inverted") return "tilt";
  if (opening === "exhaust") return "exhaust";
  if (opening === "panel-h" || opening === "panel-v") return "panel";
  return "fixed";
}

const FAMILY_LABEL: Record<Exclude<OpeningFamily, "mixed">, string> = {
  sliding: "سحاب",
  drawer: "جرار",
  casement: "مفصلي",
  tilt: "قلاب",
  fixed: "ثابت",
  exhaust: "شفاط",
  panel: "بانل",
};

function paneCountLabel(count: number): string {
  if (count <= 1) return "ضلفة";
  if (count === 2) return "ضلفتين";
  return `${count} ضلف`;
}

function dominantFamily(
  layout: LayoutNode | undefined,
  panes: DesignItem["panes"]
): OpeningFamily {
  const ids = layout ? listPaneIds(layout) : [];
  if (ids.length === 0) return "fixed";

  const counts = new Map<Exclude<OpeningFamily, "mixed">, number>();
  for (const id of ids) {
    const opening = (panes?.[id]?.opening ?? "fixed") as PaneOpening;
    const family = openingFamily(opening);
    counts.set(family, (counts.get(family) ?? 0) + 1);
  }

  if (counts.size > 1) {
    const max = Math.max(...counts.values());
    const leaders = [...counts.entries()].filter(([, n]) => n === max);
    if (leaders.length > 1) return "mixed";
  }

  let best: Exclude<OpeningFamily, "mixed"> = "fixed";
  let bestCount = -1;
  for (const [family, n] of counts) {
    if (n > bestCount) {
      best = family;
      bestCount = n;
    }
  }
  return best;
}

function isDoorLike(item: DesignItem): boolean {
  if (item.heightMm >= 1900) return true;
  const layout = item.layout;
  if (!layout) return false;
  for (const id of listPaneIds(layout)) {
    const pane = item.panes?.[id];
    if (pane?.isDoor) return true;
    if (pane?.opening === "door-left" || pane?.opening === "door-right") {
      return true;
    }
  }
  return false;
}

/** يولد اسم بند عربي من الرسم (بدون المقاس) */
export function suggestItemName(item: DesignItem): string {
  const kind = isDoorLike(item) ? "باب" : "شباك";
  const family = dominantFamily(item.layout, item.panes);
  const style = family === "mixed" ? "مختلط" : FAMILY_LABEL[family];
  const paneCount = item.layout ? listPaneIds(item.layout).length : 1;
  const panes = paneCountLabel(Math.max(1, paneCount));
  return `${kind} ${style} ${panes}`;
}

/** يحدّث الاسم لو مش مخصص */
export function withSuggestedName(item: DesignItem): DesignItem {
  if (item.nameIsCustom) return item;
  return { ...item, name: suggestItemName(item), nameIsCustom: false };
}
