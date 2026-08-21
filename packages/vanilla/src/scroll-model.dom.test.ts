// @vitest-environment happy-dom
/**
 * 纵向滚动模型的**契约**：位置由 JS 掌管，没有任何元素的几何尺寸随行数增长。
 *
 * 这套模型取代了原来的「原生 `overflow: auto` + `.vt-skeleton`（高度 = itemsTotalSize）
 * 撑开滚动空间 + `tr.vt-padding`（高度 = leadingSize）顶部占位」。换掉它买到两件事：
 *
 * 1. 元素高度不再随行数增长，绕开浏览器的高度上限（Chrome 实测 33,554,428px）——
 *    超限时那部分行永远滚不到；
 * 2. 「滚不到底」那一类问题（AGENTS.md §7.11：fixed 行高比模型矮 0.69px/行，
 *    十万行后 `scrollTop` 超出模型总高、渲染窗口永久冻结）从根上不存在了 ——
 *    偏移量以账本 `getTotalSize() - clientSize` 为唯一权威并 clamp，
 *    不再有「浏览器的 scrollHeight 与账本对不上」这回事。
 *
 * happy-dom 没有布局引擎（所有 `offsetHeight` / `getBoundingClientRect` 都是 0），
 * 所以这里守的是**能在无布局环境下断言的那部分**：DOM 结构、残差公式、账本槽位登记、
 * 以及「不再写任何随行数增长的尺寸」。真实的滚动手感与像素对齐靠手验。
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { VirtTable, type VirtTableOptions } from './index';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

function mount(options: Record<string, any> = {}) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  const table = new VirtTable<Record<string, any>>(box, {
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 0,
    fixedSize: true,
    list: Array.from({ length: 500 }, (_, i) => ({ id: i, a: 'a' + i })),
    columns: [{ key: 'a', title: 'A', width: 100 }],
    ...options,
  } as VirtTableOptions<Record<string, any>>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  const root = box.querySelector('.vt-root') as HTMLElement;
  const client = box.querySelector('.vt-client') as HTMLElement;
  const bodyTable = client.querySelector(':scope > table.vt-table') as HTMLElement;
  return { box, table, root, client, bodyTable };
}

describe('纵向滚动模型：没有随行数增长的几何', () => {
  it('不再有 .vt-skeleton 滚动高度占位块', () => {
    const { box } = mount();
    expect(box.querySelector('.vt-skeleton')).toBeNull();
  });

  it('不再有表头 / 表尾的等高占位块（改由账本槽位表达）', () => {
    const { box } = mount({ showHeader: true });
    expect(box.querySelector('.vt-header-spacer')).toBeNull();
    expect(box.querySelector('.vt-footer-spacer')).toBeNull();
  });

  it('vt-padding 行保留（行插入的锚点）但不再承载 leadingSize 高度', () => {
    const { client, table } = mount();
    const pad = client.querySelector('tr.vt-padding') as HTMLElement;
    // 元素本身必须还在：_patch 用它当 insertBefore 的起点
    expect(pad).not.toBeNull();

    table.scrollToOffset(4000);
    // 高度是内联样式，旧模型会写成 `${leadingSize}px`
    expect(pad.style.height).toBe('');
  });
});

describe('纵向滚动模型：残差定位', () => {
  it('表体用 top 承载残差，公式为 stickyHeaderSize + leadingSize - offset', () => {
    const { table, bodyTable } = mount();
    const core = table.core;

    table.scrollToOffset(4000);

    const expected =
      core.slotSize.stickyHeaderSize + core.state.leadingSize - core.getOffset();
    expect(parseFloat(bodyTable.style.top)).toBeCloseTo(expected, 5);
  });

  it('残差量级不超过一屏多一点，永远碰不到 transform / 高度上限', () => {
    // 50 万行 × 40px = 2000 万 px，旧模型下这是要写进元素高度的数
    const { table, bodyTable } = mount({
      list: Array.from({ length: 500_000 }, (_, i) => ({ id: i, a: 'a' + i })),
    });
    table.scrollToBottom();

    const residual = Math.abs(parseFloat(bodyTable.style.top));
    // 一屏在 happy-dom 里是 0，残差应当只剩「渲染窗口内的偏移」量级，
    // 远小于内容总高（2000 万）。给一个宽松但有意义的上限
    expect(residual).toBeLessThan(100_000);
    expect(residual).not.toBeNaN();
  });

  it('表体必须是 position: relative —— top 才生效，且不能改用 transform', () => {
    /**
     * transform 会给后代建立包含块，让 `td.vt-fixed-left/right` 的
     * `position: sticky; left` 失去参照（实测横滚 500px 后偏差 −500px）。
     * 这条断言守的是「没人把 top 换成 transform」。
     */
    const { table, bodyTable } = mount();
    table.scrollToOffset(4000);
    expect(bodyTable.style.transform).toBe('');
    expect(bodyTable.style.top).not.toBe('');
  });
});

