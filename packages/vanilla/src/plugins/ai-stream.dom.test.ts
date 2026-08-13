// @vitest-environment happy-dom
/** vtAIStream：批量落地、跟随底部、自动推断列。写法说明见 AGENTS.md §5.1 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { VirtTable, type VirtTableOptions } from '../index';
import { vtAIStream } from './ai-stream';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

type Row = Record<string, any>;

const makeRows = (n: number, from = 0): Row[] =>
  Array.from({ length: n }, (_, i) => ({ id: from + i, name: `行${from + i}`, amount: (from + i) * 10 }));

function mount(extra: Partial<VirtTableOptions<Row>> = {}, streamOpts: any = {}) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  const table = new VirtTable<Row>(box, {
    list: [],
    columns: [
      { key: 'name', title: '名称', width: 120 },
      { key: 'amount', title: '金额', width: 100 },
    ],
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 0,
    fixedSize: true,
    renderControl: () => ({ begin: 0, end: 9 }),
    // flushInterval 用定时器：happy-dom 没有真实 rAF 节奏，定时器配 fake timers 更好控
    plugins: [vtAIStream({ flushInterval: 0, indicator: false, ...streamOpts })],
    ...extra,
  } as VirtTableOptions<Row>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  return { box, table };
}

/** 等缓冲落地（flushInterval: 0 → 一个宏任务） */
const tick = () => new Promise((r) => setTimeout(r, 0));

const rowCount = (box: HTMLElement) =>
  Number(box.querySelector('.vt-root')!.getAttribute('aria-rowcount'));

describe('vtAIStream 批量落地', () => {
  it('pushAIStreamRows 攒到下一帧才落地', async () => {
    const { box, table } = mount();
    table.pushAIStreamRows(makeRows(3));
    expect(rowCount(box)).toBe(0); // 还没落
    expect(table.getAIStreamState().buffered).toBe(3);
    await tick();
    expect(rowCount(box)).toBe(3);
    expect(table.getAIStreamState().received).toBe(3);
  });

  it('一帧内多次 push 合并成一次落地', async () => {
    const onFlush = vi.fn();
    const { box, table } = mount({}, { onFlush });
    table.pushAIStreamRows(makeRows(2, 0));
    table.pushAIStreamRows(makeRows(2, 2));
    table.pushAIStreamRows(makeRows(2, 4));
    await tick();
    expect(onFlush).toHaveBeenCalledOnce();
    expect(rowCount(box)).toBe(6);
  });

  it('单行 push 也接受（不必自己包数组）', async () => {
    const { box, table } = mount();
    table.pushAIStreamRows({ id: 1, name: 'x', amount: 1 });
    await tick();
    expect(rowCount(box)).toBe(1);
  });

  it('空数组不触发落地', async () => {
    const onFlush = vi.fn();
    const { table } = mount({}, { onFlush });
    table.pushAIStreamRows([]);
    await tick();
    expect(onFlush).not.toHaveBeenCalled();
  });

  it('超过 maxRowsPerFlush 的部分留到下一次', async () => {
    const { box, table } = mount({}, { maxRowsPerFlush: 5 });
    table.pushAIStreamRows(makeRows(12));
    await tick();
    expect(rowCount(box)).toBe(5);
    await tick();
    expect(rowCount(box)).toBe(10);
    await tick();
    expect(rowCount(box)).toBe(12);
  });

  it('endAIStream 落掉尾巴，不把最后几行留在缓冲里', () => {
    const { box, table } = mount();
    table.pushAIStreamRows(makeRows(3));
    table.endAIStream(); // 同步落地，不等定时器
    expect(rowCount(box)).toBe(3);
    expect(table.getAIStreamState().status).toBe('done');
  });

  it('没显式 startAIStream 直接 push 也算开始', () => {
    const { table } = mount();
    expect(table.getAIStreamState().status).toBe('idle');
    table.pushAIStreamRows(makeRows(1));
    expect(table.getAIStreamState().status).toBe('streaming');
  });

  it('startAIStream 重置计数但不清已有数据', async () => {
    const { box, table } = mount();
    table.pushAIStreamRows(makeRows(3));
    await tick();
    table.startAIStream();
    expect(table.getAIStreamState().received).toBe(0);
    expect(rowCount(box)).toBe(3); // 数据还在，清不清由使用方 setList 决定
  });
});

