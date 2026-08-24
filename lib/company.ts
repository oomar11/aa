import { STORAGE_KEYS } from "@/lib/storage/keys";
import { sharedGetItem, sharedSetItem } from "@/lib/storage/shared-client";

/** بنود اتفاق افتراضية تظهر في عقد المشروع — قابلة للتعديل من الإعدادات */
export const DEFAULT_CONTRACT_TERMS = [
  "يلتزم الطرف الأول بتنفيذ وتركيب الأعمال المتفق عليها حسب المقاسات والمواصفات المذكورة في المقايسة.",
  "المبلغ المتفق عليه نهائي بعد اعتماد المقايسة، وأي تعديل أو إضافة يُحسب باتفاق الطرفين.",
  "يتم سداد دفعة مقدمة عند التعاقد، وباقي المبلغ حسب الاتفاق قبل أو عند التسليم/التركيب.",
  "مدة التنفيذ تقريبية وتبدأ من تاريخ استلام الدفعة المقدمة واعتماد المقاسات النهائية في الموقع.",
  "يوفّر العميل تأمين الموقع والكهرباء والتصاريح اللازمة للتركيب إن وُجدت.",
  "الضمان على عيوب التصنيع والتركيب وفق المتفق عليه، ولا يشمل سوء الاستخدام أو الكسر الخارجي أو التعديل بواسطة الغير.",
  "في حال إلغاء التعاقد من طرف العميل بعد بدء التصنيع، تُخصم تكلفة ما تم تنفيذه والخامات المحجوزة من المقدم.",
].join("\n");

/** بيانات الشركة الواحدة — البرنامج لشركة واحدة فقط */
export type Company = {
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  taxNumber?: string;
  commercialRegister?: string;
  note?: string;
  /** بنود عقد الاتفاق مع العملاء (سطر لكل بند) */
  contractTerms?: string;
};

export const DEFAULT_COMPANY: Company = {
  name: "شركتي للـ uPVC",
  phone: "",
  address: "",
  email: "",
  taxNumber: "",
  commercialRegister: "",
  note: "",
  contractTerms: DEFAULT_CONTRACT_TERMS,
};

export function loadCompany(): Company {
  if (typeof window === "undefined") return DEFAULT_COMPANY;
  try {
    const raw = sharedGetItem(STORAGE_KEYS.company);
    if (!raw) return DEFAULT_COMPANY;
    const parsed = JSON.parse(raw) as Partial<Company>;
    const terms =
      typeof parsed.contractTerms === "string"
        ? parsed.contractTerms.trim()
        : "";
    return {
      ...DEFAULT_COMPANY,
      ...parsed,
      name: (parsed.name ?? DEFAULT_COMPANY.name).trim() || DEFAULT_COMPANY.name,
      contractTerms: terms || DEFAULT_CONTRACT_TERMS,
    };
  } catch {
    return DEFAULT_COMPANY;
  }
}

/** بنود الاتفاق الجاهزة للعرض (سطر = بند) */
export function companyContractTerms(
  company: Company = loadCompany()
): string[] {
  const raw = (company.contractTerms ?? DEFAULT_CONTRACT_TERMS).trim();
  const lines = raw
    .split(/\r?\n/)
    .map((line) =>
      line.replace(/^\s*[\d٠-٩]+[\.\-\)\u060C:،]?\s*/, "").trim()
    )
    .filter(Boolean);
  return lines.length > 0 ? lines : DEFAULT_CONTRACT_TERMS.split("\n");
}

export function saveCompany(company: Company) {
  if (typeof window === "undefined") return;
  const terms = company.contractTerms?.trim() || DEFAULT_CONTRACT_TERMS;
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
    contractTerms: terms,
  };
  sharedSetItem(STORAGE_KEYS.company, JSON.stringify(next));
  window.dispatchEvent(new Event("upvc-company-updated"));
}
