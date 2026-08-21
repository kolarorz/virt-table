/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PluginContext, VirtTablePlugin } from '../plugin';
import type { GroupSpec, VirtTableColumn } from '../index';
import type { VirtTableLocale } from '../locale';
import type { ToolbarItem, ToolbarService } from './toolbar';
import type { PanelContext, PanelHandle } from '../internal/panel-ui';
import { createStandalonePanel } from '../internal/panel-popup';
import { TOOLBAR_ORDER } from '../internal/toolbar-order';
import { inferGroupColumns, toOptions } from '../internal/panel-columns';
import './group-config.css';

/**
 * 分组配置插件：一列「第几级 + 按哪一列 + 组标题怎么排」的规则行。
 *
 * ```ts
 * // 装了工具栏 → 自动变成工具栏上的「分组」那颗按钮
 * new VirtTable(el, { columns, plugins: [vtToolbar(), vtGroupConfig()] });
 *
 * // 没装工具栏 → 按钮放哪儿由你决定
 * btn.onclick = () => table.toggleGroupConfig(btn);
 * ```
 *
 * 候选列是**推断**出来的：取值种类不多、不是日期、且至少有一个取值重复 ——
 * 逐行唯一的列（名称、编号）按它分组等于把表打散，不是分组。
 *
 * 落地走核心公开的 `setGroupConfig()`，与列头分组入口、状态持久化是同一份状态。
 *
 * 暴露 API：`toggleGroupConfig(anchor?)` / `openGroupConfig(anchor?)` /
 * `closeGroupConfig()` / `isGroupConfigOpen()`
 */
export interface GroupConfigOptions {
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

/** 工具栏上这一项的 key。**仍是 `'group'`** —— `toggleToolbarPanel('group')` 是已公开的契约 */
export const GROUP_CONFIG_KEY = 'group';



const ICON =
  '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" ' +
  'stroke-width="1.8" stroke-linecap="round" aria-hidden="true">' +
  '<path d="M4 6h16M8 12h12M8 18h12M4 11v8"/></svg>';

/** 一级分组的草稿。`field` 为空 = 还没选，不落地 */
type GroupDraft = { field: string; sort?: 'asc' | 'desc' };

export function buildGroupPanel<T extends Record<string, any>>(
  ctx: PluginContext<T>,
  panel: PanelContext,
  texts: Texts,
): PanelHandle {
  const { ui } = panel;
  let draft: GroupDraft[] = ctx.table.getGroupConfig().map((g) => ({ ...g }));

  function apply(): void {
    const levels: GroupSpec[] = draft
      .filter((g) => g.field)
      .map((g) => (g.sort ? { field: g.field, sort: g.sort } : { field: g.field }));
    ctx.table.setGroupConfig(levels);
    panel.refresh();
  }

  function render(): void {
    panel.el.textContent = '';
    ui.title(texts.group);

    const candidates = inferGroupColumns(ctx);
    if (candidates.length === 0) {
      ui.empty(texts.noGroupColumn);
      panel.resize();
      return;
    }
    if (draft.length === 0) ui.empty(texts.groupEmpty);

    draft.forEach((level, i) => {
      const row = ui.ruleRow();
      const cap = document.createElement('span');
      cap.className = 'vt-toolbar-rule-label';
      cap.textContent = texts.groupLevel(i + 1);
      row.appendChild(cap);

      row.appendChild(
        ui.select({
          options: toOptions(candidates),
          value: level.field || null,
          placeholder: texts.addRule,
          emptyText: texts.noGroupColumn,
          minWidth: 120,
          onChange: (key) => {
            level.field = key;
            apply();
            render();
          },
        }).el,
      );

      /*
       * 三档而不是两档：`GroupSpec.sort` 不给时分组标题按**数据里第一次出现的顺序**排，
       * 那是核心的默认、也是一个有意义的选择（数据本来就是按阶段顺序录的）。
       * 只给升/降的话一旦点了就再也回不去。
       */
      row.appendChild(
        ui.segmented(
          [
            { value: '', label: texts.groupNatural, title: texts.groupNaturalHint },
            { value: 'asc', label: texts.asc },
            { value: 'desc', label: texts.desc },
          ],
          level.sort ?? '',
          (v) => {
            level.sort = v === '' ? undefined : (v as 'asc' | 'desc');
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

    const add = ui.addButton(texts.addRule, () => {
      // 默认挑第一个还没用掉的列：加一级的意图是「再按一个维度分」，不是「再分一次同一个」
      const used = new Set(draft.map((g) => g.field));
      const next = candidates.find((c) => !used.has(c.key));
      draft.push({ field: next?.key ?? '' });
      if (next) apply();
      render();
    });
    add.disabled = draft.length >= candidates.length;

    if (draft.some((g) => g.field)) {
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
export function groupConfigToolbarItem<T extends Record<string, any>>(
  ctx: PluginContext<T>,
  texts: () => Texts,
): ToolbarItem {
  return {
    key: GROUP_CONFIG_KEY,
    label: () => texts().group,
    icon: ICON,
    order: TOOLBAR_ORDER.groupConfig,
    badge: () => ctx.table.getGroupConfig().length,
    panel: (p) => buildGroupPanel<T>(ctx, p, texts()),
  };
}

export function vtGroupConfig<T extends Record<string, any> = any>(
  options: GroupConfigOptions = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtGroupConfig',
    setup(ctx: PluginContext<T>) {
      const texts = (): Texts => ({ ...ctx.getLocale().toolbar, ...options.texts });

      /** 没装工具栏时走这条：自己开浮层 */
      const standalone = createStandalonePanel(ctx, {
        className: `vt-toolbar-popup--${GROUP_CONFIG_KEY}`,
        minWidth: 300,
        build: (panel) => buildGroupPanel<T>(ctx, panel, texts()),
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
        unregister = toolbar?.register(groupConfigToolbarItem(ctx, texts)) ?? null;
      });

      return {
        api: {
          toggleGroupConfig: (anchor?: HTMLElement) =>
            toolbar ? toolbar.toggle(GROUP_CONFIG_KEY, anchor) : standalone.toggle(anchor),
          openGroupConfig: (anchor?: HTMLElement) =>
            toolbar ? toolbar.open(GROUP_CONFIG_KEY, anchor) : standalone.open(anchor),
          closeGroupConfig: () => (toolbar ? toolbar.close() : standalone.close()),
          isGroupConfigOpen: () => (toolbar ? toolbar.isOpen(GROUP_CONFIG_KEY) : standalone.isOpen()),
        },
        destroy() {
          unregister?.();
          standalone.destroy();
        },
      };
    },
  };
}
