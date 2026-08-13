// @vitest-environment happy-dom
/** vtAIColumn：只算可见窗口、并发闸门、滚走取消、流式写入。写法说明见 AGENTS.md §5.1 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { VirtTable, type VirtTableOptions } from '../index';
import { vtAIColumn } from './ai-column';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

type Row = Record<string, any>;

const ROWS = 200;
const list: Row[] = Array.from({ length: ROWS }, (_, i) => ({ id: i, name: `行${i}` }));

/** 用 renderControl 钉住渲染窗口 = 钉住「可见集合」，这正是本插件的调度依据 */
function mount(opts: any, window0: { begin: number; end: number } = { begin: 0, end: 4 }) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  let win = window0;
  const table = new VirtTable<Row>(box, {
    list: list.slice(),
    columns: [{ key: 'name', title: '名称', width: 120 }],
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 0,
    fixedSize: true,
    renderControl: () => win,
    plugins: [vtAIColumn({ column: { key: 'ai', title: 'AI', width: 200 }, ...opts })],
  } as VirtTableOptions<Row>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  /** 移动渲染窗口 = 模拟滚动 */
  const scrollTo = (begin: number, end: number) => {
    win = { begin, end };
    table.forceUpdate();
  };
  return { box, table, scrollTo };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

const aiCells = (box: HTMLElement): string[] =>
  [...box.querySelectorAll<HTMLElement>('tbody td[data-col-key="ai"]')].map(
    (td) => td.textContent?.trim() ?? '',
  );

describe('vtAIColumn 建列与渲染', () => {
  it('自动把 AI 列追加到列树末尾', () => {
    const { box } = mount({ compute: async () => 'x', auto: false });
    const heads = [...box.querySelectorAll<HTMLElement>('thead th[data-col-key]')].map(
      (th) => th.dataset.colKey,
    );
    expect(heads).toEqual(['name', 'ai']);
  });

  it('列已存在时接管它而不是重复插入', () => {
    const box = document.createElement('div');
    document.body.appendChild(box);
    const table = new VirtTable<Row>(box, {
      list: list.slice(),
      columns: [
        { key: 'ai', title: 'AI 摘要', width: 200 },
        { key: 'name', title: '名称', width: 120 },
      ],
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      renderControl: () => ({ begin: 0, end: 2 }),
      plugins: [vtAIColumn({ column: { key: 'ai', title: 'AI', width: 200 }, compute: async () => 'x', auto: false })],
    } as VirtTableOptions<Row>);
    cleanups.push(() => {
      table.destroy();
      box.remove();
    });
    const heads = [...box.querySelectorAll<HTMLElement>('thead th[data-col-key]')].map(
      (th) => th.dataset.colKey,
    );
    expect(heads).toEqual(['ai', 'name']); // 位置保持用户定的，没被挪到末尾
  });

  it('auto: false 时单元格留空且不发起计算', async () => {
    const compute = vi.fn(async () => 'x');
    const { box } = mount({ compute, auto: false });
    await settle();
    expect(compute).not.toHaveBeenCalled();
    expect(aiCells(box).every((t) => t === '')).toBe(true);
  });

  it('算完把文本写进单元格', async () => {
    const { box } = mount({ compute: async (row: Row) => `摘要:${row.name}` });
    await settle();
    expect(aiCells(box)[0]).toBe('摘要:行0');
  });
});

describe('vtAIColumn 构造期不发起计算', () => {
  it('compute 不在 new VirtTable() 返回前被调用（否则使用方的 const 还在 TDZ）', async () => {
    const seen: boolean[] = [];
    const box = document.createElement('div');
    document.body.appendChild(box);
    let instance: VirtTable<Row> | undefined;
    const table = new VirtTable<Row>(box, {
      list: list.slice(),
      columns: [{ key: 'name', title: '名称', width: 120 }],
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      renderControl: () => ({ begin: 0, end: 4 }),
      plugins: [
        vtAIColumn({
          column: { key: 'ai', title: 'AI', width: 200 },
          compute: () => {
            // 被调用时实例必须已经赋值过了
            seen.push(instance !== undefined);
            return 'x';
          },
        }),
      ],
    } as VirtTableOptions<Row>);
    // 构造函数返回时一次都还没调用过 —— 这正是闸门要保证的
    expect(seen).toEqual([]);
    instance = table;
    cleanups.push(() => {
      table.destroy();
      box.remove();
    });

    await settle();
    // 之后才开算，且每次调用时实例都已就绪
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every(Boolean)).toBe(true);
  });

  it('闸门只延后首帧，不影响后续滚动触发', async () => {
    const compute = vi.fn(async () => 'x');
    const { scrollTo } = mount({ compute });
    await settle();
    expect(compute).toHaveBeenCalledTimes(5);
    scrollTo(20, 24);
    await settle();
    expect(compute).toHaveBeenCalledTimes(10);
  });
});

