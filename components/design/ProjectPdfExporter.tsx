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
  shareOrDownloadPdf,
  type SharePdfResult,
} from "@/lib/project-pdf";

export type ProjectPdfExporterHandle = {
  sharePdf: () => Promise<SharePdfResult>;
};

type Props = {
  customerId: string;
  projectId: string;
  projectName?: string;
};

/**
 * يرسم تقرير المشروع خارج الشاشة ويحوّله لـ PDF للمشاركة/التنزيل.
 */
export const ProjectPdfExporter = forwardRef<ProjectPdfExporterHandle, Props>(
  function ProjectPdfExporter({ customerId, projectId, projectName }, ref) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const [mounted, setMounted] = useState(false);

    const sharePdf = useCallback(async (): Promise<SharePdfResult> => {
      flushSync(() => setMounted(true));

      try {
        await waitForPaint();
        const sheet = hostRef.current?.querySelector(
          ".report-sheet"
        ) as HTMLElement | null;
        if (!sheet) {
          throw new Error("تعذر تجهيز صفحة التقرير");
        }

        const file = await buildProjectPdfFile(sheet, projectName);
        return await shareOrDownloadPdf(file, {
          title: `تقرير مشروع${projectName ? ` — ${projectName}` : ""}`,
          text: `تقرير مشروع UPVC${projectName ? ` — ${projectName}` : ""}`,
        });
      } finally {
        setMounted(false);
      }
    }, [projectName]);

    useImperativeHandle(ref, () => ({ sharePdf }), [sharePdf]);

    if (!mounted || typeof document === "undefined") return null;

    return createPortal(
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
    );
  }
);

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(resolve, 120);
      });
    });
  });
}
