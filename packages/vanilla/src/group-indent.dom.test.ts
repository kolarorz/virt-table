// @vitest-environment happy-dom
/**
 * 分组下**数据行**首列的缩进结构。
 *
 * 这条契约的分量不在观感，而在**行高不变量**：缩进块与内容必须包在同一个 flex 行里
 * （`.vt-tree-row`）。早先是把 `span.vt-group-indent` 直接 append 到 `td`，而紧随其后的
 * `.vt-td-text` 是**块级**元素 —— 于是 inline-block 的缩进自己占一行、文字另起一行，
 * 行高从 40px 变成 61px（21×2 + 9×2 + 1）。
 *
 * 而 `fixedSize: true` 是按 `estimatedSize` 建滚动几何的：模型比实际矮 21px/行，
 * 十万行量级下 `scrollTop` 会超出模型总高，渲染窗口永久冻结 —— 就是 AGENTS.md §7.11
 * 那个「滚不到底」。所以这不是样式问题，是几何问题。
 *
 * happy-dom 没有布局引擎，量不了真实行高（那部分靠 CDP 手验，见 pro 仓库的 gantt demo），
 * 但**结构**是能钉住的：缩进与内容同属一个 `.vt-tree-row`，`td` 的直接子节点里
 * 不该出现裸的 `.vt-group-indent`。
 *
 * `.vt-group-indent` 上那句 `flex-shrink: 0` 本来就是为这个容器写的 —— 它一直缺的是容器本身。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { VirtTable, type VirtTableOptions } from './index';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
  document.body.innerHTML = '';
});

type Row = Record<string, any>;

const list: Row[] = [
  { id: 1, name: '甲', phase: '设计', mod: 'A' },
  { id: 2, name: '乙', phase: '设计', mod: 'B' },
  { id: 3, name: '丙', phase: '开发', mod: 'A' },
];

function mount(extra: Partial<VirtTableOptions<Row>> = {}) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  const table = new VirtTable<Row>(box, {
    /*
     * **深拷贝**，不是 `list.slice()`：核心会把 `_groupLevel` / `_treeLevel` 这类
     * 下划线字段写回行对象（`VirtTableRowExtras` 就是它们的契约）。浅拷贝只换数组、
     * 行对象还是同一批，于是上一个用例留下的 `_groupLevel: 2` 会让「不分组」那个用例
     * 照样缩进 —— 实测踩过。
     */
    list: list.map((r) => ({ ...r })),
    columns: [
      { key: 'name', title: '名称', width: 160 },
      { key: 'phase', title: '阶段', width: 100 },
    ],
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 0,
    fixedSize: true,
    renderControl: () => ({ begin: 0, end: 19 }),
    defaultExpandAll: true,
    ...extra,
  } as VirtTableOptions<Row>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  return { box, table, root: box.querySelector('.vt-root') as HTMLElement };
}

/** 取一个数据行（不是分组行）的首列格 */
function firstDataNameCell(root: HTMLElement): HTMLElement {
  const tr = [...root.querySelectorAll<HTMLElement>('.vt-tbody tr.vt-tr')].find(
    (r) => !r.querySelector('.vt-group-cell'),
  )!;
  return tr.querySelector<HTMLElement>('td[data-col-key="name"]')!;
}

/**
 * 树形行的**结构**不变量：`缩进 × (层级-1) + 折叠箭头 + 内容`。
 *
 * 与 `css-contract.test.ts` 那组是一对：那边守「每一格缩进多宽、叶子的占位箭头还占不占位」
 * （CSS 侧），这边守「一共放了几格、箭头有没有放」（JS 侧）。两侧合起来才等于
 * 「每加一层，内容起点固定右移一个 `--vt-indent-size`」—— `vtRowDrag` 的层级提示线
 * 与「指针横向位置 → 第几层」的换算都吃这条，见 AGENTS.md §7.24。
 */
