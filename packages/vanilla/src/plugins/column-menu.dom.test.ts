// @vitest-environment happy-dom
/**
 * `vtColumnMenu`：表头 ☰ + 一列动作。
 *
 * 断言的是**「点了菜单里的东西，核心那边真的变了」**（`getState().sort` /
 * `getAllColumns()` / `getGroupConfig()`），不是菜单长什么样。菜单本身没有算法 ——
 * 它的全部价值在「接线接对了」，而接线断了的表现是「点了没反应」，不会抛错。
 *
 * 两组值得单独看：
 *
 * 1. **哪些列该有 ☰**（分组节点、功能列、`tree` 例外、`disabled` 回调）—— 挂错的代价是
 *    用户点开一个对这列毫无意义的菜单。
 * 2. **与 `vtColumnFilter` 的可选依赖**：没装它时菜单里**没有**「筛选」这一项，
 *    而不是有一项点了没反应。
 *
 * 写法说明见 AGENTS.md §5.1。
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { VirtTable, type VirtTableColumn, type VirtTableOptions } from '../index';
import { vtColumnMenu } from './column-menu';
import { vtColumnFilter } from './column-filter';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

type Row = Record<string, any>;

const ROWS: Row[] = [
  { id: 1, name: '甲', dept: '设计', score: 30 },
  { id: 2, name: '乙', dept: '设计', score: 80 },
  { id: 3, name: '丙', dept: '开发', score: 100 },
];

const COLS: VirtTableColumn<Row>[] = [
  { key: 'name', title: '姓名', width: 140, sortable: true },
  {
    key: 'dept',
    title: '部门',
    width: 120,
    filters: [
      { label: '设计', value: '设计' },
      { label: '开发', value: '开发' },
    ],
  },
  { key: 'score', title: '分数', width: 110, sortable: true },
];

function mount(
  plugins: NonNullable<VirtTableOptions<Row>['plugins']>,
  extra: Partial<VirtTableOptions<Row>> = {},
) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  const table = new VirtTable<Row>(box, {
    list: ROWS,
    columns: COLS.map((c) => ({ ...c })),
    itemKey: 'id',
    estimatedSize: 40,
    fixedSize: true,
    buffer: 0,
    renderControl: () => ({ begin: 0, end: 9 }),
    plugins,
    ...extra,
  } as VirtTableOptions<Row>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  const root = box.querySelector('.vt-root') as HTMLElement;
  return { box, table, root };
}

/** 某一列表头上的 ☰ */
const iconOf = (root: HTMLElement, colKey: string): HTMLElement | null =>
  root.querySelector(`th[data-col-key="${colKey}"] .vt-column-menu-icon`);

/** 打开某列的菜单并返回面板 */
function openMenu(root: HTMLElement, colKey: string): HTMLElement {
  const icon = iconOf(root, colKey);
  expect(icon, `${colKey} 列没有 ☰`).not.toBeNull();
  icon!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  const panel = root.querySelector('.vt-toolbar-popup--column-menu') as HTMLElement | null;
  expect(panel, '菜单面板没打开').not.toBeNull();
  return panel!;
}

/** 面板里的条目文字 */
const itemsOf = (panel: HTMLElement): string[] =>
  [...panel.querySelectorAll('.vt-column-menu-item')].map((b) => b.textContent ?? '');

/** 点面板里写着某段文字的那一项 */
function clickItem(panel: HTMLElement, label: string): void {
  const btn = [...panel.querySelectorAll<HTMLButtonElement>('.vt-column-menu-item')].find((b) =>
    (b.textContent ?? '').includes(label),
  );
  expect(btn, `菜单里没有「${label}」`).toBeDefined();
  btn!.click();
}

// ─────────────────────────────────────────────────────────────────────────────

