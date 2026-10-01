import { readWorkshopStore, patchWorkshopStore } from "@/lib/storage/server-store";
import { STORAGE_KEYS } from "@/lib/storage/keys";

/** جسم طلب قيد الأستاذ اللي بيتبعت لـ /api/workshop/parties/ledger */
export type LedgerBody = Record<string, unknown> & { source_ref: string };

export type LedgerSyncFailure = {
  id: string;
  at: string;
  keys: string[];
  error: string;
  /** طلبات فشلت وهتتعاد تلقائياً في أول مزامنة جاية */
  retry?: LedgerBody[];
};

/** يترمي لما بعض قيود الأستاذ فشلت — بيشيل الطلبات عشان تتعاد. */
export class LedgerSyncError extends Error {
  retry: LedgerBody[];
  constructor(message: string, retry: LedgerBody[]) {
    super(message);
    this.name = "LedgerSyncError";
    this.retry = retry;
  }
}

const MAX_FAILURES = 20;

function parseList(raw: string | null | undefined): LedgerSyncFailure[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as LedgerSyncFailure[]) : [];
  } catch {
    // سجل تالف — نبدأ من جديد بدل ما نوقع الطلب
    return [];
  }
}

/**
 * سجل مزامنة الحسابات مع المتجر اللي فشلت. لو الخطأ LedgerSyncError فالطلبات
 * اللي فشلت بتتخزن في `retry` وبتتعاد تلقائياً في أول مزامنة جاية.
 */
export async function recordLedgerSyncFailure(
  keys: string[],
  error: unknown
): Promise<void> {
  try {
    const snapshot = await readWorkshopStore();
    let list = parseList(snapshot.data[STORAGE_KEYS.ledgerSyncFailures]);
    const entry: LedgerSyncFailure = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      at: new Date().toISOString(),
      keys,
      error: error instanceof Error ? error.message : String(error),
      ...(error instanceof LedgerSyncError && error.retry.length > 0
        ? { retry: error.retry }
        : {}),
    };
    list = [entry, ...list].slice(0, MAX_FAILURES);
    await patchWorkshopStore({
      [STORAGE_KEYS.ledgerSyncFailures]: JSON.stringify(list),
    });
  } catch (err) {
    console.error("[ledger-sync-failures] failed to record", err);
  }
}

/** الطلبات المعلّقة للإعادة — الأحدث بيكسب لو نفس source_ref اتكرر. */
export async function loadPendingLedgerBodies(
  rawFailures: string | null | undefined
): Promise<LedgerBody[]> {
  const byRef = new Map<string, LedgerBody>();
  for (const entry of parseList(rawFailures)) {
    for (const body of entry.retry ?? []) {
      if (body && typeof body.source_ref === "string" && !byRef.has(body.source_ref)) {
        byRef.set(body.source_ref, body);
      }
    }
  }
  return [...byRef.values()];
}

/** بعد نجاح الإعادة: شيل الطلبات دي من السجل (السطور نفسها تفضل كتاريخ). */
export async function clearPendingLedgerBodies(refs: string[]): Promise<void> {
  if (refs.length === 0) return;
  try {
    const snapshot = await readWorkshopStore();
    const done = new Set(refs);
    const list = parseList(snapshot.data[STORAGE_KEYS.ledgerSyncFailures]);
    let changed = false;
    for (const entry of list) {
      if (!entry.retry) continue;
      const left = entry.retry.filter((b) => !done.has(b.source_ref));
      if (left.length !== entry.retry.length) {
        changed = true;
        if (left.length > 0) entry.retry = left;
        else delete entry.retry;
      }
    }
    if (changed) {
      await patchWorkshopStore({
        [STORAGE_KEYS.ledgerSyncFailures]: JSON.stringify(list),
      });
    }
  } catch (err) {
    console.error("[ledger-sync-failures] failed to clear", err);
  }
}
