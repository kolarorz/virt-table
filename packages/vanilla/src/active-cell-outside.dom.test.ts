// @vitest-environment happy-dom
/**
 * 「点到单元格以外就收起」—— 激活态（核心）与选区（`vtCellSelection`）共用的那条判断。
 *
 * 用户报的现象：**在甘特里点开一格，再去点时间轴，描边还亮着**。根因不在甘特 —— 核心过去
 * 只在点中 `td` 时**设置**激活态，全仓一处清除路径都没有，于是描边只会被「点另一格」替换。
 * 编辑浮层此刻已经收掉了，两个视觉信号对不上，读起来就是坏的。
 *
 * 这一组守的是「以外」的边界，每一条都是判断答错一次就会犯的错：
 * 点另一格被自己清掉（时序）、编辑时点自己的输入框把描边清了、右键菜单弹出前当前格没了。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { VirtTable, type VirtTableOptions } from './index';
import { vtCellSelection } from './plugins/cell-selection';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
  document.body.innerHTML = '';
});

type Row = Record<string, any>;

function mount(extra: Partial<VirtTableOptions<Row>> = {}) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  const table = new VirtTable<Row>(box, {
    list: Array.from({ length: 50 }, (_, i) => ({ id: i, name: 'N' + i })),
    columns: [
      { key: 'id', title: 'ID', width: 80 },
      { key: 'name', title: '名称', width: 160 },
    ],
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 0,
    fixedSize: true,
    renderControl: () => ({ begin: 0, end: 9 }),
    highlightSelectCell: true,
    ...extra,
  } as VirtTableOptions<Row>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  return { box, table, root: box.querySelector('.vt-root') as HTMLElement };
}

/** 主键按下。`button: 0` + `isPrimary` 是「我要去别处」的判据 */
const down = (el: EventTarget, init: PointerEventInit = {}): void => {
  el.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, isPrimary: true, button: 0, ...init }),
  );
};

const tdOf = (box: HTMLElement, rowKey: string, colKey: string): HTMLElement =>
  box.querySelector<HTMLElement>(
    `tr[data-row-key="${rowKey}"] td[data-col-key="${colKey}"]`,
  )!;

// ============================ 激活态 ============================

