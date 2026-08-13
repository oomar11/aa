import { isAccountedProject } from "@/lib/accounting-scope";
import { getCustomerById } from "@/lib/customers";
import { listAllProjects } from "@/lib/projects";
import { projectLedgerSaleAmount } from "@/lib/project-money";
import {
  ensureCustomerLinkedToStore,
  hasStoreBridgeCredentials,
  loadStoreBridgeConfig,
  postStorePartyLedger,
  syncProjectSaleToStore,
} from "@/lib/store-bridge";
import { ensureStoreBridgeBootstrapped } from "@/lib/store-bridge-bootstrap";

const SALE_SYNCED = new Map<string, string>();
const PAY_SYNCED = new Map<string, string>();

let timer: number | null = null;
let inFlight = false;
let queued = false;
let started = false;

function roundMoney(amount: number): number {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

/**
 * بعد أي تعديل في حسابات الـ PVC: حدّث كشف العميل في المحل.
 * Idempotent — بس اللي اتغيّر بيتبعت تاني.
 */
export function scheduleStoreLedgerMirror(delayMs = 700): void {
  if (typeof window === "undefined") return;
  if (timer) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    void runStoreLedgerMirror();
  }, delayMs);
}

export function startStoreLedgerMirror(): void {
  if (typeof window === "undefined" || started) return;
  started = true;
  const events = [
    "upvc-projects-updated",
    "upvc-accounting-updated",
    "upvc-store-bridge-updated",
  ];
  for (const name of events) {
    window.addEventListener(name, () => scheduleStoreLedgerMirror());
  }
  scheduleStoreLedgerMirror(1200);
}

async function runStoreLedgerMirror(): Promise<void> {
  if (inFlight) {
    queued = true;
    return;
  }
  inFlight = true;
  try {
    await ensureStoreBridgeBootstrapped();
    const config = loadStoreBridgeConfig();
    if (!hasStoreBridgeCredentials(config) || !config) return;

    const { loadPayments, paymentChannelLabel } = await import(
      "@/lib/accounting"
    );

    const storeIdByCustomer = new Map<string, string>();
    async function storeIdFor(customerId: string): Promise<string | null> {
      const cached = storeIdByCustomer.get(customerId);
      if (cached) return cached;
      const customer = getCustomerById(customerId);
      if (!customer) return null;
      if (customer.storeCustomerId) {
        storeIdByCustomer.set(customerId, customer.storeCustomerId);
        return customer.storeCustomerId;
      }
      const id = await ensureCustomerLinkedToStore(customer, config);
      if (id) storeIdByCustomer.set(customerId, id);
      return id;
    }

    for (const pay of loadPayments()) {
      const fingerprint = String(roundMoney(pay.amount));
      if (PAY_SYNCED.get(pay.id) === fingerprint) continue;
      const project = pay.projectId
        ? listAllProjects().find((p) => p.id === pay.projectId)
        : undefined;
      const storeCustomerId = await storeIdFor(pay.customerId);
      if (!storeCustomerId) continue;
      try {
        await postStorePartyLedger(
          {
            storeCustomerId,
            sourceRef: `pay:${pay.id}`,
            entryType: "workshop_collection",
            amount: pay.amount,
            direction: "credit",
            occurredAt: pay.date ? `${pay.date}T12:00:00.000Z` : undefined,
            notes: pay.note || paymentChannelLabel(pay),
            projectLabel: project?.name,
            details: {
              kind: "aa_payment",
              project_id: pay.projectId || project?.id || null,
              payment_id: pay.id,
              local_party_id: pay.customerId,
              customer_id: pay.customerId,
            },
          },
          config
        );
        PAY_SYNCED.set(pay.id, fingerprint);
      } catch {
        PAY_SYNCED.delete(pay.id);
      }
    }

    for (const project of listAllProjects()) {
      const customer = getCustomerById(project.customerId);
      if (!customer) continue;
      const accounted = isAccountedProject(project);
      const amount = accounted ? projectLedgerSaleAmount(project.id) : 0;
      const fingerprint = `${accounted ? 1 : 0}:${roundMoney(amount)}`;
      if (SALE_SYNCED.get(project.id) === fingerprint) continue;
      const storeCustomerId = await storeIdFor(customer.id);
      if (!storeCustomerId) continue;
      try {
        await syncProjectSaleToStore(
          {
            storeCustomerId,
            projectId: project.id,
            projectName: project.name,
            saleAmount: amount,
            includeInCustomerLedger: accounted && amount > 0,
            localPartyId: customer.id,
          },
          config
        );
        SALE_SYNCED.set(project.id, fingerprint);
      } catch {
        SALE_SYNCED.delete(project.id);
      }
    }
  } finally {
    inFlight = false;
    if (queued) {
      queued = false;
      scheduleStoreLedgerMirror(250);
    }
  }
}