describe('纵向滚动模型：视口与账本', () => {
  it('视口容器纵向不可滚、横向保留原生 scrollport', () => {
    const { client } = mount();
    // 纵向交给 JS；横向必须留着原生 scrollport，否则固定列的 sticky 失去参照
    expect(client.dataset.id).toBe('client');
    // tabIndex 是键盘输入的前提（InputController 挂在这一层）
    expect(client.tabIndex).toBe(0);
  });

  it('表头 / 表尾都登记为账本槽位（dataset.id 写在被 observe 的 wrap 上）', () => {
    /**
     * core 的 ResizeObserver 完全按 `dataset.id` 分派槽位，没有 id 的条目直接跳过。
     * 早先 id 挂在 `<thead>` 上、observe 的却是 wrap，两者错位 —— 表头高度在账本里
     * 恒为 0。新模型下这会让 `getMaxOffset()` 少算上下两段，末行被表尾盖住。
     */
    const { box } = mount({ showHeader: true });
    const header = box.querySelector('.vt-header') as HTMLElement;
    const footer = box.querySelector('.vt-footer') as HTMLElement;
    expect(header.dataset.id).toBe('stickyHeader');
    expect(footer.dataset.id).toBe('stickyFooter');
    // 旧的错位写法不能回来：thead 上不该再有 id 与 wrap 抢同一个槽
    const thead = box.querySelector('.vt-thead') as HTMLElement;
    expect(thead.dataset.id).toBeUndefined();
  });
});

describe('rangeUpdate：core 移除后由表格自己派生', () => {
  it('区间变化时派发，且带上 inViewBegin / inViewEnd', () => {
    const rangeUpdate = vi.fn();
    const box = document.createElement('div');
    document.body.appendChild(box);
    const table = new VirtTable<Record<string, any>>(
      box,
      {
        itemKey: 'id',
        estimatedSize: 40,
        buffer: 0,
        fixedSize: true,
        list: Array.from({ length: 500 }, (_, i) => ({ id: i, a: 'a' + i })),
        columns: [{ key: 'a', title: 'A', width: 100 }],
      } as VirtTableOptions<Record<string, any>>,
      { rangeUpdate },
    );
    cleanups.push(() => {
      table.destroy();
      box.remove();
    });

    rangeUpdate.mockClear();
    table.scrollToOffset(4000);

    expect(rangeUpdate).toHaveBeenCalled();
    const [begin, end] = rangeUpdate.mock.calls[rangeUpdate.mock.calls.length - 1]!;
    expect(begin).toBe(table.core.state.inViewBegin);
    expect(end).toBe(table.core.state.inViewEnd);
  });

  it('区间没变时不重复派发（旧 core 的语义，不能随每帧刷）', () => {
    const rangeUpdate = vi.fn();
    const box = document.createElement('div');
    document.body.appendChild(box);
    const table = new VirtTable<Record<string, any>>(
      box,
      {
        itemKey: 'id',
        estimatedSize: 40,
        buffer: 0,
        fixedSize: true,
        list: Array.from({ length: 500 }, (_, i) => ({ id: i, a: 'a' + i })),
        columns: [{ key: 'a', title: 'A', width: 100 }],
      } as VirtTableOptions<Record<string, any>>,
      { rangeUpdate },
    );
    cleanups.push(() => {
      table.destroy();
      box.remove();
    });

    table.scrollToOffset(4000);
    rangeUpdate.mockClear();
    // 同一个偏移量再来一次：区间必然不变
    table.scrollToOffset(4000);
    table.forceUpdate();
    expect(rangeUpdate).not.toHaveBeenCalled();
  });
});

