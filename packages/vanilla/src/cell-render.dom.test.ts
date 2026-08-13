// @vitest-environment happy-dom
/**
 * 单元格渲染契约的 DOM 层测试。
 *
 * 守的是三条渲染路径（列级 `render` / 单元格级 `setCellRender` / 内置 `type`）与两个
 * **横切能力**（`textOverflow`、`mergeKey` 的 sticky 内层）之间的关系。
 *
 * 为什么值得成套测：这两个横切能力原先写在「没有 render」的 else 分支里，于是任何配了
 * `render` 的列，`textOverflow` 与 sticky 内层都**静默失效**（无告警、文档也没写）。
 * 优先级解析当时还在 tree 分支和普通分支各存了一份逐字复制的实现。这里的用例就是
 * 按那两个 bug 的形状写的，谁再把装配挪回 else 分支、或者再复制一份优先级链，立刻红。
 *
 * 环境取舍与 merge.dom.test.ts 一致：`renderControl` 钉住渲染窗口 + `fixedSize: true`
 * 跳过 ResizeObserver（happy-dom 两者都没有）。
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { VirtTable, type VirtTableOptions } from './index';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
  vi.restoreAllMocks();
});

type Row = Record<string, any>;

function mount(
  options: Record<string, any>,
  window?: { begin: number; end: number },
) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  const table = new VirtTable<Row>(box, {
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 0,
    fixedSize: true,
    ...(window ? { renderControl: () => ({ ...window }) } : {}),
    ...options,
  } as VirtTableOptions<Row>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  return { box, table };
}

const cell = (box: HTMLElement, key: string) =>
  box.querySelector<HTMLTableCellElement>(`.vt-tbody .vt-td[data-col-key="${key}"]`)!;
const textOf = (box: HTMLElement, key: string) =>
  cell(box, key).querySelector<HTMLElement>('.vt-td-text');

const rows = (n: number, fn: (i: number) => Row): Row[] =>
  Array.from({ length: n }, (_, i) => ({ id: i, ...fn(i) }));

describe('横切能力：不因为配了 render 就失效', () => {
  it('列级 render 的格子照样套 .vt-td-text 并吃到 textOverflow', () => {
    const { box } = mount(
      {
        list: [{ id: 1, a: 'x' }],
        textOverflow: 'ellipsis',
        columns: [{ key: 'a', title: 'A', width: 100, render: (c: any) => String(c.value) }],
      },
      { begin: 0, end: 0 },
    );
    const tw = textOf(box, 'a')!;
    expect(tw).not.toBeNull();
    expect(tw.classList.contains('vt-td-text--ellipsis')).toBe(true);
    expect(tw.textContent).toBe('x');
  });

  it('列级 textOverflow 覆盖全局配置（render 路径下同样生效）', () => {
    const { box } = mount(
      {
        list: [{ id: 1, a: 'x', b: 'y' }],
        textOverflow: 'ellipsis',
        columns: [
          { key: 'a', title: 'A', width: 100, textOverflow: 'tooltip', render: () => 'x' },
          { key: 'b', title: 'B', width: 100, render: () => 'y' },
        ],
      },
      { begin: 0, end: 0 },
    );
    expect(textOf(box, 'a')!.classList.contains('vt-td-text--tooltip')).toBe(true);
    expect(textOf(box, 'b')!.classList.contains('vt-td-text--tooltip')).toBe(false);
    expect(textOf(box, 'b')!.classList.contains('vt-td-text--ellipsis')).toBe(true);
  });

  it('render 返回 HTMLElement 时也进 .vt-td-text，而不是直接怼进 td', () => {
    const { box } = mount(
      {
        list: [{ id: 1, a: 'x' }],
        columns: [
          {
            key: 'a',
            title: 'A',
            width: 100,
            render: () => {
              const b = document.createElement('b');
              b.textContent = 'BOLD';
              return b;
            },
          },
        ],
      },
      { begin: 0, end: 0 },
    );
    expect(textOf(box, 'a')!.querySelector('b')?.textContent).toBe('BOLD');
  });

  it('render + mergeKey 长段被裁时仍套 sticky 内层（否则滚动会抖）', () => {
    const { box } = mount(
      {
        list: rows(200, () => ({ g: 'SAME' })),
        columns: [
          { key: 'g', title: 'G', width: 100, mergeKey: true, render: (c: any) => String(c.value) },
        ],
      },
      { begin: 20, end: 39 },
    );
    const td = cell(box, 'g');
    expect(td.rowSpan).toBeGreaterThan(1);
    expect(td.classList.contains('vt-td--merge-sticky')).toBe(true);
    const label = td.querySelector('.vt-merge-label');
    expect(label).not.toBeNull();
    // 内容挂在 sticky 内层里，不是直接挂 td
    expect(label!.querySelector('.vt-td-text')?.textContent).toBe('SAME');
  });
});

describe('tree 列是装饰器，不是第二条渲染路径', () => {
  const treeList = [
    { id: 1, name: '父', children: [{ id: 11, name: '子' }] },
  ];

  it('缩进与箭头进 flex 行，内容走统一装配（能吃到 textOverflow）', () => {
    const { box } = mount(
      {
        list: treeList,
        defaultExpandAll: true,
        textOverflow: 'ellipsis',
        columns: [{ key: 'name', title: 'N', width: 140, type: 'tree' }],
      },
      { begin: 0, end: 1 },
    );
    const td = cell(box, 'name');
    const row = td.querySelector('.vt-tree-row');
    expect(row).not.toBeNull();
    // 箭头与内容都是 flex 行的子元素
    expect(row!.querySelector('.vt-tree-toggle')).not.toBeNull();
    const tw = row!.querySelector<HTMLElement>('.vt-tree-content > .vt-td-text');
    expect(tw).not.toBeNull();
    expect(tw!.classList.contains('vt-td-text--ellipsis')).toBe(true);
    expect(tw!.textContent).toBe('父');
  });

  it('tree 列的 render 与普通列走同一条链', () => {
    const { box } = mount(
      {
        list: treeList,
        defaultExpandAll: true,
        columns: [
          { key: 'name', title: 'N', width: 140, type: 'tree', render: (c: any) => `[${c.value}]` },
        ],
      },
      { begin: 0, end: 1 },
    );
    expect(
      cell(box, 'name').querySelector('.vt-tree-content > .vt-td-text')?.textContent,
    ).toBe('[父]');
  });

  it('子行缩进层级递增，箭头仍在 flex 行内', () => {
    const { box } = mount(
      {
        list: treeList,
        defaultExpandAll: true,
        columns: [{ key: 'name', title: 'N', width: 140, type: 'tree' }],
      },
      { begin: 0, end: 1 },
    );
    const tds = [...box.querySelectorAll('.vt-tbody .vt-td[data-col-key="name"]')];
    expect(tds.map((td) => td.querySelectorAll('.vt-tree-indent').length)).toEqual([0, 1]);
  });
});

describe('功能列独占单元格，且不再静默吞掉 render', () => {
  it('type=checkbox 上的 render 不被调用，但会告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const render = vi.fn(() => 'CUSTOM');
    const { box } = mount(
      {
        list: [{ id: 1, a: 'x' }],
        columns: [{ key: 'a', title: 'A', width: 60, type: 'checkbox', render }],
      },
      { begin: 0, end: 0 },
    );
    expect(render).not.toHaveBeenCalled();
    expect(cell(box, 'a').querySelector('input.vt-checkbox')).not.toBeNull();
    expect(warn.mock.calls.some((c) => String(c[0]).includes('功能列'))).toBe(true);
  });

  it('tree 不算独占，配 render 不告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mount(
      {
        list: [{ id: 1, a: 'x' }],
        columns: [{ key: 'a', title: 'A', width: 100, type: 'tree', render: () => 'ok' }],
      },
      { begin: 0, end: 0 },
    );
    expect(warn.mock.calls.some((c) => String(c[0]).includes('功能列'))).toBe(false);
  });
});

describe('setCellRender：单元格级渲染不再寄生在行数据上', () => {
  const base = () => ({
    list: rows(3, (i) => ({ a: 'v' + i })),
    columns: [{ key: 'a', title: 'A', width: 100, render: (c: any) => `列级:${c.value}` }],
  });

  it('覆盖列级 render，且只影响指定的那一格', () => {
    const { box, table } = mount(base(), { begin: 0, end: 2 });
    table.setCellRender('1', 'a', { render: (c: any) => `格级:${c.value}` });
    const texts = [...box.querySelectorAll('.vt-tbody .vt-td[data-col-key="a"] .vt-td-text')].map(
      (n) => n.textContent,
    );
    expect(texts).toEqual(['列级:v0', '格级:v1', '列级:v2']);
  });

  it('传 null 清除后回落到列级', () => {
    const { box, table } = mount(base(), { begin: 0, end: 2 });
    table.setCellRender('1', 'a', { render: () => '格级' });
    expect(textOf(box, 'a')).not.toBeNull();
    table.setCellRender('1', 'a', null);
    const texts = [...box.querySelectorAll('.vt-tbody .vt-td[data-col-key="a"] .vt-td-text')].map(
      (n) => n.textContent,
    );
    expect(texts).toEqual(['列级:v0', '列级:v1', '列级:v2']);
    expect(table.getCellRender('1', 'a')).toBeUndefined();
  });

  it('getCellRender 只给单元格级；resolveCellRender 给最终生效的', () => {
    const { table } = mount(base(), { begin: 0, end: 2 });
    const cfg = { render: () => '格级' };
    table.setCellRender('1', 'a', cfg);
    expect(table.getCellRender('1', 'a')).toBe(cfg);
    expect(table.getCellRender('0', 'a')).toBeUndefined();
    // 没配过的行：resolveCellRender 回落到列级，而不是给单元格级的那个
    expect(typeof table.resolveCellRender('0', 'a').render).toBe('function');
    expect(table.resolveCellRender('0', 'a').render).not.toBe(cfg.render);
    expect(table.resolveCellRender('1', 'a').render).toBe(cfg.render);
  });

  it('批量写只刷新一次，clearCellRenders 能整行/全清', () => {
    const { box, table } = mount(base(), { begin: 0, end: 2 });
    table.setCellRenders([
      { rowKey: '0', colKey: 'a', config: { render: () => 'A0' } },
      { rowKey: '2', colKey: 'a', config: { render: () => 'A2' } },
    ]);
    let texts = [...box.querySelectorAll('.vt-tbody .vt-td[data-col-key="a"] .vt-td-text')].map(
      (n) => n.textContent,
    );
    expect(texts).toEqual(['A0', '列级:v1', 'A2']);

    table.clearCellRenders('0');
    expect(table.getCellRender('0', 'a')).toBeUndefined();
    expect(table.getCellRender('2', 'a')).not.toBeUndefined();

    table.clearCellRenders();
    texts = [...box.querySelectorAll('.vt-tbody .vt-td[data-col-key="a"] .vt-td-text')].map(
      (n) => n.textContent,
    );
    expect(texts).toEqual(['列级:v0', '列级:v1', '列级:v2']);
  });

  it('行数据 _cellRenders 仍兼容，但 setCellRender 优先级更高', () => {
    const { box, table } = mount(
      {
        list: [
          { id: 0, a: 'v0', _cellRenders: { a: { render: () => '数据级' } } },
          { id: 1, a: 'v1' },
        ],
        columns: [{ key: 'a', title: 'A', width: 100 }],
      },
      { begin: 0, end: 1 },
    );
    expect(
      [...box.querySelectorAll('.vt-tbody .vt-td[data-col-key="a"] .vt-td-text')].map(
        (n) => n.textContent,
      ),
    ).toEqual(['数据级', 'v1']);

    table.setCellRender('0', 'a', { render: () => 'API级' });
    expect(textOf(box, 'a')!.textContent).toBe('API级');
  });

  it('单元格级渲染同样吃到 textOverflow 与 sticky 内层', () => {
    const { box, table } = mount(
      {
        list: rows(200, () => ({ g: 'SAME' })),
        textOverflow: 'tooltip',
        columns: [{ key: 'g', title: 'G', width: 100, mergeKey: true }],
      },
      { begin: 20, end: 39 },
    );
    table.setCellRender('20', 'g', { render: (c: any) => `格级:${c.value}` });
    const td = cell(box, 'g');
    const label = td.querySelector('.vt-merge-label');
    expect(label).not.toBeNull();
    const tw = label!.querySelector<HTMLElement>('.vt-td-text')!;
    expect(tw.textContent).toBe('格级:SAME');
    expect(tw.classList.contains('vt-td-text--tooltip')).toBe(true);
  });
});

describe('cellType：内容类型是第三优先级，不与容器能力冲突', () => {
  const mountWith = (colExtra: Record<string, any>, row: Record<string, any>) =>
    mount(
      {
        list: [{ id: 1, ...row }],
        columns: [{ key: 'a', title: 'A', width: 120, ...colExtra }],
      },
      { begin: 0, end: 0 },
    );

  it('option：渲染成标签，颜色走自定义属性', () => {
    const { box } = mountWith(
      { cellType: 'option' },
      { a: { label: '进行中', color: '#ff8800' } },
    );
    const tag = cell(box, 'a').querySelector<HTMLElement>('.vt-cell-option')!;
    expect(tag.textContent).toBe('进行中');
    expect(tag.style.getPropertyValue('--vt-cell-option-color')).toBe('#ff8800');
  });

  it('image：渲染成 <img>', () => {
    const { box } = mountWith({ cellType: 'image' }, { a: 'x.png' });
    expect(cell(box, 'a').querySelector('img.vt-cell-image')?.getAttribute('src')).toBe('x.png');
  });

  it('text 类不给 HTML 解析机会（rich-text 才走 innerHTML）', () => {
    const { box: b1 } = mountWith({ cellType: 'text' }, { a: '<b>不该加粗</b>' });
    expect(cell(b1, 'a').querySelector('b')).toBeNull();
    expect(textOf(b1, 'a')!.textContent).toBe('<b>不该加粗</b>');

    const { box: b2 } = mountWith({ cellType: 'rich-text' }, { a: '<b>该加粗</b>' });
    expect(cell(b2, 'a').querySelector('b')?.textContent).toBe('该加粗');
  });

  it('render 覆盖 cellType（单元格级 > 列级 > cellType > 默认取值）', () => {
    const { box, table } = mount(
      {
        list: [{ id: 1, a: 'v' }],
        columns: [{ key: 'a', title: 'A', width: 120, cellType: 'option', render: () => '列级' }],
      },
      { begin: 0, end: 0 },
    );
    expect(textOf(box, 'a')!.textContent).toBe('列级');
    expect(cell(box, 'a').querySelector('.vt-cell-option')).toBeNull();

    table.setCellRender('1', 'a', { render: () => '格级' });
    expect(textOf(box, 'a')!.textContent).toBe('格级');
  });

  it('cellType 与 textOverflow / sticky 内层叠加没有限制', () => {
    const { box } = mount(
      {
        list: rows(200, () => ({ g: 'SAME' })),
        textOverflow: 'ellipsis',
        columns: [{ key: 'g', title: 'G', width: 100, cellType: 'text', mergeKey: true }],
      },
      { begin: 20, end: 39 },
    );
    const label = cell(box, 'g').querySelector('.vt-merge-label')!;
    const tw = label.querySelector<HTMLElement>('.vt-td-text')!;
    expect(tw.classList.contains('vt-td-text--ellipsis')).toBe(true);
    expect(tw.textContent).toBe('SAME');
  });

  it('tree 列也能用 cellType（它只是装饰器）', () => {
    const { box } = mount(
      {
        list: [{ id: 1, a: { label: '标签' } }],
        columns: [{ key: 'a', title: 'A', width: 160, type: 'tree', cellType: 'option' }],
      },
      { begin: 0, end: 0 },
    );
    expect(
      cell(box, 'a').querySelector('.vt-tree-content .vt-cell-option')?.textContent,
    ).toBe('标签');
  });
});

/**
 * 内容层的排序规则只有一条：**粒度越细越优先，同粒度内越具体越优先**
 * （`render` 比 `cellType` 具体）。展开是
 *   单元格级 render > 单元格级 cellType > 列级 render > 列级 cellType > 表级 cellType > 默认取值
 *
 * 这组用例按「规则被写成两条」的失败形状写：谁把它退回成「render 一律优先于 cellType」
 * （也就是让列级 render 吃掉单元格级 cellType），第 2 个用例立刻红。
 */
