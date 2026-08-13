import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef } from '@virt-table/react';
import { faker } from '@faker-js/faker';

/**
 * 分页示例（**服务端模式**，靠 manualPagination 开启）：表格只渲染分页器 + 派发 onPageChange，
 * 不做任何数据切片。这里用本地 200 条数据模拟「服务端」，在 onPageChange
 * 回调里按页切片再 setList，并 setTotal 回填总数——真实项目里换成接口请求即可。
 */
interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  dept: string;
  qty: number;
  price: number;
}

const depts = ['工程部', '设计部', '市场部', '财务部'];

const columns: ReactTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80, sortable: true },
  { key: 'name', title: '姓名', width: 220 },
  { key: 'dept', title: '部门', width: 160 },
  { key: 'qty', title: '数量', width: 140, align: 'right' },
  { key: 'price', title: '单价', width: 140, align: 'right' },
];

// 模拟服务端数据源（真实场景中在后端）。懒生成：App 会静态 import 全部示例模块
const TOTAL = 200;
let _db: Row[] | null = null;
const getDb = (): Row[] =>
  (_db ??= Array.from({ length: TOTAL }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    dept: depts[i % depts.length]!,
    qty: faker.number.int({ min: 1, max: 20 }),
    price: faker.number.int({ min: 5, max: 500 }),
  })));

// 模拟「服务端」按页取数
const fetchPage = (page: number, pageSize: number): Row[] => {
  const start = (page - 1) * pageSize;
  return getDb().slice(start, start + pageSize);
};

const initialPageSize = 20;

export default function PaginationTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  // 首屏切片要稳定，否则每次渲染的新数组都会触发封装内部的 setList
  const initialList = React.useMemo(() => fetchPage(1, initialPageSize), []);

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 分页（服务端）</h3>
      <div className="demo-hint">
        服务端模式(manualPagination: true)：表格只渲染分页器并派发 onPageChange，不做数据切片。
        翻页/跳页/切换每页条数时，在回调里按页取数后 setList + setTotal。想让表格自己切片见「分页（客户端）」示例。
      </div>
      <div style={{ width: 820, height: 520 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{
            list: initialList,
            itemKey: 'id',
            estimatedSize: 40,
            buffer: 6,
            border: true,
            // 不开这个就是默认的客户端分页（表格自己切片），见 feature/pagination-client
            manualPagination: true,
            pagination: {
              total: TOTAL,
              page: 1,
              pageSize: initialPageSize,
              pageSizes: [10, 20, 50, 100],
            },
            onPageChange: (page, pageSize) => {
              // 真实项目：此处发起接口请求，拿到当前页数据与总数后回填
              tableRef.current?.setList(fetchPage(page, pageSize));
              tableRef.current?.setTotal(TOTAL);
            },
          }}
        />
      </div>
    </div>
  );
}
