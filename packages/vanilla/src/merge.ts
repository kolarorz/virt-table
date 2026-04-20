import { isEqual, unionWith } from "lodash-es";

export interface MergeCell {
  rowIndex: number;
  colIndex: number;
  rowspan: number;
  colspan: number;
}

type RowMergeIndex = Map<number, MergeCell[]>;
const rowMergeIndexCache = new WeakMap<MergeCell[], RowMergeIndex>();

function buildRowMergeIndex(merges: MergeCell[]): RowMergeIndex {
  const rowMap: RowMergeIndex = new Map();
  for (let i = 0; i < merges.length; i++) {
    const m = merges[i];
    const rowEnd = m.rowIndex + m.rowspan - 1;
    for (let r = m.rowIndex; r <= rowEnd; r++) {
      const rowList = rowMap.get(r);
      if (rowList) rowList.push(m);
      else rowMap.set(r, [m]);
    }
  }
  return rowMap;
}

function getRowMergeIndex(merges: MergeCell[]): RowMergeIndex {
  let idx = rowMergeIndexCache.get(merges);
  if (!idx) {
    idx = buildRowMergeIndex(merges);
    rowMergeIndexCache.set(merges, idx);
  }
  return idx;
}

function getMergeInfoFromRow(
  rowMerges: MergeCell[] | undefined,
  rowIndex: number,
  colIndex: number,
): MergeCell | null {
  if (!rowMerges || rowMerges.length === 0) return null;
  for (let i = 0; i < rowMerges.length; i++) {
    if (isInMergeCell(rowMerges[i], rowIndex, colIndex)) {
      return rowMerges[i];
    }
  }
  return null;
}

export function isInMergeCell(
  merge: MergeCell,
  rowIndex: number,
  colIndex: number,
): boolean {
  return (
    merge.rowIndex <= rowIndex &&
    merge.rowIndex + merge.rowspan - 1 >= rowIndex &&
    merge.colIndex <= colIndex &&
    merge.colIndex + merge.colspan - 1 >= colIndex
  );
}

export function getMergeInfo(
  merges: MergeCell[],
  rowIndex: number,
  colIndex: number,
): MergeCell | null {
  const rowIndexMap = getRowMergeIndex(merges);
  return getMergeInfoFromRow(rowIndexMap.get(rowIndex), rowIndex, colIndex);
}

/**
 * Generate placeholder merge cells for regions outside the visible viewport
 * (originRect) but inside the expanded render rect (renderRect).
 *
 * For each boundary direction (top / left / right / bottom), start with one
 * big placeholder covering the entire gap, then split it around each actual
 * boundary merge cell — this minimises the number of rendered tds for the
 * out-of-viewport area.
 *
 * Ported from vue-virt-grid-kolarorz/src/store/merges.ts calcRect()
 */
