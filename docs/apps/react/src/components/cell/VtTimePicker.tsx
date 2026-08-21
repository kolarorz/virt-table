import { VirtTableReact, type ReactTableColumn, vtCellEditor } from '@virt-table/react';
import { VtTimePicker } from '@virt-table/vanilla/components';

const ROW_COUNT = 5000;

const columns: ReactTableColumn[] = [
  { key: 'id', title: 'ID', width: 80, align: 'center' },
  { key: 'name', title: '排班', width: 160 },
  VtTimePicker({ key: 'start', title: '开始', width: 150 }),
  VtTimePicker({ key: 'end', title: '结束', width: 150, clearable: true }),
  // step: 1 让原生控件出现秒位；min/max 限制可选范围
  VtTimePicker({ key: 'checkAt', title: '打卡（含秒）', width: 180, step: 1, min: '06:00', max: '23:00' }),
  VtTimePicker({ key: 'fixed', title: '只读', width: 150, disabled: true }),
];

const pad = (n: number) => String(n).padStart(2, '0');
const list = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i,
  name: `班次 ${i}`,
  start: `${pad(8 + (i % 4))}:${pad((i * 15) % 60)}`,
  end: `${pad(17 + (i % 3))}:${pad((i * 20) % 60)}`,
  checkAt: `${pad(8 + (i % 4))}:${pad((i * 7) % 60)}:${pad((i * 13) % 60)}`,
  fixed: '09:00',
}));

const plugins = [vtCellEditor()];

export default function VtTimePickerTable() {
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React VtTimePicker 时间选择</h3>
      <div className="status-text">
        VtTimePicker：与 VtDatePicker 同构，用原生 input[type=time]。值就是控件的原始字符串（HH:mm，
        配了 step 则含秒），不做二次解析。清除「×」默认就有（原生 time 控件「怎么删回空」各家不一），
        传 clearable: false 关掉
      </div>
      <div style={{ width: 880, height: 600 }} className="demo-container">
        <VirtTableReact
          columns={columns}
          options={{ list, itemKey: 'id', estimatedSize: 40, buffer: 4, border: true, plugins }}
        />
      </div>
    </div>
  );
}
