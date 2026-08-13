import { STORAGE_KEYS } from "@/lib/storage/keys";
import type { StoreBridgeMeta } from "@/lib/accounting";

/**
 * ربط خزنة المتجر (store-system) — مصدر الحقيقة للنقد.
 * الدفعات = إيداع · المصروفات = سحب.
 */

export const STORE_BRIDGE_STORAGE_KEY = STORAGE_KEYS.storeBridge;

/** إعدادات المتجر الافتراضية لشركة واحدة */
export const DEFAULT_STORE_URL = "https://store-system-rho.vercel.app";

/** @deprecated لا تستخدمه — المفتاح القديم مُبطَل لأسباب أمنية */
export const DEFAULT_BRIDGE_SECRET = "";

/**
 * Marker for server-managed bridge (secret lives only in API routes).
 * Never a real store secret — client calls /api/store-bridge/* instead.
 */
export const MANAGED_BRIDGE_SECRET = "__server_managed__";

const REVOKED_BRIDGE_SECRETS = new Set([
  "windoor-workshop-bridge-2026-rho",
]);

export type StoreBridgeConfig = {
  /** مثال: https://store-system-rho.vercel.app */
  baseUrl: string;
  /** مفتاح يدوي، أو MANAGED_BRIDGE_SECRET عند الربط من السيرفر */
  secret: string;
  /** خزنة افتراضية للدفعات/المصروفات */
  safeId: string;
  safeName?: string;
  enabled: boolean;
  updatedAt: string;
  /** true = المفتاح على سيرفر الورشة، مش في المتصفح */
  managed?: boolean;
};

export type StoreBridgeStatus = {
  ok?: boolean;
  configured: boolean;
  mode?: "server" | "manual";
  storeUrl?: string;
  source?: string;
};

export function isManagedBridgeSecret(secret: string): boolean {
  return secret.trim() === MANAGED_BRIDGE_SECRET;
}

export type StoreSafeRow = {
  id: string;
  name: string;
  balance: number;
  is_active?: boolean;
};

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

function sanitizeSecret(raw: string): string {
  const secret = raw.trim();
  if (!secret || REVOKED_BRIDGE_SECRETS.has(secret)) return "";
  if (isManagedBridgeSecret(secret)) return MANAGED_BRIDGE_SECRET;
  return secret;
}

function readLocalBridgeRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORE_BRIDGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function loadStoreBridgeConfig(): StoreBridgeConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = readLocalBridgeRaw();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoreBridgeConfig>;
    const secret = sanitizeSecret(String(parsed.secret || ""));
    if (!parsed.baseUrl || !secret) return null;
    const managed =
      Boolean(parsed.managed) || isManagedBridgeSecret(secret);
    return {
      baseUrl: normalizeBaseUrl(String(parsed.baseUrl)),
      secret,
      safeId: String(parsed.safeId || ""),
      safeName: parsed.safeName ? String(parsed.safeName) : undefined,
      enabled: parsed.enabled !== false,
      updatedAt: String(parsed.updatedAt || new Date().toISOString()),
      managed,
    };
  } catch {
    return null;
  }
}

export function saveStoreBridgeConfig(config: StoreBridgeConfig) {
  if (typeof window === "undefined") return;
  const secret = sanitizeSecret(config.secret);
  if (!secret) {
    throw new Error("مفتاح الجسر غير صالح — أدخل المفتاح من إعدادات المتجر");
  }
  const managed =
    Boolean(config.managed) || isManagedBridgeSecret(secret);
  const next: StoreBridgeConfig = {
    ...config,
    baseUrl: normalizeBaseUrl(config.baseUrl),
    secret: managed ? MANAGED_BRIDGE_SECRET : secret,
    safeId: config.safeId.trim(),
    enabled: config.enabled !== false,
    updatedAt: new Date().toISOString(),
    managed,
  };
  localStorage.setItem(STORE_BRIDGE_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("upvc-store-bridge-updated"));
}

