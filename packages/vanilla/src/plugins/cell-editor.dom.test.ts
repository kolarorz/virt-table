// @vitest-environment happy-dom
/**
 * vtCellEditor 的编辑态归属：**按 `rowKey` + `colKey` 记，不绑 `<td>` 元素**。
 *
 * 起因是一个真实 bug（AGENTS.md §7.14 有 CDP 实测记录）：原来存的是 td 元素，而行 DOM
 * 是池化复用的 —— `<tr>` 会被留用、`data-row-key` 被重写。于是
 *   ① 滚动后那个 td 已经属于别的行，浮层却还贴着它；
 *   ② 被编辑的行离开渲染窗口时浮层被关掉（或冻结在屏幕外的旧 `top`），**滚回来也回不来**，
 *      未提交的输入一起丢掉。
 *
 * 这里用 `renderControl` 钉住渲染窗口来模拟「行离开/回到窗口」—— happy-dom 没有布局引擎，
 * 真滚动不出来（几何全是 0），但窗口进出这件事本身与几何无关，正好能测。
 * 位置是否像素级跟随只能靠 CDP，数字记在 AGENTS.md。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { VirtTable, type VirtTableOptions } from '../index';
import { vtCellEditor, vtCellSelection } from './index';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

type Row = Record<string, any>;

/** 渲染窗口，测试里可以改它再 `forceUpdate()` —— 等价于滚动到别处 */
let win = { begin: 0, end: 9 };

