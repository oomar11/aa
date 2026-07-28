/** شجرة تقسيم الشباك — نفس فكرة WinStudio (مullions رأسية/أفقية) */

export type LayoutNode =
  | { type: "pane"; id: string }
  | { type: "empty" }
  | {
      type: "split";
      dir: "v" | "h";
      /** نسب العرض/الارتفاع لكل طفل — تُطبَّع تلقائياً */
      ratios: number[];
      children: LayoutNode[];
    };

let paneSeq = 0;

export function nextPaneId(): string {
  paneSeq += 1;
  return `p-${paneSeq}-${Math.random().toString(36).slice(2, 7)}`;
}

export function pane(id?: string): LayoutNode {
  return { type: "pane", id: id ?? nextPaneId() };
}

export function empty(): LayoutNode {
  return { type: "empty" };
}

/** تقسيم رأسي (أعمدة من اليسار لليمين في SVG) */
export function cols(
  ...parts: Array<LayoutNode | [number, LayoutNode]>
): LayoutNode {
  return split("v", parts);
}

/** تقسيم أفقي (صفوف من فوق لتحت) */
export function rows(
  ...parts: Array<LayoutNode | [number, LayoutNode]>
): LayoutNode {
  return split("h", parts);
}

function split(
  dir: "v" | "h",
  parts: Array<LayoutNode | [number, LayoutNode]>
): LayoutNode {
  const ratios: number[] = [];
  const children: LayoutNode[] = [];
  for (const part of parts) {
    if (Array.isArray(part)) {
      ratios.push(part[0]);
      children.push(part[1]);
    } else {
      ratios.push(1);
      children.push(part);
    }
  }
  return { type: "split", dir, ratios, children };
}

/** n أعمدة متساوية — كل ضلفة جديدة */
export function nCols(n: number): LayoutNode {
  return cols(...Array.from({ length: n }, () => pane()));
}

/** n صفوف متساوية — كل ضلفة جديدة */
export function nRows(n: number): LayoutNode {
  return rows(...Array.from({ length: n }, () => pane()));
}

/** n أعمدة، كل عمود من `factory()` */
export function nColsOf(n: number, factory: () => LayoutNode): LayoutNode {
  return cols(...Array.from({ length: n }, () => factory()));
}

/** n صفوف، كل صف من `factory()` */
export function nRowsOf(n: number, factory: () => LayoutNode): LayoutNode {
  return rows(...Array.from({ length: n }, () => factory()));
}

/** شباك بترانسوم علوي بعرض كامل + أعمدة تحت */
export function transomTop(
  bottomCols: number,
  topRatio = 0.28
): LayoutNode {
  return rows(
    [topRatio, pane()],
    [1 - topRatio, nCols(bottomCols)]
  );
}

/** أعمدة تحت + ترانسوم علوي مقسوم */
export function transomTopSplit(
  bottomCols: number,
  topCols: number,
  topRatio = 0.28
): LayoutNode {
  return rows(
    [topRatio, nCols(topCols)],
    [1 - topRatio, nCols(bottomCols)]
  );
}

/** أعمدة فوق + قاعدة أفقية بعرض كامل */
export function baseBottom(
  topCols: number,
  bottomRatio = 0.35
): LayoutNode {
  return rows(
    [1 - bottomRatio, nCols(topCols)],
    [bottomRatio, pane()]
  );
}

/** شبكة m×n */
export function grid(colsCount: number, rowsCount: number): LayoutNode {
  return cols(
    ...Array.from({ length: colsCount }, () =>
      rows(...Array.from({ length: rowsCount }, () => pane()))
    )
  );
}

export function countPanes(node: LayoutNode): number {
  if (node.type === "pane") return 1;
  if (node.type === "empty") return 0;
  return node.children.reduce((sum, c) => sum + countPanes(c), 0);
}

export function listPaneIds(node: LayoutNode): string[] {
  if (node.type === "pane") return [node.id];
  if (node.type === "empty") return [];
  return node.children.flatMap(listPaneIds);
}