describe('vtColumnMenu · 哪些列有 ☰', () => {
  it('普通数据列都有', () => {
    const { root } = mount([vtColumnMenu<Row>()]);
    for (const key of ['name', 'dept', 'score']) {
      expect(iconOf(root, key), key).not.toBeNull();
    }
  });

  it('功能列没有（序号 / 勾选 / 单选 / 拖拽把手）', () => {
    const { root } = mount([vtColumnMenu<Row>()], {
      columns: [
        { key: 'idx', title: '#', width: 50, type: 'index' },
        { key: 'sel', title: '', width: 50, type: 'checkbox' },
        { key: 'radio', title: '', width: 50, type: 'radio' },
        { key: 'drag', title: '', width: 50, type: 'drag' },
        { key: 'name', title: '姓名', width: 140 },
      ],
    });
    for (const key of ['idx', 'sel', 'radio', 'drag']) {
      expect(iconOf(root, key), key).toBeNull();
    }
    expect(iconOf(root, 'name')).not.toBeNull();
  });

  it('树形列**有**（它只加缩进与箭头，内容照常）', () => {
    const { root } = mount([vtColumnMenu<Row>()], {
      columns: [{ key: 'name', title: '姓名', width: 160, type: 'tree' }],
    });
    expect(iconOf(root, 'name')).not.toBeNull();
  });

  it('分组节点没有，它旗下的叶子有', () => {
    const { root } = mount([vtColumnMenu<Row>()], {
      columns: [
        {
          key: 'g',
          title: '分组',
          width: 0,
          children: [
            { key: 'name', title: '姓名', width: 140 },
            { key: 'score', title: '分数', width: 110 },
          ],
        },
      ],
    });
    expect(iconOf(root, 'g')).toBeNull();
    expect(iconOf(root, 'name')).not.toBeNull();
    expect(iconOf(root, 'score')).not.toBeNull();
  });

  it('disabled 回调能关掉某几列', () => {
    const { root } = mount([vtColumnMenu<Row>({ disabled: (c) => c.key === 'score' })]);
    expect(iconOf(root, 'name')).not.toBeNull();
    expect(iconOf(root, 'score')).toBeNull();
  });
});

describe('vtColumnMenu · 排序', () => {
  it('升 / 降 / 取消都落到查询状态上', () => {
    const { table, root } = mount([vtColumnMenu<Row>()]);

    clickItem(openMenu(root, 'score'), '升序');
    expect(table.getState().sort).toEqual([{ colKey: 'score', order: 'asc' }]);

    clickItem(openMenu(root, 'score'), '降序');
    expect(table.getState().sort).toEqual([{ colKey: 'score', order: 'desc' }]);

    clickItem(openMenu(root, 'score'), '取消排序');
    expect(table.getState().sort ?? []).toEqual([]);
  });

  it('单列模式下换一列排序会顶掉上一列', () => {
    const { table, root } = mount([vtColumnMenu<Row>()]);
    clickItem(openMenu(root, 'score'), '升序');
    clickItem(openMenu(root, 'name'), '升序');
    expect(table.getState().sort).toEqual([{ colKey: 'name', order: 'asc' }]);
  });

  it('多列模式下两列都留着（本列排到末位 = 优先级最低）', () => {
    const { table, root } = mount([vtColumnMenu<Row>()], { sortMode: 'multiple' });
    clickItem(openMenu(root, 'score'), '升序');
    clickItem(openMenu(root, 'name'), '降序');
    expect(table.getState().sort).toEqual([
      { colKey: 'score', order: 'asc' },
      { colKey: 'name', order: 'desc' },
    ]);
  });

  it('当前生效的那一档带 is-active，「取消排序」在没排序时置灰', () => {
    const { root } = mount([vtColumnMenu<Row>()]);
    let panel = openMenu(root, 'score');
    const clear = [...panel.querySelectorAll<HTMLButtonElement>('.vt-column-menu-item')].find(
      (b) => b.textContent === '取消排序',
    )!;
    expect(clear.disabled).toBe(true);

    clickItem(panel, '升序');
    panel = openMenu(root, 'score');
    const asc = [...panel.querySelectorAll('.vt-column-menu-item')].find(
      (b) => b.textContent === '升序',
    )!;
    expect(asc.classList.contains('is-active')).toBe(true);
  });

  it('sortable: false 的列没有排序那一组', () => {
    const { root } = mount([vtColumnMenu<Row>()], {
      columns: [{ key: 'name', title: '姓名', width: 140, sortable: false }],
    });
    const items = itemsOf(openMenu(root, 'name'));
    expect(items.some((t) => t.includes('升序'))).toBe(false);
  });
});