/** حالة الربط من سيرفر الورشة (بدون مفتاح في المتصفح). */
export async function fetchStoreBridgeStatus(): Promise<StoreBridgeStatus> {
  const res = await fetch("/api/store-bridge/status", { cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as StoreBridgeStatus;
  if (!res.ok) {
    return { configured: false, mode: "manual" };
  }
  return {
    ok: json.ok,
    configured: Boolean(json.configured),
    mode: json.mode === "server" ? "server" : "manual",
    storeUrl: json.storeUrl,
    source: json.source,
  };
}

export function clearStoreBridgeConfig() {
  if (typeof window === "undefined") return;
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
  const managed =
    Boolean(config.managed) || isManagedBridgeSecret(config.secret);

  if (managed) {
    // /api/workshop/safes → /api/store-bridge/workshop/safes
    const proxyPath = path.replace(/^\/api\//, "/api/store-bridge/");
    return fetch(proxyPath, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
  }

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

export type StoreProductRow = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  stock: number;
  sale_price: number;
  cost: number;
  category_name?: string | null;
};

/** Search store catalog via workshop bridge (phone material issue). */
export async function searchStoreProducts(
  query: string,
  config: StoreBridgeConfig | null = loadStoreBridgeConfig()
): Promise<StoreProductRow[]> {
  if (!hasStoreBridgeCredentials(config) || !config) {
    throw new Error("اربط المتجر من الإعدادات أولاً");
  }
  const q = query.trim();
  const path = q
    ? `/api/workshop/products?q=${encodeURIComponent(q)}`
    : "/api/workshop/products";
  const res = await bridgeFetch(config, path);
  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    products?: StoreProductRow[];
  };
  if (!res.ok) {
    throw new Error(json.error || `فشل بحث الأصناف (${res.status})`);
  }
  return json.products || [];
}

export type StoreWorkshopIssueLine = {
  product_id: string;
  quantity: number;
  unit_price: number;
  discount?: number;
};

export type StoreWorkshopIssueResult = {
  invoice_id: string;
  invoice_number: string;
  subtotal: number;
  discount_amount: number;
  total: number;
  items_summary: Array<{
    product_id?: string;
    name?: string;
    quantity?: number;
    unit_price?: number;
    total?: number;
  }>;
  project_key: string;
  project_name?: string | null;
  status: string;
};

export type StorePartyRow = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  balance: number;
  is_active?: boolean;
  created_at?: string;
  business_lines?: Array<"wire" | "store" | "workshop">;
};

export async function searchStoreCustomers(
  query: string,
  config: StoreBridgeConfig | null = loadStoreBridgeConfig()
): Promise<StorePartyRow[]> {
  if (!hasStoreBridgeCredentials(config) || !config) {
    throw new Error("اربط المتجر من الإعدادات أولاً");
  }
  const q = query.trim();
  const path = q
    ? `/api/workshop/parties/customers?q=${encodeURIComponent(q)}`
    : "/api/workshop/parties/customers";
  const res = await bridgeFetch(config, path);
  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    customers?: StorePartyRow[];
  };
  if (!res.ok) {
    throw new Error(json.error || `فشل بحث العملاء (${res.status})`);
  }
  return json.customers || [];
}

/** Fetch business-line tags for linked store customer ids. */
export async function fetchStoreCustomerBusinessLines(
  storeCustomerIds: string[],
  config: StoreBridgeConfig | null = loadStoreBridgeConfig()
): Promise<Record<string, Array<"wire" | "store" | "workshop">>> {
  if (!hasStoreBridgeCredentials(config) || !config) return {};
  const ids = Array.from(
    new Set(storeCustomerIds.map((id) => String(id || "").trim()).filter(Boolean))
  );
  if (ids.length === 0) return {};

  const out: Record<string, Array<"wire" | "store" | "workshop">> = {};
  const chunkSize = 40;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const path = `/api/workshop/parties/customers?ids=${encodeURIComponent(
      chunk.join(",")
    )}`;
    try {
      const res = await bridgeFetch(config, path);
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        customers?: StorePartyRow[];
      };
      if (!res.ok) continue;
      for (const c of json.customers || []) {
        const lines = (c.business_lines || []).filter(
          (v): v is "wire" | "store" | "workshop" =>
            v === "wire" || v === "store" || v === "workshop"
        );
        if (lines.length > 0) out[c.id] = lines;
      }
    } catch {
      // best-effort badges
    }
  }
  return out;
}

