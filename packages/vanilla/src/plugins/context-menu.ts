/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VirtTablePlugin, PluginContext, CellSelectionService } from '../plugin';
import type { VirtTableColumn } from '../index';
import './context-menu.css';

export interface ContextMenuItem {
  label: string;
  action: () => void;
  /** 禁用：不可点击，点了也不会关闭菜单 */
  disabled?: boolean;
  /** 在本项之前插入一条分隔线 */
  divider?: boolean;
}

export interface ContextMenuContext<T = any> {
  /** 真实数据行索引 */
  rowIndex: number;
  /** 可见叶子列索引 */
  colIndex: number;
  row: T;
  column: VirtTableColumn<T>;
  /** 当前框选区域；未装载 vtCellSelection 插件时恒为 null */
  selection: { startRow: number; startCol: number; endRow: number; endCol: number } | null;
}

/** 菜单项提供者：返回 null / 空数组表示该位置不弹菜单 */
export type ContextMenuProvider<T> = (
  context: ContextMenuContext<T>,
) => ContextMenuItem[] | null;

/**
 * 右键菜单插件。
 *
 * ```ts
 * new VirtTable(el, {
 *   columns,
 *   plugins: [vtContextMenu((ctx) => [
 *     { label: `删除 ${ctx.row.name}`, action: () => remove(ctx.row) },
 *   ])],
 * })
 * ```
 *
 * 暴露 API：`hideContextMenu()`
 */
export function vtContextMenu<T extends Record<string, any> = any>(
  provider: ContextMenuProvider<T>,
): VirtTablePlugin<T> {
  return {
    name: 'vtContextMenu',
    setup(ctx: PluginContext<T>) {
      // 可选依赖：装了框选，菜单上下文的 selection 才有值
      const selection = ctx.inject<CellSelectionService>('cellSelection');

      let menuEl: HTMLDivElement | null = document.createElement('div');
      menuEl.className = 'vt-context-menu';
      menuEl.style.display = 'none';
      menuEl.addEventListener('contextmenu', (e) => e.preventDefault());
      ctx.rootEl.appendChild(menuEl);

      /** 关闭菜单时要摘掉的全局兜底监听 */
      let dismissHandler: ((e: Event) => void) | null = null;

      const hide = (): void => {
        if (menuEl) {
          menuEl.style.display = 'none';
          menuEl.innerHTML = '';
        }
        if (dismissHandler) {
          document.removeEventListener('pointerdown', dismissHandler);
          document.removeEventListener('scroll', dismissHandler, true);
          document.removeEventListener('keydown', dismissHandler);
          dismissHandler = null;
        }
      };

      const show = (e: MouseEvent, items: ContextMenuItem[]): void => {
        if (!menuEl) return;
        hide();
        menuEl.innerHTML = '';

        for (const item of items) {
          if (item.divider) {
            const divider = document.createElement('div');
            divider.className = 'vt-context-menu-divider';
            menuEl.appendChild(divider);
          }
          const el = document.createElement('div');
          el.className = 'vt-context-menu-item';
          if (item.disabled) el.classList.add('vt-context-menu-item--disabled');
          el.textContent = item.label;
          if (!item.disabled) {
            el.addEventListener('click', () => {
              item.action();
              hide();
            });
          }
          menuEl.appendChild(el);
        }

        const rootRect = ctx.rootEl.getBoundingClientRect();
        let top = e.clientY - rootRect.top;
        let left = e.clientX - rootRect.left;
        menuEl.style.top = `${top}px`;
        menuEl.style.left = `${left}px`;
        menuEl.style.display = '';

        // 菜单尺寸要等渲染后才知道，下一帧再做越界回收
        requestAnimationFrame(() => {
          if (!menuEl || menuEl.style.display === 'none') return;
          const menuRect = menuEl.getBoundingClientRect();
          if (menuRect.bottom > rootRect.bottom) {
            top = Math.max(0, top - (menuRect.bottom - rootRect.bottom));
            menuEl.style.top = `${top}px`;
          }
          if (menuRect.right > rootRect.right) {
            left = Math.max(0, left - (menuRect.right - rootRect.right));
            menuEl.style.left = `${left}px`;
          }
        });

        dismissHandler = (ev: Event) => {
          if (ev.type === 'keydown' && (ev as KeyboardEvent).key !== 'Escape') return;
          if (ev.type === 'pointerdown' && menuEl?.contains(ev.target as Node)) return;
          hide();
        };
        /*
         * 听 `pointerdown` 而不是 `mousedown`：`vtCellSelection` 的拖选起手在 pointerdown 里
         * `preventDefault()`，而那会连带取消「派发兼容 mouse 事件」—— 表体内的 mousedown
         * 根本不存在（CDP 实测点单元格：pointerdown 1 / mousedown 0 / click 1）。
         * 听 mousedown 的后果就是：点表格里的格子关不掉这个浮层。
         */
        // 延后一拍绑定，避免触发本次右键的 pointerdown 立刻把菜单关掉
        setTimeout(() => {
          if (!dismissHandler) return;
          document.addEventListener('pointerdown', dismissHandler);
          document.addEventListener('scroll', dismissHandler, true);
          document.addEventListener('keydown', dismissHandler);
        }, 0);
      };

      const onContextMenu = (e: MouseEvent): void => {
        e.preventDefault();

        const td = (e.target as HTMLElement).closest('td.vt-td') as HTMLElement | null;
        const tr = td?.closest('tr.vt-tr') as HTMLElement | null;
        if (!tr || !td) { hide(); return; }

        const rowKey = tr.dataset.rowKey;
        const colKey = td.dataset.colKey;
        if (!rowKey || !colKey) { hide(); return; }

        const rowData = ctx.getRowData(rowKey);
        if (!rowData) { hide(); return; }

        const columns = ctx.getColumns();
        const colIdx = columns.findIndex((c) => c.key === colKey);
        if (colIdx < 0) { hide(); return; }

        const items = provider({
          rowIndex: rowData.rowIndex,
          colIndex: colIdx,
          row: rowData.item,
          column: columns[colIdx],
          selection: selection?.getSelection() ?? null,
        });
        if (!items || items.length === 0) { hide(); return; }
        show(e, items);
      };

      ctx.tbodyEl.addEventListener('contextmenu', onContextMenu);

      return {
        api: {
          hideContextMenu: () => hide(),
        },
        destroy: () => {
          hide();
          ctx.tbodyEl.removeEventListener('contextmenu', onContextMenu);
          menuEl?.remove();
          menuEl = null;
        },
      };
    },
  };
}
