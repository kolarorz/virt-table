// @vitest-environment happy-dom
/**
 * 行拖拽落数据引擎（`moveRowTo` / `canDropRow` / `moveRow`）的 DOM 层测试。
 *
 * 为什么是 DOM 层而不是纯逻辑：引擎住在 `VirtTable` 里，吃的是 `_originList` 的 children
 * 结构、`_foldMap` 折叠态与合成出来的分组行 —— 这三样都只在真实实例上存在。
 * 脚手架照 `merge.dom.test.ts`：`renderControl` 钉窗口 + `fixedSize` 跳过 ResizeObserver。
 *
 * 手势那一半（placement / 层级箭头 / 指示线）不在这里 —— happy-dom 里
 * `elementFromPoint` 与所有几何都是 0，测不出东西；那部分靠示例页手验。
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { VirtTable, type VirtTableColumn, type VirtTableOptions } from './index';
import { vtCellEditor } from './plugins/cell-editor';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

type Row = Record<string, any>;

function mount(
  options: Omit<VirtTableOptions<Row>, 'itemKey' | 'estimatedSize'> &
    Partial<Pick<VirtTableOptions<Row>, 'itemKey' | 'estimatedSize'>>,
) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  const table = new VirtTable<Row>(box, {
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 0,
    fixedSize: true,
    renderControl: () => ({ begin: 0, end: 40 }),
    ...options,
  } as VirtTableOptions<Row>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  return { box, table };
}

const treeCols: VirtTableColumn<Row>[] = [
  { key: 'name', title: '名称', width: 200, type: 'tree' },
];
const flatCols: VirtTableColumn<Row>[] = [{ key: 'name', title: '名称', width: 200 }];

/** 树的形状：`a[b,c]` 表示 a 有两个孩子 b、c */
function shape(list: Row[]): string {
  return list
    .map((r) => {
      const kids = r.children as Row[] | undefined;
      return kids?.length ? `${r.id}[${shape(kids)}]` : String(r.id);
    })
    .join(',');
}

/** 展示列表（含分组合成行）。与 `pagination.dom.test.ts` 同一个取法 */
const display = (t: VirtTable<Row>): Row[] => (t as any)._options.list ?? [];
/** 原始列表（拖拽真正写回的那份） */
const origin = (t: VirtTable<Row>): Row[] => (t as any)._originList;

/** 当前展示顺序（分组行取 _groupName） */
function view(table: VirtTable<Row>): string[] {
  return display(table).map((r) =>
    r._rowType === 'group' ? `#${r._groupName}` : String(r.id),
  );
}

function tree(): Row[] {
  return [
    { id: 'a', name: 'a', children: [{ id: 'a1', name: 'a1' }, { id: 'a2', name: 'a2' }] },
    { id: 'b', name: 'b', children: [{ id: 'b1', name: 'b1' }] },
    { id: 'c', name: 'c' },
  ];
}

describe('canReorderRows', () => {
  it('树形与分组下可以拖（曾经被一并拉黑）', () => {
    expect(
      mount({ list: tree(), columns: treeCols, defaultExpandAll: true }).table.canReorderRows(),
    ).toBe(true);
    expect(
      mount({
        list: [{ id: 1, dept: '研发' }],
        columns: flatCols,
        groupConfig: [{ field: 'dept' }],
      }).table.canReorderRows(),
    ).toBe(true);
  });

  it('排序 / 筛选下仍然不能拖', () => {
    const sorted = mount({
      list: [{ id: 1, name: 'x' }],
      // 初始排序从列的 defaultSort 收（见 index.ts 构造函数）
      columns: [{ key: 'name', title: '名称', width: 100, sortable: true, defaultSort: 'asc' }],
    });
    expect(sorted.table.canReorderRows()).toBe(false);

    const filtered = mount({ list: [{ id: 1, name: 'x' }], columns: flatCols });
    filtered.table.setColumnFilter('name', ['x']);
    expect(filtered.table.canReorderRows()).toBe(false);
  });
});

