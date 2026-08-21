// @vitest-environment happy-dom
/**
 * `vtRowDrag` 树形拖拽**手势层**的测试：指针位置 → placement / 目标层级 → 落点。
 *
 * 这里**必须 stub 几何与命中测试**（AGENTS.md §5.1 一般不建议这么做）：happy-dom 里
 * 所有 `getBoundingClientRect` 都是 0，而且**根本没有命中测试**（`elementFromPoint`
 * 恒为 null）。落点归约吃的就是这两样，不喂进去等于什么都测不到 —— 而这套层级归约
 * （指针横移改插入层级）是整个特性的核心，只靠手验太脆。
 *
 * 造的几何很规整：第 i 行 top = i*40、高 40、左 0 宽 300；缩进起点在 0，
 * 于是「目标层级 = floor(x / 20) + 1」，用 x 就能直接点某一层。
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { VirtTable, type VirtTableColumn, type VirtTableOptions } from '../index';
import { vtRowDrag } from './drag-sort';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
  vi.restoreAllMocks();
});

type Row = Record<string, any>;
const ROW_H = 40;

const columns: VirtTableColumn<Row>[] = [
  { key: 'drag', title: '', width: 40, type: 'drag' },
  { key: 'name', title: '名称', width: 200, type: 'tree' },
];

/** 扁平列表：整行发起那一组用它 —— 树形的收起/展开会改变行位置，与本组要测的东西无关 */
const flatList = (): Row[] => [
  { id: '1', name: 'r1' },
  { id: '2', name: 'r2' },
  { id: '3', name: 'r3' },
  { id: '4', name: 'r4' },
];

const tree = (): Row[] => [
  { id: 'a', name: 'a', children: [{ id: 'a1', name: 'a1' }, { id: 'a2', name: 'a2' }] },
  { id: 'b', name: 'b', children: [{ id: 'b1', name: 'b1' }] },
  { id: 'c', name: 'c' },
];

function mount(extra: Partial<VirtTableOptions<Row>> = {}) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  const table = new VirtTable<Row>(box, {
    itemKey: 'id',
    estimatedSize: ROW_H,
    buffer: 0,
    fixedSize: true,
    defaultExpandAll: true,
    renderControl: () => ({ begin: 0, end: 40 }),
    list: tree(),
    columns,
    plugins: [vtRowDrag()],
    ...extra,
  } as VirtTableOptions<Row>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  return { box, table };
}

const rect = (top: number, height: number, left = 0, width = 300): DOMRect =>
  ({
    top, left, width, height,
    right: left + width, bottom: top + height,
    x: left, y: top, toJSON: () => ({}),
  }) as DOMRect;

/** 给渲染出来的行摆上规整几何，并让 elementFromPoint 按 y 命中对应行 */
function layout(box: HTMLElement): HTMLElement[] {
  const client = box.querySelector<HTMLElement>('.vt-client')!;
  client.getBoundingClientRect = () => rect(0, 400);
  const trs = [...box.querySelectorAll<HTMLElement>('.vt-tbody .vt-tr')];
  trs.forEach((tr, i) => {
    tr.getBoundingClientRect = () => rect(i * ROW_H, ROW_H);
  });
  document.elementFromPoint = ((x: number, y: number) =>
    x >= 0 && x <= 300 ? (trs[Math.floor(y / ROW_H)] ?? null) : null) as typeof document.elementFromPoint;
  return trs;
}

/** 树的形状：`a[b,c]` = a 有两个孩子 */
function shape(list: Row[]): string {
  return list
    .map((r) => {
      const kids = r.children as Row[] | undefined;
      return kids?.length ? `${r.id}[${shape(kids)}]` : String(r.id);
    })
    .join(',');
}
const origin = (t: VirtTable<Row>): Row[] => (t as any)._originList;
const rowsOf = (t: VirtTable<Row>): string[] =>
  ((t as any)._options.list as Row[]).map((r) => String(r.id));

type Point = { x: number; y: number };

