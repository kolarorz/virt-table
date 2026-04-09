import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef } from '@virt-table/react';
import { faker } from '@faker-js/faker';

const COL_COUNT = 20;
const ROW_COUNT = 1000;

const columns: ReactTableColumn[] = Array.from({ length: COL_COUNT }, (_, i) => ({
  key: `col_${i}`,
  title: `列 ${i}`,
  width: 150,
  fixed: i === 0 ? 'left' as const : i === COL_COUNT - 1 ? 'right' as const : undefined,
}));

const list = Array.from({ length: ROW_COUNT }, (_, i) => {
  const row: Record<string, any> = { id: i };
  for (let c = 0; c < COL_COUNT; c++) {
    row[`col_${c}`] = `${i}-${c}-${faker.lorem.words(3)}`;
  }
  return row;
});

export default function BasicTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [status, setStatus] = React.useState(`${ROW_COUNT} 行 × ${COL_COUNT} 列`);

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ margin: '0 0 12px', color: '#1d2129' }}>React 基础表格</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => { tableRef.current?.scrollToTop(); setStatus('已滚动到顶部'); }}>
          滚动到顶部
        </button>
        <button onClick={() => { tableRef.current?.scrollToBottom(); setStatus('已滚动到底部'); }}>
          滚动到底部
        </button>
        <button onClick={() => {
          const idx = Math.floor(Math.random() * ROW_COUNT);
          tableRef.current?.scrollToIndex(idx);
          setStatus(`随机滚动到第 ${idx + 1} 行`);
        }}>
          随机滚动
        </button>
        <button onClick={() => { tableRef.current?.scrollToIndex(499); setStatus('已滚动到第 500 行'); }}>
          滚动到第 500 行
        </button>
      </div>
      <div style={{ color: '#86909c', fontSize: 13, marginBottom: 8 }}>{status}</div>
      <div style={{ width: 800, height: 500, border: '1px solid #e5e6eb' }}>
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{ list, itemKey: 'id', minSize: 40, buffer: 4, border: true }}
        />
      </div>
    </div>
  );
}
