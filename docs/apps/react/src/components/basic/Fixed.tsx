import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef } from '@virt-table/react';
import { faker } from '@faker-js/faker';
import { merges as MERGES } from '../../../../vanilla/src/components/merges-data';

const COL_COUNT = 30;
const ROW_COUNT = 1000;

const columns: ReactTableColumn[] = Array.from({ length: COL_COUNT }, (_, i) => {
  const col: ReactTableColumn = { key: `extra_${i}`, title: `列 ${i}`, width: 200 };
  if (i < 1) col.fixed = 'left';
  if (i >= COL_COUNT - 1) col.fixed = 'right';
  return col;
});

const list = Array.from({ length: ROW_COUNT }, (_, i) => {
  const row: Record<string, unknown> = { id: i };
  for (let c = 0; c < COL_COUNT; c++) {
    row[`extra_${c}`] = `${i}-${c}-${faker.lorem.words(6)}`;
  }
  return row;
});

export default function FixedTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [mergeOn, setMergeOn] = React.useState(true);
  const [status, setStatus] = React.useState(
    `${ROW_COUNT} 行 × ${COL_COUNT} 列。左 1 列、右 1 列固定；合并已启用。`,
  );
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 冻结列与合并</h3>
      <div className="virt-table-controls">
        <button type="button" onClick={() => { tableRef.current?.scrollToTop(); setStatus('已滚动到顶部'); }}>滚动到顶部</button>
        <button type="button" onClick={() => { tableRef.current?.scrollToBottom(); setStatus('已滚动到底部'); }}>滚动到底部</button>
        <button
          type="button"
          onClick={() => {
            const idx = Math.floor(Math.random() * ROW_COUNT);
            tableRef.current?.scrollToIndex(idx);
            setStatus(`随机滚动到第 ${idx + 1} 行`);
          }}
        >
          随机滚动
        </button>
        <button type="button" onClick={() => { tableRef.current?.scrollToIndex(499); setStatus('已滚动到第 500 行'); }}>滚动到第 500 行</button>
        <button
          type="button"
          onClick={() => {
            const next = !mergeOn;
            setMergeOn(next);
            tableRef.current?.setMerges(next ? MERGES : []);
            setStatus(next ? '合并单元格已启用' : '合并单元格已关闭');
          }}
        >
          切换合并单元格
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
            merges: MERGES,
          }}
        />
      </div>
    </div>
  );
}