/**
 * 从某行的手柄拖到某点后松手。
 *
 * 落点可以传一个函数：**开拖会把源节点收起**（有子节点时），行的位置随之变化，
 * 所以要在收起之后重新摆几何、再算落点。传死坐标只适用于拖叶子行。
 */
function drag(
  box: HTMLElement,
  fromKey: string,
  target: Point | ((rows: ReturnType<typeof layout>) => Point),
): void {
  const handle = box.querySelector<HTMLElement>(
    `tr[data-row-key="${fromKey}"] .vt-drag-handle`,
  )!;
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true, button: 0, isPrimary: true, pointerId: 1,
      clientX: 20, clientY: 0,
    }),
  );
  // 第一次 move 越过阈值 → onStart（可能收起源节点并重建行 DOM）
  document.dispatchEvent(
    new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 24, clientY: 6 }),
  );
  const rows = layout(box); // 重新摆几何：收起之后行的位置变了
  const { x, y } = typeof target === 'function' ? target(rows) : target;
  document.dispatchEvent(
    new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: x, clientY: y }),
  );
  document.dispatchEvent(
    new PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientX: x, clientY: y }),
  );
}

/** 当前指示线的分段状态：每段一个字符 —— `.` 透明占位 / `-` 淡色（可选未选中）/ `=` 实色 */
function lineSegs(box: HTMLElement): { pattern: string; arrowAt: number } {
  const segs = [...box.querySelectorAll<HTMLElement>('.vt-row-drop-line .vt-row-drop-seg')];
  return {
    pattern: segs
      .map((el) =>
        el.classList.contains('vt-row-drop-seg--on')
          ? '='
          : el.classList.contains('vt-row-drop-seg--past')
            ? '-'
            : '.',
      )
      .join(''),
    arrowAt: segs.findIndex((el) => !!el.querySelector('.vt-row-drop-arrow')),
  };
}

