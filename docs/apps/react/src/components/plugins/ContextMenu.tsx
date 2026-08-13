import React from 'react';
import {
  VirtTableReact,
  vtContextMenu,
  type ReactTableColumn,
  type VirtTableRef,
  type ContextMenuContext,
  type ContextMenuItem,
} from '@virt-table/react';
import { faker } from '@faker-js/faker';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  dept: string;
  score: number;
}

const depts = ['工程部', '设计部', '市场部', '财务部'];

const makeList = (): Row[] =>
  Array.from({ length: 500 }, (_, i) => ({
    id: i + 1,
    name: faker.person.fullName(),
    dept: depts[i % depts.length]!,
    score: faker.number.int({ min: 0, max: 100 }),
  }));

const columns: ReactTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: '姓名', width: 200 },
  { key: 'dept', title: '部门', width: 160 },
  { key: 'score', title: '分数', width: 120, align: 'right' },
];

export default function ContextMenuTable() {
  const tableRef = React.useRef<VirtTableRef>(null);
  const [status, setStatus] = React.useState('右键任一单元格试试');
  // 数据放 ref：菜单项回调里改完直接 setList，不必靠 state 驱动重渲染
  const listRef = React.useRef<Row[]>(makeList());

  /** 菜单项由所在单元格的上下文动态生成 */
  const contextMenuProvider = (ctx: ContextMenuContext<Row>): ContextMenuItem[] => [
    {
      label: `复制「${ctx.column.title}」的值`,
      action: () => {
        const value = String(ctx.row[ctx.column.key] ?? '');
        void navigator.clipboard?.writeText(value);
        setStatus(`已复制 ${ctx.column.title}=${value}（行 ${ctx.rowIndex + 1} / 列 ${ctx.colIndex + 1}）`);
      },
    },
    {
      label: `置顶第 ${ctx.rowIndex + 1} 行`,
      action: () => {
        listRef.current = [ctx.row, ...listRef.current.filter((r) => r.id !== ctx.row.id)];
        tableRef.current?.setList(listRef.current);
        setStatus(`已把 ${ctx.row.name} 置顶`);
      },
    },
    {
      divider: true,
      label: `删除 ${ctx.row.name}`,
      action: () => {
        listRef.current = listRef.current.filter((r) => r.id !== ctx.row.id);
        tableRef.current?.setList(listRef.current);
        setStatus(`已删除 ${ctx.row.name}，剩余 ${listRef.current.length} 行`);
      },
    },
    {
      // 禁用项：不可点击，点了也不会关闭菜单
      label: '仅高分行可用（分数 > 90）',
      disabled: ctx.row.score <= 90,
      action: () => setStatus(`${ctx.row.name} 分数 ${ctx.row.score}，触发了高分操作`),
    },
  ];

  // 插件在建表时装载一次；provider 内部只读 ref，不需要跟随重渲染
  const options = React.useMemo(
    () => ({
      list: listRef.current,
      itemKey: 'id',
      estimatedSize: 40,
      buffer: 6,
      border: true,
      highlightHoverRow: true,
      plugins: [vtContextMenu<Row>(contextMenuProvider)],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="demo-wrapper">
      <h3 className="demo-title">React 右键菜单（vtContextMenu 插件）</h3>
      <div className="demo-hint">
        在表格里<b>右键任意单元格</b>弹出菜单（无需先框选）。菜单项会拿到所在行/列的上下文。
      </div>
      <div className="virt-table-controls">
        {/* hideContextMenu 是插件注入的 API，由 ref 自动透传（封装里没有手写转发） */}
        <button
          type="button"
          className="virt-table-btn"
          onClick={() => {
            tableRef.current?.hideContextMenu();
            setStatus('已调用 hideContextMenu()（插件注入的方法）');
          }}
        >
          hideContextMenu()
        </button>
        <button
          type="button"
          className="virt-table-btn"
          onClick={() => {
            listRef.current = makeList();
            tableRef.current?.setList(listRef.current);
            setStatus('数据已重置');
          }}
        >
          重置数据
        </button>
      </div>
      <div className="status-text">{status}</div>
      <div style={{ width: 760, height: 420 }} className="demo-container">
        <VirtTableReact ref={tableRef} columns={columns} options={options} />
      </div>
    </div>
  );
}
