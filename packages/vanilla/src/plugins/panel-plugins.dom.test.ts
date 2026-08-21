// @vitest-environment happy-dom
/**
 * 四个面板插件的**两种归宿**：`vtFieldConfig` / `vtFilterConfig` / `vtGroupConfig` / `vtSortConfig`。
 *
 * 装了 `vtToolbar` 就挂成工具栏上的一颗按钮，没装就自己开浮层。这一组守的正是这条分岔：
 *
 * 1. **单独用**（没有工具栏）—— `toggleXxx(anchor)` 真能开出面板，面板里的操作真能落到核心；
 * 2. **握手**（有工具栏）—— 插件把自己注册成工具栏上一项，开合 API 转发给那颗按钮。
 *    工具栏**一颗都不自带**：装几个插件就有几颗按钮。
 *
 * 面板内部的交互（勾选/规则行/拖拽换序落地）在 `toolbar.dom.test.ts` 里已经按内置项测过 ——
 * 那是同一份实现，这里只测「入口接对了没有」，不重测面板本身。
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { VirtTable, type VirtTableColumn, type VirtTableOptions } from '../index';
import { vtToolbar } from './toolbar';
import { vtFieldConfig } from './field-config';
import { vtFilterConfig } from './filter-config';
import { vtGroupConfig } from './group-config';
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

function mount(plugins: VirtTableOptions<Row>['plugins'], extra: Partial<VirtTableOptions<Row>> = {}) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  /** 面板要贴的锚点。**不能是 box 本身**：它是表格根节点的父级，浮层要挂在 `.vt-fb` / root 里 */
  const anchor = document.createElement('button');
  document.body.appendChild(anchor);
  const table = new VirtTable<Row>(box, {
    list: ROWS.map((r) => ({ ...r })),
    columns: COLS.map((c) => ({ ...c })),
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 0,
    fixedSize: true,
    // happy-dom 没有布局 → 渲染窗口会算成 0 行，显式钉住它
    renderControl: () => ({ begin: 0, end: 19 }),
    plugins,
    ...extra,
  } as VirtTableOptions<Row>);
  cleanups.push(() => {
    table.destroy();
    anchor.remove();
    box.remove();
  });
  return { box, table, anchor };
}

const click = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};
const panelNow = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[data-vt-popup] .vt-toolbar-panel');
const btnOf = (box: HTMLElement, key: string): HTMLButtonElement | null =>
  box.querySelector<HTMLButtonElement>(`.vt-toolbar-button[data-toolbar-item="${key}"]`);
const itemNames = (panel: HTMLElement): string[] =>
  [...panel.querySelectorAll('.vt-toolbar-fields-name')].map((el) => el.textContent!);

// ============================ 单独用：没有工具栏 ============================

