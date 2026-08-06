import { STORAGE_KEYS } from "@/lib/storage/keys";
import { sharedGetItem, sharedSetItem } from "@/lib/storage/shared-client";
import type { StoreBridgeMeta } from "@/lib/accounting";

/**
 * ربط خزنة المتجر (store-system) — مصدر الحقيقة للنقد.
 * الدفعات = إيداع · المصروفات = سحب.
 */

export const STORE_BRIDGE_STORAGE_KEY = STORAGE_KEYS.storeBridge;

export type StoreBridgeConfig = {
  /** مثال: https://store-system-rho.vercel.app */
  baseUrl: string;
  /** نفس WORKSHOP_BRIDGE_SECRET على المتجر */
  secret: string;
  /** خزنة افتراضية للدفعات/المصروفات */
  safeId: string;
  safeName?: string;
  enabled: boolean;
  updatedAt: string;
};

export type StoreSafeRow = {
  id: string;
  name: string;
  balance: number;
  is_active?: boolean;
};

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

export function loadStoreBridgeConfig(): StoreBridgeConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sharedGetItem(STORE_BRIDGE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoreBridgeConfig>;
    if (!parsed.baseUrl || !parsed.secret) return null;
    return {
      baseUrl: normalizeBaseUrl(String(parsed.baseUrl)),
      secret: String(parsed.secret),
      safeId: String(parsed.safeId || ""),
      safeName: parsed.safeName ? String(parsed.safeName) : undefined,
      enabled: parsed.enabled !== false,
      updatedAt: String(parsed.updatedAt || new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

export function saveStoreBridgeConfig(config: StoreBridgeConfig) {
  if (typeof window === "undefined") return;
  const next: StoreBridgeConfig = {
    ...config,
    baseUrl: normalizeBaseUrl(config.baseUrl),
    secret: config.secret.trim(),
    safeId: config.safeId.trim(),
    enabled: config.enabled !== false,
    updatedAt: new Date().toISOString(),
  };
  sharedSetItem(STORE_BRIDGE_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("upvc-store-bridge-updated"));
}

export function clearStoreBridgeConfig() {
  if (typeof window === "undefined") return;
  sharedSetItem(STORE_BRIDGE_STORAGE_KEY, "");
  try {
    localStorage.removeItem(STORE_BRIDGE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("upvc-store-bridge-updated"));
}

export function isStoreBridgeActive(
  config: StoreBridgeConfig | null = loadStoreBridgeConfig()
): boolean {
  return Boolean(
    config?.enabled && config.baseUrl && config.secret && config.safeId
  );
}

/** يكفي لجلب صندوق فواتير المحل (مش شرط خزنة) */
export function hasStoreBridgeCredentials(
  config: StoreBridgeConfig | null = loadStoreBridgeConfig()
): boolean {
  return Boolean(config?.enabled && config.baseUrl && config.secret);
}

async function bridgeFetch(
  config: StoreBridgeConfig,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const url = `${normalizeBaseUrl(config.baseUrl)}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.secret}`,
      "x-workshop-bridge-secret": config.secret,
      ...(init?.headers || {}),
    },
  });
}

export async function fetchStoreSafes(
  config: Pick<StoreBridgeConfig, "baseUrl" | "secret">
): Promise<StoreSafeRow[]> {
  const res = await bridgeFetch(config as StoreBridgeConfig, "/api/workshop/safes");
  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    safes?: StoreSafeRow[];
  };
  if (!res.ok) {
    throw new Error(json.error || `فشل تحميل الخزن (${res.status})`);
  }
  return json.safes || [];
}

export type StoreSyncResult = {
  ok: true;
  reference_id: string;
  applied: number;
  safe_id: string;
  balance: number | null;
};

export type StoreMoneySyncInput = {
  kind: "payment" | "expense";
  externalKey: string;
  amount: number;
  description: string;
  notes?: string;
  occurredAt?: string;
  /** override default safe */
  safeId?: string;
};

