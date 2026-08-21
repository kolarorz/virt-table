/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PluginContext, VirtTablePlugin } from '../plugin';
import type { VirtTableLocale } from '../locale';
import type { ToolbarItem, ToolbarService } from './toolbar';
import type { PanelContext, PanelHandle } from '../internal/panel-ui';
import { createStandalonePanel } from '../internal/panel-popup';
import { TOOLBAR_ORDER } from '../internal/toolbar-order';
import './row-height-config.css';

/**
 * 行高设置插件：**低 / 中 / 高**三档。
 *
 * ```ts
 * // 装了工具栏 → 自动变成工具栏上的「行高」那颗按钮
 * new VirtTable(el, { columns, fixedSize: true, estimatedSize: 40,
 *                     plugins: [vtToolbar(), vtRowHeightConfig()] });
 *
 * // 没装工具栏 → 按钮放哪儿由你决定
 * btn.onclick = () => table.toggleRowHeightConfig(btn);
 * ```
 *
 * ## 一档 = 两件事，这才是它存在的理由
 *
 * 核心早就带了三档**密度**（`.vt-root--compact` / 默认 / `.vt-root--loose`，改的是单元格内边距
 * 与字号），而行高在虚拟化里由 `estimatedSize` 决定 —— 两者必须一起换：
 *
 * | 档 | 密度类 | 行高 |
 * | --- | --- | --- |
 * | 低 `compact` | `.vt-root--compact` | 30px（= 19 行高 + 5×2 内边距 + 1 边框） |
 * | 中 `default` | 无 | 40px（= 21 + 9×2 + 1） |
 * | 高 `loose` | `.vt-root--loose` | 50px（= 21 + 14×2 + 1） |
 *
 * 三个等式由 `css-contract.test.ts` 钉住（改了密度 token 就会红），所以这里的 30/40/50
 * 不是魔数，是那三个等式的解。**只做一半的后果**：只加类 → 行内容变矮但每行仍占 40px，
 * 行之间露出空白；只改行高 → 内容撑不开或被裁。这个插件的全部价值就是把两件事绑在一起。
 *
 * ## 只在固定行高下开放
 *
 * `fixedSize: true` 时行高是**你说了算**的（核心按 `estimatedSize` 摆位，不测量）。
 * 不定高模式下每行多高由内容决定、`estimatedSize` 只是未测量行的估算值 —— 那时给用户
 * 三档「行高」是句空话。所以没开 `fixedSize` 时面板只说明原因，`setRowHeightLevel()` 也不生效。
 *
 * 暴露 API：`setRowHeightLevel(level)` / `getRowHeightLevel()` /
 * `toggleRowHeightConfig(anchor?)` / `openRowHeightConfig(anchor?)` /
 * `closeRowHeightConfig()` / `isRowHeightConfigOpen()`
 */
export type RowHeightLevel = 'compact' | 'default' | 'loose';

