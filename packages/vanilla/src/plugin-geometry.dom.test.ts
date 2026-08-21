// @vitest-environment happy-dom
/**
 * 插件几何 API 的契约：`getColumnRange` / `getRenderedRowRects` / `getRowRect` /
 * `getScrollLeft` / `scrollByX`。
 *
 * 这批是为「按行列摆浮层」的插件开的（甘特条与依赖箭头、图表对齐列、多人光标）。
 * 原来只有 `getSelectionRect`，它有两个用在这类场景上就不成立的性质：
 *
 *   1. 每次调用都是一次全表 `querySelectorAll` + 一次强制布局 —— 每帧摆 N 个浮层就是 N 次；
 *   2. 选区行都不在渲染窗口内时返回 `null` —— 对框选浮层是对的（该隐藏），
 *      但依赖箭头的另一端经常在窗口外，箭头仍要画出去被容器裁掉。
 *
 * happy-dom 没有布局引擎（`getBoundingClientRect()` 全 0），所以这里守的是**能在无布局
 * 环境下断言的那部分**：横向的纯算术、纵向的相对位移、区间升序、以及边界返回值。
 * 真实像素对齐靠 pro 仓库 playground 的 gantt demo 手验。
 */
import { describe, it, expect, afterEach } from 'vitest';
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
    columns: [
      { key: 'a', title: 'A', width: 100 },
      { key: 'b', title: 'B', width: 200 },
      { key: 'c', title: 'C', width: 50 },
    ],
    ...options,
  } as VirtTableOptions<Record<string, any>>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  const client = box.querySelector('.vt-client') as HTMLElement;
  return { box, table, client };
}

describe('getColumnRange', () => {
  it('单列 = 该列的宽度与前缀和', () => {
    const { table } = mount();
    expect(table.getColumnRange(0, 0)).toEqual({ left: 0, width: 100 });
    expect(table.getColumnRange(1, 1)).toEqual({ left: 100, width: 200 });
    expect(table.getColumnRange(2, 2)).toEqual({ left: 300, width: 50 });
  });

  it('跨列 = 首列左边到末列右边', () => {
    const { table } = mount();
    expect(table.getColumnRange(0, 2)).toEqual({ left: 0, width: 350 });
    expect(table.getColumnRange(1, 2)).toEqual({ left: 100, width: 250 });
  });

  it('传反了也按区间理解（甘特条的起止列可能是倒序算出来的）', () => {
    const { table } = mount();
    expect(table.getColumnRange(2, 0)).toEqual(table.getColumnRange(0, 2));
  });

  it('越界返回 null，而不是给个错的矩形', () => {
    const { table } = mount();
    expect(table.getColumnRange(-1, 0)).toBeNull();
    expect(table.getColumnRange(0, 3)).toBeNull();
  });

  it('不依赖渲染窗口：横向窗口外的列一样算得出来', () => {
    // 100 列 × 60px，容器宽度在 happy-dom 里是 0，渲染窗口只覆盖开头几列
    const { table } = mount({
      columns: Array.from({ length: 100 }, (_, i) => ({
        key: `c${i}`,
        title: `C${i}`,
        width: 60,
      })),
    });
    expect(table.getVisibleColumns().length).toBe(100);
    // 末列绝不可能在渲染窗口里，但它的几何是纯前缀和
    expect(table.getColumnRange(99, 99)).toEqual({ left: 99 * 60, width: 60 });
  });

  it('固定列：左固定段按 sticky 语义把横向偏移加回去', () => {
    const { table, client } = mount({
      columns: [
        { key: 'a', title: 'A', width: 100, fixed: 'left' },
        { key: 'b', title: 'B', width: 200 },
        { key: 'c', title: 'C', width: 50 },
      ],
    });
    // 未横滚时与普通列无差别
    expect(table.getColumnRange(0, 0)).toEqual({ left: 0, width: 100 });
    // 中间段的前缀和从左固定段之后起算
    expect(table.getColumnRange(1, 1)).toEqual({ left: 100, width: 200 });

    client.scrollLeft = 40;
    // 固定列的内容坐标随 scrollLeft 走（它 sticky 在视口里），中间段不变
    expect(table.getColumnRange(0, 0)).toEqual({ left: 40, width: 100 });
    expect(table.getColumnRange(1, 1)).toEqual({ left: 100, width: 200 });
  });

  /*
   * 「getSelectionRect 的横向部分与这里一致」在 happy-dom 里断言不了：那个方法的纵向靠
   * 行的 `getBoundingClientRect()`，无布局环境下高度恒为 0，于是它一律返回 null
   * （既有行为，不是回归）。两者共用同一份换算改由代码结构保证 —— `getSelectionRect`
   * 内部就是调 `getColumnRange`，没有第二份实现可以漂移。
   */
});

describe('getRenderedRowRects', () => {
  it('覆盖渲染窗口内的行且按 rowIndex 升序', () => {
    const { table } = mount();
    const rects = table.getRenderedRowRects();
    expect(rects.length).toBeGreaterThan(0);
    const indexes = rects.map((r) => r.rowIndex);
    expect([...indexes].sort((a, b) => a - b)).toEqual(indexes);
    // 渲染窗口是数据行的一个连续区间
    expect(indexes[indexes.length - 1] - indexes[0]).toBe(indexes.length - 1);
  });

  it('空列表返回空数组（不是 null，调用方不用分支）', () => {
    const { table } = mount({ list: [] });
    expect(table.getRenderedRowRects()).toEqual([]);
  });
});

describe('getRowRect', () => {
  it('窗口内的行与 getRenderedRowRects 里的那一条相同', () => {
    const { table } = mount();
    const first = table.getRenderedRowRects()[0];
    expect(table.getRowRect(first.rowIndex)).toEqual(first);
  });

  it('窗口外的行也给值（依赖箭头连出去的那一端靠这条）', () => {
    const { table } = mount();
    const rects = table.getRenderedRowRects();
    const last = rects[rects.length - 1].rowIndex;
    const far = table.getRowRect(last + 100);
    expect(far).not.toBeNull();
    expect(far!.rowIndex).toBe(last + 100);
  });

  it('固定行高下窗口外的位移就是「行数 × 行高」', () => {
    const { table } = mount();
    const anchor = table.getRenderedRowRects().at(-1)!;
    const far = table.getRowRect(anchor.rowIndex + 10)!;
    // happy-dom 里 anchor.top 是 0，所以差值直接等于外推量
    expect(far.top - anchor.top).toBe(10 * 40);
    expect(far.height).toBe(40);
  });

  it('空列表返回 null（一行都没渲染，没有锚点可外推）', () => {
    const { table } = mount({ list: [] });
    expect(table.getRowRect(0)).toBeNull();
  });
});

describe('横向偏移', () => {
  it('getScrollLeft 读到的就是容器的 scrollLeft', () => {
    const { table, client } = mount();
    expect(table.getScrollLeft()).toBe(0);
    client.scrollLeft = 123;
    expect(table.getScrollLeft()).toBe(123);
  });

  it('scrollByX 夹在 [0, maxScrollLeft] 内，不会滚出负数', () => {
    const { table, client } = mount();
    client.scrollLeft = 10;
    table.scrollByX(-999);
    expect(client.scrollLeft).toBe(0);
    // happy-dom 无布局 → scrollWidth/clientWidth 均为 0 → 上界也是 0
    table.scrollByX(999);
    expect(client.scrollLeft).toBeGreaterThanOrEqual(0);
  });
});