function mount(extra: Partial<VirtTableOptions<Row>> = {}) {
  win = { begin: 0, end: 9 };
  const box = document.createElement('div');
  document.body.appendChild(box);
  const table = new VirtTable<Row>(box, {
    list: Array.from({ length: 200 }, (_, i) => ({ id: i, name: 'N' + i })),
    columns: [
      { key: 'id', title: 'ID', width: 80 },
      {
        key: 'name',
        title: '名称',
        width: 160,
        renderEditor: ({ value, row, column }) => {
          const input = document.createElement('input');
          input.value = (value as string) ?? '';
          input.addEventListener('input', () => {
            (row as any)[column.key] = input.value;
          });
          return input;
        },
      },
    ],
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 0,
    fixedSize: true,
    renderControl: () => win,
    plugins: [vtCellEditor()],
    ...extra,
  } as VirtTableOptions<Row>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  return { box, table };
}

const coverOf = (box: HTMLElement) => box.querySelector('.vt-cell-cover') as HTMLElement;
const inputOf = (box: HTMLElement) => coverOf(box).querySelector('input') as HTMLInputElement | null;

/** 点开某一行某一列的编辑器 */
function openEditor(box: HTMLElement, rowKey: string, colKey: string): void {
  const td = box.querySelector(
    `tr[data-row-key="${rowKey}"] td[data-col-key="${colKey}"]`,
  ) as HTMLElement;
  expect(td, `没找到 row=${rowKey} col=${colKey} 的单元格`).toBeTruthy();
  td.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

/** 把渲染窗口移到别处（等价于滚走），并触发一次重渲染 */
function moveWindow(table: VirtTable<Row>, begin: number, end: number): void {
  win = { begin, end };
  table.forceUpdate();
}

describe('vtCellEditor：编辑态按 rowKey 归属', () => {
  it('打开后浮层可见，且承载的是该行该列的编辑控件', () => {
    const { box } = mount();
    openEditor(box, '3', 'name');

    expect(coverOf(box).style.display).not.toBe('none');
    expect(inputOf(box)?.value).toBe('N3');
  });

  it('被编辑的行离开渲染窗口 → 浮层隐藏，但编辑态与未提交的输入都保留', () => {
    const { box, table } = mount();
    openEditor(box, '3', 'name');

    const input = inputOf(box)!;
    input.value = '改了还没提交';
    input.dispatchEvent(new Event('input'));

    moveWindow(table, 100, 109);

    expect(coverOf(box).style.display, '滚出窗口应该只是隐藏').toBe('none');
    // 关键：控件还在、值还在 —— 原来的实现会 dismiss()，innerHTML 被清空
    expect(inputOf(box), '编辑控件不该被销毁').toBeTruthy();
    expect(inputOf(box)!.value).toBe('改了还没提交');
    expect(table.isCellEditing(), '编辑态应该还开着').toBe(true);
  });

  it('那一行回到渲染窗口 → 浮层原样显形，内容不丢', () => {
    const { box, table } = mount();
    openEditor(box, '3', 'name');
    const input = inputOf(box)!;
    input.value = '草稿';
    input.dispatchEvent(new Event('input'));

    moveWindow(table, 100, 109);
    expect(coverOf(box).style.display).toBe('none');

    moveWindow(table, 0, 9);
    expect(coverOf(box).style.display, '回到窗口应该重新显形').not.toBe('none');
    expect(inputOf(box)!.value).toBe('草稿');
  });

  it('行 DOM 被别的行复用时，浮层不会贴到那一行上', () => {
    const { box, table } = mount();
    openEditor(box, '3', 'name');

    // 窗口整体挪走：同一批 <tr> 元素会被留用并改写 data-row-key
    moveWindow(table, 50, 59);

    // 行 3 不在窗口里了
    expect(box.querySelector('tr[data-row-key="3"]')).toBeNull();
    // 而窗口里的行确实复用着 DOM（有行、且都不是行 3）
    const keys = [...box.querySelectorAll('tbody tr.vt-tr[data-row-key]')].map(
      (tr) => (tr as HTMLElement).dataset.rowKey,
    );
    expect(keys.length).toBeGreaterThan(0);
    expect(keys).not.toContain('3');
    // 浮层必须是隐藏的 —— 绑 td 元素的旧实现会把它贴在某个被复用的行上
    expect(coverOf(box).style.display).toBe('none');
  });

  it('排序打乱行序（不滚动，只有 onRendered）后浮层仍归属原行', () => {
    const { box, table } = mount({
      columns: [
        { key: 'id', title: 'ID', width: 80, sortable: true },
        {
          key: 'name',
          title: '名称',
          width: 160,
          renderEditor: ({ value }) => {
            const i = document.createElement('input');
            i.value = (value as string) ?? '';
            return i;
          },
        },
      ],
    } as Partial<VirtTableOptions<Row>>);

    openEditor(box, '3', 'name');
    expect(coverOf(box).style.display).not.toBe('none');

    // 倒序：行 3 跑到列表末尾，离开窗口
    table.sort('id', 'desc');
    expect(coverOf(box).style.display, '不在窗口内应隐藏').toBe('none');
    expect(table.isCellEditing()).toBe(true);

    // 复位：回到窗口内，重新显形
    table.clearSort();
    expect(coverOf(box).style.display).not.toBe('none');
  });

  it('点同一格不重建编辑器（不打断正在输入的内容）', () => {
    const { box } = mount();
    openEditor(box, '3', 'name');
    const first = inputOf(box)!;
    first.value = '正在输入';
    first.dispatchEvent(new Event('input'));

    openEditor(box, '3', 'name');
    expect(inputOf(box), '同一格重复点击不该换掉控件').toBe(first);
    expect(inputOf(box)!.value).toBe('正在输入');
  });

  it('点另一格会切换编辑目标', () => {
    const { box } = mount();
    openEditor(box, '3', 'name');
    openEditor(box, '5', 'name');
    expect(inputOf(box)!.value).toBe('N5');
  });
});

/**
 * 用户反馈：「单元格选完内容后编辑态消失，格子上什么都不剩，感受不到刚才改的是哪个」。
 *
 * 编辑态是**会话**，本来就会消失（单选下拉、日历选完即关面板；点到别处整个浮层收掉），
 * 所以痕迹得由**激活态**留 —— 复用核心的 `.vt-active-cell-overlay`（与 `highlightSelectCell`
 * 同一份状态、同一个浮层），插件只决定「什么时候算激活」。
 *
 * happy-dom 没有布局，描边的位置测不出来（rect 全 0），但「在不在 / 归哪一格」与几何无关。
 */
describe('vtCellEditor：点开一格同时打上激活态', () => {
  const overlayOf = (box: HTMLElement) =>
    box.querySelector('.vt-active-cell-overlay') as HTMLElement | null;

  /** 不点单元格、只点 td 之外的地方来关闭编辑态（模拟点空白） */
  const pressEsc = (box: HTMLElement): void => {
    box.querySelector('.vt-root')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
  };

  it('点开编辑器 → 描边出现并归那一格（没配 highlightSelectCell 也有）', () => {
    const { box, table } = mount();
    openEditor(box, '3', 'name');

    expect(overlayOf(box), '浮层应该按需创建出来').toBeTruthy();
    expect(overlayOf(box)!.style.display).not.toBe('none');
    expect(table.getActiveCell()).toEqual({ rowKey: '3', colKey: 'name' });
  });

  /*
   * Esc 关编辑态 → 描边留着（留痕）。与它成对的是另一条：**点到单元格以外**时描边跟着收起
   * （核心的 `clearActiveCellOnOutside`，见 `active-cell-outside.dom.test.ts`）。
   * 两条一起才是完整语义：留痕说的是「编辑态关了、你还在这块表上」。
   */
  it('编辑态消失后描边还在 —— 这就是「刚改的是哪一格」', () => {
    const { box, table } = mount();
    openEditor(box, '3', 'name');
    pressEsc(box);

    expect(table.isCellEditing(), '编辑态该关了').toBe(false);
    expect(coverOf(box).style.display, '编辑浮层该藏了').toBe('none');
    expect(overlayOf(box)!.style.display, '激活态必须留下').not.toBe('none');
    expect(table.getActiveCell()).toEqual({ rowKey: '3', colKey: 'name' });
  });

  it('点到不能编辑的格子，激活态跟着走（不会赖在上一格）', () => {
    const { box, table } = mount();
    openEditor(box, '3', 'name');
    // 'id' 列没有 renderEditor：编辑态关闭，但激活态该落到这一格
    openEditor(box, '3', 'id');

    expect(table.isCellEditing()).toBe(false);
    expect(table.getActiveCell()).toEqual({ rowKey: '3', colKey: 'id' });
  });

  it('切到另一格时激活态一起搬过去', () => {
    const { box, table } = mount();
    openEditor(box, '3', 'name');
    openEditor(box, '5', 'name');
    expect(table.getActiveCell()).toEqual({ rowKey: '5', colKey: 'name' });
  });

  it('那一行滚出渲染窗口 → 描边隐藏；滚回来重新显形（归属不丢）', () => {
    const { box, table } = mount();
    openEditor(box, '3', 'name');

    moveWindow(table, 100, 109);
    expect(overlayOf(box)!.style.display).toBe('none');
    expect(table.getActiveCell(), '归属按 key 记，不因为滚走而丢').toEqual({
      rowKey: '3',
      colKey: 'name',
    });

    moveWindow(table, 0, 9);
    expect(overlayOf(box)!.style.display).not.toBe('none');
  });

  it('activeCell: false → 一个描边浮层都不建（裸模式把外观全交给组件）', () => {
    const { box, table } = mount({ plugins: [vtCellEditor({ activeCell: false })] } as any);
    openEditor(box, '3', 'name');

    expect(coverOf(box).style.display, '编辑器照常打开').not.toBe('none');
    expect(overlayOf(box)).toBeNull();
    expect(table.getActiveCell()).toBeNull();
  });

  /**
   * 装了框选就默认关：那张表已经有一圈会跟着点击与键盘走的「当前单元格」（选区 overlay）。
   * 再画一圈的结果是两个框都自称当前单元格，还会分家 —— 选区移到 B2、编辑留下的描边钉在 A1。
   */
  it('装了 vtCellSelection 时默认不画（避免两个「当前单元格」）', () => {
    const { box, table } = mount({
      plugins: [vtCellSelection(), vtCellEditor()],
    } as any);
    openEditor(box, '3', 'name');

    expect(coverOf(box).style.display).not.toBe('none');
    expect(overlayOf(box)).toBeNull();
    expect(table.getActiveCell()).toBeNull();
  });

  it('框选在后面声明也认（inject 在触发时才查）', () => {
    const { box, table } = mount({
      plugins: [vtCellEditor(), vtCellSelection()],
    } as any);
    openEditor(box, '3', 'name');

    expect(overlayOf(box)).toBeNull();
    expect(table.getActiveCell()).toBeNull();
  });

  it('显式 activeCell: true 压过「让位给框选」的默认值', () => {
    const { box, table } = mount({
      plugins: [vtCellSelection(), vtCellEditor({ activeCell: true })],
    } as any);
    openEditor(box, '3', 'name');

    expect(overlayOf(box)!.style.display).not.toBe('none');
    expect(table.getActiveCell()).toEqual({ rowKey: '3', colKey: 'name' });
  });
});

/**
 * 用户报的 bug：在 A 格改完值、**不点空白**直接去点 B 格，A 格还显示旧值，
 * 要等所有编辑态都消失（点空白 / Esc）才更新。
 *
 * 成因是职责漏了一环：组件的写回（`components/shared.ts` 的 `commitValue`）只改行数据、
 * 刻意不触发渲染（编辑期间格子被浮层盖着，逐次按键重绘整帧是纯浪费），而这里切换目标时
 * 只调了 `dismiss()`（清空浮层、不刷新）—— 于是「离开一格时刷新它」没人做。
 */
describe('vtCellEditor：离开一格时立刻重绘那一格', () => {
  const textOf = (box: HTMLElement, rowKey: string, colKey: string): string =>
    (
      box.querySelector(
        `tr[data-row-key="${rowKey}"] td[data-col-key="${colKey}"]`,
      ) as HTMLElement
    ).textContent ?? '';

  it('切到另一格时，上一格显示的是写回后的新值', () => {
    const { box } = mount();
    openEditor(box, '3', 'name');
    const input = inputOf(box)!;
    input.value = '改过了';
    input.dispatchEvent(new Event('input'));

    // 还在编辑期间，格子被浮层盖着，不要求已经重绘
    openEditor(box, '5', 'name');

    expect(textOf(box, '3', 'name'), 'A 格必须立刻显示新值，而不是等所有编辑态消失').toBe(
      '改过了',
    );
    // 新目标照常打开
    expect(inputOf(box)!.value).toBe('N5');
  });

  it('连着换三格，每一格都在离开时刷新', () => {
    const { box } = mount();
    for (const [rowKey, next] of [
      ['1', 'A'],
      ['2', 'B'],
      ['3', 'C'],
    ] as const) {
      openEditor(box, rowKey, 'name');
      const input = inputOf(box)!;
      input.value = next;
      input.dispatchEvent(new Event('input'));
    }
    // 最后一格还在编辑，前两格应该都已经是新值
    expect(textOf(box, '1', 'name')).toBe('A');
    expect(textOf(box, '2', 'name')).toBe('B');

    // 关掉最后一格
    box.querySelector('.vt-root')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(textOf(box, '3', 'name')).toBe('C');
  });

  it('刷新后仍按 key 重查 td 来定位（行 DOM 是池化复用的，不能拿刷新前的元素）', () => {
    const { box } = mount();
    openEditor(box, '3', 'name');
    openEditor(box, '5', 'name');
    // 浮层仍然是可见的、且编辑态归行 5 —— 拿着旧 td 定位的话这里会错位/隐藏
    expect(coverOf(box).style.display).not.toBe('none');
    expect(inputOf(box)!.value).toBe('N5');
  });
});

/**
 * 用户报的 bug：**「在单元格里输入内容后，点别的单元格，刚才那个编辑浮层不关」**。
 *
 * 两层原因，两条断言各守一层：
 *
 * 1. `onOutsideClick` 里有一句「点到 tbody 里就放行」，前提是 `onCellTrigger` 会接管
 *    （dismiss + 重开）。`trigger: 'click'` 成立，**`trigger: 'dblclick'` 不成立** ——
 *    单击不触发 dblclick，于是没人关，浮层赖在旧格子上、未提交的输入也刷不出来。
 * 2. 监听的事件必须是 `pointerdown`。`vtCellSelection` 在 pointerdown 里 `preventDefault()`，
 *    连带取消兼容 mouse 事件，装了框选的表格里**表体内不存在 mousedown**（CDP 实测
 *    点单元格：pointerdown 1 / mousedown 0 / click 1）。详见 `events-contract.test.ts`。
 */
describe('vtCellEditor：点别的单元格必须关掉浮层', () => {
  /** 双击进入编辑（trigger: 'dblclick'） */
  const openByDblClick = (box: HTMLElement, rowKey: string, colKey: string): void => {
    const td = box.querySelector(
      `tr[data-row-key="${rowKey}"] td[data-col-key="${colKey}"]`,
    ) as HTMLElement;
    expect(td, `没找到 row=${rowKey} col=${colKey}`).toBeTruthy();
    td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  };

  const textOf = (box: HTMLElement, rowKey: string, colKey: string): string =>
    (
      box.querySelector(
        `tr[data-row-key="${rowKey}"] td[data-col-key="${colKey}"]`,
      ) as HTMLElement
    ).textContent ?? '';

  /** 在某个单元格上按下指针（不是 mousedown —— 见文件头注） */
  const pointerDownOn = (box: HTMLElement, rowKey: string, colKey: string): void => {
    const td = box.querySelector(
      `tr[data-row-key="${rowKey}"] td[data-col-key="${colKey}"]`,
    ) as HTMLElement;
    td.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
  };

  it('trigger: dblclick 时，单击另一个单元格也要关掉并写回', () => {
    const { box } = mount({ plugins: [vtCellEditor({ trigger: 'dblclick' }), vtCellSelection()] });

    openByDblClick(box, '3', 'name');
    expect(coverOf(box).style.display, '双击应该打开浮层').not.toBe('none');

    const input = inputOf(box)!;
    input.value = '输入了但没提交';
    input.dispatchEvent(new Event('input'));

    pointerDownOn(box, '6', 'name');

    expect(coverOf(box).style.display, '点别的格子必须关掉浮层').toBe('none');
    expect(textOf(box, '3', 'name'), '关掉时要刷新，让那一格显示写回后的值').toBe('输入了但没提交');
  });

  it('点回正在编辑的那一格不关（浮层没盖满 td 时点到边缘）', () => {
    const { box } = mount({ plugins: [vtCellEditor({ trigger: 'dblclick' }), vtCellSelection()] });
    openByDblClick(box, '3', 'name');
    pointerDownOn(box, '3', 'name');
    expect(coverOf(box).style.display).not.toBe('none');
  });

  it('trigger: click 时行为不变（由 onCellTrigger 接管，换格子照样重开）', () => {
    const { box } = mount({ plugins: [vtCellEditor(), vtCellSelection()] });
    openEditor(box, '3', 'name');
    const input = inputOf(box)!;
    input.value = 'X';
    input.dispatchEvent(new Event('input'));

    openEditor(box, '6', 'name');
    expect(coverOf(box).style.display, '换格子后浮层应该还开着（在新格子上）').not.toBe('none');
    expect(inputOf(box)!.value).toBe('N6');
    expect(textOf(box, '3', 'name'), '旧格子要显示写回后的值').toBe('X');
  });
});
