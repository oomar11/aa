import { STORAGE_KEYS } from "@/lib/storage/keys";
import { sharedGetItem, sharedSetItem } from "@/lib/storage/shared-client";

export type PaymentMethod = "cash" | "transfer" | "cheque" | "other";

export type PaymentKind = "payment" | "deposit";

/** حالة مزامنة الحركة مع خزنة المتجر */
export type StoreBridgeMeta = {
  safeId: string;
  /** اسم الخزنة وقت التسجيل — للعرض بدون جلب قائمة الخزن */
  safeName?: string;
  syncedAmount: number;
  syncedAt: string;
  referenceId?: string;
};

export type Payment = {
  id: string;
  customerId: string;
  /** ربط مباشر بمشروع — المصدر الأساسي للمال */
  projectId?: string;
  /**
   * توافق قديم مع فواتير أُلغيت — لا يُستخدم في الواجهة.
   * يُقرأ فقط عند ترحيل بيانات قديمة إن لزم.
   */
  invoiceId?: string;
  /** توافق قديم — غير مستخدم في الواجهة */
  kind?: PaymentKind;
  amount: number;
  date: string;
  method: PaymentMethod;
  note?: string;
  createdAt: string;
  /** مزامنة الخزنة في المتجر (إن وُجد الربط) */
  storeBridge?: StoreBridgeMeta;
};

/** تسوية المصروف: نقدي من الخزنة أو آجل على مورد المحل */
export type ExpenseSettlement = "cash" | "credit";

export type Expense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  /** ربط المصروف بمشروع (اختياري للمصروفات العامة) */
  projectId?: string;
  note?: string;
  createdAt: string;
  /** نقدي (افتراضي) أو آجل على مورد */
  settlement?: ExpenseSettlement;
  /** مورد المحل عند التسوية الآجلة */
  storeSupplierId?: string;
  storeSupplierName?: string;
  /** مزامنة الخزنة في المتجر (إن وُجد الربط) */
  storeBridge?: StoreBridgeMeta;
  /** فاتورة متجر مرتبطة (صندوق وارد / توريد آجل) — بدون سحب خزنة مكرر */
  storeInvoiceId?: string;
  storeInvoiceNumber?: string;
};

export const EXPENSE_SETTLEMENT_LABELS: Record<ExpenseSettlement, string> = {
  cash: "نقدي",
  credit: "آجل",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "نقدي",
  transfer: "تحويل",
  cheque: "شيك",
  other: "أخرى",
};

/** طريقة الدفع المعروضة: خزنة النظام، أو التسمية القديمة للدفعات السابقة */
export function paymentChannelLabel(payment: Payment): string {
  const safeName = payment.storeBridge?.safeName?.trim();
  if (safeName) return safeName;
  return PAYMENT_METHOD_LABELS[payment.method];
}

export const EXPENSE_CATEGORIES = [
  "خامات",
  "أجور",
  "نقل",
  "إيجار",
  "كهرباء ومرافق",
  "صيانة",
  "مصروفات عامة",
] as const;

const seedPayments: Payment[] = [];

const seedExpenses: Expense[] = [];

function readArray<T>(key: string): T[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sharedGetItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeArray<T>(key: string, items: T[]) {
  if (typeof window === "undefined") return;
  sharedSetItem(key, JSON.stringify(items));
  window.dispatchEvent(new Event("upvc-accounting-updated"));
}

export function loadPayments(): Payment[] {
  const local = readArray<Payment>(STORAGE_KEYS.payments);
  if (local) return local;
  return seedPayments;
}

export function savePayments(payments: Payment[]) {
  writeArray(STORAGE_KEYS.payments, payments);
}

export function loadExpenses(): Expense[] {
  const local = readArray<Expense>(STORAGE_KEYS.expenses);
  if (local) return local;
  return seedExpenses;
}

export function saveExpenses(expenses: Expense[]) {
  writeArray(STORAGE_KEYS.expenses, expenses);
}

export function customerPaidTotal(
  customerId: string,
  payments: Payment[] = loadPayments()
): number {
  return payments
    .filter((p) => p.customerId === customerId)
    .reduce((sum, p) => sum + p.amount, 0);
}

export function upsertPayment(payment: Payment) {
  const previous = loadPayments().find((p) => p.id === payment.id);
  const payments = [payment, ...loadPayments().filter((p) => p.id !== payment.id)];
  savePayments(payments);

  if (typeof window === "undefined") return;
  const projectIds = new Set<string>();
  if (previous?.projectId) projectIds.add(previous.projectId);
  if (payment.projectId) projectIds.add(payment.projectId);
  if (projectIds.size === 0) return;
  void import("@/lib/workshop").then(({ syncProjectMoneyFromPayments }) => {
    for (const projectId of projectIds) {
      syncProjectMoneyFromPayments(projectId, payment.date);
    }
  });
}

export function deletePayment(paymentId: string) {
  const existing = loadPayments().find((p) => p.id === paymentId);
  const payments = loadPayments().filter((p) => p.id !== paymentId);
  savePayments(payments);

  if (existing?.projectId && typeof window !== "undefined") {
    void import("@/lib/workshop").then(({ syncProjectMoneyFromPayments }) => {
      syncProjectMoneyFromPayments(existing.projectId!);
    });
  }
}

export function upsertExpense(expense: Expense) {
  const all = [expense, ...loadExpenses().filter((e) => e.id !== expense.id)];
  saveExpenses(all);
}

export function deleteExpense(expenseId: string) {
  saveExpenses(loadExpenses().filter((e) => e.id !== expenseId));
}

export type AccountingSummary = {
  /** إجمالي بيع المشاريع غير المقايسة (عربون / ورشة / مكتمل) */
  sales: number;
  /** مجموع الدفعات المحصّلة */
  collected: number;
  /** مجموع المتبقي على الشغل المكتمل فقط */
  outstanding: number;
  expenses: number;
  net: number;
};

export function getAccountingSummary(
  payments: Payment[] = loadPayments(),
  expenses: Expense[] = loadExpenses(),
  sales = 0,
  outstanding = 0
): AccountingSummary {
  const collected = payments.reduce((sum, p) => sum + p.amount, 0);
  const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  return {
    sales,
    collected,
    outstanding,
    expenses: expenseTotal,
    net: collected - expenseTotal,
  };
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