describe('树形落点', () => {
  it('改父：把 a1 挂到 b 下、排在 b1 之后', () => {
    const list = tree();
    const { table } = mount({ list, columns: treeCols, defaultExpandAll: true });
    expect(table.moveRowTo('a1', { parentKey: 'b', prevKey: 'b1' })).toBe(true);
    expect(shape(origin(table))).toBe('a[a2],b[b1,a1],c');
  });

  it('父级下第一个：prevKey 省略即插到最前', () => {
    const { table } = mount({ list: tree(), columns: treeCols, defaultExpandAll: true });
    expect(table.moveRowTo('c', { parentKey: 'a' })).toBe(true);
    expect(shape(origin(table))).toBe('a[c,a1,a2],b[b1]');
  });

  it('叶子行收下子节点后长出 children，并自动展开', () => {
    const { table } = mount({ list: tree(), columns: treeCols, defaultExpandAll: true });
    expect(table.moveRowTo('a1', { parentKey: 'c' })).toBe(true);
    expect(shape(origin(table))).toBe('a[a2],b[b1],c[a1]');
    // 父级被展开，新来的子节点立刻可见
    expect(table.isFolded('c')).toBe(false);
    expect(view(table)).toContain('a1');
  });

  it('提到根层：parentKey 空 = 根，落在 c 之后', () => {
    const { table } = mount({ list: tree(), columns: treeCols, defaultExpandAll: true });
    expect(table.moveRowTo('b1', { parentKey: null, prevKey: 'c' })).toBe(true);
    expect(shape(origin(table))).toBe('a[a1,a2],b,c,b1');
  });

  it('拖进自己的子树 / 拖到自己身上：一律拒绝', () => {
    const { table } = mount({ list: tree(), columns: treeCols, defaultExpandAll: true });
    expect(table.canDropRow('a', { parentKey: 'a1' })).toBe(false);
    expect(table.moveRowTo('a', { parentKey: 'a1' })).toBe(false);
    expect(table.canDropRow('a', { parentKey: 'a' })).toBe(false);
    expect(shape(origin(table))).toBe('a[a1,a2],b[b1],c');
  });

  it('拖回原处不算移动（指示线也就不该画）', () => {
    const { table } = mount({ list: tree(), columns: treeCols, defaultExpandAll: true });
    expect(table.canDropRow('a2', { parentKey: 'a', prevKey: 'a1' })).toBe(false);
    expect(table.moveRowTo('a2', { parentKey: 'a', prevKey: 'a1' })).toBe(false);
  });

  it('没有树形列时「成为子节点」放不下（否则行会凭空消失）', () => {
    const { table } = mount({
      list: [{ id: 1, name: 'x' }, { id: 2, name: 'y' }],
      columns: flatCols,
    });
    expect(table.canDropRow('1', { parentKey: '2' })).toBe(false);
  });
});

