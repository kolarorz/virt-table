/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VirtTablePlugin, PluginContext } from '../plugin';
import type { VirtTableColumn } from '../index';
import './column-filter.css';

/**
 * 样式在 `column-filter.css`：漏斗图标与表头留白是本插件私有，面板本体
 * （`.vt-filter-panel` / `.vt-filter-list` / `.vt-filter-item` / `.vt-filter-btn` …）
 * 三方共享，由 `column-filter.css` 顶部 `@import './_panel.css'` 内联进来。
 * 只有 `.vt-filter-checkbox` 留在核心 `index.css`——它与核心勾选框共用同一套规则。
 */

const FILTER_ICON_SVG =
  '<svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="currentColor">' +
  '<path d="M349 838c-8 0-15-2-22-7a38 38 0 0 1-16-31V558L56 246a38 38 0 0 1-4-36 38 38 0 0 1 34-22h852a38 38 0 0 1 34 22 38 38 0 0 1-4 36L717 558v168a38 38 0 0 1-16 31L365 845a38 38 0 0 1-16 -7z"/></svg>';

/**
 * `vtColumnFilter` 通过 `provide('columnFilter')` 暴露的服务。
 *
 * 消费方：`vtColumnMenu`（菜单里的「筛选」那一项）。用
 * `ctx.inject<ColumnFilterService>('columnFilter')` 取用，未装载时为 undefined ——
 * 于是菜单**少一项**，而不是多一项点了没反应的。
 *
 * 为什么要这条握手：插件之间不能互相调实例 API（`ctx.table` 是**核心**方法的白名单，
 * 不含别的插件注入的方法）。provide / inject 是插件间协作唯一的正路，
 * 与框选把选区交给剪贴板是同一条（见 `plugin.ts` 的 `CellSelectionService`）。
 */
export interface ColumnFilterService {
  /** 打开某列的筛选面板。`anchor` 不给就贴那一列表头上的漏斗图标 */
  open(colKey: string, anchor?: HTMLElement): void;
  close(): void;
  /** 这一列配了筛选吗（没配的列，菜单里不该出现「筛选」） */
  canFilter(colKey: string): boolean;
}

export interface ColumnFilterOptions {
  /** 面板最小宽度（px，默认 160，用于锚点右对齐时的位置计算） */
  panelWidth?: number;
}

/**
 * 列头筛选下拉：在可筛选列的表头加一个漏斗图标，点开弹出筛选面板。
 *
 * ```ts
 * const columns = [
 *   { key: 'dept', title: '部门', width: 140, filters: [{ label: '工程部', value: '工程部' }] },
 *   { key: 'age', title: '年龄', width: 120, filterType: 'number-range' },
 * ];
 * new VirtTable(el, { columns, plugins: [vtColumnFilter()] });
 * ```
 *
 * 支持四种 `filterType`：`enum`（默认，枚举勾选）/ `text` / `number-range` / `date-range`。
 *
 * **只做 UI**：筛选状态与谓词求值留在核心（是查询状态，服务端模式下会进
 * `RemoteQuery.filters`）。所以不装本插件时，`setColumnFilter()` / `clearAllFilters()` /
 * 列上的 `filters[].checked` 初值依然有效，只是没有可点的表头入口。
 */
