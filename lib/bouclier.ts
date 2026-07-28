import {
  defaultPaneConfig,
  normalizePaneConfig,
  type PaneConfig,
  type PaneOpening,
} from "@/lib/design-items";
import { listPaneIds, type LayoutNode } from "@/lib/window-layout";

type PaneCtx = {
  parentDir: "v" | "h";
  leftId?: string;
  rightId?: string;
};

function paneIdOf(node: LayoutNode): string | undefined {
  if (node.type === "pane") return node.id;
  return undefined;
}

function findPaneCtx(node: LayoutNode, paneId: string): PaneCtx | null {
  if (node.type !== "split") return null;

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i]!;
    if (child.type === "pane" && child.id === paneId) {
      const left = i > 0 ? paneIdOf(node.children[i - 1]!) : undefined;
      const right =
        i < node.children.length - 1
          ? paneIdOf(node.children[i + 1]!)
          : undefined;
      return {
        parentDir: node.dir,
        leftId: left,
        rightId: right,
      };
    }
    const nested = findPaneCtx(child, paneId);
    if (nested) return nested;
  }
  return null;
}

/** ضلفة ثابتة بين مفصلي يمين ويسار والمقابض باتجاه بعض */
export function isBouclierEligible(
  paneId: string,
  layout: LayoutNode,
  panes: Record<string, PaneConfig>
): boolean {
  const ctx = findPaneCtx(layout, paneId);
  if (!ctx || ctx.parentDir !== "v" || !ctx.leftId || !ctx.rightId) return false;

  const cfg = normalizePaneConfig(panes[paneId]);
  if (cfg.opening !== "fixed") return false;

  const leftOp = panes[ctx.leftId]?.opening as PaneOpening | undefined;
  const rightOp = panes[ctx.rightId]?.opening as PaneOpening | undefined;
  return leftOp === "casement-right" && rightOp === "casement-left";
}

/** يطبّق قواعد البوكلير التلقائية مع احترام اختيار المستخدم اليدوي */
export function applyBouclierRules(
  layout: LayoutNode,
  panes: Record<string, PaneConfig>
): Record<string, PaneConfig> {
  const next: Record<string, PaneConfig> = { ...panes };

  for (const id of listPaneIds(layout)) {
    const cfg = normalizePaneConfig(next[id] ?? defaultPaneConfig());
    const eligible = isBouclierEligible(id, layout, {
      ...next,
      [id]: cfg,
    });

    if (!eligible) {
      next[id] = { ...cfg, bouclier: false, bouclierManual: false };
      continue;
    }

    if (cfg.bouclierManual) {
      next[id] = { ...cfg, bouclier: Boolean(cfg.bouclier) };
      continue;
    }

    next[id] = { ...cfg, bouclier: true, bouclierManual: false };
  }

  return next;
}
