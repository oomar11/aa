import assert from "node:assert/strict";
import { test } from "node:test";
import { STORAGE_KEYS } from "@/lib/storage/keys";
import { mergeJsonArraysById } from "@/lib/storage/merge-by-id";

const t0 = "2026-01-10T10:00:00.000Z";
const t1 = "2026-01-11T10:00:00.000Z";

test("local-only rows are kept and flagged for upload", () => {
  const r = mergeJsonArraysById(
    JSON.stringify([{ id: "a", updatedAt: t0 }, { id: "b", updatedAt: t0 }]),
    JSON.stringify([{ id: "a", updatedAt: t0 }])
  );
  const ids = (JSON.parse(r.value) as { id: string }[]).map((x) => x.id).sort();
  assert.deepEqual(ids, ["a", "b"]);
  assert.equal(r.localOnly, true);
});

test("newer row wins regardless of side", () => {
  const r = mergeJsonArraysById(
    JSON.stringify([{ id: "a", name: "old", updatedAt: t0 }]),
    JSON.stringify([{ id: "a", name: "new", updatedAt: t1 }])
  );
  assert.equal((JSON.parse(r.value) as { name: string }[])[0]!.name, "new");
});

test("project: a stale device cannot undo 'done'/'delivered' from another device", () => {
  const phoneDone = [
    { id: "p", name: "x", workflow: "done", deliveryStatus: "delivered", deliveredAt: t1, updatedAt: t1 },
  ];
  const staleLaptop = [
    { id: "p", name: "renamed", workflow: "workshop", updatedAt: "2026-01-12T10:00:00.000Z" },
  ];
  const r = mergeJsonArraysById(JSON.stringify(staleLaptop), JSON.stringify(phoneDone), {
    key: STORAGE_KEYS.projects,
  });
  const p = (JSON.parse(r.value) as Record<string, unknown>[])[0]!;
  assert.equal(p.name, "renamed"); // الاسم من الأحدث
  assert.equal(p.workflow, "done"); // التقدّم من الأكثر تقدماً
  assert.equal(p.deliveryStatus, "delivered");
});

test("non-array payload falls back to the server value", () => {
  const r = mergeJsonArraysById("{}", "[]");
  assert.equal(r.value, "[]");
  assert.equal(r.localOnly, false);
});
