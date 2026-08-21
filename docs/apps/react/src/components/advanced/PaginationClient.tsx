import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef } from '@virt-table/react';
import { faker } from '@faker-js/faker';

/**
 * 客户端分页（默认模式）：把全量数据交给表格，翻页 / 切换每页条数 / 排序 / 筛选
 * 全部由表格自己处理，**不用写 onPageChange，也不用管 total**。
 *
 * 与服务端模式（`manualPagination: true`，见 feature/pagination）的差别就是那一个开关。
 */
const ROW_COUNT = 2000;
const DEPTS = ['工程部', '设计部', '市场部'];

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  dept: string;
  score: number;
}

const list: Row[] = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  dept: DEPTS[i % DEPTS.length]!,
  score: 40 + ((i * 17) % 60),
}));

const columns: ReactTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 90, align: 'center', sortable: true },
  { key: 'name', title: '姓名', width: 200 },
  {
    key: 'dept',
    title: '部门',
    width: 160,
    align: 'center',
    filters: DEPTS.map((d) => ({ label: d, value: d })),
  },
  { key: 'score', title: '分数', width: 120, align: 'right', sortable: true },
];

export default function PaginationClientTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [status, setStatus] = React.useState('');
  const savedRef = React.useRef<string | null>(null);

  const syncStatus = React.useCallback(() => {
    const p = tableRef.current?.getPagination();
    if (!p) return;
    setStatus(`第 ${p.page} 页 · 每页 ${p.pageSize} 条 · 共 ${p.total} 条（筛选后）`);
  }, []);

  React.useEffect(syncStatus, [syncStatus]);

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 分页（客户端）</h3>
      <div className="demo-hint">
        客户端分页（默认）：全量 {ROW_COUNT} 条一次性交给表格，翻页只换切片。total
        由筛选后的行数派生 —— 试试筛选部门，总数会跟着变，页码自动回到第 1 页。
        排序作用于全量数据而不是当前页。
      </div>
      <div className="virt-table-controls">
        <button
          type="button"
          onClick={() => {
            tableRef.current?.setPage(7);
            syncStatus();
          }}
        >
          跳到第 7 页
        </button>
        <button
          type="button"
          onClick={() => {
            tableRef.current?.setColumnFilter('dept', ['工程部']);
            syncStatus();
          }}
        >
          筛「工程部」
        </button>
        <button
          type="button"
          onClick={() => {
            tableRef.current?.clearAllFilters();
            syncStatus();
          }}
        >
          清空筛选
        </button>
        <button
          type="button"
          onClick={() => {
            savedRef.current = JSON.stringify(tableRef.current?.getState());
            setStatus('已存下当前列宽 / 列序 / 排序 / 筛选 / 分页');
          }}
        >
          存状态
        </button>
        <button
          type="button"
          onClick={() => {
            if (!savedRef.current) return;
            tableRef.current?.setState(JSON.parse(savedRef.current));
            syncStatus();
          }}
        >
          还原状态
        </button>
      </div>
      <div className="status-text">{status}</div>
      <div style={{ width: '100%', height: 520 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{
            list,
            itemKey: 'id',
            estimatedSize: 40,
            buffer: 6,
            border: true,
            stripe: true,
            // 传了 pagination 就有分页器；不开 manualPagination 即客户端分页
            pagination: { pageSize: 20, pageSizes: [20, 50, 100] },
          }}
        />
      </div>
    </div>
  );
}
