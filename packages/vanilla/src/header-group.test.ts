import { describe, it, expect } from 'vitest';
import {
  buildHeaderMatrix,
  columnTreeDepth,
  flattenLeafColumns,
  hasColumnGroup,
  isColumnGroup,
  planHeaderRow,
  propagateFixed,
  visibleChildren,
  type HeaderColumnLike,
  type HeaderMatrixCell,
} from './header-group';

interface Col extends HeaderColumnLike {
  key: string;
  hidden?: boolean;
  fixed?: 'left' | 'right';
  children?: Col[];
}

const leaf = (key: string, extra: Partial<Col> = {}): Col => ({ key, ...extra });
const group = (key: string, children: Col[], extra: Partial<Col> = {}): Col => ({
  key,
  children,
  ...extra,
});

/**
 * 按 HTML 表格布局规则回放渲染计划：逐行从左往右找第一个未被占用的列落座，
 * 落座后把 rowSpan × colSpan 的矩形标记为已占用。
 *
 * 返回 depth × totalCols 的覆盖次数矩阵——只有每格恰好为 1 才说明表头没有错行/错列。
 */
function layout<C extends HeaderColumnLike>(
  matrix: HeaderMatrixCell<C>[][],
  depth: number,
  totalCols: number,
  colBegin: number,
  colEnd: number,
): number[][] {
  const grid: number[][] = Array.from({ length: depth }, () => new Array<number>(totalCols).fill(0));
  const taken: boolean[][] = Array.from({ length: depth }, () => new Array<boolean>(totalCols).fill(false));

  for (let row = 0; row < depth; row++) {
    const plan = planHeaderRow(matrix, row, colBegin, colEnd, totalCols, depth);
    let cursor = 0;
    for (const item of plan) {
      while (cursor < totalCols && taken[row][cursor]) cursor++;
      expect(cursor + item.colSpan).toBeLessThanOrEqual(totalCols);
      for (let r = row; r < Math.min(depth, row + item.rowSpan); r++) {
        for (let c = cursor; c < cursor + item.colSpan; c++) {
          grid[r][c] += 1;
          taken[r][c] = true;
        }
      }
      cursor += item.colSpan;
    }
    // 该行右侧不应残留空洞
    while (cursor < totalCols && taken[row][cursor]) cursor++;
    expect(cursor).toBe(totalCols);
  }

  return grid;
}

function expectFullyTiled(grid: number[][]): void {
  for (const row of grid) {
    for (const cover of row) {
      expect(cover).toBe(1);
    }
  }
}

describe('isColumnGroup / hasColumnGroup / visibleChildren', () => {
  it('识别分组节点', () => {
    expect(isColumnGroup(leaf('a'))).toBe(false);
    expect(isColumnGroup(group('g', [leaf('a')]))).toBe(true);
    // children 为空数组不算分组
    expect(isColumnGroup({ key: 'g', children: [] })).toBe(false);
  });

  it('hasColumnGroup 只看顶层是否出现分组', () => {
    expect(hasColumnGroup([leaf('a'), leaf('b')])).toBe(false);
    expect(hasColumnGroup([leaf('a'), group('g', [leaf('b')])])).toBe(true);
  });

  it('子列全隐藏时 visibleChildren 返回 null', () => {
    expect(visibleChildren(group('g', [leaf('a', { hidden: true })]))).toBeNull();
    expect(visibleChildren(group('g', [leaf('a', { hidden: true }), leaf('b')]))).toHaveLength(1);
  });
});

describe('columnTreeDepth', () => {
  it('扁平列深度为 1', () => {
    expect(columnTreeDepth([leaf('a'), leaf('b')])).toBe(1);
  });

  it('取最深分支', () => {
    const cols = [
      leaf('a'),
      group('g1', [leaf('b'), leaf('c')]),
      group('g2', [group('g21', [leaf('d')]), leaf('e')]),
    ];
    expect(columnTreeDepth(cols)).toBe(3);
  });

  it('隐藏列不参与深度计算', () => {
    const cols = [leaf('a'), group('g', [group('gg', [leaf('b')])], { hidden: true })];
    expect(columnTreeDepth(cols)).toBe(1);
  });

  it('分组子列全隐藏时该分支不加深深度', () => {
    const cols = [leaf('a'), group('g', [leaf('b', { hidden: true })])];
    expect(columnTreeDepth(cols)).toBe(1);
  });

  it('空列表按 1 行处理', () => {
    expect(columnTreeDepth([])).toBe(1);
  });
});