describe('vtAIColumn 只为可见窗口付钱', () => {
  it('200 行只对渲染窗口内的 5 行发起计算', async () => {
    const compute = vi.fn(async () => 'x');
    mount({ compute });
    await settle();
    expect(compute).toHaveBeenCalledTimes(5);
  });

  it('滚动到新窗口只补算新进来的行', async () => {
    const compute = vi.fn(async () => 'x');
    const { scrollTo } = mount({ compute });
    await settle();
    expect(compute).toHaveBeenCalledTimes(5);

    scrollTo(3, 7); // 3、4 已算过，只需补 5、6、7
    await settle();
    expect(compute).toHaveBeenCalledTimes(8);
  });

  it('滚回已算过的行走缓存，不重复调用', async () => {
    const compute = vi.fn(async () => 'x');
    const { scrollTo } = mount({ compute });
    await settle();
    scrollTo(10, 14);
    await settle();
    const afterScroll = compute.mock.calls.length;
    scrollTo(0, 4); // 回到最初那批
    await settle();
    expect(compute).toHaveBeenCalledTimes(afterScroll);
  });

  it('visibleOnly: false + computeAIColumn 显式传 key 可算窗口外的行', async () => {
    const compute = vi.fn(async () => 'x');
    const { table } = mount({ compute, auto: false, visibleOnly: false });
    table.computeAIColumn(['100', '101']);
    await settle();
    expect(compute).toHaveBeenCalledTimes(2);
  });
});

describe('vtAIColumn 并发与取消', () => {
  it('在途数不超过 concurrency', async () => {
    let peak = 0;
    let cur = 0;
    const compute = vi.fn(async () => {
      cur++;
      peak = Math.max(peak, cur);
      await new Promise((r) => setTimeout(r, 5));
      cur--;
      return 'x';
    });
    mount({ compute, concurrency: 2 }, { begin: 0, end: 9 });
    await new Promise((r) => setTimeout(r, 60));
    expect(peak).toBeLessThanOrEqual(2);
    expect(compute).toHaveBeenCalledTimes(10);
  });

  it('行滚出视口时 abort 在途请求', async () => {
    const aborted: string[] = [];
    const compute = vi.fn(async (row: Row, { signal }: any) => {
      signal.addEventListener('abort', () => aborted.push(String(row.id)));
      await new Promise((r) => setTimeout(r, 50));
      return 'x';
    });
    const { scrollTo } = mount({ compute }, { begin: 0, end: 2 });
    await settle();
    scrollTo(100, 102); // 0-2 滚走
    await settle();
    expect(aborted.length).toBeGreaterThan(0);
  });

  it('被 abort 的行不写入错误态', async () => {
    const compute = async (_row: Row, { signal }: any) =>
      new Promise<string>((resolve, reject) => {
        const t = setTimeout(() => resolve('x'), 50);
        signal.addEventListener('abort', () => {
          clearTimeout(t);
          const e = new Error('aborted');
          e.name = 'AbortError';
          reject(e);
        });
      });
    const { table, scrollTo } = mount({ compute }, { begin: 0, end: 2 });
    await settle();
    scrollTo(100, 102);
    await new Promise((r) => setTimeout(r, 60));
    expect(table.getAIColumnStats().error).toBe(0);
  });

  it('销毁时中止全部在途请求', async () => {
    let aborts = 0;
    const compute = async (_row: Row, { signal }: any) => {
      signal.addEventListener('abort', () => aborts++);
      await new Promise((r) => setTimeout(r, 50));
      return 'x';
    };
    const { table } = mount({ compute }, { begin: 0, end: 4 });
    await settle();
    table.destroy();
    expect(aborts).toBeGreaterThan(0);
  });
});

describe('vtAIColumn 流式写入', () => {
  it('AsyncIterable 逐段累积进单元格', async () => {
    async function* pieces() {
      yield '这';
      await new Promise((r) => setTimeout(r, 1));
      yield '是';
      await new Promise((r) => setTimeout(r, 1));
      yield '摘要';
    }
    const { box } = mount({ compute: () => pieces() }, { begin: 0, end: 0 });
    await new Promise((r) => setTimeout(r, 30));
    expect(aiCells(box)[0]).toBe('这是摘要');
  });

  it('流式中途也能看到已产出的片段', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    async function* pieces() {
      yield '前半';
      await gate;
      yield '后半';
    }
    const { box, table } = mount({ compute: () => pieces() }, { begin: 0, end: 0 });
    await new Promise((r) => setTimeout(r, 10));
    expect(aiCells(box)[0]).toBe('前半');
    expect(table.getAIColumnState('0')!.status).toBe('computing');
    release();
    await new Promise((r) => setTimeout(r, 10));
    expect(aiCells(box)[0]).toBe('前半后半');
    expect(table.getAIColumnState('0')!.status).toBe('done');
  });
});