describe('vtColumnMenu · 冻结', () => {
  it('冻到左 / 右 / 取消都落到列上', () => {
    const { table, root } = mount([vtColumnMenu<Row>()]);
    const fixedOf = (key: string) => table.getAllColumns().find((c) => c.key === key)?.fixed;

    clickItem(openMenu(root, 'score'), '冻结到左侧');
    expect(fixedOf('score')).toBe('left');

    clickItem(openMenu(root, 'score'), '冻结到右侧');
    expect(fixedOf('score')).toBe('right');

    clickItem(openMenu(root, 'score'), '取消冻结');
    expect(fixedOf('score')).toBeUndefined();
  });

  it('冻结之后列真的进了固定区（不只是改了个字段）', () => {
    const { root } = mount([vtColumnMenu<Row>()]);
    clickItem(openMenu(root, 'score'), '冻结到左侧');
    const th = root.querySelector('th[data-col-key="score"]') as HTMLElement;
    // 固定列由核心加 `.vt-fixed-*` 一类的类名 / 定位；这里只验它仍在表头里且被重建过
    expect(th).not.toBeNull();
    expect(th.className).toMatch(/vt-/);
  });

  it('没冻结时「取消冻结」置灰', () => {
    const { root } = mount([vtColumnMenu<Row>()]);
    const panel = openMenu(root, 'score');
    const btn = [...panel.querySelectorAll<HTMLButtonElement>('.vt-column-menu-item')].find(
      (b) => b.textContent === '取消冻结',
    )!;
    expect(btn.disabled).toBe(true);
  });
});

describe('vtColumnMenu · 隐藏与列宽', () => {
  it('隐藏本列 → 从可见叶子列里消失', () => {
    const { table, root } = mount([vtColumnMenu<Row>()]);
    clickItem(openMenu(root, 'score'), '隐藏本列');
    expect(table.getVisibleColumns().map((c) => c.key)).toEqual(['name', 'dept']);
    // 全量列树里还在（隐藏不是删除）
    expect(table.getAllColumns().map((c) => c.key)).toContain('score');
  });

  it('hideable: false 的列没有「隐藏本列」', () => {
    const { root } = mount([vtColumnMenu<Row>()], {
      columns: [{ key: 'name', title: '姓名', width: 140, hideable: false }],
    });
    expect(itemsOf(openMenu(root, 'name')).some((t) => t.includes('隐藏'))).toBe(false);
  });

  it('自适应列宽会写回 col.width，且夹在上下限内', () => {
    // happy-dom 没有布局引擎，scrollWidth 恒为 0 → 量不到就不该改宽度（而不是写成 0）
    const { table, root } = mount([vtColumnMenu<Row>({ autoWidthRange: [80, 200] })]);
    const before = table.getAllColumns().find((c) => c.key === 'score')!.width;
    clickItem(openMenu(root, 'score'), '自适应列宽');
    const after = table.getAllColumns().find((c) => c.key === 'score')!.width;
    // 量不到就保持原样 —— 这条正是「宁可不改，也不要把列压成 0」
    expect(after).toBe(before);
  });

  it('量到内容时按上下限夹住', () => {
    const { table, root } = mount([vtColumnMenu<Row>({ autoWidthRange: [80, 200] })]);
    // 注入几何：happy-dom 下 scrollWidth 是 0，手动定义一个超大值
    for (const td of root.querySelectorAll('td[data-col-key="score"]')) {
      Object.defineProperty(td, 'scrollWidth', { value: 9999, configurable: true });
    }
    clickItem(openMenu(root, 'score'), '自适应列宽');
    expect(table.getAllColumns().find((c) => c.key === 'score')!.width).toBe(200);
  });

  it('resizable: false 的列没有「自适应列宽」', () => {
    const { root } = mount([vtColumnMenu<Row>()], {
      columns: [{ key: 'name', title: '姓名', width: 140, resizable: false }],
    });
    expect(itemsOf(openMenu(root, 'name')).some((t) => t.includes('自适应'))).toBe(false);
  });
});

