import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef } from '@virt-table/react';
import { faker } from '@faker-js/faker';

/**
 * 树形子节点懒加载：`loadChildren` + `hasChildren`。
 *
 * 首屏只给根节点；首次展开某节点时才去取它的子节点，取数期间该节点箭头变 spinner。
 * 同一节点在途只请求一次；返回空数组记为「确实没有子节点」，箭头变叶子且不再请求。
 * 失败会回到折叠态，再点一次即重试。
 */
interface Row extends Record<string, unknown> {
  id: string;
  name: string;
  role: string;
  count: number;
  /** 服务端告知「可能有子节点」，决定未加载时是否显示展开箭头 */
  hasChildren?: boolean;
  children?: Row[];
}

const columns: ReactTableColumn<Row>[] = [
  { key: 'name', title: '名称', width: 320, type: 'tree' },
  { key: 'role', title: '类型', width: 160 },
  { key: 'count', title: '数量', width: 120, align: 'right' },
];

// 模拟服务端：按父节点 id 造子节点（3 层，第 3 层为叶子）
const makeChildren = (parent: Row, level: number): Row[] => {
  const count = level >= 3 ? 0 : 3 + ((parent.name.length + level) % 3);
  return Array.from({ length: count }, (_, i) => ({
    id: `${parent.id}-${i + 1}`,
    name: level === 1 ? `${parent.name} / 小组 ${i + 1}` : faker.person.fullName(),
    role: level === 1 ? '小组' : '成员',
    count: faker.number.int({ min: 1, max: 99 }),
    // 第 3 层不再有子节点
    hasChildren: level < 2,
  }));
};

const makeRootRows = (): Row[] =>
  ['工程部', '设计部', '市场部', '财务部'].map((d, i) => ({
    id: `d${i + 1}`,
    name: d,
    role: '部门',
    count: faker.number.int({ min: 10, max: 99 }),
    hasChildren: true,
  }));

export default function LazyTreeTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [failNext, setFailNext] = React.useState(false);
  const [stat, setStat] = React.useState('');
  const [logs, setLogs] = React.useState<string[]>([]);
  const seqRef = React.useRef(0);
  const loadedRef = React.useRef(0);
  const rootRows = React.useMemo(makeRootRows, []);
  // 故障开关要被 loadChildren 读到最新值（封装内部走 ref 转发，回调无需稳定化）
  const failRef = React.useRef(failNext);
  failRef.current = failNext;

  const log = (msg: string): void => setLogs((prev) => [msg, ...prev].slice(0, 8));

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 树形懒加载</h3>
      <div className="demo-hint">
        首屏只加载 4 个根节点。点箭头展开时才去取子节点(箭头位置显示 spinner)，同一节点在途只请求一次；
        返回空数组的节点会变成叶子。
      </div>
      <div className="virt-table-controls">
        <label>
          <input
            type="checkbox"
            checked={failNext}
            onChange={(e) => setFailNext(e.target.checked)}
          />{' '}
          注入故障（下一次展开失败）
        </label>
        <button
          type="button"
          onClick={() => {
            tableRef.current?.resetLazyNode('d1');
            log('resetLazyNode(d1)：已清缓存与 children');
          }}
        >
          重置「工程部」缓存（下次展开重新取数）
        </button>
        <span className="demo-note">{stat}</span>
      </div>
      <div style={{ width: 760, height: 460 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{
            list: rootRows,
            itemKey: 'id',
            estimatedSize: 40,
            buffer: 6,
            border: true,
            // 未加载时靠 hasChildren 判断要不要给箭头（默认就是读 row.hasChildren，这里显式写出）
            hasChildren: (row) => !!(row as Row).hasChildren,
            loadChildren: (row, ctx) => {
              const seq = ++seqRef.current;
              const r = row as Row;
              log(`#${seq} loadChildren(${r.name}) level=${ctx.level}`);
              return new Promise<Row[]>((resolve, reject) => {
                setTimeout(() => {
                  if (failRef.current) {
                    setFailNext(false);
                    log(`#${seq} ✗ 失败（再点一次即重试）`);
                    reject(new Error('mock network error'));
                    return;
                  }
                  const kids = makeChildren(r, ctx.level);
                  log(`#${seq} ✓ 返回 ${kids.length} 个子节点`);
                  resolve(kids);
                }, 500);
              });
            },
            onChildrenLoaded: (row, children) => {
              loadedRef.current += 1;
              setStat(
                `已展开取数 ${loadedRef.current} 个节点 · 最近：${(row as Row).name}（${children.length} 个子节点）`,
              );
            },
            onChildrenLoadError: (row, err) =>
              setStat(`「${(row as Row).name}」取子节点失败：${(err as Error).message}`),
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
