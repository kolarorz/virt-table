import React from 'react';
import {
  VirtTableReact,
  type ReactTableColumn,
  type VirtTableRef,
  vtCellEditor,
} from '@virt-table/react';
import { VtInput, VtNumberInput } from '@virt-table/vanilla/components';
import { faker } from '@faker-js/faker';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  age: number;
  email: string;
}

const columns: ReactTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80 },
  VtInput<Row>({
    key: 'name',
    title: '姓名（必填）',
    width: 200,
    validator: (v) => (String(v ?? '').trim() ? true : '姓名不能为空'),
  }),
  VtNumberInput<Row>({
    key: 'age',
    title: '年龄（1-120）',
    width: 200,
    validator: (v) => {
      const n = Number(v);
      return n >= 1 && n <= 120 ? true : '年龄需在 1-120';
    },
  }),
  VtInput<Row>({
    key: 'email',
    title: '邮箱',
    width: 260,
    validator: (v) => (/^\S+@\S+\.\S+$/.test(String(v ?? '')) ? true : '邮箱格式不正确'),
  }),
];

const list: Row[] = Array.from({ length: 200 }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  age: faker.number.int({ min: 18, max: 60 }),
  email: faker.internet.email(),
}));
// 故意放几条非法数据
list[0]!.name = '';
list[1]!.age = 999;
list[2]!.email = 'not-an-email';

export default function ValidateTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [out, setOut] = React.useState('点击单元格编辑，非法值会标红');

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 编辑校验</h3>
      <div className="virt-table-controls">
        <button
          type="button"
          className="virt-table-btn virt-table-btn-primary"
          onClick={() => {
            const errors = tableRef.current?.validateAll() ?? [];
            setOut(
              errors.length
                ? `发现 ${errors.length} 处错误，如 id=${(errors[0]!.row as Row).id}：${errors[0]!.message}`
                : '全部校验通过 ✓',
            );
          }}
        >
          校验全部
        </button>
        <span className="demo-note">{out}</span>
      </div>
      <div style={{ width: 760, height: 460 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{
            plugins: [vtCellEditor()],
            list,
            itemKey: 'id',
            estimatedSize: 40,
            buffer: 6,
            border: true,
          }}
        />
      </div>
    </div>
  );
}
