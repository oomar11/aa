"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { createPortal, flushSync } from "react-dom";
import { ProjectReport } from "@/components/design/ProjectReport";
import {
  buildProjectPdfFile,
  canSharePdfFile,
  downloadPdfFile,
  sharePdfFile,
  type SharePdfResult,
} from "@/lib/project-pdf";

export type ProjectPdfExporterHandle = {
  /** يجهّز PDF ويعرض شاشة مشاركة/تنزيل */
  openShare: () => Promise<void>;
};

type Props = {
  customerId: string;
  projectId: string;
  projectName?: string;
};

type Phase = "idle" | "preparing" | "ready" | "error";

/**
 * يرسم تقرير المشروع خارج الشاشة، يجهّز PDF، ويعرض شاشة مشاركة الملف.
 */
export const ProjectPdfExporter = forwardRef<ProjectPdfExporterHandle, Props>(
  function ProjectPdfExporter({ customerId, projectId, projectName }, ref) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const [exportMounted, setExportMounted] = useState(false);
    const [phase, setPhase] = useState<Phase>("idle");
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busyAction, setBusyAction] = useState(false);

    const close = useCallback(() => {
      setPhase("idle");
      setFile(null);
      setError(null);
      setBusyAction(false);
      setExportMounted(false);
    }, []);

    const openShare = useCallback(async () => {
      if (phase === "preparing") return;
      setError(null);
      setFile(null);
      setPhase("preparing");
      flushSync(() => setExportMounted(true));

      try {
        await waitForPaint();
        const sheet = hostRef.current?.querySelector(
          ".report-sheet"
        ) as HTMLElement | null;
        if (!sheet) {
          throw new Error("تعذر تجهيز صفحة التقرير");
        }
        const pdf = await buildProjectPdfFile(sheet, projectName);
        setFile(pdf);
        setPhase("ready");
      } catch (err) {
        console.error(err);
        setError("تعذر تجهيز ملف PDF. حاول مرة أخرى.");
        setPhase("error");
      } finally {
        setExportMounted(false);
      }
    }, [phase, projectName]);

    useImperativeHandle(ref, () => ({ openShare }), [openShare]);

    async function handleShareClick() {
      if (!file || busyAction) return;
      setBusyAction(true);
      try {
        const result: SharePdfResult = await sharePdfFile(
          file,
          `تقرير مشروع${projectName ? ` — ${projectName}` : ""}`
        );
        if (result !== "cancelled") close();
      } finally {
        setBusyAction(false);
      }
    }

    function handleDownloadClick() {
      if (!file || busyAction) return;
      downloadPdfFile(file);
      close();
    }

    const showOverlay = phase === "preparing" || phase === "ready" || phase === "error";
    const shareAvailable = file ? canSharePdfFile(file) : false;

    return (
      <>
        {exportMounted && typeof document !== "undefined"
          ? createPortal(
              <div
                ref={hostRef}
                aria-hidden
                className="pointer-events-none fixed top-0 left-[-12000px] z-[-1] w-[794px] bg-white text-[#152033]"
              >
                <ProjectReport
                  customerId={customerId}
                  projectId={projectId}
                  exportOnly
                />
              </div>,
              document.body
            )
          : null}

        {showOverlay && typeof document !== "undefined"
          ? createPortal(
              <div
                className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 px-4 pb-6 sm:items-center"
                role="dialog"
                aria-modal="true"
                aria-labelledby="pdf-share-title"
                onClick={phase === "preparing" ? undefined : close}
              >
                <div
                  className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-[0_16px_40px_rgba(15,20,28,0.22)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {phase === "preparing" ? (
                    <div className="py-4 text-center">
                      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <p
                        id="pdf-share-title"
                        className="mt-3 text-sm font-bold text-foreground"
                      >
                        جاري تجهيز PDF…
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        الرسم والتفاصيل والأسعار
                      </p>
                    </div>
                  ) : null}

                  {phase === "error" ? (
                    <div className="text-right">
                      <h2
                        id="pdf-share-title"
                        className="text-base font-bold text-foreground"
                      >
                        فشلت المشاركة
                      </h2>
                      <p className="mt-2 text-sm text-muted">{error}</p>
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => void openShare()}
                          className="flex-1 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
                        >
                          إعادة المحاولة
                        </button>
                        <button
                          type="button"
                          onClick={close}
                          className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold"
                        >
                          إغلاق
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {phase === "ready" && file ? (
                    <div className="text-right">
                      <h2
                        id="pdf-share-title"
                        className="text-base font-bold text-foreground"
                      >
                        PDF جاهز
                      </h2>
                      <p className="mt-1 text-sm text-muted">
                        {projectName
                          ? `تقرير «${projectName}»`
                          : "تقرير المشروع"}
                      </p>
                      <p
                        className="mt-2 truncate rounded-lg bg-primary-soft px-2.5 py-2 text-xs font-medium text-primary"
                        dir="auto"
                      >
                        {file.name}
                      </p>

                      <div className="mt-4 flex flex-col gap-2">
                        {shareAvailable ? (
                          <button
                            type="button"
                            onClick={() => void handleShareClick()}
                            disabled={busyAction}
                            className="rounded-xl bg-primary px-3 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
                          >
                            {busyAction ? "جاري الفتح…" : "مشاركة ملف PDF"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={handleDownloadClick}
                          disabled={busyAction}
                          className="rounded-xl border border-border bg-background px-3 py-3 text-sm font-semibold text-foreground disabled:opacity-60"
                        >
                          {shareAvailable ? "تنزيل PDF" : "حفظ PDF على الجهاز"}
                        </button>
                        <button
                          type="button"
                          onClick={close}
                          disabled={busyAction}
                          className="rounded-xl px-3 py-2 text-sm font-medium text-muted"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>,
              document.body
            )
          : null}
      </>
    );
  }
);

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(resolve, 160);
      });
    });
  });
}
