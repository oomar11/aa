import { domToCanvas } from "modern-screenshot";
import { jsPDF } from "jspdf";

/** مقاس صفحة A4 بالبكسل عند ~96dpi — مطابق لعرض التصدير */
export const REPORT_PAGE_WIDTH_PX = 794;
export const REPORT_PAGE_HEIGHT_PX = 1123;
export const REPORT_ITEMS_PER_PAGE = 2;

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
  ).filter((page) => page.closest(".report-sheet") != null);
  if (pages.length === 0) {
    throw new Error("لا توجد صفحات تقرير للتصدير");
  }

  // مقاس A4 صريح بالمليمتر — متعتمدش على اسم format عشان بعض البيئات ترجع Letter
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [210, 297],
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }

  // المضيف بيتشاف بشفافية شبه صفرية عشان مقاس الخط العربي يتظبط —
  // وقت التصوير لازم يبقى ظاهر بالكامل وإلا الصفحات تطلع بيضا/فاضية.
  const fadeHosts: Array<{ el: HTMLElement; opacity: string }> = [];
  let host: HTMLElement | null = element;
  while (host) {
    const opacity = host.style.opacity;
    if (opacity && opacity !== "1") {
      fadeHosts.push({ el: host, opacity });
      host.style.opacity = "1";
    }
    host = host.parentElement;
  }

  try {
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]!;
      // ثبّت المقاس قبل التصوير عشان مفيش ضغط/تداخل للنص
      page.style.width = `${REPORT_PAGE_WIDTH_PX}px`;
      page.style.height = `${REPORT_PAGE_HEIGHT_PX}px`;
      page.style.boxSizing = "border-box";
      page.style.overflow = "hidden";
      page.style.opacity = "1";
      page.style.color = "#152033";
      page.style.backgroundColor = "#ffffff";

      const canvas = await domToCanvas(page, {
        scale: 2.5,
        backgroundColor: "#ffffff",
        width: REPORT_PAGE_WIDTH_PX,
        height: REPORT_PAGE_HEIGHT_PX,
        style: {
          fontFamily:
            'Cairo, "Noto Sans Arabic", "Segoe UI", Tahoma, sans-serif',
          letterSpacing: "0px",
          wordSpacing: "0px",
          opacity: "1",
          color: "#152033",
          backgroundColor: "#ffffff",
        },
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.94);
      if (i > 0) pdf.addPage();
      pdf.addImage(
        imgData,
        "JPEG",
        0,
        0,
        pageWidth,
        pageHeight,
        undefined,
        "FAST"
      );
    }
  } finally {
    for (const { el, opacity } of fadeHosts) {
      el.style.opacity = opacity;
    }
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

/** اسم ملف طلبية مشتريات */
export function purchaseOrderPdfFileName(projectName?: string): string {
  const base = (projectName?.trim() || "مشروع-upvc")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `طلبية-مشتريات-${base}.pdf`;
}

/** اسم ملف تكلفة المشروع التقديرية */
export function estimatedCostPdfFileName(projectName?: string): string {
  const base = (projectName?.trim() || "مشروع-upvc")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `تكلفة-تقديرية-${base}.pdf`;
}

/** اسم ملف أمر تشغيل الورشة */
export function workshopOrderPdfFileName(projectName?: string): string {
  const base = (projectName?.trim() || "مشروع-upvc")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `أمر-تشغيل-${base}.pdf`;
}

/** اسم ملف عقد الاتفاق */
export function contractPdfFileName(projectName?: string): string {
  const base = (projectName?.trim() || "مشروع-upvc")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `عقد-اتفاق-${base}.pdf`;
}

export async function buildNamedPdfFile(
  sheet: HTMLElement,
  fileName: string
): Promise<File> {
  const blob = await elementToPdfBlob(sheet);
  return new File([blob], fileName, {
    type: "application/pdf",
    lastModified: Date.now(),
  });
}

/** يقسّم البنود: ٢ في الصفحة — عمودين × صف واحد عشان الرسم والمقاسات يبانوا */
export function chunkReportItems<T>(items: T[], size = REPORT_ITEMS_PER_PAGE): T[][] {
  if (items.length === 0) return [[]];
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

/**
 * تقسيم أسطر الجداول على صفحات A4 مع ميزانية أصغر للصفحة الأولى
 * (هيدر كبير) واحتساب تكلفة عناوين الأقسام — عشان المحتوى متتقصّش
 * من غير ما نولّد صفحات شبه فاضية.
 */
export function chunkItemsByBudget<T>(
  items: T[],
  options: {
    firstPageBudget: number;
    nextPageBudget: number;
    /** وحدات إضافية لكل عنوان قسم جديد */
    sectionCost?: number;
    getSection?: (item: T) => string;
  }
): T[][] {
  if (items.length === 0) return [[]];

  const sectionCost = Math.max(0, options.sectionCost ?? 0);
  const getSection = options.getSection;
  const pages: T[][] = [];
  let current: T[] = [];
  let used = 0;
  let budget = Math.max(1, options.firstPageBudget);
  let lastSection: string | null = null;

  for (const item of items) {
    const section = getSection ? getSection(item) : "";
    const newSection = Boolean(getSection) && section !== lastSection;
    let cost = 1 + (newSection ? sectionCost : 0);

    if (current.length > 0 && used + cost > budget) {
      pages.push(current);
      current = [];
      used = 0;
      lastSection = null;
      budget = Math.max(1, options.nextPageBudget);
      // بعد القطع: عنوان القسم بيتعاد في الصفحة الجديدة فقط
      cost = 1 + (getSection ? sectionCost : 0);
    }

    // لو السطر لوحده أكبر من الميزانية — خليه في صفحة لوحده بدل ما يتساب
    if (current.length === 0 && cost > budget) {
      cost = Math.min(cost, budget);
    }

    current.push(item);
    used += cost;
    if (getSection) lastSection = section;
  }

  if (current.length > 0) pages.push(current);
  // شيل أي صفحة فاضية بالغلط
  return pages.filter((page) => page.length > 0);
}