/** نسخ عميق مع معرفات ضلف جديدة */
export function cloneLayout(node: LayoutNode): LayoutNode {
  if (node.type === "empty") return empty();
  if (node.type === "pane") return pane();
  return {
    type: "split",
    dir: node.dir,
    ratios: [...node.ratios],
    children: node.children.map(cloneLayout),
  };
}

/** يضمن وجود id لكل ضلفة (للبيانات القديمة) */
export function ensurePaneIds(node: LayoutNode): LayoutNode {
  if (node.type === "empty") return node;
  if (node.type === "pane") {
    return node.id ? node : pane();
  }
  return {
    type: "split",
    dir: node.dir,
    ratios: [...node.ratios],
    children: node.children.map(ensurePaneIds),
  };
}

/** تقدير عدد الأعمدة/الصفوف في الشجرة (بما فيها empty) لنِسَب المعاينة */
export function estimateLayoutSpan(node: LayoutNode): {
  cols: number;
  rows: number;
} {
  if (node.type === "pane" || node.type === "empty") {
    return { cols: 1, rows: 1 };
  }
  if (node.dir === "v") {
    let cols = 0;
    let rows = 1;
    for (const child of node.children) {
      const span = estimateLayoutSpan(child);
      cols += span.cols;
      rows = Math.max(rows, span.rows);
    }
    return { cols: Math.max(cols, 1), rows };
  }
  let cols = 1;
  let rows = 0;
  for (const child of node.children) {
    const span = estimateLayoutSpan(child);
    rows += span.rows;
    cols = Math.max(cols, span.cols);
  }
  return { cols, rows: Math.max(rows, 1) };
}

export function layoutHasEmpty(node: LayoutNode): boolean {
  if (node.type === "empty") return true;
  if (node.type === "pane") return false;
  return node.children.some(layoutHasEmpty);
}

/** مقاس viewBox لمعاينة التمبلت — نسبة أقرب لشكل الشباك الحقيقي */
export function getLayoutPreviewSize(node: LayoutNode): {
  width: number;
  height: number;
} {
  const { cols, rows } = estimateLayoutSpan(node);
  const hasEmpty = layoutHasEmpty(node);
  const pad = 14;
  const colUnit = 28;
  const rowUnit = 34;

  let width = cols * colUnit + pad;
  let height = rows * rowUnit + pad;

  if (cols === 1 && rows === 1) {
    width = 78;
    height = 104;
  } else if (rows === 1 && cols >= 2) {
    // شباك عريض بضلف أفقية
    height = Math.max(height, Math.round(width * 0.78));
  } else if (cols === 1 && rows >= 2) {
    width = Math.max(width, 70);
    height = Math.max(height, rows * 38 + pad);
  }

  // أشكال L / أبواب متدرجة — أطول شوية
  if (hasEmpty) {
    height = Math.max(height, Math.round(width * 1.15));
  }

  const maxW = 132;
  const maxH = 148;
  const scale = Math.min(1, maxW / width, maxH / height);
  return {
    width: Math.max(48, Math.round(width * scale)),
    height: Math.max(56, Math.round(height * scale)),
  };
}

/** مقاسات افتراضية عند إنشاء بند من تمبلت */
export function defaultSizeForLayout(node: LayoutNode): {
  widthMm: number;
  heightMm: number;
} {
  const { cols, rows } = estimateLayoutSpan(node);
  const hasEmpty = layoutHasEmpty(node);

  if (hasEmpty && cols <= 3) {
    return { widthMm: 1000, heightMm: 2100 };
  }
  if (cols === 1 && rows === 1) {
    return { widthMm: 1200, heightMm: 1400 };
  }
  if (rows === 1 && cols >= 2) {
    return {
      widthMm: Math.min(900 + cols * 350, 2800),
      heightMm: 1300,
    };
  }
  if (cols === 1 && rows >= 2) {
    return {
      widthMm: 1100,
      heightMm: Math.min(900 + rows * 350, 2400),
    };
  }
  const aspect = cols / Math.max(rows, 1);
  if (aspect >= 1) {
    return {
      widthMm: Math.round(1300 * Math.min(aspect, 2.4)),
      heightMm: 1300,
    };
  }
  return {
    widthMm: 1300,
    heightMm: Math.round(1300 * Math.min(1 / aspect, 2.2)),
  };
}
