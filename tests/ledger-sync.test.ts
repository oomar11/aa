import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test, beforeEach } from "node:test";

// الـ file-store بيكتب في process.cwd()/data — نشتغل في فولدر مؤقت عشان ما نلمسش بيانات حقيقية.
process.chdir(mkdtempSync(path.join(tmpdir(), "aa-ledger-test-")));
process.env.WORKSHOP_BRIDGE_SECRET = "test-secret-1234567890";
process.env.STORE_URL = "http://store.test";
delete process.env.SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
for (const k of ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"]) {
  delete process.env[k];
}

const { STORAGE_KEYS, SHARED_STORAGE_KEYS } = await import("@/lib/storage/keys");
const { syncWorkshopSnapshotToStore } = await import("@/lib/workshop-ledger-sync");
const { LedgerSyncError } = await import("@/lib/ledger-sync-failures");

type Body = Record<string, unknown>;
let calls: Body[] = [];
let failRefs = new Set<string>();

beforeEach(() => {
  calls = [];
  failRefs = new Set();
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Body;
    calls.push(body);
    if (failRefs.has(String(body.source_ref))) {
      return new Response(JSON.stringify({ error: "boom" }), { status: 500 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;
});

function snap(data: Record<string, unknown>) {
  const out: Record<string, string | null> = {};
  for (const k of SHARED_STORAGE_KEYS) {
    out[k] = k in data ? JSON.stringify(data[k]) : null;
  }
  return {
    revision: 1,
    updatedAt: new Date().toISOString(),
    data: out,
    backend: "file" as const,
    durable: true,
  };
}

const cust = [{ id: "c1", storeCustomerId: "store-c1" }];
const K = STORAGE_KEYS;

test("new payment is posted as a collection", async () => {
  const before = snap({ [K.customers]: cust, [K.payments]: [] });
  const after = snap({
    [K.customers]: cust,
    [K.payments]: [{ id: "p1", customerId: "c1", amount: 500, projectId: "x" }],
  });
  await syncWorkshopSnapshotToStore(before, after, [K.payments]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.source_ref, "pay:p1");
  assert.equal(calls[0]!.entry_type, "workshop_collection");
  assert.equal(calls[0]!.amount, 500);
});

test("unchanged data posts nothing", async () => {
  const s = snap({
    [K.customers]: cust,
    [K.payments]: [{ id: "p1", customerId: "c1", amount: 500 }],
  });
  await syncWorkshopSnapshotToStore(s, s, [K.payments]);
  assert.equal(calls.length, 0);
});

test("deleted payment is voided", async () => {
  const pay = { id: "p1", customerId: "c1", amount: 500 };
  const before = snap({ [K.customers]: cust, [K.payments]: [pay] });
  const after = snap({ [K.customers]: cust, [K.payments]: [] });
  await syncWorkshopSnapshotToStore(before, after, [K.payments]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.source_ref, "pay:p1");
  assert.equal(calls[0]!.entry_type, "workshop_void");
  assert.equal(calls[0]!.amount, 0);
});

test("sale: only agreed-price projects are posted; amount = max(agreed, paid)", async () => {
  const before = snap({ [K.customers]: cust, [K.projects]: [], [K.payments]: [] });
  const after = snap({
    [K.customers]: cust,
    [K.projects]: [
      { id: "agreed", customerId: "c1", name: "A", workflow: "workshop", agreedSale: 1000 },
      { id: "computed", customerId: "c1", name: "B", workflow: "workshop" },
    ],
    [K.payments]: [{ id: "p9", customerId: "c1", amount: 1200, projectId: "agreed" }],
  });
  await syncWorkshopSnapshotToStore(before, after, [K.projects, K.payments]);
  const sales = calls.filter((c) => String(c.source_ref).startsWith("sale:"));
  assert.equal(sales.length, 1);
  assert.equal(sales[0]!.source_ref, "sale:agreed");
  assert.equal(sales[0]!.entry_type, "workshop_sale");
  assert.equal(sales[0]!.amount, 1200); // الزيادة ما تعملش رصيد دائن
});

test("deleted accounted project is voided; deleted quote is ignored", async () => {
  const before = snap({
    [K.customers]: cust,
    [K.projects]: [
      { id: "acc", customerId: "c1", name: "A", workflow: "workshop", agreedSale: 10 },
      { id: "q", customerId: "c1", name: "Q", workflow: "quote" },
    ],
  });
  const after = snap({ [K.customers]: cust, [K.projects]: [] });
  await syncWorkshopSnapshotToStore(before, after, [K.projects]);
  assert.deepEqual(calls.map((c) => [c.source_ref, c.entry_type]), [
    ["sale:acc", "workshop_void"],
  ]);
});

test("failures throw LedgerSyncError carrying the bodies to retry", async () => {
  failRefs.add("pay:bad");
  const before = snap({ [K.customers]: cust, [K.payments]: [] });
  const after = snap({
    [K.customers]: cust,
    [K.payments]: [
      { id: "ok", customerId: "c1", amount: 1 },
      { id: "bad", customerId: "c1", amount: 2 },
    ],
  });
  await assert.rejects(
    () => syncWorkshopSnapshotToStore(before, after, [K.payments]),
    (err: unknown) => {
      assert.ok(err instanceof LedgerSyncError);
      assert.deepEqual(err.retry.map((b) => b.source_ref), ["pay:bad"]);
      return true;
    }
  );
});

test("pending retry bodies are replayed on the next sync", async () => {
  const pendingBody = {
    source_system: "aa",
    source_ref: "pay:old",
    party_type: "customer",
    store_customer_id: "store-c1",
    entry_type: "workshop_collection",
    amount: 77,
    direction: "credit",
  };
  const s = snap({
    [K.customers]: cust,
    [K.payments]: [],
    [K.ledgerSyncFailures]: [
      { id: "f1", at: new Date().toISOString(), keys: [], error: "x", retry: [pendingBody] },
    ],
  });
  await syncWorkshopSnapshotToStore(s, s, [K.payments]);
  assert.deepEqual(calls.map((c) => c.source_ref), ["pay:old"]);
});
