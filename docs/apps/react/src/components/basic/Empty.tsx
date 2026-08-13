import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef } from '@virt-table/react';
import { faker } from '@faker-js/faker';

const COL_COUNT = 8;
const FULL_ROW_COUNT = 1000;

const columns: ReactTableColumn[] = Array.from({ length: COL_COUNT }, (_, i) => ({
  key: `extra_${i}`,
  title: `列 ${i}`,
  width: 150,
}));

const fullList = Array.from({ length: FULL_ROW_COUNT }, (_, i) => {
  const row: Record<string, unknown> = { id: i };
  for (let c = 0; c < COL_COUNT; c++) {
    row[`extra_${c}`] = `${i}-${c}-${faker.lorem.word()}`;
  }
  return row;
});

const emptyList: Record<string, unknown>[] = [];

export default function EmptyTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [isEmpty, setIsEmpty] = React.useState(true);
  const [status, setStatus] = React.useState('空数据（空文本：暂无数据）');
  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 空数据</h3>
      <div className="virt-table-controls">
        <button
          type="button"
          onClick={() => {
            if (isEmpty) {
              tableRef.current?.setList(fullList);
              setIsEmpty(false);
              setStatus(`已加载 ${FULL_ROW_COUNT} 行`);
            } else {
              tableRef.current?.setList(emptyList);
              setIsEmpty(true);
              setStatus('已清空，显示暂无数据');
            }
          }}
        >
          切换有数据/空
        </button>
      </div>
      <div className="status-text">{status}</div>
      <div style={{ width: 800, height: 600 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{
            list: emptyList,
            itemKey: 'id',
            estimatedSize: 40,
            buffer: 4,
            border: true,
            emptyText: '暂无数据',
          }}
        />
      </div>
    </div>
  );
}