describe('vtRowDrag 树形落点', () => {
  // 展示顺序：0=a 1=a1 2=a2 3=b 4=b1 5=c
  it('落在行的中间 1/3 → 成为它的子节点', () => {
    const { box, table } = mount();
    layout(box);
    expect(rowsOf(table)).toEqual(['a', 'a1', 'a2', 'b', 'b1', 'c']);
    drag(box, 'c', { x: 100, y: 1 * ROW_H + 20 }); // a1 的中段
    expect(shape(origin(table))).toBe('a[a1[c],a2],b[b1]');
  });

  it('落在行的上 1/3 → 插到它前面（同层同父）', () => {
    const { box, table } = mount();
    layout(box);
    drag(box, 'c', { x: 100, y: 2 * ROW_H + 4 }); // a2 的顶部
    expect(shape(origin(table))).toBe('a[a1,c,a2],b[b1]');
  });

  it('落在行的下 1/3 → 指针横向位置决定插到第几层', () => {
    // a2（层 2）与 b（层 1）之间：可选层级 1~2
    const shallow = mount();
    layout(shallow.box);
    drag(shallow.box, 'c', { x: 5, y: 2 * ROW_H + 36 }); // x=5 → 第 1 层 = 根层，落在 a 之后
    expect(shape(origin(shallow.table))).toBe('a[a1,a2],c,b[b1]');

    const deep = mount();
    layout(deep.box);
    drag(deep.box, 'c', { x: 25, y: 2 * ROW_H + 36 }); // x=25 → 第 2 层 = a 的末子
    expect(shape(origin(deep.table))).toBe('a[a1,a2,c],b[b1]');
  });

  it('目标层级夹在相邻两行之间：拖过深不会凭空多一层', () => {
    // a2（层 2）与 b（层 1）之间可选 1~2；x=45 换算出第 3 层，夹住后仍是第 2 层。
    // 不夹的话「比 prev 深一层」会被读成「成为 a2 的子节点」
    const deep = mount();
    layout(deep.box);
    drag(deep.box, 'c', { x: 45, y: 2 * ROW_H + 36 });
    expect(shape(origin(deep.table))).toBe('a[a1,a2,c],b[b1]');

    const deeper = mount();
    layout(deeper.box);
    drag(deeper.box, 'c', { x: 280, y: 2 * ROW_H + 36 });
    expect(shape(origin(deeper.table))).toBe('a[a1,a2,c],b[b1]');
  });

  it('目标层级夹在相邻两行之间：拖到最左也不会掉出这一层', () => {
    // a1 与 a2 都是层 2，可选范围只有 2；x=0 换算出第 1 层，夹住后仍留在 a 下
    const { box, table } = mount();
    layout(box);
    drag(box, 'c', { x: 0, y: 1 * ROW_H + 36 });
    expect(shape(origin(table))).toBe('a[a1,c,a2],b[b1]');
  });

  it('拖到自己身上：什么也不发生', () => {
    const { box, table } = mount();
    layout(box);
    drag(box, 'c', { x: 100, y: 5 * ROW_H + 20 }); // c 自己（第 6 行）
    expect(shape(origin(table))).toBe('a[a1,a2],b[b1],c');
  });

  it('拖带子节点的行：开拖先把它收起，子树不再出现在视图里', () => {
    const { box, table } = mount();
    layout(box);
    expect(rowsOf(table)).toEqual(['a', 'a1', 'a2', 'b', 'b1', 'c']);

    const handle = box.querySelector<HTMLElement>('tr[data-row-key="a"] .vt-drag-handle')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, isPrimary: true, pointerId: 1, clientX: 20, clientY: 0,
    }));
    document.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 24, clientY: 6 }),
    );
    // a 的子树已经收起 —— 否则「落在自己子树里」一律放不下，源节点下面会是一大片死区
    expect(rowsOf(table)).toEqual(['a', 'b', 'b1', 'c']);
    expect(table.isFolded('a')).toBe(true);
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
    // 收起是拖拽的一部分，结构没变
    expect(shape(origin(table))).toBe('a[a1,a2],b[b1],c');
  });

  it('收起之后照样能把整棵子树搬走', () => {
    const { box, table } = mount();
    layout(box);
    // 收起后视图是 a, b, b1, c → 落在 c（第 4 行）的中段 = 成为 c 的子节点
    drag(box, 'a', (rows) => ({ x: 100, y: rows[3].getBoundingClientRect().top + 20 }));
    expect(shape(origin(table))).toBe('b[b1],c[a[a1,a2]]');
  });

  it('ghost 显示第一个数据列的值 —— type:\'tree\' 也算数据列', () => {
    // 列是 [drag(功能列), name(tree), dept]。ghost 该显示 name，不是往后跳到 dept
    const { box } = mount({
      list: [
        { id: 'x', name: '名称甲', dept: '部门乙' },
        { id: 'y', name: '名称丙', dept: '部门丁' },
      ],
      columns: [
        { key: 'drag', title: '', width: 40, type: 'drag' },
        { key: 'name', title: '名称', width: 200, type: 'tree' },
        { key: 'dept', title: '部门', width: 120 },
      ],
    });
    layout(box);
    const handle = box.querySelector<HTMLElement>('tr[data-row-key="x"] .vt-drag-handle')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, isPrimary: true, pointerId: 1, clientX: 20, clientY: 0,
    }));
    document.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 24, clientY: 6 }),
    );
    expect(box.querySelector('.vt-row-drag-ghost')?.textContent).toBe('名称甲');
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
  });

  it('第一个数据列为空时 ghost 退到下一个数据列', () => {
    const { box } = mount({
      list: [{ id: 'x', name: '', dept: '部门乙' }, { id: 'y', name: '丙', dept: '丁' }],
      columns: [
        { key: 'drag', title: '', width: 40, type: 'drag' },
        { key: 'name', title: '名称', width: 200, type: 'tree' },
        { key: 'dept', title: '部门', width: 120 },
      ],
    });
    layout(box);
    const handle = box.querySelector<HTMLElement>('tr[data-row-key="x"] .vt-drag-handle')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, button: 0, isPrimary: true, pointerId: 1, clientX: 20, clientY: 0,
    }));
    document.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 24, clientY: 6 }),
    );
    expect(box.querySelector('.vt-row-drag-ghost')?.textContent).toBe('部门乙');
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
  });

  it('层级提示线按层分段：走过的层淡色、目标层起点放箭头', () => {
    const { box } = mount();
    layout(box);
    const handle = box.querySelector<HTMLElement>('tr[data-row-key="c"] .vt-drag-handle')!;
    const down = (): void => {
      handle.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, button: 0, isPrimary: true, pointerId: 1, clientX: 20, clientY: 0,
      }));
      document.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 24, clientY: 6 }),
      );
    };
    const moveTo = (x: number, y: number): void =>
      void document.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: x, clientY: y }),
      );

    down();
    // a2（层 2）与 b（层 1）之间 → 可选 1~2，两段
    moveTo(5, 2 * ROW_H + 36); // 第 1 层
    expect(lineSegs(box)).toEqual({ pattern: '==', arrowAt: 0 });
    moveTo(25, 2 * ROW_H + 36); // 第 2 层：第一段变成「走过」
    expect(lineSegs(box)).toEqual({ pattern: '-=', arrowAt: 1 });
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));

    // a1 与 a2 都是层 2 → 可选区间只有 2，第一段是透明占位（那一层选不到）
    down();
    moveTo(0, 1 * ROW_H + 36);
    expect(lineSegs(box)).toEqual({ pattern: '.=', arrowAt: 1 });
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
  });

  it('落点在表外：不落数据', () => {
    const { box, table } = mount();
    layout(box);
    drag(box, 'c', { x: 100, y: 999 });
    expect(shape(origin(table))).toBe('a[a1,a2],b[b1],c');
  });

  it('排序生效时手柄拖不动', () => {
    const { box, table } = mount({
      columns: [
        { key: 'drag', title: '', width: 40, type: 'drag' },
        { key: 'name', title: '名称', width: 200, type: 'tree', sortable: true, defaultSort: 'desc' },
      ],
    });
    layout(box);
    drag(box, 'c', { x: 100, y: 1 * ROW_H + 20 });
    expect(shape(origin(table))).toBe('a[a1,a2],b[b1],c');
  });
});

