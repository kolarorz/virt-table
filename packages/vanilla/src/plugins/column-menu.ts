/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VirtTablePlugin, PluginContext } from '../plugin';
import type { SortOrder, VirtTableColumn } from '../index';
import type { ColumnFilterService } from './column-filter';
import { createStandalonePanel } from '../internal/panel-popup';
import './column-menu.css';

/**
 * 列头菜单：每一列表头挂一颗 ☰，点开是这一列的动作清单
 * （排序 / 筛选 / 固定 / 隐藏 / 自适应列宽 / 按此列分组）。
 *
 * ```ts
 * new VirtTable(el, { columns, plugins: [vtColumnMenu()] });
 * ```
 *
 * ## 为什么它在**免费**版
 *
 * AG Grid 把 Column Menu 划进 Enterprise，但这一条不跟：菜单本身没有任何算法，
 * 它只是把核心**已经有的**几个公开动作摆成一列按钮（排序走 `getState/setState`、
 * 显隐走 `setColumnVisible`、分组走 `setGroupConfig`）。社区一周能写完的东西收费只会赶客
 * —— 与右键菜单、列面板同一条线。付费边界留给「进阶场景专属且复刻成本高」的能力。
 *
 * ## 与列头筛选下拉的关系：**复用，不重画**
 *
 * 菜单里的「筛选」不自己画面板，而是 `inject('columnFilter')` 让 `vtColumnFilter`
 * 把它那份面板开在菜单按钮上。所以：
 *
 * - 没装 `vtColumnFilter` → 菜单里**没有**「筛选」这一项（不是有一项点了没反应）
 * - 装了但这一列没配 `filters` / `filterType` → 同样不显示
 * - 两处的判据是同一个函数（`ColumnFilterService.canFilter`），不会出现
 *   「菜单里有筛选、表头却没有漏斗图标」这种自相矛盾
 *
 * ## 几个刻意的取舍
 *
 * - **不接管表头点击**。表头点一下仍然是排序（核心的行为），菜单只是多一个入口 ——
 *   接管的话「点表头排序」这条肌肉记忆就没了。图标上 `stopPropagation`，
 *   与漏斗图标同一个理由。
 * - **分组节点不挂菜单**。分组节点不承载数据，排序 / 筛选 / 固定对它没有意义
 *   （`fixed` 甚至会被核心强制下发给全部后代）。
 * - **功能列不挂菜单**（序号 / 勾选 / 单选 / 拖拽把手）。它们没有业务值可排可筛。
 *   `tree` 是例外：它只加缩进与折叠箭头，内容照常，所以给它菜单。
 *
 * 暴露 API：`openColumnMenu(colKey, anchor?)` / `closeColumnMenu()` / `isColumnMenuOpen()`
 */

/** 真正的功能列：整格被控件占掉，没有可排可筛的业务值。`tree` 不在其中（见文件头） */
const NO_MENU_TYPES = new Set(['index', 'checkbox', 'expand', 'radio', 'drag']);

const MENU_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
  '<path d="M4 7h16M4 12h16M4 17h16"/></svg>';

/** 菜单里每一项的文案。整份可覆盖（英文站换掉） */
export interface ColumnMenuTexts {
  sortAsc: string;
  sortDesc: string;
  sortClear: string;
  filter: string;
  pinLeft: string;
  pinRight: string;
  pinNone: string;
  hide: string;
  autoWidth: string;
  groupBy: string;
  groupClear: string;
}

const DEFAULT_TEXTS: ColumnMenuTexts = {
  sortAsc: '升序',
  sortDesc: '降序',
  sortClear: '取消排序',
  filter: '筛选…',
  pinLeft: '冻结到左侧',
  pinRight: '冻结到右侧',
  pinNone: '取消冻结',
  hide: '隐藏本列',
  autoWidth: '自适应列宽',
  groupBy: '按此列分组',
  groupClear: '取消分组',
};

/** 菜单里可以关掉的条目 */
export type ColumnMenuItemKey = 'sort' | 'filter' | 'pin' | 'hide' | 'autoWidth' | 'group';