describe('vtAIStream consumeAIStream', () => {
  it('吃异步生成器，逐批落地', async () => {
    const { box, table } = mount();
    async function* gen() {
      yield makeRows(2, 0);
      yield makeRows(2, 2);
    }
    await table.consumeAIStream(gen());
    expect(rowCount(box)).toBe(4);
    expect(table.getAIStreamState().status).toBe('done');
  });

  it('吃同步 iterable', async () => {
    const { box, table } = mount();
    await table.consumeAIStream([makeRows(1, 0), makeRows(1, 1)]);
    expect(rowCount(box)).toBe(2);
  });

  it('每个 yield 是单行也行', async () => {
    const { box, table } = mount();
    async function* gen() {
      yield { id: 1, name: 'a', amount: 1 };
      yield { id: 2, name: 'b', amount: 2 };
    }
    await table.consumeAIStream(gen());
    expect(rowCount(box)).toBe(2);
  });

  it('源抛错 → reject + 状态 error，已收到的行保留', async () => {
    const { box, table } = mount();
    async function* gen() {
      yield makeRows(2);
      await new Promise((r) => setTimeout(r, 0));
      throw new Error('连接断了');
    }
    await expect(table.consumeAIStream(gen())).rejects.toThrow('连接断了');
    expect(table.getAIStreamState().status).toBe('error');
    expect(rowCount(box)).toBe(2);
  });

  it('signal abort 中止消费', async () => {
    const { table } = mount();
    const ac = new AbortController();
    async function* gen() {
      yield makeRows(1, 0);
      ac.abort();
      await new Promise((r) => setTimeout(r, 0));
      yield makeRows(1, 1);
    }
    await expect(table.consumeAIStream(gen(), { signal: ac.signal })).rejects.toThrow(/abort/i);
    expect(table.getAIStreamState().status).toBe('error');
  });

  it('autoEnd: false 时不自动结束', async () => {
    const { table } = mount();
    await table.consumeAIStream([makeRows(1)], { autoEnd: false });
    expect(table.getAIStreamState().status).toBe('streaming');
  });

  it('abortAIStream 保留已收到的行', async () => {
    const { box, table } = mount();
    table.pushAIStreamRows(makeRows(3));
    await tick();
    table.abortAIStream(new Error('停'));
    expect(rowCount(box)).toBe(3);
    expect(table.getAIStreamState().status).toBe('error');
  });
});

