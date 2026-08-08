import { loadPayments } from "@/lib/accounting";
import { mergeCustomers, upsertCustomer } from "@/lib/customers";
import { getProjectMoneySummary } from "@/lib/project-money";
import { listAllProjects } from "@/lib/projects";
import {
  ensureCustomerLinkedToStore,
  hasStoreBridgeCredentials,
  loadStoreBridgeConfig,
  postStorePartyLedger,
  syncProjectSaleToStore,
  upsertStoreCustomer,
  type StoreBridgeConfig,
} from "@/lib/store-bridge";
import { ensureStoreBridgeBootstrapped } from "@/lib/store-bridge-bootstrap";

export type StoreLedgerSyncResult = {
  customers: number;
  sales: number;
  collections: number;
  errors: string[];
};

/** Push all local customers + project sales + payments into store ledgers. */
export async function syncAllWorkshopLedgerToStore(
  config?: StoreBridgeConfig | null
): Promise<StoreLedgerSyncResult> {
  const cfg =
    config && hasStoreBridgeCredentials(config)
      ? config
      : (await ensureStoreBridgeBootstrapped()) || loadStoreBridgeConfig();

  const result: StoreLedgerSyncResult = {
    customers: 0,
    sales: 0,
    collections: 0,
    errors: [],
  };

  if (!hasStoreBridgeCredentials(cfg) || !cfg) {
    result.errors.push("اربط المتجر من الإعدادات أولاً");
    return result;
  }

  const customers = mergeCustomers();
  for (const customer of customers) {
    try {
      const storeCustomerId = await upsertStoreCustomer(
        {
          localPartyId: customer.id,
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          notes: customer.note,
        },
        cfg
      ).then((r) => r.storeCustomerId);
      if (customer.storeCustomerId !== storeCustomerId) {
        upsertCustomer({ ...customer, storeCustomerId });
      }
      result.customers += 1;
    } catch (err) {
      result.errors.push(
        `عميل ${customer.name}: ${err instanceof Error ? err.message : "فشل"}`
      );
    }
  }

  const projects = listAllProjects();
  for (const project of projects) {
    try {
      const customer = mergeCustomers().find((c) => c.id === project.customerId);
      if (!customer) continue;
      const storeCustomerId = await ensureCustomerLinkedToStore(customer, cfg);
      if (!storeCustomerId) continue;
      const sale = getProjectMoneySummary(project.id).sale;
      if (sale <= 0) continue;
      await syncProjectSaleToStore(
        {
          storeCustomerId,
          projectId: project.id,
          projectName: project.name,
          saleAmount: sale,
        },
        cfg
      );
      result.sales += 1;
    } catch (err) {
      result.errors.push(
        `بيع ${project.name}: ${err instanceof Error ? err.message : "فشل"}`
      );
    }
  }

  for (const payment of loadPayments()) {
    try {
      const customer = mergeCustomers().find((c) => c.id === payment.customerId);
      if (!customer) continue;
      const storeCustomerId = await ensureCustomerLinkedToStore(customer, cfg);
      if (!storeCustomerId) continue;
      const amount = Number(payment.amount) || 0;
      if (amount <= 0) continue;
      const project = projects.find((p) => p.id === payment.projectId);
      await postStorePartyLedger(
        {
          storeCustomerId,
          sourceRef: `pay:${payment.id}`,
          entryType: "workshop_collection",
          amount,
          direction: "credit",
          occurredAt: payment.date
            ? `${payment.date}T12:00:00.000Z`
            : payment.createdAt,
          notes: payment.note,
          projectLabel: project?.name,
        },
        cfg
      );
      result.collections += 1;
    } catch (err) {
      result.errors.push(
        `دفعة ${payment.id}: ${err instanceof Error ? err.message : "فشل"}`
      );
    }
  }

  return result;
}
