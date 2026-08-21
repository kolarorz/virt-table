import { VirtTableReact, type ReactTableColumn, vtCellEditor } from '@virt-table/react';
import { VtNumberInput } from '@virt-table/vanilla/components';

const ROW_COUNT = 5000;

const columns: ReactTableColumn[] = [
  { key: 'id', title: 'ID', width: 80, align: 'center' },
  VtNumberInput({ key: 'score', title: '分数', width: 160, placeholder: '0-100', min: 0, max: 100, step: 1 }),
  VtNumberInput({
    key: 'price',
    title: '价格',
    width: 180,
    placeholder: '请输入价格',
    min: 0,
    step: 0.01,
    precision: 2,
    clearable: true,
  }),
  VtNumberInput({
    key: 'quantity',
    title: '数量',
    width: 160,
    placeholder: '请输入数量',
    min: 0,
    max: 9999,
    step: 1,
    clearable: true,
  }),
  VtNumberInput({ key: 'readonly', title: '只读', width: 160, disabled: true, precision: 2 }),
];

const list = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i,
  score: Math.floor(Math.random() * 100),
  price: +(Math.random() * 1000).toFixed(2),
  quantity: Math.floor(Math.random() * 500),
  readonly: +(Math.random() * 100).toFixed(2),
}));

// 编辑态走 renderEditor，必须装 vtCellEditor 才会被触发
const plugins = [vtCellEditor()];

export default function VtNumberInputTable() {
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React VtNumberInput 数字输入</h3>
      <div className="status-text">
        VtNumberInput 单元格组件：{ROW_COUNT} 行（支持 min/max/step/precision、clearable、disabled）
      </div>
      <div style={{ width: 760, height: 600 }} className="demo-container">
        <VirtTableReact
          columns={columns}
          options={{
            list,
            itemKey: 'id',
            estimatedSize: 40,
            buffer: 4,
            border: true,
            textOverflow: 'ellipsis',
            plugins,
          }}
        />
      </div>
    </div>
  );
}
