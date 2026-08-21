// @vitest-environment happy-dom
/**
 * 数据更新通道的 DOM 契约 —— 「响应式更新」示例与文档承诺的就是这些：
 *
 * 1. 原地改字段、不通知 → 已渲染出来的行**停在原内容**（行池里已有的 key 不重填单元格）
 * 2. `forceUpdate()` → 清空行池重建可视行，内容追上；**一个数据对象都不新建**
 * 3. `setList()` → 同样追上，且**传同一个数组引用也生效**（换新数组只是框架端 watch /
 *    effect 认得的信号，不是 `setList` 的前提）
 * 4. `forceUpdate()` 顶不住的两种情况：开了管线（排序/筛选/分组/树/客户端分页）之后的
 *    原地增删、以及改动了参与排序的字段 —— 那些必须走 `setList()` 重跑管线
 *
 * 环境取舍与其他 DOM 测试一致：`renderControl` 钉住渲染窗口（happy-dom 里几何全是 0），
 * `fixedSize: true` 跳过 ResizeObserver。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { VirtTable, type VirtTableColumn, type VirtTableOptions } from './index';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

type Row = Record<string, any>;

const columns: VirtTableColumn<Row>[] = [
  { key: 'code', title: '代码', width: 100, sortable: true },
  { key: 'tick', title: '轮次', width: 80 },
];

function mount(list: Row[]) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  const table = new VirtTable<Row>(box, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 0,
    fixedSize: true,
    renderControl: () => ({ begin: 0, end: 9 }),
  } as VirtTableOptions<Row>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  return { box, table };
}

function cells(box: HTMLElement, key: string): string[] {
  return Array.from(box.querySelectorAll(`tbody td[data-col-key="${key}"]`)).map(
    (td) => (td.textContent ?? '').trim(),
  );
}

/** 刻意乱序（B / A / C），排序管线一开就能看出顺序变化 */
function createRows(): Row[] {
  return [
    { id: 0, code: 'B', tick: 0 },
    { id: 1, code: 'A', tick: 0 },
    { id: 2, code: 'C', tick: 0 },
  ];
}

describe('更新通道', () => {
  it('原地改字段又不通知：已渲染的行停在原内容', () => {
    const list = createRows();
    const { box } = mount(list);
    expect(cells(box, 'tick')).toEqual(['0', '0', '0']);

    for (const row of list) row.tick = 1;

    expect(cells(box, 'tick')).toEqual(['0', '0', '0']);
  });

  it('forceUpdate() 让原地修改追上', () => {
    const list = createRows();
    const { box, table } = mount(list);

    for (const row of list) row.tick = 1;
    table.forceUpdate();

    expect(cells(box, 'tick')).toEqual(['1', '1', '1']);
  });

  it('setList() 让内容追上 —— 换新数组与传同一引用都行', () => {
    const list = createRows();
    const { box, table } = mount(list);

    table.setList(list.map((row) => ({ ...row, tick: 2 })));
    expect(cells(box, 'tick')).toEqual(['2', '2', '2']);

    // 同一个数组引用：setList 是命令式调用，不比较引用
    const same = createRows();
    const second = mount(same);
    same[0].tick = 5;
    second.table.setList(same);
    expect(cells(second.box, 'tick')).toEqual(['5', '0', '0']);
  });
});

describe('forceUpdate 的边界', () => {
  it('改字段：开了排序管线也够用（派生列表里是同一批对象）', () => {
    const list = createRows();
    const { box, table } = mount(list);
    table.sort('code', 'asc');
    expect(cells(box, 'code')).toEqual(['A', 'B', 'C']);

    for (const row of list) row.tick = 7;
    table.forceUpdate();

    expect(cells(box, 'tick')).toEqual(['7', '7', '7']);
  });

  it('原地增行：扁平表下 forceUpdate 能看到', () => {
    const list = createRows();
    const { box, table } = mount(list);

    list.push({ id: 3, code: 'D', tick: 0 });
    table.forceUpdate();

    expect(cells(box, 'code')).toEqual(['B', 'A', 'C', 'D']);
  });

  it('原地增行：开了排序管线后 forceUpdate 看不到，必须 setList', () => {
    const list = createRows();
    const { box, table } = mount(list);
    table.sort('code', 'asc');

    list.push({ id: 3, code: 'AA', tick: 0 });
    table.forceUpdate();
    expect(cells(box, 'code')).toEqual(['A', 'B', 'C']); // 新行不在派生列表里

    table.setList(list);
    expect(cells(box, 'code')).toEqual(['A', 'AA', 'B', 'C']);
  });

  it('改了参与排序的字段：forceUpdate 只更新内容，setList 才重排', () => {
    const list = createRows();
    const { box, table } = mount(list);
    table.sort('code', 'asc');

    list[2].code = 'AAA'; // C → AAA，本该排到最前
    table.forceUpdate();
    expect(cells(box, 'code')).toEqual(['A', 'B', 'AAA']); // 值变了，顺序没动

    table.setList(list);
    expect(cells(box, 'code')).toEqual(['A', 'AAA', 'B']);
  });
});
