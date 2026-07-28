import {
  baseBottom,
  cols,
  empty,
  grid,
  nCols,
  nColsOf,
  nRows,
  pane,
  rows,
  transomTop,
  transomTopSplit,
  type LayoutNode,
} from "@/lib/window-layout";

export type WindowTemplate = {
  id: string;
  layout: LayoutNode;
};

/**
 * كل التمبلتات من شاشات configuration في WinStudio V44.4
 * مرتّبة تقريباً بنفس ترتيب التمرير في التطبيق الأصلي
 */
export const WINDOW_TEMPLATES: WindowTemplate[] = [
  // ─── أساسيات ───────────────────────────────────────────
  { id: "t01-single", layout: pane() },
  { id: "t02-2v", layout: nCols(2) },
  { id: "t03-3v", layout: nCols(3) },
  { id: "t04-4v", layout: nCols(4) },
  { id: "t05-2h", layout: nRows(2) },
  { id: "t06-3h", layout: nRows(3) },

  // ─── أشكال L / T ───────────────────────────────────────
  {
    id: "t07-l-left-top",
    layout: cols(pane(), rows(pane(), empty())),
  },
  { id: "t08-t-top-3", layout: transomTop(3) },
  {
    id: "t09-l-right-top",
    layout: cols(rows(pane(), empty()), pane()),
  },
  { id: "t10-t-top-2", layout: transomTop(2) },
  {
    id: "t11-left-full-right-2h",
    layout: cols(pane(), nRows(2)),
  },
  {
    id: "t12-right-full-left-2h",
    layout: cols(nRows(2), pane()),
  },

  // ─── أبواب / أشكال متدرجة (stepped) ────────────────────
  {
    id: "t13-step-low-left",
    // يسار أقصر + يمين أطول (قسمين فوق بعض على اليمين)
    layout: cols(
      [1, rows(empty(), pane())],
      [1, pane()]
    ),
  },
  {
    id: "t14-step-tall-center",
    layout: cols(
      rows(empty(), pane()),
      pane(),
      rows(empty(), pane())
    ),
  },
  {
    id: "t15-step-low-right",
    layout: cols(
      [1, pane()],
      [1, rows(empty(), pane())]
    ),
  },
  {
    id: "t16-step-tall-right-of-2",
    layout: cols(
      rows(empty(), pane()),
      rows(empty(), pane()),
      pane()
    ),
  },
  {
    id: "t17-step-tall-mid3",
    layout: cols(
      rows(empty(), pane()),
      pane(),
      pane(),
      pane(),
      rows(empty(), pane())
    ),
  },
  {
    id: "t18-step-tall-left-of-2",
    layout: cols(
      pane(),
      rows(empty(), pane()),
      rows(empty(), pane())
    ),
  },
  {
    id: "t19-step-transom-low-left",
    layout: rows(
      [0.28, nCols(2)],
      [
        0.72,
        cols(rows(empty(), pane()), pane()),
      ]
    ),
  },
  {
    id: "t20-step-transom-tall-center",
    layout: rows(
      [0.28, nCols(3)],
      [
        0.72,
        cols(rows(empty(), pane()), pane(), rows(empty(), pane())),
      ]
    ),
  },
  {
    id: "t21-step-transom-low-right",
    layout: rows(
      [0.28, nCols(2)],
      [
        0.72,
        cols(pane(), rows(empty(), pane())),
      ]
    ),
  },

  // ─── تقسيمات مركّبة ────────────────────────────────────
  { id: "t22-4h", layout: nRows(4) },
  { id: "t23-5h", layout: nRows(5) },
  {
    id: "t24-3v-left-has-top",
    layout: cols(nRows(2), pane(), pane()),
  },
  {
    id: "t25-3v-right-has-top",
    layout: cols(pane(), pane(), nRows(2)),
  },
  {
    id: "t26-2v-both-2h",
    layout: nColsOf(2, () => nRows(2)),
  },
  {
    id: "t27-3v-mid-3h",
    layout: cols(pane(), nRows(3), pane()),
  },
  {
    id: "t28-left-full-right-2h-b",
    layout: cols([1.2, pane()], nRows(2)),
  },
  { id: "t29-base-2top", layout: baseBottom(2) },
  { id: "t30-base-3top", layout: baseBottom(3) },
  { id: "t31-base-4top", layout: baseBottom(4) },

  // ─── ترانسوم فوق أعمدة كثيرة ───────────────────────────
  {
    id: "t32-5top-2base",
    layout: rows([0.55, nCols(5)], [0.45, nCols(2)]),
  },
  {
    id: "t33-5top-3base",
    layout: rows([0.55, nCols(5)], [0.45, nCols(3)]),
  },
  {
    id: "t34-5top-wide3base",
    layout: rows(
      [0.5, nCols(5)],
      [0.5, cols([1.4, pane()], pane(), [1.4, pane()])]
    ),
  },
  { id: "t35-t-top-3-wide", layout: transomTop(3, 0.32) },
  {
    id: "t37-asym-4",
    layout: cols(
      [1.4, pane()],
      rows(pane(), pane())
    ),
  },
  {
    id: "t40-3v-wide-center",
    layout: cols(pane(), [1.5, pane()], pane()),
  },
  {
    id: "t41-2v-left-3h-right-2h",
    layout: cols(nRows(3), nRows(2)),
  },
  { id: "t42-3x3", layout: grid(3, 3) },

  // ─── أعمدة ضيقة / louvre-like ──────────────────────────
  { id: "t43-5v", layout: nCols(5) },
  { id: "t44-6v", layout: nCols(6) },
  { id: "t45-8v", layout: nCols(8) },

  // ─── ترانسوم فوق/تحت مع أعمدة ───────────────────────────
  {
    id: "t46-2top-1bottom",
    layout: rows([0.45, nCols(2)], [0.55, pane()]),
  },
  {
    id: "t47-3v-outer-mid-split",
    layout: cols(nRows(2), pane(), nRows(2)),
  },
  { id: "t48-t-top-1-bottom-3", layout: transomTop(3, 0.3) },
  { id: "t49-base-4top-b", layout: baseBottom(4, 0.38) },
  { id: "t50-base-5top", layout: baseBottom(5, 0.38) },
  { id: "t51-base-6top", layout: baseBottom(6, 0.38) },

  // ─── ترانسوم مقسوم فوق أعمدة كثيرة ─────────────────────
  { id: "t52-4v-2transom", layout: transomTopSplit(4, 2, 0.26) },
  { id: "t53-5v-2transom", layout: transomTopSplit(5, 2, 0.26) },
  { id: "t54-6v-2transom", layout: transomTopSplit(6, 2, 0.26) },
  { id: "t55-4v-1transom", layout: transomTop(4, 0.26) },
  { id: "t56-5v-1transom", layout: transomTop(5, 0.26) },
  { id: "t57-6v-1transom", layout: transomTop(6, 0.26) },

  // ─── أعمدة خارجية كاملة + ترانسوم في الوسط ─────────────
  {
    id: "t58-4v-mid-transom",
    layout: cols(
      pane(),
      rows([0.28, pane()], [0.72, pane()]),
      rows([0.28, pane()], [0.72, pane()]),
      pane()
    ),
  },
  {
    id: "t59-5v-mid-transom",
    layout: cols(
      pane(),
      rows([0.28, pane()], [0.72, pane()]),
      rows([0.28, pane()], [0.72, pane()]),
      rows([0.28, pane()], [0.72, pane()]),
      pane()
    ),
  },
  {
    id: "t60-6v-mid-transom",
    layout: cols(
      pane(),
      rows([0.28, pane()], [0.72, pane()]),
      rows([0.28, pane()], [0.72, pane()]),
      rows([0.28, pane()], [0.72, pane()]),
      rows([0.28, pane()], [0.72, pane()]),
      pane()
    ),
  },

  // ─── شاشات أخيرة ───────────────────────────────────────
  {
    id: "t61-7v-thin-transom",
    layout: rows([0.18, pane()], [0.82, nCols(7)]),
  },
  {
    id: "t63-top-thin-2v",
    layout: rows([0.22, pane()], [0.78, nCols(2)]),
  },
  {
    id: "t64-3band-top-mid3-bot",
    layout: rows(
      [0.22, pane()],
      [0.5, nCols(3)],
      [0.28, pane()]
    ),
  },
  {
    id: "t66-t-top-3-wide-sides",
    layout: rows(
      [0.28, pane()],
      [0.72, cols([1.3, pane()], pane(), [1.3, pane()])]
    ),
  },
  { id: "t69-t-top-7", layout: transomTop(7, 0.22) },

  // ─── إضافات شائعة من التمرير ───────────────────────────
  {
    id: "t70-3v-each-top",
    layout: nColsOf(3, () => rows([0.28, pane()], [0.72, pane()])),
  },
  {
    id: "t71-4v-each-mid-bar",
    layout: nColsOf(4, () => rows(pane(), pane())),
  },
  {
    id: "t72-3v-center-top-only",
    layout: cols(
      pane(),
      rows([0.28, pane()], [0.72, pane()]),
      pane()
    ),
  },
];

export function getTemplateById(id: string): WindowTemplate | undefined {
  return WINDOW_TEMPLATES.find((t) => t.id === id);
}
