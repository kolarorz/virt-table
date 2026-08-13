import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef } from '@virt-table/react';
import { faker } from '@faker-js/faker';

const COL_COUNT = 10;
const ROW_COUNT = 1000;

const columns: ReactTableColumn[] = Array.from({ length: COL_COUNT }, (_, i) => ({
  key: `extra_${i}`,
  title: `列 ${i}`,
  width: 200,
}));

const list = Array.from({ length: ROW_COUNT }, (_, i) => {
  const row: Record<string, unknown> = { id: i };
  for (let c = 0; c < COL_COUNT; c++) {
    row[`extra_${c}`] = `${i}-${c}-${faker.lorem.words(6)}`;
  }
  return row;
});

export default function HighlightTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const status =
    '悬停/行选/列选/格选 高亮已开启。点击单元格、行、列以查看效果。';
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 高亮悬停/选中</h3>
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
            highlightHoverRow: true,
            highlightSelectRow: true,
            highlightSelectCol: true,
            highlightSelectCell: true,
          }}
        />
      </div>
    </div>
  );
}
