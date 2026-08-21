/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  VirtTablePlugin,
  PluginContext,
  CellSelectionRange,
  CellSelectionService,
  SelectionRows,
} from '../plugin';
import { createAutoScroll } from '../internal/auto-scroll';
import { isPrimaryPointer } from '../internal/drag';
import './cell-selection.css';
import { isOutsidePointer } from '../internal/outside-cell';

export interface CellSelectionOptions {
  /**
   * 选区变化回调（拖选结束、程序化设置、清除时触发）。
   * 也可以写在表格 `options.onCellSelectionChange` 上——两处都给时本项优先。
   */
  onChange?: (range: CellSelectionRange | null) => void;
  /** 距容器边缘多少 px 开始自动滚动（默认 40） */
  edgeZone?: number;
  /** 自动滚动速度 px/帧（默认 8） */
  scrollSpeed?: number;
  /**
   * 点到**单元格以外**时清空选区，默认 `true`。与核心的 `clearActiveCellOnOutside` 同一套
   * 判断（`internal/outside-cell.ts`）：另一个单元格、编辑浮层、各类弹层、右键都不算「以外」。
   *
   * 关掉的理由通常是复制流程 —— 「选一片 → 去别处点两下 → 回来 Ctrl+C」。
   * 但那时也该把核心的 `clearActiveCellOnOutside` 一起关掉，两个状态的行为别分叉。
   */
  clearOnOutside?: boolean;
}

type Cell = { row: number; col: number };

/**
 * 单元格区域框选：鼠标拖选一片矩形区域，拖到容器边缘自动滚动。
 *
 * ```ts
 * new VirtTable(el, { columns, plugins: [vtCellSelection()] })
 * ```
 *
 * **它是 `vtClipboard` / `vtExport({ scope: 'selection' })` / `vtKeyboardNav` 的前置依赖**——
 * 通过 `provide('cellSelection')` 把选区能力交给它们；`vtContextMenu` 也会用它填
 * 菜单上下文的 `selection` 字段。
 *
 * 选区状态与 overlay 在本插件；**几何换算留在核心**（`getSelectionRect` /
 * `expandSelectionForMerges` / `cellFromPoint`），因为那些依赖列虚拟化的内部状态。
 *
 * 暴露 API：`getCellSelection()` / `setCellSelection(range)` / `clearCellSelection()`
 */
