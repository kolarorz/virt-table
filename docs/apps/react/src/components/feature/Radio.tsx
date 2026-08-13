import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef } from '@virt-table/react';
import { faker } from '@faker-js/faker';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  city: string;
}

const columns: ReactTableColumn<Row>[] = [
  { key: 'radio', title: '', width: 50, type: 'radio', fixed: 'left' },
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名', width: 220 },
  { key: 'city', title: '城市', width: 220 },
];

const list: Row[] = Array.from({ length: 500 }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  city: faker.location.city(),
}));

export default function RadioTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [out, setOut] = React.useState('未选中');

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 单选行 radio</h3>
      <div className="virt-table-controls">
        <button
          type="button"
          className="virt-table-btn virt-table-btn-primary"
          onClick={() => {
            const r = tableRef.current?.getSelectedRadio() as Row | null | undefined;
            setOut(r ? `当前：${r.name}（id=${r.id}）` : '未选中');
          }}
        >
          获取当前选中
        </button>
        <button
          type="button"
          className="virt-table-btn"
          onClick={() => {
            tableRef.current?.setSelectedRadio(null);
            setOut('未选中');
          }}
        >
          清除
        </button>
        <span className="demo-note">{out}</span>
      </div>
      <div style={{ width: 620, height: 480 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{
            list,
            itemKey: 'id',
            estimatedSize: 40,
            buffer: 6,
            border: true,
            onRadioChange: (row) => setOut(`选中：${(row as Row).name}`),
          }}
        />
      </div>
    </div>
  );
}
