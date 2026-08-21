import { useEffect, useRef, useState } from 'react';
import { VirtTableReact, type VirtTableRef } from '@virt-table/react';
import { vtCellEditor } from '@virt-table/vanilla/plugins';
import { vtUndo, type HistoryChangeInfo } from '@virt-table-pro/undo';
import { makeColumns, makeRows } from '../../../pro-kit/shared/data';
import { onCellEdit } from '../../../pro-kit/shared/edit-hook';
import type { ProDemoProps } from './shell';
import { REDO_PATHS, UNDO_PATHS } from '../../../pro-kit/shared/icons';
import { Icon } from './Icon';

const EMPTY: HistoryChangeInfo = { canUndo: false, canRedo: false, labels: { undo: [], redo: [] } };

/**
 * 撤销 / 重做 demo（React 端）：`vtUndo` + 核心的 `vtCellEditor`。
 *
 * 装 `vtCellEditor` 不是「依赖」—— `vtUndo` 的自动层（列宽/排序/筛选）单独就能跑。
 * 装它是为了演示**手动层**：金额格可编辑之后，才有「核心不通知的数据变更」可撤销。
 */
export function UndoDemo({ setStatus }: ProDemoProps) {
  const tableRef = useRef<VirtTableRef>(null);
  const [{ rows, columns }] = useState(() => ({
    rows: makeRows(),
    columns: makeColumns({ editable: true }),
  }));
  const [history, setHistory] = useState<HistoryChangeInfo>(EMPTY);

  /**
   * 编辑写回后把撤销/重做交给 vtUndo（核心没有编辑事件，见 shared/edit-hook.ts）。
   *
   * **卸载必须取消订阅**：桥接是模块级单例只记一个监听者，不解绑就会留下指向已销毁表格的
   * 闭包（严格模式下 effect 还会跑两遍）。壳的 `resetGlobals()` 是兜底，这里是就近清理。
   */
  useEffect(() => {
    onCellEdit(({ row, key, before, after, label }) => {
      tableRef.current?.recordChange?.({
        label,
        undo: () => {
          row[key] = before;
          tableRef.current?.forceUpdate();
        },
        redo: () => {
          row[key] = after;
          tableRef.current?.forceUpdate();
        },
      });
    });
    return () => onCellEdit(null);
  }, []);

  const renderHistory = (info: HistoryChangeInfo): void => {
    setHistory(info);
    setStatus(`可撤销 ${info.labels.undo.length} 步 · 可重做 ${info.labels.redo.length} 步`);
  };

  useEffect(() => {
    // 桩档下 getHistory 不存在，喂一份空历史（按钮就都是禁用态）
    if (tableRef.current) renderHistory(tableRef.current.getHistory?.() ?? { canUndo: false, canRedo: false, labels: { undo: [], redo: [] } });
  }, []);

  const raisePrices = (): void => {
    // 只动前 50 行：撤销要恢复每一行的原值，存 2000 份快照没必要
    const targets = rows.slice(0, 50);
    const before = targets.map((r) => r.amount);
    tableRef.current?.recordTransaction?.('批量涨价 10% + 按金额排序', () => {
      for (const r of targets) r.amount = Math.round(r.amount * 1.1);
      tableRef.current?.recordChange?.({
        label: '涨价 50 行',
        undo: () => {
          targets.forEach((r, i) => (r.amount = before[i]));
          tableRef.current?.forceUpdate();
        },
        redo: () => {
          targets.forEach((r) => (r.amount = Math.round(r.amount * 1.1)));
          tableRef.current?.forceUpdate();
        },
      });
      tableRef.current?.sort('amount', 'desc');
    });
  };

  return (
    <>
      <div className="pg-toolbar">
        <button
          className="pg-btn"
          disabled={!history.canUndo}
          title={history.canUndo ? `撤销：${history.labels.undo[0]}` : '没有可撤销的操作'}
          onClick={() => tableRef.current?.undo?.()}
        >
          <Icon paths={UNDO_PATHS} />
          撤销
        </button>
        <button
          className="pg-btn"
          disabled={!history.canRedo}
          title={history.canRedo ? `重做：${history.labels.redo[0]}` : '没有可重做的操作'}
          onClick={() => tableRef.current?.redo?.()}
        >
          <Icon paths={REDO_PATHS} />
          重做
        </button>
        <button className="pg-btn" onClick={raisePrices}>
          批量涨价 10%
        </button>
        <button className="pg-btn" onClick={() => tableRef.current?.clearHistory?.()}>
          清空历史
        </button>
      </div>

      <div className="pg-table">
        <VirtTableReact
          ref={tableRef}
          columns={columns}
          options={{
            list: rows,
            itemKey: 'id',
            estimatedSize: 40,
            fixedSize: true,
            stripe: true,
            border: true,
            plugins: [vtUndo({ onChange: renderHistory }), vtCellEditor()],
          }}
        />
      </div>

      <div className="pg-aside">
        <div className="pg-aside-box">
          {history.labels.undo.length
            ? `历史（近 → 远）：${history.labels.undo.join(' ← ')}`
            : '历史：空'}
        </div>
      </div>
    </>
  );
}
