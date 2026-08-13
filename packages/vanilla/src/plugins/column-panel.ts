/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VirtTablePlugin, PluginContext } from '../plugin';
import type { VirtTableColumn } from '../index';
import { isColumnGroup } from '../header-group';
import './column-panel.css';

export interface ColumnPanelOptions {
  /**
   * 面板定位：不给锚点时贴在表格右上角。
   * 给了 `toggleColumnPanel(anchor)` 的锚点则贴在锚点下方左对齐。
   */
  placement?: 'anchor' | 'top-right';
}

/**
 * 列设置面板插件：勾选切换列显隐，分组表头按列树层级缩进展示。
 *
 * ```ts
 * const table = new VirtTable(el, { columns, plugins: [vtColumnPanel()] });
 * btn.onclick = () => table.toggleColumnPanel(btn);   // 传锚点则贴锚点下方
 * ```
 *
 * 列上用 `hidden` 设初始显隐、`hideable: false` 可禁止在面板里切换该列。
 * 勾掉分组节点等于整组隐藏。
 *
 * 暴露 API：`toggleColumnPanel(anchor?)` / `openColumnPanel(anchor?)` /
 * `closeColumnPanel()` / `isColumnPanelOpen()`
 */
export function vtColumnPanel<T extends Record<string, any> = any>(
  options: ColumnPanelOptions = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtColumnPanel',
    setup(ctx: PluginContext<T>) {
      let panelEl: HTMLDivElement | null = null;
      let dismissHandler: ((e: MouseEvent) => void) | null = null;
      /** 记住打开时的锚点：列显隐变化后要重渲染，dismiss 判定也要排除它 */
      let currentAnchor: HTMLElement | undefined;

      const renderBody = (panel: HTMLElement): void => {
        panel.innerHTML = '';
        const list = document.createElement('div');
        list.className = 'vt-filter-list';

        const walk = (cols: VirtTableColumn<T>[], level: number): void => {
          for (const col of cols) {
            const group = isColumnGroup(col);
            if (col.hideable !== false && col.title) {
              const item = document.createElement('label');
              item.className = 'vt-filter-item';
              if (level > 0) item.style.setProperty('--vt-panel-level', String(level));

              const cb = document.createElement('input');
              cb.type = 'checkbox';
              cb.className = 'vt-filter-checkbox';
              cb.checked = !col.hidden;
              cb.addEventListener('change', () =>
                ctx.table.setColumnVisible(col.key, cb.checked),
              );
              item.appendChild(cb);

              const span = document.createElement('span');
              span.textContent = col.title;
              if (group) span.className = 'vt-filter-item-group';
              item.appendChild(span);

              list.appendChild(item);
            }
            if (group) walk(col.children!, level + 1);
          }
        };

        walk(ctx.table.getAllColumns() as VirtTableColumn<T>[], 0);
        panel.appendChild(list);
      };

      const close = (): void => {
        if (!panelEl) return;
        if (dismissHandler) {
          document.removeEventListener('mousedown', dismissHandler);
          dismissHandler = null;
        }
        panelEl.remove();
        panelEl = null;
        currentAnchor = undefined;
      };

      const open = (anchor?: HTMLElement): void => {
        if (panelEl) return;
        currentAnchor = anchor;

        // 复用核心的通用面板外观（.vt-filter-panel），叠加列面板专属样式
        const panel = document.createElement('div');
        panel.className = 'vt-filter-panel vt-column-panel';
        panelEl = panel;
        renderBody(panel);

        const rootRect = ctx.rootEl.getBoundingClientRect();
        if (anchor && options.placement !== 'top-right') {
          const r = anchor.getBoundingClientRect();
          panel.style.top = `${r.bottom - rootRect.top + 4}px`;
          panel.style.left = `${r.left - rootRect.left}px`;
        } else {
          panel.style.top = '4px';
          panel.style.right = '4px';
        }
        ctx.rootEl.appendChild(panel);

        dismissHandler = (e: MouseEvent) => {
          if (!panelEl) return;
          // 排除锚点自身：否则点按钮会先 dismiss 再 toggle，面板闪一下又打开
          if (panelEl.contains(e.target as Node) || e.target === currentAnchor) return;
          close();
        };
        // 延后一拍绑定，避免触发本次打开的 mousedown 立刻把面板关掉
        setTimeout(() => {
          if (dismissHandler) document.addEventListener('mousedown', dismissHandler);
        }, 0);
      };

      // 列显隐/列结构变化后同步勾选态（原核心里的 _refreshColumnPanel）
      ctx.on('onColumnsChanged', () => {
        if (panelEl) renderBody(panelEl);
      });

      return {
        api: {
          toggleColumnPanel: (anchor?: HTMLElement) => {
            if (panelEl) close();
            else open(anchor);
          },
          openColumnPanel: (anchor?: HTMLElement) => open(anchor),
          closeColumnPanel: () => close(),
          isColumnPanelOpen: () => panelEl !== null,
        },
        destroy: close,
      };
    },
  };
}
