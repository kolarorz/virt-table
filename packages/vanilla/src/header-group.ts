/**
 * 多级分组表头（column groups）的纯逻辑。
 *
 * 列配置由「一维列数组」升级为「列树」：带 `children` 的节点是**分组节点**，
 * 自身不承载数据，只在表头占一格；不带 `children` 的是**叶子列**，才是真正的数据列。
 *
 * 表头被建模成一个 `depth × leafCount` 的网格：
 * - 分组节点位于第 `row` 行，横跨其全部可见叶子后代（colSpan = 叶子数，rowSpan = 1）
 * - 叶子列位于第 `row` 行，向下贯通到最后一行（rowSpan = depth - row，colSpan = 1）
 *
 * 横向虚拟化靠 `planHeaderRow` 完成：窗口外的列被折叠成**贯通整个表头高度**的留白格
 * （只在首行发出、rowSpan = depth），窗口内保持原有网格结构、跨越窗口边界的分组格
 * 被裁剪到窗口内。这样每一行的列占位仍然严丝合缝地铺满整张表头（见 header-group.test.ts）。
 */

/** 本模块只关心列树结构，避免与 VirtTableColumn 互相依赖 */
export interface HeaderColumnLike {
  key: string;
  hidden?: boolean;
  fixed?: 'left' | 'right';
  children?: HeaderColumnLike[];
}

/** 表头网格中的一格 */
export interface HeaderMatrixCell<C> {
  col: C;
  /** 覆盖的第一个叶子列下标（区段内相对下标） */
  start: number;
  /** 覆盖的叶子列数量 */
  span: number;
  /** 所在表头行 */
  row: number;
  /** 纵向跨行数：分组恒为 1，叶子为 depth - row */
  rowSpan: number;
  isLeaf: boolean;
}

/** 是否为分组节点（有 children） */
export function isColumnGroup(col: HeaderColumnLike): boolean {
  return Array.isArray(col.children) && col.children.length > 0;
}

/** 列树里是否存在分组节点（决定是否走分组表头渲染） */
export function hasColumnGroup(cols: HeaderColumnLike[]): boolean {
  for (const col of cols) {
    if (isColumnGroup(col)) return true;
  }
  return false;
}

/**
 * 取分组节点的可见子列；`null` 表示该节点没有可渲染内容
 * （非分组节点，或所有子列都被隐藏）。
 */
export function visibleChildren<C extends HeaderColumnLike>(col: C): C[] | null {
  if (!isColumnGroup(col)) return null;
  const kids = (col.children as C[]).filter((k) => !k.hidden);
  return kids.length > 0 ? kids : null;
}

/** 列树深度（表头行数）；只统计可见列，空树按 1 计 */
export function columnTreeDepth(cols: HeaderColumnLike[]): number {
  let depth = 1;
  for (const col of cols) {
    if (col.hidden) continue;
    const kids = visibleChildren(col);
    if (kids) depth = Math.max(depth, 1 + columnTreeDepth(kids));
  }
  return depth;
}

/**
 * 摊平出叶子列（真正的数据列），保持声明顺序。
 * 默认跳过隐藏列；分组节点的可见子列全被隐藏时整组跳过。
 */
export function flattenLeafColumns<C extends HeaderColumnLike>(
  cols: C[],
  includeHidden = false,
): C[] {
  const out: C[] = [];
  const walk = (nodes: C[]) => {
    for (const node of nodes) {
      if (!includeHidden && node.hidden) continue;
      if (isColumnGroup(node)) {
        const kids = includeHidden
          ? (node.children as C[])
          : ((node.children as C[]).filter((k) => !k.hidden));
        if (kids.length === 0) continue;
        walk(kids);
      } else {
        out.push(node);
      }
    }
  };
  walk(cols);
  return out;
}

