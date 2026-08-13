// @vitest-environment happy-dom
/** 客户端分页（表格自己切片）。写法说明见 AGENTS.md §5.1 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { VirtTable, type VirtTableOptions } from './index';

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
    renderControl: () => ({ begin: 0, end: 49 }),
    ...options,
  } as VirtTableOptions<Row>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  return { box, table };
}

/** 当前显示列表里的 id */
const ids = (t: VirtTable<Row>) => (t as any)._options.list.map((r: Row) => r.id);
const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i, v: i % 3 }));
/**
 * 每次 mount 都要新建列配置：表格会**就地改**列对象（`filters[].checked` /
 * `width` / `hidden`），共享一份会让筛选态在用例之间串（也是使用方要注意的：
 * 别把同一个 columns 数组喂给两个表格实例）。
 */
const cols = () => [
  { key: 'id', title: 'ID', width: 80, sortable: true },
  { key: 'v', title: 'V', width: 80, filters: [{ label: '0', value: 0 }, { label: '1', value: 1 }] },
];

describe('客户端分页：切片', () => {
  it('默认就是客户端分页：只显示当前页，total 自动派生', () => {
    const { table } = mount({ list: rows(95), columns: cols(), pagination: { pageSize: 10 } });
    expect(ids(table)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(table.getPagination()).toEqual({ page: 1, pageSize: 10, total: 95 });
  });

  it('翻页换切片', () => {
    const { table } = mount({ list: rows(95), columns: cols(), pagination: { pageSize: 10 } });
    table.setPage(3);
    expect(ids(table)).toEqual([20, 21, 22, 23, 24, 25, 26, 27, 28, 29]);
    expect(table.getPagination().page).toBe(3);
  });

  it('最后一页只给剩下的几行', () => {
    const { table } = mount({ list: rows(95), columns: cols(), pagination: { pageSize: 10 } });
    table.setPage(10);
    expect(ids(table)).toEqual([90, 91, 92, 93, 94]);
  });

  it('setPageSize 回到第 1 页并重新切', () => {
    const { table } = mount({ list: rows(95), columns: cols(), pagination: { pageSize: 10 } });
    table.setPage(5);
    table.setPageSize(25);
    expect(table.getPagination()).toEqual({ page: 1, pageSize: 25, total: 95 });
    expect(ids(table)).toHaveLength(25);
  });

  it('setList 后 total 跟着变，页码被 clamp', () => {
    const { table } = mount({ list: rows(95), columns: cols(), pagination: { pageSize: 10 } });
    table.setPage(9);
    table.setList(rows(12));
    expect(table.getPagination()).toEqual({ page: 2, pageSize: 10, total: 12 });
    expect(ids(table)).toEqual([10, 11]);
  });

  it('数据为空时 total 0、页码 1、切片为空', () => {
    const { table } = mount({ list: [], columns: cols(), pagination: { pageSize: 10 } });
    expect(table.getPagination()).toEqual({ page: 1, pageSize: 10, total: 0 });
    expect(ids(table)).toEqual([]);
  });
});

describe('客户端分页：与排序 / 筛选的关系', () => {
  it('排序作用于全量数据，再切片（不是只排本页）', () => {
    const { table } = mount({ list: rows(95), columns: cols(), pagination: { pageSize: 5 } });
    table.sort('id', 'desc');
    expect(ids(table)).toEqual([94, 93, 92, 91, 90]);
  });

  it('排序不重置页码（行集合没变）', () => {
    const { table } = mount({ list: rows(95), columns: cols(), pagination: { pageSize: 10 } });
    table.setPage(3);
    table.sort('id', 'desc');
    expect(table.getPagination().page).toBe(3);
  });

  it('筛选作用于全量数据，total 变成筛选后的行数', () => {
    const { table } = mount({ list: rows(90), columns: cols(), pagination: { pageSize: 10 } });
    table.setColumnFilter('v', [0]); // 90 行里 v===0 的有 30 行
    expect(table.getPagination().total).toBe(30);
    expect(ids(table)).toEqual([0, 3, 6, 9, 12, 15, 18, 21, 24, 27]);
  });

  it('筛选回到第 1 页（行集合变了）', () => {
    const { table } = mount({ list: rows(90), columns: cols(), pagination: { pageSize: 10 } });
    table.setPage(5);
    table.setColumnFilter('v', [0]);
    expect(table.getPagination().page).toBe(1);
  });

  it('清空筛选后 total 恢复', () => {
    const { table } = mount({ list: rows(90), columns: cols(), pagination: { pageSize: 10 } });
    table.setColumnFilter('v', [0]);
    table.clearAllFilters();
    expect(table.getPagination().total).toBe(90);
  });
});

describe('客户端分页：与树形的关系', () => {
  const tree = [
    { id: 1, v: 0, children: [{ id: 11, v: 0 }, { id: 12, v: 0 }] },
    { id: 2, v: 0, children: [{ id: 21, v: 0 }] },
    { id: 3, v: 0 },
  ];
  const treeCols = [{ key: 'id', title: 'ID', width: 120, type: 'tree' as const }];

  it('按根行切片，父节点不会和子节点被切到两页', () => {
    const { table } = mount({
      list: tree, columns: treeCols, defaultExpandAll: true,
      pagination: { pageSize: 2 },
    });
    // 每页 2 个根行 → 第 1 页是 1(+11,12) 和 2(+21)
    expect(table.getPagination().total).toBe(3); // total 数的是根行
    expect(ids(table)).toEqual([1, 11, 12, 2, 21]);
    table.setPage(2);
    expect(ids(table)).toEqual([3]);
  });
});

describe('服务端分页模式（manualPagination）保持原行为', () => {
  it('不切片，total 由使用方给', () => {
    const { table } = mount({
      list: rows(10), columns: cols(), manualPagination: true,
      pagination: { pageSize: 10, total: 500 },
    });
    expect(ids(table)).toHaveLength(10);
    expect(table.getPagination()).toEqual({ page: 1, pageSize: 10, total: 500 });
  });

  it('翻页只派发事件，不动数据', () => {
    const onPageChange = vi.fn();
    const { table } = mount({
      list: rows(10), columns: cols(), manualPagination: true, onPageChange,
      pagination: { pageSize: 10, total: 500 },
    });
    table.setPage(4);
    expect(onPageChange).toHaveBeenCalledWith(4, 10);
    expect(ids(table)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]); // 原样
  });

  it('setTotal 有效', () => {
    const { table } = mount({
      list: rows(10), columns: cols(), manualPagination: true,
      pagination: { pageSize: 10, total: 500 },
    });
    table.setTotal(120);
    expect(table.getPagination().total).toBe(120);
  });

  it('客户端分页下 setTotal 告警并跳过', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { table } = mount({ list: rows(50), columns: cols(), pagination: { pageSize: 10 } });
    table.setTotal(999);
    expect(warn).toHaveBeenCalled();
    expect(table.getPagination().total).toBe(50);
    warn.mockRestore();
  });

  it('dataMode: server 等价于 manualPagination', () => {
    const { table } = mount({
      list: rows(10), columns: cols(), dataMode: 'server',
      pagination: { pageSize: 10, total: 500 },
    });
    expect(table.getPagination().total).toBe(500);
    expect(ids(table)).toHaveLength(10);
  });
});