describe('vtRowDrag 同级模式', () => {
  const sameLevel = (extra: Partial<VirtTableOptions<Row>> = {}) =>
    mount({ plugins: [vtRowDrag({ crossLevel: false })], ...extra });

  it('同一父级的兄弟之间可以换位', () => {
    const { box, table } = sameLevel();
    layout(box);
    drag(box, 'a1', { x: 100, y: 2 * ROW_H + 36 }); // a2 的下半 → 排到 a2 之后
    expect(shape(origin(table))).toBe('a[a2,a1],b[b1],c');
  });

  it('跨父级 / 跨层级一律不落', () => {
    const { box, table } = sameLevel();
    layout(box);
    drag(box, 'a1', { x: 100, y: 4 * ROW_H + 36 }); // b1 是 b 的孩子，不同父
    expect(shape(origin(table))).toBe('a[a1,a2],b[b1],c');
    drag(box, 'a1', { x: 100, y: 5 * ROW_H + 36 }); // c 在根层，层级不同
    expect(shape(origin(table))).toBe('a[a1,a2],b[b1],c');
  });

  it('没有「成为子节点」这一档：行的中段也只当上/下半判', () => {
    const { box, table } = sameLevel();
    layout(box);
    drag(box, 'a1', { x: 100, y: 2 * ROW_H + 20 }); // a2 正中 → 归下半 → 排到 a2 之后
    expect(shape(origin(table))).toBe('a[a2,a1],b[b1],c');
  });
});

