"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { createPortal, flushSync } from "react-dom";
import { ContractReport } from "@/components/design/ContractReport";
import {
  DEFAULT_CONTRACT_TERMS,
  loadCompany,
} from "@/lib/company";
import {
  REPORT_PAGE_WIDTH_PX,
  buildNamedPdfFile,
  canSharePdfFile,
  contractPdfFileName,
  openPdfFile,
  sharePdfFile,
  type SharePdfResult,
} from "@/lib/project-pdf";

export type ContractPdfExporterHandle = {
  openShare: () => Promise<void>;
};

type Props = {
  customerId: string;
  projectId: string;
  projectName?: string;
};

type Phase = "idle" | "edit-terms" | "preparing" | "ready" | "error";

/**
 * عقد اتفاق: تعديل البنود ثم تجهيز PDF للمشاركة أو الطباعة/التوقيع.
 */
export const ContractPdfExporter = forwardRef<ContractPdfExporterHandle, Props>(
  function ContractPdfExporter({ customerId, projectId, projectName }, ref) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const [exportMounted, setExportMounted] = useState(false);
    const [phase, setPhase] = useState<Phase>("idle");
    const [termsText, setTermsText] = useState(DEFAULT_CONTRACT_TERMS);
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
      const company = loadCompany();
      setTermsText(
        (company.contractTerms?.trim() || DEFAULT_CONTRACT_TERMS).trim()
      );
      setError(null);
      setFile(null);
      setExportMounted(false);
      setPhase("edit-terms");
    }, [phase]);

    useImperativeHandle(ref, () => ({ openShare }), [openShare]);

    const preparePdf = useCallback(async () => {
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
        if (!sheet) throw new Error("تعذر تجهيز العقد");
        if (sheet.querySelectorAll(".report-page").length === 0) {
          throw new Error("تعذر تجهيز صفحات العقد");
        }
        const pdf = await buildNamedPdfFile(
          sheet,
          contractPdfFileName(projectName)
        );
        setFile(pdf);
        setPhase("ready");
      } catch (err) {
        console.error(err);
        setError("تعذر تجهيز ملف العقد. حاول مرة أخرى.");
        setPhase("error");
        setExportMounted(false);
      }
    }, [phase, projectName]);

    async function handleShareClick() {
      if (!file || busyAction) return;
      setBusyAction(true);
      try {
        const result: SharePdfResult = await sharePdfFile(
          file,
          `عقد اتفاق${projectName ? ` — ${projectName}` : ""}`
        );
        if (result === "unsupported") {
          window.alert(
            "المشاركة غير متاحة على هذا الجهاز. حاول فتح الملف ثم مشاركته من هناك."
          );
          return;
        }
        if (result !== "cancelled") close();
      } finally {
        setBusyAction(false);
      }
    }

    function handleOpenClick() {
      if (!file || busyAction) return;
      openPdfFile(file);
      close();
    }

    const showOverlay = phase !== "idle";
    const shareAvailable = file ? canSharePdfFile(file) : false;

    return (
      <>
        {exportMounted && typeof document !== "undefined"
          ? createPortal(
              <div
                ref={hostRef}
                aria-hidden
                className="pointer-events-none fixed top-0 left-0 z-[-1] overflow-visible bg-white text-[#152033]"
                style={{
                  width: REPORT_PAGE_WIDTH_PX,
                  opacity: 0.01,
                  fontFamily:
                    'Cairo, "Noto Sans Arabic", "Segoe UI", Tahoma, sans-serif',
                }}
              >
                <ContractReport
                  customerId={customerId}
                  projectId={projectId}
                  termsText={termsText}
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
                aria-labelledby="contract-share-title"
                onClick={
                  phase === "preparing" || phase === "edit-terms"
                    ? undefined
                    : close
                }
              >
                <div
                  className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-[0_16px_40px_rgba(15,20,28,0.22)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {phase === "edit-terms" ? (
                    <div className="text-right">
                      <h2
                        id="contract-share-title"
                        className="text-base font-bold text-foreground"
                      >
                        عقد اتفاق
                      </h2>
                      <p className="mt-1 text-sm text-muted">
                        {projectName
                          ? `راجع البنود لمشروع «${projectName}» ثم جهّز الملف`
                          : "راجع بنود الاتفاق ثم جهّز الملف"}
                      </p>
                      <label className="mt-3 flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-foreground">
                          بنود الاتفاق
                        </span>
                        <textarea
                          value={termsText}
                          onChange={(e) => setTermsText(e.target.value)}
                          rows={9}
                          className="min-h-[180px] w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                          placeholder="كل سطر = بند…"
                        />
                        <span className="text-[11px] text-muted">
                          التعديل لهذه المشاركة فقط. غيّر الافتراضي من إعدادات الشركة.
                        </span>
                      </label>
                      <div className="mt-4 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => void preparePdf()}
                          disabled={!termsText.trim()}
                          className="rounded-xl bg-primary px-3 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
                        >
                          تجهيز العقد
                        </button>
                        <button
                          type="button"
                          onClick={close}
                          className="rounded-xl px-3 py-2 text-sm font-medium text-muted"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {phase === "preparing" ? (
                    <div className="py-4 text-center">
                      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <p
                        id="contract-share-title"
                        className="mt-3 text-sm font-bold text-foreground"
                      >
                        جاري تجهيز عقد الاتفاق…
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        جاهز للمشاركة أو الطباعة والتوقيع
                      </p>
                    </div>
                  ) : null}

                  {phase === "error" ? (
                    <div className="text-right">
                      <h2
                        id="contract-share-title"
                        className="text-base font-bold text-foreground"
                      >
                        فشل تجهيز العقد
                      </h2>
                      <p className="mt-2 text-sm text-muted">{error}</p>
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => void preparePdf()}
                          className="flex-1 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
                        >
                          إعادة المحاولة
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhase("edit-terms")}
                          className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold"
                        >
                          رجوع للبنود
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {phase === "ready" && file ? (
                    <div className="text-right">
                      <h2
                        id="contract-share-title"
                        className="text-base font-bold text-foreground"
                      >
                        العقد جاهز
                      </h2>
                      <p className="mt-1 text-sm text-muted">
                        {projectName
                          ? `مشروع «${projectName}»`
                          : "عقد اتفاق للعميل"}
                      </p>
                      <p
                        className="mt-2 truncate rounded-lg bg-primary-soft px-2.5 py-2 text-xs font-medium text-primary"
                        dir="auto"
                      >
                        {file.name}
                      </p>
                      <div className="mt-4 flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={handleOpenClick}
                            disabled={busyAction}
                            className="rounded-xl border border-border bg-background px-3 py-3 text-sm font-bold text-foreground disabled:opacity-60"
                          >
                            فتح / طباعة
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleShareClick()}
                            disabled={busyAction || !shareAvailable}
                            className="rounded-xl bg-primary px-3 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
                          >
                            {busyAction ? "…" : "مشاركة"}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFile(null);
                            setExportMounted(false);
                            setPhase("edit-terms");
                          }}
                          disabled={busyAction}
                          className="rounded-xl px-3 py-2 text-sm font-medium text-muted"
                        >
                          تعديل البنود
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

async function waitForPaint() {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(resolve, 420);
      });
    });
  });
}
