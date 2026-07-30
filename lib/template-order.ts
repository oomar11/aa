import {
  WINDOW_TEMPLATES,
  type WindowTemplate,
} from "@/lib/window-templates";
import { STORAGE_KEYS } from "@/lib/storage/keys";

/** @deprecated استخدم STORAGE_KEYS.templateOrder */
export const TEMPLATE_ORDER_KEY = STORAGE_KEYS.templateOrder;

export function getDefaultTemplateOrder(): string[] {
  return WINDOW_TEMPLATES.map((t) => t.id);
}

/** Keep known ids, drop unknowns, append any new catalog templates at the end. */
export function normalizeTemplateOrder(ids: string[]): string[] {
  const known = new Set(WINDOW_TEMPLATES.map((t) => t.id));
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const id of ids) {
    if (known.has(id) && !seen.has(id)) {
      ordered.push(id);
      seen.add(id);
    }
  }

  for (const template of WINDOW_TEMPLATES) {
    if (!seen.has(template.id)) {
      ordered.push(template.id);
    }
  }

  return ordered;
}

export function loadTemplateOrder(): string[] {
  if (typeof window === "undefined") return getDefaultTemplateOrder();

  try {
    const raw = localStorage.getItem(TEMPLATE_ORDER_KEY);
    if (!raw) return getDefaultTemplateOrder();
    const parsed: unknown = JSON.parse(raw);
    if (
      !Array.isArray(parsed) ||
      !parsed.every((item) => typeof item === "string")
    ) {
      return getDefaultTemplateOrder();
    }
    return normalizeTemplateOrder(parsed);
  } catch {
    return getDefaultTemplateOrder();
  }
}

export function saveTemplateOrder(ids: string[]): string[] {
  const normalized = normalizeTemplateOrder(ids);
  localStorage.setItem(TEMPLATE_ORDER_KEY, JSON.stringify(normalized));
  return normalized;
}

export function resetTemplateOrder(): string[] {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TEMPLATE_ORDER_KEY);
  }
  return getDefaultTemplateOrder();
}

export function getOrderedTemplates(order?: string[]): WindowTemplate[] {
  const ids =
    order ??
    (typeof window !== "undefined"
      ? loadTemplateOrder()
      : getDefaultTemplateOrder());
  const byId = new Map(WINDOW_TEMPLATES.map((t) => [t.id, t]));
  return ids
    .map((id) => byId.get(id))
    .filter((t): t is WindowTemplate => Boolean(t));
}

/** Move item at `from` so it ends at index `to`. */
export function moveItemToSlot<T>(list: T[], from: number, to: number): T[] {
  if (
    from < 0 ||
    to < 0 ||
    from >= list.length ||
    to >= list.length ||
    from === to
  ) {
    return list;
  }
  const next = list.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}