/** amount 0 = حذف/إلغاء التأثير على الخزنة */
export async function syncMoneyToStore(
  input: StoreMoneySyncInput,
  config: StoreBridgeConfig | null = loadStoreBridgeConfig()
): Promise<StoreSyncResult> {
  if (!config?.enabled || !config.baseUrl || !config.secret) {
    throw new Error("ربط خزنة المتجر غير مفعّل");
  }
  const safeId = (input.safeId || config.safeId || "").trim();
  const amount = Number(input.amount) || 0;
  if (amount > 0 && !safeId) {
    throw new Error("اختر خزنة المتجر من الإعدادات");
  }

  const reference_type =
    input.kind === "payment" ? "workshop_payment" : "workshop_expense";
  const type = input.kind === "payment" ? "deposit" : "withdrawal";

  const res = await bridgeFetch(config, "/api/workshop/safe-movement", {
    method: "POST",
    body: JSON.stringify({
      external_key: input.externalKey,
      reference_type,
      type,
      amount,
      safe_id: safeId,
      description: input.description,
      notes: input.notes || `workshop:${input.externalKey}`,
      occurred_at: input.occurredAt || null,
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    reference_id?: string;
    applied?: number;
    safe_id?: string;
    balance?: number | null;
  };

  if (!res.ok || !json.ok) {
    throw new Error(json.error || `فشل مزامنة الخزنة (${res.status})`);
  }

  return {
    ok: true,
    reference_id: String(json.reference_id || ""),
    applied: Number(json.applied) || 0,
    safe_id: String(json.safe_id || safeId),
    balance: typeof json.balance === "number" ? json.balance : null,
  };
}

export type { StoreBridgeMeta };

export function withStoreBridgeMeta(
  amount: number,
  safeId: string,
  referenceId?: string
): StoreBridgeMeta {
  return {
    safeId,
    syncedAmount: amount,
    syncedAt: new Date().toISOString(),
    referenceId,
  };
}

export type StoreInvoiceInboxItem = {
  id: string;
  invoice_id: string;
  invoice_number: string;
  total: number;
  invoice_date: string;
  notes?: string | null;
  items_summary: Array<{
    product_id?: string;
    name?: string;
    quantity?: number;
    unit_price?: number;
    total?: number;
  }>;
  status: "pending" | "assigned" | "dismissed" | string;
  assigned_project_key?: string | null;
  assigned_project_name?: string | null;
  assigned_at?: string | null;
  created_at?: string;
  updated_at?: string | null;
};

export async function fetchWorkshopInvoiceInbox(
  status: "pending" | "assigned" | "dismissed" | "all" = "pending",
  config: StoreBridgeConfig | null = loadStoreBridgeConfig()
): Promise<StoreInvoiceInboxItem[]> {
  if (!hasStoreBridgeCredentials(config) || !config) {
    throw new Error("اربط المتجر من الإعدادات أولاً");
  }
  const res = await bridgeFetch(
    config,
    `/api/workshop/invoices?status=${encodeURIComponent(status)}`
  );
  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    invoices?: StoreInvoiceInboxItem[];
  };
  if (!res.ok) {
    throw new Error(json.error || `فشل تحميل صندوق الفواتير (${res.status})`);
  }
  return json.invoices || [];
}

/** Refresh local project expenses linked to store invoices after POS edits. */
export async function syncAssignedStoreInvoiceExpenses(
  config: StoreBridgeConfig | null = loadStoreBridgeConfig()
): Promise<number> {
  if (!hasStoreBridgeCredentials(config) || !config) return 0;
  if (typeof window === "undefined") return 0;

  const { loadExpenses, upsertExpense } = await import("@/lib/accounting");
  const rows = await fetchWorkshopInvoiceInbox("assigned", config);
  const expenses = loadExpenses().filter((e) => e.storeInvoiceId);
  if (!expenses.length || !rows.length) return 0;

  const byInvoice = new Map(rows.map((r) => [r.invoice_id, r]));
  let updated = 0;

  for (const expense of expenses) {
    const invoiceId = expense.storeInvoiceId;
    if (!invoiceId) continue;
    const row = byInvoice.get(invoiceId);
    if (!row) continue;

    const amount = Number(row.total) || 0;
    const date = row.invoice_date
      ? row.invoice_date.slice(0, 10)
      : expense.date;
    const lines = (row.items_summary || [])
      .slice(0, 4)
      .map((l) => l.name || "صنف")
      .filter(Boolean);
    const note = [
      lines.length ? lines.join(" · ") : undefined,
      row.notes?.trim() || undefined,
    ]
      .filter(Boolean)
      .join(" — ");

    const nextDescription = `فاتورة محل ${row.invoice_number}`;
    const changed =
      Math.abs((Number(expense.amount) || 0) - amount) > 0.001 ||
      expense.storeInvoiceNumber !== row.invoice_number ||
      expense.description !== nextDescription ||
      (expense.note || "") !== note ||
      expense.date !== date;

    if (!changed) continue;

    upsertExpense({
      ...expense,
      amount,
      date,
      description: nextDescription,
      note: note || undefined,
      storeInvoiceNumber: row.invoice_number,
    });
    updated += 1;
  }

  if (updated > 0) {
    window.dispatchEvent(new Event("upvc-accounting-updated"));
  }
  return updated;
}

export async function resolveWorkshopInvoice(
  input: {
    invoiceId: string;
    action: "assign" | "dismiss";
    projectKey?: string;
    projectName?: string;
  },
  config: StoreBridgeConfig | null = loadStoreBridgeConfig()
): Promise<{ ok: true; status: string }> {
  if (!hasStoreBridgeCredentials(config) || !config) {
    throw new Error("اربط المتجر من الإعدادات أولاً");
  }
  const res = await bridgeFetch(config, "/api/workshop/invoices", {
    method: "POST",
    body: JSON.stringify({
      invoice_id: input.invoiceId,
      action: input.action,
      project_key: input.projectKey || null,
      project_name: input.projectName || null,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    status?: string;
  };
  if (!res.ok || !json.ok) {
    throw new Error(json.error || `فشل تحديث الفاتورة (${res.status})`);
  }
  return { ok: true, status: String(json.status || input.action) };
}
