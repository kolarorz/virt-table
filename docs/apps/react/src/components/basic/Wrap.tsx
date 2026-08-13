import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef } from '@virt-table/react';
import { faker } from '@faker-js/faker';

const COL_COUNT = 8;
const ROW_COUNT = 200;

const longText = () => faker.lorem.sentences(3);

const columns: ReactTableColumn[] = Array.from({ length: COL_COUNT }, (_, i) => ({
  key: `extra_${i}`,
  title: `列 ${i}`,
  width: 200,
}));

const list = Array.from({ length: ROW_COUNT }, (_, i) => {
  const row: Record<string, unknown> = { id: i };
  for (let c = 0; c < COL_COUNT; c++) {
    row[`extra_${c}`] = longText();
  }
  return row;
});

export default function WrapTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const status = '长文本自动换行（默认，border: true）';
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 换行</h3>
      <div className="virt-table-controls" />
      <div className="status-text">{status}</div>
      <div style={{ width: 800, height: 600 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{ list, itemKey: 'id', estimatedSize: 56, buffer: 4, border: true }}
        />
      </div>
    </div>
  );
}
