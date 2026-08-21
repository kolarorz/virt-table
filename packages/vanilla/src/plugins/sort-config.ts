/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PluginContext, VirtTablePlugin } from '../plugin';
import type { VirtTableColumn } from '../index';
import type { SortSpec } from '../pipeline';
import type { VirtTableLocale } from '../locale';
import type { ToolbarItem, ToolbarService } from './toolbar';
import type { PanelContext, PanelHandle } from '../internal/panel-ui';
import { createStandalonePanel } from '../internal/panel-popup';
import { TOOLBAR_ORDER } from '../internal/toolbar-order';
import { inferSortColumns, toOptions } from '../internal/panel-columns';
import './sort-config.css';

/**
 * 排序配置插件：一列「按哪一列 + 升还是降」的规则行。
 *
 * ```ts
 * // 装了工具栏 → 自动变成工具栏上的「排序」那颗按钮
 * new VirtTable(el, { columns, plugins: [vtToolbar(), vtSortConfig()] });
 *
 * // 没装工具栏 → 按钮放哪儿由你决定
 * btn.onclick = () => table.toggleSortConfig(btn);
 * ```
 *
 * 候选列**看列配置不看数据**：`sortable: false` 是使用方明确说过「这列不排序」，面板不给
 * 绕过去的入口；没写 `sortable` 的列一律可选（`sort()` 对任何列都有效）。
 *
 * 落地走核心公开的 `setState({ sort })`，所以与列头点击排序是同一份状态 ——
 * 在面板里排的序，列头上的箭头也会亮。表格没开 `sortMode: 'multiple'` 时只给一条规则并说明原因。
 *
 * 暴露 API：`toggleSortConfig(anchor?)` / `openSortConfig(anchor?)` /
 * `closeSortConfig()` / `isSortConfigOpen()`
 */
export interface SortConfigOptions {
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

/** 工具栏上这一项的 key。**仍是 `'sort'`** —— `toggleToolbarPanel('sort')` 是已公开的契约 */
export const SORT_CONFIG_KEY = 'sort';



const ICON =
  '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" ' +
  'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M7 4v16M4 17l3 3 3-3M14 7h6M14 12h4M14 17h2"/></svg>';

/** 面板里的一条排序规则。`colKey` 为空 = 刚点「添加」还没选列，**不落地** */
type SortDraft = { colKey: string; order: 'asc' | 'desc' };

export function buildSortPanel<T extends Record<string, any>>(
  ctx: PluginContext<T>,
  panel: PanelContext,
  texts: Texts,
): PanelHandle {
  const { ui } = panel;
  let draft: SortDraft[] = readSort();

  function readSort(): SortDraft[] {
    return (ctx.table.getState().sort ?? []).map((s) => ({ colKey: s.colKey, order: s.order }));
  }

  function apply(): void {
    const sort: SortSpec[] = draft
      .filter((r) => r.colKey)
      .map((r) => ({ colKey: r.colKey, order: r.order }));
    const st = ctx.table.getState();
    ctx.table.setState({ version: st.version, sort });
    panel.refresh();
  }

  function render(): void {
    panel.el.textContent = '';
    ui.title(texts.sort);

    const candidates = inferSortColumns(ctx);
    if (candidates.length === 0) {
      ui.empty(texts.noSortColumn);
      panel.resize();
      return;
    }
    if (draft.length === 0) ui.empty(texts.sortEmpty);

    draft.forEach((rule, i) => {
      const row = ui.ruleRow();
      row.appendChild(
        ui.select({
          options: toOptions(candidates),
          value: rule.colKey || null,
          placeholder: texts.addRule,
          emptyText: texts.noSortColumn,
          minWidth: 140,
          onChange: (key) => {
            rule.colKey = key;
            apply();
            render();
          },
        }).el,
      );
      row.appendChild(
        ui.segmented(
          [
            { value: 'asc', label: texts.asc },
            { value: 'desc', label: texts.desc },
          ],
          rule.order,
          (v) => {
            rule.order = v as 'asc' | 'desc';
            apply();
            render();
          },
        ),
      );
      row.appendChild(
        ui.iconButton(texts.remove, ui.icons.trash, () => {
          draft.splice(i, 1);
          apply();
          render();
        }),
      );
    });

    /*
     * 单列排序模式下**不给「添加」并说明原因**：`setState` 在非 multiple 下会 `slice(0, 1)`
     * 静默截断 —— 界面上先说清，比让人加了第二条又看它凭空消失好。
     */
    const multiple = ctx.getOptions().sortMode === 'multiple';
    if (multiple || draft.length === 0) {
      ui.addButton(texts.addRule, () => {
        const used = new Set(draft.map((r) => r.colKey));
        const next = candidates.find((c) => !used.has(c.key));
        draft.push({ colKey: next?.key ?? '', order: 'asc' });
        if (next) apply();
        render();
      });
    } else {
      ui.hint(texts.sortSingleOnly);
    }

    if (draft.some((r) => r.colKey)) {
      ui.footer().appendChild(
        ui.button(texts.clear, 'plain', () => {
          draft = [];
          apply();
          render();
        }),
      );
    }
    panel.resize();
  }

  render();
  return {};
}

/**
 * 工具栏上这一项的描述。工具栏自带的那份与本插件注册的那份都走这里。
 *
 * @internal 给 `plugins/toolbar.ts` 与本文件用，不在 barrel 里导出。
 */
export function sortConfigToolbarItem<T extends Record<string, any>>(
  ctx: PluginContext<T>,
  texts: () => Texts,
): ToolbarItem {
  return {
    key: SORT_CONFIG_KEY,
    label: () => texts().sort,
    icon: ICON,
    order: TOOLBAR_ORDER.sortConfig,
    badge: () => (ctx.table.getState().sort ?? []).length,
    panel: (p) => buildSortPanel<T>(ctx, p, texts()),
  };
}

export function vtSortConfig<T extends Record<string, any> = any>(
  options: SortConfigOptions = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtSortConfig',
    setup(ctx: PluginContext<T>) {
      const texts = (): Texts => ({ ...ctx.getLocale().toolbar, ...options.texts });

      /** 没装工具栏时走这条：自己开浮层 */
      const standalone = createStandalonePanel(ctx, {
        className: `vt-toolbar-popup--${SORT_CONFIG_KEY}`,
        minWidth: 300,
        build: (panel) => buildSortPanel<T>(ctx, panel, texts()),
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
        unregister = toolbar?.register(sortConfigToolbarItem(ctx, texts)) ?? null;
      });

      return {
        api: {
          toggleSortConfig: (anchor?: HTMLElement) =>
            toolbar ? toolbar.toggle(SORT_CONFIG_KEY, anchor) : standalone.toggle(anchor),
          openSortConfig: (anchor?: HTMLElement) =>
            toolbar ? toolbar.open(SORT_CONFIG_KEY, anchor) : standalone.open(anchor),
          closeSortConfig: () => (toolbar ? toolbar.close() : standalone.close()),
          isSortConfigOpen: () => (toolbar ? toolbar.isOpen(SORT_CONFIG_KEY) : standalone.isOpen()),
        },
        destroy() {
          unregister?.();
          standalone.destroy();
        },
      };
    },
  };
}