describe('vtAIColumn 失败与重试', () => {
  it('失败的格子标错误态并带 title', async () => {
    const { box, table } = mount({ compute: async () => { throw new Error('限流了'); } }, { begin: 0, end: 0 });
    await settle();
    const td = box.querySelector<HTMLElement>('tbody td[data-col-key="ai"]')!;
    expect(td.classList.contains('vt-ai-cell--error')).toBe(true);
    expect(td.title).toContain('限流了');
    expect(table.getAIColumnStats().error).toBe(1);
  });

  it('点失败的格子重试', async () => {
    let n = 0;
    const compute = vi.fn(async () => {
      n++;
      if (n === 1) throw new Error('第一次失败');
      return '成功了';
    });
    const { box } = mount({ compute }, { begin: 0, end: 0 });
    await settle();
    box.querySelector<HTMLElement>('td.vt-ai-cell--error')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await settle();
    expect(aiCells(box)[0]).toBe('成功了');
  });

  it('retryable: false 时点击不重试', async () => {
    const compute = vi.fn(async () => { throw new Error('x'); });
    const { box } = mount({ compute, retryable: false }, { begin: 0, end: 0 });
    await settle();
    const calls = compute.mock.calls.length;
    box.querySelector<HTMLElement>('td.vt-ai-cell--error')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await settle();
    expect(compute).toHaveBeenCalledTimes(calls);
  });

  it('失败的格子不会被自动重排（否则会无限重试烧钱）', async () => {
    const compute = vi.fn(async () => { throw new Error('x'); });
    const { table } = mount({ compute }, { begin: 0, end: 0 });
    await settle();
    table.forceUpdate();
    await settle();
    expect(compute).toHaveBeenCalledTimes(1);
  });
});

describe('vtAIColumn 对外接口', () => {
  it('getAIColumnValues 只给成功的格子', async () => {
    const compute = async (row: Row) => {
      if (row.id === 1) throw new Error('x');
      return `v${row.id}`;
    };
    const { table } = mount({ compute }, { begin: 0, end: 2 });
    await settle();
    const values = table.getAIColumnValues();
    expect(values).toEqual({ '0': 'v0', '2': 'v2' });
  });

  it('值不写回行数据', async () => {
    const { table } = mount({ compute: async () => 'AI 生成' }, { begin: 0, end: 0 });
    await settle();
    expect(table.getAIColumnValues()['0']).toBe('AI 生成');
    expect(list[0].ai).toBeUndefined();
  });

  it('recomputeAIColumn 忽略缓存强制重算', async () => {
    const compute = vi.fn(async () => 'x');
    const { table } = mount({ compute }, { begin: 0, end: 0 });
    await settle();
    expect(compute).toHaveBeenCalledTimes(1);
    table.recomputeAIColumn('0');
    await settle();
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it('clearAIColumn 清单格', async () => {
    const { table } = mount({ compute: async () => 'x' }, { begin: 0, end: 0 });
    await settle();
    table.clearAIColumn('0');
    expect(table.getAIColumnState('0')).toBeUndefined();
  });

  it('clearAIColumn 不传参清全部', async () => {
    const { table } = mount({ compute: async () => 'x' }, { begin: 0, end: 2 });
    await settle();
    expect(Object.keys(table.getAIColumnValues())).toHaveLength(3);
    table.clearAIColumn();
    expect(table.getAIColumnValues()).toEqual({});
  });

  it('onCellChange 报告状态流转', async () => {
    const onCellChange = vi.fn();
    mount({ compute: async () => 'x', onCellChange }, { begin: 0, end: 0 });
    await settle();
    const statuses = onCellChange.mock.calls.map((c) => c[1].status);
    expect(statuses).toContain('computing');
    expect(statuses).toContain('done');
  });

  it('getAIColumnStats 报告计数', async () => {
    const compute = async (row: Row) => {
      if (row.id === 0) throw new Error('x');
      return 'v';
    };
    const { table } = mount({ compute }, { begin: 0, end: 2 });
    await settle();
    expect(table.getAIColumnStats()).toMatchObject({ done: 2, error: 1, inflight: 0, queued: 0 });
  });
});
