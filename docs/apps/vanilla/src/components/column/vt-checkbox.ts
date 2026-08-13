import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { VtCheckbox } from '@virt-table/vanilla/components';

export function bootstrapTableVtCheckbox(root: HTMLElement): () => void {
  const rowCount = 5000;

  const columns: VirtTableColumn[] = [
    { key: 'id', title: 'ID', width: 80, align: 'center' },
    { key: 'name', title: '名称', width: 160 },
    VtCheckbox({ key: 'enabled', title: '启用', width: 100, align: 'center' }),
    // 值不是布尔：勾选写回 'Y'、取消写回 'N'
    VtCheckbox({ key: 'vip', title: 'VIP', width: 100, align: 'center', trueValue: 'Y', falseValue: 'N' }),
    // 数字 1/0
    VtCheckbox({ key: 'audited', title: '已审核', width: 110, align: 'center', trueValue: 1, falseValue: 0 }),
    // 只读回显
    VtCheckbox({ key: 'locked', title: '锁定（只读）', width: 130, align: 'center', disabled: true }),
  ];

  const list = Array.from({ length: rowCount }, (_, i) => ({
    id: i,
    name: `条目 ${i}`,
    enabled: i % 2 === 0,
    vip: i % 3 === 0 ? 'Y' : 'N',
    audited: i % 4 === 0 ? 1 : 0,
    locked: i % 5 === 0,
  }));

  root.innerHTML = `
  <div id="status" class="status-text"></div>
  <div style="width:820px;height:600px;" class="demo-container" id="vtContainer"></div>
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

  const refresh = () => {
    const on = list.filter((r) => r.enabled).length;
    const vip = list.filter((r) => r.vip === 'Y').length;
    status.textContent = `VtCheckbox：点一下即写回（不弹编辑浮层，所以不需要 vtCellEditor 插件）。当前启用 ${on} 行、VIP ${vip} 行`;
  };
  refresh();
  container.addEventListener('change', () => refresh());

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