export function generateMergeCells(
  originRect: { ys: number; ye: number; xs: number; xe: number },
  renderRect: { ys: number; ye: number; xs: number; xe: number },
  boundaryMerges: {
    top: MergeCell[];
    left: MergeCell[];
    right: MergeCell[];
    bottom: MergeCell[];
  },
): MergeCell[] {
  const { ys: oys, ye: oye, xs: oxs, xe: oxe } = originRect;
  const { ys: rys, ye: rye, xs: rxs, xe: rxe } = renderRect;
  const result: MergeCell[] = [];

  // 顶部
  const placeCells2top: MergeCell[] = [];
  if (oys > rys) {
    const unionMerges = unionWith(boundaryMerges.top, isEqual);
    placeCells2top.push({
      rowIndex: rys,
      colIndex: rxs,
      rowspan: oys - rys,
      colspan: rxe - rxs + 1,
    });
    unionMerges.forEach((merge) => {
      const { rowIndex, colIndex, colspan } = merge;
      const last = placeCells2top.pop()!;
      const {
        rowIndex: rowIndexLast,
        colIndex: colIndexLast,
        rowspan: rowspanLast,
        colspan: colspanLast,
      } = last;
      if (colIndex > colIndexLast) {
        placeCells2top.push({
          rowIndex: rowIndexLast,
          colIndex: colIndexLast,
          rowspan: rowspanLast,
          colspan: colIndex - colIndexLast,
        });
      }
      if (rowIndex > rowIndexLast) {
        placeCells2top.push({
          rowIndex: rowIndexLast,
          colIndex: colIndex,
          rowspan: rowIndex - rowIndexLast,
          colspan: colspan,
        });
      }
      if (colIndex + colspan - 1 < colIndexLast + colspanLast - 1) {
        placeCells2top.push({
          rowIndex: rowIndexLast,
          colIndex: colIndex + colspan,
          rowspan: rowspanLast,
          colspan: colIndexLast + colspanLast - 1 - (colIndex + colspan - 1),
        });
      }
    });
  }

  // 左边
  const placeCells2Left: MergeCell[] = [];
  if (oxs > rxs) {
    const unionMerges = unionWith(boundaryMerges.left, isEqual);
    placeCells2Left.push({
      rowIndex: oys,
      colIndex: rxs,
      rowspan: oye - oys + 1,
      colspan: oxs - rxs,
    });

    unionMerges.forEach((merge) => {
      const { rowIndex, colIndex, rowspan } = merge;
      const last = placeCells2Left.pop()!;
      const {
        rowIndex: rowIndexLast,
        colIndex: colIndexLast,
        colspan: colspanLast,
        rowspan: rowspanLast,
      } = last;

      if (rowIndex > rowIndexLast) {
        placeCells2Left.push({
          rowIndex: rowIndexLast,
          colIndex: colIndexLast,
          rowspan: rowIndex - rowIndexLast,
          colspan: colspanLast,
        });
      }
      if (colIndex > colIndexLast) {
        const isTop = rowIndex < rowIndexLast;
        const isLast = rowIndex + rowspan - 1 > rowIndexLast + rowspanLast - 1;
        placeCells2Left.push({
          rowIndex: isTop ? rowIndexLast : rowIndex,
          colIndex: colIndexLast,
          rowspan: isTop
            ? rowIndexLast - rowIndex
            : isLast
              ? rowIndexLast + rowspanLast - rowIndex
              : rowspan,
          colspan: colIndex - colIndexLast,
        });
      }
      if (rowIndex + rowspan - 1 < rowIndexLast + rowspanLast - 1) {
        placeCells2Left.push({
          rowIndex: rowIndex + rowspan,
          colIndex: colIndexLast,
          rowspan: rowIndexLast + rowspanLast - 1 - (rowIndex + rowspan - 1),
          colspan: colspanLast,
        });
      }
    });
  }

  // 右边
  const placeCells2Right: MergeCell[] = [];
  if (oxe < rxe) {
    const unionMerges = unionWith(boundaryMerges.right, isEqual);
    placeCells2Right.push({
      rowIndex: oys,
      colIndex: oxe + 1,
      rowspan: oye - oys + 1,
      colspan: rxe - oxe,
    });
    unionMerges.forEach((merge) => {
      const { rowIndex, colIndex, rowspan, colspan } = merge;
      const last = placeCells2Right.pop()!;
      const {
        rowIndex: rowIndexLast,
        colIndex: colIndexLast,
        colspan: colspanLast,
        rowspan: rowspanLast,
      } = last;
      if (rowIndex > rowIndexLast) {
        placeCells2Right.push({
          rowIndex: rowIndexLast,
          colIndex: colIndexLast,
          rowspan: rowIndex - rowIndexLast,
          colspan: colspanLast,
        });
      }
      if (colIndex + colspan - 1 < colIndexLast + colspanLast - 1) {
        placeCells2Right.push({
          rowIndex: rowIndex,
          colIndex: colIndex + colspan,
          rowspan: rowspan,
          colspan: colIndexLast + colspanLast - 1 - (colIndex + colspan - 1),
        });
      }
      if (rowIndex + rowspan - 1 < rowIndexLast + rowspanLast - 1) {
        placeCells2Right.push({
          rowIndex: rowIndex + rowspan,
          colIndex: colIndexLast,
          rowspan: rowIndexLast + rowspanLast - 1 - (rowIndex + rowspan - 1),
          colspan: colspanLast,
        });
      }
    });
  }

  // 底边
  const placeCells2Bottom: MergeCell[] = [];
  if (oye < rye) {
    const unionMerges = unionWith(boundaryMerges.bottom, isEqual);
    placeCells2Bottom.push({
      rowIndex: oye + 1,
      colIndex: rxs,
      rowspan: rye - oye,
      colspan: rxe - rxs + 1,
    });
    unionMerges.forEach((merge) => {
      const { rowIndex, colIndex, rowspan, colspan } = merge;
      const last = placeCells2Bottom.pop()!;
      const {
        rowIndex: rowIndexLast,
        colIndex: colIndexLast,
        colspan: colspanLast,
        rowspan: rowspanLast,
      } = last;
      if (colIndex > colIndexLast) {
        placeCells2Bottom.push({
          rowIndex: rowIndexLast,
          colIndex: colIndexLast,
          rowspan: rowspanLast,
          colspan: colIndex - colIndexLast,
        });
      }
      if (rowIndex + rowspan - 1 < rowIndexLast) {
        placeCells2Bottom.push({
          rowIndex: rowIndexLast,
          colIndex: colIndex,
          rowspan: rowIndexLast + colspanLast - rowIndex - colspan,
          colspan: colspan,
        });
      }
      if (colIndex + colspan - 1 < colIndexLast + colspanLast - 1) {
        placeCells2Bottom.push({
          rowIndex: rowIndexLast,
          colIndex: colIndex + colspan,
          rowspan: rowspanLast,
          colspan: colIndexLast + colspanLast - colIndex - colspan,
        });
      }
    });
  }
  result.push(...placeCells2top, ...placeCells2Left, ...placeCells2Right, ...placeCells2Bottom);
  return result;
}

