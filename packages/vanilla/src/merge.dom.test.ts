// @vitest-environment happy-dom
/**
 * 按值自动合并（列 `mergeKey`）的 DOM 层测试。
 *
 * 两个环境上的取舍：
 *
 * 1. **`renderControl` 钉住渲染窗口**，而不是去 stub `clientHeight` / `getBoundingClientRect`。
 *    happy-dom 里所有几何都是 0，虚拟滚动会算出只有 2 行的区间。用 `renderControl`
 *    既能精确控制窗口，又走的是真实代码路径（`renderControl` → `_mergeRenderControl`
 *    → 窗口裁剪 → `planRowCells` → DOM），不需要碰任何原型。
 * 2. **`fixedSize: true`**（固定行高）跳过 ResizeObserver 测量 —— happy-dom 没有
 *    ResizeObserver，核心里对它是可选依赖（`typeof ResizeObserver === 'undefined'` 早返回）。
 *
 * 断言读 `td.dataset.colKey` 定位列，不依赖 td 的出现顺序。
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { VirtTable, type VirtTableColumn, type VirtTableOptions } from './index';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

type Row = Record<string, any>;

function mount(
  options: Omit<VirtTableOptions<Row>, 'itemKey' | 'estimatedSize'> &
    Partial<Pick<VirtTableOptions<Row>, 'itemKey' | 'estimatedSize'>>,
  window?: { begin: number; end: number },
) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  const table = new VirtTable<Row>(box, {
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 0,
    fixedSize: true,
    ...(window ? { renderControl: () => ({ ...window }) } : {}),
    ...options,
  } as VirtTableOptions<Row>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  return { box, table };
}

/** 某一列在各渲染行里的 [文本, rowspan]；被合并覆盖的行没有该列的 td，记 null */
function column(box: HTMLElement, colKey: string): Array<[string, number] | null> {
  return [...box.querySelectorAll('.vt-tbody .vt-tr')].map((tr) => {
    const td = tr.querySelector<HTMLTableCellElement>(`.vt-td[data-col-key="${colKey}"]`);
    return td ? [td.textContent?.trim() ?? '', td.rowSpan] : null;
  });
}

/** 只取实际渲染出来的合并块（跨度 > 1） */
function spans(box: HTMLElement, colKey: string): number[] {
  return column(box, colKey)
    .filter((c): c is [string, number] => !!c && c[1] > 1)
    .map((c) => c[1]);
}

const rows = (n: number, fn: (i: number) => Row): Row[] =>
  Array.from({ length: n }, (_, i) => ({ id: i, ...fn(i) }));

describe('mergeKey：DOM 产出', () => {
  it('相邻同值成段，段首带 rowspan，被覆盖的行不渲染该列的 td', () => {
    const { box } = mount(
      {
        list: rows(9, (i) => ({ g: 'G' + ((i / 3) | 0), v: 'v' + i })),
        columns: [
          { key: 'g', title: 'G', width: 100, mergeKey: true },
          { key: 'v', title: 'V', width: 100 },
        ],
      },
      { begin: 0, end: 8 },
    );
    expect(column(box, 'g')).toEqual([
      ['G0', 3], null, null,
      ['G1', 3], null, null,
      ['G2', 3], null, null,
    ]);
    // 非合并列每行都在
    expect(column(box, 'v').every((c) => c && c[1] === 1)).toBe(true);
  });

  it('单行段不产出合并块', () => {
    const { box } = mount(
      {
        list: rows(3, (i) => ({ g: 'G' + i })),
        columns: [{ key: 'g', title: 'G', width: 100, mergeKey: true }],
      },
      { begin: 0, end: 2 },
    );
    expect(column(box, 'g')).toEqual([['G0', 1], ['G1', 1], ['G2', 1]]);
  });

  it('函数形式的 mergeKey：拼键', () => {
    const { box } = mount(
      {
        list: rows(4, (i) => ({ a: 'A', b: i < 2 ? 'x' : 'y' })),
        columns: [{ key: 'a', title: 'A', width: 100, mergeKey: (r: Row) => `${r.a}/${r.b}` }],
      },
      { begin: 0, end: 3 },
    );
    // a 全同，但 b 变了 → 断成两段
    expect(spans(box, 'a')).toEqual([2, 2]);
  });

  it('mergeKey 返回 undefined 的行不参与合并', () => {
    const { box } = mount(
      {
        list: rows(5, (i) => ({ g: 'G', skip: i === 2 })),
        columns: [
          { key: 'g', title: 'G', width: 100, mergeKey: (r: Row) => (r.skip ? undefined : r.g) },
        ],
      },
      { begin: 0, end: 4 },
    );
    // 0-1 一段、2 自成一段、3-4 一段
    expect(column(box, 'g').map((c) => c && c[1])).toEqual([2, null, 1, 2, null]);
  });

  it('mergeMaxSpan 把长段切碎', () => {
    const { box } = mount(
      {
        list: rows(9, () => ({ g: 'G' })),
        columns: [{ key: 'g', title: 'G', width: 100, mergeKey: true, mergeMaxSpan: 3 }],
      },
      { begin: 0, end: 8 },
    );
    expect(spans(box, 'g')).toEqual([3, 3, 3]);
  });
});

