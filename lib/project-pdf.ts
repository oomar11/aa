import { domToCanvas } from "modern-screenshot";
import { jsPDF } from "jspdf";

/** اسم ملف PDF آمن من اسم المشروع */
export function projectPdfFileName(projectName?: string): string {
  const base = (projectName?.trim() || "مشروع-upvc")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `تقرير-${base}.pdf`;
}

/** يحوّل عنصر التقرير إلى PDF متعدد الصفحات (A4) */
export async function elementToPdfBlob(element: HTMLElement): Promise<Blob> {
  const canvas = await domToCanvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    quality: 1,
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const imgData = canvas.toDataURL("image/jpeg", 0.92);

  let heightLeft = imgHeight;
  let offsetY = margin;

  pdf.addImage(imgData, "JPEG", margin, offsetY, imgWidth, imgHeight);
  heightLeft -= contentHeight;

  while (heightLeft > 1) {
    offsetY = margin - (imgHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", margin, offsetY, imgWidth, imgHeight);
    heightLeft -= contentHeight;
  }

  return pdf.output("blob");
}

export type SharePdfResult = "shared" | "downloaded" | "cancelled";

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
    downloadPdfFile(file);
    return "downloaded";
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
    downloadPdfFile(file);
    return "downloaded";
  }
}

export function downloadPdfFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** @deprecated استخدم sharePdfFile */
export async function shareOrDownloadPdf(
  file: File,
  opts?: { title?: string; text?: string }
): Promise<SharePdfResult> {
  void opts?.text;
  return sharePdfFile(file, opts?.title);
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
