/**
 * Server-only: after PVC data is saved, push collections (and deterministic
 * sales / voids) to the store ledger.
 * Never import from Client Components.
 *
 * ملاحظات تصميم:
 * - الدفعات: بتتبعت بالمبلغ نفسه، والمحذوف بيتبعت له `workshop_void`.
 * - البيع: السيرفر ما يقدرش يحسب سعر البنود زي العميل (الأسعار بتعتمد على
 *   كتالوج النظام في المتصفح)، فمايبعتش قيد بيع غير لما يكون فيه `agreedSale`
 *   (مبلغ متفق عليه = رقم ثابت). باقي المشاريع بيبعتها `store-ledger-mirror.ts`
 *   من المتصفح بالحساب الصح — كده مفيش مصدرين بيتنافسوا على نفس `sale:<id>`.
 * - أي طلب يفشل بيتخزن في سجل الفشل ويتعاد تلقائياً في أول مزامنة جاية.
 */
import { STORAGE_KEYS } from "@/lib/storage/keys";
import type { WorkshopStoreSnapshot } from "@/lib/storage/server-store";
import { getOutboundStoreBridge } from "@/lib/store-bridge-server";
import {
  LedgerSyncError,
  clearPendingLedgerBodies,
  loadPendingLedgerBodies,
  type LedgerBody,
} from "@/lib/ledger-sync-failures";

type SnapshotProject = {
  id: string;
  customerId: string;
  name: string;
  workflow?: string;
  agreedSale?: number;
};

type SnapshotCustomer = {
  id: string;
  storeCustomerId?: string;
};

type SnapshotPayment = {
  id: string;
  customerId: string;
  projectId?: string;
  amount: number;
  date?: string;
  note?: string;
};

const CONCURRENCY = 4;
/** حد زمني للمزامنة جوه الطلب — اللي مخلصش بيتأجل للإعادة */
const DEADLINE_MS = 25_000;