describe('分页进状态', () => {
  it('getState 带上 page / pageSize，不带 total', () => {
    const { table } = mount({ list: rows(95), columns: cols(), pagination: { pageSize: 10 } });
    table.setPage(4);
    const st = table.getState();
    expect(st.pagination).toEqual({ page: 4, pageSize: 10 });
    expect(st.pagination).not.toHaveProperty('total');
  });

  it('没配 pagination 时状态里不带这个字段', () => {
    const { table } = mount({ list: rows(10), columns: cols() });
    expect(table.getState().pagination).toBeUndefined();
  });

  it('setState 还原页码与每页条数，并重新切片', () => {
    const { table } = mount({ list: rows(95), columns: cols(), pagination: { pageSize: 10 } });
    table.setState({ version: 1, pagination: { page: 3, pageSize: 5 } });
    expect(table.getPagination()).toEqual({ page: 3, pageSize: 5, total: 95 });
    expect(ids(table)).toEqual([10, 11, 12, 13, 14]);
  });

  it('还原筛选 + 页码时，页码不被「筛选回第 1 页」顶掉', () => {
    const { table } = mount({ list: rows(90), columns: cols(), pagination: { pageSize: 5 } });
    table.setState({
      version: 1,
      columnFilters: { v: [0] },          // 筛出 30 行
      pagination: { page: 3, pageSize: 5 },
    });
    expect(table.getPagination()).toEqual({ page: 3, pageSize: 5, total: 30 });
    expect(ids(table)).toEqual([30, 33, 36, 39, 42]);
  });

  it('没配 pagination 时 setState 里的分页被忽略', () => {
    const { table } = mount({ list: rows(20), columns: cols() });
    table.setState({ version: 1, pagination: { page: 5, pageSize: 3 } });
    expect(table.getPagination().page).toBe(1);
    expect(ids(table)).toHaveLength(20);
  });
});
