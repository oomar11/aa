import { STORAGE_KEYS } from "@/lib/storage/keys";
import { sharedGetItem, sharedSetItem } from "@/lib/storage/shared-client";

/**
 * خصم مكتسب من مورد: بيقلّل اللي علينا للمورد، وبيتحسب مكسب للورشة.
 * مفيش فلوس بتتحرك من الخزنة، فمش بيظهر في سجل حركة الفلوس.
 */
export type SupplierDiscount = {
  id: string;
  /** مورد المحل لو الربط شغال (اختياري) */
  storeSupplierId?: string;
  supplierName: string;
  amount: number;
  date: string;
  note?: string;
  createdAt: string;
};

function readDiscounts(): SupplierDiscount[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sharedGetItem(STORAGE_KEYS.supplierDiscounts);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SupplierDiscount[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function loadSupplierDiscounts(): SupplierDiscount[] {
  return readDiscounts() ?? [];
}

export function saveSupplierDiscounts(discounts: SupplierDiscount[]) {
  if (typeof window === "undefined") return;
  sharedSetItem(STORAGE_KEYS.supplierDiscounts, JSON.stringify(discounts));
  window.dispatchEvent(new Event("upvc-accounting-updated"));
}

export function getSupplierDiscountById(
  id: string
): SupplierDiscount | undefined {
  return loadSupplierDiscounts().find((d) => d.id === id);
}

export function upsertSupplierDiscount(discount: SupplierDiscount) {
  saveSupplierDiscounts([
    discount,
    ...loadSupplierDiscounts().filter((d) => d.id !== discount.id),
  ]);
}

export function deleteSupplierDiscount(id: string) {
  saveSupplierDiscounts(loadSupplierDiscounts().filter((d) => d.id !== id));
}

export function supplierDiscountsTotal(
  discounts: SupplierDiscount[] = loadSupplierDiscounts()
): number {
  return discounts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
}

/** مجموع الخصومات بتاريخها داخل الفترة (نفس منطق المصروف العام). */
export function supplierDiscountsInPeriod(
  fromDate: string | null,
  toDate: string,
  discounts: SupplierDiscount[] = loadSupplierDiscounts()
): number {
  return supplierDiscountsTotal(
    discounts.filter(
      (d) => (!fromDate || d.date >= fromDate) && d.date <= toDate
    )
  );
}
