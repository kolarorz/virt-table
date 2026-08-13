/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VirtTablePlugin, PluginContext } from '../plugin';
import type { VirtTableColumn } from '../index';
import { startDrag, swallowNextClick, isPrimaryPointer } from '../internal/drag';
import { createAutoScroll } from '../internal/auto-scroll';

/**
 * 拖拽排序：列拖拽（`vtColumnDrag`）与行拖拽（`vtRowDrag`）。
 *
 * 两者都只负责**手势、跟随光标的 ghost、落点指示线**；真正的重排交给核心的
 * `moveColumn()` / `moveRow()`（它们依赖列树与 `_originList` 原始顺序）。
 *
 * 样式在 `drag-sort.css`。注：`.vt-drag-handle`（`type:'drag'` 列里的手柄图标）
 * 由核心渲染、样式也在核心——它是列内容，不是拖拽交互的一部分。
 */
import './drag-sort.css';

/**
 * 拖拽时跟随光标的标签。
 *
 * ⚠️ 必须挂在 `.vt-root` 里，**不能挂 body**：ghost 的样式全走 `--vt-*` 变量，
 * 而这些变量只声明在 `.vt-root` / `.vt-fb` 上，body 的子节点继承不到 —— 那几条
 * 声明会整条失效，ghost 变成「透明底 + 16px 黑字」（实测过）。
 * `position: fixed` 挂在 root 里依然按视口定位，也不会被 root 的 `overflow: hidden`
 * 裁掉（没有 transform 之类的祖先建立定位上下文），所以拖到表格外面照样可见。
 */
function createGhost(parent: HTMLElement, className: string, label: string): HTMLElement {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = label;
  parent.appendChild(el);
  return el;
}

// ============================================================================
// 列拖拽
// ============================================================================

export interface ColumnDragOptions {
  /** 从表头发起拖拽时要忽略的元素选择器（默认排除列宽手柄、筛选/排序图标、输入框） */
  ignoreSelector?: string;
}

const DEFAULT_IGNORE = '.vt-resize-trigger, .vt-filter-icon, .vt-sort-icon, input';

/**
 * 列拖拽排序：按住表头拖动换列序。
 *
 * ```ts
 * new VirtTable(el, { columns, plugins: [vtColumnDrag()] })
 * ```
 *
 * 限制（与核心 `moveColumn` 一致）：
 * - 有合并单元格（`merges`）时整体禁用——合并按绝对列号，换序会错位
 * - 多级分组表头下只允许**同一父分组内**换位，跨分组会改变表头结构
 */
export function vtColumnDrag<T extends Record<string, any> = any>(
  options: ColumnDragOptions = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtColumnDrag',
    setup(ctx: PluginContext<T>) {
      const ignore = options.ignoreSelector ?? DEFAULT_IGNORE;
      let ghost: HTMLElement | null = null;
      let line: HTMLElement | null = null;

      const cleanup = (): void => {
        ghost?.remove();
        ghost = null;
        line?.remove();
        line = null;
      };

      /** 指针 X 处的叶子列表头格。只认带 data-col-key 的格子——正好排除分组格与留白格 */
      const columnAtPoint = (clientX: number): { colKey: string; rect: DOMRect } | null => {
        const ths = ctx.theadEl.querySelectorAll<HTMLElement>('th.vt-th[data-col-key]');
        for (const th of ths) {
          const rect = th.getBoundingClientRect();
          if (clientX >= rect.left && clientX <= rect.right) {
            return { colKey: th.dataset.colKey!, rect };
          }
        }
        return null;
      };

      const begin = (e: PointerEvent, col: VirtTableColumn<T>): void => {
        startDrag(e, {
          onStart: () => {
            ghost = createGhost(ctx.rootEl, 'vt-col-drag-ghost', col.title ?? col.key);
            line = document.createElement('div');
            line.className = 'vt-col-drop-line';
            line.style.display = 'none';
            ctx.rootEl.appendChild(line);
          },
          onMove: (ev) => {
            if (ghost) {
              ghost.style.left = `${ev.clientX + 8}px`;
              ghost.style.top = `${ev.clientY + 8}px`;
            }
            if (!line) return;
            const target = columnAtPoint(ev.clientX);
            // 拖回原处 → 不显示指示线
            if (!target || target.colKey === col.key) {
              line.style.display = 'none';
              return;
            }
            const rootRect = ctx.rootEl.getBoundingClientRect();
            const insertAfter = ev.clientX > target.rect.left + target.rect.width / 2;
            line.style.left = `${(insertAfter ? target.rect.right : target.rect.left) - rootRect.left}px`;
            line.style.display = 'block';
          },
          onDrop: (ev) => {
            const target = columnAtPoint(ev.clientX);
            cleanup();
            swallowNextClick(); // 否则松手那下会触发表头排序
            if (!target || target.colKey === col.key) return;
            const insertAfter = ev.clientX > target.rect.left + target.rect.width / 2;
            ctx.table.moveColumn(col.key, target.colKey, insertAfter);
          },
          onCancel: cleanup,
        });
      };

      ctx.on('onHeaderCellRendered', (th, col) => {
        // 合并单元格下禁用；功能列（勾选等）不参与换序
        if (ctx.getOptions().merges?.length) return;
        if (col.type) return;
        th.classList.add('vt-th--draggable');
        th.addEventListener('pointerdown', (e) => {
          if (!isPrimaryPointer(e)) return;
          if ((e.target as HTMLElement).closest(ignore)) return;
          begin(e, col as VirtTableColumn<T>);
        });
      });

      return { destroy: cleanup };
    },
  };
}