describe('面板插件单独用（没装 vtToolbar）', () => {
  it('vtFieldConfig：toggle 开合浮层，勾选落到 setColumnVisible', () => {
    const { table, anchor } = mount([vtFieldConfig<Row>()]);

    expect(table.isFieldConfigOpen()).toBe(false);
    table.toggleFieldConfig(anchor);
    expect(table.isFieldConfigOpen()).toBe(true);

    const panel = panelNow()!;
    expect(panel).toBeTruthy();
    expect(itemNames(panel)).toEqual(['名称', '部门', '负责人', '分数']);

    // 勾掉「部门」→ 核心那边真的隐藏了
    const cb = panel.querySelectorAll<HTMLInputElement>('.vt-filter-checkbox')[1]!;
    cb.checked = false;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
    expect(table.getAllColumns().find((c) => c.key === 'dept')!.hidden).toBe(true);

    table.toggleFieldConfig(anchor);
    expect(table.isFieldConfigOpen()).toBe(false);
    expect(panelNow()).toBeNull();
  });

  it('vtFieldConfig：默认给手柄，reorder: false 那一档不画手柄', () => {
    const withGrip = mount([vtFieldConfig<Row>()]);
    withGrip.table.openFieldConfig(withGrip.anchor);
    expect(panelNow()!.querySelectorAll('.vt-toolbar-fields-grip').length).toBe(4);
    withGrip.table.closeFieldConfig();

    const noGrip = mount([vtFieldConfig<Row>({ reorder: false })]);
    noGrip.table.openFieldConfig(noGrip.anchor);
    const panel = panelNow()!;
    expect(panel.querySelectorAll('.vt-toolbar-fields-grip').length).toBe(0);
    // 勾选还在，提示文案换成不提拖拽的那句
    expect(panel.querySelectorAll('.vt-filter-checkbox').length).toBe(4);
    expect(panel.querySelector('.vt-toolbar-panel-hint')!.textContent).toBe('勾选控制列的显示与隐藏');
  });

  it('vtFieldConfig：canToggleColumn 说不行的那一列置灰并给出原因', () => {
    const { table, anchor } = mount([
      vtFieldConfig<Row>({
        canToggleColumn: (col) => (col.key === 'name' ? '名称列钉住了' : true),
      }),
    ]);
    table.openFieldConfig(anchor);
    const rows = panelNow()!.querySelectorAll<HTMLElement>('.vt-toolbar-fields-item');
    expect(rows[0]!.title).toBe('名称列钉住了');
    expect(rows[0]!.querySelector<HTMLInputElement>('.vt-filter-checkbox')!.disabled).toBe(true);
    expect(rows[1]!.querySelector<HTMLInputElement>('.vt-filter-checkbox')!.disabled).toBe(false);
  });

  it('vtSortConfig：面板里加一条规则 → 落到核心的排序状态', () => {
    const { table, anchor } = mount([vtSortConfig<Row>()]);
    table.toggleSortConfig(anchor);
    const panel = panelNow()!;
    click(panel.querySelector('.vt-toolbar-panel-add')!);
    // 「添加」默认挑第一个还没用掉的候选列
    expect(table.getState().sort).toEqual([{ colKey: 'name', order: 'asc' }]);
  });

  it('vtGroupConfig：面板里加一级 → 落到 setGroupConfig', () => {
    const { table, anchor } = mount([vtGroupConfig<Row>()]);
    table.toggleGroupConfig(anchor);
    click(panelNow()!.querySelector('.vt-toolbar-panel-add')!);
    // 候选是推断出来的（取值有重复的分类列）：部门 / 负责人
    expect(table.getGroupConfig()).toEqual([{ field: 'dept' }]);
  });

  it('vtFilterConfig：面板里装的是筛选管理器，开合由插件的 API 管', () => {
    const { table, anchor } = mount([vtFilterConfig<Row>()]);
    expect(table.isFilterConfigOpen()).toBe(false);
    table.openFilterConfig(anchor);
    expect(table.isFilterConfigOpen()).toBe(true);
    // 筛选管理器把自己挂在 `.vt-toolbar-filter` 那个容器上（那个类同时是 token 载体 .vt-fb）
    const holder = panelNow()!.querySelector<HTMLElement>('.vt-toolbar-filter')!;
    expect(holder.classList.contains('vt-fb')).toBe(true);
    expect(holder.querySelector('.vt-fb-group')).toBeTruthy();
    table.closeFilterConfig();
    expect(panelNow()).toBeNull();
  });

  it('列显隐从别处被改掉时，开着的字段配置面板跟着同步', () => {
    const { table, anchor } = mount([vtFieldConfig<Row>()]);
    table.openFieldConfig(anchor);
    const panel = panelNow()!;
    expect(panel.querySelectorAll<HTMLInputElement>('.vt-filter-checkbox')[1]!.checked).toBe(true);

    table.setColumnVisible('dept', false);
    expect(panel.querySelectorAll<HTMLInputElement>('.vt-filter-checkbox')[1]!.checked).toBe(false);
    // 就地同步，浮层没被换掉（与工具栏那条路同一个 refresh）
    expect(panelNow()).toBe(panel);
  });

  /** 独立形态也不许「关掉重开」—— 那个 bug 的另一半（早先走的是 standalone 的重建） */
  it('单独用时勾显隐同样只就地同步，不重建浮层', () => {
    const { table, anchor } = mount([vtFieldConfig<Row>()]);
    table.openFieldConfig(anchor);
    const panel = panelNow()!;
    const rows = [...panel.querySelectorAll('.vt-toolbar-fields-item')];

    const cb = panel.querySelectorAll<HTMLInputElement>('.vt-filter-checkbox')[2]!;
    cb.checked = false;
    cb.dispatchEvent(new Event('change', { bubbles: true }));

    expect(panelNow()).toBe(panel);
    expect([...panelNow()!.querySelectorAll('.vt-toolbar-fields-item')]).toEqual(rows);
    expect(table.getAllColumns().find((c) => c.key === 'owner')!.hidden).toBe(true);
  });

  /** 反过来：**换序**改了结构，那时就该重建 DOM（签名对不上走整体重画） */
  it('列序被别处改掉时重建面板内容（结构变了）', () => {
    const { table, anchor } = mount([vtFieldConfig<Row>()]);
    table.openFieldConfig(anchor);
    const panel = panelNow()!;
    expect(itemNames(panel)).toEqual(['名称', '部门', '负责人', '分数']);

    table.moveColumn('name', 'score', true);
    // 浮层还是那一个（不闪），但里面的行按新列序重排了
    expect(panelNow()).toBe(panel);
    expect(itemNames(panelNow()!)).toEqual(['部门', '负责人', '分数', '名称']);
  });
});

