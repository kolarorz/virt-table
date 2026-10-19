import { useMemo, useRef, useState } from 'react';
import { VirtTableReact, type VirtTableRef } from '@virt-table/react';
import { vtCellSelection } from '@virt-table/vanilla/plugins';
import { vtStatusBar } from '@virt-table-pro/status-bar';
import '@virt-table-pro/status-bar/index.css';
import { makeColumns, makeRows, type Row } from '../../../pro-kit/shared/data';
import type { ProDemoProps } from './shell';

/**
 * 金额格式化。
 *
 * 用 `Intl.NumberFormat` 而不是 `¥${v.toLocaleString()}` —— 后者在负数上会拼出
 * `¥-87,355`，而中文的正确写法是 `-¥87,355`（符号在货币记号之前）。
 * 这个 demo 的数据每 9 行掺一个负数，所以「最小」那一项一定会踩到。
 */
const CNY = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 2,
});

/**
 * 状态栏 demo（React 端）：装 `vtStatusBar` + 核心的 `vtCellSelection`。
 *
 * 框选那件事必须**亲手拖**才有感觉，按钮留给拖不出来的：程序化设选区、选一片文字
 * （求和那几项整项消失，而不是显示 0）、筛掉一半（「总行数」不跟着变）。
 */
export function StatusBarDemo({ setStatus }: ProDemoProps) {
  const tableRef = useRef<VirtTableRef>(null);
  /** 拖选与按钮都会改它，旁注跟着它重算 */
  const [tick, setTick] = useState(0);
  const [visible, setVisible] = useState(true);

  const rows = useMemo(() => makeRows(), []);
  const columns = useMemo(() => makeColumns(), []);

  /*
   * ⚠️ options 必须 useMemo —— 每次渲染新建会让插件反复卸载重装，
   * 状态栏那条会跟着闪，选区订阅也会掉。
   */
  const options = useMemo(
    () => ({
      list: rows,
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      stripe: true,
      border: true,
      plugins: [
        vtCellSelection(),
        vtStatusBar<Row>({
          aggregates: ['count', 'sum', 'avg', 'min', 'max'],
          counts: ['total', 'filtered', 'checked', 'selectedRows'],
          /*
           * 选区只覆盖金额那一列时才加「¥」—— 跨列时不同列的单位不一样，
           * 一律加会把计数也标上货币符号。
           */
          format: (v, kind, { columnKeys }) =>
            columnKeys.length === 1 && columnKeys[0] === 'amount' && kind !== 'count'
              ? CNY.format(v)
              : v.toLocaleString('zh-CN', { maximumFractionDigits: 4 }),
          items: (s) => [
            {
              key: 'ratio',
              label: '选中占比',
              value:
                s.filtered && s.selectedRows
                  ? `${((s.selectedRows / s.filtered) * 100).toFixed(1)}%`
                  : '',
              side: 'left',
            },
          ],
        }),
      ],
    }),
    [rows],
  );

  /**
   * 列下标别写死 —— 列定义改了就会指错。
   *
   * React 端 ref 上的 `getLeafColumns()` 返回 `... | undefined`（表格还没挂载时），
   * 所以要再 `?.` 一次。找不到时给 0 而不是 -1：-1 传进 `setCellSelection` 会选出一片
   * 空范围，看起来像「按钮没反应」。
   */
  const colIndex = (key: string): number =>
    tableRef.current?.getLeafColumns()?.findIndex((c) => c.key === key) ?? 0;

  void tick;
  const summary = tableRef.current?.getStatusBarSummary?.();

  return (
    <>
      <div className="pg-toolbar">
        <button
          className="pg-btn"
          onClick={() => {
            const col = colIndex('amount');
            tableRef.current?.setCellSelection({ startRow: 0, startCol: col, endRow: 99, endCol: col });
            setTick((n) => n + 1);
            setStatus('程序化设置的选区与拖选走同一条路，条上照常更新');
          }}
        >
          选中金额列前 100 行
        </button>
        <button
          className="pg-btn"
          onClick={() => {
            const col = colIndex('name');
            tableRef.current?.setCellSelection({ startRow: 0, startCol: col, endRow: 49, endCol: col });
            setTick((n) => n + 1);
            setStatus('求和 / 平均 / 极值整项消失了 —— 不是显示 0。「求和 0」会被读成「加起来是零」');
          }}
        >
          选一片「名称」（文字）
        </button>
        <button
          className="pg-btn"
          onClick={() => {
            tableRef.current?.setCellSelection({
              startRow: 0,
              startCol: colIndex('name'),
              endRow: 19,
              endCol: colIndex('amount') + 1,
            });
            setTick((n) => n + 1);
            setStatus('跨列时只有能当数字的格进聚合，货币符号也不加了（列的单位不一样）');
          }}
        >
          跨列选
        </button>
        <button
          className="pg-btn"
          onClick={() => {
            tableRef.current?.setColumnFilter('status', ['已完成']);
            setTick((n) => n + 1);
            setStatus('「当前」跟着变，「总行数」不变 —— 后者读的是筛选前的源数据行数');
          }}
        >
          只看「已完成」
        </button>
        <button
          className="pg-btn"
          onClick={() => {
            tableRef.current?.setColumnFilter('status', []);
            tableRef.current?.clearCellSelection();
            setTick((n) => n + 1);
            setStatus('');
          }}
        >
          清筛选与选区
        </button>
        <label className="pg-switch">
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => {
              setVisible(e.target.checked);
              tableRef.current?.showStatusBar?.(e.target.checked);
            }}
          />
          显示状态栏
        </label>
      </div>

      {/* 拖选结束后刷旁注。状态栏自己走 cellSelection.subscribe（多消费者），
          这里再订一份也不会抢它 —— 不能去占 vtCellSelection({ onChange })，那是单槽位的 */}
      <div className="pg-table" onPointerUp={() => setTick((n) => n + 1)}>
        <VirtTableReact ref={tableRef} columns={columns} options={options} />
      </div>

      <div className="pg-aside">
        <div className="pg-aside-box">
          <p>
            <b>在金额列上按住拖一片</b> —— 底下那条会跟着变。任意一项<b>点一下即复制</b>
            （复制出去的是 <code>3500</code> 而不是 <code>3,500</code>：贴到别处还要继续算）。
          </p>
          <p>
            当前选区：
            {summary?.range
              ? `${summary.selectedRows} 行 × ${summary.columnKeys.length} 列（${summary.columnKeys.join(' / ')}）`
              : '无'}
          </p>
          <p>
            能当数字的格子 {summary?.selection.numericCount ?? 0} / {summary?.selection.count ?? 0}
            　去重取值 {summary?.selection.distinct ?? 0}
          </p>
        </div>
      </div>
    </>
  );
}
