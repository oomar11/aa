export type Customer = {
  id: string;
  name: string;
  phone: string;
  address?: string;
  note?: string;
  balance: number;
  lastDealAt: string;
  projectsCount: number;
};

export const CUSTOMERS_STORAGE_KEY = "upvc-customers";

export function loadLocalCustomers(): Customer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Customer[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const customers: Customer[] = [
  {
    id: "1",
    name: "أحمد محمد",
    phone: "01001234567",
    address: "المعادي",
    balance: 12500,
    lastDealAt: "2026-07-18",
    projectsCount: 4,
  },
  {
    id: "2",
    name: "محمود علي",
    phone: "01009876543",
    address: "مدينة نصر",
    balance: 0,
    lastDealAt: "2026-06-02",
    projectsCount: 2,
  },
  {
    id: "3",
    name: "سارة حسن",
    phone: "01112223344",
    address: "الشيخ زايد",
    balance: 4800,
    lastDealAt: "2026-07-22",
    projectsCount: 3,
  },
  {
    id: "4",
    name: "يوسف إبراهيم",
    phone: "01223334455",
    address: "6 أكتوبر",
    balance: 22000,
    lastDealAt: "2026-05-14",
    projectsCount: 7,
  },
  {
    id: "5",
    name: "نورا عبد الرحمن",
    phone: "01556667788",
    address: "مصر الجديدة",
    balance: 0,
    lastDealAt: "2026-07-01",
    projectsCount: 1,
  },
  {
    id: "6",
    name: "خالد فتحي",
    phone: "01005556666",
    address: "الجيزة",
    balance: 3500,
    lastDealAt: "2026-04-28",
    projectsCount: 5,
  },
];