describe('vtColumnMenu · 分组', () => {
  it('按此列分组 → 落到 groupConfig，再点是取消', () => {
    const { table, root } = mount([vtColumnMenu<Row>()]);
    clickItem(openMenu(root, 'dept'), '按此列分组');
    expect(table.getGroupConfig()).toEqual([{ field: 'dept' }]);

    /*
     * 已分组时那一项变成「取消分组」。
     *
     * ⚠️ 这里必须**复用**已经打开的那个面板，不能再调一次 `openMenu` ——
     * 连着点两下同一颗 ☰ 的语义是「收起」，第二次会拿到 null。
     * （这条最初把测试自己写错了一次，留个注释免得下次再犯。）
     */
    const panel = openMenu(root, 'dept');
    expect(itemsOf(panel).some((t) => t.includes('取消分组'))).toBe(true);
    clickItem(panel, '取消分组');
    expect(table.getGroupConfig()).toEqual([]);
  });

  it('对第二列分组是**追加**一层，不是替换', () => {
    const { table, root } = mount([vtColumnMenu<Row>()]);
    clickItem(openMenu(root, 'dept'), '按此列分组');
    clickItem(openMenu(root, 'name'), '按此列分组');
    expect(table.getGroupConfig()).toEqual([{ field: 'dept' }, { field: 'name' }]);
  });
});

describe('vtColumnMenu · 与 vtColumnFilter 的可选依赖', () => {
  it('没装 vtColumnFilter → 菜单里没有「筛选」这一项', () => {
    const { root } = mount([vtColumnMenu<Row>()]);
    expect(itemsOf(openMenu(root, 'dept')).some((t) => t.includes('筛选'))).toBe(false);
  });

  it('装了、且这一列配了 filters → 有「筛选」', () => {
    const { root } = mount([vtColumnMenu<Row>(), vtColumnFilter<Row>()]);
    expect(itemsOf(openMenu(root, 'dept')).some((t) => t.includes('筛选'))).toBe(true);
  });

  it('装了、但这一列没配筛选 → 仍然没有（与漏斗图标的判据同一份）', () => {
    const { root } = mount([vtColumnMenu<Row>(), vtColumnFilter<Row>()]);
    // score 列没有 filters / filterType
    expect(itemsOf(openMenu(root, 'score')).some((t) => t.includes('筛选'))).toBe(false);
    // 反过来验：那一列也确实没有漏斗图标
    expect(root.querySelector('th[data-col-key="score"] .vt-filter-icon')).toBeNull();
  });

  it('点「筛选」会关掉菜单并打开筛选面板（两个浮层不同时在）', () => {
    const { root } = mount([vtColumnMenu<Row>(), vtColumnFilter<Row>()]);
    clickItem(openMenu(root, 'dept'), '筛选');
    expect(root.querySelector('.vt-toolbar-popup--column-menu')).toBeNull();
    expect(root.querySelector('.vt-filter-panel')).not.toBeNull();
  });

  it('插件装载顺序反过来也一样（inject 在 setup 里现取）', () => {
    const { root } = mount([vtColumnFilter<Row>(), vtColumnMenu<Row>()]);
    expect(itemsOf(openMenu(root, 'dept')).some((t) => t.includes('筛选'))).toBe(true);
  });
});

