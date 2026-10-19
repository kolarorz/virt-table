// @vitest-environment happy-dom
/**
 * `transformSourceRows` —— 钩子表里唯一一条**有返回值**的钩子。
 *
 * 写成 DOM 层测试而不是 `plugin.test.ts` 的假宿主：这条钩子的全部意义在**它在管线里的位置**
 * （`_originList` → 变换 → 筛选 → 排序 → 分页 → 聚合 → 结构展开），而位置只存在于
 * `index.ts` 的 `_computeDisplayList` 里。假宿主能验「串联顺序对不对」，验不出
 * 「排序到底作用在变换前还是变换后」—— 而那正是 `@virt-table-pro/pivot` 赖以成立的前提。
 *
 * 写法说明见 AGENTS.md §5.1；这条钩子的设计取舍见 `plugin.ts` 里它自己的注释。
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { VirtTable, type VirtTableOptions } from './index';
import type { VirtTablePlugin } from './plugin';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

type Row = Record<string, any>;

/** 合计行文本。`footerData` 不在实例公开面上，从 tfoot 的 DOM 读 */
function footerData(table: VirtTable<Row>): string[] {
  const root = (table as unknown as { _rootEl?: HTMLElement })._rootEl;
  const cells = root?.querySelectorAll('tfoot td') ?? [];
  return [...cells].map((td) => td.textContent ?? '');
}

/** 明细：两个大区各两行 */
const DETAIL: Row[] = [
  { id: 1, region: 'east', amount: 300 },
  { id: 2, region: 'south', amount: 1200 },
  { id: 3, region: 'east', amount: 900 },
  { id: 4, region: 'south', amount: 100 },
];

/** 把明细按 region 聚合成两行 —— 一个最小的「透视」 */
function aggregate(rows: Row[]): Row[] {
  const byRegion = new Map<string, number>();
  for (const r of rows) byRegion.set(r.region, (byRegion.get(r.region) ?? 0) + r.amount);
  return [...byRegion].map(([region, amount], i) => ({ id: `g${i}`, region, amount }));
}

/** 一个只做源变换的插件 */
function transformPlugin(name: string, fn: (rows: Row[]) => Row[]): VirtTablePlugin<Row> {
  return {
    name,
    setup: (ctx) => {
      ctx.on('transformSourceRows', fn);
    },
  };
}

/**
 * 「当前展示列表」只在 `PluginContext` 上（`ctx.getList()`）—— 实例上没有公开读法。
 * 所以观测口是一个探针插件，**装在被测插件之后**（钩子按注册顺序跑，探针要看到最终结果）。
 */
function mount(
  plugins: VirtTablePlugin<Row>[] = [],
  extra: Partial<VirtTableOptions<Row>> = {},
) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  let read: () => Row[] = () => [];
  const probe: VirtTablePlugin<Row> = {
    name: 'probe',
    setup: (ctx) => {
      read = () => ctx.getList();
    },
  };
  const table = new VirtTable<Row>(box, {
    list: DETAIL,
    columns: [
      { key: 'region', title: '大区', width: 120, sortable: true },
      { key: 'amount', title: '金额', width: 120, sortable: true },
    ],
    itemKey: 'id',
    estimatedSize: 40,
    fixedSize: true,
    buffer: 0,
    renderControl: () => ({ begin: 0, end: 9 }),
    plugins: [...plugins, probe],
    ...extra,
  } as VirtTableOptions<Row>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  return { table, box, displayed: (): Row[] => read() };
}

describe('transformSourceRows — 基本语义', () => {
  it('没有插件注册时完全短路，行集原样', () => {
    const { displayed } = mount();
    expect(displayed()).toBe(DETAIL);
  });

  it('返回值取代 _originList', () => {
    const { displayed } = mount([transformPlugin('agg', aggregate)]);
    expect(displayed().map((r) => [r.region, r.amount])).toEqual([
      ['east', 1200],
      ['south', 1300],
    ]);
  });

  it('不动使用方的原始数组', () => {
    const before = DETAIL.map((r) => ({ ...r }));
    mount([transformPlugin('agg', aggregate)]);
    expect(DETAIL).toEqual(before);
  });

  it('多个插件按注册顺序串联（前一个的返回值是后一个的入参）', () => {
    const seen: number[] = [];
    const { displayed } = mount([
      transformPlugin('first', (rows) => {
        seen.push(rows.length);
        return aggregate(rows);
      }),
      transformPlugin('second', (rows) => {
        seen.push(rows.length);
        return rows.filter((r) => r.region === 'east');
      }),
    ]);
    expect(seen).toEqual([4, 2]); // 第一环拿到 4 行明细，第二环拿到 2 行聚合结果
    expect(displayed()).toHaveLength(1);
  });
});

