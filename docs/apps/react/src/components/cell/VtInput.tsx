import { VirtTableReact, type ReactTableColumn, vtCellEditor } from '@virt-table/react';
import { VtInput } from '@virt-table/vanilla/components';

// 单元格组件是与框架无关的列工厂：直接从 vanilla 引，返回的列可以原样交给 VirtTableReact
const ROW_COUNT = 5000;

const columns: ReactTableColumn[] = [
  { key: 'id', title: 'ID', width: 80, align: 'center' },
  VtInput({ key: 'name', title: '姓名', width: 180, placeholder: '请输入姓名' }),
  VtInput({ key: 'email', title: '邮箱', width: 240, placeholder: '请输入邮箱', clearable: true }),
  VtInput({
    key: 'remark',
    title: '备注',
    width: 260,
    placeholder: '请输入备注',
    maxLength: 50,
    clearable: true,
  }),
  VtInput({ key: 'readonly', title: '只读列', width: 180, disabled: true }),
];

const list = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i,
  name: `用户 ${i}`,
  email: `user${i}@example.com`,
  remark: i % 3 === 0 ? `备注信息 ${i}` : '',
  readonly: `不可编辑 ${i}`,
}));

// 编辑态走 renderEditor，必须装 vtCellEditor 才会被触发
const plugins = [vtCellEditor()];

export default function VtInputTable() {
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React VtInput 文本输入</h3>
      <div className="status-text">
        VtInput 单元格组件：{ROW_COUNT} 行（点击单元格编辑，支持 placeholder、clearable、maxLength、disabled）
      </div>
      <div style={{ width: 960, height: 600 }} className="demo-container">
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