export function vtColumnFilter<T extends Record<string, any> = any>(
  options: ColumnFilterOptions = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtColumnFilter',
    setup(ctx: PluginContext<T>) {
      const panelWidth = options.panelWidth ?? 160;
      let panelEl: HTMLDivElement | null = null;
      let panelCol: VirtTableColumn<T> | null = null;
      let dismissHandler: ((e: PointerEvent) => void) | null = null;

      const dismiss = (): void => {
        if (panelEl) {
          panelEl.remove();
          panelEl = null;
        }
        panelCol = null;
        if (dismissHandler) {
          document.removeEventListener('pointerdown', dismissHandler);
          dismissHandler = null;
        }
      };

      const open = (col: VirtTableColumn<T>, anchor: HTMLElement): void => {
        // 点同一列的图标 → 收起
        if (panelCol === col && panelEl) {
          dismiss();
          return;
        }
        dismiss();
        panelCol = col;

        const locale = ctx.getLocale();
        const active = ctx.table.getActiveFilters()[col.key] as any[] | undefined;

        const panel = document.createElement('div');
        panel.className = 'vt-filter-panel';
        const list = document.createElement('div');
        list.className = 'vt-filter-list';

        const type = col.filterType ?? 'enum';
        let getValues: () => any[];

        if (type === 'text') {
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'vt-filter-text';
          input.placeholder = locale.filter.keyword;
          input.value = active && active[0] != null ? String(active[0]) : '';
          list.appendChild(input);
          getValues = () => (input.value.trim() === '' ? [] : [input.value.trim()]);
        } else if (type === 'number-range' || type === 'date-range') {
          const cur = (active?.[0] ?? {}) as Record<string, any>;
          const inputType = type === 'number-range' ? 'number' : 'date';
          const [k1, k2] = type === 'number-range' ? ['min', 'max'] : ['start', 'end'];
          const mk = (ph: string, v: any): HTMLInputElement => {
            const i = document.createElement('input');
            i.type = inputType;
            i.className = 'vt-filter-text';
            i.placeholder = ph;
            if (v != null) i.value = String(v);
            return i;
          };
          const i1 = mk(type === 'number-range' ? locale.filter.min : locale.filter.startDate, cur[k1]);
          const i2 = mk(type === 'number-range' ? locale.filter.max : locale.filter.endDate, cur[k2]);
          const wrap = document.createElement('div');
          wrap.className = 'vt-filter-range';
          wrap.append(i1, i2);
          list.appendChild(wrap);
          getValues = () => {
            const parse = (s: string): any =>
              s === '' ? undefined : type === 'number-range' ? Number(s) : s;
            const a = parse(i1.value);
            const b = parse(i2.value);
            return a === undefined && b === undefined ? [] : [{ [k1]: a, [k2]: b }];
          };
        } else {
          // enum：枚举勾选；filterMultiple: false 时退化为单选
          const multiple = col.filterMultiple !== false;
          const selected = active
            ? new Set<any>(active)
            : new Set<any>((col.filters ?? []).filter((f) => f.checked).map((f) => f.value));
          const inputs: Array<{ input: HTMLInputElement; value: any }> = [];
          for (const opt of col.filters ?? []) {
            const label = document.createElement('label');
            label.className = 'vt-filter-item';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.className = 'vt-filter-checkbox';
            input.checked = selected.has(opt.value);
            inputs.push({ input, value: opt.value });
            if (!multiple) {
              input.addEventListener('change', () => {
                if (input.checked) {
                  for (const item of inputs) if (item.input !== input) item.input.checked = false;
                }
              });
            }
            const span = document.createElement('span');
            span.textContent = opt.label;
            label.append(input, span);
            list.appendChild(label);
          }
          getValues = () => inputs.filter((i) => i.input.checked).map((i) => i.value);
        }

        const actions = document.createElement('div');
        actions.className = 'vt-filter-actions';

        const btnReset = document.createElement('button');
        btnReset.className = 'vt-filter-btn';
        btnReset.textContent = locale.filter.reset;
        btnReset.addEventListener('click', () => {
          ctx.table.setColumnFilter(col.key, []);
          dismiss();
        });

        const btnConfirm = document.createElement('button');
        btnConfirm.className = 'vt-filter-btn vt-filter-btn--primary';
        btnConfirm.textContent = locale.filter.confirm;
        btnConfirm.addEventListener('click', () => {
          ctx.table.setColumnFilter(col.key, getValues());
          dismiss();
        });

        actions.append(btnReset, btnConfirm);
        panel.append(list, actions);

        // 贴在图标下方、右对齐，且不越出容器
        const anchorRect = anchor.getBoundingClientRect();
        const rootRect = ctx.rootEl.getBoundingClientRect();
        panel.style.top = `${anchorRect.bottom - rootRect.top + 4}px`;
        const idealLeft = anchorRect.right - rootRect.left - panelWidth;
        panel.style.left = `${Math.max(0, Math.min(idealLeft, rootRect.width - panelWidth - 4))}px`;

        ctx.rootEl.appendChild(panel);
        panelEl = panel;

        dismissHandler = (e: PointerEvent) => {
          if (panel.contains(e.target as Node)) return;
          // 点图标本身交给 open() 处理收起，避免这里先关再开导致闪一下
          if ((e.target as HTMLElement).closest?.('.vt-filter-icon')) return;
          dismiss();
        };
        /*
         * 听 `pointerdown` 而不是 `mousedown`：`vtCellSelection` 的拖选起手在 pointerdown 里
         * `preventDefault()`，而那会连带取消「派发兼容 mouse 事件」—— 表体内的 mousedown
         * 根本不存在（CDP 实测点单元格：pointerdown 1 / mousedown 0 / click 1）。
         * 听 mousedown 的后果就是：点表格里的格子关不掉这个浮层。
         */
        setTimeout(() => {
          if (dismissHandler) document.addEventListener('pointerdown', dismissHandler);
        }, 0);
      };

      // 表头渲染完成后追加漏斗图标（核心不再关心筛选 UI）
      ctx.on('onHeaderCellRendered', (th, col) => {
        const filterable =
          (col.filters && col.filters.length > 0) ||
          (col.filterType && col.filterType !== 'enum');
        if (!filterable) return;

        th.classList.add('vt-th--filterable');
        const icon = document.createElement('span');
        icon.className = 'vt-filter-icon';
        const activeVals = ctx.table.getActiveFilters()[col.key];
        if (activeVals && activeVals.length > 0) icon.classList.add('vt-filter-icon--active');
        icon.innerHTML = FILTER_ICON_SVG;
        icon.addEventListener('click', (e) => {
          e.stopPropagation(); // 否则会连带触发表头排序
          open(col as VirtTableColumn<T>, icon);
        });
        th.appendChild(icon);
      });

      // 列结构变化后表头会重建，面板的锚点已失效
      ctx.on('onColumnsChanged', dismiss);

      /*
       * 把「开 / 关某列的筛选面板」provide 出去，给 `vtColumnMenu` 的「筛选」那一项用。
       * 判据与上面 `onHeaderCellRendered` 里那个 `filterable` 保持同一份 —— 两处不一致的话
       * 会出现「菜单里有筛选、但那一列压根没有漏斗图标」这种自相矛盾的状态。
       */
      const canFilter = (col: VirtTableColumn<T> | undefined): boolean =>
        !!col &&
        (((col.filters?.length ?? 0) > 0) || (!!col.filterType && col.filterType !== 'enum'));

      ctx.provide<ColumnFilterService>('columnFilter', {
        open: (colKey, anchorEl) => {
          const col = ctx.getColumns().find((c) => c.key === colKey);
          if (!canFilter(col)) return;
          const el =
            anchorEl ??
            (ctx.theadEl.querySelector(
              `th[data-col-key="${colKey}"] .vt-filter-icon`,
            ) as HTMLElement | null);
          if (el) open(col as VirtTableColumn<T>, el);
        },
        close: () => dismiss(),
        canFilter: (colKey) => canFilter(ctx.getColumns().find((c) => c.key === colKey)),
      });

      return {
        api: {
          /** 打开某列的筛选面板（找不到列或列不可筛选则无操作） */
          openColumnFilter: (colKey: string) => {
            const col = ctx.getColumns().find((c) => c.key === colKey);
            if (!col) return;
            const icon = ctx.theadEl.querySelector(
              `th[data-col-key="${colKey}"] .vt-filter-icon`,
            ) as HTMLElement | null;
            if (icon) open(col, icon);
          },
          closeColumnFilter: () => dismiss(),
        },
        destroy: dismiss,
      };
    },
  };
}
