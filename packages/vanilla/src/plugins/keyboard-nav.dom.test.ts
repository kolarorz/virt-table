// @vitest-environment happy-dom
/** vtKeyboardNav 的按键映射。写法说明见 AGENTS.md §5.1 */
import { describe, it, expect, afterEach } from 'vitest';
import { VirtTable, type VirtTableOptions } from '../index';
import { vtCellSelection, vtKeyboardNav } from './index';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

type Row = Record<string, any>;
const ROWS = 500;

function mount(extra: Partial<VirtTableOptions<Row>> = {}) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  const table = new VirtTable<Row>(box, {
    list: Array.from({ length: ROWS }, (_, i) => ({ id: i, a: 'a' + i, b: 'b' + i, c: 'c' + i })),
    columns: [
      { key: 'a', title: 'A', width: 100 },
      { key: 'b', title: 'B', width: 100 },
      { key: 'c', title: 'C', width: 100 },
    ],
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 0,
    fixedSize: true,
    renderControl: () => ({ begin: 0, end: 19 }),
    plugins: [vtCellSelection(), vtKeyboardNav()],
    ...extra,
  } as VirtTableOptions<Row>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  return { box, table };
}

const press = (box: HTMLElement, key: string, mod: KeyboardEventInit = {}) => {
  box.querySelector('.vt-root')!.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...mod }),
  );
};
const focus = (t: VirtTable<Row>) => {
  const s = t.getCellSelection();
  return s ? { row: s.endRow, col: s.endCol } : null;
};

describe('vtKeyboardNav 行内导航', () => {
  it('Home / End 走行首尾，不动行号', () => {
    const { box, table } = mount();
    table.setCellSelection({ startRow: 5, startCol: 1, endRow: 5, endCol: 1 });
    press(box, 'End');
    expect(focus(table)).toEqual({ row: 5, col: 2 });
    press(box, 'Home');
    expect(focus(table)).toEqual({ row: 5, col: 0 });
  });

  it('Ctrl+Home / Ctrl+End 跳表首尾', () => {
    const { box, table } = mount();
    table.setCellSelection({ startRow: 5, startCol: 1, endRow: 5, endCol: 1 });
    press(box, 'End', { ctrlKey: true });
    expect(focus(table)).toEqual({ row: ROWS - 1, col: 2 });
    press(box, 'Home', { ctrlKey: true });
    expect(focus(table)).toEqual({ row: 0, col: 0 });
  });

  it('Cmd+Home / Cmd+End 同效（Mac 没有独立 Home 键）', () => {
    const { box, table } = mount();
    table.setCellSelection({ startRow: 5, startCol: 1, endRow: 5, endCol: 1 });
    press(box, 'End', { metaKey: true });
    expect(focus(table)).toEqual({ row: ROWS - 1, col: 2 });
    press(box, 'Home', { metaKey: true });
    expect(focus(table)).toEqual({ row: 0, col: 0 });
  });
});

describe('vtKeyboardNav 翻页', () => {
  it('PageDown / PageUp 按视口能放下的行数翻', () => {
    // happy-dom 里 clientHeight 恒为 0 → pageStep 退化为 1（Math.max(1, 0)）
    const { box, table } = mount();
    table.setCellSelection({ startRow: 10, startCol: 0, endRow: 10, endCol: 0 });
    press(box, 'PageDown');
    const after = focus(table)!;
    expect(after.row).toBeGreaterThan(10);
    press(box, 'PageUp');
    expect(focus(table)!.row).toBe(10);
  });

  it('翻页在两端夹住，不越界', () => {
    const { box, table } = mount();
    table.setCellSelection({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
    press(box, 'PageUp');
    expect(focus(table)!.row).toBe(0);
    table.setCellSelection({ startRow: ROWS - 1, startCol: 0, endRow: ROWS - 1, endCol: 0 });
    press(box, 'PageDown');
    expect(focus(table)!.row).toBe(ROWS - 1);
  });

  it('Shift+翻页扩展选区（锚点不动）', () => {
    const { box, table } = mount();
    table.setCellSelection({ startRow: 10, startCol: 1, endRow: 10, endCol: 1 });
    press(box, 'PageDown', { shiftKey: true });
    const sel = table.getCellSelection()!;
    expect(sel.startRow).toBe(10);
    expect(sel.startCol).toBe(1);
    expect(sel.endRow).toBeGreaterThan(10);
  });

  it('Shift+Ctrl+End 扩选到表尾', () => {
    const { box, table } = mount();
    table.setCellSelection({ startRow: 3, startCol: 0, endRow: 3, endCol: 0 });
    press(box, 'End', { ctrlKey: true, shiftKey: true });
    const sel = table.getCellSelection()!;
    expect(sel.startRow).toBe(3);
    expect(sel.endRow).toBe(ROWS - 1);
    expect(sel.endCol).toBe(2);
  });
});

describe('vtKeyboardNav 不越权', () => {
  it('无关按键不拦（不 preventDefault）', () => {
    const { box } = mount();
    const e = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    box.querySelector('.vt-root')!.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
  });

  it('导航键会 preventDefault（PageDown 否则会滚动页面）', () => {
    const { box, table } = mount();
    table.setCellSelection({ startRow: 1, startCol: 0, endRow: 1, endCol: 0 });
    const e = new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true, cancelable: true });
    box.querySelector('.vt-root')!.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
  });
});
