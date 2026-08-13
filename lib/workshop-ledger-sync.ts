/**
 * Server-only: after PVC data is saved, push sales/collections to the store ledger.
 * Never import from Client Components.
 */
import { STORAGE_KEYS } from "@/lib/storage/keys";
import type { WorkshopStoreSnapshot } from "@/lib/storage/server-store";
import { getOutboundStoreBridge } from "@/lib/store-bridge-server";

type SnapshotProject = {
  id: string;
  customerId: string;
  name: string;
  workflow?: string;
  agreedSale?: number;
  discountType?: "amount" | "percent";
  discountValue?: number;
};

type SnapshotCustomer = {
  id: string;
  name?: string;
  phone?: string;
  address?: string;
  note?: string;
  storeCustomerId?: string;
};

type SnapshotPayment = {
  id: string;
  customerId: string;
  projectId?: string;
  amount: number;
  date?: string;
  note?: string;
  method?: string;
};

type SnapshotItem = {
  kind?: string;
  qty?: number;
  specialPrice?: number | null;
  customSalePricePerSqm?: number | null;
  pricePerSqm?: number;
  widthMm?: number;
  heightMm?: number;
  discountId?: string | null;
};

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

function billedItemTotal(item: SnapshotItem): number {
  const qty = Math.max(1, Number(item.qty) || 1);
  const special = Number(item.specialPrice);
  const discountId = item.discountId;
  const percent =
    discountId === "d1" ? 1 : discountId === "d3" ? 3 : discountId === "d5" ? 5 : 0;
  const apply = (n: number) =>
    percent > 0 ? n * (1 - percent / 100) : n;
  if (item.kind === "extra") {
    return apply(Number.isFinite(special) && special > 0 ? special * qty : 0);
  }
  if (Number.isFinite(special) && special > 0) {
    return apply(special * qty);
  }
  const w = Number(item.widthMm) || 0;
  const h = Number(item.heightMm) || 0;
  const unitArea = (w * h) / 1_000_000;
  const billable = unitArea > 0 ? Math.max(1, unitArea) : 1;
  const custom = Number(item.customSalePricePerSqm);
  const rate =
    Number.isFinite(custom) && custom > 0
      ? custom
      : Number(item.pricePerSqm) || 0;
  return apply(billable * rate * qty);
}

function projectSale(
  project: SnapshotProject,
  items: SnapshotItem[]
): number {
  const agreed = Number(project.agreedSale);
  if (Number.isFinite(agreed) && agreed > 0) return roundMoney(agreed);
  const subtotal = roundMoney(items.reduce((sum, it) => sum + billedItemTotal(it), 0));
  const raw = Number(project.discountValue) || 0;
  if (!project.discountType || raw <= 0 || subtotal <= 0) return subtotal;
  const discount =
    project.discountType === "percent"
      ? roundMoney(Math.min(subtotal, (subtotal * Math.min(raw, 100)) / 100))
      : roundMoney(Math.min(subtotal, raw));
  return roundMoney(Math.max(0, subtotal - discount));
}

async function postLedger(
  storeUrl: string,
  secret: string,
  body: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`${storeUrl}/api/workshop/parties/ledger`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "x-workshop-bridge-secret": secret,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error || `ledger ${res.status}`);
  }
}

/**
 * Push PVC sales + collections that changed onto the store customer ledger.
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
  const projects = parseJson<SnapshotProject[]>(
    after.data[STORAGE_KEYS.projects],
    []
  );
  const payments = parseJson<SnapshotPayment[]>(
    after.data[STORAGE_KEYS.payments],
    []
  );
  const itemsByProject = parseJson<Record<string, SnapshotItem[]>>(
    after.data[STORAGE_KEYS.projectItems],
    {}
  );
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const beforePayments = parseJson<SnapshotPayment[]>(
    before?.data[STORAGE_KEYS.payments],
    []
  );
  const beforeProjects = parseJson<SnapshotProject[]>(
    before?.data[STORAGE_KEYS.projects],
    []
  );
  const beforeItems = parseJson<Record<string, SnapshotItem[]>>(
    before?.data[STORAGE_KEYS.projectItems],
    {}
  );

  const payFingerprint = (p: SnapshotPayment) =>
    `${p.id}:${roundMoney(Number(p.amount) || 0)}:${p.projectId || ""}`;
  const beforePay = new Set(beforePayments.map(payFingerprint));

  const saleFingerprint = (p: SnapshotProject) => {
    const items = itemsByProject[p.id] || [];
    const paid = payments
      .filter((pay) => pay.projectId === p.id)
      .reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);
    const sale = projectSale(p, items);
    const accounted = p.workflow !== "quote";
    const ledger = accounted ? roundMoney(Math.max(sale, paid)) : 0;
    return `${p.id}:${accounted ? 1 : 0}:${ledger}:${p.customerId}`;
  };
  const beforeSale = new Set(
    beforeProjects.map((p) => {
      const items = beforeItems[p.id] || [];
      const paid = beforePayments
        .filter((pay) => pay.projectId === p.id)
        .reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);
      const sale = projectSale(p, items);
      const accounted = p.workflow !== "quote";
      const ledger = accounted ? roundMoney(Math.max(sale, paid)) : 0;
      return `${p.id}:${accounted ? 1 : 0}:${ledger}:${p.customerId}`;
    })
  );

  const forceAll = !before;

  for (const pay of payments) {
    if (!forceAll && beforePay.has(payFingerprint(pay))) continue;
    const customer = customerById.get(pay.customerId);
    const storeCustomerId = customer?.storeCustomerId;
    if (!storeCustomerId) continue;
    const project = projects.find((p) => p.id === pay.projectId);
    try {
      await postLedger(bridge.storeUrl, bridge.secret, {
        source_system: "aa",
        source_ref: `pay:${pay.id}`,
        party_type: "customer",
        store_customer_id: storeCustomerId,
        entry_type: "workshop_collection",
        amount: Number(pay.amount) || 0,
        direction: "credit",
        occurred_at: pay.date ? `${pay.date}T12:00:00.000Z` : null,
        notes: pay.note || null,
        project_label: project?.name || null,
        details: {
          kind: "aa_payment",
          project_id: pay.projectId || null,
          payment_id: pay.id,
          local_party_id: pay.customerId,
          customer_id: pay.customerId,
        },
      });
    } catch (err) {
      console.error("[store-ledger] payment", pay.id, err);
    }
  }

  for (const project of projects) {
    const fingerprint = saleFingerprint(project);
    if (!forceAll && beforeSale.has(fingerprint)) continue;
    const customer = customerById.get(project.customerId);
    const storeCustomerId = customer?.storeCustomerId;
    if (!storeCustomerId) continue;
    const accounted = project.workflow !== "quote";
    const items = itemsByProject[project.id] || [];
    const paid = payments
      .filter((pay) => pay.projectId === project.id)
      .reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);
    const sale = projectSale(project, items);
    const amount = accounted ? roundMoney(Math.max(sale, paid)) : 0;
    try {
      await postLedger(bridge.storeUrl, bridge.secret, {
        source_system: "aa",
        source_ref: `sale:${project.id}`,
        party_type: "customer",
        store_customer_id: storeCustomerId,
        entry_type: amount > 0 ? "workshop_sale" : "workshop_void",
        amount,
        direction: "debit",
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
          computed_sale: sale,
          paid,
        },
      });
    } catch (err) {
      console.error("[store-ledger] sale", project.id, err);
    }
  }
}
