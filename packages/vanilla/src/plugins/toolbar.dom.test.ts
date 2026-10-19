// @vitest-environment happy-dom
/**
 * `vtToolbar`：一条按钮 + 一个**贡献点**。
 *
 * 这一组分两半：
 *
 * 1. **注册表与外壳** —— 谁能加按钮、摆在哪一侧、徽标与禁用态从哪来、同时只开一个面板、
 *    `bar: false` 时面板还在不在、挂载点怎么解析。这半是这个插件真正的产品面：
 *    甘特配置、撤销/重做、搜索、导出全都走它，接线断了那些按钮会**静默消失**。
 * 2. **四个内置项的落地** —— 断言的是「点了面板里的东西，核心那边真的变了」
 *    （`getAllColumns()` / `getSortState()` / `getGroupConfig()` / `getFilterModel()`），
 *    而不是面板长什么样。控件本体（下拉、勾选框、`VtFilterBuilder`）各自有用例，这里不重测。
 *
 * 拖拽换序那几条**必须注入几何**：happy-dom 没有布局引擎，`getBoundingClientRect` 恒为 0，
 * 而落点判定就是拿指针 Y 去撞每一行的纵向带（与 `drag-sort.dom.test.ts` 同一类做法）。
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { VirtTable, type VirtTableColumn, type VirtTableOptions } from '../index';
import { vtToolbar, type ToolbarService } from './toolbar';
import { vtSearch } from './search';
import { vtExport } from './export';
import { vtRowHeightConfig } from './row-height-config';
import { vtToolbarPanels } from './toolbar-panels';
import { vtFieldConfig } from './field-config';
import { vtSortConfig } from './sort-config';

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
  { id: 1, name: 'a', dept: '设计', owner: '甲', score: 30 },
  { id: 2, name: 'b', dept: '设计', owner: '乙', score: 80 },
  { id: 3, name: 'c', dept: '开发', owner: '甲', score: 100 },
];

const COLS: VirtTableColumn<Row>[] = [
  { key: 'name', title: '名称', width: 160 },
  { key: 'dept', title: '部门', width: 100 },
  { key: 'owner', title: '负责人', width: 100 },
  { key: 'score', title: '分数', width: 90 },
];

/**
 * `vtToolbar` **一颗按钮都不自带**，所以这里默认把四个面板插件的预设装上 ——
 * 这一组多数用例问的是「按钮条怎么摆、面板怎么开」，那些行为需要有项才测得到。
 *
 * 「空条」与「只装一个」这两种形态由 `panels` 参数显式关掉（传 `[]` 或自己那一组）。
 */
function mount(
  toolbar: Parameters<typeof vtToolbar>[0] = {},
  extra: Partial<VirtTableOptions<Row>> = {},
  plugins: VirtTableOptions<Row>['plugins'] = [],
  panels: VirtTableOptions<Row>['plugins'] = vtToolbarPanels<Row>(),
) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  const table = new VirtTable<Row>(box, {
    list: ROWS.map((r) => ({ ...r })),
    columns: COLS.map((c) => ({ ...c })),
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 0,
    fixedSize: true,
    // happy-dom 没有布局 → 渲染窗口会算成 0 行，显式钉住它
    renderControl: () => ({ begin: 0, end: 19 }),
    plugins: [vtToolbar<Row>(toolbar), ...(panels ?? []), ...(plugins ?? [])],
    ...extra,
  } as VirtTableOptions<Row>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  return { box, table };
}

const click = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

const bar = (box: HTMLElement): HTMLElement | null =>
  box.querySelector<HTMLElement>('.vt-toolbar');

const labels = (box: HTMLElement, side?: 'end'): string[] => {
  const scope = side
    ? '.vt-toolbar-group--end .vt-toolbar-button'
    : '.vt-toolbar-group:not(.vt-toolbar-group--end) .vt-toolbar-button';
  return [...box.querySelectorAll<HTMLElement>(scope)].map(
    (b) => b.querySelector('.vt-toolbar-label')!.textContent!,
  );
};

const btnOf = (box: HTMLElement, key: string): HTMLButtonElement =>
  box.querySelector<HTMLButtonElement>(`.vt-toolbar-button[data-toolbar-item="${key}"]`)!;

const badgeOf = (box: HTMLElement, key: string): string => {
  const el = btnOf(box, key).querySelector<HTMLElement>('.vt-toolbar-badge')!;
  return el.style.display === 'none' ? '' : (el.textContent ?? '');
};

/** 点开某一项的面板（已经开着就是关掉，所以只在没开时点） */
const openPanel = (box: HTMLElement, key: string): HTMLElement => {
  const btn = btnOf(box, key);
  if (!btn.classList.contains('is-open')) click(btn);
  return document.querySelector<HTMLElement>('[data-vt-popup] .vt-toolbar-panel')!;
};

const panelNow = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[data-vt-popup] .vt-toolbar-panel');

/** 展开面板里某个下拉并点掉其中一项 */
function pickOption(select: Element, label: string): void {
  click(select);
  const lists = [...document.querySelectorAll('[data-vt-popup] .vt-filter-list')];
  const list = lists[lists.length - 1];
  const hit = [...list.querySelectorAll('.vt-filter-item')].find(
    (b) => b.querySelector('.vt-field-select-label')?.textContent === label,
  );
  if (!hit) throw new Error(`下拉里没有「${label}」`);
  click(hit);
}