describe('transformSourceRows — 在管线里的位置', () => {
  it('排序作用在**变换之后**（否则透视包压根不成立）', () => {
    const { table, displayed } = mount([transformPlugin('agg', aggregate)]);
    table.sort('amount', 'desc');
    // 聚合结果是 east 1200 / south 1300 → 倒序后 south 在前。
    // 若排序发生在变换之前，排的是明细行（1200/900/300/100），聚合再跑一遍结果顺序不变
    expect(displayed().map((r) => r.region)).toEqual(['south', 'east']);
  });

  it('列头筛选作用在变换之后', () => {
    const { table, displayed } = mount([transformPlugin('agg', aggregate)]);
    table.setColumnFilter('region', ['east']);
    expect(displayed()).toHaveLength(1);
    expect(displayed()[0].amount).toBe(1200); // 是聚合值，不是某一行明细
  });

  it('合计行统计的是变换之后的行', () => {
    const { table, displayed } = mount([transformPlugin('agg', aggregate)], {
      showSummary: true,
      columns: [
        { key: 'region', title: '大区', width: 120 },
        { key: 'amount', title: '金额', width: 120, summary: 'sum' },
      ],
    });
    // 1200 + 1300 = 2500。同时看行数：只有 2 行才说明统计对象是聚合结果而非 4 行明细
    expect(displayed()).toHaveLength(2);
    const footer = footerData(table);
    expect(footer.join('|')).toContain('2500');
  });

  it('客户端分页切的是变换之后的行', () => {
    const { displayed } = mount([transformPlugin('agg', aggregate)], {
      pagination: { pageSize: 1 },
    });
    // 聚合出 2 行，每页 1 行 → 第一页只有 east
    expect(displayed()).toHaveLength(1);
    expect(displayed()[0].region).toBe('east');
  });

  it('换数据后变换重新跑（setList 走的是同一个枢纽）', () => {
    const { table, displayed } = mount([transformPlugin('agg', aggregate)]);
    expect(displayed()).toHaveLength(2);
    table.setList([{ id: 9, region: 'west', amount: 50 }]);
    expect(displayed().map((r) => r.region)).toEqual(['west']);
  });
});

describe('transformSourceRows — 返回树 + 树形列 = 折叠展开白拿', () => {
  /** 聚合成「大区 → 明细」两层树 */
  const toTree = (rows: Row[]): Row[] => {
    const byRegion = new Map<string, Row[]>();
    for (const r of rows) {
      const bucket = byRegion.get(r.region);
      if (bucket) bucket.push(r);
      else byRegion.set(r.region, [r]);
    }
    return [...byRegion].map(([region, kids]) => ({
      id: `g:${region}`,
      region,
      amount: kids.reduce((n, k) => n + k.amount, 0),
      children: kids,
    }));
  };

  const mountTree = () =>
    mount([transformPlugin('tree', toTree)], {
      columns: [
        // 关键的一行：树形列在，核心才会展开 children 并给折叠箭头
        { key: 'region', title: '大区', width: 160, type: 'tree' },
        { key: 'amount', title: '金额', width: 120 },
      ],
      // 默认折叠，先只看到两个大区
      defaultExpandAll: false,
    });

  it('默认折叠时只有顶层，展开后出现明细', () => {
    const { table, displayed } = mountTree();
    expect(displayed().map((r) => r.id)).toEqual(['g:east', 'g:south']);

    table.toggleFold('g:east');
    expect(displayed().map((r) => r.id)).toEqual(['g:east', 1, 3, 'g:south']);

    table.toggleFold('g:east');
    expect(displayed().map((r) => r.id)).toEqual(['g:east', 'g:south']);
  });

  it('没有树形列时 children 不展开（这条是刻意的，不是漏）', () => {
    const { displayed } = mount([transformPlugin('tree', toTree)]);
    expect(displayed().map((r) => r.id)).toEqual(['g:east', 'g:south']);
  });

  it('折叠一下会再调一次变换 —— 所以贵的计算必须自己缓存', () => {
    let calls = 0;
    const { table } = mount([
      transformPlugin('count', (rows) => {
        calls += 1;
        return toTree(rows);
      }),
    ], {
      columns: [
        { key: 'region', title: '大区', width: 160, type: 'tree' },
        { key: 'amount', title: '金额', width: 120 },
      ],
    });
    const afterMount = calls;
    table.toggleFold('g:east');
    // 这条断言写的是**现状而非理想**：折叠只改展开阶段，但管线是整条重跑的。
    // 插件侧要按「入参引用 + 自己的配置」记缓存，十万行才不会在每次折叠时重算
    expect(calls).toBeGreaterThan(afterMount);
  });
});