export interface RowHeightConfigOptions {
  /**
   * 初始档。**给了就立刻应用**（覆盖你在 options 里写的 `estimatedSize`）；
   * 不给则从当前 `estimatedSize` 反推一档回显，一个字节都不改。
   */
  value?: RowHeightLevel;
  /**
   * 每档的行高（px）。默认 `{ compact: 30, default: 40, loose: 50 }` —— 与核心三档密度
   * 的行高等式一一对应。**改了密度 token 才需要动它**（例如自定义了 `--vt-density-*`）。
   */
  sizes?: Partial<Record<RowHeightLevel, number>>;
  /** 切档后触发。持久化用（存下来下次开表时当 `value` 传回来） */
  onChange?: (level: RowHeightLevel, size: number) => void;
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

/** 工具栏上这一项的 key */
export const ROW_HEIGHT_CONFIG_KEY = 'rowHeight';



/** 三档的默认行高。见文件头注那张表：每个数都是对应密度下的行高等式的解 */
const DEFAULT_SIZES: Record<RowHeightLevel, number> = {
  compact: 30,
  default: 40,
  loose: 50,
};

/** 档 → 加在 `.vt-root` 上的密度类（中档不加类，用核心默认那套 token） */
const LEVEL_CLASS: Record<RowHeightLevel, string> = {
  compact: 'vt-root--compact',
  default: '',
  loose: 'vt-root--loose',
};

const LEVELS: RowHeightLevel[] = ['compact', 'default', 'loose'];

const ICON =
  '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" ' +
  'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M4 5h16M4 19h16"/><path d="M12 8.5v7M9.8 10.7 12 8.5l2.2 2.2M9.8 13.3 12 15.5l2.2-2.2"/></svg>';

/** 一个可复用的档位控制器：算档、落档、回显。面板与插件 API 都走它 */
interface LevelController {
  /** 三档各自的行高 */
  sizes: Record<RowHeightLevel, number>;
  /** 表格开了固定行高吗 —— 没开的话这个插件不工作，只解释原因 */
  enabled(): boolean;
  current(): RowHeightLevel;
  apply(level: RowHeightLevel): void;
}

function createController<T extends Record<string, any>>(
  ctx: PluginContext<T>,
  options: RowHeightConfigOptions,
): LevelController {
  const sizes = { ...DEFAULT_SIZES, ...options.sizes };
  /**
   * 当前档。**不从 DOM 的类名反推**：使用方可能自己在外层容器上加了 `.vt-compact`
   * （那也是核心支持的用法），那时类名说的是「祖先给的密度」，不是本插件的状态。
   */
  let level: RowHeightLevel =
    options.value ?? (LEVELS.find((l) => sizes[l] === ctx.table.getRowHeight()) ?? 'default');

  const enabled = (): boolean => ctx.getOptions().fixedSize === true;

  const apply = (next: RowHeightLevel): void => {
    if (!enabled()) {
      console.warn(
        `[vtRowHeightConfig] 表格没开 fixedSize，行高由内容决定 —— setRowHeightLevel('${next}') 被忽略。`,
      );
      return;
    }
    level = next;
    /*
     * 密度类加在 `.vt-root` **自己**身上（不是外层容器）：核心的密度 token 走
     * `--vt-density-*` 间接层，root 上和祖先上都能生效，而加在 root 上不会碰使用方的容器。
     */
    for (const l of LEVELS) {
      const cls = LEVEL_CLASS[l];
      if (cls) ctx.rootEl.classList.toggle(cls, l === next);
    }
    // 行高与密度必须一起换，理由见文件头注
    ctx.table.setRowHeight(sizes[next]);
    options.onChange?.(next, sizes[next]);
  };

  // 显式给了初始档就立刻落地（不给则只是回显当前 estimatedSize 对应的那一档）
  if (options.value) apply(options.value);

  return { sizes, enabled, current: () => level, apply };
}

/**
 * 面板：一行三档。
 *
 * @internal 给 `plugins/toolbar.ts` 与本文件用，不在 barrel 里导出。
 */
export function buildRowHeightPanel<T extends Record<string, any>>(
  ctx: PluginContext<T>,
  panel: PanelContext,
  texts: Texts,
  ctl: LevelController,
): PanelHandle {
  const { ui } = panel;

  function render(): void {
    panel.el.textContent = '';
    ui.title(texts.rowHeight);

    if (!ctl.enabled()) {
      // 与「没有可排序的列」同款：说清为什么现在没得选，而不是给一排点了没反应的按钮
      ui.empty(texts.rowHeightFixedOnly);
      panel.resize();
      return;
    }

    const seg = ui.segmented(
      [
        { value: 'compact', label: texts.rowHeightLow, title: `${ctl.sizes.compact}px` },
        { value: 'default', label: texts.rowHeightMedium, title: `${ctl.sizes.default}px` },
        { value: 'loose', label: texts.rowHeightHigh, title: `${ctl.sizes.loose}px` },
      ],
      ctl.current(),
      (v) => {
        ctl.apply(v as RowHeightLevel);
        panel.refresh();
        render();
      },
    );
    // 三档等宽（「低 / 中 / 高」字宽不同，不给最小宽度三颗按钮会宽窄不一）
    seg.classList.add('vt-row-height-seg');
    ui.row(texts.rowHeight, seg);
    ui.hint(texts.rowHeightHint(ctl.sizes[ctl.current()]));
    panel.resize();
  }

  render();
  return { refresh: render };
}

/**
 * 工具栏上这一项的描述。工具栏与插件自注册都走这里。
 *
 * @internal
 */
export function rowHeightConfigToolbarItem<T extends Record<string, any>>(
  ctx: PluginContext<T>,
  texts: () => Texts,
  ctl: LevelController,
): ToolbarItem {
  const labelOf = (level: RowHeightLevel): string => {
    const t = texts();
    return level === 'compact' ? t.rowHeightLow : level === 'loose' ? t.rowHeightHigh : t.rowHeightMedium;
  };
  return {
    key: ROW_HEIGHT_CONFIG_KEY,
    label: () => texts().rowHeight,
    icon: ICON,
    order: TOOLBAR_ORDER.rowHeight,
    /*
     * 徽标显示当前档，**中档不显示**（那是默认值，点亮按钮会让人以为自己改过什么）。
     * 与别的面板项一个规矩：徽标在，说明「这里有生效的设置」。
     */
    badge: () => (ctl.enabled() && ctl.current() !== 'default' ? labelOf(ctl.current()) : null),
    panel: (p) => buildRowHeightPanel<T>(ctx, p, texts(), ctl),
  };
}

export function vtRowHeightConfig<T extends Record<string, any> = any>(
  options: RowHeightConfigOptions = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtRowHeightConfig',
    setup(ctx: PluginContext<T>) {
      const texts = (): Texts => ({ ...ctx.getLocale().toolbar, ...options.texts });
      const ctl = createController(ctx, options);

      /** 没装工具栏时走这条：自己开浮层 */
      const standalone = createStandalonePanel(ctx, {
        className: `vt-toolbar-popup--${ROW_HEIGHT_CONFIG_KEY}`,
        minWidth: 260,
        build: (panel) => buildRowHeightPanel<T>(ctx, panel, texts(), ctl),
      });

      let toolbar: ToolbarService | null = null;
      let unregister: (() => void) | null = null;

      /*
       * **在 `onMounted` 里 inject**：服务表所有插件共享，而 `onMounted` 排在全部 `setup` 之后 ——
       * 于是「先写 vtToolbar 还是先写本插件」都成立（顺序无关的可选依赖）。
       *
       * ⚠️ 与四个自带面板不同，**工具栏不自带这一项** —— 想要这颗按钮就得装本插件。
       */
      ctx.on('onMounted', () => {
        toolbar = ctx.inject<ToolbarService>('toolbar') ?? null;
        // `toolbar: false` = 不占工具栏的位置，但**面板仍然可用**（走下面那组 API 自己开浮层）
        if (options.toolbar === false) toolbar = null;
        unregister = toolbar?.register(rowHeightConfigToolbarItem(ctx, texts, ctl)) ?? null;
      });

      return {
        api: {
          setRowHeightLevel: (level: RowHeightLevel) => {
            ctl.apply(level);
            // 开着的面板与工具栏徽标都要跟上（从 API 改档也算改档）
            toolbar?.refresh();
            if (toolbar) toolbar.isOpen(ROW_HEIGHT_CONFIG_KEY) && toolbar.close();
            else standalone.refresh();
          },
          getRowHeightLevel: () => ctl.current(),
          toggleRowHeightConfig: (anchor?: HTMLElement) =>
            toolbar ? toolbar.toggle(ROW_HEIGHT_CONFIG_KEY, anchor) : standalone.toggle(anchor),
          openRowHeightConfig: (anchor?: HTMLElement) =>
            toolbar ? toolbar.open(ROW_HEIGHT_CONFIG_KEY, anchor) : standalone.open(anchor),
          closeRowHeightConfig: () => (toolbar ? toolbar.close() : standalone.close()),
          isRowHeightConfigOpen: () =>
            toolbar ? toolbar.isOpen(ROW_HEIGHT_CONFIG_KEY) : standalone.isOpen(),
        },
        destroy() {
          unregister?.();
          standalone.destroy();
        },
      };
    },
  };
}
