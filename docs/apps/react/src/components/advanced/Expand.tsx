import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef } from '@virt-table/react';
import { faker } from '@faker-js/faker';

const COL_DATA = 6;
const ROW_COUNT = 100;

const expandRows = Array.from({ length: ROW_COUNT }, (_, i) => {
  const row: Record<string, unknown> = { id: i };
  for (let c = 0; c < COL_DATA; c++) {
    row[`extra_${c}`] = `${i}-${c}-${faker.lorem.words(3)}`;
  }
  return row;
});

const columns: ReactTableColumn[] = [
  {
    key: '__expand',
    title: '',
    width: 50,
    type: 'expand' as const,
    renderExpandRow: ({ row }) => (
      <div style={{ padding: 8, lineHeight: 1.6 }}>
        <strong>行 {(row as { id: number }).id} 的详情</strong>
        <br />
        {Object.keys(row)
          .filter((k) => k !== 'id' && !k.startsWith('_'))
          .map((k) => (
            <div key={k}>
              {k}: {String((row as Record<string, unknown>)[k])}
            </div>
          ))}
      </div>
    ),
  },
  ...Array.from({ length: COL_DATA }, (_, i) => ({
    key: `extra_${i}`,
    title: `列 ${i}`,
    width: 180,
  })),
];

export default function ExpandTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [status, setStatus] = React.useState('展开行：100 行');
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 展开行</h3>
      <div className="virt-table-controls">
        <button type="button" onClick={() => { tableRef.current?.expandAll(); setStatus('全部展开'); }}>全部展开</button>
        <button type="button" onClick={() => { tableRef.current?.collapseAll(); setStatus('全部收起'); }}>全部收起</button>
      </div>
      <div className="status-text">{status}</div>
      <div style={{ width: 800, height: 600 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{ list: expandRows, itemKey: 'id', estimatedSize: 40, buffer: 4, border: true }}
        />
      </div>
    </div>
  );
}