describe('树形行的缩进结构', () => {
  const treeList: Row[] = [
    {
      id: 1, name: '甲', phase: '设计', mod: 'A',
      children: [
        { id: 11, name: '甲一', phase: '设计', mod: 'A',
          children: [{ id: 111, name: '甲一1', phase: '设计', mod: 'A' }] },
        { id: 12, name: '甲二', phase: '设计', mod: 'A' }, // 同层的叶子
      ],
    },
  ];
  const treeCols = [
    { key: 'name', title: '名称', width: 200, type: 'tree' as const },
    { key: 'phase', title: '阶段', width: 100 },
  ];

  /** 每个**数据行**的 [缩进格数, 有没有箭头, 是不是叶子占位]（分组行是 colSpan 格，跳过） */
  const rows = (root: HTMLElement) =>
    [...root.querySelectorAll<HTMLElement>('.vt-tbody tr.vt-tr')]
      .filter((tr) => !tr.querySelector('.vt-group-cell'))
      .map((tr) => {
      const cell = tr.querySelector<HTMLElement>('td[data-col-key="name"]')!;
      const flex = cell.querySelector<HTMLElement>(':scope > .vt-tree-row');
      const toggle = flex?.querySelector<HTMLElement>(':scope > .vt-tree-toggle');
      return {
        key: tr.dataset.rowKey,
        indents: flex?.querySelectorAll(':scope > .vt-tree-indent, :scope > .vt-group-indent').length ?? 0,
        hasToggle: !!toggle,
        leaf: !!toggle?.classList.contains('vt-tree-toggle--leaf'),
      };
    });

  it('缩进格数 = 层级 - 1，且每一层都恰好放一个箭头（叶子放占位）', () => {
    const { root } = mount({ list: treeList.map((r) => ({ ...r })), columns: treeCols });
    expect(rows(root)).toEqual([
      { key: '1', indents: 0, hasToggle: true, leaf: false },
      { key: '11', indents: 1, hasToggle: true, leaf: false },
      { key: '111', indents: 2, hasToggle: true, leaf: true },
      { key: '12', indents: 1, hasToggle: true, leaf: true },
    ]);
  });

  it('同一层里「有子节点」与「叶子」放的格数一样（否则同级文字对不齐）', () => {
    const { root } = mount({ list: treeList.map((r) => ({ ...r })), columns: treeCols });
    const byKey = new Map(rows(root).map((r) => [r.key, r]));
    const withKids = byKey.get('11')!; // 层 2，有子节点
    const leafSame = byKey.get('12')!; // 层 2，叶子
    expect(leafSame.indents).toBe(withKids.indents);
    expect(leafSame.hasToggle).toBe(withKids.hasToggle);
  });

  it('树形套分组：两种缩进块加起来 = 层级 - 1（层级把两者合成一把标尺）', () => {
    const { root } = mount({
      list: treeList.map((r) => ({ ...r })),
      columns: treeCols,
      groupConfig: [{ field: 'phase' }],
    });
    const data = rows(root);
    // 分组层 2（组内）+ 树层 1/2/3 → 缩进 1/2/3
    expect(data.map((r) => r.indents)).toEqual([1, 2, 3, 2]);
    expect(data.every((r) => r.hasToggle)).toBe(true);
  });
});