export function vtCellSelection<T extends Record<string, any> = any>(
  options: CellSelectionOptions = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtCellSelection',
    setup(ctx: PluginContext<T>) {
      let overlayEl: HTMLDivElement | null = document.createElement('div');
      overlayEl.className = 'vt-cell-selection-overlay';
      overlayEl.style.display = 'none';
      ctx.clientEl.appendChild(overlayEl);

      let selStart: Cell | null = null;
      let selEnd: Cell | null = null;
      let selecting = false;
      let lastMouseX = 0;
      let lastMouseY = 0;
      let onDocMove: ((e: PointerEvent) => void) | null = null;
      let onDocUp: ((e: PointerEvent) => void) | null = null;

      const autoScroll = createAutoScroll(ctx.clientEl, {
        zone: options.edgeZone,
        speed: options.scrollSpeed,
        // 纵向必须走 scrollByY：容器的 overflow-y 是 hidden，写 scrollTop 不会动
        scrollByY: (dy) => ctx.table.scrollByY(dy),
        // 滚动后鼠标虽未动，但底下的单元格换了 → 重算选区终点
        onTick: () => {
          if (!selecting) return;
          const c = ctx.table.cellFromPoint(lastMouseX, lastMouseY);
          if (c) {
            selEnd = c;
            refresh();
          }
        },
      });

      const getSelection = (): CellSelectionRange | null => {
        if (!selStart || !selEnd) return null;
        return ctx.table.expandSelectionForMerges({
          startRow: Math.min(selStart.row, selEnd.row),
          startCol: Math.min(selStart.col, selEnd.col),
          endRow: Math.max(selStart.row, selEnd.row),
          endCol: Math.max(selStart.col, selEnd.col),
        });
      };

      const hide = (): void => {
        if (overlayEl) overlayEl.style.display = 'none';
      };

      /** 重绘 overlay（几何由核心算，这里只摆位置） */
      const refresh = (): void => {
        if (!overlayEl) return;
        const sel = getSelection();
        if (!sel) {
          hide();
          return;
        }
        const rect = ctx.table.getSelectionRect(sel);
        if (!rect) {
          hide();
          return;
        }
        overlayEl.style.display = '';
        overlayEl.style.top = `${rect.top}px`;
        overlayEl.style.left = `${rect.left}px`;
        overlayEl.style.width = `${rect.width}px`;
        overlayEl.style.height = `${rect.height}px`;
      };

      const emitChange = (): void => {
        const range = getSelection();
        // 插件配置优先，其次回落到表格 option（回调留在 options 上，与 onColumnOrderChange 一致）
        (options.onChange ?? ctx.getOptions().onCellSelectionChange)?.(range);
      };

      const setSelection = (range: CellSelectionRange | null): void => {
        if (!range) {
          clearSelection();
          return;
        }
        selStart = { row: range.startRow, col: range.startCol };
        selEnd = { row: range.endRow, col: range.endCol };
        refresh();
        emitChange();
      };

      const clearSelection = (): void => {
        selStart = null;
        selEnd = null;
        hide();
        emitChange();
      };

      const buildSelectionRows = (): SelectionRows | null => {
        const sel = getSelection();
        if (!sel) return null;

        const columnIndexes = ctx.table
          .getSelectableColumnIndexes()
          .filter((idx) => idx >= sel.startCol && idx <= sel.endCol);
        if (columnIndexes.length === 0) return null;

        const list = ctx.getList();
        const columns = ctx.getColumns();
        const rows: string[][] = [];
        for (let r = sel.startRow; r <= sel.endRow; r++) {
          const row = list[r];
          if (!row) break;
          rows.push(
            columnIndexes.map((colIdx) => {
              const key = columns[colIdx]?.key;
              if (!key) return '';
              const value = row[key as keyof T];
              return value == null ? '' : String(value);
            }),
          );
        }
        return { selection: sel, columnIndexes, rows };
      };

      // ---------- 拖选 ----------

      /**
       * 拖选起手。走 pointerdown 而不是 mousedown，但**只对鼠标 / 手写笔生效**。
       *
       * 触屏刻意不启用：表体上的手指拖动语义是「滚动表格」，要把它变成框选就得给
       * tbody 设 `touch-action: none`，那会直接废掉表格滚动 —— 代价远大于收益。
       * 触屏要框选需要另设入口（长按启动 / 选区手柄 / 显式的选择模式），那是一次
       * 交互设计而不是事件迁移，见 AGENTS.md §7.7。
       */
      const onPointerDown = (e: PointerEvent): void => {
        if (!isPrimaryPointer(e) || e.pointerType === 'touch') return;
        ctx.rootEl.focus();
        const cell = ctx.table.cellFromPoint(e.clientX, e.clientY);
        if (!cell) return;
        e.preventDefault();

        selecting = true;
        selStart = cell;
        selEnd = cell;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        refresh();

        const { pointerId } = e;
        onDocMove = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return;
          lastMouseX = ev.clientX;
          lastMouseY = ev.clientY;
          const c = ctx.table.cellFromPoint(ev.clientX, ev.clientY);
          if (c) {
            selEnd = c;
            refresh();
          }
          autoScroll.update(ev.clientX, ev.clientY);
        };
        onDocUp = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return;
          selecting = false;
          autoScroll.stop();
          if (onDocMove) document.removeEventListener('pointermove', onDocMove);
          if (onDocUp) {
            document.removeEventListener('pointerup', onDocUp);
            // pointercancel 与 up 同处理：手势被系统接管时也要收尾，否则 selecting
            // 一直挂着、autoScroll 的 rAF 循环不停
            document.removeEventListener('pointercancel', onDocUp);
          }
          onDocMove = null;
          onDocUp = null;
          emitChange();
        };
        document.addEventListener('pointermove', onDocMove);
        document.addEventListener('pointerup', onDocUp);
        document.addEventListener('pointercancel', onDocUp);
      };

      ctx.rootEl.setAttribute('tabindex', '-1');
      ctx.tbodyEl.addEventListener('pointerdown', onPointerDown);

      /*
       * 点到单元格以外 → 清空选区。与核心那边（激活态）**同一个判断、同一个事件**，
       * 于是「描边消失了、选区还亮着」这种对不上的状态不存在。
       *
       * 挂 `document`：「别处」经常不在 `.vt-root` 里（付费甘特的时间轴 pane 与它是兄弟，
       * 工具栏按钮条在它外面）。没选区时 handler 首行就早退。
       */
      let onOutside: ((e: PointerEvent) => void) | null = null;
      if (options.clearOnOutside !== false) {
        onOutside = (e: PointerEvent): void => {
          if (!selStart || selecting) return;
          if (!isOutsidePointer(e, ctx.tbodyEl)) return;
          clearSelection();
        };
        document.addEventListener('pointerdown', onOutside);
      }

      // 滚动时重绘；正在拖选则先按鼠标位置重算终点（内容在鼠标下方移动了）
      ctx.on('onScroll', () => {
        if (!selStart || !selEnd) return;
        if (selecting) {
          const c = ctx.table.cellFromPoint(lastMouseX, lastMouseY);
          if (c) selEnd = c;
        }
        refresh();
      });

      // 一帧渲染完成（行 DOM 位置可能变了）→ 重绘
      ctx.on('onRendered', refresh);

      const service: CellSelectionService = {
        getSelection,
        setSelection,
        clearSelection,
        buildSelectionRows,
        refresh,
      };
      ctx.provide('cellSelection', service);

      return {
        api: {
          getCellSelection: () => getSelection(),
          setCellSelection: (range: CellSelectionRange | null) => setSelection(range),
          clearCellSelection: () => clearSelection(),
        },
        destroy: () => {
          autoScroll.stop();
          ctx.tbodyEl.removeEventListener('pointerdown', onPointerDown);
          if (onOutside) document.removeEventListener('pointerdown', onOutside);
          if (onDocMove) document.removeEventListener('pointermove', onDocMove);
          if (onDocUp) {
            document.removeEventListener('pointerup', onDocUp);
            document.removeEventListener('pointercancel', onDocUp);
          }
          overlayEl?.remove();
          overlayEl = null;
          selStart = null;
          selEnd = null;
        },
      };
    },
  };
}
