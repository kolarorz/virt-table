import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef } from '@virt-table/react';
import { faker } from '@faker-js/faker';

const colCount = 8;
const rowCount = 100;

const columns: ReactTableColumn[] = Array.from({ length: colCount }, (_, i) => ({
  key: `col_${i}`,
  title: i === 0 ? '名称' : i < 4 ? `Q${i}` : `指标 ${i - 3}`,
  width: i === 0 ? 180 : 140,
}));

const list = Array.from({ length: rowCount }, (_, i) => {
  const row: Record<string, unknown> = { id: i, col_0: faker.person.fullName() };
  for (let c = 1; c < colCount; c++) {
    row[`col_${c}`] = String(Math.floor(Math.random() * 1000));
  }
  return row;
});

const footerData = [
  ['合计', '', '', '', '100', '200', '300', '400'],
  ['平均', '', '', '', '25', '50', '75', '100'],
];

const footerMerges = [
  { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 4 },
  { rowIndex: 1, colIndex: 0, rowspan: 1, colspan: 4 },
];

export default function FooterMergeTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [status, setStatus] = React.useState(
    `表尾合并：${rowCount} 行（两行表尾 + 合计/平均跨列合并）`,
  );
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 表尾合并</h3>
      <div className="virt-table-controls">
        <button type="button" onClick={() => { tableRef.current?.scrollToTop(); setStatus('已滚动到顶部'); }}>滚动到顶部</button>
        <button type="button" onClick={() => { tableRef.current?.scrollToBottom(); setStatus('已滚动到底部'); }}>滚动到底部</button>
        <button
          type="button"
          onClick={() => {
            const index = Math.floor(Math.random() * rowCount);
            tableRef.current?.scrollToIndex(index);
            setStatus(`随机滚动到第 ${index + 1} 行`);
          }}
        >
          随机滚动
        </button>
        <button type="button" onClick={() => { tableRef.current?.scrollToIndex(499); setStatus('已滚动到第 500 行'); }}>滚动到第 500 行</button>
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
            footerData,
            footerMerges,
          }}
        />
      </div>
    </div>
  );
}
