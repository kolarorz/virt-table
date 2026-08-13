// @vitest-environment happy-dom
/**
 * 数据管线用**全量叶子列**（含隐藏），不是可见叶子列。
 *
 * 筛选与排序是数据层的事，隐藏一列不该让它上面的条件失效 —— AG Grid / Excel
 * 同此语义。写成 DOM 层测试是因为这条约束只存在于 `index.ts` 的传参处
 * （`_rebuildData` 把 `_allLeafColumns` 交给 `buildFilterModelPredicate` /
 * `buildColumnFilterPredicate` / `buildComparator`）；纯逻辑层三个函数本身都没问题。
 *
 * 写法说明见 AGENTS.md §5.1
 */
import { describe, it, expect, afterEach } from 'vitest';
import { VirtTable, type VirtTableOptions } from './index';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

type Row = Record<string, any>;

const list: Row[] = [
  { id: 1, name: '甲', region: 'east', amount: 300 },
  { id: 2, name: '乙', region: 'south', amount: 1200 },
  { id: 3, name: '丙', region: 'east', amount: 900 },
];

function mount(extra: Partial<VirtTableOptions<Row>> = {}) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  const table = new VirtTable<Row>(box, {
    list: list.slice(),
    columns: [
      { key: 'name', title: '名称', width: 100 },
      {
        key: 'region',
        title: '大区',
        width: 100,
        sortable: true,
        filters: [
          { label: '华东', value: 'east' },
          { label: '华南', value: 'south' },
        ],
      },
      { key: 'amount', title: '金额', width: 100, sortable: true, filterType: 'number-range' },
    ],
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 0,
    fixedSize: true,
    renderControl: () => ({ begin: 0, end: 9 }),
    ...extra,
  } as VirtTableOptions<Row>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  return { box, table };
}

const names = (box: HTMLElement): string[] =>
  [...box.querySelectorAll<HTMLElement>('tbody td[data-col-key="name"]')].map(
    (td) => td.textContent?.trim() ?? '',
  );

describe('隐藏列上的条件继续生效', () => {
  it('高级筛选：隐藏被筛选的列，行集合不变', () => {
    const { box, table } = mount();
    table.setFilterModel({
      kind: 'group',
      logic: 'and',
      children: [{ kind: 'condition', colKey: 'region', operator: 'in', value: ['east'] }],
    });
    expect(names(box)).toEqual(['甲', '丙']);
    table.setColumnVisible('region', false);
    expect(names(box)).toEqual(['甲', '丙']);
  });

  it('列头筛选：隐藏被筛选的列，行集合不变', () => {
    const { box, table } = mount();
    table.setColumnFilter('region', ['east']);
    expect(names(box)).toEqual(['甲', '丙']);
    table.setColumnVisible('region', false);
    expect(names(box)).toEqual(['甲', '丙']);
  });

  it('排序：隐藏被排序的列，行顺序不变', () => {
    const { box, table } = mount();
    table.sort('amount', 'desc');
    expect(names(box)).toEqual(['乙', '丙', '甲']);
    table.setColumnVisible('amount', false);
    expect(names(box)).toEqual(['乙', '丙', '甲']);
  });

  it('重新显示该列后结果依然一致', () => {
    const { box, table } = mount();
    table.setColumnFilter('region', ['east']);
    table.setColumnVisible('region', false);
    table.setColumnVisible('region', true);
    expect(names(box)).toEqual(['甲', '丙']);
  });

  it('先隐藏、再经 setState 还原筛选，一样生效', () => {
    const { box, table } = mount();
    table.setColumnVisible('region', false);
    table.setState({
      ...table.getState(),
      filterModel: {
        kind: 'group',
        logic: 'and',
        children: [{ kind: 'condition', colKey: 'region', operator: 'in', value: ['south'] }],
      },
    });
    expect(names(box)).toEqual(['乙']);
  });

  it('分组表头下隐藏叶子列同样不影响筛选', () => {
    const { box, table } = mount({
      columns: [
        { key: 'name', title: '名称', width: 100 },
        {
          key: 'grp',
          title: '业务',
          children: [
            { key: 'region', title: '大区', width: 100, filters: [{ label: '华东', value: 'east' }] },
            { key: 'amount', title: '金额', width: 100 },
          ],
        },
      ],
    } as Partial<VirtTableOptions<Row>>);
    table.setColumnFilter('region', ['east']);
    expect(names(box)).toEqual(['甲', '丙']);
    table.setColumnVisible('region', false);
    expect(names(box)).toEqual(['甲', '丙']);
  });
});