describe('flattenLeafColumns', () => {
  it('按声明顺序摊平叶子列', () => {
    const cols = [
      leaf('a'),
      group('g1', [leaf('b'), group('g11', [leaf('c'), leaf('d')])]),
      leaf('e'),
    ];
    expect(flattenLeafColumns(cols).map((c) => c.key)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('默认跳过隐藏列，includeHidden 时保留', () => {
    const cols = [leaf('a'), group('g', [leaf('b', { hidden: true }), leaf('c')])];
    expect(flattenLeafColumns(cols).map((c) => c.key)).toEqual(['a', 'c']);
    expect(flattenLeafColumns(cols, true).map((c) => c.key)).toEqual(['a', 'b', 'c']);
  });

  it('隐藏整个分组等于隐藏其全部叶子', () => {
    const cols = [leaf('a'), group('g', [leaf('b'), leaf('c')], { hidden: true })];
    expect(flattenLeafColumns(cols).map((c) => c.key)).toEqual(['a']);
  });

  it('分组子列全隐藏时整组消失', () => {
    const cols = [leaf('a'), group('g', [leaf('b', { hidden: true })])];
    expect(flattenLeafColumns(cols).map((c) => c.key)).toEqual(['a']);
  });
});

describe('propagateFixed', () => {
  it('分组的 fixed 覆盖到所有后代', () => {
    const cols = [
      group('g', [leaf('a'), group('gg', [leaf('b')])], { fixed: 'left' as const }),
      leaf('c'),
    ];
    propagateFixed(cols);
    expect(cols[0].children![0].fixed).toBe('left');
    expect(cols[0].children![1].fixed).toBe('left');
    expect(cols[0].children![1].children![0].fixed).toBe('left');
    expect(cols[1].fixed).toBeUndefined();
  });

  it('不带 fixed 的分组会清掉子列自带的 fixed（避免跨区段错位）', () => {
    const cols = [group('g', [leaf('a', { fixed: 'left' as const }), leaf('b')])];
    propagateFixed(cols);
    expect(cols[0].children![0].fixed).toBeUndefined();
  });

  it('顶层叶子列的 fixed 保持不变', () => {
    const cols = [leaf('a', { fixed: 'left' as const }), leaf('b', { fixed: 'right' as const })];
    propagateFixed(cols);
    expect(cols[0].fixed).toBe('left');
    expect(cols[1].fixed).toBe('right');
  });
});

describe('buildHeaderMatrix', () => {
  it('扁平列：单行、每格 rowSpan 1', () => {
    const cols = [leaf('a'), leaf('b')];
    const matrix = buildHeaderMatrix(cols, 1);
    expect(matrix).toHaveLength(1);
    expect(matrix[0].map((c) => [c.col.key, c.start, c.span, c.rowSpan])).toEqual([
      ['a', 0, 1, 1],
      ['b', 1, 1, 1],
    ]);
  });

  it('分组跨越其全部叶子，叶子向下贯通到末行', () => {
    const cols = [leaf('a'), group('g', [leaf('b'), leaf('c')])];
    const matrix = buildHeaderMatrix(cols, 2);
    expect(matrix[0].map((c) => [c.col.key, c.start, c.span, c.rowSpan, c.isLeaf])).toEqual([
      ['a', 0, 1, 2, true],
      ['g', 1, 2, 1, false],
    ]);
    expect(matrix[1].map((c) => [c.col.key, c.start, c.span, c.rowSpan])).toEqual([
      ['b', 1, 1, 1],
      ['c', 2, 1, 1],
    ]);
  });

  it('同层格子按从左到右排列（分组在叶子之前也成立）', () => {
    const cols = [group('g1', [leaf('a'), leaf('b')]), leaf('c'), group('g2', [leaf('d')])];
    const matrix = buildHeaderMatrix(cols, 2);
    expect(matrix[0].map((c) => c.col.key)).toEqual(['g1', 'c', 'g2']);
    expect(matrix[1].map((c) => c.col.key)).toEqual(['a', 'b', 'd']);
  });

  it('三层嵌套：中间层叶子 rowSpan 补齐到底', () => {
    const cols = [
      leaf('a'),
      group('g', [leaf('x'), group('sg', [leaf('m'), leaf('n')])]),
    ];
    const matrix = buildHeaderMatrix(cols, 3);
    const find = (row: number, key: string) => matrix[row].find((c) => c.col.key === key)!;
    expect(find(0, 'a').rowSpan).toBe(3);
    expect(find(0, 'g').span).toBe(3);
    expect(find(1, 'x').rowSpan).toBe(2);
    expect(find(1, 'sg').span).toBe(2);
    expect(find(2, 'm').rowSpan).toBe(1);
  });

  it('跳过隐藏叶子与全隐藏分组', () => {
    const cols = [
      group('g1', [leaf('a', { hidden: true }), leaf('b')]),
      group('g2', [leaf('c', { hidden: true })]),
      leaf('d'),
    ];
    const matrix = buildHeaderMatrix(cols, 2);
    expect(matrix[0].map((c) => c.col.key)).toEqual(['g1', 'd']);
    expect(matrix[0].find((c) => c.col.key === 'g1')!.span).toBe(1);
    expect(matrix[1].map((c) => c.col.key)).toEqual(['b']);
  });
});

describe('planHeaderRow —— 横向虚拟化后表头仍严丝合缝', () => {
  const cols = [
    group('g1', [leaf('c0'), leaf('c1'), leaf('c2')]),
    group('g2', [leaf('c3'), leaf('c4'), leaf('c5')]),
    leaf('c6'),
    group('g3', [
      leaf('c7'),
      group('g31', [leaf('c8'), leaf('c9')]),
    ]),
  ];
  const depth = columnTreeDepth(cols); // 3
  const total = flattenLeafColumns(cols).length; // 10
  const matrix = buildHeaderMatrix(cols, depth);

  it('测试用例前提：3 层 / 10 个叶子列', () => {
    expect(depth).toBe(3);
    expect(total).toBe(10);
  });

  it('全窗口时铺满整张表头', () => {
    expectFullyTiled(layout(matrix, depth, total, 0, total - 1));
  });

  it('任意窗口都铺满整张表头', () => {
    for (let cb = 0; cb < total; cb++) {
      for (let ce = cb; ce < total; ce++) {
        expectFullyTiled(layout(matrix, depth, total, cb, ce));
      }
    }
  });

  it('空窗口（ce < cb）只剩两块留白且仍然铺满', () => {
    const plan = planHeaderRow(matrix, 0, 4, 3, total, depth);
    expect(plan.every((p) => p.type === 'pad')).toBe(true);
    expect(plan.reduce((s, p) => s + p.colSpan, 0)).toBe(total);
    expectFullyTiled(layout(matrix, depth, total, 4, 3));
  });

  it('跨越窗口边界的分组格被裁剪到窗口内', () => {
    // 窗口 [1,4]：g1(0..2) 裁成 1..2，g2(3..5) 裁成 3..4
    const plan = planHeaderRow(matrix, 0, 1, 4, total, depth);
    const cells = plan.filter((p) => p.type === 'cell') as Array<
      Extract<HeaderRowPlanItem, { type: 'cell' }>
    >;
    expect(cells.map((c) => [c.cell.col.key, c.colSpan])).toEqual([
      ['g1', 2],
      ['g2', 2],
    ]);
    const pads = plan.filter((p) => p.type === 'pad');
    expect(pads.map((p) => [p.colSpan, p.rowSpan])).toEqual([
      [1, depth],
      [5, depth],
    ]);
  });

  it('窗口外的格子完全不渲染', () => {
    const plan = planHeaderRow(matrix, 1, 7, 9, total, depth);
    const keys = plan
      .filter((p): p is Extract<HeaderRowPlanItem, { type: 'cell' }> => p.type === 'cell')
      .map((p) => p.cell.col.key);
    // 第 1 行只有 g1/g2 的叶子与 g3 的子节点；窗口 [7,9] 内只剩 c7 与 g31
    expect(keys).toEqual(['c7', 'g31']);
  });

  it('窗口越界参数被夹到合法范围', () => {
    const plan = planHeaderRow(matrix, 0, -5, 999, total, depth);
    expect(plan.every((p) => p.type === 'cell')).toBe(true);
    expect(plan.reduce((s, p) => s + p.colSpan, 0)).toBe(total);
  });

  it('没有列时返回空计划', () => {
    expect(planHeaderRow(matrix, 0, 0, 0, 0, depth)).toEqual([]);
  });
});

describe('planHeaderRow —— 扁平列（depth 1）退化为普通虚拟化', () => {
  const cols = Array.from({ length: 8 }, (_, i) => leaf(`c${i}`));
  const matrix = buildHeaderMatrix(cols, 1);

  it('任意窗口都铺满', () => {
    for (let cb = 0; cb < 8; cb++) {
      for (let ce = cb; ce < 8; ce++) {
        expectFullyTiled(layout(matrix, 1, 8, cb, ce));
      }
    }
  });

  it('窗口内只渲染可见列', () => {
    const plan = planHeaderRow(matrix, 0, 3, 5, 8, 1);
    const keys = plan
      .filter((p): p is Extract<HeaderRowPlanItem, { type: 'cell' }> => p.type === 'cell')
      .map((p) => p.cell.col.key);
    expect(keys).toEqual(['c3', 'c4', 'c5']);
  });
});

describe('planHeaderRow —— 中间层叶子被窗口排除时下层仍对齐', () => {
  // g 的第一个子节点是叶子（rowSpan 跨到底），窗口把它排除掉时，
  // 首行留白必须替它撑满整个表头高度，否则第 2、3 行会左移错位
  const cols = [
    leaf('a'),
    group('g', [leaf('x'), group('sg', [leaf('m'), leaf('n'), leaf('o')])]),
  ];
  const depth = columnTreeDepth(cols);
  const total = flattenLeafColumns(cols).length;
  const matrix = buildHeaderMatrix(cols, depth);

  it('所有窗口组合都铺满', () => {
    for (let cb = 0; cb < total; cb++) {
      for (let ce = cb; ce < total; ce++) {
        expectFullyTiled(layout(matrix, depth, total, cb, ce));
      }
    }
  });
});

// 便于在断言里收窄计划项类型
type HeaderRowPlanItem =
  | { type: 'pad'; colSpan: number; rowSpan: number }
  | { type: 'cell'; cell: HeaderMatrixCell<Col>; colSpan: number; rowSpan: number };
