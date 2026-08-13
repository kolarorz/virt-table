// @vitest-environment happy-dom
/** getState / setState 的往返与部分应用。写法说明见 AGENTS.md §5.1 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { VirtTable, type VirtTableOptions, type VirtTableState } from './index';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

type Row = Record<string, any>;

function mount(options: Partial<VirtTableOptions<Row>>) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  const table = new VirtTable<Row>(box, {
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 0,
    fixedSize: true,
    renderControl: () => ({ begin: 0, end: 9 }),
    ...options,
  } as VirtTableOptions<Row>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  return { box, table };
}

const list: Row[] = [
  { id: 1, a: 'x', b: 3, c: 'p' },
  { id: 2, a: 'y', b: 1, c: 'q' },
  { id: 3, a: 'x', b: 2, c: 'p' },
];
const flat = () => [
  { key: 'a', title: 'A', width: 100, sortable: true, filters: [{ label: 'x', value: 'x' }, { label: 'y', value: 'y' }] },
  { key: 'b', title: 'B', width: 120, sortable: true },
  { key: 'c', title: 'C', width: 140 },
];
const keys = (t: VirtTable<Row>) => t.getLeafColumns().map((c) => String(c.key));
const widths = (t: VirtTable<Row>) => t.getLeafColumns().map((c) => c.width);

describe('getState', () => {
  it('导出列（含隐藏）、排序、筛选，带版本号', () => {
    const { table } = mount({ list, columns: flat(), sortMode: 'multiple' });
    table.setColumnVisible('c', false);
    table.sort('b', 'desc');
    table.setColumnFilter('a', ['x']);
    const st = table.getState();
    expect(st.version).toBe(1);
    expect(st.columns).toEqual([
      { key: 'a', width: 100, hidden: false },
      { key: 'b', width: 120, hidden: false },
      { key: 'c', width: 140, hidden: true },
    ]);
    expect(st.sort).toEqual([{ colKey: 'b', order: 'desc' }]);
    expect(st.columnFilters).toEqual({ a: ['x'] });
  });

  it('没有高级筛选时 filterModel 为 null（而不是省略字段）', () => {
    // 省略的话 setState(getState()) 就不是恒等操作了：setState 把「不给字段」读作
    // 「保持现状」，于是「先存快照 → 之后加了筛选 → 还原」清不掉那条筛选。
    const { table } = mount({ list, columns: flat() });
    expect('filterModel' in table.getState()).toBe(true);
    expect(table.getState().filterModel).toBeNull();
  });

  it('快照能把后来加上的高级筛选还原掉', () => {
    const { table } = mount({ list, columns: flat() });
    const snapshot = table.getState();
    table.setFilterModel({
      kind: 'group',
      logic: 'and',
      children: [{ kind: 'condition', colKey: 'a', operator: 'eq', value: 'x' }],
    });
    expect(table.getFilterModel()).not.toBeNull();
    table.setState(snapshot);
    expect(table.getFilterModel()).toBeNull();
  });

  it('可 JSON 往返', () => {
    const { table } = mount({ list, columns: flat() });
    table.sort('b', 'asc');
    const st = table.getState();
    expect(JSON.parse(JSON.stringify(st))).toEqual(st);
  });
});

describe('setState 往返', () => {
  it('列宽 / 显隐 / 列序 / 排序 / 筛选整套还原', () => {
    const a = mount({ list, columns: flat(), sortMode: 'multiple' });
    a.table.setColumnVisible('b', false);
    a.table.sort('b', 'desc');
    a.table.sort('a', 'asc');
    a.table.setColumnFilter('a', ['x']);
    a.table.moveColumn('c', 'a', false); // c 挪到最前
    const saved = JSON.parse(JSON.stringify(a.table.getState())) as VirtTableState;

    const b = mount({ list, columns: flat(), sortMode: 'multiple' });
    expect(b.table.setState(saved)).toBe(true);
    expect(b.table.getState()).toEqual(saved);
    expect(keys(b.table)).toEqual(['c', 'a', 'b']);
    expect(b.table.getVisibleColumns().map((c) => String(c.key))).toEqual(['c', 'a']);
  });

  it('列宽被还原', () => {
    const { table } = mount({ list, columns: flat() });
    expect(table.setState({ version: 1, columns: [
      { key: 'a', width: 333 }, { key: 'b', width: 120 }, { key: 'c', width: 140 },
    ] })).toBe(true);
    expect(widths(table)).toEqual([333, 120, 140]);
  });
});

describe('setState 部分应用', () => {
  it('只给 sort 时不动列', () => {
    const { table } = mount({ list, columns: flat() });
    table.setColumnVisible('c', false);
    table.setState({ version: 1, sort: [{ colKey: 'b', order: 'asc' }] });
    expect(table.getSortState()).toEqual([{ colKey: 'b', order: 'asc' }]);
    expect(table.getLeafColumns().find((c) => c.key === 'c')!.hidden).toBe(true);
  });

  it('只给 columns 时不动排序与筛选', () => {
    const { table } = mount({ list, columns: flat() });
    table.sort('b', 'desc');
    table.setColumnFilter('a', ['y']);
    table.setState({ version: 1, columns: [{ key: 'b' }, { key: 'a' }, { key: 'c' }] });
    expect(keys(table)).toEqual(['b', 'a', 'c']);
    expect(table.getSortState()).toEqual([{ colKey: 'b', order: 'desc' }]);
    expect(table.getActiveFilters()).toEqual({ a: ['y'] });
  });

  it('空 sort 数组 = 清空排序（与「不给该字段」区分开）', () => {
    const { table } = mount({ list, columns: flat() });
    table.sort('b', 'desc');
    table.setState({ version: 1, sort: [] });
    expect(table.getSortState()).toEqual([]);
  });

  it('空 columnFilters 对象 = 清空列头筛选', () => {
    const { table } = mount({ list, columns: flat() });
    table.setColumnFilter('a', ['x']);
    table.setState({ version: 1, columnFilters: {} });
    expect(table.getActiveFilters()).toEqual({});
  });

  it('filterModel: null 显式清空', () => {
    const { table } = mount({ list, columns: flat() });
    table.setFilterModel({ kind: 'group', logic: 'and', children: [
      { kind: 'condition', colKey: 'a', operator: 'eq', value: 'x' } as any,
    ] } as any);
    expect(table.getFilterModel()).not.toBeNull();
    table.setState({ version: 1, filterModel: null as any });
    expect(table.getFilterModel()).toBeNull();
  });
});

describe('setState 健壮性', () => {
  it('版本不认识 → 告警 + 返回 false + 什么都不改', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { table } = mount({ list, columns: flat() });
    table.sort('b', 'asc');
    expect(table.setState({ version: 99, sort: [] } as VirtTableState)).toBe(false);
    expect(warn).toHaveBeenCalled();
    expect(table.getSortState()).toEqual([{ colKey: 'b', order: 'asc' }]); // 未被清掉
    warn.mockRestore();
  });

  it('null / undefined 返回 false', () => {
    const { table } = mount({ list, columns: flat() });
    expect(table.setState(null)).toBe(false);
    expect(table.setState(undefined)).toBe(false);
  });

  it('状态里多出的列被忽略，缺的列保持现状', () => {
    const { table } = mount({ list, columns: flat() });
    table.setState({ version: 1, columns: [
      { key: 'gone', width: 999 },      // 已不存在的列
      { key: 'b', width: 200 },         // 只给 b
    ] });
    // 按 key 断言，与列序无关（下面单独断言列序）
    expect(Object.fromEntries(table.getLeafColumns().map((c) => [String(c.key), c.width])))
      .toEqual({ a: 100, b: 200, c: 140 });
    // b 有目标位次、a/c 没有 → b 排到最前，a/c 保持原有相对顺序
    expect(keys(table)).toEqual(['b', 'a', 'c']);
  });

  it('排序里指向不存在的列会被丢掉', () => {
    const { table } = mount({ list, columns: flat(), sortMode: 'multiple' });
    table.setState({ version: 1, sort: [
      { colKey: 'gone', order: 'asc' }, { colKey: 'b', order: 'desc' },
    ] });
    expect(table.getSortState()).toEqual([{ colKey: 'b', order: 'desc' }]);
  });

  it('单列排序模式下只取第一条', () => {
    const { table } = mount({ list, columns: flat() }); // 默认单列
    table.setState({ version: 1, sort: [
      { colKey: 'a', order: 'asc' }, { colKey: 'b', order: 'desc' },
    ] });
    expect(table.getSortState()).toEqual([{ colKey: 'a', order: 'asc' }]);
  });

  it('还原筛选会同步列上的 filters[].checked（面板勾选态才不会错位）', () => {
    const { table } = mount({ list, columns: flat() });
    table.setState({ version: 1, columnFilters: { a: ['y'] } });
    const colA = table.getLeafColumns().find((c) => c.key === 'a')!;
    expect(colA.filters!.map((f) => [f.value, !!f.checked])).toEqual([['x', false], ['y', true]]);
  });

  it('回调被派发（用于把还原后的状态同步给外部 UI）', () => {
    const onSortChange = vi.fn();
    const onFilterChange = vi.fn();
    const { table } = mount({ list, columns: flat(), onSortChange, onFilterChange });
    table.setState({ version: 1, sort: [{ colKey: 'b', order: 'asc' }], columnFilters: { a: ['x'] } });
    expect(onSortChange).toHaveBeenCalledWith([{ colKey: 'b', order: 'asc' }]);
    expect(onFilterChange).toHaveBeenCalledWith({ a: ['x'] });
  });
});

describe('setState 与分组表头', () => {
  const grouped = () => [
    { key: 'g1', title: 'G1', width: 0, children: [
      { key: 'a', title: 'A', width: 100 },
      { key: 'b', title: 'B', width: 100 },
    ] },
    { key: 'c', title: 'C', width: 100 },
  ];

  it('只在同一分组内重排，不会把叶子列跨组搬家', () => {
    const { table } = mount({ list, columns: grouped() as any });
    expect(keys(table)).toEqual(['a', 'b', 'c']);
    // 目标顺序 b,a,c → 组内交换生效
    table.setState({ version: 1, columns: [{ key: 'b' }, { key: 'a' }, { key: 'c' }] });
    expect(keys(table)).toEqual(['b', 'a', 'c']);
  });

  it('分组节点按后代的最小位次参与排序（组整体前移）', () => {
    const { table } = mount({ list, columns: grouped() as any });
    // 目标顺序 c,a,b → c 应该排到组前面
    table.setState({ version: 1, columns: [{ key: 'c' }, { key: 'a' }, { key: 'b' }] });
    expect(keys(table)).toEqual(['c', 'a', 'b']);
    expect(table.getAllColumns().map((c) => String(c.key))).toEqual(['c', 'g1']);
  });

  it('跨组的目标顺序不会把列拆出去，只影响组之间的次序', () => {
    const { table } = mount({ list, columns: grouped() as any });
    // 想要 a,c,b —— c 夹在组内两列之间，做不到；组仍整体在前
    table.setState({ version: 1, columns: [{ key: 'a' }, { key: 'c' }, { key: 'b' }] });
    expect(keys(table)).toEqual(['a', 'b', 'c']);
  });
});
