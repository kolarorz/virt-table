import { VirtTable } from '@virt-table/vanilla';
import { vtCellEditor } from '@virt-table/vanilla/plugins';
import { vtUndo, type HistoryChangeInfo } from '@virt-table-pro/undo';
import { REDO_PATHS, UNDO_PATHS, setIconLabel } from '../../../pro-kit/shared/icons';
import { makeColumns, makeRows, type Row } from '../../../pro-kit/shared/data';
import { onCellEdit } from '../../../pro-kit/shared/edit-hook';
import type { DemoHost, DemoInstance, ProDemo } from './types';

/**
 * 撤销 / 重做 demo：`vtUndo` + 核心的 `vtCellEditor`。
 *
 * 这里装 `vtCellEditor` 不是「依赖」——`vtUndo` 不 `requires` 任何插件，自动层
 * （列宽/排序/筛选）单独就能跑。装它是为了演示**手动层**：金额格可编辑之后，
 * 才有「核心不通知的数据变更」可撤销。
 */
export const undoDemo: ProDemo = {
  id: 'undo',
  mount(host: DemoHost): DemoInstance {
    const rows = makeRows();

    const historyBox = document.createElement('div');
    historyBox.className = 'pg-aside-box';
    host.asideEl.appendChild(historyBox);

    /**
     * 按钮与 onChange 的先后：`vtUndo` 在 `onMounted`（构造函数末尾）就会调一次
     * `onChange`，所以 `undoBtn` / `redoBtn` 必须在 `new VirtTable` **之前**建好，
     * 否则 renderHistory 里碰到的是 TDZ。
     */
    /*
     * 图标走内联 SVG（`shared/icons.ts`），不用 `↶` / `↷` 那两个 Unicode 字符 ——
     * 它们在多数系统字体里是极细的发丝线、基线还偏上，与 13px 的中文按钮文字明显不是
     * 一套东西，跨平台笔形也不一致。
     */
    const undoBtn = host.button('', () => table.undo?.());
    setIconLabel(undoBtn, UNDO_PATHS, '撤销');
    const redoBtn = host.button('', () => table.redo?.());
    setIconLabel(redoBtn, REDO_PATHS, '重做');

    const renderHistory = (info: HistoryChangeInfo): void => {
      undoBtn.disabled = !info.canUndo;
      redoBtn.disabled = !info.canRedo;
      undoBtn.title = info.canUndo ? `撤销：${info.labels.undo[0]}` : '没有可撤销的操作';
      redoBtn.title = info.canRedo ? `重做：${info.labels.redo[0]}` : '没有可重做的操作';
      historyBox.textContent = info.labels.undo.length
        ? `历史（近 → 远）：${info.labels.undo.join(' ← ')}`
        : '历史：空';
      host.setStatus(`可撤销 ${info.labels.undo.length} 步 · 可重做 ${info.labels.redo.length} 步`);
    };

    const table = new VirtTable<Row>(host.tableEl, {
      list: rows,
      columns: makeColumns({ editable: true }),
      itemKey: 'id',
      estimatedSize: 40,
      fixedSize: true,
      stripe: true,
      border: true,
      plugins: [vtUndo({ onChange: renderHistory }), vtCellEditor()],
    });

    /**
     * 编辑写回后把撤销/重做交给 vtUndo（核心没有编辑事件，见 shared/edit-hook.ts）。
     * `forceUpdate()` 是必须的：改的是行对象，表格不会自己知道。
     */
    onCellEdit(({ row, key, before, after, label }) => {
      table.recordChange?.({
        label,
        undo: () => {
          row[key] = before;
          table.forceUpdate();
        },
        redo: () => {
          row[key] = after;
          table.forceUpdate();
        },
      });
    });

    host.button('批量涨价 10%', () => {
      // 只动前 50 行：撤销要恢复每一行的原值，存 2000 份快照没必要
      const targets = rows.slice(0, 50);
      const before = targets.map((r) => r.amount);
      table.recordTransaction?.('批量涨价 10% + 按金额排序', () => {
        for (const r of targets) r.amount = Math.round(r.amount * 1.1);
        table.recordChange?.({
          label: '涨价 50 行',
          undo: () => {
            targets.forEach((r, i) => (r.amount = before[i]));
            table.forceUpdate();
          },
          redo: () => {
            targets.forEach((r) => (r.amount = Math.round(r.amount * 1.1)));
            table.forceUpdate();
          },
        });
        table.sort('amount', 'desc');
      });
    });

    host.button('清空历史', () => table.clearHistory?.());

    renderHistory(table.getHistory?.());
    Object.assign(window, { table });

    return {
      destroy: () => {
        // 桥接是模块级单例，不解绑会留下指向已销毁表格的闭包
        onCellEdit(null);
        table.destroy();
      },
    };
  },
};
