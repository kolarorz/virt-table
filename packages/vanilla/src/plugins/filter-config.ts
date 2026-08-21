/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PluginContext, VirtTablePlugin } from '../plugin';
import type { FilterModel, VirtTableColumn } from '../index';
import type { VirtTableLocale } from '../locale';
import type { ToolbarItem, ToolbarService } from './toolbar';
import type { PanelContext, PanelHandle } from '../internal/panel-ui';
import { createStandalonePanel } from '../internal/panel-popup';
import { TOOLBAR_ORDER } from '../internal/toolbar-order';
import { VtFilterBuilder } from '../components/vt-filter-builder';
import { countConditions } from '../filter-model';
import './filter-config.css';

/**
 * 高级筛选插件：把 `VtFilterBuilder`（AND / OR 条件树）装进一个浮层。
 *
 * ```ts
 * // 装了工具栏 → 自动变成工具栏上的「筛选」那颗按钮
 * new VirtTable(el, { columns, plugins: [vtToolbar(), vtFilterConfig()] });
 *
 * // 没装工具栏 → 按钮放哪儿由你决定
 * btn.onclick = () => table.toggleFilterConfig(btn);
 * ```
 *
 * ## 与 `vtColumnFilter` 的区别（两个都叫「筛选」，但不是一件事）
 *
 * | | 入口 | 状态 |
 * | --- | --- | --- |
 * | `vtColumnFilter` | 表头上的漏斗，一列一个 | `columnFilters`（每列一组勾选值） |
 * | 本插件 | 一个面板，跨列写条件树 | `filterModel`（AND / OR + 算子） |
 *
 * 两套状态独立，最终 **AND** 在一起。装哪个、装几个都成立。
 *
 * 落地走核心公开的 `setState({ filterModel })`，所以与状态持久化、`vtViews` 的视图还原、
 * 撤销/重做是同一份状态。
 *
 * 暴露 API：`toggleFilterConfig(anchor?)` / `openFilterConfig(anchor?)` /
 * `closeFilterConfig()` / `isFilterConfigOpen()`
 */
export interface FilterConfigOptions {
  /** 文案覆盖。不给则取表格当前 locale 的 `toolbar` 块（跟随 `setLocale`） */
  texts?: Partial<VirtTableLocale['toolbar']>;
  /**
   * 装了 `vtToolbar` 时要不要在工具栏上放这颗按钮，默认 `true`。
   *
   * `false` = 只提供 API（与命令式入口），按钮放哪儿由你决定 —— 与 `vtToolbar({ bar: false })`
   * 是同一件事的另一半：那个说「不画按钮条」，这个说「不占那条按钮条的位置」。
   */
  toolbar?: boolean;
}

type Texts = VirtTableLocale['toolbar'];

/** 工具栏上这一项的 key。**仍是 `'filter'`** —— `toggleToolbarPanel('filter')` 是已公开的契约 */
export const FILTER_CONFIG_KEY = 'filter';



const ICON =
  '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" ' +
  'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M4 5h16l-6 7v6l-4 2v-8z"/></svg>';

/** 高级筛选当前有几条生效条件 —— 按钮上的徽标 */
export function countActiveFilterConditions<T extends Record<string, any>>(
  ctx: PluginContext<T>,
): number {
  return countConditions(ctx.table.getState().filterModel ?? null);
}

/**
 * 「筛选」= 把 `VtFilterBuilder`（AND/OR 条件树）装进浮层。
 *
 * 它自带底部操作栏（应用 / 清空），刚好当面板的页脚。不传 `table` 给它（插件手里只有 `ctx`），
 * 所以落地走 `onApply` 回调 → `setState({ filterModel })`。
 *
 * **只接 `onApply`，不接 `onChange`**：徽标数的是「已经生效的条件数」，而 `onChange` 给的是
 * 编辑中的半成品（算子还没选完的那条也算），拿它刷徽标会显示一个还没作用到表格上的数字。
 */