describe('分组落点', () => {
  const list = () => [
    { id: 1, name: 'n1', dept: '研发' },
    { id: 2, name: 'n2', dept: '研发' },
    { id: 3, name: 'n3', dept: '销售' },
    { id: 4, name: 'n4', dept: '销售' },
  ];
  const groupOpts = {
    columns: flatCols,
    groupConfig: [{ field: 'dept' }],
    defaultExpandAll: true,
  };

  it('落进另一个分组：改写分组字段并插到落点位置', () => {
    const { table } = mount({ list: list(), ...groupOpts });
    const salesGroup = display(table).find((r) => r._groupName === '销售')!;
    expect(table.moveRowTo('1', { parentKey: String(salesGroup.id), prevKey: '3' })).toBe(true);
    const moved = origin(table).find((r) => r.id === 1)!;
    expect(moved.dept).toBe('销售');
    expect(view(table)).toEqual(['#研发', '2', '#销售', '3', '1', '4']);
  });

  it('落到分组行本身 = 落到这一组的开头', () => {
    const { table } = mount({ list: list(), ...groupOpts });
    const salesGroup = display(table).find((r) => r._groupName === '销售')!;
    expect(table.moveRowTo('1', { parentKey: String(salesGroup.id) })).toBe(true);
    expect(view(table)).toEqual(['#研发', '2', '#销售', '1', '3', '4']);
  });

  it('多级分组：改写路径上的每一个字段', () => {
    const rows = [
      { id: 1, name: 'n1', dept: '研发', city: '北京' },
      { id: 2, name: 'n2', dept: '销售', city: '上海' },
    ];
    const { table } = mount({
      list: rows,
      columns: flatCols,
      groupConfig: [{ field: 'dept' }, { field: 'city' }],
      defaultExpandAll: true,
    });
    // 目标是「销售 / 上海」那个二级分组
    const target = display(table).find(
      (r) => r._rowType === 'group' && r._groupName === '上海',
    )!;
    expect(table.moveRowTo('1', { parentKey: String(target.id) })).toBe(true);
    const moved = origin(table).find((r) => r.id === 1)!;
    expect(moved.dept).toBe('销售');
    expect(moved.city).toBe('上海');
  });

  it('根层落点按 prevKey 所属分组同步字段（线画在哪就落在哪）', () => {
    const { table } = mount({ list: list(), ...groupOpts });
    expect(table.moveRowTo('1', { parentKey: null, prevKey: '4' })).toBe(true);
    expect(origin(table).find((r) => r.id === 1)!.dept).toBe('销售');
    expect(view(table)).toEqual(['#研发', '2', '#销售', '3', '4', '1']);
  });

  it('落在第一个分组之前没有对应分组，放不下', () => {
    const { table } = mount({ list: list(), ...groupOpts });
    expect(table.canDropRow('3', { parentKey: null, prevKey: null })).toBe(false);
  });

  it('分组内换位仍然触发 onRowOrderChange（根层同父）', () => {
    const onRowOrderChange = vi.fn();
    const { table } = mount({ list: list(), ...groupOpts, onRowOrderChange });
    expect(table.moveRowTo('1', { parentKey: null, prevKey: '2' })).toBe(true);
    expect(onRowOrderChange).toHaveBeenCalledTimes(1);
    expect(view(table)).toEqual(['#研发', '2', '1', '#销售', '3', '4']);
  });
});

describe('回调与老签名', () => {
  it('onRowMove 拿到落点三件套；结构性移动不触发 onRowOrderChange', () => {
    const onRowMove = vi.fn();
    const onRowOrderChange = vi.fn();
    const { table } = mount({
      list: tree(),
      columns: treeCols,
      defaultExpandAll: true,
      onRowMove,
      onRowOrderChange,
    });
    table.moveRowTo('a1', { parentKey: 'b', prevKey: 'b1' });
    expect(onRowOrderChange).not.toHaveBeenCalled();
    const detail = onRowMove.mock.calls[0][0];
    expect(detail.row.id).toBe('a1');
    expect(detail.parentRow.id).toBe('b');
    expect(detail.prevRow.id).toBe('b1');
    expect(detail.list).toBe(origin(table));
  });

  it('moveRow 老签名在扁平表上行为不变', () => {
    const onRowOrderChange = vi.fn();
    const rows = [1, 2, 3, 4].map((id) => ({ id, name: `n${id}` }));
    const { table } = mount({ list: rows, columns: flatCols, onRowOrderChange });

    expect(table.moveRow('1', '3', true)).toBe(true);
    expect(view(table)).toEqual(['2', '3', '1', '4']);
    expect(onRowOrderChange).toHaveBeenLastCalledWith(expect.anything(), 0, 2);

    expect(table.moveRow('4', '2', false)).toBe(true);
    expect(view(table)).toEqual(['4', '2', '3', '1']);
    // 落点即原位置 / 自己 → false
    expect(table.moveRow('2', '2', true)).toBe(false);
    expect(table.moveRow('2', '3', false)).toBe(false);
  });

  it('moveRow 在树里按目标行的父级落位', () => {
    const { table } = mount({ list: tree(), columns: treeCols, defaultExpandAll: true });
    expect(table.moveRow('c', 'a1', true)).toBe(true);
    expect(shape(origin(table))).toBe('a[a1,c,a2],b[b1]');
  });
});

