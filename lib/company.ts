import { STORAGE_KEYS } from "@/lib/storage/keys";
import { sharedGetItem, sharedSetItem } from "@/lib/storage/shared-client";

/** بيانات الشركة الواحدة — البرنامج لشركة واحدة فقط */
export type Company = {
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  taxNumber?: string;
  commercialRegister?: string;
  note?: string;
};

export const DEFAULT_COMPANY: Company = {
  name: "شركتي للـ uPVC",
  phone: "",
  address: "",
  email: "",
  taxNumber: "",
  commercialRegister: "",
  note: "",
};

export function loadCompany(): Company {
  if (typeof window === "undefined") return DEFAULT_COMPANY;
  try {
    const raw = sharedGetItem(STORAGE_KEYS.company);
    if (!raw) return DEFAULT_COMPANY;
    const parsed = JSON.parse(raw) as Partial<Company>;
    return {
      ...DEFAULT_COMPANY,
      ...parsed,
      name: (parsed.name ?? DEFAULT_COMPANY.name).trim() || DEFAULT_COMPANY.name,
    };
  } catch {
    return DEFAULT_COMPANY;
  }
}

export function saveCompany(company: Company) {
  if (typeof window === "undefined") return;
  const next: Company = {
    ...DEFAULT_COMPANY,
    ...company,
    name: company.name.trim() || DEFAULT_COMPANY.name,
    phone: company.phone?.trim() || undefined,
    address: company.address?.trim() || undefined,
    email: company.email?.trim() || undefined,
    taxNumber: company.taxNumber?.trim() || undefined,
    commercialRegister: company.commercialRegister?.trim() || undefined,
    note: company.note?.trim() || undefined,
  };
  sharedSetItem(STORAGE_KEYS.company, JSON.stringify(next));
  window.dispatchEvent(new Event("upvc-company-updated"));
}