export function buildFilterPanel<T extends Record<string, any>>(
  ctx: PluginContext<T>,
  panel: PanelContext,
  texts: Texts,
): PanelHandle {
  panel.ui.title(texts.filter);

  const columns = (ctx.table.getVisibleColumns() as VirtTableColumn<T>[]).filter((c) => !!c.title);
  if (columns.length === 0) {
    panel.ui.empty(texts.noFilterColumn);
    panel.resize();
    return {};
  }

  const box = document.createElement('div');
  box.className = 'vt-toolbar-filter';
  panel.el.appendChild(box);

  const builder = new VtFilterBuilder<T>({
    el: box,
    columns,
    model: ctx.table.getState().filterModel,
    // 逐字改一个数值就重算一遍全表不合适，让用户点「应用筛选」
    autoApply: false,
    // 文案跟随表格当前 locale（`setLocale()` 改过的话这里也是新的）
    texts: ctx.getLocale().filterBuilder,
    onApply: (model: FilterModel) => {
      const st = ctx.table.getState();
      ctx.table.setState({ version: st.version, filterModel: model });
      panel.refresh();
    },
  });

  panel.resize();
  return { destroy: () => builder.destroy() };
}

/**
 * 工具栏上这一项的描述。工具栏自带的那份与本插件注册的那份都走这里。
 *
 * @internal 给 `plugins/toolbar.ts` 与本文件用，不在 barrel 里导出。
 */
export function filterConfigToolbarItem<T extends Record<string, any>>(
  ctx: PluginContext<T>,
  texts: () => Texts,
): ToolbarItem {
  return {
    key: FILTER_CONFIG_KEY,
    label: () => texts().filter,
    icon: ICON,
    order: TOOLBAR_ORDER.filterConfig,
    badge: () => countActiveFilterConditions(ctx),
    panel: (p) => buildFilterPanel<T>(ctx, p, texts()),
  };
}

export function vtFilterConfig<T extends Record<string, any> = any>(
  options: FilterConfigOptions = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtFilterConfig',
    setup(ctx: PluginContext<T>) {
      const texts = (): Texts => ({ ...ctx.getLocale().toolbar, ...options.texts });

      /** 没装工具栏时走这条：自己开浮层 */
      const standalone = createStandalonePanel(ctx, {
        className: `vt-toolbar-popup--${FILTER_CONFIG_KEY}`,
        minWidth: 460,
        build: (panel) => buildFilterPanel<T>(ctx, panel, texts()),
      });

      let toolbar: ToolbarService | null = null;
      let unregister: (() => void) | null = null;

      /*
       * **在 `onMounted` 里 inject**：服务表所有插件共享，而 `onMounted` 排在全部 `setup` 之后 ——
       * 于是「先写 vtToolbar 还是先写本插件」都成立（顺序无关的可选依赖）。
       */
      ctx.on('onMounted', () => {
        toolbar = ctx.inject<ToolbarService>('toolbar') ?? null;
        // `toolbar: false` = 不占工具栏的位置，但**面板仍然可用**（走下面那组 API 自己开浮层）
        if (options.toolbar === false) toolbar = null;
        unregister = toolbar?.register(filterConfigToolbarItem(ctx, texts)) ?? null;
      });

      return {
        api: {
          toggleFilterConfig: (anchor?: HTMLElement) =>
            toolbar ? toolbar.toggle(FILTER_CONFIG_KEY, anchor) : standalone.toggle(anchor),
          openFilterConfig: (anchor?: HTMLElement) =>
            toolbar ? toolbar.open(FILTER_CONFIG_KEY, anchor) : standalone.open(anchor),
          closeFilterConfig: () => (toolbar ? toolbar.close() : standalone.close()),
          isFilterConfigOpen: () => (toolbar ? toolbar.isOpen(FILTER_CONFIG_KEY) : standalone.isOpen()),
        },
        destroy() {
          unregister?.();
          standalone.destroy();
        },
      };
    },
  };
}