describe('分组数据行的首列缩进', () => {
  it('缩进与内容包在同一个 .vt-tree-row 里（否则块级内容会另起一行、行高翻倍）', () => {
    const { root } = mount({ groupConfig: [{ field: 'phase' }, { field: 'mod' }] });
    const td = firstDataNameCell(root);

    const row = td.querySelector<HTMLElement>(':scope > .vt-tree-row');
    expect(row, '首列应有一个 .vt-tree-row 容器').not.toBeNull();
    // 两级分组 → 一个数据行缩进 2 格
    expect(row!.querySelectorAll(':scope > .vt-group-indent').length).toBe(2);
    // 内容也在这个 flex 行里，与缩进同排
    expect(row!.querySelector(':scope > .vt-tree-content')).not.toBeNull();
    expect(row!.textContent).toContain('甲');
  });

  it('td 的直接子节点里没有裸的 .vt-group-indent（那正是行高翻倍的成因）', () => {
    const { root } = mount({ groupConfig: [{ field: 'phase' }, { field: 'mod' }] });
    const td = firstDataNameCell(root);
    expect(td.querySelectorAll(':scope > .vt-group-indent').length).toBe(0);
    // 也不该出现「缩进在外、文字在内」的混排
    expect(td.querySelectorAll(':scope > .vt-td-text').length).toBe(0);
  });

  it('缩进格数 = 分组层数（单级分组缩 1 格）', () => {
    const { root } = mount({ groupConfig: [{ field: 'phase' }] });
    const row = firstDataNameCell(root).querySelector<HTMLElement>(':scope > .vt-tree-row')!;
    expect(row).not.toBeNull();
    // 数据行落在 `_groupLevel = 2`（组行是 1），所以缩进 1 格
    expect(row.querySelectorAll(':scope > .vt-group-indent').length).toBe(1);
  });

  it('不分组时结构不变（回归护栏：别为了修分组把普通表格改了）', () => {
    const { root } = mount();
    const td = firstDataNameCell(root);
    expect(td.querySelector('.vt-tree-row')).toBeNull();
    expect(td.querySelector(':scope > .vt-td-text')?.textContent).toContain('甲');
  });

  it('只作用在首列 —— 第二列不该跟着缩进', () => {
    const { root } = mount({ groupConfig: [{ field: 'phase' }, { field: 'mod' }] });
    const tr = [...root.querySelectorAll<HTMLElement>('.vt-tbody tr.vt-tr')].find(
      (r) => !r.querySelector('.vt-group-cell'),
    )!;
    const second = tr.querySelector<HTMLElement>('td[data-col-key="phase"]')!;
    expect(second.querySelector('.vt-group-indent')).toBeNull();
    expect(second.querySelector('.vt-tree-row')).toBeNull();
  });

  it('首列是功能列时缩进落到第一个数据列（功能列画不出缩进，别把缩进丢掉）', () => {
    const { root } = mount({
      groupConfig: [{ field: 'phase' }],
      // 表格头上挂手柄列 / 勾选列是常态，而功能列在填内容时各自早返回
      columns: [
        { key: 'drag', title: '', width: 44, type: 'drag' },
        { key: 'name', title: '名称', width: 160 },
        { key: 'phase', title: '阶段', width: 100 },
      ],
    });
    const tr = [...root.querySelectorAll<HTMLElement>('.vt-tbody tr.vt-tr')].find(
      (r) => !r.querySelector('.vt-group-cell'),
    )!;
    // 手柄列里没有缩进，手柄本身还在
    const dragTd = tr.querySelector<HTMLElement>('td[data-col-key="drag"]')!;
    expect(dragTd.querySelector('.vt-group-indent')).toBeNull();
    expect(dragTd.querySelector('.vt-drag-handle')).not.toBeNull();
    // 缩进落到第一个数据列，且照旧包在 .vt-tree-row 里
    const row = tr
      .querySelector<HTMLElement>('td[data-col-key="name"]')!
      .querySelector<HTMLElement>(':scope > .vt-tree-row')!;
    expect(row, '第一个数据列应有 .vt-tree-row 容器').not.toBeNull();
    expect(row.querySelectorAll(':scope > .vt-group-indent').length).toBe(1);
    expect(row.textContent).toContain('甲');
  });

  it('有树形列时缩进由树形那一支给出，同样在 .vt-tree-row 内、不裸挂在 td 上', () => {
    const { root } = mount({
      groupConfig: [{ field: 'phase' }, { field: 'mod' }],
      columns: [
        { key: 'name', title: '名称', width: 160, type: 'tree' },
        { key: 'phase', title: '阶段', width: 100 },
      ],
    });
    const td = firstDataNameCell(root);
    // 两支各自建容器，但都必须**有**容器 —— 裸挂才是行高翻倍的成因
    expect(td.querySelectorAll(':scope > .vt-group-indent').length).toBe(0);
    const row = td.querySelector<HTMLElement>('.vt-tree-row')!;
    expect(row).not.toBeNull();
    expect(row.querySelectorAll('.vt-group-indent').length).toBe(2);
  });
});