describe('transformSourceRows — 坏插件不连坐', () => {
  it('抛异常：跳过这一环，保留上一环的结果', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { displayed } = mount([
      transformPlugin('agg', aggregate),
      transformPlugin('boom', () => {
        throw new Error('boom');
      }),
    ]);
    expect(displayed()).toHaveLength(2); // 仍是第一环的聚合结果
    expect(err.mock.calls.flat().join(' ')).toContain('transformSourceRows');
  });

  it('忘了 return（拿到 undefined）：跳过并告警，而不是把表变空', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { displayed } = mount([
      transformPlugin('forgot', (() => undefined) as unknown as (rows: Row[]) => Row[]),
    ]);
    expect(displayed()).toHaveLength(4); // 原样 4 行明细
    expect(warn.mock.calls.flat().join(' ')).toContain('必须返回数组');
  });

  it('返回空数组是合法的（那是「筛掉了全部行」，不是错误）', () => {
    const { displayed } = mount([transformPlugin('none', () => [])]);
    expect(displayed()).toEqual([]);
  });

  it('setup 里抛异常的插件不影响别人的变换', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { displayed } = mount([
      {
        name: 'bad',
        setup: () => {
          throw new Error('setup failed');
        },
      },
      transformPlugin('agg', aggregate),
    ]);
    expect(displayed()).toHaveLength(2);
  });
});

describe('transformSourceRows — 销毁', () => {
  it('destroy 之后钩子表清空（不会留下指向旧表的闭包）', () => {
    let calls = 0;
    const box = document.createElement('div');
    document.body.appendChild(box);
    const table = new VirtTable<Row>(box, {
      list: DETAIL,
      columns: [{ key: 'region', title: '大区', width: 120 }],
      itemKey: 'id',
      estimatedSize: 40,
      plugins: [
        transformPlugin('count', (rows) => {
          calls += 1;
          return rows;
        }),
      ],
    } as VirtTableOptions<Row>);
    expect(calls).toBeGreaterThan(0);

    table.destroy();
    const afterDestroy = calls;
    // destroy 之后再动数据不该再调到那个闭包（PluginRuntime.destroy 清了钩子表）
    table.setList?.([{ id: 1, region: 'x' }]);
    expect(calls).toBe(afterDestroy);
    box.remove();
  });
});