describe('内容层：粒度优先于具体度', () => {
  it('单元格级 cellType 与列级同形，能直接配', () => {
    const { box, table } = mount(
      {
        list: [{ id: 1, a: '进行中' }],
        columns: [{ key: 'a', title: 'A', width: 120 }],
      },
      { begin: 0, end: 0 },
    );
    table.setCellRender('1', 'a', { cellType: 'option' });
    expect(cell(box, 'a').querySelector('.vt-cell-option')?.textContent).toBe('进行中');
  });

  it('单元格级 cellType 赢过列级 render（粒度优先）', () => {
    const render = vi.fn(() => '列级');
    const { box, table } = mount(
      {
        list: rows(2, (i) => ({ a: 'v' + i })),
        columns: [{ key: 'a', title: 'A', width: 120, render }],
      },
      { begin: 0, end: 1 },
    );
    table.setCellRender('0', 'a', { cellType: 'option' });
    const tds = [...box.querySelectorAll('.vt-tbody .vt-td[data-col-key="a"]')];
    expect(tds[0].querySelector('.vt-cell-option')?.textContent).toBe('v0');
    // 同列其他格照旧走列级 render
    expect(tds[1].querySelector('.vt-td-text')?.textContent).toBe('列级');
  });

  it('同一级里 render 比 cellType 具体，两个都配时 render 胜', () => {
    const { box, table } = mount(
      {
        list: [{ id: 1, a: 'v' }],
        columns: [{ key: 'a', title: 'A', width: 120 }],
      },
      { begin: 0, end: 0 },
    );
    table.setCellRender('1', 'a', { render: () => '格级 render', cellType: 'option' });
    expect(textOf(box, 'a')!.textContent).toBe('格级 render');
    expect(cell(box, 'a').querySelector('.vt-cell-option')).toBeNull();
  });

  it('表级 cellType 兜底，列级配了就用列级', () => {
    const { box } = mount(
      {
        list: [{ id: 1, a: '<b>x</b>', b: '<b>y</b>', c: 'z' }],
        cellType: 'text',
        columns: [
          { key: 'a', title: 'A', width: 100 },
          { key: 'b', title: 'B', width: 100, cellType: 'rich-text' },
          { key: 'c', title: 'C', width: 100, render: () => '列级' },
        ],
      },
      { begin: 0, end: 0 },
    );
    // 表级 text：不解析 HTML
    expect(cell(box, 'a').querySelector('b')).toBeNull();
    expect(textOf(box, 'a')!.textContent).toBe('<b>x</b>');
    // 列级 rich-text 覆盖表级
    expect(cell(box, 'b').querySelector('b')?.textContent).toBe('y');
    // 列级 render 也覆盖表级
    expect(textOf(box, 'c')!.textContent).toBe('列级');
  });

  it('resolveCellRender 与 DOM 同一个答案：render / cellType 最多一个有值', () => {
    const { table } = mount(
      {
        list: [{ id: 1, a: 'v' }],
        columns: [{ key: 'a', title: 'A', width: 120, render: () => '列级' }],
      },
      { begin: 0, end: 0 },
    );
    expect(typeof table.resolveCellRender('1', 'a').render).toBe('function');
    expect(table.resolveCellRender('1', 'a').cellType).toBeUndefined();

    // 单元格级 cellType 生效后，列级 render 不再是「最终生效」的那个
    table.setCellRender('1', 'a', { cellType: 'option' });
    expect(table.resolveCellRender('1', 'a').cellType).toBe('option');
    expect(table.resolveCellRender('1', 'a').render).toBeUndefined();
  });

  it('renderEditor 独立回落：单元格级只配内容时，编辑器仍用列级的', () => {
    const colEdit = () => document.createElement('input');
    const { table } = mount(
      {
        list: [{ id: 1, a: 'v' }],
        columns: [{ key: 'a', title: 'A', width: 120, renderEditor: colEdit }],
      },
      { begin: 0, end: 0 },
    );
    table.setCellRender('1', 'a', { cellType: 'option' });
    expect(table.resolveCellRender('1', 'a').renderEditor).toBe(colEdit);
  });
});

