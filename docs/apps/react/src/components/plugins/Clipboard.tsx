import React from 'react';
import {
  VirtTableReact,
  type ReactTableColumn,
  type VirtTableRef,
  vtClipboard,
  vtCellSelection,
} from '@virt-table/react';
import { faker } from '@faker-js/faker';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  dept: string;
  city: string;
  score: number;
}

const depts = ['工程部', '设计部', '市场部', '财务部'];

const makeList = (): Row[] =>
  Array.from({ length: 200 }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    dept: depts[i % depts.length]!,
    city: faker.location.city(),
    score: faker.number.int({ min: 0, max: 100 }),
  }));

/** 结构化 payload：演示自定义 MIME 往返（表内复制粘贴可保留原始类型） */
interface DemoPayload {
  kind: 'vt-demo';
  rowCount: number;
  colCount: number;
  cells: unknown[][];
}

const columns: ReactTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 70 },
  { key: 'name', title: '姓名', width: 170 },
  { key: 'dept', title: '部门', width: 130 },
  { key: 'city', title: '城市', width: 150 },
  { key: 'score', title: '分数', width: 100, align: 'right' },
];

export default function ClipboardTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [status, setStatus] = React.useState('等待复制/粘贴…');
  /** 开启后复制会额外写入自定义 MIME 的结构化数据，粘贴时优先用它 */
  const [usePayload, setUsePayload] = React.useState(false);
  const list = React.useMemo(makeList, []);
  // 插件在建表时装载一次，回调里要读到最新开关值
  const payloadRef = React.useRef(usePayload);
  payloadRef.current = usePayload;

  // 插件实例只能建一次：放进 useMemo，否则每次渲染都会新建插件对象
  const plugins = React.useMemo(
    () => [
      vtCellSelection(),
      vtClipboard<Row>({
        mimeType: 'application/x-vt-demo+json',

        onCopy: (ctx) => {
          const size = `${ctx.rows.length} 行 × ${ctx.columnIndexes.length} 列`;
          if (!payloadRef.current) {
            setStatus(`已复制 ${size}（默认 TSV）`);
            return; // 返回 undefined → 用插件默认的 TSV
          }
          const payload: DemoPayload = {
            kind: 'vt-demo',
            rowCount: ctx.rows.length,
            colCount: ctx.columnIndexes.length,
            cells: ctx.rows.map((line) => [...line]),
          };
          setStatus(`已复制 ${size}（TSV + 结构化 payload）`);
          return { text: ctx.rows.map((l) => l.join('\t')).join('\n'), payload };
        },

        onPaste: (ctx) => {
          const payload = ctx.payload as DemoPayload | null;
          if (!payload || payload.kind !== 'vt-demo') {
            // 没有自定义 payload（例如从 Excel 粘来）→ 交回插件走默认 TSV 写回
            setStatus(`粘贴 ${ctx.rows.length} 行（默认 TSV 解析）`);
            return false;
          }
          setStatus(
            `粘贴 ${payload.rowCount} 行 × ${payload.colCount} 列（走结构化 payload）`,
          );
          return false; // 本示例仍交回默认写回，只是演示 payload 已拿到
        },
      }),
    ],
    [],
  );

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 剪贴板</h3>
      <div className="demo-hint">
        拖选一片单元格 → <b>Ctrl/Cmd+C</b> 复制（TSV，可粘到 Excel）；选中目标左上角单元格 →{' '}
        <b>Ctrl/Cmd+V</b> 粘贴。粘贴行数超出数据时会自动补空行。
      </div>
      <div className="virt-table-controls">
        <label>
          <input
            type="checkbox"
            checked={usePayload}
            onChange={(e) => {
              setUsePayload(e.target.checked);
              setStatus(e.target.checked ? '复制将携带结构化 payload' : '复制只写 TSV');
            }}
          />
          携带结构化 payload（自定义 MIME，保留原始类型）
        </label>
        <button
          type="button"
          className="virt-table-btn"
          onClick={() => {
            tableRef.current?.setList(makeList());
            tableRef.current?.clearCellSelection();
            setStatus('数据已重置');
          }}
        >
          重置数据
        </button>
      </div>
      <div className="status-text">{status}</div>
      <div style={{ width: 760, height: 420 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{ list, itemKey: 'id', estimatedSize: 40, buffer: 6, border: true, plugins }}
        />
      </div>
    </div>
  );
}