/**
 * 拖拽手柄列（`type: 'drag'`）与高亮激活的关系。
 *
 * 用户报的：开着 `highlightSelectCell` 时按住手柄拖行，激活描边会跳到手柄那一格上 ——
 * 核心的高亮监听听的是 `pointerdown`（见 `_buildDOM`），与 `vtRowDrag` 的拖拽起手是
 * **同一个事件**，于是每次拖行都顺手改了一次「当前单元格」。手柄格的语义是操作、不是选中，
 * 所以那一格既不该新建高亮，也不该把用户已激活的格子清掉。
 */
describe('拖拽手柄列不参与高亮', () => {
  const dragCols: VirtTableColumn<Row>[] = [
    { key: '_drag', title: '', width: 44, type: 'drag' },
    { key: 'name', title: '名称', width: 200 },
  ];
  const rows = [1, 2, 3].map((id) => ({ id, name: `n${id}` }));

  const cell = (box: HTMLElement, rowKey: string, colKey: string): HTMLElement =>
    box.querySelector(
      `tr[data-row-key="${rowKey}"] td[data-col-key="${colKey}"]`,
    ) as HTMLElement;

  const pointerDownOn = (el: HTMLElement): void => {
    el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
  };

  it('点手柄格不激活、也不清掉已激活的那一格', () => {
    const { box, table } = mount({
      list: rows,
      columns: dragCols,
      highlightSelectRow: true,
      highlightSelectCol: true,
      highlightSelectCell: true,
    });

    // 先正常点一格，确认高亮链路是活的
    pointerDownOn(cell(box, '1', 'name'));
    expect(table.getActiveCell()).toEqual({ rowKey: '1', colKey: 'name' });

    // 再点另一行的手柄（拖拽起手）：激活态原地不动
    pointerDownOn(cell(box, '2', '_drag'));
    expect(table.getActiveCell()).toEqual({ rowKey: '1', colKey: 'name' });
    expect(cell(box, '2', '_drag').classList.contains('current-column')).toBe(false);
    expect(
      box.querySelector('tr[data-row-key="2"]')!.classList.contains('current-row'),
    ).toBe(false);
  });

  it('双击手柄格也不激活（vtCellEditor 的 dblclick 走的是 setActiveCell）', () => {
    const { box, table } = mount({
      list: rows,
      columns: dragCols,
      highlightSelectCell: true,
      plugins: [vtCellEditor({ trigger: 'dblclick' })],
    });

    pointerDownOn(cell(box, '1', 'name'));
    expect(table.getActiveCell()).toEqual({ rowKey: '1', colKey: 'name' });

    cell(box, '2', '_drag').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(table.getActiveCell()).toEqual({ rowKey: '1', colKey: 'name' });
  });

  it('程序化 setActiveCell 指到手柄列同样不受理', () => {
    const { table } = mount({ list: rows, columns: dragCols, highlightSelectCell: true });
    table.setActiveCell('1', '_drag');
    expect(table.getActiveCell()).toBeNull();
  });

  it('手柄内的 svg 起手也一样（closest 会冒到手柄格上）', () => {
    const { box, table } = mount({
      list: rows,
      columns: dragCols,
      highlightSelectCell: true,
    });
    const handle = cell(box, '1', '_drag').querySelector('.vt-drag-handle') as HTMLElement;
    expect(handle, '核心应该渲染出手柄本体').toBeTruthy();
    pointerDownOn(handle);
    expect(table.getActiveCell()).toBeNull();
  });
});