/**
 * Scan boundary cells of the visible origin rect and expand
 * the render rect to include any merge cells that cross the boundary.
 *
 * Ported from vue-virt-grid-kolarorz/src/utils/merge.ts
 */
export function calcRenderRect(
  merges: MergeCell[],
  originRect: { ys: number; ye: number; xs: number; xe: number },
): {
  ys: number;
  ye: number;
  xs: number;
  xe: number;
  placeholderMerges: MergeCell[];
} {
  const { ys: oys, ye: oye, xs: oxs, xe: oxe } = originRect;
  let rys = oys;
  let rye = oye;
  let rxs = oxs;
  let rxe = oxe;
  const rowIndexMap = getRowMergeIndex(merges);

  const topMerges: MergeCell[] = [];
  const leftMerges: MergeCell[] = [];
  const rightMerges: MergeCell[] = [];
  const bottomMerges: MergeCell[] = [];

  for (let y = oys; y <= oye; y++) {
    for (let x = oxs; x <= oxe; x++) {
      if (y === oys) {
        const info = getMergeInfoFromRow(rowIndexMap.get(y), y, x);
        if (info) {
          rys = Math.min(rys, info.rowIndex);
          rxs = Math.min(rxs, info.colIndex);
          rxe = Math.max(rxe, info.colIndex + info.colspan - 1);
          if (y > info.rowIndex) {
            topMerges.push(info);
          }
        }
      }

      if (x === oxs) {
        const info = getMergeInfoFromRow(rowIndexMap.get(y), y, x);
        if (info) {
          rxs = Math.min(rxs, info.colIndex);
          if (x > info.colIndex) {
            leftMerges.push(info);
          }
        }
      }

      if (x === oxe) {
        const info = getMergeInfoFromRow(rowIndexMap.get(y), y, x);
        if (info) {
          rxe = Math.max(rxe, info.colIndex + info.colspan - 1);
          rightMerges.push(info);
        }
      }

      if (y === oye) {
        const info = getMergeInfoFromRow(rowIndexMap.get(y), y, x);
        if (info) {
          rye = Math.max(rye, info.rowIndex + info.rowspan - 1);
          bottomMerges.push(info);
        }
      }
    }
  }

  const renderRect = { ys: rys, ye: rye, xs: rxs, xe: rxe };
  const placeholderMerges = generateMergeCells(originRect, renderRect, {
    top: topMerges,
    left: leftMerges,
    right: rightMerges,
    bottom: bottomMerges,
  });

  return { ...renderRect, placeholderMerges };
}

