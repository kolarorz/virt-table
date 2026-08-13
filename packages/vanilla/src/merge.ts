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

// ============================================================================
// 按值自动合并：相邻同键成段
//
// 为什么不直接把「相邻同值」展开成 MergeCell[] 塞进 options.merges：
//
//   1. `buildRowMergeIndex` 按**覆盖到的每一行**建 Map，成本跟 Σrowspan 成正比
//      而不是跟 merge 个数成正比。实测 100 万覆盖行 = 64.8ms + 巨额 heap，而且
//      WeakMap 是按数组身份缓存的，每次排序/筛选换数组就得全额重建。
//   2. `calcRenderRect` 会把渲染起点拉回合并块的起始行。相邻同值天然产出巨大
//      rowspan（3 个取值的状态列在 10 万行上就是 3 万行一段），实测 rowspan=50000
//      时滚到中间会 materialize 50000 个 <tr>，虚拟滚动直接失效。
//
// 所以这里只存**段起点索引**（Int32Array，100 万行约 781KB、建一次 3.3ms），
// 每帧再按渲染窗口裁剪出至多「窗口行数」个 MergeCell 交给现有管线 —— 裁剪后的
// 起点永远 ≥ 窗口起点，上面两个问题同时消失，下游 planRowCells / getMergeInfo /
// 固定列偏移一行都不用改。
// ============================================================================

/** 一个自动合并列的分段索引 */
export interface MergeRuns {
  /** 中间列（非固定列）索引，与 MergeCell.colIndex 同坐标系 */
  colIndex: number;
  /** 段起点，升序；第 k 段为 [starts[k], starts[k+1] - 1]，末段到 rowCount - 1 */
  starts: Int32Array;
  /** 建索引时的总行数 */
  rowCount: number;
}

export interface BuildMergeRunsOptions {
  colIndex: number;
  rowCount: number;
  /** 取比较键；返回 `undefined` 表示该行不参与合并（自成一段） */
  keyOf: (rowIndex: number) => unknown;
  /** 结构边界：true 表示 rowIndex 与 rowIndex-1 之间必须断开（分组行 / 树层级变化） */
  isBoundary?: (rowIndex: number) => boolean;
  /** 单段最大跨度，超出则强制断开（不传则不限） */
  maxSpan?: number;
}

/**
 * 一次 O(rowCount) 扫描建出分段索引。
 *
 * 键用 `!==` 比较（不做深比较）：键应当是原始值。需要按对象合并时请在 `keyOf`
 * 里自己拼成字符串 —— 深比较会让这趟扫描从 O(n) 变成 O(n × 字段数)。
 */
export function buildMergeRuns(options: BuildMergeRunsOptions): MergeRuns {
  const { colIndex, rowCount, keyOf, isBoundary, maxSpan } = options;
  const cap = maxSpan && maxSpan > 0 ? maxSpan : Infinity;
  // 最坏情况每行一段
  const starts = new Int32Array(rowCount);
  let n = 0;
  let prevKey: unknown;
  let runStart = 0;

  for (let i = 0; i < rowCount; i++) {
    const key = keyOf(i);
    const broken =
      i === 0 ||
      key === undefined ||
      prevKey === undefined ||
      key !== prevKey ||
      i - runStart >= cap ||
      (isBoundary !== undefined && isBoundary(i));
    if (broken) {
      starts[n++] = i;
      runStart = i;
    }
    prevKey = key;
  }

  return { colIndex, rowCount, starts: starts.subarray(0, n) };
}

/**
 * 二分定位 `rowIndex` 所属的段，返回闭区间 `[start, end]`。
 *
 * 单行段（没有邻居同键）也会返回，由调用方判断要不要产出 MergeCell —— 判断
 * 「这一格有没有被合并覆盖」的地方需要这个信息。
 */
export function findMergeRun(
  runs: MergeRuns,
  rowIndex: number,
): { start: number; end: number } | null {
  const { starts, rowCount } = runs;
  if (rowIndex < 0 || rowIndex >= rowCount || starts.length === 0) return null;
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= rowIndex) lo = mid;
    else hi = mid - 1;
  }
  const start = starts[lo];
  const end = lo + 1 < starts.length ? starts[lo + 1] - 1 : rowCount - 1;
  return { start, end };
}

/**
 * 把分段索引裁剪到渲染窗口 `[rowBegin, rowEnd]`，产出可直接喂给现有管线的
 * `MergeCell[]`。
 *
 * 裁剪意味着**重锚**：滚进一个长段的中间时，合并格的起点被抬到窗口起点，内容
 * 锚在可视区顶部而不是段的真实起点（AG Grid 的 Cell Span 同样如此）。换来的是
 * 渲染区间不被拉宽 —— 这正是让自动合并在虚拟滚动下成立的关键。
 *
 * 跨度裁剪后只剩 1 行的段不产出 MergeCell（无需合并）。
 */
export function clampMergeRunsToWindow(
  runsList: MergeRuns[],
  rowBegin: number,
  rowEnd: number,
): MergeCell[] {
  return collectRuns(runsList, rowBegin, rowEnd, true);
}

/**
 * 与 `clampMergeRunsToWindow` 相反：返回与 `[rowBegin, rowEnd]` **有交集的段的真实
 * 起止**，不做裁剪（跨度可能超出区间两端）。
 *
 * 给「需要知道真实合并块」的场景用 —— 选区要按合并块扩张成完整矩形，而选区可以
 * 超出渲染窗口，用裁剪结果会把选区截断。跨度 1 的段同样不产出。
 */