describe('vtRowDrag 分组落点', () => {
  const grouped = () => {
    const box = document.createElement('div');
    document.body.appendChild(box);
    const table = new VirtTable<Row>(box, {
      itemKey: 'id',
      estimatedSize: ROW_H,
      buffer: 0,
      fixedSize: true,
      defaultExpandAll: true,
      renderControl: () => ({ begin: 0, end: 40 }),
      list: [
        { id: 1, name: 'n1', dept: '研发' },
        { id: 2, name: 'n2', dept: '研发' },
        { id: 3, name: 'n3', dept: '销售' },
      ],
      columns: [
        { key: 'drag', title: '', width: 40, type: 'drag' },
        { key: 'name', title: '名称', width: 200 },
      ],
      groupConfig: [{ field: 'dept' }],
      plugins: [vtRowDrag()],
    } as VirtTableOptions<Row>);
    cleanups.push(() => {
      table.destroy();
      box.remove();
    });
    return { box, table };
  };

  it('落到分组行中段 = 落进这个分组，字段跟着改', () => {
    // 展示顺序：0=#研发 1=1 2=2 3=#销售 4=3
    const { box, table } = grouped();
    layout(box);
    drag(box, '1', { x: 100, y: 3 * ROW_H + 20 }); // 「销售」分组行的中段
    expect(origin(table).find((r) => r.id === 1)!.dept).toBe('销售');
    expect(rowsOf(table)).toEqual(['__group_dept:研发', '2', '__group_dept:销售', '1', '3']);
  });

  it('落在另一组的数据行之后：同样改写分组字段', () => {
    const { box, table } = grouped();
    layout(box);
    drag(box, '1', { x: 100, y: 4 * ROW_H + 36 }); // 「销售」组里 3 的下半
    expect(origin(table).find((r) => r.id === 1)!.dept).toBe('销售');
    expect(rowsOf(table)).toEqual(['__group_dept:研发', '2', '__group_dept:销售', '3', '1']);
  });

  it('组内换位不改字段', () => {
    const { box, table } = grouped();
    layout(box);
    drag(box, '1', { x: 100, y: 2 * ROW_H + 36 }); // 同组里 2 的下半
    expect(origin(table).find((r) => r.id === 1)!.dept).toBe('研发');
    expect(rowsOf(table)).toEqual(['__group_dept:研发', '2', '1', '__group_dept:销售', '3']);
  });
});

// ============================================================================
// 整行发起（wholeRow）
// ============================================================================

/**
 * `wholeRow: true` = 表体任意位置都能起拖，不必抓住手柄图标。甘特 demo 用的就是这一档。
 *
 * 这一组每条都对应一个「只有真用起来才暴露」的坑：逐格绑定在池化的行 DOM 上会重复触发、
 * 触屏抢掉滚动、`stopPropagation` 废掉核心的点击高亮、在输入框上按下变成拖行。
 */
