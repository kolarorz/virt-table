import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { vtCellEditor } from '@virt-table/vanilla/plugins';
import { VtInput } from '@virt-table/vanilla/components';

export function bootstrapTableVtInput(root: HTMLElement): () => void {
  const rowCount = 5000;
  const columns: VirtTableColumn[] = [
    { key: 'id', title: 'ID', width: 80, align: 'center' },
    VtInput({ key: 'name', title: '姓名', width: 180, placeholder: '请输入姓名' }),
    VtInput({ key: 'email', title: '邮箱', width: 240, placeholder: '请输入邮箱', clearable: true }),
    VtInput({ key: 'remark', title: '备注', width: 260, placeholder: '请输入备注', maxLength: 50, clearable: true }),
    VtInput({ key: 'readonly', title: '只读列', width: 180, disabled: true }),
  ];

  const list = Array.from({ length: rowCount }, (_, i) => ({
    id: i,
    name: `用户 ${i}`,
    email: `user${i}@example.com`,
    remark: i % 3 === 0 ? `备注信息 ${i}` : '',
    readonly: `不可编辑 ${i}`,
  }));

  root.innerHTML = `
  <div id="status" class="status-text"></div>
  <div style="width:960px;height:600px;" class="demo-container" id="vtContainer"></div>
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
    textOverflow: 'ellipsis',
    // 编辑态走 renderEditor，必须装 vtCellEditor 才会被触发
    plugins: [vtCellEditor()],
  });

  status.textContent = `VtInput 单元格组件：${rowCount} 行（点击单元格编辑，支持 placeholder、clearable、maxLength、disabled）`;

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