export function mergeRunsInRange(
  runsList: MergeRuns[],
  rowBegin: number,
  rowEnd: number,
): MergeCell[] {
  return collectRuns(runsList, rowBegin, rowEnd, false);
}

/** 沿 starts 走出与 [rowBegin, rowEnd] 有交集的段；clamp 决定裁不裁 */
function collectRuns(
  runsList: MergeRuns[],
  rowBegin: number,
  rowEnd: number,
  clamp: boolean,
): MergeCell[] {
  const out: MergeCell[] = [];
  if (rowEnd < rowBegin) return out;

  for (const runs of runsList) {
    const { starts, rowCount, colIndex } = runs;
    if (starts.length === 0) continue;
    const first = findMergeRun(runs, Math.max(0, Math.min(rowBegin, rowCount - 1)));
    if (!first) continue;

    // 从区间起点所属的那一段开始，沿 starts 前走到区间末尾
    let k = 0;
    {
      let lo = 0;
      let hi = starts.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (starts[mid] <= first.start) lo = mid;
        else hi = mid - 1;
      }
      k = lo;
    }

    for (; k < starts.length && starts[k] <= rowEnd; k++) {
      const runStart = starts[k];
      const runEnd = k + 1 < starts.length ? starts[k + 1] - 1 : rowCount - 1;
      const s = clamp && runStart < rowBegin ? rowBegin : runStart;
      const e = clamp && runEnd > rowEnd ? rowEnd : runEnd;
      if (e > s) {
        out.push({ rowIndex: s, colIndex, rowspan: e - s + 1, colspan: 1 });
      }
    }
  }
  return out;
}

// ============================================================================
// 从 el-table / vxe 的 spanMethod 迁移
// ============================================================================

/** `spanMethod` 的返回值，两种写法都吃（对齐 el-table / vxe） */
export type SpanResult =
  | [rowspan: number, colspan: number]
  | { rowspan: number; colspan: number }
  | null
  | undefined
  | void;

export interface SpanMethodContext<T, C> {
  row: T;
  column: C;
  rowIndex: number;
  /** **中间列**索引，与 `MergeCell.colIndex` 同坐标系 */
  columnIndex: number;
}

/**
 * 把 el-table / vxe 风格的逐格 `spanMethod` 求值成一份静态 `MergeCell[]`。
 *
 * ```ts
 * import { buildMergesFromSpan } from '@virt-table/vanilla';
 *
 * table.setMerges(buildMergesFromSpan(list, centerColumns, ({ rowIndex, columnIndex }) => {
 *   if (columnIndex === 0) return rowIndex % 2 === 0 ? [2, 1] : [0, 0];
 * }));
 * ```
 *
 * **为什么是一个要显式调用的函数，而不是 option。** 表格内建这个回调在虚拟滚动下
 * 两条路都不成立：全量求值是 O(行 × 列) 次回调（50 万行 × 10 列 = 500 万次，秒级）；
 * 只对窗口求值则拿不到窗口外的合并块起点，结果是错的。做成函数是为了把代价摊在
 * 调用点上——你能看见它遍历了多少行，也能自己决定什么时候重算。
 *
 * 用它之前先想想 `mergeKey`：「相邻同值 / 同键成段」这类需求（`spanMethod` 的绝大
 * 多数真实用法）用 `mergeKey` 表达是 O(1) 摊销的，而且不禁用排序。
 *
 * 三个约定：
 * - `centerColumns` **只传非固定列**，顺序即 `colIndex` 的顺序（固定列不参与合并）。
 * - 跨度 ≤ 1 或非正数的返回值一律跳过：`[1, 1]` 是普通格，`[0, 0]` 是「被别人覆盖」，
 *   两者都不需要产出 `MergeCell`（覆盖关系由 primary 格的跨度推导）。
 * - 产出的合并块**不能互相重叠**，且 `rowspan` 要自己控制在合理范围内 —— 巨大的
 *   rowspan 会把渲染区间拉回合并块起始行（实测 `rowspan=50000` 时会 materialize
 *   5 万个 `<tr>`）。这两点与直接写 `options.merges` 的约束完全一致。
 */
export function buildMergesFromSpan<T, C>(
  list: readonly T[],
  centerColumns: readonly C[],
  spanMethod: (ctx: SpanMethodContext<T, C>) => SpanResult,
): MergeCell[] {
  const out: MergeCell[] = [];
  for (let rowIndex = 0; rowIndex < list.length; rowIndex++) {
    const row = list[rowIndex];
    for (let columnIndex = 0; columnIndex < centerColumns.length; columnIndex++) {
      const res = spanMethod({
        row,
        column: centerColumns[columnIndex],
        rowIndex,
        columnIndex,
      });
      if (!res) continue;
      const rowspan = Array.isArray(res) ? res[0] : res.rowspan;
      const colspan = Array.isArray(res) ? res[1] : res.colspan;
      if (!(rowspan > 0) || !(colspan > 0)) continue; // [0,0]：被覆盖的格
      if (rowspan === 1 && colspan === 1) continue; // 普通格
      out.push({ rowIndex, colIndex: columnIndex, rowspan, colspan });
    }
  }
  return out;
}
