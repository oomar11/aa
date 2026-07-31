import { STORAGE_KEYS } from "@/lib/storage/keys";

export type PaymentMethod = "cash" | "transfer" | "cheque" | "other";

export type PaymentKind = "payment" | "deposit";

export type InvoiceLine = {
  id: string;
  description: string;
  amount: number;
};

export type InvoiceStatus = "issued" | "partial" | "paid" | "cancelled";

export type Invoice = {
  id: string;
  number: string;
  customerId: string;
  projectId?: string;
  date: string;
  lines: InvoiceLine[];
  total: number;
  note?: string;
  status: InvoiceStatus;
  createdAt: string;
};

export type Payment = {
  id: string;
  customerId: string;
  invoiceId?: string;
  /** ربط مباشر بمشروع (مهم لعربون المقايسة) */
  projectId?: string;
  /** عربون = يدخل المشروع طابور الورشة؛ payment = تحصيل عادي */
  kind?: PaymentKind;
  amount: number;
  date: string;
  method: PaymentMethod;
  note?: string;
  createdAt: string;
};

export type Expense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  note?: string;
  createdAt: string;
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "نقدي",
  transfer: "تحويل",
  cheque: "شيك",
  other: "أخرى",
};

export const EXPENSE_CATEGORIES = [
  "خامات",
  "أجور",
  "نقل",
  "إيجار",
  "كهرباء ومرافق",
  "صيانة",
  "مصروفات عامة",
] as const;

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  issued: "مفتوحة",
  partial: "مدفوعة جزئياً",
  paid: "مدفوعة",
  cancelled: "ملغاة",
};

const seedInvoices: Invoice[] = [
  {
    id: "inv-1",
    number: "INV-0001",
    customerId: "1",
    projectId: "p1",
    date: "2026-07-18",
    lines: [
      { id: "l1", description: "فيلا المعادي — دفعة تعاقد", amount: 20000 },
    ],
    total: 20000,
    status: "partial",
    createdAt: "2026-07-18T10:00:00.000Z",
  },
  {
    id: "inv-2",
    number: "INV-0002",
    customerId: "3",
    projectId: "p6",
    date: "2026-07-22",
    lines: [
      { id: "l2", description: "فيلا الشيخ زايد — توريد وتركيب", amount: 4800 },
    ],
    total: 4800,
    status: "issued",
    createdAt: "2026-07-22T10:00:00.000Z",
  },
  {
    id: "inv-3",
    number: "INV-0003",
    customerId: "4",
    projectId: "p9",
    date: "2026-05-14",
    lines: [
      { id: "l3", description: "عمارة أكتوبر — دفعة أولى", amount: 22000 },
    ],
    total: 22000,
    status: "issued",
    createdAt: "2026-05-14T10:00:00.000Z",
  },
  {
    id: "inv-4",
    number: "INV-0004",
    customerId: "6",
    projectId: "p11",
    date: "2026-04-28",
    lines: [
      { id: "l4", description: "بيت الجيزة — باقي الحساب", amount: 3500 },
    ],
    total: 3500,
    status: "issued",
    createdAt: "2026-04-28T10:00:00.000Z",
  },
];

const seedPayments: Payment[] = [
  {
    id: "pay-1",
    customerId: "1",
    invoiceId: "inv-1",
    projectId: "p1",
    kind: "deposit",
    amount: 7500,
    date: "2026-07-20",
    method: "transfer",
    note: "عربون",
    createdAt: "2026-07-20T12:00:00.000Z",
  },
  {
    id: "pay-2",
    customerId: "3",
    projectId: "p6",
    kind: "deposit",
    amount: 10000,
    date: "2026-07-25",
    method: "cash",
    note: "عربون",
    createdAt: "2026-07-25T12:00:00.000Z",
  },
  {
    id: "pay-3",
    customerId: "4",
    invoiceId: "inv-3",
    projectId: "p9",
    kind: "deposit",
    amount: 22000,
    date: "2026-05-20",
    method: "transfer",
    note: "عربون / دفعة أولى",
    createdAt: "2026-05-20T12:00:00.000Z",
  },
];

const seedExpenses: Expense[] = [
  {
    id: "exp-1",
    category: "خامات",
    description: "شراء قطاعات شهر يوليو",
    amount: 8500,
    date: "2026-07-10",
    createdAt: "2026-07-10T09:00:00.000Z",
  },
  {
    id: "exp-2",
    category: "نقل",
    description: "نقل تركيب فيلا المعادي",
    amount: 600,
    date: "2026-07-19",
    createdAt: "2026-07-19T14:00:00.000Z",
  },
];