describe('vtRowDrag：整行发起', () => {
  /** 从行内某个元素按下并拖到某个 y（不经手柄） */
  function dragFrom(box: HTMLElement, from: HTMLElement, toY: number): void {
    from.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true, button: 0, isPrimary: true, pointerId: 1,
        clientX: 20, clientY: 0,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 24, clientY: 6 }),
    );
    layout(box);
    document.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 24, clientY: toY }),
    );
    document.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientX: 24, clientY: toY }),
    );
  }

  const cellOf = (box: HTMLElement, rowKey: string, colKey: string): HTMLElement =>
    box.querySelector<HTMLElement>(`tr[data-row-key="${rowKey}"] td[data-col-key="${colKey}"]`)!;

  it('从普通单元格按下就能拖（不必抓手柄）', () => {
    const { box, table } = mount({ list: flatList(), plugins: [vtRowDrag({ wholeRow: true })] });
    layout(box);
    // 第 1 行拖到第 3 行下半段 → 落到它后面
    dragFrom(box, cellOf(box, '1', 'name'), ROW_H * 2 + ROW_H * 0.8);
    expect(rowsOf(table)[2]).toBe('1');
  });

  it('默认（不给 wholeRow）从普通单元格按下不起拖', () => {
    const { box, table } = mount({ list: flatList() });
    layout(box);
    const before = rowsOf(table).join(',');
    dragFrom(box, cellOf(box, '1', 'name'), ROW_H * 2 + ROW_H * 0.8);
    expect(rowsOf(table).join(',')).toBe(before);
  });

  /**
   * 滚动之后（行 DOM 被复用、单元格重建）整行发起照旧可用。
   *
   * 守的是「委托装在 tbody 上」这件事：监听不跟着单元格走，所以行怎么重建都不受影响。
   * 反过来若哪天改成逐格绑定，这条仍会绿 —— 那时它守的就只是「重建后没失效」，
   * 而委托的理由本来也不是正确性（核心复用行时 td 是新建的），是每格一个监听的成本。
   */
  it('滚动、行 DOM 重建之后，整行发起照旧可用', () => {
    let win = { begin: 0, end: 5 };
    const many: Row[] = Array.from({ length: 20 }, (_, i) => ({ id: String(i), name: 'r' + i }));
    const { box, table } = mount({
      list: many,
      renderControl: () => win,
      plugins: [vtRowDrag({ wholeRow: true })],
    });
    for (const [b0, e0, off] of [[6, 11, 6], [0, 5, 0]] as const) {
      win = { begin: b0, end: e0 };
      table.scrollToOffset(off * ROW_H);
    }
    layout(box);
    dragFrom(box, cellOf(box, '1', 'name'), ROW_H * 2 + ROW_H * 0.8);
    expect(rowsOf(table)[2]).toBe('1');
  });

  it('触屏不起拖（表体的单指手势归滚动）', () => {
    const { box, table } = mount({ list: flatList(), plugins: [vtRowDrag({ wholeRow: true })] });
    layout(box);
    const before = rowsOf(table).join(',');
    const cell = cellOf(box, '1', 'name');
    cell.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true, button: 0, isPrimary: true, pointerId: 1,
        pointerType: 'touch', clientX: 20, clientY: 0,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 24, clientY: ROW_H * 3 }),
    );
    document.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientX: 24, clientY: ROW_H * 3 }),
    );
    expect(rowsOf(table).join(',')).toBe(before);
  });

  it('在输入框 / 按钮上按下不起拖（那是要用它们）', () => {
    const { box, table } = mount({ list: flatList(), plugins: [vtRowDrag({ wholeRow: true })] });
    layout(box);
    const cell = cellOf(box, '1', 'name');
    const input = document.createElement('input');
    cell.appendChild(input);
    const before = rowsOf(table).join(',');
    dragFrom(box, input, ROW_H * 2 + ROW_H * 0.8);
    expect(rowsOf(table).join(',')).toBe(before);
  });

  /**
   * 整行发起**不能** `stopPropagation`：核心的 `highlightSelectRow / Col / Cell` 与激活态
   * 听的就是 tbody 上的 pointerdown，拦掉它们就集体失效。
   */
  it('整行发起不挡住核心的点击高亮', () => {
    const { box, table } = mount({
      list: flatList(),
      highlightSelectCell: true,
      plugins: [vtRowDrag({ wholeRow: true })],
    });
    layout(box);
    cellOf(box, '2', 'name').dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true, button: 0, isPrimary: true, pointerId: 9, clientX: 20, clientY: 0,
      }),
    );
    expect(table.getActiveCell()).toEqual({ rowKey: '2', colKey: 'name' });
    document.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 9, clientX: 20, clientY: 0 }),
    );
  });

  it('手柄那条照旧可用（wholeRow 不取代它）', () => {
    const { box, table } = mount({ list: flatList(), plugins: [vtRowDrag({ wholeRow: true })] });
    layout(box);
    drag(box, '1', { x: 24, y: ROW_H * 2 + ROW_H * 0.8 });
    expect(rowsOf(table)[2]).toBe('1');
  });

  it('destroy 之后表体按下不再起拖', () => {
    const { box, table } = mount({ list: flatList(), plugins: [vtRowDrag({ wholeRow: true })] });
    layout(box);
    const cell = cellOf(box, '1', 'name');
    table.destroy();
    // 销毁后表体 DOM 已经拆了，这里只验证「委托监听真的解绑了」：按下 + 越过阈值不该起会话
    cell.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true, button: 0, isPrimary: true, pointerId: 1, clientX: 20, clientY: 0,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 24, clientY: 30 }),
    );
    expect(document.querySelectorAll('.vt-row-drag-ghost').length).toBe(0);
  });
});