describe('vtAIStream 自动推断列', () => {
  it('表格没有列时，首批数据到达即推断', async () => {
    const { box, table } = mount({ columns: [] });
    table.pushAIStreamRows([{ id: 1, customerName: '甲公司', amount: 300 }]);
    await tick();
    const heads = [...box.querySelectorAll<HTMLElement>('thead th[data-col-key]')].map(
      (th) => th.dataset.colKey,
    );
    // itemKey 'id' 不建列
    expect(heads).toEqual(['customerName', 'amount']);
    expect(table.getLeafColumns().find((c) => c.key === 'amount')!.align).toBe('right');
  });

  it('推断出的标题走 humanizeKey', async () => {
    const { box, table } = mount({ columns: [] });
    table.pushAIStreamRows([{ id: 1, customerName: '甲公司' }]);
    await tick();
    expect(box.querySelector('thead th[data-col-key="customerName"]')!.textContent).toContain(
      'Customer Name',
    );
  });

  it('已有列时默认不推断（ifEmpty）', async () => {
    const { box, table } = mount();
    table.pushAIStreamRows([{ id: 1, name: 'x', amount: 1, extra: 'y' }]);
    await tick();
    const heads = [...box.querySelectorAll<HTMLElement>('thead th[data-col-key]')].map(
      (th) => th.dataset.colKey,
    );
    expect(heads).toEqual(['name', 'amount']); // extra 没被加进来
  });

  it('autoColumns: false 时从不推断', async () => {
    const { box, table } = mount({ columns: [] }, { autoColumns: false });
    table.pushAIStreamRows([{ id: 1, a: 1 }]);
    await tick();
    expect(box.querySelectorAll('thead th[data-col-key]')).toHaveLength(0);
  });

  it('autoColumns: true 时每轮 startAIStream 后重新推断', async () => {
    const { box, table } = mount({ columns: [] }, { autoColumns: true });
    table.pushAIStreamRows([{ id: 1, a: 1 }]);
    await tick();
    expect([...box.querySelectorAll<HTMLElement>('thead th[data-col-key]')].map((th) => th.dataset.colKey)).toEqual(['a']);

    table.setList([]);
    table.startAIStream();
    table.pushAIStreamRows([{ id: 2, b: 2 }]);
    await tick();
    expect([...box.querySelectorAll<HTMLElement>('thead th[data-col-key]')].map((th) => th.dataset.colKey)).toEqual(['b']);
  });

  it('inferOptions 可透传', async () => {
    const { box, table } = mount({ columns: [] }, { inferOptions: { exclude: ['secret'] } });
    table.pushAIStreamRows([{ id: 1, a: 1, secret: 'x' }]);
    await tick();
    expect([...box.querySelectorAll<HTMLElement>('thead th[data-col-key]')].map((th) => th.dataset.colKey)).toEqual(['a']);
  });
});

describe('vtAIStream 跟随底部', () => {
  it('默认处于跟随态', () => {
    const { table } = mount();
    expect(table.isAIStreamFollowingBottom()).toBe(true);
  });

  it('followBottom: false 时不跟随', () => {
    const { table } = mount({}, { followBottom: false });
    expect(table.isAIStreamFollowingBottom()).toBe(false);
  });

  it('setAIStreamFollowBottom 手动开关', () => {
    const { table } = mount();
    table.setAIStreamFollowBottom(false);
    expect(table.isAIStreamFollowingBottom()).toBe(false);
    table.setAIStreamFollowBottom(true);
    expect(table.isAIStreamFollowingBottom()).toBe(true);
  });

  it('状态快照带上 following', async () => {
    const { table } = mount();
    table.pushAIStreamRows(makeRows(2));
    await tick();
    expect(table.getAIStreamState()).toMatchObject({ status: 'streaming', received: 2, following: true });
  });
});

describe('vtAIStream 生命周期', () => {
  it('onStateChange 在落地后触发', async () => {
    const onStateChange = vi.fn();
    const { table } = mount({}, { onStateChange });
    table.pushAIStreamRows(makeRows(1));
    await tick();
    expect(onStateChange).toHaveBeenCalled();
    expect(onStateChange.mock.lastCall![0]).toMatchObject({ received: 1 });
  });

  it('销毁后不再落地缓冲', async () => {
    const onFlush = vi.fn();
    const { table } = mount({}, { onFlush });
    table.pushAIStreamRows(makeRows(3));
    table.destroy();
    await tick();
    expect(onFlush).not.toHaveBeenCalled();
  });

  it('indicator 默认关掉时不建 DOM', () => {
    const { box } = mount();
    expect(box.querySelector('.vt-stream-indicator')).toBeNull();
  });

  it('indicator 开启时显示已接收行数', async () => {
    const { box, table } = mount({}, { indicator: true });
    table.pushAIStreamRows(makeRows(5));
    await tick();
    const el = box.querySelector('.vt-stream-indicator');
    expect(el?.textContent).toContain('5');
    table.endAIStream();
    expect(box.querySelector('.vt-stream-indicator')).toBeNull(); // 收完就撤
  });
});
