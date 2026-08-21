// @vitest-environment happy-dom
/**
 * `renderHeader`（列级表头渲染）的行为契约。
 *
 * 这是 AGENTS.md「自定义渲染」里列着的公开 API（`render` / `renderHeader` /
 * `renderExpandRow` / `renderEditor` 四兄弟），但在这之前**一条测试都没有** ——
 * 而付费甘特插件已经压在它上面了：时间轴的「今天」那一格靠它把日期套进一个圆底里
 * （`.vtp-gantt-today-pill`）。于是这里补齐，重点是三条最容易被改掉的性质：
 *
 * 1. **字符串走 `textContent`，不解析 HTML。** 文档只写了「返回 `string | HTMLElement`」，
 *    没写字符串是当文本还是当标记。当文本是对的（使用方的数据不该能注入标记），
 *    但这意味着**想要结构就必须返回元素** —— 插件那边正是踩过一次才改成返回元素的。
 * 2. **元素是 append 进去的**，所以插件可以挂类名/`title`/子节点。
 * 3. **表头重建（换列、横滚导致列窗口变化）之后还在**。它是列上的声明式钩子，
 *    重建多少次都该重新调一遍；插件因此不必在每次渲染后去补 DOM。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { VirtTable, type VirtTableOptions, type VirtTableColumn } from './index';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
  document.body.innerHTML = '';
});

interface Row {
  id: number;
  a: string;
  b: string;
}

const LIST: Row[] = [
  { id: 1, a: 'a1', b: 'b1' },
  { id: 2, a: 'a2', b: 'b2' },
];

function mount(columns: VirtTableColumn<Row>[], extra: Partial<VirtTableOptions<Row>> = {}) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  const table = new VirtTable<Row>(box, {
    list: LIST.map((r) => ({ ...r })),
    columns,
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
  return { box, table, root: box.querySelector('.vt-root') as HTMLElement };
}

const thOf = (root: HTMLElement, key: string): HTMLElement =>
  root.querySelector<HTMLElement>(`.vt-thead th[data-col-key="${key}"]`)!;

describe('renderHeader：叶子列', () => {
  it('返回元素 → append 进 th（插件靠这个挂类名与子节点）', () => {
    const { root } = mount([
      {
        key: 'a',
        title: 'A',
        width: 100,
        renderHeader: ({ column }) => {
          const el = document.createElement('span');
          el.className = 'my-pill';
          el.textContent = column.title;
          el.title = '提示';
          return el;
        },
      },
      { key: 'b', title: 'B', width: 100 },
    ]);
    const pill = thOf(root, 'a').querySelector<HTMLElement>('.my-pill')!;
    expect(pill).not.toBeNull();
    expect(pill.textContent).toBe('A');
    expect(pill.title).toBe('提示');
    // 没配的列不受影响
    expect(thOf(root, 'b').querySelector('.my-pill')).toBeNull();
  });

  it('返回字符串 → 当**文本**写入，不解析成标记', () => {
    const { root } = mount([
      { key: 'a', title: 'A', width: 100, renderHeader: () => '<b>粗</b>' },
    ]);
    const th = thOf(root, 'a');
    expect(th.querySelector('b')).toBeNull();
    expect(th.textContent).toContain('<b>粗</b>');
  });

  it('回调拿得到列对象与 isGroup: false', () => {
    const seen: Array<{ key: string; isGroup: boolean }> = [];
    mount([
      {
        key: 'a',
        title: 'A',
        width: 100,
        renderHeader: ({ column, isGroup }) => {
          seen.push({ key: column.key, isGroup });
          return column.title;
        },
      },
    ]);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0]).toEqual({ key: 'a', isGroup: false });
  });

  it('不配时退回 col.title（回归护栏）', () => {
    const { root } = mount([{ key: 'a', title: 'A', width: 100 }]);
    expect(thOf(root, 'a').textContent).toContain('A');
  });
});

describe('renderHeader：多级分组表头的分组节点', () => {
  const grouped = (renderHeader?: VirtTableColumn<Row>['renderHeader']) =>
    mount([
      {
        key: 'g',
        title: '组',
        width: 200,
        renderHeader,
        children: [
          { key: 'a', title: 'A', width: 100 },
          { key: 'b', title: 'B', width: 100 },
        ],
      },
    ]);

  it('分组节点也会调，且 isGroup: true', () => {
    const seen: boolean[] = [];
    grouped(({ isGroup, column }) => {
      seen.push(isGroup);
      return column.title;
    });
    expect(seen).toContain(true);
  });

  it('分组节点返回的元素落在 sticky 内层里（横滚时标题才跟得住）', () => {
    const { root } = grouped(() => {
      const el = document.createElement('span');
      el.className = 'my-group';
      return el;
    });
    /*
     * 分组节点的格子用的是 `data-group-key`，**不是** `data-col-key`
     * （后者只给叶子列）—— 顺带把这个区分钉住：按 `data-col-key` 找分组格会一直找不到。
     */
    const th = root.querySelector<HTMLElement>('.vt-thead th[data-group-key="g"]')!;
    expect(th).not.toBeNull();
    expect(root.querySelector('.vt-thead th[data-col-key="g"]')).toBeNull();

    const mine = th.querySelector<HTMLElement>('.my-group')!;
    expect(mine).not.toBeNull();
    // 直接挂在 th 上就会在横滚时被滚走 —— 必须在 .vt-group-label 这个 sticky 内层内
    expect(mine.closest('.vt-group-label')).not.toBeNull();
  });
});

describe('renderHeader 是声明式的：表头重建之后仍然生效', () => {
  /**
   * 这条是甘特那个「今天圆底」真正依赖的性质。表头会因为换列 / 列窗口变化被重建；
   * 若不是每次重建都重新调一遍，插件就只能在渲染后去补 DOM，那种写法一定会漏。
   */
  const withPill = (key: string): VirtTableColumn<Row> => ({
    key,
    title: key.toUpperCase(),
    width: 100,
    renderHeader: ({ column }) => {
      const el = document.createElement('span');
      el.className = 'my-pill';
      el.textContent = column.title;
      return el;
    },
  });

  it('setColumns 之后重新调用', () => {
    const { root, table } = mount([withPill('a'), { key: 'b', title: 'B', width: 100 }]);
    expect(root.querySelectorAll('.my-pill').length).toBe(1);

    table.setColumns([{ key: 'b', title: 'B', width: 100 }, withPill('a')]);
    expect(root.querySelectorAll('.my-pill').length).toBe(1);
    expect(thOf(root, 'a').querySelector('.my-pill')).not.toBeNull();
  });

  it('列显隐切换之后重新调用', () => {
    const { root, table } = mount([withPill('a'), { key: 'b', title: 'B', width: 100 }]);
    table.setColumnVisible('b', false);
    expect(root.querySelectorAll('.my-pill').length).toBe(1);
    table.setColumnVisible('b', true);
    expect(root.querySelectorAll('.my-pill').length).toBe(1);
  });

  it('每次重建都是新元素（回调返回的元素不被复用，所以插件不必自己清理）', () => {
    const { root, table } = mount([withPill('a')]);
    const first = root.querySelector('.my-pill');
    table.setColumns([withPill('a')]);
    const second = root.querySelector('.my-pill');
    expect(second).not.toBeNull();
    expect(second).not.toBe(first);
    // 没有残留：同一个 th 里只有一个
    expect(thOf(root, 'a').querySelectorAll('.my-pill').length).toBe(1);
  });
});
