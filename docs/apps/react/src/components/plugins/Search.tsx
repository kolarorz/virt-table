import React from 'react';
import { VirtTableReact, vtSearch, type ReactTableColumn, type VirtTableRef } from '@virt-table/react';
import { faker } from '@faker-js/faker';

const COL_COUNT = 10;
const ROW_COUNT = 500;

const columns: ReactTableColumn[] = Array.from({ length: COL_COUNT }, (_, i) => ({
  key: `extra_${i}`,
  title: `列 ${i}`,
  width: 150,
}));

const list = Array.from({ length: ROW_COUNT }, (_, i) => {
  const row: Record<string, unknown> = { id: i };
  for (let c = 0; c < COL_COUNT; c++) {
    row[`extra_${c}`] = `${i}-${c}-${faker.lorem.words(2)}`;
  }
  return row;
});

export default function SearchTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const status = 'Ctrl/Cmd+F 或表内搜索栏：vtSearch 插件';
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 搜索</h3>
      <div className="virt-table-controls" />
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
            plugins: [vtSearch()],
          }}
        />
      </div>
    </div>
  );
}
