import { domToCanvas } from "modern-screenshot";
import { jsPDF } from "jspdf";

/** مقاس صفحة A4 بالبكسل عند ~96dpi — مطابق لعرض التصدير */
export const REPORT_PAGE_WIDTH_PX = 794;
export const REPORT_PAGE_HEIGHT_PX = 1123;
export const REPORT_ITEMS_PER_PAGE = 4;

/** اسم ملف PDF آمن من اسم المشروع */
export function projectPdfFileName(projectName?: string): string {
  const base = (projectName?.trim() || "مشروع-upvc")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `تقرير-${base}.pdf`;
}

/**
 * يحوّل صفحات التقرير (كل واحدة A4) إلى PDF —
 * كل `.report-page` = صفحة مستقلة عشان مفيش تقطيع/تداخل نص.
 */
export async function elementToPdfBlob(element: HTMLElement): Promise<Blob> {
  const pages = Array.from(
    element.querySelectorAll<HTMLElement>(".report-page")
  );
  if (pages.length === 0) {
    throw new Error("لا توجد صفحات تقرير للتصدير");
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;
    const canvas = await domToCanvas(page, {
      scale: 2,
      backgroundColor: "#ffffff",
      quality: 1,
      width: REPORT_PAGE_WIDTH_PX,
      height: REPORT_PAGE_HEIGHT_PX,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.93);
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
  }

  return pdf.output("blob");
}

export type SharePdfResult = "shared" | "opened" | "cancelled" | "unsupported";

export function canSharePdfFile(file: File): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  );
}

/**
 * مشاركة ملف PDF فقط — بدون text عشان التطبيقات متفضلش النص على الملف.
 * لازم تتنادى من ضغطة مستخدم مباشرة (خصوصاً على iOS).
 */
export async function sharePdfFile(
  file: File,
  title?: string
): Promise<SharePdfResult> {
  if (!canSharePdfFile(file)) {
    return "unsupported";
  }

  try {
    await navigator.share({
      files: [file],
      title: title ?? file.name,
    });
    return "shared";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return "cancelled";
    }
    return "unsupported";
  }
}

/** فتح ملف PDF في تاب جديدة للمعاينة — من غير تنزيل */
export function openPdfFile(file: File): SharePdfResult {
  const url = URL.createObjectURL(file);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  if (!opened) {
    window.location.assign(url);
  }
  return "opened";
}

export async function buildProjectPdfFile(
  sheet: HTMLElement,
  projectName?: string
): Promise<File> {
  const blob = await elementToPdfBlob(sheet);
  return new File([blob], projectPdfFileName(projectName), {
    type: "application/pdf",
    lastModified: Date.now(),
  });
}

/** يقسّم البنود: ٤ في الصفحة — صفّين × عمودين */
export function chunkReportItems<T>(items: T[], size = REPORT_ITEMS_PER_PAGE): T[][] {
  if (items.length === 0) return [[]];
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}
