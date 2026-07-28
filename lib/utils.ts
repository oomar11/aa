export function normalizeArabic(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim()
    .replace(/\s+/g, " ");
}

export function smartSearchMatch(
  searchQuery: string,
  fields: (string | null | undefined)[]
): boolean {
  if (!searchQuery) return true;
  const normalizedQuery = normalizeArabic(searchQuery);
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);

  if (queryTokens.length === 0) return true;

  const combinedText = fields
    .filter(Boolean)
    .map((field) => normalizeArabic(field as string))
    .join(" ");

  return queryTokens.every((token) => combinedText.includes(token));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ar-EG", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(isoDate));
}