// ============================ 与工具栏的握手 ============================

describe('面板插件与 vtToolbar 的握手', () => {
  /** 顺序无关：服务表所有插件共享，而插件在 `onMounted` 里 inject（排在全部 setup 之后） */
  for (const [name, order] of [
    ['工具栏写在前面', 'toolbar-first'],
    ['工具栏写在后面', 'plugin-first'],
  ] as const) {
    it(`${name}：插件都能把自己挂上去`, () => {
      const field = vtFieldConfig<Row>({ reorder: false });
      const { box } = mount(
        order === 'toolbar-first' ? [vtToolbar<Row>(), field] : [field, vtToolbar<Row>()],
      );

      // 只有它自己那一颗（工具栏一颗都不自带）
      expect(box.querySelectorAll('.vt-toolbar-button').length).toBe(1);

      click(btnOf(box, 'columns')!);
      const panel = panelNow()!;
      expect(itemNames(panel)).toEqual(['名称', '部门', '负责人', '分数']);
      // 插件传的 reorder: false 生效了
      expect(panel.querySelectorAll('.vt-toolbar-fields-grip').length).toBe(0);
    });
  }

  it('插件的 API 转发给工具栏：面板只有一个，且贴的是工具栏那颗按钮', () => {
    const { box, table } = mount([vtToolbar<Row>(), vtFieldConfig<Row>(), vtSortConfig<Row>()]);

    table.toggleFieldConfig();
    expect(table.isFieldConfigOpen()).toBe(true);
    // 工具栏那颗按钮进入打开态（说明面板是工具栏开的，不是插件自己又开了一个）
    expect(btnOf(box, 'columns')!.classList.contains('is-open')).toBe(true);
    expect(document.querySelectorAll('[data-vt-popup] .vt-toolbar-panel').length).toBe(1);

    // 工具栏同时只允许开一个：换开排序，字段配置的问答要跟着变
    table.toggleSortConfig();
    expect(table.isFieldConfigOpen()).toBe(false);
    expect(table.isSortConfigOpen()).toBe(true);
    expect(document.querySelectorAll('[data-vt-popup] .vt-toolbar-panel').length).toBe(1);

    table.closeSortConfig();
    expect(panelNow()).toBeNull();
  });

  /**
   * 「要哪颗装哪个」的正面例子：装两个插件就是两颗，一颗不多一颗不少。
   * 早先工具栏自带四项、`items` 用来挑，那条规则连同 `items` 一起去掉了。
   */
  it('装几个插件就有几颗按钮', () => {
    const { box } = mount([vtToolbar<Row>(), vtSortConfig<Row>(), vtGroupConfig<Row>()]);
    expect(btnOf(box, 'sort')).toBeTruthy();
    expect(btnOf(box, 'group')).toBeTruthy();
    expect(btnOf(box, 'columns')).toBeNull();
    expect(btnOf(box, 'filter')).toBeNull();

    click(btnOf(box, 'group')!);
    expect(panelNow()!.querySelector('.vt-toolbar-panel-title')!.textContent).toBe('分组');
  });

  /**
   * `toolbar: false` 是所有「会往工具栏放按钮」的插件**共用的同一个开关**
   * （四个面板 + `vtRowHeightConfig` + `vtSearch` + `vtExport`）。
   *
   * 它与 `vtToolbar({ bar: false })` 是同一件事的两半：那个说「不画按钮条」，
   * 这个说「不占那条按钮条的位置」—— 而面板/能力本身照旧可用。
   */
  it('toolbar: false → 不占工具栏的位置，但面板照旧能用', () => {
    const { box, table } = mount([vtToolbar<Row>(), vtFieldConfig<Row>({ toolbar: false })]);
    expect(box.querySelector('.vt-toolbar-button')).toBeNull();

    // 面板走插件自己的浮层
    table.toggleFieldConfig();
    expect(table.isFieldConfigOpen()).toBe(true);
    expect(panelNow()).toBeTruthy();
  });

  it('插件卸载后它注册的那一项也走掉（自带的不受影响）', () => {
    const { box, table } = mount([vtToolbar<Row>(), vtSortConfig<Row>()]);
    expect(btnOf(box, 'sort')).toBeTruthy();
    table.destroy();
    expect(box.querySelector('.vt-toolbar-button[data-toolbar-item="sort"]')).toBeNull();
  });
});