// ============================ 外壳与注册表 ============================

describe('vtToolbar 外壳与注册表', () => {
  it('vtToolbar 单装是一条空按钮条，并且说一句为什么', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warn.mockClear();
    const { box } = mount({}, {}, [], []); // 一个贡献插件都不装

    expect(labels(box)).toEqual([]);
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes('vtToolbarPanels')),
      '空条与「插件没装上」长得一样，必须说一句',
    ).toBe(true);
  });

  it('只装一个插件就只有一颗按钮（要哪颗装哪个）', () => {
    const { box } = mount({}, {}, [], [vtSortConfig<Row>()]);
    expect(labels(box)).toEqual(['排序']);
  });

  it('装了预设就是那四颗，按固定顺序摆在左侧', () => {
    const { box } = mount();
    expect(bar(box)).not.toBeNull();
    expect(labels(box)).toEqual(['字段配置', '筛选', '分组', '排序']);
  });

  /**
   * 自动包壳：没人提供槽时，工具栏在 `.vt-root` 外面包一层纵向 flex。
   *
   * `min-height: 0` 那条在 CSS 里（happy-dom 量不了），这里钉住**结构**：
   * 按钮条与 root 是兄弟、按钮条在前、且 root 仍在使用方给的容器里。
   */
  it('没人给槽就自己在 .vt-root 外面包一层，destroy 后拆干净', () => {
    const { box, table } = mount();
    const shell = box.querySelector<HTMLElement>('.vt-toolbar-shell')!;
    expect(shell).not.toBeNull();
    expect([...shell.children].map((c) => c.className.split(' ')[0])).toEqual([
      'vt-toolbar',
      'vt-root',
    ]);

    table.destroy();
    cleanups.pop();
    /*
     * 核心 `destroy()` 末尾会 `_root.innerHTML = ''` 把使用方的容器清空，所以这里断言的是
     * 「一个残留节点都没有」。插件的收尾（把 root 从外壳里挪回原位、撤掉外壳）排在那之前 ——
     * 少了它，`destroy()` 清掉的是外壳里的内容，而外壳本身会留在容器上。
     */
    expect(box.querySelector('.vt-toolbar-shell')).toBeNull();
    expect(box.querySelector('.vt-toolbar')).toBeNull();
    expect(box.children.length).toBe(0);
    box.remove();
  });

  /**
   * **与表格拼成一块板子。** 表格开了 `border` 就是一张圆角卡片，而按钮条默认是一条平的槽 ——
   * 两者同宽摞在一起会读成两个组件（用户第一句反馈就是「割裂」）。`--card` 让按钮条接管
   * 卡片的上半截；圆角怎么收在 CSS 里（`css-contract.test.ts` 守着），这里钉**什么时候加**。
   */
  it('自己包壳 + 表格开了 border → 按钮条接管卡片上半截', () => {
    const { box } = mount({}, { border: true } as any);
    expect(bar(box)!.classList.contains('vt-toolbar--card')).toBe(true);
  });

  it('表格没开 border（没有卡片可接）→ 不加', () => {
    const { box } = mount();
    expect(bar(box)!.classList.contains('vt-toolbar--card')).toBe(false);
  });

  it('挂进别人的槽 / 使用方的容器时不加 —— 那两处的外缘不是工具栏说了算的', () => {
    const slot = document.createElement('div');
    const probe = {
      name: 'probe',
      setup(ctx: any) {
        ctx.rootEl.appendChild(slot);
        ctx.provide('toolbarSlot', () => slot);
      },
    };
    const a = mount({}, { border: true } as any, [probe as any]);
    expect(bar(a.box)!.classList.contains('vt-toolbar--card')).toBe(false);

    const host = document.createElement('div');
    document.body.appendChild(host);
    mount({ mount: host }, { border: true } as any);
    expect(host.querySelector('.vt-toolbar')!.classList.contains('vt-toolbar--card')).toBe(false);
    host.remove();
  });

  it('mount 指定容器时不包壳，按钮条挂进去', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const { box } = mount({ mount: host });
    expect(host.querySelector('.vt-toolbar')).not.toBeNull();
    expect(box.querySelector('.vt-toolbar-shell')).toBeNull();
    host.remove();
  });

  /**
   * 别的插件提供的槽（甘特用它让按钮条横跨任务面板与时间轴）。
   *
   * 顺带钉住**顺序无关**：探针插件写在 `vtToolbar` **后面**，`provide` 发生在它之后，
   * 而工具栏是在 `onMounted` 里才解析挂载点的 —— 所以照样找得到。
   */
  it('用别的插件 provide 的 toolbarSlot（且与插件声明顺序无关）', () => {
    const slot = document.createElement('div');
    slot.className = 'my-slot';
    const probe = {
      name: 'probe',
      setup(ctx: any) {
        ctx.rootEl.appendChild(slot);
        ctx.provide('toolbarSlot', () => slot);
      },
    };
    const { box } = mount({}, {}, [probe as any]);
    expect(slot.querySelector('.vt-toolbar')).not.toBeNull();
    expect(box.querySelector('.vt-toolbar-shell')).toBeNull();
  });

  it('bar: false 不画按钮条，但面板照样能开（自己放按钮的用法）', () => {
    const { box, table } = mount({ bar: false });
    expect(bar(box)).toBeNull();

    const myBtn = document.createElement('button');
    document.body.appendChild(myBtn);
    table.toggleToolbarPanel('sort', myBtn);
    expect(panelNow()).not.toBeNull();
    expect(table.isToolbarPanelOpen('sort')).toBe(true);
    table.closeToolbarPanel();
    expect(panelNow()).toBeNull();
    myBtn.remove();
  });

  it('外部插件注册的项：摆得出、点得着、能反注册', () => {
    let hits = 0;
    let off: (() => void) | null = null;
    const probe = {
      name: 'probe',
      setup(ctx: any) {
        ctx.on('onMounted', () => {
          const toolbar = ctx.inject('toolbar') as ToolbarService;
          off = toolbar.register({
            key: 'mine',
            label: '我的',
            side: 'right',
            badge: () => hits || null,
            onClick: () => {
              hits += 1;
            },
          });
        });
      },
    };
    const { box } = mount({}, {}, [probe as any]);

    // 靠右那一组独立成盒（左边四颗不受影响）
    expect(labels(box, 'end')).toEqual(['我的']);
    expect(labels(box)).toEqual(['字段配置', '筛选', '分组', '排序']);

    // 动作型：点一下就执行，且顺手重算徽标（动作可能改了状态）
    expect(badgeOf(box, 'mine')).toBe('');
    click(btnOf(box, 'mine'));
    expect(hits).toBe(1);
    expect(badgeOf(box, 'mine')).toBe('1');
    /*
     * 按钮里只有三样东西：图标、生效数量、文字。**没有下拉箭头** —— 一排 ▾ 只是重复
     * 「点开有东西」这件所有人都会试的事，而它挤掉的是标签的宽度。
     */
    expect(btnOf(box, 'mine').querySelector('.vt-toolbar-caret')).toBeNull();
    expect(btnOf(box, 'columns').querySelector('.vt-toolbar-caret')).toBeNull();

    off!();
    expect(box.querySelector('.vt-toolbar-group--end')).toBeNull();
    expect(labels(box)).toEqual(['字段配置', '筛选', '分组', '排序']);
  });

  /**
   * 撞 key 一律「先到先得」—— 没有「自带项可以被盖掉」这回事了（工具栏一颗都不自带）。
   * 想换掉某个面板的配置就配在那个插件上，而不是再注册一个同 key 项。
   */
  it('已被插件占用的 key 再注册 → 后者被拒并告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warn.mockClear();
    const { box, table } = mount();
    table.registerToolbarItem({ key: 'sort', label: '我的排序', order: 40 });

    expect(labels(box)).toEqual(['字段配置', '筛选', '分组', '排序']);
    expect(warn.mock.calls.some((c) => String(c[0]).includes('sort'))).toBe(true);
  });

  it('两个贡献方抢同一个 key：后者被拒并告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warn.mockClear();
    const { box, table } = mount();
    table.registerToolbarItem({ key: 'mine', label: '先来的' });
    table.registerToolbarItem({ key: 'mine', label: '后到的' });
    // 四个面板的排序位是 10/20/30/40，没给 order 的项按 0 排在最前
    expect(labels(box)).toEqual(['先来的', '字段配置', '筛选', '分组', '排序']);
    expect(warn.mock.calls.some((c) => String(c[0]).includes('mine'))).toBe(true);
  });

  it('disabled() 为真时按钮置灰（撤销栈空了就是这个形状）', () => {
    let can = false;
    const { box, table } = mount();
    table.registerToolbarItem({
      key: 'undo',
      label: '撤销',
      disabled: () => !can,
      onClick: () => {},
    });
    expect(btnOf(box, 'undo').disabled).toBe(true);
    can = true;
    table.refreshToolbar();
    expect(btnOf(box, 'undo').disabled).toBe(false);
  });

  it('同时只开一个面板：点第二颗把第一颗关掉', () => {
    const { box } = mount();
    openPanel(box, 'sort');
    expect(btnOf(box, 'sort').classList.contains('is-open')).toBe(true);
    openPanel(box, 'group');
    expect(btnOf(box, 'sort').classList.contains('is-open')).toBe(false);
    expect(btnOf(box, 'group').classList.contains('is-open')).toBe(true);
    expect(document.querySelectorAll('[data-vt-popup] .vt-toolbar-panel').length).toBe(1);
  });

  it('再点同一颗 = 关掉（它是开合按钮）', () => {
    const { box, table } = mount();
    openPanel(box, 'columns');
    click(btnOf(box, 'columns'));
    expect(panelNow()).toBeNull();
    expect(table.isToolbarPanelOpen()).toBe(false);
  });

  it('setLocale 换语言后按钮文字跟着换', () => {
    const { box, table } = mount();
    expect(labels(box)).toEqual(['字段配置', '筛选', '分组', '排序']);
    table.setLocale({ toolbar: { sort: 'Sort' } });
    expect(labels(box)).toEqual(['字段配置', '筛选', '分组', 'Sort']);
  });

  /**
   * 文案跟着**贡献方**走：按钮文字是各插件从 locale 取的，所以覆盖也传在那个插件上。
   * 工具栏的 `texts` 只管它自己的东西（目前它自己没有文案）—— 这正是「工具栏不认识
   * 任何一颗按钮」的另一面。
   */
  it('texts 传在贡献它的插件上', () => {
    const { box } = mount({}, {}, [], vtToolbarPanels<Row>({ sortConfig: { texts: { sort: '排个序' } } }));
    expect(labels(box)).toEqual(['字段配置', '筛选', '分组', '排个序']);
  });

  it('vtSearch / vtExport 自己注册进来（同仓插件不必被工具栏认识）', () => {
    const { box } = mount({}, {}, [vtSearch<Row>(), vtExport<Row>()], []);
    expect(labels(box)).toEqual(['搜索', '导出']);

    // 搜索是动作型：点一下开搜索框
    click(btnOf(box, 'search'));
    expect(box.querySelector('.vt-search-box')).not.toBeNull();

    /*
     * 导出是面板型：三行 CSV / Excel / 打印。
     *
     * 查的是 `.vt-toolbar-panel-btn`（面板基元的按钮），2026-08-31 从 `.vt-filter-item`
     * 换过来的 —— 后者的规则住在 `_panel.css` 里，而把四个面板拆成独立插件之后
     * `toolbar.css` **不再内联它**。于是「只装 vtToolbar + vtExport」时这三行是没有样式的
     * 裸按钮。基元那个类跟着 `toolbar.css` 走，装谁都有样式。
     */
    const panel = openPanel(box, 'export');
    expect([...panel.querySelectorAll('.vt-toolbar-panel-btn')].map((b) => b.textContent)).toEqual([
      '导出 CSV',
      '导出 Excel',
      '打印',
    ]);
  });
});

