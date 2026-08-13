/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PluginRuntime,
  type PluginDomRefs,
  type PluginStateAccessors,
  type VirtTableHost,
  type VirtTablePlugin,
} from './plugin';

type Row = Record<string, any>;

/** DOM 引用只是原样透传给插件，测试里不需要真实节点 */
const domStub = {
  rootEl: { tag: 'root' },
  clientEl: { tag: 'client' },
  tableEl: { tag: 'table' },
  theadEl: { tag: 'thead' },
  tbodyEl: { tag: 'tbody' },
  tfootEl: { tag: 'tfoot' },
} as unknown as PluginDomRefs;

const hostStub = { getCellSelection: () => null } as unknown as VirtTableHost<Row>;

function makeState(overrides: Partial<PluginStateAccessors<Row>> = {}): PluginStateAccessors<Row> {
  return {
    getOptions: () => ({ columns: [] }) as any,
    getColumns: () => [],
    getList: () => [],
    getRowData: () => undefined,
    resolveCellRender: () => ({}),
    getLocale: () => ({}) as any,
    ...overrides,
  };
}

function makeRuntime(state = makeState()): PluginRuntime<Row> {
  return new PluginRuntime<Row>(hostStub, domStub, state);
}

/** 记录安装顺序的探针插件 */
function probe(
  name: string,
  order: string[],
  extra: Partial<VirtTablePlugin<Row>> = {},
): VirtTablePlugin<Row> {
  return {
    name,
    setup: () => {
      order.push(name);
    },
    ...extra,
  };
}

let warn: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  error = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
  error.mockRestore();
});

