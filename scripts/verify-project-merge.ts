/**
 * تحقق سريع: إقفال مشاريع على جهاز ما يتسابش بمصفوفة قديمة من جهاز تاني.
 * تشغيل: npx tsx scripts/verify-project-merge.ts
 */

import { STORAGE_KEYS } from "../lib/storage/keys";
import { mergeJsonArraysById } from "../lib/storage/merge-by-id";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const created = "2026-01-10T10:00:00.000Z";

const phoneClosed = [
  {
    id: "p1",
    name: "شباك 1",
    createdAt: created,
    updatedAt: "2026-08-30T12:00:00.000Z",
    workflow: "done",
    status: "done",
    deliveryStatus: "delivered",
    deliveredAt: "2026-08-30",
  },
  {
    id: "p2",
    name: "باب 2",
    createdAt: created,
    updatedAt: "2026-08-30T12:01:00.000Z",
    workflow: "done",
    status: "done",
    deliveryStatus: "delivered",
    deliveredAt: "2026-08-30",
  },
  {
    id: "p3",
    name: "شباك 3",
    createdAt: created,
    updatedAt: "2026-08-30T12:02:00.000Z",
    workflow: "done",
    status: "done",
    deliveryStatus: "delivered",
    deliveredAt: "2026-08-30",
  },
];

const desktopStale = [
  {
    id: "p1",
    name: "شباك 1",
    createdAt: created,
    workflow: "done",
    status: "done",
    deliveryStatus: "awaiting",
  },
  {
    id: "p2",
    name: "باب 2",
    createdAt: created,
    workflow: "done",
    status: "done",
    deliveryStatus: "awaiting",
  },
  {
    id: "p3",
    name: "شباك 3",
    createdAt: created,
    workflow: "done",
    status: "done",
    deliveryStatus: "awaiting",
  },
  {
    id: "p4",
    name: "مشروع رابع",
    createdAt: created,
    updatedAt: "2026-08-30T13:00:00.000Z",
    workflow: "workshop",
    status: "open",
  },
];

// جهاز قديم رفع مصفوفة awaiting فوق السيرفر اللي فيه delivered
const staleOverwrites = mergeJsonArraysById(
  JSON.stringify(desktopStale),
  JSON.stringify(phoneClosed),
  { key: STORAGE_KEYS.projects }
);
const afterStale = JSON.parse(staleOverwrites.value) as Array<{
  id: string;
  deliveryStatus?: string;
  name?: string;
  workflow?: string;
}>;

for (const id of ["p1", "p2", "p3"]) {
  const row = afterStale.find((p) => p.id === id);
  assert(row?.deliveryStatus === "delivered", `${id} should stay delivered`);
}
assert(
  afterStale.some((p) => p.id === "p4" && p.workflow === "workshop"),
  "p4 from desktop should be kept"
);

// تعديل اسم أحدث على الكمبيوتر مع awaiting — التسليم من الموبايل يفضل
const desktopRenamed = [
  {
    id: "p1",
    name: "شباك 1 محدّث",
    createdAt: created,
    updatedAt: "2026-08-30T14:00:00.000Z",
    workflow: "done",
    status: "done",
    deliveryStatus: "awaiting",
  },
];
const phoneOnly = [
  {
    id: "p1",
    name: "شباك 1",
    createdAt: created,
    updatedAt: "2026-08-30T12:00:00.000Z",
    workflow: "done",
    status: "done",
    deliveryStatus: "delivered",
    deliveredAt: "2026-08-30",
  },
];
const renamedMerge = mergeJsonArraysById(
  JSON.stringify(desktopRenamed),
  JSON.stringify(phoneOnly),
  { key: STORAGE_KEYS.projects }
);
const renamed = JSON.parse(renamedMerge.value)[0] as {
  name: string;
  deliveryStatus: string;
  deliveredAt?: string;
};
assert(renamed.name === "شباك 1 محدّث", "newer name should win");
assert(renamed.deliveryStatus === "delivered", "delivery must survive rename");
assert(renamed.deliveredAt === "2026-08-30", "deliveredAt must survive");

// بدون updatedAt: delivered يفوز على awaiting
const legacy = mergeJsonArraysById(
  JSON.stringify([
    {
      id: "p1",
      createdAt: created,
      workflow: "done",
      deliveryStatus: "delivered",
      deliveredAt: "2026-08-30",
    },
  ]),
  JSON.stringify([
    {
      id: "p1",
      createdAt: created,
      workflow: "done",
      deliveryStatus: "awaiting",
    },
  ]),
  { key: STORAGE_KEYS.projects }
);
const legacyRow = JSON.parse(legacy.value)[0] as { deliveryStatus: string };
assert(
  legacyRow.deliveryStatus === "delivered",
  "legacy tie-break prefers delivered"
);

console.log("verify-project-merge: ok");