function roundMoney(amount: number): number {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

type SaleDecision =
  | { mode: "post"; amount: number }
  | { mode: "void" }
  | { mode: "skip" };

function paidFor(projectId: string, payments: SnapshotPayment[]): number {
  return payments
    .filter((p) => p.projectId === projectId)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

function decideSale(
  project: SnapshotProject,
  payments: SnapshotPayment[]
): SaleDecision {
  if (project.workflow === "quote") return { mode: "void" };
  const agreed = Number(project.agreedSale);
  if (Number.isFinite(agreed) && agreed > 0) {
    // الزيادة على نفس الشغلانة ما تعملش رصيد دائن: قيد البيع = الأكبر بين الاتنين
    return {
      mode: "post",
      amount: roundMoney(Math.max(agreed, paidFor(project.id, payments))),
    };
  }
  return { mode: "skip" };
}

function saleFingerprint(project: SnapshotProject, d: SaleDecision): string {
  const amount = d.mode === "post" ? d.amount : 0;
  return `${project.id}:${d.mode}:${amount}:${project.customerId}`;
}

function payFingerprint(p: SnapshotPayment): string {
  return `${p.id}:${roundMoney(Number(p.amount) || 0)}:${p.projectId || ""}:${p.customerId}`;
}

async function postLedger(
  storeUrl: string,
  secret: string,
  body: LedgerBody
): Promise<void> {
  const res = await fetch(`${storeUrl}/api/workshop/parties/ledger`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "x-workshop-bridge-secret": secret,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error || `ledger ${res.status}`);
  }
}

/**
 * Push PVC collections / voids (and agreed-price sales) that changed onto the
 * store customer ledger. Throws LedgerSyncError if anything could not be sent.
 */
export async function syncWorkshopSnapshotToStore(
  before: WorkshopStoreSnapshot | null,
  after: WorkshopStoreSnapshot,
  changedKeys: string[]
): Promise<void> {
  const moneyKeys: string[] = [
    STORAGE_KEYS.projects,
    STORAGE_KEYS.projectItems,
    STORAGE_KEYS.payments,
    STORAGE_KEYS.customers,
  ];
  if (!changedKeys.some((key) => moneyKeys.includes(key))) return;

  const bridge = getOutboundStoreBridge();
  if (!bridge.configured) return;

  const customers = parseJson<SnapshotCustomer[]>(
    after.data[STORAGE_KEYS.customers],
    []
  );
  const beforeCustomers = parseJson<SnapshotCustomer[]>(
    before?.data[STORAGE_KEYS.customers],
    []
  );
  const projects = parseJson<SnapshotProject[]>(
    after.data[STORAGE_KEYS.projects],
    []
  );
  const payments = parseJson<SnapshotPayment[]>(
    after.data[STORAGE_KEYS.payments],
    []
  );
  const beforePayments = parseJson<SnapshotPayment[]>(
    before?.data[STORAGE_KEYS.payments],
    []
  );
  const beforeProjects = parseJson<SnapshotProject[]>(
    before?.data[STORAGE_KEYS.projects],
    []
  );

  // الحالي بيكسب على القديم (لو العميل اتحذف نفضل نعرف رقمه في المتجر)
  const storeIdByCustomer = new Map<string, string>();
  for (const c of [...beforeCustomers, ...customers]) {
    if (c.storeCustomerId) storeIdByCustomer.set(c.id, c.storeCustomerId);
  }

  const forceAll = !before;
  const bodies = new Map<string, LedgerBody>();

  // 1) طلبات فشلت قبل كده — تتعاد (والجديد لنفس الـ ref بيكسب)
  const pending = await loadPendingLedgerBodies(
    after.data[STORAGE_KEYS.ledgerSyncFailures]
  );
  const pendingRefs = new Set(pending.map((b) => b.source_ref));
  for (const body of pending) bodies.set(body.source_ref, body);

  // 2) دفعات جديدة/متغيّرة
  const beforePay = new Set(beforePayments.map(payFingerprint));
  const afterPayIds = new Set(payments.map((p) => p.id));
  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  for (const pay of payments) {
    if (!forceAll && beforePay.has(payFingerprint(pay))) continue;
    const storeCustomerId = storeIdByCustomer.get(pay.customerId);
    if (!storeCustomerId) continue;
    bodies.set(`pay:${pay.id}`, {
      source_system: "aa",
      source_ref: `pay:${pay.id}`,
      party_type: "customer",
      store_customer_id: storeCustomerId,
      entry_type: "workshop_collection",
      amount: Number(pay.amount) || 0,
      direction: "credit",
      occurred_at: pay.date ? `${pay.date}T12:00:00.000Z` : null,
      notes: pay.note || null,
      project_label: (pay.projectId && projectName.get(pay.projectId)) || null,
      details: {
        kind: "aa_payment",
        project_id: pay.projectId || null,
        payment_id: pay.id,
        local_party_id: pay.customerId,
        customer_id: pay.customerId,
      },
    });
  }

  // 3) دفعات اتحذفت — void
  for (const pay of beforePayments) {
    if (afterPayIds.has(pay.id)) continue;
    const storeCustomerId = storeIdByCustomer.get(pay.customerId);
    if (!storeCustomerId) continue;
    bodies.set(`pay:${pay.id}`, {
      source_system: "aa",
      source_ref: `pay:${pay.id}`,
      party_type: "customer",
      store_customer_id: storeCustomerId,
      entry_type: "workshop_void",
      amount: 0,
      direction: "credit",
      occurred_at: null,
      notes: "حذف دفعة ورشة",
      project_label: null,
      details: {
        kind: "aa_payment",
        project_id: pay.projectId || null,
        payment_id: pay.id,
        local_party_id: pay.customerId,
        customer_id: pay.customerId,
      },
    });
  }

  // 4) مبيعات المشاريع
  const beforeDecision = new Map<string, { fp: string; d: SaleDecision }>();
  for (const p of beforeProjects) {
    const d = decideSale(p, beforePayments);
    beforeDecision.set(p.id, { fp: saleFingerprint(p, d), d });
  }
  const afterProjectIds = new Set(projects.map((p) => p.id));

  for (const project of projects) {
    const d = decideSale(project, payments);
    if (d.mode === "skip") continue;
    const prev = beforeDecision.get(project.id);
    if (!forceAll && prev?.fp === saleFingerprint(project, d)) continue;
    // مقايسة جديدة ما اتبعتش قبل كده — مفيش حاجة تتلغي
    if (d.mode === "void" && !forceAll && prev?.d.mode === undefined) continue;
    if (d.mode === "void" && !forceAll && prev?.d.mode === "void") continue;
    const storeCustomerId = storeIdByCustomer.get(project.customerId);
    if (!storeCustomerId) continue;
    const amount = d.mode === "post" ? d.amount : 0;
    bodies.set(`sale:${project.id}`, {
      source_system: "aa",
      source_ref: `sale:${project.id}`,
      party_type: "customer",
      store_customer_id: storeCustomerId,
      entry_type: amount > 0 ? "workshop_sale" : "workshop_void",
      amount,
      direction: "debit",
      occurred_at: null,
      notes:
        amount > 0
          ? `بيع مشروع ${project.name}`
          : `إلغاء مقايسة ${project.name}`,
      project_label: project.name,
      details: {
        kind: "aa_project_sale",
        project_id: project.id,
        project_name: project.name,
        local_party_id: project.customerId,
        customer_id: project.customerId,
        sale_amount: amount,
        paid: paidFor(project.id, payments),
      },
    });
  }

  // 5) مشاريع اتحذفت — void لأي قيد بيع كان متسجّل
  for (const project of beforeProjects) {
    if (afterProjectIds.has(project.id)) continue;
    if (project.workflow === "quote") continue;
    const storeCustomerId = storeIdByCustomer.get(project.customerId);
    if (!storeCustomerId) continue;
    bodies.set(`sale:${project.id}`, {
      source_system: "aa",
      source_ref: `sale:${project.id}`,
      party_type: "customer",
      store_customer_id: storeCustomerId,
      entry_type: "workshop_void",
      amount: 0,
      direction: "debit",
      occurred_at: null,
      notes: `حذف مشروع ${project.name}`,
      project_label: project.name,
      details: {
        kind: "aa_project_sale",
        project_id: project.id,
        project_name: project.name,
        local_party_id: project.customerId,
        customer_id: project.customerId,
        sale_amount: 0,
      },
    });
  }

  if (bodies.size === 0) return;

  // إرسال بتوازي محدود وحد زمني؛ اللي يفشل أو ما يلحقش بيتخزن للإعادة
  const queue = [...bodies.values()];
  const started = Date.now();
  const failed: LedgerBody[] = [];
  const succeeded: string[] = [];
  const errors: string[] = [];
  let next = 0;

  async function worker() {
    while (next < queue.length) {
      const body = queue[next++]!;
      if (Date.now() - started > DEADLINE_MS) {
        failed.push(body);
        continue;
      }
      try {
        await postLedger(bridge.storeUrl, bridge.secret, body);
        succeeded.push(body.source_ref);
      } catch (err) {
        console.error("[store-ledger]", body.source_ref, err);
        failed.push(body);
        errors.push(
          `${body.source_ref}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker())
  );

  // اللي نجح (حتى لو كان معلّق قبل كده) يتشال من قايمة الإعادة
  await clearPendingLedgerBodies(succeeded.filter((ref) => pendingRefs.has(ref)));

  if (failed.length > 0) {
    throw new LedgerSyncError(
      `فشل إرسال ${failed.length} قيد للمتجر${errors.length ? ` — ${errors[0]}` : " (انتهى الوقت)"}`,
      failed
    );
  }
}