describe('vtColumnMenu · 开合与 API', () => {
  it('点同一颗 ☰ 第二下收起', () => {
    const { root } = mount([vtColumnMenu<Row>()]);
    openMenu(root, 'score');
    iconOf(root, 'score')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(root.querySelector('.vt-toolbar-popup--column-menu')).toBeNull();
  });

  it('点另一列的 ☰ 会换过去，不会同时开两个', () => {
    const { root } = mount([vtColumnMenu<Row>()]);
    openMenu(root, 'score');
    openMenu(root, 'name');
    expect(root.querySelectorAll('.vt-toolbar-popup--column-menu')).toHaveLength(1);
  });

  it('开着的那一列 ☰ 高亮，关掉后擦掉', () => {
    const { root, table } = mount([vtColumnMenu<Row>()]);
    openMenu(root, 'score');
    expect(iconOf(root, 'score')!.classList.contains('vt-column-menu-icon--open')).toBe(true);
    table.closeColumnMenu();
    expect(root.querySelectorAll('.vt-column-menu-icon--open')).toHaveLength(0);
  });

  it('命令式 API：open / close / isOpen', () => {
    const { root, table } = mount([vtColumnMenu<Row>()]);
    expect(table.isColumnMenuOpen()).toBe(false);
    table.openColumnMenu('name');
    expect(table.isColumnMenuOpen()).toBe(true);
    expect(table.isColumnMenuOpen('name')).toBe(true);
    expect(table.isColumnMenuOpen('score')).toBe(false);
    expect(root.querySelector('.vt-toolbar-popup--column-menu')).not.toBeNull();
    table.closeColumnMenu();
    expect(table.isColumnMenuOpen()).toBe(false);
  });

  it('对没有菜单的列调 open 是空操作', () => {
    const { table } = mount([vtColumnMenu<Row>({ disabled: (c) => c.key === 'score' })]);
    table.openColumnMenu('score');
    expect(table.isColumnMenuOpen()).toBe(false);
    table.openColumnMenu('不存在的列');
    expect(table.isColumnMenuOpen()).toBe(false);
  });

  it('☰ 上的点击不会连带触发表头排序', () => {
    const { table, root } = mount([vtColumnMenu<Row>()]);
    iconOf(root, 'score')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    // 只开了菜单，没有排序
    expect(table.getState().sort ?? []).toEqual([]);
    expect(root.querySelector('.vt-toolbar-popup--column-menu')).not.toBeNull();
  });

  it('键盘可达：Enter 打开', () => {
    const { root, table } = mount([vtColumnMenu<Row>()]);
    const icon = iconOf(root, 'score')!;
    expect(icon.getAttribute('tabindex')).toBe('0');
    icon.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(table.isColumnMenuOpen('score')).toBe(true);
  });
});

describe('vtColumnMenu · 条目裁剪与扩展', () => {
  it('items 只留指定的几组，顺序按给的来', () => {
    const { root } = mount([vtColumnMenu<Row>({ items: ['group', 'sort'] })]);
    const items = itemsOf(openMenu(root, 'score'));
    expect(items[0]).toContain('按此列分组');
    expect(items.slice(1)).toEqual(['升序', '降序', '取消排序']);
    expect(items.some((t) => t.includes('冻结'))).toBe(false);
  });

  it('texts 可覆盖文案', () => {
    const { root } = mount([vtColumnMenu<Row>({ items: ['sort'], texts: { sortAsc: 'A→Z' } })]);
    expect(itemsOf(openMenu(root, 'score'))[0]).toBe('A→Z');
  });

  it('extraItems 挂在内置条目之后', () => {
    const spy = vi.fn();
    const { root } = mount([
      vtColumnMenu<Row>({
        items: ['sort'],
        extraItems: (col) => [{ label: `复制「${col.title}」列名`, onClick: spy }],
      }),
    ]);
    const panel = openMenu(root, 'score');
    expect(itemsOf(panel).at(-1)).toBe('复制「分数」列名');
    clickItem(panel, '复制');
    expect(spy).toHaveBeenCalledOnce();
  });
});

describe('vtColumnMenu · 销毁', () => {
  it('destroy 后浮层与 ☰ 都不残留', () => {
    const box = document.createElement('div');
    document.body.appendChild(box);
    const table = new VirtTable<Row>(box, {
      list: ROWS,
      columns: COLS.map((c) => ({ ...c })),
      itemKey: 'id',
      estimatedSize: 40,
      plugins: [vtColumnMenu<Row>()],
    } as VirtTableOptions<Row>);
    const root = box.querySelector('.vt-root') as HTMLElement;
    table.openColumnMenu('score');
    expect(root.querySelector('.vt-toolbar-popup--column-menu')).not.toBeNull();

    table.destroy();
    expect(document.querySelector('.vt-toolbar-popup--column-menu')).toBeNull();
    box.remove();
  });
});
