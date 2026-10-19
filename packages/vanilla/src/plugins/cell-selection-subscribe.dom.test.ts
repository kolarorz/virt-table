// @vitest-environment happy-dom
/**
 * `CellSelectionService.subscribe`：选区变化的**多消费者**通知。
 *
 * 存在的理由是 `options.onChange` / `options.onCellSelectionChange` 只有**一个**槽位，
 * 而且前者会顶掉后者 —— 那对使用方够用，对插件不够：状态栏的选区聚合、跟着选区走的图表
 * 都要跟着刷，共用一个槽位装两个就会互相抢掉。
 *
 * 这里验四件事：多个订阅者都收到、退订生效、与 `onChange` 并存互不影响、
 * 以及**一个订阅者抛异常不连带让选区失灵**（那是最容易被写崩的一条）。
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { VirtTable, type VirtTableOptions, type CellSelectionRange } from '../index';
import { vtCellSelection } from './index';
import type { CellSelectionService } from '../plugin';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
  vi.restoreAllMocks();
});

type Row = Record<string, any>;

/** 装表 + 从插件上下文里把服务抓出来（服务只在 `provide` 里，实例上没有） */
function mount(selectionOptions: Parameters<typeof vtCellSelection>[0] = {}) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  let service!: CellSelectionService;
  const grab = {
    name: 'grab',
    requires: ['vtCellSelection'],
    setup: (ctx: any) => {
      service = ctx.inject('cellSelection');
    },
  };
  const table = new VirtTable<Row>(box, {
    list: Array.from({ length: 10 }, (_, i) => ({ id: i, name: 'N' + i })),
    columns: [
      { key: 'id', title: 'ID', width: 80 },
      { key: 'name', title: '名称', width: 160 },
    ],
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 0,
    fixedSize: true,
    renderControl: () => ({ begin: 0, end: 9 }),
    plugins: [vtCellSelection(selectionOptions), grab as any],
  } as VirtTableOptions<Row>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  return { table, service };
}

const RANGE: CellSelectionRange = { startRow: 0, startCol: 0, endRow: 1, endCol: 1 };

describe('CellSelectionService.subscribe', () => {
  it('多个订阅者都收到同一次变化', () => {
    const { table, service } = mount();
    const a = vi.fn();
    const b = vi.fn();
    service.subscribe(a);
    service.subscribe(b);
    table.setCellSelection(RANGE);
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
    expect(a.mock.calls[0][0]).toMatchObject(RANGE);
  });

  it('清空选区时收到 null', () => {
    const { table, service } = mount();
    const fn = vi.fn();
    service.subscribe(fn);
    table.setCellSelection(RANGE);
    table.clearCellSelection();
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn.mock.calls[1][0]).toBeNull();
  });

  it('退订后不再收到', () => {
    const { table, service } = mount();
    const fn = vi.fn();
    const off = service.subscribe(fn);
    table.setCellSelection(RANGE);
    off();
    table.clearCellSelection();
    expect(fn).toHaveBeenCalledOnce();
  });

  it('与 options.onChange 并存 —— 谁都不顶掉谁', () => {
    const own = vi.fn();
    const sub = vi.fn();
    const { table, service } = mount({ onChange: own });
    service.subscribe(sub);
    table.setCellSelection(RANGE);
    expect(own).toHaveBeenCalledOnce();
    expect(sub).toHaveBeenCalledOnce();
  });

  it('订阅者抛异常：后面的照常收到，选区本身照常生效', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { table, service } = mount();
    const later = vi.fn();
    service.subscribe(() => {
      throw new Error('订阅者写崩了');
    });
    service.subscribe(later);
    table.setCellSelection(RANGE);
    expect(later).toHaveBeenCalledOnce();
    expect(table.getCellSelection()).toMatchObject(RANGE);
    expect(warn.mock.calls.flat().join(' ')).toContain('选区订阅者');
  });

  it('程序化设置与清除各触发一次，不重复通知', () => {
    const { table, service } = mount();
    const fn = vi.fn();
    service.subscribe(fn);
    table.setCellSelection(RANGE);
    table.setCellSelection({ startRow: 2, startCol: 0, endRow: 3, endCol: 1 });
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
