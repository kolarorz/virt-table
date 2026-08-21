import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { VtSwitch } from '@virt-table/vanilla/components';

export function bootstrapTableVtSwitch(root: HTMLElement): () => void {
  const rowCount = 5000;

  let lastChange = '（未操作）';

  const columns: VirtTableColumn[] = [
    { key: 'id', title: 'ID', width: 80, align: 'center' },
    { key: 'name', title: '名称', width: 160 },
    VtSwitch({
      key: 'enabled',
      title: '启用',
      width: 110,
      onChange: (v, row) => {
        lastChange = `${(row as any).name} → ${v}`;
        refresh();
      },
    }),
    // 带文案
    VtSwitch({ key: 'notify', title: '通知', width: 160, activeText: '已开启', inactiveText: '已关闭' }),
    // 字符串枚举
    VtSwitch({ key: 'mode', title: '模式', width: 150, trueValue: 'on', falseValue: 'off', activeText: 'on', inactiveText: 'off' }),
    VtSwitch({ key: 'locked', title: '锁定（只读）', width: 130, disabled: true }),
  ];

  const list = Array.from({ length: rowCount }, (_, i) => ({
    id: i,
    name: `条目 ${i}`,
    enabled: i % 2 === 0,
    notify: i % 3 === 0,
    mode: i % 4 === 0 ? 'on' : 'off',
    locked: i % 5 === 0,
  }));

  root.innerHTML = `
  <div id="status" class="status-text"></div>
  <div style="width:840px;height:600px;" class="demo-container" id="vtContainer"></div>
`;

  const container = root.querySelector('#vtContainer') as HTMLElement;
  const status = root.querySelector('#status') as HTMLElement;

  const table = new VirtTable(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    border: true,
  });

  function refresh() {
    const on = list.filter((r) => r.enabled).length;
    status.textContent = `VtSwitch：点一下即写回，与 VtCheckbox 同一套值语义（trueValue / falseValue）。启用 ${on} 行 · 最近一次 onChange：${lastChange}`;
  }
  refresh();

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