describe('mergeKey：长段不打穿虚拟滚动', () => {
  it('整列一个 1 万行的段，窗口内只渲染窗口那么多行，合并块被裁到窗口', () => {
    const { box } = mount(
      {
        list: rows(10_000, () => ({ g: 'SAME' })),
        columns: [{ key: 'g', title: 'G', width: 100, mergeKey: true }],
      },
      { begin: 100, end: 139 },
    );
    const trs = box.querySelectorAll('.vt-tbody .vt-tr');
    // 关键：没有 materialize 段首（第 0 行）到窗口之间的上万行
    expect(trs.length).toBe(40);
    const cells = column(box, 'g');
    expect(cells[0]).toEqual(['SAME', 40]); // 起点被抬到窗口首行，跨度 = 窗口大小
    expect(cells.slice(1).every((c) => c === null)).toBe(true);
  });

  it('窗口滚动后合并块重新锚定到新的窗口首行', () => {
    let win = { begin: 0, end: 19 };
    const { box, table } = mount({
      list: rows(1000, () => ({ g: 'SAME' })),
      columns: [{ key: 'g', title: 'G', width: 100, mergeKey: true }],
      renderControl: () => ({ ...win }),
    });
    expect(column(box, 'g')[0]).toEqual(['SAME', 20]);
    win = { begin: 500, end: 519 };
    table.forceUpdate();
    expect(column(box, 'g')[0]).toEqual(['SAME', 20]);
  });
});

describe('mergeKey 与排序 / 结构 / 固定列的联动', () => {
  it('不禁用排序，且排序后重新分段', () => {
    const { box, table } = mount(
      {
        list: [
          { id: 1, g: 'B' }, { id: 2, g: 'A' }, { id: 3, g: 'B' }, { id: 4, g: 'A' },
        ],
        columns: [{ key: 'g', title: 'G', width: 100, mergeKey: true, sortable: true }],
      },
      { begin: 0, end: 3 },
    );
    // 排序图标渲染出来 = 排序没被禁用
    expect(box.querySelector('.vt-sort-icon')).not.toBeNull();
    expect(spans(box, 'g')).toEqual([]); // B A B A：无相邻同值
    table.sort('g', 'asc');
    expect(spans(box, 'g')).toEqual([2, 2]); // A A B B
  });

  it('静态 merges 仍然禁用排序（回归）', () => {
    const { box } = mount(
      {
        list: rows(4, () => ({ g: 'G' })),
        columns: [{ key: 'g', title: 'G', width: 100, sortable: true }],
        merges: [{ rowIndex: 0, colIndex: 0, rowspan: 2, colspan: 1 }],
      },
      { begin: 0, end: 3 },
    );
    expect(box.querySelector('.vt-sort-icon')).toBeNull();
  });

  it('静态 merges 与自动合并可以共存', () => {
    const { box } = mount(
      {
        list: rows(6, () => ({ g: 'G', v: 'V' })),
        columns: [
          { key: 'g', title: 'G', width: 100, mergeKey: true },
          { key: 'v', title: 'V', width: 100 },
        ],
        merges: [{ rowIndex: 0, colIndex: 1, rowspan: 3, colspan: 1 }],
      },
      { begin: 0, end: 5 },
    );
    expect(spans(box, 'g')).toEqual([6]); // 自动
    expect(spans(box, 'v')).toEqual([3]); // 静态
  });

  it('树形层级变化处断段，父子行不被并成一格', () => {
    const { box } = mount(
      {
        list: [
          { id: 1, g: 'X', children: [{ id: 11, g: 'X' }, { id: 12, g: 'X' }] },
          { id: 2, g: 'X' },
        ],
        columns: [
          { key: 'g', title: 'G', width: 140, type: 'tree', mergeKey: true },
          { key: 'id', title: 'ID', width: 80 },
        ],
        defaultExpandAll: true,
      },
      { begin: 0, end: 3 },
    );
    // 父(1) / 子(11,12) / 父(2)：只有两个同级子节点能合
    expect(column(box, 'g').map((c) => c && c[1])).toEqual([1, 2, null, 1]);
  });

  it('分组行自成一段，不与数据行合并', () => {
    const { box } = mount(
      {
        list: rows(4, (i) => ({ g: 'G', dept: i < 2 ? 'D1' : 'D2' })),
        columns: [{ key: 'g', title: 'G', width: 120, mergeKey: true }],
        groupConfig: [{ field: 'dept' }],
        // 不展开的话显示列表里只有分组行，测不到数据行成段
        defaultExpandAll: true,
      },
      { begin: 0, end: 5 },
    );
    // 分组行 + 数据行交替，数据行两两成段，分组行不参与
    expect(spans(box, 'g')).toEqual([2, 2]);
  });

  it('固定列上配 mergeKey 会告警并忽略', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { box } = mount(
      {
        list: rows(4, () => ({ g: 'G', v: 'V' })),
        columns: [
          { key: 'g', title: 'G', width: 100, fixed: 'left', mergeKey: true },
          { key: 'v', title: 'V', width: 100 },
        ],
      },
      { begin: 0, end: 3 },
    );
    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls.flat().join(' ')).toContain('固定列');
    expect(spans(box, 'g')).toEqual([]); // 没有生效
    warn.mockRestore();
  });

  it('自动合并下禁止行拖拽', () => {
    const { table } = mount(
      {
        list: rows(4, () => ({ g: 'G' })),
        columns: [{ key: 'g', title: 'G', width: 100, mergeKey: true }],
      },
      { begin: 0, end: 3 },
    );
    expect(table.canReorderRows()).toBe(false);
  });
});