// ============================ 字段配置 ============================

describe('vtToolbar 内置项 · 字段配置', () => {
  const items = (panel: HTMLElement): HTMLElement[] => [
    ...panel.querySelectorAll<HTMLElement>('.vt-toolbar-fields-item'),
  ];
  const nameOf = (item: HTMLElement): string =>
    item.querySelector('.vt-toolbar-fields-name')!.textContent!;
  const boxOf = (item: HTMLElement): HTMLInputElement =>
    item.querySelector<HTMLInputElement>('.vt-filter-checkbox')!;

  it('列出有标题的列，功能列与 hideable: false 不出现', () => {
    const { box } = mount({}, {
      columns: [
        { key: '_drag', title: '', width: 34, type: 'drag' },
        { key: 'name', title: '名称', width: 160, hideable: false },
        { key: 'dept', title: '部门', width: 100 },
      ],
    } as any);
    expect(items(openPanel(box, 'columns')).map(nameOf)).toEqual(['部门']);
  });

  it('勾掉一列 → 核心真的隐藏了，徽标显示隐藏了几列', () => {
    const { box, table } = mount();
    const panel = openPanel(box, 'columns');
    const owner = items(panel).find((i) => nameOf(i) === '负责人')!;
    boxOf(owner).checked = false;
    boxOf(owner).dispatchEvent(new Event('change', { bubbles: true }));

    expect(table.getVisibleColumns().map((c) => c.key)).toEqual(['name', 'dept', 'score']);
    expect(badgeOf(box, 'columns')).toBe('1');

    // 面板重画后回显新状态，再勾回来
    const again = items(panelNow()!).find((i) => nameOf(i) === '负责人')!;
    expect(boxOf(again).checked).toBe(false);
    boxOf(again).checked = true;
    boxOf(again).dispatchEvent(new Event('change', { bubbles: true }));
    expect(table.getAllColumns().some((c) => c.hidden)).toBe(false);
    expect(badgeOf(box, 'columns')).toBe('');
  });

  /**
   * 这条钉的是一次真实 bug：**勾一下显隐，面板闪一下**。
   *
   * 根因是那次勾选自己会派发 `onColumnsChanged`，而工具栏当时借这个钩子「关掉重开」面板 ——
   * 于是每勾一次浮层就被销毁重建一次（滚动位置也回到顶部）。修法是 `PanelHandle.refresh`：
   * 结构没变就只同步几个 `checked` 与锁定态。
   *
   * 断言的形式是「**同一个 DOM 节点**还在」：浮层、内容容器、每一行都不许被换掉。
   * 这比断言「没有闪」可判定，也正好是重建与就地更新的分水岭。
   */
  it('勾显隐只就地同步，不重建浮层（每勾一次都闪的那个 bug）', () => {
    const { box, table } = mount();
    const panel = openPanel(box, 'columns');
    const popup = panel.closest('[data-vt-popup]')!;
    const rowsBefore = items(panel);
    const owner = rowsBefore.find((i) => nameOf(i) === '负责人')!;

    boxOf(owner).checked = false;
    boxOf(owner).dispatchEvent(new Event('change', { bubbles: true }));

    // 浮层 / 内容容器 / 每一行都还是原来那几个节点
    expect(panel.closest('[data-vt-popup]')).toBe(popup);
    expect(panelNow()).toBe(panel);
    expect(items(panelNow()!)).toEqual(rowsBefore);
    // 而状态确实同步了（勾选态 + 徽标）
    expect(boxOf(owner).checked).toBe(false);
    expect(table.getAllColumns().find((c) => c.key === 'owner')!.hidden).toBe(true);
    expect(badgeOf(box, 'columns')).toBe('1');
  });

  /**
   * 锁定态是**算出来的**（「只剩一列」依赖当前可见列数），所以它必须能在就地同步里
   * 两个方向都走通。反向那一半尤其容易漏：一行从锁定改回可用之后还得**能点** ——
   * 早先勾选监听绑在「当时没锁」的分支里，解锁后的那一行是死的。
   */
  it('就地同步能把锁定态解开，且解开后那一行还能点', () => {
    const { box, table } = mount();
    openPanel(box, 'columns');
    for (const label of ['部门', '负责人', '分数']) {
      const item = items(panelNow()!).find((i) => nameOf(i) === label)!;
      boxOf(item).checked = false;
      boxOf(item).dispatchEvent(new Event('change', { bubbles: true }));
    }
    const name = items(panelNow()!).find((i) => nameOf(i) === '名称')!;
    expect(boxOf(name).disabled).toBe(true);

    // 把「部门」勾回来 → 不再是最后一列，「名称」解锁
    const dept = items(panelNow()!).find((i) => nameOf(i) === '部门')!;
    boxOf(dept).checked = true;
    boxOf(dept).dispatchEvent(new Event('change', { bubbles: true }));
    expect(boxOf(name).disabled).toBe(false);
    expect(name.title).toBe('');

    // 解锁后的那一行真的还能点
    boxOf(name).checked = false;
    boxOf(name).dispatchEvent(new Event('change', { bubbles: true }));
    expect(table.getVisibleColumns().map((c) => c.key)).toEqual(['dept']);
  });

  it('最后一列勾不掉（全勾掉会得到一张只有表头的空表）', () => {
    const { box, table } = mount();
    for (const label of ['部门', '负责人', '分数']) {
      const item = items(panelNow() ?? openPanel(box, 'columns')).find(
        (i) => nameOf(i) === label,
      )!;
      boxOf(item).checked = false;
      boxOf(item).dispatchEvent(new Event('change', { bubbles: true }));
    }
    expect(table.getVisibleColumns().map((c) => c.key)).toEqual(['name']);
    const left = items(panelNow()!).find((i) => nameOf(i) === '名称')!;
    expect(boxOf(left).disabled).toBe(true);
    expect(left.title).toContain('至少');
  });

  /**
   * `canToggleColumn` 是给「知道原因的那一方」留的口子：核心不认识「这列是甘特的冻结列」
   * 这种约束，但拦在入口比让它静默出错好。返回的字符串就是鼠标停上去看到的原因。
   */
  it('canToggleColumn 返回字符串 → 那一列置灰，且这句话就是原因', () => {
    // 这条约束传给**字段配置那个插件**（工具栏不再有同名选项：一个配置只有一处入口）
    const { box, table } = mount({}, {}, [], [
      vtFieldConfig<Row>({
        canToggleColumn: (col) => (col.key === 'dept' ? '这列被别人钉住了' : true),
      }),
    ]);
    const panel = openPanel(box, 'columns');
    const dept = items(panel).find((i) => nameOf(i) === '部门')!;
    expect(boxOf(dept).disabled).toBe(true);
    expect(dept.title).toBe('这列被别人钉住了');
    // 点不动：状态不变
    boxOf(dept).dispatchEvent(new Event('change', { bubbles: true }));
    expect(table.getAllColumns().some((c) => c.hidden)).toBe(false);
    // 别的列照常
    expect(boxOf(items(panel).find((i) => nameOf(i) === '分数')!).disabled).toBe(false);
  });

  // ---- 拖拽换序 ----
  const ITEM_H = 28;
  const EV = { bubbles: true, button: 0, pointerId: 3, isPrimary: true };

  /** 给面板里的每一行摆上规整几何（happy-dom 里全是 0，落点判定就吃这个） */
  function layout(panel: HTMLElement): void {
    const list = panel.querySelector<HTMLElement>('.vt-toolbar-fields')!;
    list.getBoundingClientRect = () =>
      ({ top: 0, bottom: 999, left: 0, right: 200, width: 200, height: 999, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    items(panel).forEach((item, i) => {
      item.getBoundingClientRect = () =>
        ({
          top: i * ITEM_H, bottom: (i + 1) * ITEM_H, height: ITEM_H,
          left: 0, right: 200, width: 200, x: 0, y: i * ITEM_H, toJSON: () => ({}),
        }) as DOMRect;
    });
  }

  function dragItem(panel: HTMLElement, label: string, y: number, drop = true): void {
    const item = items(panel).find((i) => nameOf(i) === label)!;
    const grip = item.querySelector<HTMLElement>('.vt-toolbar-fields-grip')!;
    const from = items(panel).indexOf(item) * ITEM_H + 2;
    grip.dispatchEvent(new PointerEvent('pointerdown', { ...EV, clientY: from }));
    document.dispatchEvent(new PointerEvent('pointermove', { ...EV, clientY: y }));
    if (drop) document.dispatchEvent(new PointerEvent('pointerup', { ...EV, clientY: y }));
  }

  it('拖手柄换序 → 核心的列序真的变了，面板跟着重画', () => {
    const { box, table } = mount();
    const panel = openPanel(box, 'columns');
    layout(panel);
    // 「分数」（第 4 行）拖到「部门」（第 2 行）上半 → 落在部门之前
    dragItem(panel, '分数', ITEM_H * 1 + 4);
    expect(table.getAllColumns().map((c) => c.key)).toEqual(['name', 'score', 'dept', 'owner']);
    expect(items(panelNow()!).map(nameOf)).toEqual(['名称', '分数', '部门', '负责人']);
  });

  it('没越过阈值就松手 = 一次点击，不换序，也不会翻勾选', () => {
    const { box, table } = mount();
    const panel = openPanel(box, 'columns');
    layout(panel);
    dragItem(panel, '分数', ITEM_H * 3 + 4); // 起点也在这一行，位移 2px
    expect(table.getAllColumns().map((c) => c.key)).toEqual(['name', 'dept', 'owner', 'score']);
    expect(table.getAllColumns().some((c) => c.hidden)).toBe(false);
  });

  it('落回原位不算落点：提示线不画，也不白重建一次列', () => {
    const { box, table } = mount();
    const panel = openPanel(box, 'columns');
    layout(panel);
    const spy = vi.spyOn(table, 'setColumns');
    // 「部门」(idx1) 拖到「名称」(idx0) 的下半 → 归约后就是原位
    dragItem(panel, '部门', ITEM_H - 2, false);
    const line = panel.querySelector<HTMLElement>('.vt-toolbar-fields-drop-line');
    expect(!line || line.style.display === 'none').toBe(true);
    document.dispatchEvent(new PointerEvent('pointerup', { ...EV, clientY: ITEM_H - 2 }));
    expect(spy).not.toHaveBeenCalled();
  });

  it('拖动中画出落点提示线，松手后收掉', () => {
    const { box } = mount();
    const panel = openPanel(box, 'columns');
    layout(panel);
    dragItem(panel, '分数', ITEM_H * 1 + 4, false);
    const line = panel.querySelector<HTMLElement>('.vt-toolbar-fields-drop-line')!;
    expect(line).not.toBeNull();
    expect(line.style.top).toBe(`${ITEM_H}px`); // 落在「部门」上缘
    document.dispatchEvent(new PointerEvent('pointerup', { ...EV, clientY: ITEM_H + 4 }));
    expect(panel.querySelector('.is-dragging')).toBeNull();
  });
});

// ============================ 排序 ============================

describe('vtToolbar 内置项 · 排序', () => {
  const rules = (panel: HTMLElement): HTMLElement[] => [
    ...panel.querySelectorAll<HTMLElement>('.vt-toolbar-rule'),
  ];
  const addBtn = (panel: HTMLElement): HTMLElement | null =>
    panel.querySelector<HTMLElement>('.vt-toolbar-panel-add');

  it('加一条 → 核心的排序状态真的变了（默认挑第一个没用过的列 + 升序）', () => {
    const { box, table } = mount();
    const panel = openPanel(box, 'sort');
    expect(table.getSortState()).toEqual([]);
    click(addBtn(panel)!);
    expect(table.getSortState()).toEqual([{ colKey: 'name', order: 'asc' }]);
    expect(badgeOf(box, 'sort')).toBe('1');
  });

  it('换列、换方向都直接落地', () => {
    const { box, table } = mount();
    click(addBtn(openPanel(box, 'sort'))!);

    pickOption(rules(panelNow()!)[0].querySelector('.vt-field-select')!, '分数');
    expect(table.getSortState()).toEqual([{ colKey: 'score', order: 'asc' }]);

    const seg = [...rules(panelNow()!)[0].querySelectorAll<HTMLElement>('.vt-toolbar-seg-item')];
    expect(seg.map((b) => b.textContent)).toEqual(['升序', '降序']);
    click(seg[1]);
    expect(table.getSortState()).toEqual([{ colKey: 'score', order: 'desc' }]);
  });

  it('sortable: false 的列不进候选（使用方说过这列不排序）', () => {
    const { box } = mount({}, {
      columns: [
        { key: 'name', title: '名称', width: 160, sortable: false },
        { key: 'dept', title: '部门', width: 100 },
      ],
    } as any);
    click(addBtn(openPanel(box, 'sort'))!);
    click(rules(panelNow()!)[0].querySelector('.vt-field-select')!);
    const lists = [...document.querySelectorAll('[data-vt-popup] .vt-filter-list')];
    const opts = [...lists[lists.length - 1].querySelectorAll('.vt-field-select-label')].map(
      (e) => e.textContent,
    );
    expect(opts).toEqual(['部门']);
  });

  it('删掉那一条 → 排序清空，徽标消失', () => {
    const { box, table } = mount();
    click(addBtn(openPanel(box, 'sort'))!);
    click(rules(panelNow()!)[0].querySelector('.vt-toolbar-panel-icon-btn')!);
    expect(table.getSortState()).toEqual([]);
    expect(badgeOf(box, 'sort')).toBe('');
  });

  it('没开 sortMode: multiple 时只允许一条，并说明原因', () => {
    const { box, table } = mount();
    click(addBtn(openPanel(box, 'sort'))!);
    const panel = panelNow()!;
    expect(addBtn(panel)).toBeNull();
    expect(panel.textContent).toContain('multiple');
    expect(table.getSortState().length).toBe(1);
  });

  it('开了 sortMode: multiple 就能叠第二条', () => {
    const { box, table } = mount({}, { sortMode: 'multiple' } as any);
    click(addBtn(openPanel(box, 'sort'))!);
    click(addBtn(panelNow()!)!);
    expect(table.getSortState()).toEqual([
      { colKey: 'name', order: 'asc' },
      { colKey: 'dept', order: 'asc' },
    ]);
    expect(badgeOf(box, 'sort')).toBe('2');
  });

  it('清除排序：一键回到没有排序', () => {
    const { box, table } = mount();
    click(addBtn(openPanel(box, 'sort'))!);
    click(panelNow()!.querySelector('.vt-toolbar-panel-footer .vt-toolbar-panel-btn')!);
    expect(table.getSortState()).toEqual([]);
  });

  it('外部改了排序（表头点击 / setState）→ 徽标跟着对上', () => {
    const { box, table } = mount();
    table.sort('score', 'desc');
    table.refreshToolbar();
    expect(badgeOf(box, 'sort')).toBe('1');
  });
});

// ============================ 分组 ============================

describe('vtToolbar 内置项 · 分组', () => {
  const groups = (box: HTMLElement): string[] =>
    [...box.querySelectorAll<HTMLElement>('.vt-tbody tr.vt-tr .vt-group-label')].map(
      (el) => el.textContent!,
    );
  const rules = (panel: HTMLElement): HTMLElement[] => [
    ...panel.querySelectorAll<HTMLElement>('.vt-toolbar-rule'),
  ];

  it('加一级 → 表里真的出现分组行；清除 → 回到扁平', () => {
    const { box, table } = mount({}, { defaultExpandAll: true } as any);
    const panel = openPanel(box, 'group');
    expect(groups(box)).toEqual([]);

    click(panel.querySelector('.vt-toolbar-panel-add')!);
    expect(table.getGroupConfig()).toEqual([{ field: 'dept' }]);
    expect(groups(box)).toEqual(['设计', '开发']);
    expect(badgeOf(box, 'group')).toBe('1');

    click(panelNow()!.querySelector('.vt-toolbar-panel-footer .vt-toolbar-panel-btn')!);
    expect(table.getGroupConfig()).toEqual([]);
    expect(groups(box)).toEqual([]);
    expect(badgeOf(box, 'group')).toBe('');
  });

  it('两级分组：层级标签按序给出，第二级挑的是另一列', () => {
    const { box, table } = mount({}, { defaultExpandAll: true } as any);
    click(openPanel(box, 'group').querySelector('.vt-toolbar-panel-add')!);
    click(panelNow()!.querySelector('.vt-toolbar-panel-add')!);
    expect(
      rules(panelNow()!).map((r) => r.querySelector('.vt-toolbar-rule-label')?.textContent),
    ).toEqual(['第 1 级', '第 2 级']);
    expect(table.getGroupConfig()).toEqual([{ field: 'dept' }, { field: 'owner' }]);
  });

  it('三档方向：默认「原序」不写 sort，点降序才写进配置', () => {
    const { box, table } = mount({}, { defaultExpandAll: true } as any);
    click(openPanel(box, 'group').querySelector('.vt-toolbar-panel-add')!);
    const seg = [...rules(panelNow()!)[0].querySelectorAll<HTMLElement>('.vt-toolbar-seg-item')];
    expect(seg.map((b) => b.textContent)).toEqual(['原序', '升序', '降序']);
    expect(seg[0].classList.contains('is-active')).toBe(true);
    expect(table.getGroupConfig()).toEqual([{ field: 'dept' }]);

    click(seg[2]);
    expect(table.getGroupConfig()).toEqual([{ field: 'dept', sort: 'desc' }]);
  });

  /**
   * 候选列的两条判据都在这里钉住：**逐行唯一的列不算分类维度**（名称三行三个值，
   * 按它分组等于把表打散），**日期列也不算**（会得到几百个只有一行的分组）。
   */
  it('候选排除逐行唯一的列与日期列', () => {
    const { box } = mount({}, {
      list: [
        { id: 1, name: 'a', dept: '设计', when: '2026-08-01' },
        { id: 2, name: 'b', dept: '设计', when: '2026-08-02' },
        { id: 3, name: 'c', dept: '开发', when: '2026-08-03' },
      ],
      columns: [
        { key: 'name', title: '名称', width: 120 },
        { key: 'dept', title: '部门', width: 100 },
        { key: 'when', title: '日期', width: 120 },
      ],
      defaultExpandAll: true,
    } as any);
    click(openPanel(box, 'group').querySelector('.vt-toolbar-panel-add')!);
    click(rules(panelNow()!)[0].querySelector('.vt-field-select')!);
    const lists = [...document.querySelectorAll('[data-vt-popup] .vt-filter-list')];
    const opts = [...lists[lists.length - 1].querySelectorAll('.vt-field-select-label')].map(
      (e) => e.textContent,
    );
    expect(opts).toEqual(['部门']);
  });

  /**
   * 分组默认是折叠的，于是「开了分组之后显示列表里一行数据都没有」。候选推断必须往
   * `children` 里钻 —— 只数顶层的话第二级会告诉你「没有适合分组的列」，而用户面前明明
   * 就是一张分好组的表。
   */
  it('已经分了组（且折叠着）时候选还在 —— 采样要钻进 children', () => {
    const { box, table } = mount();
    expect(table.getGroupConfig()).toEqual([]);
    table.setGroupConfig([{ field: 'dept' }]);
    // 没开 defaultExpandAll → 分组行是折叠的，显示列表里只有分组行
    expect(box.querySelectorAll('.vt-tbody tr.vt-tr:not(.vt-tr--group)').length).toBe(0);
    const panel = openPanel(box, 'group');
    expect(panel.textContent).not.toContain('没有适合分组的列');
    expect(rules(panel).length).toBe(1);
  });
});

// ============================ 筛选 ============================

describe('vtToolbar 内置项 · 筛选', () => {
  /** 点筛选管理器里那颗「添加条件」，返回新出现的那一行 */
  function addCondition(): HTMLElement {
    const btn = [...document.querySelectorAll<HTMLElement>('.vt-fb .vt-fb-btn--add')].find((b) =>
      b.textContent?.includes('添加条件'),
    )!;
    click(btn);
    const rows = [...document.querySelectorAll<HTMLElement>('.vt-fb .vt-fb-row')];
    return rows[rows.length - 1];
  }

  it('浮层里装的是核心的筛选管理器，且去掉了它自带的那层外壳', () => {
    const { box } = mount();
    const panel = openPanel(box, 'filter');
    expect(panel.querySelector('.vt-fb')).not.toBeNull();
    expect(panel.querySelector('.vt-fb-group')).not.toBeNull();
    // 类名带上 key，CSS 才能按 popup 去壳（`.vt-toolbar-popup--filter`）
    expect(document.querySelector('.vt-toolbar-popup--filter')).not.toBeNull();
  });

  it('可筛选列取当前可见列（在字段配置里藏掉的列不该还能筛）', () => {
    const { box, table } = mount();
    table.setColumnVisible('owner', false);
    openPanel(box, 'filter');
    const row = addCondition();
    const opts = [...row.querySelectorAll('select')[0].querySelectorAll('option')].map(
      (o) => o.textContent,
    );
    expect(opts).toContain('部门');
    expect(opts).not.toContain('负责人');
  });

  it('点「应用筛选」→ 落到核心的 filterModel，行真的少了，徽标显示条件数', () => {
    const { box, table } = mount();
    openPanel(box, 'filter');
    const row = addCondition();

    const colSel = row.querySelectorAll<HTMLSelectElement>('select')[0];
    colSel.value = 'dept';
    colSel.dispatchEvent(new Event('change', { bubbles: true }));

    const input = [...document.querySelectorAll<HTMLElement>('.vt-fb .vt-fb-row')]
      .pop()!
      .querySelector<HTMLInputElement>('.vt-fb-input')!;
    input.value = '开发';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    click(
      [...document.querySelectorAll<HTMLElement>('.vt-fb button')].find((b) =>
        b.textContent?.includes('应用筛选'),
      )!,
    );

    expect(table.getFilterModel()).not.toBeNull();
    expect(badgeOf(box, 'filter')).toBe('1');
    expect(box.querySelectorAll('.vt-tbody tr.vt-tr').length).toBe(1);
    // 筛选生效期间核心拒绝行重排（这是既有语义，顺带钉住）
    expect(table.canReorderRows()).toBe(false);
  });

  it('关掉面板时把筛选管理器销毁掉（它在容器上挂了 .vt-fb）', () => {
    const { box } = mount();
    const panel = openPanel(box, 'filter');
    const holder = panel.querySelector<HTMLElement>('.vt-toolbar-filter')!;
    expect(holder.classList.contains('vt-fb')).toBe(true);
    click(btnOf(box, 'filter'));
    expect(holder.classList.contains('vt-fb')).toBe(false);
    expect(holder.innerHTML).toBe('');
  });
});

// ============================ 一个能力，两个入口 ============================

/**
 * `vtSearch` / `vtExport` 与工具栏的关系：**它们就是工具栏里的「搜索」「导出」**，
 * 不是另一份实现。差别只在谁来唤出 —— 所以「有按钮」与「只有快捷键」是同一个插件的两个选项，
 * 而不是两个东西。这一组把这件事钉住。
 */
describe('vtToolbar 上的动作型项来自各自的插件', () => {
  const searchBox = (box: HTMLElement): HTMLElement =>
    box.querySelector<HTMLElement>('.vt-search-box')!;

  it('vtSearch 默认同时给快捷键与按钮；toolbar: false 只留快捷键', () => {
    const withBtn = mount({}, {}, [vtSearch<Row>()]);
    expect(labels(withBtn.box)).toContain('搜索');

    const noBtn = mount({}, {}, [vtSearch<Row>({ toolbar: false })]);
    expect(labels(noBtn.box)).not.toContain('搜索');
    // 能力还在：API 照旧打开搜索框
    noBtn.table.openSearch();
    // 搜索框是预建 + 靠 display 显隐（不是建删）
    expect(searchBox(noBtn.box).style.display).not.toBe('none');
  });

  it('hotkey: false 只留按钮（Ctrl/Cmd+F 交回浏览器）', () => {
    const { box } = mount({}, {}, [vtSearch<Row>({ hotkey: false })]);
    expect(labels(box)).toContain('搜索');

    const root = box.querySelector('.vt-root')!;
    root.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }),
    );
    expect(searchBox(box).style.display, 'Ctrl+F 不该唤出它').toBe('none');

    // 那颗按钮仍然能开
    click(btnOf(box, 'search'));
    expect(searchBox(box).style.display).not.toBe('none');
  });

  it('vtExport 的 toolbar: false 只留 API', () => {
    const { box, table } = mount({}, {}, [vtExport<Row>({ toolbar: false })]);
    expect(labels(box)).not.toContain('导出');
    expect(typeof table.exportCsv).toBe('function');
  });

  /** 排序位集中在 `internal/toolbar-order.ts`：一度 `vtSearch` 与 `vtRowHeightConfig` 都写着 50 */
  it('各项的排序位不撞车，读法固定', () => {
    const { box } = mount({}, {}, [vtRowHeightConfig<Row>(), vtSearch<Row>(), vtExport<Row>()]);
    expect(labels(box)).toEqual([
      '字段配置',
      '筛选',
      '分组',
      '排序',
      '行高',
      '搜索',
      '导出',
    ]);
  });
});
