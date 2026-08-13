import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef } from '@virt-table/react';
import { faker } from '@faker-js/faker';

const colCount = 10;
const rowCount = 200;

const columns: ReactTableColumn[] = Array.from({ length: colCount }, (_, i) => ({
  key: `col_${i}`,
  title: `Col ${i}`,
  width: 150,
}));

const list = Array.from({ length: rowCount }, (_, i) => {
  const row: Record<string, unknown> = { id: i };
  for (let c = 0; c < colCount; c++) {
    row[`col_${c}`] = `${i}-${c}-${faker.lorem.word()}`;
  }
  return row;
});

const headerData = [
  ['个人信息', '', '', '成绩', '', '', '备注', '', '', ''],
  ['姓名', '年龄', '性别', '语文', '数学', '英语', '评语1', '评语2', '评语3', '总评'],
];

const headerMerges = [
  { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 3 },
  { rowIndex: 0, colIndex: 3, rowspan: 1, colspan: 3 },
  { rowIndex: 0, colIndex: 6, rowspan: 1, colspan: 4 },
];

const footerData = [['', '', '', '合计', '', '', '', '', '', '总计']];
const footerMerges = [
  { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 3 },
  { rowIndex: 0, colIndex: 3, rowspan: 1, colspan: 6 },
];

export default function HeadFootMergeTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [status, setStatus] = React.useState(
    `表头 + 表尾合并：${rowCount} 行（分组表头 + 汇总表尾）`,
  );
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 表头 + 表尾合并</h3>
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
            headerData,
            headerMerges,
            footerData,
            footerMerges,
          }}
        />
      </div>
    </div>
  );
}
