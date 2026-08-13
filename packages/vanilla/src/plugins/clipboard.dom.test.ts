// @vitest-environment happy-dom
/**
 * `vtClipboard` 的接管边界。
 *
 * 插件在 `.vt-root` 上监听 `copy`，有框选区域就 `preventDefault()` 并写出 TSV。问题是
 * 表格里还存在**别的**有自己复制语义的地方：编辑浮层里的输入框、搜索框，以及可交互的
 * 组件浮层（`VtPerson` 的悬停名片能划选里面的邮箱/电话）。那些地方必须放行，否则
 * 「表格里有选区」+「在浮层里划选文字」同时成立时，Cmd+C 拿到的是选区 TSV 而不是
 * 用户选中的那行字。
 *
 * happy-dom 没有真实剪贴板，这里塞一个假的 `clipboardData` 观察插件写了什么。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { VirtTable, type VirtTableOptions } from '../index';
import { vtCellSelection, vtClipboard } from './index';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

type Row = Record<string, any>;

function mount(extra: Partial<VirtTableOptions<Row>> = {}) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  const table = new VirtTable<Row>(box, {
    list: Array.from({ length: 20 }, (_, i) => ({ id: i, name: 'N' + i })),
    columns: [
      { key: 'id', title: 'ID', width: 80 },
      { key: 'name', title: '名称', width: 160 },
    ],
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 0,
    fixedSize: true,
    renderControl: () => ({ begin: 0, end: 9 }),
    plugins: [vtCellSelection(), vtClipboard()],
    ...extra,
  } as VirtTableOptions<Row>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  const root = box.querySelector('.vt-root') as HTMLElement;
  return { box, table, root };
}

/** 发一个带假 clipboardData 的 copy 事件，返回插件是否接管了它 */
function fireCopy(target: EventTarget): { prevented: boolean; text: string } {
  const e = new Event('copy', { bubbles: true, cancelable: true }) as Event & {
    clipboardData?: unknown;
  };
  const bag: Record<string, string> = {};
  e.clipboardData = {
    setData: (type: string, value: string) => {
      bag[type] = value;
    },
    getData: (type: string) => bag[type] ?? '',
  };
  target.dispatchEvent(e);
  return { prevented: e.defaultPrevented, text: bag['text/plain'] ?? '' };
}

describe('vtClipboard：谁接管 copy', () => {
  it('框选区域内的 copy 由表格接管，写出 TSV', () => {
    const { root, table } = mount();
    table.setCellSelection({ startRow: 0, startCol: 0, endRow: 1, endCol: 1 });

    const td = root.querySelector('.vt-tbody td') as HTMLElement;
    const { prevented, text } = fireCopy(td);
    expect(prevented).toBe(true);
    expect(text).toBe('0\tN0\n1\tN1');
  });

  it('组件浮层（`[data-vt-popup]`）里的 copy 放行 —— 名片里划选的文字归浏览器', () => {
    const { root, table } = mount();
    table.setCellSelection({ startRow: 0, startCol: 0, endRow: 1, endCol: 1 });

    // 模拟一张挂在 .vt-root 上的悬停名片
    const popup = document.createElement('div');
    popup.dataset.vtPopup = '';
    const value = document.createElement('span');
    value.textContent = 'lina@example.com';
    popup.appendChild(value);
    root.appendChild(popup);

    const { prevented, text } = fireCopy(value);
    expect(prevented).toBe(false);
    expect(text).toBe('');
  });

  it('没有框选区域时谁都不接管', () => {
    const { root } = mount();
    const td = root.querySelector('.vt-tbody td') as HTMLElement;
    expect(fireCopy(td).prevented).toBe(false);
  });
});
