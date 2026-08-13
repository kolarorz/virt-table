/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  VirtTablePlugin,
  PluginContext,
  CellSelectionService,
} from '../plugin';
import type { CellEditorService } from './cell-editor';

const NAV_KEYS = [
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Tab', 'Enter', 'F2', 'Home', 'End', 'PageUp', 'PageDown',
];

/**
 * 键盘单元格导航。目标不在视口时自动滚动到位。
 *
 * | 键 | 行为 |
 * | --- | --- |
 * | 方向键 | 上下左右移动一格 |
 * | `Tab` / `Shift+Tab` | 横向移动一格 |
 * | `Enter` | 下移一行 |
 * | `Home` / `End` | 行首 / 行尾 |
 * | `Ctrl`(或 `Cmd`)`+Home` / `+End` | 表首 / 表尾（第一个 / 最后一个单元格） |
 * | `PageUp` / `PageDown` | 上翻 / 下翻一屏 |
 * | `Shift` + 上面任意导航键（除 Tab/Enter） | 保持锚点扩展选区 |
 * | `F2` | 进入编辑（需装 `vtCellEditor`） |
 *
 * ```ts
 * plugins: [vtCellSelection(), vtKeyboardNav()]   // 顺序无关，运行时自动拓扑排序
 * ```
 *
 * **依赖 `vtCellSelection`**：焦点位置就是选区（单格选区 = 焦点），焦点框就是选区
 * overlay，所以它不自己维护状态，全部走 `inject('cellSelection')`。
 * 可选依赖 `vtCellEditor`：装载了才响应 F2；没装则 F2 无效果。
 */
export function vtKeyboardNav<T extends Record<string, any> = any>(): VirtTablePlugin<T> {
  return {
    name: 'vtKeyboardNav',
    requires: ['vtCellSelection'],
    setup(ctx: PluginContext<T>) {
      const selection = ctx.inject<CellSelectionService>('cellSelection')!;
      // 可选依赖：没装 vtCellEditor 时 F2 静默无效
      const editor = ctx.inject<CellEditorService>('cellEditor');

      /**
       * 翻一屏 = 视口里放得下多少行。
       *
       * 用 `clientHeight / estimatedSize` 估，不去读核心的渲染区间：`_inViewRowBegin`
       * 那对字段只在装了合并单元格时才维护（走 `_mergeRenderControl`），拿来当通用
       * 数据源不可靠。动态行高下这个值是近似的 —— 翻页步长差一两行无所谓，
       * 反正 `scrollToCell` 会把目标行滚进视口。
       */
      const pageStep = (): number => {
        const rowH = ctx.getOptions().estimatedSize || 40;
        return Math.max(1, Math.floor(ctx.clientEl.clientHeight / rowH));
      };

      const onKeyDown = (e: KeyboardEvent): void => {
        // 编辑态：方向键归编辑器（否则会一边改值一边移动焦点）
        if (editor?.isEditing()) return;
        if (!NAV_KEYS.includes(e.key)) return;

        const selectable = ctx.table.getSelectableColumnIndexes();
        const rowCount = ctx.getList().length;
        if (selectable.length === 0 || rowCount === 0) return;

        const sel = selection.getSelection();
        // 焦点取选区的「活动角」：无选区时落到左上第一个可选单元格
        const cur = sel
          ? { row: sel.endRow, col: sel.endCol }
          : { row: 0, col: selectable[0]! };

        if (e.key === 'F2') {
          e.preventDefault();
          editor?.openAt(cur.row, cur.col);
          return;
        }

        let colPos = selectable.indexOf(cur.col);
        if (colPos < 0) colPos = 0;
        let row = cur.row;
        // Mac 上多数键盘没有独立的 Home/End（Fn+方向键合成），Cmd 组合同样要认
        const jumpToEdge = e.ctrlKey || e.metaKey;

        switch (e.key) {
          case 'ArrowUp': row = Math.max(0, row - 1); break;
          case 'ArrowDown': case 'Enter': row = Math.min(rowCount - 1, row + 1); break;
          case 'ArrowLeft': colPos = Math.max(0, colPos - 1); break;
          case 'ArrowRight': colPos = Math.min(selectable.length - 1, colPos + 1); break;
          case 'Tab': colPos = e.shiftKey ? Math.max(0, colPos - 1) : Math.min(selectable.length - 1, colPos + 1); break;
          // Home/End 默认是行首尾；加 Ctrl/Cmd 变成表首尾（与 Excel、AG Grid 一致）
          case 'Home': colPos = 0; if (jumpToEdge) row = 0; break;
          case 'End': colPos = selectable.length - 1; if (jumpToEdge) row = rowCount - 1; break;
          case 'PageUp': row = Math.max(0, row - pageStep()); break;
          case 'PageDown': row = Math.min(rowCount - 1, row + pageStep()); break;
        }
        e.preventDefault();

        const nextCol = selectable[colPos]!;
        const extend = e.shiftKey && e.key !== 'Tab' && e.key !== 'Enter';

        if (extend && sel) {
          // 保持锚点不动，只挪活动角
          selection.setSelection({
            startRow: sel.startRow,
            startCol: sel.startCol,
            endRow: row,
            endCol: nextCol,
          });
        } else {
          selection.setSelection({ startRow: row, startCol: nextCol, endRow: row, endCol: nextCol });
        }

        ctx.table.scrollToCell(row, nextCol);
        // 滚动后目标行可能刚渲染出来，下一帧再摆一次焦点框
        requestAnimationFrame(() => selection.refresh());
      };

      // 未装载框选时也要能接键盘：点单元格设焦点（框选自带 mousedown，这里不重复绑）
      ctx.rootEl.setAttribute('tabindex', '-1');
      ctx.rootEl.addEventListener('keydown', onKeyDown);

      return {
        destroy: () => {
          ctx.rootEl.removeEventListener('keydown', onKeyDown);
        },
      };
    },
  };
}
