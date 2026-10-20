import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defaultVorneAccessoryBrands,
  migrateVorneAccessoryBrands,
} from "@/lib/accessory-price-list-2026";
import {
  defaultProfileDetails,
  ensurePremierProfileSystems,
  type AccessoryBrand,
  type MaterialSystem,
} from "@/lib/material-systems";

function withSaved(
  patch: Record<string, Partial<AccessoryBrand>>
): AccessoryBrand[] {
  return defaultVorneAccessoryBrands().map((b) =>
    patch[b.id] ? { ...b, ...patch[b.id] } : b
  );
}

function byId(brands: AccessoryBrand[], id: string): AccessoryBrand {
  const b = brands.find((x) => x.id === id);
  assert.ok(b, id);
  return b;
}

test("saved July 2026 VORNE prices move to the October 2026 list", () => {
  const out = migrateVorneAccessoryBrands(
    withSaved({
      "brand-vorne-protruding-handle": { unitPrice: 46.7 },
      "brand-vorne-roller": { unitPrice: 18.4 },
      "brand-vorne-hinged-esp": {
        sizePrices: { 30: 42.3, 180: 126.7, 200: 150 },
      },
      "brand-vorne-tilt-scissors": { sizePrices: { 600: 138.9, 1100: 222.3 } },
    })
  );
  assert.equal(byId(out, "brand-vorne-protruding-handle").unitPrice, 50);
  assert.equal(byId(out, "brand-vorne-roller").unitPrice, 19.2);
  // ٢٠٠ سم مش في قائمة أكتوبر — يفضل على سعره
  assert.deepEqual(byId(out, "brand-vorne-hinged-esp").sizePrices, {
    30: 44.5,
    180: 132.3,
    200: 150,
  });
  assert.deepEqual(byId(out, "brand-vorne-tilt-scissors").sizePrices, {
    600: 139.4,
    1100: 223.4,
  });
});

test("a VORNE price edited by hand is kept", () => {
  const out = migrateVorneAccessoryBrands(
    withSaved({
      "brand-vorne-protruding-handle": { unitPrice: 48 },
      "brand-vorne-hinged-esp": { sizePrices: { 30: 40, 40: 47.8 } },
    })
  );
  assert.equal(byId(out, "brand-vorne-protruding-handle").unitPrice, 48);
  assert.deepEqual(byId(out, "brand-vorne-hinged-esp").sizePrices, {
    30: 40,
    40: 50,
  });
  // تاني تحميل مايغيّرش حاجة
  assert.deepEqual(migrateVorneAccessoryBrands(out), out);
});

test("saved Premier rates that were off the City list get the list price", () => {
  const profile = defaultProfileDetails();
  const pvc1: MaterialSystem = {
    id: "pvc1",
    name: "بريمير",
    isDefault: true,
    profile: {
      ...profile,
      rates: {
        "frame-hinged": {
          barPrice: 790,
          barLengthM: 6,
          productName: "حلق مفصلي ببار 6سم بالكاوتش",
        },
        "mullion-sliding": {
          barPrice: 875,
          barLengthM: 6.5,
          productName: "قائم ثابت سوقاس جرار",
        },
        panel: { barPrice: 165, barLengthM: 6, productName: "بنل عرض ١٥ سم" },
        "sash-hinged": { barPrice: 900, barLengthM: 6 },
      },
    },
  };
  const [out] = ensurePremierProfileSystems([pvc1], profile.deductions);
  const rates = out?.profile?.rates ?? {};
  assert.deepEqual(rates["frame-hinged"], {
    barPrice: 856,
    barLengthM: 6.5,
    productName: "حلق مفصلي ببار 6سم بالكاوتش",
  });
  assert.deepEqual(rates["mullion-sliding"], {
    barPrice: 700,
    barLengthM: 6.5,
    productName: "قائم ثابت سوقاس جرار",
  });
  assert.deepEqual(rates.panel, {
    barPrice: 750,
    barLengthM: 6.5,
    productName: "بانل 3 طبقات",
  });
  // سعر متعدّل يدوي يفضل زي ما هو
  assert.deepEqual(rates["sash-hinged"], { barPrice: 900, barLengthM: 6 });
});