export function calcMergeRowCount(
  data: unknown[][] | undefined,
  merges: MergeCell[] | undefined,
  defaultCount: number,
): number {
  if (data && data.length > 0) return data.length;
  if (merges && merges.length > 0) {
    let max = 1;
    for (const m of merges) {
      const end = m.rowIndex + m.rowspan;
      if (end > max) max = end;
    }
    return max;
  }
  return defaultCount;
}

/**
 * Pure-logic mirror of VirtTable._buildCenterFragment.
 *
 * Given a row index, the visible column window [cb, ce], and body merges,
 * returns the ordered list of cells that should be rendered for the center
 * section of that row: left padding, data / merge-primary cells, right padding.
 *
 * `colSpanSum()` over the returned array always equals `totalCenterCols`.
 */
export interface RowCellPlan {
  /** 'pad' = invisible padding td, 'cell' = normal data td, 'merge' = merge primary td */
  type: 'pad' | 'cell' | 'merge';
  /** Center-column index of this cell (-1 for padding). */
  colIndex: number;
  colSpan: number;
  rowSpan: number;
}

export function planRowCells(
  merges: MergeCell[],
  rowIndex: number,
  renderColBegin: number,
  renderColEnd: number,
  totalCenterCols: number,
): RowCellPlan[] {
  const result: RowCellPlan[] = [];
  const cb = renderColBegin;
  const ce = renderColEnd;
  const hasMerges = merges.length > 0;

  // ---- left padding ----
  if (cb > 0) {
    result.push({
      type: 'pad',
      colIndex: -1,
      colSpan: cb,
      rowSpan: 1,
    });
  }

  // ---- visible center cells ----
  let c = cb;
  while (c <= ce) {
    if (hasMerges) {
      const info = getMergeInfo(merges, rowIndex, c);
      if (info) {
        const isPrimary = info.rowIndex === rowIndex && info.colIndex === c;
        if (!isPrimary) {
          c++;
          continue;
        }
        result.push({
          type: 'merge',
          colIndex: c,
          colSpan: info.colspan,
          rowSpan: info.rowspan,
        });
        c++;
        continue;
      }
    }
    result.push({ type: 'cell', colIndex: c, colSpan: 1, rowSpan: 1 });
    c++;
  }

  // ---- right padding ----
  const rightPadColspan = totalCenterCols - ce - 1;
  if (rightPadColspan > 0) {
    result.push({
      type: 'pad',
      colIndex: -1,
      colSpan: rightPadColspan,
      rowSpan: 1,
    });
  }

  return result;
}

export function buildMergeCoveredSet(merges: MergeCell[]): Set<string> {
  const covered = new Set<string>();
  for (const m of merges) {
    for (let r = m.rowIndex; r < m.rowIndex + m.rowspan; r++) {
      for (let c = m.colIndex; c < m.colIndex + m.colspan; c++) {
        if (r !== m.rowIndex || c !== m.colIndex) {
          covered.add(`${r},${c}`);
        }
      }
    }
  }
  return covered;
}
