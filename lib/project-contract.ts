import {
  companyContractTerms,
  loadCompany,
  type Company,
} from "@/lib/company";
import { mergeCustomers, type Customer } from "@/lib/customers";
import {
  getProjectMoneySummary,
  type ProjectMoneySummary,
} from "@/lib/project-money";
import { getProjectById, type Project } from "@/lib/projects";

export type ProjectContractData = {
  company: Company;
  customer: Customer | null;
  project: Project;
  money: ProjectMoneySummary;
  terms: string[];
  contractDate: string;
  printedAt: string;
};

function parseTermsText(raw: string): string[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) =>
      line.replace(/^\s*[\d٠-٩]+[\.\-\)\u060C:،]?\s*/, "").trim()
    )
    .filter(Boolean);
  return lines;
}

/**
 * بيانات عقد الاتفاق لمشروع — البنود من نص مخصّص أو إعدادات الشركة.
 */
export function buildProjectContract(
  customerId: string,
  projectId: string,
  termsOverride?: string
): ProjectContractData | null {
  const project = getProjectById(projectId);
  if (!project) return null;

  const company = loadCompany();
  const customer =
    mergeCustomers().find((c) => c.id === customerId) ??
    mergeCustomers().find((c) => c.id === project.customerId) ??
    null;

  const override = termsOverride?.trim();
  const terms = override
    ? parseTermsText(override)
    : companyContractTerms(company);

  const now = new Date();
  return {
    company,
    customer,
    project,
    money: getProjectMoneySummary(projectId),
    terms: terms.length > 0 ? terms : companyContractTerms(company),
    contractDate: now.toISOString().slice(0, 10),
    printedAt: new Intl.DateTimeFormat("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(now),
  };
}
