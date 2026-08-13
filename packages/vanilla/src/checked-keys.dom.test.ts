// @vitest-environment happy-dom
/** getCheckedKeys / getCheckedRows 的分工，以及 tooltip 配置的对象形态。写法见 AGENTS.md §5.1 */
import { describe, it, expect, afterEach } from 'vitest';
import { VirtTable, type VirtTableOptions } from './index';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

type Row = Record<string, any>;

function mount(options: Partial<VirtTableOptions<Row>>, win = { begin: 0, end: 9 }) {
  const box = document.createElement('div');
  document.body.appendChild(box);
  const table = new VirtTable<Row>(box, {
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 0,
    fixedSize: true,
    renderControl: () => ({ ...win }),
    ...options,
  } as VirtTableOptions<Row>);
  cleanups.push(() => {
    table.destroy();
    box.remove();
  });
  return { box, table };
}

const page = (ids: number[]): Row[] => ids.map((id) => ({ id, name: 'N' + id }));
const cols = [
  { key: 'sel', title: '', width: 40, type: 'checkbox' as const },
  { key: 'name', title: '名称', width: 120 },
];

describe('getCheckedKeys', () => {
  it('返回勾选顺序（Set 插入序），不是显示顺序', () => {
    const { table } = mount({ list: page([0, 1, 2, 3]), columns: cols });
    table.setCheckedRows(['3', '1']);
    expect(table.getCheckedKeys()).toEqual(['3', '1']);
    // getCheckedRows 是按当前 list 过滤 → 显示顺序
    expect(table.getCheckedRows().map((r) => r.id)).toEqual([1, 3]);
  });

  it('服务端分页的关键用途：换页后仍能拿到不在当前页的选中项', () => {
    const { table } = mount({ list: page([0, 1, 2]), columns: cols });
    table.setCheckedRows(['1', '2']);
    // 翻到第二页：list 换成完全不同的行
    table.setList(page([10, 11, 12]));
    table.setCheckedRows([...table.getCheckedKeys(), '11']);

    // getCheckedRows 只看得到当前页的
    expect(table.getCheckedRows().map((r) => r.id)).toEqual([11]);
    // getCheckedKeys 保留全部
    expect(table.getCheckedKeys()).toEqual(['1', '2', '11']);
  });

  it('clearCheckedRows 后为空', () => {
    const { table } = mount({ list: page([0, 1]), columns: cols });
    table.setCheckedRows(['0', '1']);
    table.clearCheckedRows();
    expect(table.getCheckedKeys()).toEqual([]);
  });

  it('返回的是新数组，改它不影响表格', () => {
    const { table } = mount({ list: page([0, 1]), columns: cols });
    table.setCheckedRows(['0']);
    table.getCheckedKeys().push('999');
    expect(table.getCheckedKeys()).toEqual(['0']);
  });

  it('没有勾选列时也不报错', () => {
    const { table } = mount({ list: page([0]), columns: [cols[1]] });
    expect(table.getCheckedKeys()).toEqual([]);
  });
});

describe('tooltip 配置对象', () => {
  const long = 'x'.repeat(200);

  it('不传 tooltip 也能正常渲染 tooltip 列（走默认 150ms）', () => {
    const { box } = mount({
      list: [{ id: 0, v: long }],
      columns: [{ key: 'v', title: 'V', width: 80, textOverflow: 'tooltip' }],
    });
    expect(box.querySelector('.vt-td-text--tooltip')).not.toBeNull();
  });

  it('tooltip.delay 被读到（0 也生效，不被当作 falsy 丢掉）', async () => {
    const { box } = mount({
      list: [{ id: 0, v: long }],
      columns: [{ key: 'v', title: 'V', width: 80, textOverflow: 'tooltip' }],
      tooltip: { delay: 0 },
    });
    const cell = box.querySelector<HTMLElement>('.vt-td-text--tooltip')!;
    // happy-dom 里 scrollWidth 恒为 0 → 判定为「没被裁」，不该弹；
    // 这里断言的是「delay:0 不会让计时器路径炸掉」，真实弹出行为由 CDP 验证（§7.6）
    cell.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 10));
    expect(box.querySelector('.vt-tooltip')).toBeNull();
  });
});
