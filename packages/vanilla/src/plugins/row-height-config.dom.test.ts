// @vitest-environment happy-dom
/**
 * `vtRowHeightConfig`：低 / 中 / 高三档行高。
 *
 * 这个插件的全部价值是**把两件事绑在一起** —— 密度类（内边距与字号）与虚拟化行高
 * （`estimatedSize`，滚动几何的依据）。所以这里的重点不是面板长什么样，而是：
 *
 * 1. 切一档，两件事都变了（类在 `.vt-root` 上，行高在账本里）；
 * 2. 账本里的**总高**跟着重算 —— 漏了这一步的表现是「行按新行高画、按旧行高摆位」，
 *    行之间露白或叠在一起，而且只在滚动时才看出来；
 * 3. 没开 `fixedSize` 时它不工作，并且说清原因（那时行高由内容决定，三档是句空话）。
 *
 * happy-dom 没有布局引擎，所以像素级的观感靠手验；能断言的是账本与类名，那也正是
 * 两件事各自的落点。
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { VirtTable, type VirtTableOptions } from '../index';
import { vtToolbar } from './toolbar';
import { vtToolbarPanels } from './toolbar-panels';
import { vtRowHeightConfig } from './row-height-config';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});
let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

const ROWS = Array.from({ length: 500 }, (_, i) => ({ id: i, name: 'n' + i }));

function mount(plugins: VirtTableOptions<any>['plugins'], extra: Record<string, any> = {}) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  const anchor = document.createElement('button');
  document.body.appendChild(anchor);
  const table = new VirtTable<Record<string, any>>(box, {
    list: ROWS.map((r) => ({ ...r })),
    columns: [{ key: 'name', title: '名称', width: 160 }],
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 0,
    fixedSize: true,
    renderControl: () => ({ begin: 0, end: 19 }),
    plugins,
    ...extra,
  } as VirtTableOptions<Record<string, any>>);
  cleanups.push(() => {
    table.destroy();
    anchor.remove();
    box.remove();
  });
  return { box, table, anchor, root: box.querySelector('.vt-root') as HTMLElement };
}

const click = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};
const panelNow = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[data-vt-popup] .vt-toolbar-panel');
const segItems = (panel: HTMLElement): HTMLElement[] => [
  ...panel.querySelectorAll<HTMLElement>('.vt-row-height-seg .vt-toolbar-seg-item'),
];
const activeSeg = (panel: HTMLElement): string | undefined =>
  segItems(panel).find((b) => b.classList.contains('is-active'))?.textContent ?? undefined;

// ============================ 核心那一半：setRowHeight ============================

describe('核心 setRowHeight：三处一起改', () => {
  it('改了使用方那份、账本热快照，以及总高', () => {
    const { table } = mount([]);
    expect(table.getRowHeight()).toBe(40);
    expect(table.core.getState().itemsTotalSize).toBe(500 * 40);

    table.setRowHeight(30);

    expect(table.getRowHeight()).toBe(30);
    // 总高重算过了 —— 少这一步，行会按旧行高摆位
    expect(table.core.getState().itemsTotalSize).toBe(500 * 30);
  });

  it('非正数被忽略并告警（别把账本写成 NaN）', () => {
    const { table } = mount([]);
    table.setRowHeight(0);
    table.setRowHeight(Number.NaN);
    expect(table.getRowHeight()).toBe(40);
    expect(warn.mock.calls.length).toBe(2);
  });
});

// ============================ 三档 ============================

describe('vtRowHeightConfig 三档', () => {
  it('切档同时改密度类与行高账本', () => {
    const { table, root } = mount([vtRowHeightConfig()]);
    expect(table.getRowHeightLevel()).toBe('default');
    expect(root.className).not.toContain('vt-root--');

    table.setRowHeightLevel('compact');
    expect(root.classList.contains('vt-root--compact')).toBe(true);
    expect(table.getRowHeight()).toBe(30);
    expect(table.core.getState().itemsTotalSize).toBe(500 * 30);

    table.setRowHeightLevel('loose');
    // 上一档的类要摘掉，否则两套密度 token 叠在一起
    expect(root.classList.contains('vt-root--compact')).toBe(false);
    expect(root.classList.contains('vt-root--loose')).toBe(true);
    expect(table.getRowHeight()).toBe(50);

    table.setRowHeightLevel('default');
    expect(root.className).not.toContain('vt-root--');
    expect(table.getRowHeight()).toBe(40);
  });

  it('三档的行高与核心密度 token 的行高等式对齐（30 / 40 / 50）', () => {
    const { table } = mount([vtRowHeightConfig()]);
    const got: number[] = [];
    for (const level of ['compact', 'default', 'loose'] as const) {
      table.setRowHeightLevel(level);
      got.push(table.getRowHeight());
    }
    // 这三个数由 css-contract.test.ts 从密度 token 反算并钉住
    expect(got).toEqual([30, 40, 50]);
  });

  it('sizes 可覆盖（自定义了密度 token 的场景）', () => {
    const { table } = mount([vtRowHeightConfig({ sizes: { loose: 64 } })]);
    table.setRowHeightLevel('loose');
    expect(table.getRowHeight()).toBe(64);
  });

  it('给了 value 就立刻应用；不给则从当前 estimatedSize 反推一档、什么都不改', () => {
    const applied = mount([vtRowHeightConfig({ value: 'compact' })]);
    expect(applied.table.getRowHeightLevel()).toBe('compact');
    expect(applied.table.getRowHeight()).toBe(30);
    expect(applied.root.classList.contains('vt-root--compact')).toBe(true);

    // estimatedSize 30 → 回显「低」，但不重复应用（类不该被这个插件加上）
    const inferred = mount([vtRowHeightConfig()], { estimatedSize: 30 });
    expect(inferred.table.getRowHeightLevel()).toBe('compact');
    expect(inferred.root.className).not.toContain('vt-root--');

    const other = mount([vtRowHeightConfig()], { estimatedSize: 37 });
    expect(other.table.getRowHeightLevel()).toBe('default');
  });

  it('onChange 报出新档与新行高（持久化用）', () => {
    const hits: Array<[string, number]> = [];
    const { table } = mount([vtRowHeightConfig({ onChange: (l, px) => hits.push([l, px]) })]);
    table.setRowHeightLevel('loose');
    table.setRowHeightLevel('compact');
    expect(hits).toEqual([
      ['loose', 50],
      ['compact', 30],
    ]);
  });
});

// ============================ 只在固定行高下开放 ============================

describe('vtRowHeightConfig 只在 fixedSize 下工作', () => {
  it('没开 fixedSize：切档不生效并告警', () => {
    const { table, root } = mount([vtRowHeightConfig()], { fixedSize: false });
    table.setRowHeightLevel('compact');

    expect(table.getRowHeight()).toBe(40);
    expect(root.className).not.toContain('vt-root--');
    expect(warn.mock.calls.some((c) => String(c[0]).includes('fixedSize'))).toBe(true);
  });

  it('没开 fixedSize：面板不给三档，只说清原因', () => {
    const { table, anchor } = mount([vtRowHeightConfig()], { fixedSize: false });
    table.openRowHeightConfig(anchor);
    const panel = panelNow()!;
    expect(segItems(panel)).toEqual([]);
    expect(panel.querySelector('.vt-toolbar-panel-empty')!.textContent).toContain('fixedSize');
  });
});

// ============================ 面板与工具栏 ============================

describe('vtRowHeightConfig 的面板', () => {
  it('单独用：面板里点一档就落地，当前档高亮', () => {
    const { table, anchor, root } = mount([vtRowHeightConfig()]);
    table.toggleRowHeightConfig(anchor);
    const panel = panelNow()!;
    expect(segItems(panel).map((b) => b.textContent)).toEqual(['低', '中', '高']);
    expect(activeSeg(panel)).toBe('中');

    click(segItems(panel).find((b) => b.textContent === '低')!);
    expect(table.getRowHeight()).toBe(30);
    expect(root.classList.contains('vt-root--compact')).toBe(true);
    // 就地重画，浮层没被换掉，高亮跟到新档
    expect(panelNow()).toBe(panel);
    expect(activeSeg(panelNow()!)).toBe('低');
    expect(panelNow()!.querySelector('.vt-toolbar-panel-hint')!.textContent).toContain('30px');
  });

  it('装了工具栏：按排序位排在四个面板之后，徽标只在非默认档显示', () => {
    const { box, table } = mount([vtToolbar(), ...vtToolbarPanels(), vtRowHeightConfig()]);
    const labels = [...box.querySelectorAll('.vt-toolbar-label')].map((el) => el.textContent);
    // 四个面板的排序位是 10/20/30/40，行高 50 → 排在最后（都在 internal/toolbar-order.ts）
    expect(labels).toEqual(['字段配置', '筛选', '分组', '排序', '行高']);

    const btn = box.querySelector<HTMLElement>('.vt-toolbar-button[data-toolbar-item="rowHeight"]')!;
    const badge = btn.querySelector<HTMLElement>('.vt-toolbar-badge')!;
    expect(badge.style.display).toBe('none');

    table.setRowHeightLevel('loose');
    expect(badge.textContent).toBe('高');
    expect(btn.classList.contains('is-active')).toBe(true);

    table.setRowHeightLevel('default');
    expect(badge.style.display).toBe('none');
  });

  it('装了工具栏：插件的开合 API 转发给工具栏那颗按钮', () => {
    const { box, table } = mount([vtToolbar(), vtRowHeightConfig()]);
    table.toggleRowHeightConfig();
    expect(table.isRowHeightConfigOpen()).toBe(true);
    const btn = box.querySelector<HTMLElement>('.vt-toolbar-button[data-toolbar-item="rowHeight"]')!;
    expect(btn.classList.contains('is-open')).toBe(true);
    expect(document.querySelectorAll('[data-vt-popup] .vt-toolbar-panel').length).toBe(1);

    table.closeRowHeightConfig();
    expect(panelNow()).toBeNull();
  });

  it('工具栏里点面板中的一档：落地 + 徽标跟上', () => {
    const { box, table } = mount([vtToolbar(), vtRowHeightConfig()]);
    const btn = box.querySelector<HTMLElement>('.vt-toolbar-button[data-toolbar-item="rowHeight"]')!;
    click(btn);
    click(segItems(panelNow()!).find((b) => b.textContent === '高')!);

    expect(table.getRowHeight()).toBe(50);
    expect(btn.querySelector('.vt-toolbar-badge')!.textContent).toBe('高');
  });

  it('插件卸载后工具栏上那一项也走掉', () => {
    const { box, table } = mount([vtToolbar(), vtRowHeightConfig()]);
    expect(box.querySelector('[data-toolbar-item="rowHeight"]')).toBeTruthy();
    table.destroy();
    expect(box.querySelector('[data-toolbar-item="rowHeight"]')).toBeNull();
  });
});
