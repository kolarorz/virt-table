import React from 'react';
import {
  VirtTableReact,
  type ReactTableColumn,
  type VirtTableRef,
  type DataRequest,
  type DataResponse,
  type RemoteState,
} from '@virt-table/react';
import { faker } from '@faker-js/faker';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  dept: string;
  qty: number;
}

const depts = ['工程部', '设计部', '市场部', '财务部'];
const TOTAL = 3000;
// 模拟服务端数据（真实场景在后端）。懒生成：playground 会 import 全部示例模块，
// 顶层就造几千条 faker 数据会拖慢整个 demo 站的首屏。
let _db: Row[] | null = null;
const getDb = (): Row[] => (_db ??= Array.from({ length: TOTAL }, (_, i) => ({
  id: i + 1,
  name: faker.person.fullName(),
  dept: depts[i % depts.length]!,
  qty: faker.number.int({ min: 1, max: 20 }),
})));

const columns: ReactTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名', width: 240 },
  { key: 'dept', title: '部门', width: 160 },
  { key: 'qty', title: '数量', width: 140, align: 'right' },
];

export default function InfiniteTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [manual, setManual] = React.useState(false);
  const [failNext, setFailNext] = React.useState(false);
  const [status, setStatus] = React.useState('等待首屏取数…');
  const [logs, setLogs] = React.useState<string[]>([]);
  const seqRef = React.useRef(0);
  // 故障开关要被 loadData 读到最新值；loadData 本身不需要稳定化（封装内部走 ref 转发）
  const failRef = React.useRef(failNext);
  failRef.current = failNext;

  const log = (msg: string): void => setLogs((prev) => [msg, ...prev].slice(0, 8));

  const loadData = (req: DataRequest): Promise<DataResponse<Row>> => {
    const seq = ++seqRef.current;
    log(`#${seq} ${req.reason} offset=${req.offset} pageSize=${req.pageSize}`);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (failRef.current) {
          setFailNext(false);
          log(`#${seq} ✗ 失败（可点状态条重试）`);
          reject(new Error('mock network error'));
          return;
        }
        const rows = getDb().slice(req.offset, req.offset + req.pageSize);
        log(`#${seq} ✓ 返回 ${rows.length} 条`);
        resolve({ rows, total: TOTAL });
      }, 400);
    });
  };

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 无限滚动</h3>
      <div className="virt-table-controls">
        <label>
          <input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} />
          手动模式（只显示「加载更多」按钮）
        </label>
        <label>
          <input type="checkbox" checked={failNext} onChange={(e) => setFailNext(e.target.checked)} />
          注入故障（下一次请求失败）
        </label>
        <button type="button" onClick={() => tableRef.current?.reload()}>reload()</button>
        <button type="button" onClick={() => tableRef.current?.refresh()}>refresh()</button>
        <button type="button" onClick={() => tableRef.current?.loadMore()}>loadMore()</button>
      </div>
      <div className="status-text">{status}</div>
      <div style={{ width: 820, height: 460 }} className="demo-container">
        {/* key 让「手动模式」切换后重建表格（infinite 配置在构造时生效） */}
        <VirtTableReact
          key={manual ? 'manual' : 'auto'}
          ref={tableRef}
          columns={columns}
          options={{
            list: [],
            itemKey: 'id',
            estimatedSize: 40,
            fixedSize: true,
            buffer: 6,
            border: true,
            infinite: { pageSize: 50, distance: 200, manual },
            loadData,
            onRemoteStateChange: (st: RemoteState) =>
              setStatus(
                `已加载 ${st.loadedCount}/${st.total} 条 · 第 ${st.page} 批` +
                  (st.hasMore ? '' : ' · 已到底') +
                  (st.loadingMore ? ' · 追加中' : ''),
              ),
            onLoadError: (err: unknown) => log(`onLoadError: ${(err as Error).message}`),
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
