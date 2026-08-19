import {
  defaultPaneConfig,
  normalizePaneConfig,
  type PaneConfig,
  type PaneOpening,
} from "@/lib/design-items";
import { listPaneIds, type LayoutNode } from "@/lib/window-layout";

/** ضلفة تشغيل (مفصلي / جرار / قلاب / باب) */
export function isOperableOpening(opening: PaneOpening): boolean {
  return (
    opening !== "fixed" &&
    opening !== "exhaust" &&
    opening !== "panel-h" &&
    opening !== "panel-v"
  );
}

type HorizontalRowCtx = {
  /** تقسيم أفقي يحتوي الصف العلوي والسفلي */
  hSplit: Extract<LayoutNode, { type: "split" }>;
  /** الضلفة في الصف العلوي */
  isTopRow: boolean;
};

function findHorizontalRowCtx(
  node: LayoutNode,
  paneId: string,
  hAncestor: Extract<LayoutNode, { type: "split" }> | null = null
): HorizontalRowCtx | null {
  if (node.type === "pane") {
    if (node.id !== paneId) return null;
    if (!hAncestor || hAncestor.dir !== "h") return null;
    const topChild = hAncestor.children[0]!;
    const inTop = paneInSubtree(topChild, paneId);
    return { hSplit: hAncestor, isTopRow: inTop };
  }
  if (node.type === "empty") return null;

  const nextAncestor =
    node.dir === "h" ? node : hAncestor;

  for (const child of node.children) {
    const found = findHorizontalRowCtx(child, paneId, nextAncestor);
    if (found) return found;
  }
  return null;
}

function paneInSubtree(node: LayoutNode, paneId: string): boolean {
  if (node.type === "pane") return node.id === paneId;
  if (node.type === "empty") return false;
  return node.children.some((c) => paneInSubtree(c, paneId));
}

function hasOperableBelow(hSplit: Extract<LayoutNode, { type: "split" }>, panes: Record<string, PaneConfig>): boolean {
  for (let i = 1; i < hSplit.children.length; i++) {
    for (const id of listPaneIds(hSplit.children[i]!)) {
      const opening = (panes[id]?.opening ?? "fixed") as PaneOpening;
      if (isOperableOpening(opening)) return true;
    }
  }
  return false;
}

/** شباك بترانسوم علوي — صف علوي + صف سفلي على الأقل */
export function isTransomTopLayout(layout: LayoutNode): boolean {
  if (layout.type !== "split" || layout.dir !== "h" || layout.children.length < 2) {
    return false;
  }
  const topIds = listPaneIds(layout.children[0]!);
  const bottomIds = layout.children
    .slice(1)
    .flatMap((c) => listPaneIds(c));
  return topIds.length > 0 && bottomIds.length > 0;
}

/** معرّفات الضلف في الصف العلوي لترانسوم */
export function transomTopPaneIds(layout: LayoutNode): string[] {
  if (!isTransomTopLayout(layout)) return [];
  if (layout.type !== "split") return [];
  return listPaneIds(layout.children[0]!);
}

/** ضلفة ثابتة في الصف العلوي فوق ضلف تشغيل */
export function isDouranEligible(
  paneId: string,
  layout: LayoutNode,
  panes: Record<string, PaneConfig>
): boolean {
  const ctx = findHorizontalRowCtx(layout, paneId);
  if (!ctx || !ctx.isTopRow) return false;

  const cfg = normalizePaneConfig(panes[paneId]);
  if (cfg.opening !== "fixed" || cfg.bouclier) return false;

  return hasOperableBelow(ctx.hSplit, panes);
}

/** يطبّق قواعد الدوران — يحترم دائماً اختيار المستخدم اليدوي، لا يفعّل تلقائياً */
export function applyDouranRules(
  layout: LayoutNode,
  panes: Record<string, PaneConfig>
): Record<string, PaneConfig> {
  const next: Record<string, PaneConfig> = { ...panes };

  for (const id of listPaneIds(layout)) {
    const cfg = normalizePaneConfig(next[id] ?? defaultPaneConfig());
    const eligible = isDouranEligible(id, layout, { ...next, [id]: cfg });

    if (!eligible) {
      // مش مؤهل — امسح الدوران إلا لو المستخدم اختاره يدوياً
      if (!cfg.douranManual) {
        next[id] = { ...cfg, douran: false };
      }
      continue;
    }

    // مؤهل — احترم اختيار المستخدم اليدوي، ولو مش يدوي سيبه ثابت عادي
    next[id] = { ...cfg, douran: Boolean(cfg.douranManual ? cfg.douran : false) };
  }

  return next;
}

/** تهيئة ضلف تمblt ترانسوم: علوي دوران، سفلي مفصلي */
export function panesForTransomLayout(
  layout: LayoutNode
): Record<string, PaneConfig> {
  const panes: Record<string, PaneConfig> = {};
  const ids = listPaneIds(layout);

  if (isTransomTopLayout(layout)) {
    const topIds = new Set(transomTopPaneIds(layout));
    const bottomIds = ids.filter((id) => !topIds.has(id));
    for (const id of topIds) {
      panes[id] = defaultPaneConfig({ opening: "fixed" });
    }
    bottomIds.forEach((id, i) => {
      panes[id] = defaultPaneConfig({
        opening: i % 2 === 0 ? "casement-right" : "casement-left",
      });
    });
  } else {
    for (const id of ids) {
      panes[id] = defaultPaneConfig();
    }
  }

  return applyDouranRules(layout, panes);
}