describe('对外接口', () => {
  const setup = () =>
    mount(
      {
        list: rows(100, (i) => ({ g: 'G' + ((i / 10) | 0), v: 'V' })),
        columns: [
          { key: 'g', title: 'G', width: 100, mergeKey: true },
          { key: 'v', title: 'V', width: 100 },
        ],
        merges: [{ rowIndex: 0, colIndex: 1, rowspan: 2, colspan: 1 }],
      },
      { begin: 0, end: 19 },
    );

  it('getMerges 只给静态配置', () => {
    const { table } = setup();
    expect(table.getMerges()).toEqual([
      { rowIndex: 0, colIndex: 1, rowspan: 2, colspan: 1 },
    ]);
  });

  it('getMerges 返回副本，改它不影响表格', () => {
    const { table } = setup();
    table.getMerges().push({ rowIndex: 50, colIndex: 0, rowspan: 2, colspan: 1 });
    expect(table.getMerges()).toHaveLength(1);
  });

  it('getEffectiveMerges 给静态 + 自动合并的真实段（不受渲染窗口裁剪）', () => {
    const { table } = setup();
    const eff = table.getEffectiveMerges(0, 5);
    expect(eff).toContainEqual({ rowIndex: 0, colIndex: 1, rowspan: 2, colspan: 1 });
    // 窗口只到 5，但自动合并给的是真实段 0-9
    expect(eff).toContainEqual({ rowIndex: 0, colIndex: 0, rowspan: 10, colspan: 1 });
    // 不传区间 → 覆盖整表：10 个自动段 + 1 个静态
    expect(table.getEffectiveMerges()).toHaveLength(11);
  });

  it('选区按合并块扩张，且查的是真实段（可远超渲染窗口）', () => {
    const { table } = setup();
    // 第 45 行落在自动段 40-49 里，而渲染窗口只有 0-19
    expect(table.expandSelectionForMerges({
      startRow: 45, startCol: 0, endRow: 45, endCol: 0,
    })).toEqual({ startRow: 40, startCol: 0, endRow: 49, endCol: 0 });
  });

  it('选区跨越多个段时扩张到并集', () => {
    const { table } = setup();
    expect(table.expandSelectionForMerges({
      startRow: 15, startCol: 0, endRow: 25, endCol: 0,
    })).toEqual({ startRow: 10, startCol: 0, endRow: 29, endCol: 0 });
  });

  it('不含 mergeKey 的列不扩张', () => {
    const { table } = setup();
    expect(table.expandSelectionForMerges({
      startRow: 45, startCol: 1, endRow: 45, endCol: 1,
    })).toEqual({ startRow: 45, startCol: 1, endRow: 45, endCol: 1 });
  });
});