describe('PluginRuntime — 安装', () => {
  it('按声明顺序安装并合并 api', () => {
    const order: string[] = [];
    const rt = makeRuntime();
    const api = rt.setup(
      [
        probe('a', order, { setup: () => ({ api: { doA: () => 'A' } }) }),
        probe('b', order, { setup: () => ({ api: { doB: () => 'B' } }) }),
      ],
      new Set(),
    );

    expect(Object.keys(api).sort()).toEqual(['doA', 'doB']);
    expect(api.doA()).toBe('A');
    expect(api.doB()).toBe('B');
  });

  it('setup 返回 void 的插件也算安装成功', () => {
    const order: string[] = [];
    const rt = makeRuntime();
    const api = rt.setup([probe('a', order)], new Set());
    expect(order).toEqual(['a']);
    expect(api).toEqual({});
  });

  it('忽略缺少 name / setup 的非法插件并告警', () => {
    const rt = makeRuntime();
    rt.setup([{ name: '', setup: () => {} } as any, { name: 'x' } as any], new Set());
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('同名插件只装第一个', () => {
    const order: string[] = [];
    const rt = makeRuntime();
    rt.setup(
      [
        { name: 'dup', setup: () => { order.push('first'); } },
        { name: 'dup', setup: () => { order.push('second'); } },
      ],
      new Set(),
    );
    expect(order).toEqual(['first']);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('单个插件 setup 抛错不影响其它插件', () => {
    const order: string[] = [];
    const rt = makeRuntime();
    rt.setup(
      [
        { name: 'bad', setup: () => { throw new Error('boom'); } },
        probe('good', order),
      ],
      new Set(),
    );
    expect(order).toEqual(['good']);
    expect(error).toHaveBeenCalledOnce();
  });
});

describe('PluginRuntime — 依赖', () => {
  it('依赖缺失时跳过该插件并告警', () => {
    const order: string[] = [];
    const rt = makeRuntime();
    rt.setup([probe('needy', order, { requires: ['absent'] })], new Set());
    expect(order).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('声明顺序颠倒时按依赖拓扑排序修正', () => {
    const order: string[] = [];
    const rt = makeRuntime();
    // dependent 声明在前，但依赖 base → base 必须先装
    rt.setup(
      [probe('dependent', order, { requires: ['base'] }), probe('base', order)],
      new Set(),
    );
    expect(order).toEqual(['base', 'dependent']);
    expect(warn).not.toHaveBeenCalled();
  });

  it('依赖链多级时保持传递顺序', () => {
    const order: string[] = [];
    const rt = makeRuntime();
    rt.setup(
      [
        probe('c', order, { requires: ['b'] }),
        probe('b', order, { requires: ['a'] }),
        probe('a', order),
      ],
      new Set(),
    );
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('依赖成环时不抛异常，环内插件全部跳过并告警', () => {
    const order: string[] = [];
    const rt = makeRuntime();
    expect(() =>
      rt.setup(
        [
          probe('x', order, { requires: ['y'] }),
          probe('y', order, { requires: ['x'] }),
        ],
        new Set(),
      ),
    ).not.toThrow();
    // 环内依赖无法满足 → 全部跳过（而不是随意挑一个装，后者行为不可预测）
    expect(order).toEqual([]);
    expect(warn).toHaveBeenCalled();
  });

  it('成环插件不影响环外插件安装', () => {
    const order: string[] = [];
    const rt = makeRuntime();
    rt.setup(
      [
        probe('x', order, { requires: ['y'] }),
        probe('y', order, { requires: ['x'] }),
        probe('free', order),
      ],
      new Set(),
    );
    expect(order).toEqual(['free']);
  });
});

describe('PluginRuntime — api 冲突', () => {
  it('与核心方法同名时拒绝并告警', () => {
    const rt = makeRuntime();
    const api = rt.setup(
      [{ name: 'p', setup: () => ({ api: { setList: () => 'hijack' } }) }],
      new Set(['setList']),
    );
    expect(api.setList).toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
  });

  it('插件之间同名时保留先安装的', () => {
    const rt = makeRuntime();
    const api = rt.setup(
      [
        { name: 'first', setup: () => ({ api: { shared: () => 1 } }) },
        { name: 'second', setup: () => ({ api: { shared: () => 2 } }) },
      ],
      new Set(),
    );
    expect(api.shared()).toBe(1);
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe('PluginRuntime — provide / inject', () => {
  it('后装插件能取到先装插件提供的服务', () => {
    const rt = makeRuntime();
    let injected: unknown;
    rt.setup(
      [
        {
          name: 'provider',
          setup: (ctx) => {
            ctx.provide('sel', { getRange: () => 'range' });
          },
        },
        {
          name: 'consumer',
          requires: ['provider'],
          setup: (ctx) => {
            injected = ctx.inject<{ getRange: () => string }>('sel')?.getRange();
          },
        },
      ],
      new Set(),
    );
    expect(injected).toBe('range');
  });

  it('未注册的服务 inject 得到 undefined', () => {
    const rt = makeRuntime();
    let injected: unknown = 'untouched';
    rt.setup(
      [{ name: 'solo', setup: (ctx) => { injected = ctx.inject('nope'); } }],
      new Set(),
    );
    expect(injected).toBeUndefined();
  });

  it('服务名与插件名不共享命名空间（provide 不能伪造 requires）', () => {
    const order: string[] = [];
    const rt = makeRuntime();
    rt.setup(
      [
        { name: 'faker', setup: (ctx) => { ctx.provide('ghost', true); } },
        probe('needy', order, { requires: ['ghost'] }),
      ],
      new Set(),
    );
    expect(order).toEqual([]);
  });

  it('重复 provide 同名服务时告警且后者生效', () => {
    const rt = makeRuntime();
    let injected: unknown;
    rt.setup(
      [
        { name: 'a', setup: (ctx) => { ctx.provide('svc', 1); } },
        { name: 'b', setup: (ctx) => { ctx.provide('svc', 2); } },
        { name: 'c', setup: (ctx) => { injected = ctx.inject('svc'); } },
      ],
      new Set(),
    );
    expect(injected).toBe(2);
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe('PluginRuntime — 上下文', () => {
  it('DOM 引用与状态读取器原样透传', () => {
    const state = makeState({
      getColumns: () => [{ key: 'a', title: 'A', width: 100 }],
      getRowData: (key) => (key === 'r1' ? { item: { id: 'r1' }, rowIndex: 3 } : undefined),
    });
    const rt = makeRuntime(state);
    let seen: any = null;
    rt.setup(
      [
        {
          name: 'peek',
          setup: (ctx) => {
            seen = {
              tbody: ctx.tbodyEl,
              cols: ctx.getColumns(),
              row: ctx.getRowData('r1'),
              miss: ctx.getRowData('r2'),
              host: ctx.table,
            };
          },
        },
      ],
      new Set(),
    );
    expect(seen.tbody).toBe(domStub.tbodyEl);
    expect(seen.cols[0].key).toBe('a');
    expect(seen.row).toEqual({ item: { id: 'r1' }, rowIndex: 3 });
    expect(seen.miss).toBeUndefined();
    expect(seen.host).toBe(hostStub);
  });

  it('状态读取取的是当前快照，不是安装时的值', () => {
    let list: Row[] = [{ id: 1 }];
    const rt = makeRuntime(makeState({ getList: () => list }));
    let read: (() => Row[]) | null = null;
    rt.setup([{ name: 'p', setup: (ctx) => { read = () => ctx.getList(); } }], new Set());

    expect(read!()).toEqual([{ id: 1 }]);
    list = [{ id: 2 }, { id: 3 }];
    expect(read!()).toHaveLength(2);
  });
});

describe('PluginRuntime — 钩子', () => {
  it('热路径标志随注册情况变化', () => {
    const rt = makeRuntime();
    expect(rt.hasRowHooks).toBe(false);
    expect(rt.hasCellHooks).toBe(false);
    expect(rt.hasHeaderCellHooks).toBe(false);

    rt.setup(
      [
        {
          name: 'p',
          setup: (ctx) => {
            ctx.on('onRowCreated', () => {});
            ctx.on('onCellRendered', () => {});
          },
        },
      ],
      new Set(),
    );

    expect(rt.hasRowHooks).toBe(true);
    expect(rt.hasCellHooks).toBe(true);
    // 没注册的钩子不应被误报（否则核心会为空数组白跑热路径）
    expect(rt.hasHeaderCellHooks).toBe(false);
  });

  it('同名钩子多插件注册时按注册顺序全部触发', () => {
    const calls: string[] = [];
    const rt = makeRuntime();
    rt.setup(
      [
        { name: 'a', setup: (ctx) => { ctx.on('onDataChanged', () => calls.push('a')); } },
        { name: 'b', setup: (ctx) => { ctx.on('onDataChanged', () => calls.push('b')); } },
      ],
      new Set(),
    );
    rt.emitDataChanged([]);
    expect(calls).toEqual(['a', 'b']);
  });

  it('各钩子把参数原样传给回调', () => {
    const rt = makeRuntime();
    const row = vi.fn();
    const cell = vi.fn();
    const header = vi.fn();
    const scroll = vi.fn();
    const cols = vi.fn();
    const locale = vi.fn();
    const mounted = vi.fn();
    rt.setup(
      [
        {
          name: 'p',
          setup: (ctx) => {
            ctx.on('onRowCreated', row);
            ctx.on('onCellRendered', cell);
            ctx.on('onHeaderCellRendered', header);
            ctx.on('onScroll', scroll);
            ctx.on('onColumnsChanged', cols);
            ctx.on('onLocaleChanged', locale);
            ctx.on('onMounted', mounted);
          },
        },
      ],
      new Set(),
    );

    const tr = { t: 'tr' } as any;
    const td = { t: 'td' } as any;
    const th = { t: 'th' } as any;
    const col = { key: 'a', title: 'A', width: 1 } as any;
    const item = { id: 1 };

    rt.emitMounted();
    rt.emitRowCreated(tr, item, 7);
    rt.emitCellRendered(td, col, item, 7);
    rt.emitHeaderCellRendered(th, col, 1);
    rt.emitScroll(120, 340);
    rt.emitColumnsChanged();
    rt.emitLocaleChanged({} as any);

    expect(mounted).toHaveBeenCalledOnce();
    expect(row).toHaveBeenCalledWith(tr, item, 7);
    expect(cell).toHaveBeenCalledWith(td, col, item, 7);
    expect(header).toHaveBeenCalledWith(th, col, 1);
    expect(scroll).toHaveBeenCalledWith(120, 340);
    expect(cols).toHaveBeenCalledOnce();
    expect(locale).toHaveBeenCalledOnce();
  });
});

describe('PluginRuntime — 销毁', () => {
  it('按安装逆序卸载（依赖方先走）', () => {
    const order: string[] = [];
    const rt = makeRuntime();
    rt.setup(
      [
        { name: 'base', setup: () => ({ destroy: () => order.push('base') }) },
        {
          name: 'dependent',
          requires: ['base'],
          setup: () => ({ destroy: () => order.push('dependent') }),
        },
      ],
      new Set(),
    );
    rt.destroy();
    expect(order).toEqual(['dependent', 'base']);
  });

  it('单个插件 destroy 抛错不阻断其余卸载', () => {
    const order: string[] = [];
    const rt = makeRuntime();
    rt.setup(
      [
        { name: 'a', setup: () => ({ destroy: () => order.push('a') }) },
        { name: 'bad', setup: () => ({ destroy: () => { throw new Error('boom'); } }) },
      ],
      new Set(),
    );
    rt.destroy();
    expect(order).toEqual(['a']);
    expect(error).toHaveBeenCalledOnce();
  });

  it('销毁后钩子不再触发、服务被清空', () => {
    const hook = vi.fn();
    const rt = makeRuntime();
    rt.setup(
      [
        {
          name: 'p',
          setup: (ctx) => {
            ctx.provide('svc', 1);
            ctx.on('onDataChanged', hook);
          },
        },
      ],
      new Set(),
    );
    rt.destroy();
    rt.emitDataChanged([]);
    expect(hook).not.toHaveBeenCalled();
    expect(rt.hasRowHooks).toBe(false);
  });

  it('重复 destroy 不抛异常', () => {
    const rt = makeRuntime();
    rt.setup([{ name: 'p', setup: () => ({ destroy: () => {} }) }], new Set());
    rt.destroy();
    expect(() => rt.destroy()).not.toThrow();
  });
});

describe('PluginRuntime — onRendered 钩子', () => {
  it('注册后 hasRowHooks 不受影响（两个钩子互不干扰）', () => {
    const rt = makeRuntime();
    rt.setup(
      [{ name: 'p', setup: (ctx) => { ctx.on('onRendered', () => {}); } }],
      new Set(),
    );
    expect(rt.hasRowHooks).toBe(false);
    expect(rt.hasCellHooks).toBe(false);
  });

  it('emitRendered 按注册顺序触发全部回调', () => {
    const calls: string[] = [];
    const rt = makeRuntime();
    rt.setup(
      [
        { name: 'a', setup: (ctx) => { ctx.on('onRendered', () => calls.push('a')); } },
        { name: 'b', setup: (ctx) => { ctx.on('onRendered', () => calls.push('b')); } },
      ],
      new Set(),
    );
    rt.emitRendered();
    expect(calls).toEqual(['a', 'b']);
  });

  it('销毁后 onRendered 不再触发', () => {
    const hook = vi.fn();
    const rt = makeRuntime();
    rt.setup([{ name: 'p', setup: (ctx) => { ctx.on('onRendered', hook); } }], new Set());
    rt.destroy();
    rt.emitRendered();
    expect(hook).not.toHaveBeenCalled();
  });
});

describe('PluginRuntime — 插件间服务链（框选 → 剪贴板/键盘导航）', () => {
  it('requires 保证被依赖方先装载，inject 拿到服务', () => {
    const order: string[] = [];
    const rt = makeRuntime();
    let injected: unknown;
    rt.setup(
      [
        // 声明顺序刻意颠倒，验证拓扑排序
        {
          name: 'vtKeyboardNav',
          requires: ['vtCellSelection'],
          setup: (ctx) => {
            order.push('nav');
            injected = ctx.inject('cellSelection');
          },
        },
        {
          name: 'vtCellSelection',
          setup: (ctx) => {
            order.push('sel');
            ctx.provide('cellSelection', { getSelection: () => null });
          },
        },
      ],
      new Set(),
    );
    expect(order).toEqual(['sel', 'nav']);
    expect(injected).toBeDefined();
  });

  it('框选缺失时 requires 它的插件被跳过，可选 inject 的插件仍安装', () => {
    const order: string[] = [];
    const rt = makeRuntime();
    let optional: unknown = 'untouched';
    rt.setup(
      [
        { name: 'vtClipboard', requires: ['vtCellSelection'], setup: () => { order.push('clip'); } },
        {
          name: 'vtExport',
          setup: (ctx) => {
            order.push('export');
            optional = ctx.inject('cellSelection');
          },
        },
      ],
      new Set(),
    );
    expect(order).toEqual(['export']);   // clipboard 被跳过
    expect(optional).toBeUndefined();     // export 装上了，只是拿不到服务
  });
});