/**
 * 功能列的穿透：只放开**单元格级**。
 * 列级撞功能列仍旧是「配置写错了」（告警 + 忽略，用例在上面那个 describe 里）。
 */
describe('单元格级内容配置穿透功能列', () => {
  const checkboxCols = [
    { key: 'sel', title: '', width: 50, type: 'checkbox' as const },
    { key: 'a', title: 'A', width: 100 },
  ];

  it('配了单元格级 render 的那一格不再画勾选框，同列其他格照旧', () => {
    const { box, table } = mount(
      { list: rows(2, (i) => ({ a: 'v' + i })), columns: checkboxCols },
      { begin: 0, end: 1 },
    );
    table.setCellRender('0', 'sel', { render: () => '🔒' });
    const tds = [...box.querySelectorAll('.vt-tbody .vt-td[data-col-key="sel"]')];
    expect(tds[0].querySelector('input.vt-checkbox')).toBeNull();
    expect(tds[0].querySelector('.vt-td-text')?.textContent).toBe('🔒');
    expect(tds[1].querySelector('input.vt-checkbox')).not.toBeNull();
  });

  it('单元格级 cellType 也能穿透，且穿透不告警（那是列级才有的错）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { box, table } = mount(
      { list: [{ id: 0, sel: '已锁定', a: 'v' }], columns: checkboxCols },
      { begin: 0, end: 0 },
    );
    table.setCellRender('0', 'sel', { cellType: 'option' });
    expect(cell(box, 'sel').querySelector('.vt-cell-option')?.textContent).toBe('已锁定');
    expect(warn.mock.calls.some((c) => String(c[0]).includes('功能列'))).toBe(false);
  });

  it('index / expand / radio / drag 同样能穿透，功能列的 td 类名保留', () => {
    const { box, table } = mount(
      {
        list: [{ id: 0, a: 'v' }],
        columns: [
          { key: 'idx', title: '#', width: 50, type: 'index' },
          { key: 'exp', title: '', width: 40, type: 'expand' },
          { key: 'rd', title: '', width: 40, type: 'radio' },
          { key: 'dg', title: '', width: 40, type: 'drag' },
        ],
      },
      { begin: 0, end: 0 },
    );
    table.setCellRenders(
      ['idx', 'exp', 'rd', 'dg'].map((colKey) => ({
        rowKey: '0',
        colKey,
        config: { render: () => 'X' },
      })),
    );
    for (const key of ['idx', 'exp', 'rd', 'dg']) {
      const td = cell(box, key);
      expect(td.querySelector('.vt-td-text')?.textContent).toBe('X');
      // 列的排版类还在：这一列的内边距/居中不该因为一格特殊而错位
      expect(td.className).toContain('vt-td--');
    }
    expect(cell(box, 'idx').textContent).not.toContain('1');
    expect(cell(box, 'exp').querySelector('.vt-expand-icon')).toBeNull();
    expect(cell(box, 'rd').querySelector('input.vt-radio')).toBeNull();
    expect(cell(box, 'dg').querySelector('.vt-drag-handle')).toBeNull();
  });

  it('穿透只改 UI，不改选择态语义：表头全选仍会选中这一行', () => {
    const { box, table } = mount(
      { list: rows(2, (i) => ({ a: 'v' + i })), columns: checkboxCols },
      { begin: 0, end: 1 },
    );
    table.setCellRender('0', 'sel', { render: () => '🔒' });
    const headerCb = box.querySelector<HTMLInputElement>('.vt-th--checkbox input.vt-checkbox')!;
    headerCb.checked = true;
    headerCb.dispatchEvent(new Event('change'));
    expect(table.getCheckedKeys().sort()).toEqual(['0', '1']);
  });

  it('清除单元格级配置后功能列复原', () => {
    const { box, table } = mount(
      { list: [{ id: 0, a: 'v' }], columns: checkboxCols },
      { begin: 0, end: 0 },
    );
    table.setCellRender('0', 'sel', { render: () => '🔒' });
    expect(cell(box, 'sel').querySelector('input.vt-checkbox')).toBeNull();
    table.setCellRender('0', 'sel', null);
    expect(cell(box, 'sel').querySelector('input.vt-checkbox')).not.toBeNull();
  });

  it('tree 列不参与穿透判定（它本来就走内容链）', () => {
    const { box, table } = mount(
      {
        list: [{ id: 1, name: '父' }],
        columns: [{ key: 'name', title: 'N', width: 140, type: 'tree' }],
      },
      { begin: 0, end: 0 },
    );
    table.setCellRender('1', 'name', { render: () => '格级' });
    // 缩进与箭头仍在，内容被替换
    expect(cell(box, 'name').querySelector('.vt-tree-toggle')).not.toBeNull();
    expect(
      cell(box, 'name').querySelector('.vt-tree-content > .vt-td-text')?.textContent,
    ).toBe('格级');
  });
});