/**
 * 把分组节点的 `fixed` 强制下发给所有子列。
 *
 * 冻结区段（左/中/右）是按叶子列的 `fixed` 划分的，若分组与其子列的 `fixed` 不一致，
 * 分组格与它的叶子会落到不同区段导致表头错位——因此以分组为准，直接覆盖子列。
 */
export function propagateFixed(cols: HeaderColumnLike[]): void {
  const walk = (nodes: HeaderColumnLike[], inherited: 'left' | 'right' | undefined, apply: boolean) => {
    for (const node of nodes) {
      if (apply) node.fixed = inherited;
      if (isColumnGroup(node)) walk(node.children!, node.fixed, true);
    }
  };
  walk(cols, undefined, false);
}

/**
 * 构建表头网格：返回 `depth` 行，每行按从左到右顺序排列该行原生起始的格子。
 * `start` 是相对本区段（左固定 / 中间 / 右固定）叶子序号的下标。
 */
export function buildHeaderMatrix<C extends HeaderColumnLike>(
  cols: C[],
  depth: number,
): HeaderMatrixCell<C>[][] {
  const matrix: HeaderMatrixCell<C>[][] = Array.from({ length: Math.max(1, depth) }, () => []);
  let cursor = 0;

  const walk = (nodes: C[], row: number) => {
    for (const node of nodes) {
      if (node.hidden) continue;
      const kids = visibleChildren(node);
      if (kids) {
        const start = cursor;
        // 先递归子列以确定跨列宽度，再把分组格压入本行（同层顺序仍为从左到右）
        walk(kids, row + 1);
        matrix[row].push({
          col: node,
          start,
          span: cursor - start,
          row,
          rowSpan: 1,
          isLeaf: false,
        });
      } else if (isColumnGroup(node)) {
        // 分组存在但子列全被隐藏 → 整组不渲染
        continue;
      } else {
        matrix[row].push({
          col: node,
          start: cursor,
          span: 1,
          row,
          rowSpan: depth - row,
          isLeaf: true,
        });
        cursor += 1;
      }
    }
  };

  walk(cols, 0);
  return matrix;
}

/** 一行表头的渲染计划项：留白块或（可能被裁剪的）表头格 */
export type HeaderRowPlan<C> =
  | { type: 'pad'; colSpan: number; rowSpan: number }
  | { type: 'cell'; cell: HeaderMatrixCell<C>; colSpan: number; rowSpan: number };

/**
 * 计算第 `row` 行在列窗口 `[colBegin, colEnd]` 下要渲染的表头格。
 *
 * 窗口外的列合成**整块贯通**的留白格：只在首行发出且 rowSpan = depth，
 * 其余行直接跳过这些列（已被首行的 rowSpan 占据），于是每行的列占位都能对齐。
 */
export function planHeaderRow<C extends HeaderColumnLike>(
  matrix: HeaderMatrixCell<C>[][],
  row: number,
  colBegin: number,
  colEnd: number,
  totalCols: number,
  depth: number,
): HeaderRowPlan<C>[] {
  const plan: HeaderRowPlan<C>[] = [];
  if (totalCols <= 0) return plan;

  const cb = Math.max(0, colBegin);
  const ce = Math.min(totalCols - 1, colEnd);

  if (row === 0 && cb > 0) {
    plan.push({ type: 'pad', colSpan: cb, rowSpan: depth });
  }

  // cb > ce 即空窗口（列范围尚未计算出来时会出现），此时整行只有留白
  for (const cell of cb > ce ? [] : (matrix[row] ?? [])) {
    const start = cell.start;
    const end = cell.start + cell.span - 1;
    const from = Math.max(start, cb);
    const to = Math.min(end, ce);
    if (from > to) continue;
    plan.push({ type: 'cell', cell, colSpan: to - from + 1, rowSpan: cell.rowSpan });
  }

  if (row === 0 && ce < totalCols - 1) {
    plan.push({ type: 'pad', colSpan: totalCols - 1 - ce, rowSpan: depth });
  }

  return plan;
}