describe('长段的 sticky 标签（消除滚动抖动）', () => {
  /**
   * 抖动的成因：合并块按**整行**取整裁剪、滚动却是逐像素的，格内垂直居中的文字会一边
   * 随内容匀速上移、一边在窗口前进一行时回跳一整行高（CDP 实测锯齿 32px / 每 5 帧一次）。
   * 修法与横向的分组标签同一套：套一层 sticky 内层钉在可见数据区上缘。
   *
   * 这里只能断言**结构决策**（谁套内层、vAlign 是否被压平）——真实位移要靠 CDP 量，
   * happy-dom 没有布局引擎。见 AGENTS.md §7.4。
   */
  const cellOf = (box: HTMLElement, colKey: string, rowIdx = 0) =>
    [...box.querySelectorAll('.vt-tbody .vt-tr')][rowIdx]
      ?.querySelector<HTMLTableCellElement>(`.vt-td[data-col-key="${colKey}"]`) ?? null;

  it('段首被窗口裁掉时套 sticky 内层，并把内联 vAlign 压成 top', () => {
    // 窗口从第 100 行开始，段是整列 → 裁剪后 primary 落在 100 = 窗口起点
    const { box } = mount(
      {
        list: rows(1000, () => ({ g: 'SAME' })),
        columns: [{ key: 'g', title: 'G', width: 100, mergeKey: true, vAlign: 'middle' }],
      },
      { begin: 100, end: 119 },
    );
    const td = cellOf(box, 'g')!;
    expect(td.rowSpan).toBe(20);
    expect(td.classList.contains('vt-td--merge-sticky')).toBe(true);
    expect(td.querySelector('.vt-merge-label')).not.toBeNull();
    // 不压平的话标签自然位置永远停在视口中部、够不到 sticky 阈值，sticky 不会触发
    expect(td.style.verticalAlign).toBe('top');
  });

  it('段首在窗口内（没被裁）时不套内层，保留格内居中', () => {
    const { box } = mount(
      {
        list: rows(30, (i) => ({ g: 'G' + ((i / 3) | 0) })),
        columns: [{ key: 'g', title: 'G', width: 100, mergeKey: true, vAlign: 'middle' }],
      },
      { begin: 0, end: 29 },
    );
    // 第 2 段（行 3-5）段首在窗口内
    const td = cellOf(box, 'g', 3)!;
    expect(td.rowSpan).toBe(3);
    expect(td.classList.contains('vt-td--merge-sticky')).toBe(false);
    expect(td.querySelector('.vt-merge-label')).toBeNull();
    expect(td.style.verticalAlign).toBe('middle');
  });

  it('静态 merges 不套内层（它不做窗口裁剪，位置本来就稳）', () => {
    const { box } = mount(
      {
        list: rows(30, (i) => ({ g: 'v' + i })),
        columns: [{ key: 'g', title: 'G', width: 100, vAlign: 'middle' }],
        merges: [{ rowIndex: 0, colIndex: 0, rowspan: 5, colspan: 1 }],
      },
      { begin: 0, end: 29 },
    );
    const td = cellOf(box, 'g')!;
    expect(td.rowSpan).toBe(5);
    expect(td.classList.contains('vt-td--merge-sticky')).toBe(false);
    expect(td.querySelector('.vt-merge-label')).toBeNull();
  });

  it('单行段不套内层', () => {
    const { box } = mount(
      {
        list: rows(10, (i) => ({ g: 'G' + i })),
        columns: [{ key: 'g', title: 'G', width: 100, mergeKey: true }],
      },
      { begin: 0, end: 9 },
    );
    expect(cellOf(box, 'g')!.querySelector('.vt-merge-label')).toBeNull();
  });

  it('sticky 定位所需的几何变量被写到 root 上', () => {
    const { box } = mount(
      {
        list: rows(100, () => ({ g: 'SAME' })),
        columns: [{ key: 'g', title: 'G', width: 100, mergeKey: true }],
      },
      { begin: 0, end: 19 },
    );
    const root = box.querySelector<HTMLElement>('.vt-root')!;
    // happy-dom 里几何全是 0，只断言变量存在（真实取值由 CDP 验：41px / 559px）
    expect(root.style.getPropertyValue('--vt-body-view-t')).toMatch(/px$/);
    expect(root.style.getPropertyValue('--vt-body-view-h')).toMatch(/px$/);
  });
});