function readArray<T>(key: string): T[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeArray<T>(key: string, items: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(items));
  window.dispatchEvent(new Event("upvc-accounting-updated"));
}

export function loadInvoices(): Invoice[] {
  const local = readArray<Invoice>(STORAGE_KEYS.invoices);
  if (local) return local;
  return seedInvoices;
}

export function saveInvoices(invoices: Invoice[]) {
  writeArray(STORAGE_KEYS.invoices, invoices);
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

export function invoicePaidAmount(
  invoiceId: string,
  payments: Payment[] = loadPayments()
): number {
  return payments
    .filter((p) => p.invoiceId === invoiceId)
    .reduce((sum, p) => sum + p.amount, 0);
}

export function invoiceRemaining(
  invoice: Invoice,
  payments: Payment[] = loadPayments()
): number {
  if (invoice.status === "cancelled") return 0;
  return Math.max(0, invoice.total - invoicePaidAmount(invoice.id, payments));
}

export function deriveInvoiceStatus(
  invoice: Invoice,
  payments: Payment[] = loadPayments()
): InvoiceStatus {
  if (invoice.status === "cancelled") return "cancelled";
  const paid = invoicePaidAmount(invoice.id, payments);
  if (paid <= 0) return "issued";
  if (paid >= invoice.total) return "paid";
  return "partial";
}

export function refreshInvoiceStatuses(
  invoices: Invoice[] = loadInvoices(),
  payments: Payment[] = loadPayments()
): Invoice[] {
  return invoices.map((invoice) => ({
    ...invoice,
    status: deriveInvoiceStatus(invoice, payments),
  }));
}

export function customerInvoicedTotal(
  customerId: string,
  invoices: Invoice[] = loadInvoices()
): number {
  return invoices
    .filter((i) => i.customerId === customerId && i.status !== "cancelled")
    .reduce((sum, i) => sum + i.total, 0);
}

export function customerPaidTotal(
  customerId: string,
  payments: Payment[] = loadPayments()
): number {
  return payments
    .filter((p) => p.customerId === customerId)
    .reduce((sum, p) => sum + p.amount, 0);
}

/** المتبقي على العميل = فواتير − مدفوعات */
export function customerOutstanding(
  customerId: string,
  invoices: Invoice[] = loadInvoices(),
  payments: Payment[] = loadPayments()
): number {
  return Math.max(
    0,
    customerInvoicedTotal(customerId, invoices) -
      customerPaidTotal(customerId, payments)
  );
}

export function nextInvoiceNumber(invoices: Invoice[] = loadInvoices()): string {
  let max = 0;
  for (const invoice of invoices) {
    const match = /^INV-(\d+)$/i.exec(invoice.number.trim());
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `INV-${String(max + 1).padStart(4, "0")}`;
}

export function upsertInvoice(invoice: Invoice) {
  const all = loadInvoices();
  const next = [invoice, ...all.filter((i) => i.id !== invoice.id)];
  saveInvoices(refreshInvoiceStatuses(next, loadPayments()));
}

export function cancelInvoice(invoiceId: string) {
  const all = loadInvoices().map((invoice) =>
    invoice.id === invoiceId
      ? { ...invoice, status: "cancelled" as const }
      : invoice
  );
  saveInvoices(all);
}

export function upsertPayment(payment: Payment) {
  const payments = [payment, ...loadPayments().filter((p) => p.id !== payment.id)];
  savePayments(payments);
  saveInvoices(refreshInvoiceStatuses(loadInvoices(), payments));
}

export function deletePayment(paymentId: string) {
  const payments = loadPayments().filter((p) => p.id !== paymentId);
  savePayments(payments);
  saveInvoices(refreshInvoiceStatuses(loadInvoices(), payments));
}

export function upsertExpense(expense: Expense) {
  const all = [expense, ...loadExpenses().filter((e) => e.id !== expense.id)];
  saveExpenses(all);
}

export function deleteExpense(expenseId: string) {
  saveExpenses(loadExpenses().filter((e) => e.id !== expenseId));
}

export type AccountingSummary = {
  invoiced: number;
  collected: number;
  outstanding: number;
  expenses: number;
  net: number;
};

export function getAccountingSummary(
  invoices: Invoice[] = loadInvoices(),
  payments: Payment[] = loadPayments(),
  expenses: Expense[] = loadExpenses()
): AccountingSummary {
  const invoiced = invoices
    .filter((i) => i.status !== "cancelled")
    .reduce((sum, i) => sum + i.total, 0);
  const collected = payments.reduce((sum, p) => sum + p.amount, 0);
  const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  return {
    invoiced,
    collected,
    outstanding: Math.max(0, invoiced - collected),
    expenses: expenseTotal,
    net: collected - expenseTotal,
  };
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