export async function upsertStoreCustomer(
  input: {
    localPartyId: string;
    name: string;
    phone?: string;
    address?: string;
    notes?: string;
  },
  config: StoreBridgeConfig | null = loadStoreBridgeConfig()
): Promise<{ storeCustomerId: string; created: boolean }> {
  if (!hasStoreBridgeCredentials(config) || !config) {
    throw new Error("اربط المتجر من الإعدادات أولاً");
  }
  const res = await bridgeFetch(config, "/api/workshop/parties/customers", {
    method: "POST",
    body: JSON.stringify({
      source_system: "aa",
      local_party_id: input.localPartyId,
      name: input.name,
      phone: input.phone || null,
      address: input.address || null,
      notes: input.notes || null,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    store_customer_id?: string;
    created?: boolean;
  };
  if (!res.ok || !json.ok || !json.store_customer_id) {
    throw new Error(json.error || `فشل مزامنة العميل (${res.status})`);
  }
  return {
    storeCustomerId: String(json.store_customer_id),
    created: Boolean(json.created),
  };
}

export async function searchStoreSuppliers(
  query: string,
  config: StoreBridgeConfig | null = loadStoreBridgeConfig()
): Promise<StorePartyRow[]> {
  if (!hasStoreBridgeCredentials(config) || !config) {
    throw new Error("اربط المتجر من الإعدادات أولاً");
  }
  const q = query.trim();
  const path = q
    ? `/api/workshop/parties/suppliers?q=${encodeURIComponent(q)}`
    : "/api/workshop/parties/suppliers";
  const res = await bridgeFetch(config, path);
  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    suppliers?: StorePartyRow[];
  };
  if (!res.ok) {
    throw new Error(json.error || `فشل بحث الموردين (${res.status})`);
  }
  return json.suppliers || [];
}

export async function upsertStoreSupplier(
  input: {
    localPartyId?: string;
    name: string;
    phone?: string;
    address?: string;
    notes?: string;
  },
  config: StoreBridgeConfig | null = loadStoreBridgeConfig()
): Promise<{ storeSupplierId: string; created: boolean; supplier: StorePartyRow }> {
  if (!hasStoreBridgeCredentials(config) || !config) {
    throw new Error("اربط المتجر من الإعدادات أولاً");
  }
  const res = await bridgeFetch(config, "/api/workshop/parties/suppliers", {
    method: "POST",
    body: JSON.stringify({
      source_system: "aa",
      local_party_id: input.localPartyId || null,
      name: input.name,
      phone: input.phone || null,
      address: input.address || null,
      notes: input.notes || null,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    store_supplier_id?: string;
    created?: boolean;
    supplier?: StorePartyRow;
  };
  if (!res.ok || !json.ok || !json.store_supplier_id || !json.supplier) {
    throw new Error(json.error || `فشل حفظ المورد (${res.status})`);
  }
  return {
    storeSupplierId: String(json.store_supplier_id),
    created: Boolean(json.created),
    supplier: json.supplier,
  };
}

export async function postStorePartyLedger(
  input: {
    storeCustomerId: string;
    sourceRef: string;
    entryType:
      | "workshop_sale"
      | "workshop_collection"
      | "workshop_adjustment"
      | "workshop_void";
    amount: number;
    direction: "debit" | "credit";
    occurredAt?: string;
    notes?: string;
    projectLabel?: string;
    details?: Record<string, unknown> | null;
  },
  config: StoreBridgeConfig | null = loadStoreBridgeConfig()
): Promise<{ ok: true; voided?: boolean }> {
  if (!hasStoreBridgeCredentials(config) || !config) {
    throw new Error("اربط المتجر من الإعدادات أولاً");
  }
  const res = await bridgeFetch(config, "/api/workshop/parties/ledger", {
    method: "POST",
    body: JSON.stringify({
      source_system: "aa",
      source_ref: input.sourceRef,
      party_type: "customer",
      store_customer_id: input.storeCustomerId,
      entry_type: input.entryType,
      amount: input.amount,
      direction: input.direction,
      occurred_at: input.occurredAt || null,
      notes: input.notes || null,
      project_label: input.projectLabel || null,
      // Always send object so store RPC overload stays unambiguous.
      details:
        input.details && typeof input.details === "object"
          ? input.details
          : {},
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    voided?: boolean;
  };
  if (!res.ok || !json.ok) {
    throw new Error(json.error || `فشل تسجيل حساب العميل (${res.status})`);
  }
  return { ok: true, voided: json.voided };
}

export type StoreExternalPurchaseLine = {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
};

export async function createStoreExternalPurchase(
  input: {
    supplierId: string;
    items: StoreExternalPurchaseLine[];
    subtotal: number;
    total: number;
    paidAmount?: number;
    safeId?: string | null;
    notes?: string;
    createdAt?: string;
    sourceRef: string;
  },
  config: StoreBridgeConfig | null = loadStoreBridgeConfig()
): Promise<{ invoiceId: string; invoiceNumber: string }> {
  if (!hasStoreBridgeCredentials(config) || !config) {
    throw new Error("اربط المتجر من الإعدادات أولاً");
  }
  const res = await bridgeFetch(config, "/api/workshop/purchases", {
    method: "POST",
    body: JSON.stringify({
      source_system: "aa",
      source_ref: input.sourceRef,
      supplier_id: input.supplierId,
      items: input.items,
      subtotal: input.subtotal,
      total: input.total,
      paid_amount: input.paidAmount ?? 0,
      safe_id: input.safeId || null,
      notes: input.notes || null,
      created_at: input.createdAt || null,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    id?: string;
    invoice_number?: string;
  };
  if (!res.ok || !json.ok || !json.id || !json.invoice_number) {
    throw new Error(json.error || `فشل تسجيل التوريد (${res.status})`);
  }
  return {
    invoiceId: String(json.id),
    invoiceNumber: String(json.invoice_number),
  };
}

/** Ensure customer exists in store and return store id (updates local record). */
export async function ensureCustomerLinkedToStore(
  customer: {
    id: string;
    name: string;
    phone: string;
    address?: string;
    note?: string;
    storeCustomerId?: string;
  },
  config: StoreBridgeConfig | null = loadStoreBridgeConfig()
): Promise<string | null> {
  if (!hasStoreBridgeCredentials(config) || !config) return null;
  // Always upsert so workshop_party_map remaps (e.g. split من عمر) take effect.
  const { storeCustomerId } = await upsertStoreCustomer(
    {
      localPartyId: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      notes: customer.note,
    },
    config
  );
  const { upsertCustomer, getCustomerById } = await import("@/lib/customers");
  const current = getCustomerById(customer.id);
  if (current && current.storeCustomerId !== storeCustomerId) {
    upsertCustomer({ ...current, storeCustomerId });
  } else if (current && !current.storeCustomerId) {
    upsertCustomer({ ...current, storeCustomerId });
  }
  return storeCustomerId;
}

/**
 * Sync project sale onto store customer ledger (idempotent by project id).
 * Quotes without deposit must NOT hit any customer — pass includeInCustomerLedger:false
 * to delete any previously mistaken posting.
 */
export async function syncProjectSaleToStore(
  input: {
    storeCustomerId: string;
    projectId: string;
    projectName: string;
    saleAmount: number;
    occurredAt?: string;
    localPartyId?: string;
    /**
     * false = مقايسة لسه من غير عربون — امسح القيد من حساب العميل.
     * true = المشروع دخل الحساب (عربون / ورشة / مكتمل).
     */
    includeInCustomerLedger: boolean;
  },
  config: StoreBridgeConfig | null = loadStoreBridgeConfig()
): Promise<void> {
  if (!hasStoreBridgeCredentials(config) || !config) return;
  const { getProjectMoneySummary, projectLedgerSaleAmount } = await import(
    "@/lib/project-money"
  );
  const money = getProjectMoneySummary(input.projectId);
  const amount = input.includeInCustomerLedger
    ? Math.max(0, projectLedgerSaleAmount(input.projectId))
    : 0;
  await postStorePartyLedger(
    {
      storeCustomerId: input.storeCustomerId,
      sourceRef: `sale:${input.projectId}`,
      entryType: amount > 0 ? "workshop_sale" : "workshop_void",
      amount,
      direction: "debit",
      occurredAt: input.occurredAt,
      notes:
        amount > 0
          ? money.discountAmount > 0
            ? `بيع مشروع ${input.projectName} (خصم ${money.discountAmount})`
            : `بيع مشروع ${input.projectName}`
          : `إلغاء مقايسة ${input.projectName}`,
      projectLabel: input.projectName,
      details: {
        kind: "aa_project_sale",
        project_id: input.projectId,
        project_name: input.projectName,
        local_party_id: input.localPartyId || null,
        customer_id: input.localPartyId || null,
        sale_amount: amount,
        computed_sale: money.sale,
        paid: money.paid,
        subtotal: money.subtotal,
        discount_type: money.discountType,
        discount_value: money.discountValue,
        discount_amount: money.discountAmount,
        ledger_floor_to_paid: amount > money.sale + 0.004,
      },
    },
    config
  );
}

/** Create for-workshop sale and assign to project in one step. */
export async function createStoreWorkshopIssue(
  input: {
    items: StoreWorkshopIssueLine[];
    discountAmount?: number;
    discountType?: "amount" | "percent";
    projectKey: string;
    projectName?: string;
    notes?: string;
    clientOpId?: string;
  },
  config: StoreBridgeConfig | null = loadStoreBridgeConfig()
): Promise<StoreWorkshopIssueResult> {
  if (!hasStoreBridgeCredentials(config) || !config) {
    throw new Error("اربط المتجر من الإعدادات أولاً");
  }
  const res = await bridgeFetch(config, "/api/workshop/issue", {
    method: "POST",
    body: JSON.stringify({
      items: input.items,
      discount_amount: input.discountAmount ?? 0,
      discount_type: input.discountType ?? "amount",
      project_key: input.projectKey,
      project_name: input.projectName || null,
      notes: input.notes || null,
      client_op_id: input.clientOpId || crypto.randomUUID(),
    }),
  });
  const json = (await res.json().catch(() => ({}))) as Partial<StoreWorkshopIssueResult> & {
    ok?: boolean;
    error?: string;
  };
  if (!res.ok || !json.ok || !json.invoice_id || !json.invoice_number) {
    throw new Error(json.error || `فشل صرف الخامات (${res.status})`);
  }
  return {
    invoice_id: String(json.invoice_id),
    invoice_number: String(json.invoice_number),
    subtotal: Number(json.subtotal) || 0,
    discount_amount: Number(json.discount_amount) || 0,
    total: Number(json.total) || 0,
    items_summary: json.items_summary || [],
    project_key: String(json.project_key || input.projectKey),
    project_name: json.project_name ?? input.projectName ?? null,
    status: String(json.status || "assigned"),
  };
}

/**
 * Re-push local payments / expenses / project sales to the store.
 * Safe movements are idempotent by external_key; ledger by source_ref.
 */
export async function resyncAllWorkshopMoneyToStore(
  config: StoreBridgeConfig | null = loadStoreBridgeConfig()
): Promise<{ payments: number; expenses: number; sales: number; errors: string[] }> {
  if (!hasStoreBridgeCredentials(config) || !config) {
    throw new Error("اربط المتجر من الإعدادات أولاً");
  }

  const { loadPayments, loadExpenses, upsertPayment, upsertExpense, PAYMENT_METHOD_LABELS } =
    await import("@/lib/accounting");
  const { listAllProjects } = await import("@/lib/projects");
  const { getCustomerById } = await import("@/lib/customers");
  const { getProjectMoneySummary, projectLedgerSaleAmount } = await import(
    "@/lib/project-money"
  );
  const { isAccountedProject } = await import("@/lib/accounting-scope");

  const errors: string[] = [];
  let payments = 0;
  let expenses = 0;
  let sales = 0;

  for (const pay of loadPayments()) {
    try {
      const project = pay.projectId
        ? listAllProjects().find((p) => p.id === pay.projectId)
        : undefined;
      const customer = getCustomerById(pay.customerId);
      const sync = await syncMoneyToStore(
        {
          kind: "payment",
          externalKey: pay.id,
          amount: pay.amount,
          description: [
            "ورشة · دفعة",
            customer?.name,
            project?.name,
            PAYMENT_METHOD_LABELS[pay.method],
          ]
            .filter(Boolean)
            .join(" · "),
          notes: pay.note,
          occurredAt: pay.date ? `${pay.date}T12:00:00.000Z` : undefined,
          safeId: pay.storeBridge?.safeId || config.safeId,
        },
        config
      );
      upsertPayment({
        ...pay,
        storeBridge: withStoreBridgeMeta(
          pay.amount,
          sync.safe_id || config.safeId,
          sync.reference_id
        ),
      });

      if (customer) {
        const storeCustomerId = await ensureCustomerLinkedToStore(customer, config);
        if (storeCustomerId) {
          if (project && isAccountedProject(project)) {
            const sale = getProjectMoneySummary(project.id).sale;
            await syncProjectSaleToStore(
              {
                storeCustomerId,
                projectId: project.id,
                projectName: project.name,
                saleAmount: sale,
                occurredAt: pay.date ? `${pay.date}T12:00:00.000Z` : undefined,
                includeInCustomerLedger: true,
                localPartyId: customer.id,
              },
              config
            );
          }
          await postStorePartyLedger(
            {
              storeCustomerId,
              sourceRef: `pay:${pay.id}`,
              entryType: "workshop_collection",
              amount: pay.amount,
              direction: "credit",
              occurredAt: pay.date ? `${pay.date}T12:00:00.000Z` : undefined,
              notes: pay.note || PAYMENT_METHOD_LABELS[pay.method],
              projectLabel: project?.name,
              details: {
                kind: "aa_payment",
                project_id: pay.projectId || project?.id || null,
                payment_id: pay.id,
                local_party_id: customer.id,
                customer_id: customer.id,
              },
            },
            config
          );
        }
      }
      payments += 1;
    } catch (err) {
      errors.push(
        `دفعة ${pay.id}: ${err instanceof Error ? err.message : "فشل"}`
      );
    }
  }

  for (const exp of loadExpenses()) {
    if (exp.storeInvoiceId) continue; // stock issue — no safe withdrawal
    try {
      const sync = await syncMoneyToStore(
        {
          kind: "expense",
          externalKey: exp.id,
          amount: exp.amount,
          description: ["ورشة · مصروف", exp.category, exp.description]
            .filter(Boolean)
            .join(" · "),
          notes: exp.note,
          occurredAt: exp.date ? `${exp.date}T12:00:00.000Z` : undefined,
          safeId: exp.storeBridge?.safeId || config.safeId,
        },
        config
      );
      upsertExpense({
        ...exp,
        storeBridge: withStoreBridgeMeta(
          exp.amount,
          sync.safe_id || config.safeId,
          sync.reference_id
        ),
      });
      expenses += 1;
    } catch (err) {
      errors.push(
        `مصروف ${exp.id}: ${err instanceof Error ? err.message : "فشل"}`
      );
    }
  }

  // Project sales: accounted only. Quotes void any mistaken earlier posting.
  for (const project of listAllProjects()) {
    try {
      const sale = getProjectMoneySummary(project.id).sale;
      const customer = getCustomerById(project.customerId);
      if (!customer) continue;
      const storeCustomerId = await ensureCustomerLinkedToStore(customer, config);
      if (!storeCustomerId) continue;
      const accounted = isAccountedProject(project);
      if (!accounted) {
        await syncProjectSaleToStore(
          {
            storeCustomerId,
            projectId: project.id,
            projectName: project.name,
            saleAmount: 0,
            includeInCustomerLedger: false,
            localPartyId: customer.id,
          },
          config
        );
        continue;
      }
      if (projectLedgerSaleAmount(project.id) <= 0) continue;
      await syncProjectSaleToStore(
        {
          storeCustomerId,
          projectId: project.id,
          projectName: project.name,
          saleAmount: sale,
          includeInCustomerLedger: true,
          localPartyId: customer.id,
        },
        config
      );
      sales += 1;
    } catch (err) {
      errors.push(
        `بيع ${project.id}: ${err instanceof Error ? err.message : "فشل"}`
      );
    }
  }

  return { payments, expenses, sales, errors };
}