describe('激活态：点到单元格以外就收起', () => {
  it('点表格外面（页面别处）→ 描边收起', () => {
    const { box, table } = mount();
    down(tdOf(box, '3', 'name'));
    expect(table.getActiveCell()).toEqual({ rowKey: '3', colKey: 'name' });

    const outside = document.createElement('button');
    document.body.appendChild(outside);
    down(outside);

    expect(table.getActiveCell()).toBeNull();
    expect(
      (box.querySelector('.vt-active-cell-overlay') as HTMLElement).style.display,
    ).toBe('none');
  });

  /**
   * 甘特那个场景的最小复现：时间轴 pane 与 `.vt-root` 是**兄弟节点**，不在表格里面。
   * 监听挂 `document` 而不是 root，就是为了让这种「同一个组件、但在 root 外面」的地方也算离开。
   */
  it('点表格根节点之外的兄弟容器（甘特时间轴 pane 就是这样）→ 描边收起', () => {
    const { box, table, root } = mount();
    const pane = document.createElement('div');
    root.parentElement!.appendChild(pane);
    down(tdOf(box, '2', 'id'));
    expect(table.getActiveCell()).not.toBeNull();

    down(pane);
    expect(table.getActiveCell()).toBeNull();
  });

  it('点表头 / 表体空白处 → 描边收起', () => {
    const { box, table } = mount();
    down(tdOf(box, '1', 'name'));
    down(box.querySelector('.vt-th')!);
    expect(table.getActiveCell()).toBeNull();

    down(tdOf(box, '1', 'name'));
    down(box.querySelector('.vt-client')!);
    expect(table.getActiveCell()).toBeNull();
  });

  /**
   * **时序守卫**：`document` 上的清除监听在冒泡链末端，而设置发生在 tbody 上 ——
   * 不排除「本表格的单元格」就成了「先设置、再清掉」，表现是描边根本不出现。
   */
  it('点另一个单元格 → 描边搬过去，不是被清掉', () => {
    const { box, table } = mount();
    down(tdOf(box, '3', 'name'));
    down(tdOf(box, '5', 'id'));
    expect(table.getActiveCell()).toEqual({ rowKey: '5', colKey: 'id' });
  });

  it('点编辑浮层与各类弹层里面 → 描边保留（那是还在操作这一格）', () => {
    const { box, table } = mount();
    down(tdOf(box, '3', 'name'));

    // 编辑浮层：挂在 .vt-client 上、在 tbody 之外
    const cover = document.createElement('div');
    cover.className = 'vt-cell-cover';
    box.querySelector('.vt-client')!.appendChild(cover);
    const input = document.createElement('input');
    cover.appendChild(input);
    down(input);
    expect(table.getActiveCell()).toEqual({ rowKey: '3', colKey: 'name' });

    // 弹层：下拉、日历、筛选面板、工具栏面板都带这个标记
    const popup = document.createElement('div');
    popup.setAttribute('data-vt-popup', '');
    document.body.appendChild(popup);
    down(popup);
    expect(table.getActiveCell()).toEqual({ rowKey: '3', colKey: 'name' });
  });

  /** 右键要对着**当前那一格**弹菜单（`vtContextMenu` 读的就是它），所以右键不算离开 */
  it('右键 / 中键不算离开', () => {
    const { box, table } = mount();
    down(tdOf(box, '3', 'name'));
    down(document.body, { button: 2 });
    down(document.body, { button: 1 });
    expect(table.getActiveCell()).toEqual({ rowKey: '3', colKey: 'name' });
  });

  it('clearActiveCellOnOutside: false → 回到「只被点另一格替换」的老语义', () => {
    const { box, table } = mount({ clearActiveCellOnOutside: false });
    down(tdOf(box, '3', 'name'));
    down(document.body);
    expect(table.getActiveCell()).toEqual({ rowKey: '3', colKey: 'name' });
  });

  /** 同页多张表：点 A 的格子，B 那份状态确实该收起来（判断按各自的 tbody 走） */
  it('点另一张表的单元格 → 这张表的描边收起', () => {
    const a = mount();
    const b = mount();
    down(tdOf(a.box, '1', 'name'));
    down(tdOf(b.box, '2', 'name'));

    expect(a.table.getActiveCell()).toBeNull();
    expect(b.table.getActiveCell()).toEqual({ rowKey: '2', colKey: 'name' });
  });

  it('destroy 之后不再留着 document 监听', () => {
    const { box, table } = mount();
    down(tdOf(box, '3', 'name'));
    table.destroy();
    // 已销毁的表格不该再响应任何事件（这一下不抛错就是通过）
    down(document.body);
  });
});

// ============================ 选区 ============================

describe('选区：与激活态同一条判断', () => {
  /** happy-dom 没有布局，`cellFromPoint` 靠注入 */
  function withSelection(extra: Partial<VirtTableOptions<Row>> = {}) {
    const m = mount({ plugins: [vtCellSelection()], ...extra });
    (m.table as any).cellFromPoint = () => ({ row: 1, col: 1 });
    return m;
  }

  it('拖选完点到单元格以外 → 选区清空', () => {
    const { box, table } = withSelection();
    down(tdOf(box, '1', 'name'), { clientX: 10, clientY: 10, pointerId: 1 });
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
    expect(table.getCellSelection()).not.toBeNull();

    down(document.body);
    expect(table.getCellSelection()).toBeNull();
  });

  it('点编辑浮层里面 → 选区保留', () => {
    const { box, table } = withSelection();
    down(tdOf(box, '1', 'name'), { clientX: 10, clientY: 10, pointerId: 1 });
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));

    const cover = document.createElement('div');
    cover.className = 'vt-cell-cover';
    box.querySelector('.vt-client')!.appendChild(cover);
    down(cover);
    expect(table.getCellSelection()).not.toBeNull();
  });

  it('clearOnOutside: false → 选区留着（选一片、去别处点两下、回来复制）', () => {
    const m = mount({ plugins: [vtCellSelection({ clearOnOutside: false })] });
    (m.table as any).cellFromPoint = () => ({ row: 1, col: 1 });
    down(tdOf(m.box, '1', 'name'), { clientX: 10, clientY: 10, pointerId: 1 });
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));

    down(document.body);
    expect(m.table.getCellSelection()).not.toBeNull();
  });

  /** 拖选**起手**那一下也会冒泡到 document —— 不能把刚建立的选区自己清掉 */
  it('拖选起手不会被自己的清除监听吃掉', () => {
    const { box, table } = withSelection();
    down(tdOf(box, '1', 'name'), { clientX: 10, clientY: 10, pointerId: 1 });
    expect(table.getCellSelection()).not.toBeNull();
  });
});