describe('纵向滚动 API', () => {
  it('getOffset() 取代了 clientEl.scrollTop', () => {
    const { table, client } = mount();
    table.scrollToOffset(4000);
    expect(table.getOffset()).toBeGreaterThan(0);
    // 容器自己不滚（overflow-y: hidden）
    expect(client.scrollTop).toBe(0);
  });

  it('scrollByY() 相对滚动，按「用户发起」记账', () => {
    const { table } = mount();
    table.scrollToOffset(4000);
    const before = table.getOffset();
    table.scrollByY(400);
    expect(table.getOffset()).toBeCloseTo(before + 400, 5);
  });
});

/**
 * 触摸手势的**接线**契约：横向作为交叉轴交给了 `InputController`（`crossEl`）。
 *
 * 2026-08-14 移动端实测的 bug 就出在这根线没接：纵向由 `InputController` 接管、
 * 横向留给浏览器原生 pan，而 `preventDefault` 没有「只拦一条轴」的粒度 ——
 * 纵向一拦横向也废，表现为「竖向滚起来之后横向完全滚不动，只有竖向分量恰好为 0
 * 或已顶到边界时才横滚得动」。
 *
 * 这里只验接线与轴锁的方向，手势引擎本身（起步阈值 / 解锁阈值 / 惯性曲线）
 * 在 virt-list 的 `packages/vanilla/__tests__/InputController.test.ts` 里测。
 * happy-dom 没有布局，`scrollWidth`/`clientWidth` 都是 0，所以 `scrollLeft`
 * 换成可写实现来观察「有没有人在写它」。
 */
describe('触摸手势：横向作为交叉轴一并接管', () => {
  /** 让 scrollLeft 可读写（happy-dom 无布局，原生实现会把它按到 0） */
  function makeScrollLeftWritable(el: HTMLElement, max = 1000): void {
    let left = 0;
    Object.defineProperty(el, 'scrollLeft', {
      configurable: true,
      get: () => left,
      set: (v: number) => {
        left = Math.min(Math.max(v, 0), max);
      },
    });
  }

  function touch(
    el: HTMLElement,
    type: 'touchstart' | 'touchmove' | 'touchend',
    x: number,
    y: number,
    time: number,
  ): Event {
    const e = new Event(type, { cancelable: true, bubbles: true }) as any;
    e.touches = type === 'touchend' ? [] : [{ clientX: x, clientY: y }];
    Object.defineProperty(e, 'timeStamp', { value: time });
    el.dispatchEvent(e);
    return e as Event;
  }

  it('横向主导的手势会写 scrollLeft（这根线断了就是那个 bug）', async () => {
    const { client } = mount();
    makeScrollLeftWritable(client);

    touch(client, 'touchstart', 300, 100, 0);
    // 越过起步阈值，横向主导 → 锁交叉轴
    touch(client, 'touchmove', 270, 102, 16);
    touch(client, 'touchmove', 240, 104, 32);

    expect(client.scrollLeft).toBeGreaterThan(0);
  });

  it('竖向主导的手势不碰 scrollLeft（竖滚时列不会横漂）', async () => {
    const { client, table } = mount();
    makeScrollLeftWritable(client);
    table.scrollToOffset(2000); // 离开顶部，纵向两个方向都有余量

    touch(client, 'touchstart', 300, 300, 0);
    // 竖向主导，但每一帧都带着横向分量 —— 全部该被轴锁吃掉
    touch(client, 'touchmove', 292, 270, 16);
    touch(client, 'touchmove', 306, 240, 32);
    touch(client, 'touchmove', 288, 210, 48);
    // 纵向位移经 rAF 落地
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    expect(client.scrollLeft).toBe(0);
    expect(table.getOffset()).toBeGreaterThan(2000);
  });
});
