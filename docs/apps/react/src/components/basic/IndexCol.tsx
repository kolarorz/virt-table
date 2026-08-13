import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef } from '@virt-table/react';
import { faker } from '@faker-js/faker';

const DATA_COL = 8;
const ROW_COUNT = 500;

const columns: ReactTableColumn[] = [
  { key: '__index', title: '#', width: 64, type: 'index' as const, align: 'center' as const },
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

export default function IndexColTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const status = '序号列 + 8 列数据，border: true';
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 序号列</h3>
      <div className="virt-table-controls" />
      <div className="status-text">{status}</div>
      <div style={{ width: 800, height: 600 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{ list, itemKey: 'id', estimatedSize: 40, buffer: 4, border: true }}
        />
      </div>
    </div>
  );
}
