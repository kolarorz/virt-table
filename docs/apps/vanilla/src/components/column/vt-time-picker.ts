import { VirtTable, type VirtTableColumn } from '@virt-table/vanilla';
import { vtCellEditor } from '@virt-table/vanilla/plugins';
import { VtTimePicker } from '@virt-table/vanilla/components';

export function bootstrapTableVtTimePicker(root: HTMLElement): () => void {
  const rowCount = 5000;

  const columns: VirtTableColumn[] = [
    { key: 'id', title: 'ID', width: 80, align: 'center' },
    { key: 'name', title: '排班', width: 160 },
    VtTimePicker({ key: 'start', title: '开始', width: 150 }),
    VtTimePicker({ key: 'end', title: '结束', width: 150, clearable: true }),
    // step: 1 让原生控件出现秒位；min/max 限制可选范围
    VtTimePicker({ key: 'checkAt', title: '打卡（含秒）', width: 180, step: 1, min: '06:00', max: '23:00' }),
    VtTimePicker({ key: 'fixed', title: '只读', width: 150, disabled: true }),
  ];

  const pad = (n: number) => String(n).padStart(2, '0');
  const list = Array.from({ length: rowCount }, (_, i) => ({
    id: i,
    name: `班次 ${i}`,
    start: `${pad(8 + (i % 4))}:${pad((i * 15) % 60)}`,
    end: `${pad(17 + (i % 3))}:${pad((i * 20) % 60)}`,
    checkAt: `${pad(8 + (i % 4))}:${pad((i * 7) % 60)}:${pad((i * 13) % 60)}`,
    fixed: '09:00',
  }));

  root.innerHTML = `
  <div id="status" class="status-text"></div>
  <div style="width:880px;height:600px;" class="demo-container" id="vtContainer"></div>
`;

  const container = root.querySelector('#vtContainer') as HTMLElement;
  const statusEl = root.querySelector('#status') as HTMLElement;

  const table = new VirtTable(container, {
    list,
    columns,
    itemKey: 'id',
    estimatedSize: 40,
    buffer: 4,
    border: true,
    plugins: [vtCellEditor()],
  });

  statusEl.textContent =
    'VtTimePicker：与 VtDatePicker 同构，用原生 input[type=time]。值就是控件的原始字符串（HH:mm，配了 step 则含秒），不做二次解析';

  return () => {
    table.destroy();
    root.innerHTML = '';
  };
}
