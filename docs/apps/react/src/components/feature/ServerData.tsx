import React from 'react';
import {
  VirtTableReact,
  type ReactTableColumn,
  type VirtTableRef,
  type DataRequest,
  type DataResponse,
  type RemoteState,
  vtColumnFilter,
} from '@virt-table/react';
import { faker } from '@faker-js/faker';

/**
 * 服务端数据示例：`dataMode: 'server'` + `pagination` + `loadData`。
 *
 * 表头点排序、列头筛选、翻页/切换每页条数**全部交给服务端**：表格不再本地
 * 排序/筛选/切片，只把状态收进一次请求（`req.sort` / `req.filters` / `req.page`），
 * 并处理竞态（连点筛选只采用最后一次响应）。
 *
 * 这里用 400 条本地数据模拟服务端查询；下方日志显示每次实际下发的请求参数。
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
  { key: 'name', title: '姓名', width: 200, filterType: 'text' },
  {
    key: 'dept',
    title: '部门',
    width: 160,
    filters: depts.map((d) => ({ label: d, value: d })),
    filterMultiple: true,
  },
  { key: 'qty', title: '数量', width: 130, align: 'right', sortable: true },
  { key: 'price', title: '单价', width: 130, align: 'right', sortable: true },
];

// 模拟服务端数据（真实场景中在后端）。懒生成：App 会静态 import 全部示例模块
const TOTAL = 400;
let _db: Row[] | null = null;
const getDb = (): Row[] =>
  (_db ??= Array.from({ length: TOTAL }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    dept: depts[i % depts.length]!,
    qty: faker.number.int({ min: 1, max: 20 }),
    price: faker.number.int({ min: 5, max: 500 }),
  })));

const initialPageSize = 20;

export default function ServerDataTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [stat, setStat] = React.useState('');
  const [logs, setLogs] = React.useState<string[]>([]);
  const seqRef = React.useRef(0);

  const log = (msg: string): void => setLogs((prev) => [msg, ...prev].slice(0, 8));

  /** 模拟服务端查询：筛选 → 排序 → 分页切片 */
  const loadData = (req: DataRequest): Promise<DataResponse<Row>> => {
    const seq = ++seqRef.current;
    const sortDesc = req.sort.map((s) => `${s.colKey} ${s.order}`).join(', ') || '-';
    const filterDesc = Object.keys(req.filters).length ? JSON.stringify(req.filters) : '-';
    log(
      `#${seq} ${req.reason} page=${req.page} size=${req.pageSize} sort=[${sortDesc}] filters=${filterDesc}`,
    );

    return new Promise((resolve) => {
      setTimeout(() => {
        let rows = getDb();

        // 筛选（服务端语义：部门多选取并集，姓名关键字模糊匹配）
        for (const [key, values] of Object.entries(req.filters)) {
          if (!values.length) continue;
          if (key === 'name') {
            const kw = String(values[0]).toLowerCase();
            rows = rows.filter((r) => r.name.toLowerCase().includes(kw));
          } else {
            rows = rows.filter((r) => values.includes(r[key] as never));
          }
        }

        // 排序（多列：按 sort 数组顺序依次比较）
        if (req.sort.length) {
          rows = rows.slice().sort((a, b) => {
            for (const { colKey, order } of req.sort) {
              const av = a[colKey];
              const bv = b[colKey];
              if (av === bv) continue;
              const r =
                typeof av === 'number' && typeof bv === 'number'
                  ? av - bv
                  : String(av) < String(bv)
                    ? -1
                    : 1;
              return order === 'desc' ? -r : r;
            }
            return 0;
          });
        }

        const total = rows.length;
        const page = rows.slice(req.offset, req.offset + req.pageSize);
        log(`#${seq} ✓ 返回 ${page.length} 条 / 命中 ${total} 条`);
        resolve({ rows: page, total });
      }, 350);
    });
  };

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 服务端数据</h3>
      <div className="demo-hint">
        服务端模式：排序、筛选、翻页都通过一次请求完成(表格不做本地排序/筛选/切片)。
        切排序或筛选会自动回到第 1 页重新取数。
      </div>
      <div className="virt-table-controls">
        <button type="button" onClick={() => tableRef.current?.refresh()}>
          refresh()（保留滚动位置重拉）
        </button>
        <button type="button" onClick={() => tableRef.current?.reload()}>
          reload()（回到第 1 页）
        </button>
        <span className="demo-note">{stat}</span>
      </div>
      <div style={{ width: 800, height: 460 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{
            plugins: [vtColumnFilter()],
            list: [],
            itemKey: 'id',
            estimatedSize: 40,
            buffer: 6,
            border: true,
            // 排序 / 筛选 / 分页全部交给服务端（等价于 manualSorting + manualFiltering + manualPagination）
            dataMode: 'server',
            sortMode: 'multiple',
            pagination: {
              total: 0,
              pageSize: initialPageSize,
              pageSizes: [10, 20, 50],
            },
            loadData,
            onRemoteStateChange: (st: RemoteState) =>
              setStat(`第 ${st.page} 页 · 共 ${st.total} 条${st.loading ? ' · 请求中' : ''}`),
          }}
        />
      </div>
      <div
        className="status-text"
        style={{ marginTop: 12, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, Menlo, monospace' }}
      >
        {logs.slice(0, 6).join('\n')}
      </div>
    </div>
  );
}
