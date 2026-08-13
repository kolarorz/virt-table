import React from 'react';
import { VirtTableReact, type ReactTableColumn, type VirtTableRef } from '@virt-table/react';
import { VtActions } from '@virt-table/vanilla/components';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  enabled: boolean;
  draft: boolean;
}

const makeList = (): Row[] =>
  Array.from({ length: 5000 }, (_, i) => ({
    id: i,
    name: `条目 ${i}`,
    enabled: i % 2 === 0,
    draft: i % 3 === 0,
  }));

export default function VtActionsTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [lastAction, setLastAction] = React.useState('（未操作）');
  const [rowCount, setRowCount] = React.useState(5000);
  // 行数据是命令式改的（组件直接写回行对象），所以放 ref 而不是 state
  const listRef = React.useRef<Row[]>([]);
  if (listRef.current.length === 0) listRef.current = makeList();

  // 列在建表时被捕获一次：放进 useMemo，回调里只碰 ref 与 setState
  const columns = React.useMemo<ReactTableColumn<Row>[]>(
    () => [
      { key: 'id', title: 'ID', width: 80, align: 'center' },
      { key: 'name', title: '名称', width: 200 },
      { key: 'state', title: '状态', width: 120, render: ({ row }) => (row.enabled ? '启用' : '停用') },
      VtActions<Row>({
        key: 'ops',
        title: '操作',
        width: 240,
        fixed: 'right',
        align: 'center',
        items: [
          // 只有草稿能编辑 —— disabled 写成函数，跟着行状态走
          {
            text: '编辑',
            disabled: (row) => !row.draft,
            onClick: (row) => setLastAction(`编辑 #${row.id}`),
          },
          // 文案随行变化；停用/启用是同一个按钮的两面
          {
            text: (row) => (row.enabled ? '停用' : '启用'),
            onClick: (row) => {
              row.enabled = !row.enabled;
              setLastAction(`${row.enabled ? '启用' : '停用'} #${row.id}`);
              tableRef.current?.forceUpdate();
            },
          },
          // 危险动作：语义色 + 二次确认
          {
            text: '删除',
            variant: 'danger',
            confirm: '删除后不可恢复，确定吗？',
            onClick: (row) => {
              listRef.current = listRef.current.filter((r) => r.id !== row.id);
              tableRef.current?.setList(listRef.current);
              setRowCount(listRef.current.length);
              setLastAction(`删除 #${row.id}`);
            },
          },
        ],
      }),
    ],
    [],
  );

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React VtActions 操作列</h3>
      <div className="status-text">
        VtActions：text / disabled / hidden 都可写成 (row) =&gt; …；「删除」带二次确认气泡。剩余{' '}
        {rowCount} 行 · 最近操作：{lastAction}
      </div>
      <div style={{ width: 800, height: 600 }} className="demo-container">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{
            list: listRef.current,
            itemKey: 'id',
            estimatedSize: 40,
            buffer: 4,
            border: true,
          }}
        />
      </div>
    </div>
  );
}