/**
 * 斑马纹要靠 CSS 选择器把「跨行合并格」挑出来抹平底色（`index.css` §4 斑马纹一节）：
 *
 *     .vt-tr.is-striped > .vt-td[rowspan]:not([rowspan='1'])
 *
 * 这条规则的正确性完全建立在两条 DOM 契约上，所以在这里守住：
 *   - 跨行合并格**一定**带 `rowspan` 内容属性（不能只设 IDL 而不反射）；
 *   - 非合并格的 `rowspan` 属性**绝不**大于 1（DOM 池复用会写出 `rowspan="1"`，
 *     这是允许的；但只要出现 `rowspan="2"` 之类，整表斑马纹就会被误杀）。
 *
 * 断言直接跑真实选择器，而不是手写等价判断 —— 要测的就是选择器本身的匹配语义。
 */
const STRIPE_SELECTOR = `.vt-td:where([rowspan]:not([rowspan='1']))`;

/** [选择器命中的格子数, 真实跨行格子数] —— 两者必须相等 */
function stripeMatch(box: HTMLElement): [number, number] {
  const tbody = box.querySelector('.vt-tbody')!;
  const hit = tbody.querySelectorAll(STRIPE_SELECTOR).length;
  const real = [...tbody.querySelectorAll<HTMLTableCellElement>('.vt-td')].filter(
    (td) => td.rowSpan > 1,
  ).length;
  return [hit, real];
}

describe('斑马纹：跨行合并格的 DOM 契约', () => {
  it('自动合并：选择器命中的格子 = 真实跨行格子，且确有命中', () => {
    const { box } = mount(
      {
        stripe: true,
        list: rows(9, (i) => ({ g: 'G' + ((i / 3) | 0), v: 'v' + i })),
        columns: [
          { key: 'g', title: 'G', width: 100, mergeKey: true },
          { key: 'v', title: 'V', width: 100 },
        ],
      },
      { begin: 0, end: 8 },
    );
    const [hit, real] = stripeMatch(box);
    expect(real).toBe(3); // 三段，每段 3 行
    expect(hit).toBe(real);
  });

  it('静态 merges 的跨行格也被命中（对不齐问题与合并来源无关）', () => {
    const { box } = mount(
      {
        stripe: true,
        list: rows(6, (i) => ({ a: 'a' + i, b: 'b' + i })),
        merges: [{ rowIndex: 1, colIndex: 0, rowspan: 3, colspan: 1 }],
        columns: [
          { key: 'a', title: 'A', width: 100 },
          { key: 'b', title: 'B', width: 100 },
        ],
      },
      { begin: 0, end: 5 },
    );
    const [hit, real] = stripeMatch(box);
    expect(real).toBe(1);
    expect(hit).toBe(real);
  });

  it('长段（套了 sticky 内层）同样被命中', () => {
    const { box } = mount(
      {
        stripe: true,
        list: rows(200, () => ({ g: 'SAME' })),
        columns: [{ key: 'g', title: 'G', width: 100, mergeKey: true }],
      },
      { begin: 20, end: 39 },
    );
    const td = box.querySelector<HTMLTableCellElement>('.vt-td--merge-sticky')!;
    expect(td.rowSpan).toBeGreaterThan(1);
    expect(td.matches(STRIPE_SELECTOR)).toBe(true);
    const [hit, real] = stripeMatch(box);
    expect(hit).toBe(real);
  });

  it('全表没有合并时选择器零命中（不误杀普通斑马纹）', () => {
    const { box } = mount(
      {
        stripe: true,
        list: rows(10, (i) => ({ a: 'a' + i })),
        columns: [{ key: 'a', title: 'A', width: 100 }],
      },
      { begin: 0, end: 9 },
    );
    expect(stripeMatch(box)).toEqual([0, 0]);
  });

  // 这条规则的**特异度**契约（不能压过 hover / 选中高亮）在 css-contract.test.ts
  it('非合并格身上的 rowspan 属性绝不大于 1', () => {
    const { box } = mount(
      {
        stripe: true,
        list: rows(30, (i) => ({ g: 'G' + ((i / 4) | 0), v: 'v' + i })),
        columns: [
          { key: 'g', title: 'G', width: 100, mergeKey: true },
          { key: 'v', title: 'V', width: 100 },
        ],
      },
      { begin: 0, end: 29 },
    );
    const bad = [
      ...box.querySelectorAll<HTMLTableCellElement>('.vt-tbody .vt-td'),
    ].filter((td) => {
      const attr = td.getAttribute('rowspan');
      return attr !== null && Number(attr) > 1 && td.rowSpan <= 1;
    });
    expect(bad).toEqual([]);
  });
});