export interface ColumnMenuOptions<T extends Record<string, any> = any> {
  /** 文案覆盖 */
  texts?: Partial<ColumnMenuTexts>;
  /**
   * 只显示这几组条目（默认全部）。顺序按数组给的来。
   *
   * 例：`items: ['sort', 'filter']` —— 只要排序与筛选，不给用户改冻结与列宽。
   */
  items?: ColumnMenuItemKey[];
  /**
   * 哪些列不挂菜单。返回 `true` = 不挂。
   *
   * 功能列与分组节点本来就不挂（见文件头），这个开关是给业务判断用的
   * （「操作」列、只读的系统字段）。
   */
  disabled?: (col: VirtTableColumn<T>) => boolean;
  /** 自定义追加的条目，挂在内置条目之后 */
  extraItems?: (col: VirtTableColumn<T>) => Array<{
    label: string;
    onClick: () => void;
    /** 置灰 */
    disabled?: boolean;
  }>;
  /** 自适应列宽的上下限（px），默认 `[60, 480]` */
  autoWidthRange?: [number, number];
}

export function vtColumnMenu<T extends Record<string, any> = any>(
  options: ColumnMenuOptions<T> = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtColumnMenu',
    setup(ctx: PluginContext<T>) {
      const texts: ColumnMenuTexts = { ...DEFAULT_TEXTS, ...options.texts };
      const order: ColumnMenuItemKey[] =
        options.items ?? ['sort', 'filter', 'pin', 'hide', 'autoWidth', 'group'];
      const [minWidth, maxWidth] = options.autoWidthRange ?? [60, 480];

      /** 当前打开的是哪一列（`isColumnMenuOpen()` 与图标高亮都读它） */
      let openKey: string | null = null;

      // ---- 核心动作，全部走公开面 ----

      /** 当前排序状态。与 `vtSortConfig` 同一条路：排序住在查询状态里 */
      const sortOf = (colKey: string): SortOrder | null =>
        (ctx.table.getState().sort ?? []).find((s) => s.colKey === colKey)?.order ?? null;

      const applySort = (colKey: string, next: SortOrder | null): void => {
        const st = ctx.table.getState();
        const rest = (st.sort ?? []).filter((s) => s.colKey !== colKey);
        /*
         * 多列排序时保留其它列的排序（本列换到末位 = 优先级最低）；单列模式整份替换。
         * 判据取 `sortMode` option，与核心表头点击的行为保持一致 —— 两处不一致的话，
         * 「点表头」和「菜单里点升序」会得到不同的排序状态。
         */
        const multiple = ctx.getOptions().sortMode === 'multiple';
        const sort = next === null ? rest : multiple ? [...rest, { colKey, order: next }] : [{ colKey, order: next }];
        ctx.table.setState({ version: st.version, sort });
      };

      const applyPin = (col: VirtTableColumn<T>, fixed: 'left' | 'right' | undefined): void => {
        /*
         * 改 `col.fixed` 之后必须整体重提列树：冻结区段的划分（`_leftFixedCols` /
         * `_centerCols` / `_rightFixedCols`）、列前缀和、colgroup 都由 `setColumns` 重算。
         *
         * ⚠️ 这是**就地改列对象**，与核心自己的 `setColumnVisible`（改 `col.hidden`
         * 再 `setColumns`）同一种做法 —— 列对象本来就是使用方给的、核心也在写它
         * （拖列宽写 `col.width`）。
         */
        if (fixed === undefined) delete col.fixed;
        else col.fixed = fixed;
        ctx.table.setColumns(ctx.table.getAllColumns());
      };

      /**
       * 自适应列宽：量**当前渲染出来的**那些格，取最宽的那个。
       *
       * ⚠️ 虚拟化下量不到窗口外的行 —— 这是能力边界，不是 bug：要精确就得把十万行
       * 全渲染一遍量一次，那正是虚拟化要避免的事。AG Grid 的 autosize 同样只看渲染行。
       * 所以文档里写清「按当前可见行计算」，并给上下限兜住极端值。
       */
      const applyAutoWidth = (col: VirtTableColumn<T>): void => {
        const cells = ctx.tbodyEl.querySelectorAll<HTMLElement>(
          `td[data-col-key="${col.key}"]`,
        );
        let widest = 0;
        for (const td of cells) {
          // scrollWidth 是内容宽（含被省略号裁掉的部分），clientWidth 是可见宽
          const inner = td.firstElementChild as HTMLElement | null;
          const w = Math.max(td.scrollWidth, inner?.scrollWidth ?? 0);
          if (w > widest) widest = w;
        }
        const th = ctx.theadEl.querySelector<HTMLElement>(`th[data-col-key="${col.key}"]`);
        if (th) widest = Math.max(widest, th.scrollWidth);
        if (widest <= 0) return;
        // 加一点余量：scrollWidth 不含单元格内边距被裁掉的那一侧，量出来会紧贴文字
        col.width = Math.min(maxWidth, Math.max(minWidth, Math.ceil(widest) + 16));
        ctx.table.setColumns(ctx.table.getAllColumns());
      };

      const groupedBy = (colKey: string): boolean =>
        ctx.table.getGroupConfig().some((g) => g.field === colKey);

      // ---- 菜单面板 ----

      const filterSvc = (): ColumnFilterService | undefined =>
        ctx.inject<ColumnFilterService>('columnFilter');

      /** 一行按钮。用 `.vt-filter-item` —— 它由 `_panel.css` 提供，本插件的 CSS 已 @import */
      const row = (
        parent: HTMLElement,
        label: string,
        onClick: () => void,
        opts: { active?: boolean; disabled?: boolean } = {},
      ): void => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vt-filter-item vt-column-menu-item';
        if (opts.active) btn.classList.add('is-active');
        btn.disabled = !!opts.disabled;
        btn.textContent = label;
        btn.addEventListener('click', () => {
          if (opts.disabled) return;
          onClick();
        });
        parent.appendChild(btn);
      };

      let currentCol: VirtTableColumn<T> | null = null;

      const panel = createStandalonePanel<T>(ctx, {
        // 约定：`vt-toolbar-popup--<key>`（见 `panel-popup.ts` 的注释），两条路共用一份皮肤
        className: 'vt-toolbar-popup--column-menu',
        minWidth: 176,
        build: (p) => {
          const col = currentCol;
          if (!col) return;
          const svc = filterSvc();
          let divided = false;
          /** 分隔线只在两组之间画，不在开头/结尾 —— 也不画连续两条 */
          const divide = (): void => {
            if (!divided) return;
            p.ui.divider();
            divided = false;
          };

          for (const group of order) {
            if (group === 'sort' && col.sortable !== false) {
              divide();
              const cur = sortOf(col.key);
              row(p.el, texts.sortAsc, () => {
                applySort(col.key, 'asc');
                p.close();
              }, { active: cur === 'asc' });
              row(p.el, texts.sortDesc, () => {
                applySort(col.key, 'desc');
                p.close();
              }, { active: cur === 'desc' });
              row(p.el, texts.sortClear, () => {
                applySort(col.key, null);
                p.close();
              }, { disabled: cur === null });
              divided = true;
            }

            if (group === 'filter' && svc?.canFilter(col.key)) {
              divide();
              row(p.el, texts.filter, () => {
                const anchor = ctx.theadEl.querySelector<HTMLElement>(
                  `th[data-col-key="${col.key}"] .vt-column-menu-icon`,
                );
                p.close();
                // 关掉菜单再开筛选面板：两个浮层同时挂在 rootEl 上会互相遮
                svc.open(col.key, anchor ?? undefined);
              });
              divided = true;
            }

            if (group === 'pin') {
              divide();
              row(p.el, texts.pinLeft, () => {
                applyPin(col, 'left');
                p.close();
              }, { active: col.fixed === 'left' });
              row(p.el, texts.pinRight, () => {
                applyPin(col, 'right');
                p.close();
              }, { active: col.fixed === 'right' });
              row(p.el, texts.pinNone, () => {
                applyPin(col, undefined);
                p.close();
              }, { disabled: !col.fixed });
              divided = true;
            }

            if (group === 'hide' && col.hideable !== false) {
              divide();
              row(p.el, texts.hide, () => {
                ctx.table.setColumnVisible(col.key, false);
                p.close();
              });
              divided = true;
            }

            if (group === 'autoWidth' && col.resizable !== false) {
              divide();
              row(p.el, texts.autoWidth, () => {
                applyAutoWidth(col);
                p.close();
              });
              divided = true;
            }

            if (group === 'group') {
              divide();
              const on = groupedBy(col.key);
              row(p.el, on ? texts.groupClear : texts.groupBy, () => {
                const cfg = ctx.table.getGroupConfig();
                ctx.table.setGroupConfig(
                  on ? cfg.filter((g) => g.field !== col.key) : [...cfg, { field: col.key }],
                );
                p.close();
              }, { active: on });
              divided = true;
            }
          }

          for (const extra of options.extraItems?.(col) ?? []) {
            divide();
            row(p.el, extra.label, () => {
              extra.onClick();
              p.close();
            }, { disabled: extra.disabled });
          }

          p.resize();

          /*
           * 收尾：图标的高亮态挂在**表头 DOM** 上，而面板关掉的路有三条
           * （点图标、点外面、菜单里点了一项）。放在 `PanelHandle.destroy` 里，
           * 三条路都会经过它 —— 分散到每个关闭点去擦，必定漏一条。
           */
          return {
            destroy: () => {
              openKey = null;
              currentCol = null;
              for (const el of ctx.theadEl.querySelectorAll('.vt-column-menu-icon--open')) {
                el.classList.remove('vt-column-menu-icon--open');
              }
            },
          };
        },
      });

      /** 这一列该不该有菜单 */
      const menuable = (col: VirtTableColumn<T>): boolean => {
        if (col.children?.length) return false; // 分组节点
        if (col.type && NO_MENU_TYPES.has(col.type)) return false;
        return !options.disabled?.(col);
      };

      const openFor = (col: VirtTableColumn<T>, anchor: HTMLElement): void => {
        // 另一列的菜单开着时先关掉：`panel.open()` 的语义是「已经开着就什么都不做」，
        // 不先关的话点第二列的 ☰ 会看到第一列的菜单赖在那儿
        panel.close();
        currentCol = col;
        openKey = col.key;
        anchor.classList.add('vt-column-menu-icon--open');
        panel.open(anchor);
      };

      ctx.on('onHeaderCellRendered', (th, col) => {
        if (!menuable(col as VirtTableColumn<T>)) return;
        th.classList.add('vt-th--has-menu');
        const icon = document.createElement('span');
        icon.className = 'vt-column-menu-icon';
        icon.setAttribute('role', 'button');
        icon.setAttribute('aria-haspopup', 'menu');
        icon.setAttribute('tabindex', '0');
        icon.innerHTML = MENU_ICON_SVG;
        if (openKey === col.key) icon.classList.add('vt-column-menu-icon--open');
        const trigger = (e: Event): void => {
          // 否则会连带触发表头排序 —— 与漏斗图标同一个理由
          e.stopPropagation();
          e.preventDefault();
          if (openKey === col.key) {
            panel.close(); // 点同一颗 ☰ 第二下 = 收起
            return;
          }
          openFor(col as VirtTableColumn<T>, icon);
        };
        icon.addEventListener('click', trigger);
        icon.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') trigger(e);
        });
        th.appendChild(icon);
      });

      /*
       * 列结构变化后表头整块重建，锚点已经不在文档里了 —— 浮层必须关掉。
       * 与 `vtColumnFilter` 同一条。注意菜单里的动作（冻结 / 隐藏 / 自适应宽 / 分组）
       * 本身就会改列，所以每一项都先 `p.close()` 再动手，避免在这条里被二次关闭。
       */
      ctx.on('onColumnsChanged', () => panel.close());

      return {
        api: {
          /** 打开某列的菜单。`anchor` 不给就贴那一列表头上的 ☰ */
          openColumnMenu: (colKey: string, anchor?: HTMLElement) => {
            const col = ctx.getColumns().find((c) => c.key === colKey);
            if (!col || !menuable(col as VirtTableColumn<T>)) return;
            const el =
              anchor ??
              ctx.theadEl.querySelector<HTMLElement>(
                `th[data-col-key="${colKey}"] .vt-column-menu-icon`,
              );
            if (el) openFor(col as VirtTableColumn<T>, el);
          },
          closeColumnMenu: () => panel.close(),
          isColumnMenuOpen: (colKey?: string) =>
            colKey === undefined ? openKey !== null : openKey === colKey,
        },
        destroy: () => panel.destroy(),
      };
    },
  };
}
