import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef } from '@virt-table/react';
import { faker } from '@faker-js/faker';

const DATA_COL = 8;
const ROW_COUNT = 200;

const columns: ReactTableColumn[] = [
  { key: '__ck', title: '', width: 50, type: 'checkbox' as const, align: 'center' as const },
  ...Array.from({ length: DATA_COL }, (_, i) => ({
    key: `extra_${i}`,
    title: `列 ${i}`,
    width: 150,
  })),
];

const list = Array.from({ length: ROW_COUNT }, (_, i) => {
  const row: Record<string, unknown> = { id: i };
  for (let c = 0; c < DATA_COL; c++) {
    row[`extra_${c}`] = `${i}-${c}-${faker.lorem.word()}`;
  }
  return row;
});

export default function CheckboxTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [status, setStatus] = React.useState('多选 + 8 列数据');
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 多选行</h3>
      <div className="virt-table-controls">
        <button
          type="button"
          onClick={() => {
            tableRef.current?.clearCheckedRows();
            setStatus('已清空多选');
          }}
        >
          清空多选
        </button>
      </div>
      <div className="status-text">{status}</div>
      <div style={{ width: 800, height: 600 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{
            list,
            itemKey: 'id',
            estimatedSize: 40,
            buffer: 4,
            border: true,
            onCheckChange: (checked, row) => {
              setStatus(`onCheckChange: ${checked} id=${(row as { id: number }).id}`);
            },
            onCheckAll: (checked) => {
              setStatus(`onCheckAll: ${checked}`);
            },
          }}
        />
      </div>
    </div>
  );
}