/**
 * 运行期换分组维度（`setGroupConfig`）。
 *
 * 这条能力原来不存在：`groupConfig` 只是构造期 option，换维度得销毁重建整张表
 * （滚动位置、折叠态、勾选全丢），而插件更是压根做不了分组入口 —— `PluginContext`
 * 的白名单里没有它。付费插件 `@virt-table-pro/gantt` 的工具栏「分组」按钮就靠这条。
 *
 * 用**显示列表**断言而不是数 DOM：分组行是 `_constructGroups` 合成的
 * （`_rowType: 'group'` + `_groupName`），它进没进管线是这条契约的全部内容；
 * 缩进结构由上面那几组用例守着。
 */
describe('运行期换分组维度（setGroupConfig）', () => {
  /**
   * 渲染出来的行序：分组行记成 `[标题]`，数据行记名字。
   *
   * 从 **DOM** 读而不是去翻 `_options.list` —— 后者是私有的，而且「行进了显示列表」与
   * 「行真的渲染出来了」是两件事，这条契约要的是后者。
   */
  const shape = (root: HTMLElement): string[] =>
    [...root.querySelectorAll<HTMLElement>('.vt-tbody tr.vt-tr')].map((tr) => {
      const group = tr.querySelector<HTMLElement>('.vt-group-cell');
      if (group) return `[${group.querySelector(String.raw`.vt-group-label`)?.textContent ?? ""}]`;
      return tr.querySelector<HTMLElement>('td[data-col-key="name"]')!.textContent!.trim();
    });

  it('从扁平换成分组：显示列表里出现分组行', () => {
    const { table, root } = mount();
    expect(table.getGroupConfig()).toEqual([]);
    expect(shape(root)).toEqual(['甲', '乙', '丙']);

    table.setGroupConfig([{ field: 'phase' }]);
    expect(table.getGroupConfig()).toEqual([{ field: 'phase' }]);
    expect(shape(root)).toEqual(['[设计]', '甲', '乙', '[开发]', '丙']);
  });

  it('换层级顺序 → 分组树跟着换（「这周按阶段看、下周按模块看」）', () => {
    const { table, root } = mount({ groupConfig: [{ field: 'phase' }] });
    table.setGroupConfig([{ field: 'mod' }]);
    expect(shape(root)).toEqual(['[A]', '甲', '丙', '[B]', '乙']);
  });

  it('传 null / [] = 取消分组，回到扁平', () => {
    const { table, root } = mount({ groupConfig: [{ field: 'phase' }] });
    table.setGroupConfig(null);
    expect(table.getGroupConfig()).toEqual([]);
    expect(shape(root)).toEqual(['甲', '乙', '丙']);
    table.setGroupConfig([{ field: 'phase' }]);
    table.setGroupConfig([]);
    expect(shape(root)).toEqual(['甲', '乙', '丙']);
  });

  it('拿到的是拷贝：改返回值不影响表格（与 getSortState 同风格）', () => {
    const { table } = mount({ groupConfig: [{ field: 'phase' }] });
    const got = table.getGroupConfig();
    got[0].field = 'mod';
    expect(table.getGroupConfig()).toEqual([{ field: 'phase' }]);
    // 传进去的数组同样被拷贝：调用方后续改它不该偷偷改到表格
    const input = [{ field: 'mod' }];
    table.setGroupConfig(input);
    input[0].field = 'phase';
    expect(table.getGroupConfig()).toEqual([{ field: 'mod' }]);
  });

  it('分组的排序参数生效（sort 决定分组标题怎么排）', () => {
    const { table, root } = mount();
    table.setGroupConfig([{ field: 'phase', sort: 'desc' }]);
    const desc = shape(root).filter((s) => s.startsWith('['));
    table.setGroupConfig([{ field: 'phase', sort: 'asc' }]);
    const asc = shape(root).filter((s) => s.startsWith('['));
    expect(asc).toEqual([...desc].reverse());
    expect(new Set(asc)).toEqual(new Set(['[设计]', '[开发]']));
  });
});
