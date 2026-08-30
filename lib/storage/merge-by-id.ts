/**
 * دمج مصفوفات JSON المشتركة بالـ id بين الأجهزة.
 * المشاريع: الحقول العامة من الأحدث + مسار الورشة/التسليم من الأقدم تقدماً.
 */

import { STORAGE_KEYS, type SharedStorageKey } from "@/lib/storage/keys";

export type MergeRow = {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  workflow?: string;
  status?: string;
  deliveryStatus?: string;
  deliveredAt?: string;
  [key: string]: unknown;
};

const WORKFLOW_RANK: Record<string, number> = {
  quote: 1,
  queued: 2,
  workshop: 3,
  done: 4,
};

const DELIVERY_RANK: Record<string, number> = {
  awaiting: 1,
  delivered: 2,
};

/** تقدّم الورشة — أعلى = أقدم حالة (للتعادل لما مفيش updatedAt) */
export function workshopProgressRank(row: MergeRow): number {
  const w = WORKFLOW_RANK[String(row.workflow || "")] ?? 0;
  const d = DELIVERY_RANK[String(row.deliveryStatus || "")] ?? 0;
  const deliveredBonus = row.deliveredAt ? 1 : 0;
  return w * 10 + d * 2 + deliveredBonus;
}

export function rowRecencyMs(row: MergeRow): number {
  const updated = Date.parse(String(row.updatedAt || "")) || 0;
  if (updated > 0) return updated;
  return Date.parse(String(row.createdAt || "")) || 0;
}

/** هل الصف الأيسر أحدث من اليمين (أو أكثر تقدماً في الورشة عند التعادل)؟ */
export function shouldPreferRow(
  candidate: MergeRow,
  existing: MergeRow
): boolean {
  const candidateT = rowRecencyMs(candidate);
  const existingT = rowRecencyMs(existing);
  if (candidateT !== existingT) return candidateT > existingT;

  const candidateRank = workshopProgressRank(candidate);
  const existingRank = workshopProgressRank(existing);
  return candidateRank > existingRank;
}

/**
 * دمج مشروعين: الحقول العامة من الأحدث، ومسار الورشة/التسليم من الأقدم تقدماً
 * عشان تعديل اسم على جهاز قديم ما يمسحتش «تم التسليم» من جهاز تاني.
 */
export function mergeProjectRows(a: MergeRow, b: MergeRow): MergeRow {
  const newer = shouldPreferRow(a, b) ? a : b;
  const older = newer === a ? b : a;
  const merged: MergeRow = { ...older, ...newer };

  const aWorkflow = String(a.workflow || "");
  const bWorkflow = String(b.workflow || "");
  if ((WORKFLOW_RANK[aWorkflow] ?? 0) >= (WORKFLOW_RANK[bWorkflow] ?? 0)) {
    merged.workflow = a.workflow ?? b.workflow;
  } else {
    merged.workflow = b.workflow ?? a.workflow;
  }
  merged.status = merged.workflow === "done" ? "done" : "open";

  const aDelivery = String(a.deliveryStatus || "");
  const bDelivery = String(b.deliveryStatus || "");
  if ((DELIVERY_RANK[aDelivery] ?? 0) >= (DELIVERY_RANK[bDelivery] ?? 0)) {
    merged.deliveryStatus = a.deliveryStatus ?? b.deliveryStatus;
    merged.deliveredAt = a.deliveredAt ?? b.deliveredAt;
  } else {
    merged.deliveryStatus = b.deliveryStatus ?? a.deliveryStatus;
    merged.deliveredAt = b.deliveredAt ?? a.deliveredAt;
  }

  if (merged.workflow !== "done") {
    merged.deliveryStatus = undefined;
    merged.deliveredAt = undefined;
  }

  const aT = rowRecencyMs(a);
  const bT = rowRecencyMs(b);
  if (aT > 0 || bT > 0) {
    merged.updatedAt = new Date(Math.max(aT, bT)).toISOString();
  }

  return merged;
}

export function mergeJsonArraysById(
  localRaw: string,
  serverRaw: string,
  options?: { key?: SharedStorageKey }
): { value: string; localOnly: boolean } {
  try {
    const local = JSON.parse(localRaw) as unknown;
    const server = JSON.parse(serverRaw) as unknown;
    if (!Array.isArray(local) || !Array.isArray(server)) {
      return { value: serverRaw, localOnly: false };
    }

    const mergeProjects = options?.key === STORAGE_KEYS.projects;
    const byId = new Map<string, MergeRow>();
    for (const item of server as MergeRow[]) {
      if (item && typeof item.id === "string") byId.set(item.id, item);
    }
    let localOnly = false;
    for (const item of local as MergeRow[]) {
      if (!item || typeof item.id !== "string") continue;
      const existing = byId.get(item.id);
      if (!existing) {
        byId.set(item.id, item);
        localOnly = true;
        continue;
      }
      if (mergeProjects) {
        const merged = mergeProjectRows(item, existing);
        byId.set(item.id, merged);
        if (JSON.stringify(merged) !== JSON.stringify(existing)) {
          localOnly = true;
        }
      } else if (shouldPreferRow(item, existing)) {
        byId.set(item.id, item);
        localOnly = true;
      }
    }
    return { value: JSON.stringify([...byId.values()]), localOnly };
  } catch {
    return { value: serverRaw, localOnly: false };
  }
}