describe('getSourceRowCount：筛选前的行数', () => {
  /** 一张普通表（不带任何源变换），返回实例与**传进去的那个 options 对象**本身 */
  function mountPlain() {
    const box = document.createElement('div');
    document.body.appendChild(box);
    const options = {
      list: [...DETAIL, { id: 5, region: 'east', amount: 50 }, { id: 6, region: 'south', amount: 60 }],
      columns: [
        { key: 'id', title: 'ID', width: 80 },
        { key: 'region', title: '大区', width: 100, filters: [
          { label: 'east', value: 'east' },
          { label: 'south', value: 'south' },
        ] },
        { key: 'amount', title: '金额', width: 100 },
      ],
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
    } as VirtTableOptions<Row>;
    let read: () => Row[] = () => [];
    (options as VirtTableOptions<Row>).plugins = [
      { name: 'probe', setup: (ctx) => { read = () => ctx.getList(); } },
    ];
    const table = new VirtTable<Row>(box, options);
    cleanups.push(() => {
      table.destroy();
      box.remove();
    });
    return { table, options, displayed: () => read() };
  }

  it('起手等于 options.list 的长度', () => {
    const { table } = mountPlain();
    expect(table.getSourceRowCount()).toBe(6);
  });

  it('筛掉一部分后**不变**（getList() 才跟着变）', () => {
    const { table, displayed } = mountPlain();
    table.setColumnFilter('region', ['east']);
    expect(displayed().length).toBeLessThan(6);
    expect(table.getSourceRowCount()).toBe(6);
  });

  it('这正是 options.list 不能当源数据用的原因', () => {
    const { table, options } = mountPlain();
    table.setColumnFilter('region', ['east']);
    // 核心把 options.list 改写成了展示列表 —— 读它拿到的是筛后的长度
    expect((options.list ?? []).length).not.toBe(6);
    expect(table.getSourceRowCount()).toBe(6);
  });

  it('setList 后跟着换', () => {
    const { table } = mountPlain();
    table.setList([{ id: 99, region: 'east', amount: 1 }]);
    expect(table.getSourceRowCount()).toBe(1);
  });

  it('appendRows / prependRows 都算进去', () => {
    const { table } = mountPlain();
    table.appendRows([{ id: 7, region: 'east', amount: 1 }]);
    table.prependRows([{ id: 0, region: 'south', amount: 1 }]);
    expect(table.getSourceRowCount()).toBe(8);
  });

  it('树形数据算顶层行数，不含展开出来的子行', () => {
    const box = document.createElement('div');
    document.body.appendChild(box);
    const table = new VirtTable<Row>(box, {
      list: [
        { id: 1, region: 'east', children: [{ id: 11, region: 'east' }, { id: 12, region: 'east' }] },
        { id: 2, region: 'south' },
      ],
      columns: [
        { key: 'id', title: 'ID', width: 80, type: 'tree' },
        { key: 'region', title: '大区', width: 100 },
      ],
      itemKey: 'id',
      estimatedSize: 40,
      defaultExpandAll: true,
    } as VirtTableOptions<Row>);
    expect(table.getSourceRowCount()).toBe(2);
    table.destroy();
    box.remove();
  });

  it('transformSourceRows 换掉行集也不影响它 —— 它读的是变换**之前**那份', () => {
    const box = document.createElement('div');
    document.body.appendChild(box);
    const table = new VirtTable<Row>(box, {
      list: DETAIL,
      columns: [{ key: 'id', title: 'ID', width: 80 }],
      itemKey: 'id',
      estimatedSize: 40,
      plugins: [transformPlugin('halve', (rows) => rows.slice(0, 1))],
    } as VirtTableOptions<Row>);
    expect(table.getSourceRowCount()).toBe(4);
    table.destroy();
    box.remove();
  });
});


describe('setColumns · 数据管线配置快照', () => {
  it.each([false, true])('同 key 更换比较器后立即重排（原地修改=%s）', (mutate) => {
    const { table, displayed } = mount();
    table.sort('amount', 'asc');
    const cols = table.getAllColumns();
    const next = mutate ? cols : cols.map(c => ({...c}));
    next.find(c => c.key === 'amount')!.sortMethod = (a,b) => b.amount-a.amount;
    table.setColumns(next);
    expect(displayed().map(r => r.amount)).toEqual([1200,900,300,100]);
  });

  it('原地换 filterMethod 会重新筛选', () => {
    const { table, displayed } = mount();
    table.setColumnFilter('amount', [300]);
    const cols = table.getAllColumns();
    cols.find(c => c.key === 'amount')!.filterMethod = (_v,row) => row.amount > 500;
    table.setColumns(cols);
    expect(displayed().map(r => r.amount)).toEqual([1200,900]);
  });

  it('同 key 更换 filterType 会更新已有条件', () => {
    const { table, displayed } = mount();
    table.setColumnFilter('region', ['ea']);
    expect(displayed()).toHaveLength(0);
    const cols = table.getAllColumns();
    cols[0].filterType = 'text';
    table.setColumns(cols);
    expect(displayed()).toHaveLength(2);
  });

  it('重提交相同配置和仅修改宽度不重跑管线，数据钩子可安全重提列', () => {
    let changes = 0;
    const listener: VirtTablePlugin<Row> = { name: 'resubmit', setup(ctx) {
      ctx.on('onDataChanged', () => { changes++; ctx.table.setColumns(ctx.table.getAllColumns()); });
    }};
    const { table } = mount([listener]);
    table.sort('amount', 'asc');
    expect(changes).toBe(1);
    const cols = table.getAllColumns();
    cols[0].width = 300;
    table.setColumns(cols);
    expect(changes).toBe(1);
  });
});