// ============================================================================
// 行拖拽
// ============================================================================

export interface RowDragOptions {
  /** 整行可拖（默认 false：只有 `type:'drag'` 手柄列能发起） */
  wholeRow?: boolean;
}

/**
 * 行拖拽排序：拖动 `type:'drag'` 手柄列换行序，拖到容器边缘自动滚动。
 *
 * ```ts
 * const columns = [{ key: '_drag', title: '', width: 44, type: 'drag' }, …];
 * new VirtTable(el, { columns, plugins: [vtRowDrag()] });
 * ```
 *
 * **仅在扁平且未排序/筛选时生效**（核心 `canReorderRows()` 判定）——排序或筛选下
 * 「视图顺序」与「原始数据顺序」不是一回事，拖拽结果无法预期，此时手柄拖动无响应。
 */
export function vtRowDrag<T extends Record<string, any> = any>(
  options: RowDragOptions = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtRowDrag',
    setup(ctx: PluginContext<T>) {
      let ghost: HTMLElement | null = null;
      let line: HTMLElement | null = null;
      // 纵向必须走 scrollByY：容器的 overflow-y 是 hidden，写 scrollTop 不会动
      const autoScroll = createAutoScroll(ctx.clientEl, {
        scrollByY: (dy) => ctx.table.scrollByY(dy),
      });

      const cleanup = (): void => {
        autoScroll.stop();
        ghost?.remove();
        ghost = null;
        line?.remove();
        line = null;
      };

      const begin = (e: PointerEvent, rowKey: string): void => {
        if (!ctx.table.canReorderRows()) return;

        startDrag(e, {
          onStart: () => {
            line = document.createElement('div');
            line.className = 'vt-row-drop-line';
            line.style.display = 'none';
            ctx.clientEl.appendChild(line);
            // ghost 显示该行第一个数据列的值
            const item = ctx.getList().find(
              (r) => String(r[ctx.getOptions().itemKey]) === rowKey,
            );
            const labelCol = ctx.getColumns().find((c) => !c.type);
            const label = item && labelCol ? String(item[labelCol.key] ?? '') : `行 ${rowKey}`;
            ghost = createGhost(ctx.rootEl, 'vt-row-drag-ghost', label || `行 ${rowKey}`);
          },
          onMove: (ev) => {
            autoScroll.update(ev.clientX, ev.clientY);
            if (ghost) {
              ghost.style.left = `${ev.clientX + 12}px`;
              ghost.style.top = `${ev.clientY + 12}px`;
            }
            if (!line) return;
            const tr = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement)
              ?.closest('tr.vt-tr') as HTMLElement | null;
            if (!tr || tr.dataset.rowKey === rowKey) {
              line.style.display = 'none';
              return;
            }
            const clientRect = ctx.clientEl.getBoundingClientRect();
            const trRect = tr.getBoundingClientRect();
            // 指针在目标行上半 → 线在行顶（插到其前），否则行底
            const y = ev.clientY < trRect.top + trRect.height / 2 ? trRect.top : trRect.bottom;
            // 不加 scrollTop：容器的 overflow-y 是 hidden，它恒为 0
            line.style.top = `${y - clientRect.top}px`;
            line.style.display = 'block';
          },
          onDrop: (ev) => {
            const tr = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement)
              ?.closest('tr.vt-tr') as HTMLElement | null;
            const targetKey = tr?.dataset.rowKey;
            cleanup();
            if (!tr || !targetKey || targetKey === rowKey) return;
            const trRect = tr.getBoundingClientRect();
            const insertAfter = ev.clientY > trRect.top + trRect.height / 2;
            ctx.table.moveRow(rowKey, targetKey, insertAfter);
          },
          onCancel: cleanup,
        });
      };

      // 手柄由核心渲染（它是 type:'drag' 列的内容），这里只挂拖拽手势
      ctx.on('onCellRendered', (td, col, item) => {
        const rowKey = String(item[ctx.getOptions().itemKey]);
        const handle = col.type === 'drag'
          ? td.querySelector<HTMLElement>('.vt-drag-handle')
          : options.wholeRow ? td : null;
        if (!handle) return;
        handle.addEventListener('pointerdown', (e) => {
          if (!isPrimaryPointer(e)) return;
          e.preventDefault();
          e.stopPropagation();
          begin(e, rowKey);
        });
      });

      return { destroy: cleanup };
    },
  };
}
