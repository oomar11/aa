import type { PaneGrid } from "@/lib/design-items";

export type GridRect = { x: number; y: number; w: number; h: number };
export type GridLine = { x1: number; y1: number; x2: number; y2: number };

/** أعمدة الشبكة المستطيلة (للمعاينة السريعة) — الأشكال غير المنتظمة ترجع 1 */
export function gridCols(grid: PaneGrid): number {
  switch (grid) {
    case "2v":
    case "2x2":
    case "2x3":
      return 2;
    case "3v":
    case "3x2":
    case "3x3":
      return 3;
    case "4v":
      return 4;
    default:
      return 1;
  }
}

export function gridRows(grid: PaneGrid): number {
  switch (grid) {
    case "2h":
    case "2x2":
    case "3x2":
      return 2;
    case "3h":
    case "2x3":
    case "3x3":
      return 3;
    case "4h":
      return 4;
    default:
      return 1;
  }
}

/** هل التقسيم شبكة منتظمة (صف×عمود) مناسبة لـ CSS grid */
export function isRegularGrid(grid: PaneGrid): boolean {
  return (
    grid === "2v" ||
    grid === "2h" ||
    grid === "3v" ||
    grid === "3h" ||
    grid === "4v" ||
    grid === "4h" ||
    grid === "2x2" ||
    grid === "2x3" ||
    grid === "3x2" ||
    grid === "3x3"
  );
}

function rectGrid(
  cols: number,
  rows: number,
  x: number,
  y: number,
  w: number,
  h: number
): GridRect[] {
  const cw = w / cols;
  const ch = h / rows;
  const out: GridRect[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push({ x: x + c * cw, y: y + r * ch, w: cw, h: ch });
    }
  }
  return out;
}

function rectGridLines(
  cols: number,
  rows: number,
  x: number,
  y: number,
  w: number,
  h: number
): GridLine[] {
  const lines: GridLine[] = [];
  for (let c = 1; c < cols; c++) {
    const vx = x + (c * w) / cols;
    lines.push({ x1: vx, y1: y, x2: vx, y2: y + h });
  }
  for (let r = 1; r < rows; r++) {
    const hy = y + (r * h) / rows;
    lines.push({ x1: x, y1: hy, x2: x + w, y2: hy });
  }
  return lines;
}

export function getGridCells(
  grid: PaneGrid,
  x: number,
  y: number,
  w: number,
  h: number
): GridRect[] {
  switch (grid) {
    case "solid":
    case "diamond":
      return [{ x, y, w, h }];
    case "2v":
      return rectGrid(2, 1, x, y, w, h);
    case "2h":
      return rectGrid(1, 2, x, y, w, h);
    case "3v":
      return rectGrid(3, 1, x, y, w, h);
    case "3h":
      return rectGrid(1, 3, x, y, w, h);
    case "4v":
      return rectGrid(4, 1, x, y, w, h);
    case "4h":
      return rectGrid(1, 4, x, y, w, h);
    case "2x2":
      return rectGrid(2, 2, x, y, w, h);
    case "3x2":
      return rectGrid(3, 2, x, y, w, h);
    case "2x3":
      return rectGrid(2, 3, x, y, w, h);
    case "3x3":
      return rectGrid(3, 3, x, y, w, h);
    case "top-2v": {
      const hh = h / 2;
      const hw = w / 2;
      return [
        { x, y, w: hw, h: hh },
        { x: x + hw, y, w: hw, h: hh },
        { x, y: y + hh, w, h: hh },
      ];
    }
    case "bot-2v": {
      const hh = h / 2;
      const hw = w / 2;
      return [
        { x, y, w, h: hh },
        { x, y: y + hh, w: hw, h: hh },
        { x: x + hw, y: y + hh, w: hw, h: hh },
      ];
    }
  }
}

export function gridLines(
  grid: PaneGrid,
  x: number,
  y: number,
  w: number,
  h: number
): GridLine[] {
  switch (grid) {
    case "solid":
      return [];
    case "diamond":
      return [
        { x1: x, y1: y, x2: x + w, y2: y + h },
        { x1: x + w, y1: y, x2: x, y2: y + h },
      ];
    case "2v":
      return rectGridLines(2, 1, x, y, w, h);
    case "2h":
      return rectGridLines(1, 2, x, y, w, h);
    case "3v":
      return rectGridLines(3, 1, x, y, w, h);
    case "3h":
      return rectGridLines(1, 3, x, y, w, h);
    case "4v":
      return rectGridLines(4, 1, x, y, w, h);
    case "4h":
      return rectGridLines(1, 4, x, y, w, h);
    case "2x2":
      return rectGridLines(2, 2, x, y, w, h);
    case "3x2":
      return rectGridLines(3, 2, x, y, w, h);
    case "2x3":
      return rectGridLines(2, 3, x, y, w, h);
    case "3x3":
      return rectGridLines(3, 3, x, y, w, h);
    case "top-2v":
      return [
        { x1: x, y1: y + h / 2, x2: x + w, y2: y + h / 2 },
        { x1: x + w / 2, y1: y, x2: x + w / 2, y2: y + h / 2 },
      ];
    case "bot-2v":
      return [
        { x1: x, y1: y + h / 2, x2: x + w, y2: y + h / 2 },
        { x1: x + w / 2, y1: y + h / 2, x2: x + w / 2, y2: y + h },
      ];
  }
}
