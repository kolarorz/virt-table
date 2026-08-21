/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PluginContext, VirtTablePlugin } from '../plugin';
import type { VirtTableColumn } from '../index';
import type { VirtTableLocale } from '../locale';
import { createPopup, type PopupHandle } from '../components/_popup';
import {
  createPanelUi,
  type PanelContext,
  type PanelHandle,
  type PanelUi,
} from '../internal/panel-ui';
import { fieldConfigToolbarItem, FIELD_CONFIG_KEY } from './field-config';
import { filterConfigToolbarItem, FILTER_CONFIG_KEY } from './filter-config';
import { groupConfigToolbarItem } from './group-config';
import { sortConfigToolbarItem } from './sort-config';
import './toolbar.css';

/**
 * 面板相关的三个类型仍从这里导出（`ToolbarPanelUi` / `ToolbarPanelContext` /
 * `ToolbarPanelHandle`）—— 定义已经搬到 `internal/panel-ui.ts`（四个面板插件不装工具栏也要用），
 * 但这三个名字是付费包与文档在用的公开面，不跟着搬。
 */
export type {
  PanelUi as ToolbarPanelUi,
  PanelContext as ToolbarPanelContext,
  PanelHandle as ToolbarPanelHandle,
};

/**
 * 工具栏插件：表格上方一条按钮，每颗点开一个面板。
 *
 * ```ts
 * new VirtTable(el, { columns, plugins: [vtToolbar()] });
 * ```
 *
 * ## 它是一个「贡献点」，不只是四颗内置按钮
 *
 * 表格类产品的工具栏最后总会长成十来颗按钮，而那些按钮**属于不同的能力**：列显隐属于表格、
 * 撤销属于撤销栈、甘特配置属于甘特。做成一颗颗写死在这里，等于让工具栏认识每一个能力；
 * 做成各自画一条自己的工具栏，用户就会得到三条按钮条。
 *
 * 所以这里只提供**摆放**：一个注册表 + 一套面板基元，谁有按钮谁自己来注册。
 *
 * ```ts
 * // 别的插件（或使用方）在自己的 setup / onMounted 里：
 * const toolbar = ctx.inject<ToolbarService>('toolbar');
 * const off = toolbar?.register({ key: 'undo', label: '撤销', onClick: () => undo() });
 * ```
 *
 * **可选依赖，且与插件声明顺序无关**：核心的服务表在所有插件间共享，而 `onMounted` 排在全部
 * `setup` 之后 —— 在 `onMounted` 里 `inject` 一定拿得到。拿不到（没装工具栏）就各自照旧提供
 * 命令式 API，使用方自己放按钮。付费插件因此对本插件**零运行时依赖**（只 `import type`）。
 *
 * ## 它自己一颗按钮都没有
 *
 * **要哪颗按钮就装哪个插件** —— 一条规则，零例外：
 *
 * ```ts
 * plugins: [vtToolbar(), ...vtToolbarPanels()]   // 想要那四颗面板，一行装齐
 * plugins: [vtToolbar(), vtSortConfig()]         // 只要排序那一颗
 * plugins: [vtToolbar(), vtSearch(), vtExport()] // 动作型的也是同一条路
 * ```
 *
 * 早先它「自带」字段配置 / 筛选 / 分组 / 排序四项，是为了 `vtToolbar()` 一行开箱。那个折中
 * 换来四条要记的规则（自带哪几个、不自带哪几个、装了插件会覆盖同 key 项、`canToggleColumn`
 * 两处都能传），还让 tree-shaking 永远摇不掉用不到的面板 —— `toolbar.css` 得 `@import`
 * 全部四份，「只要排序面板」也要吞下筛选管理器那 14KB。现在换成显式装载：规则一句话，
 * 体积按需。
 *
 * `bar: false` 仍在：不画那条按钮条，只提供 `toggleToolbarPanel(key, anchor)` ——
 * 按钮放哪儿由你决定（与各插件自己的 `toggleFieldConfig(anchor)` 那组 API、付费的 `vtViews`
 * 一个路子）。
 *
 * ## 谁来贡献按钮
 *
 * | 插件 | 按钮 | 落到哪 |
 * | --- | --- | --- |
 * | `vtFieldConfig` | 字段配置 | `setColumnVisible()` / `moveColumn()` |
 * | `vtFilterConfig` | 筛选 | `setState({ filterModel })` |
 * | `vtGroupConfig` | 分组 | `setGroupConfig()` |
 * | `vtSortConfig` | 排序 | `setState({ sort })` |
 * | `vtRowHeightConfig` | 行高 | `setRowHeight()` + 密度类 |
 * | `vtSearch` / `vtExport` | 搜索 / 导出 | 各自的能力 |
 * | 付费的甘特配置、撤销/重做 | 各自那颗 | 各自的运行时状态 |
 *
 * 前五个既能挂进工具栏、也能不装工具栏单独用（那时自己开浮层）；每个都有 `toolbar: false`
 * 表示「不占这条按钮条的位置」。**核心的那几个落的都是公开查询状态入口**，所以与列头点击排序、
 * 列头筛选下拉、状态持久化是同一份状态：在面板里排的序，列头上的箭头也会亮。
 *
 * 这张表里没有一行是本插件认识的 —— 它只提供摆放。付费甘特的「甘特图配置」证明这条贡献点
 * 必须存在（核心不可能认识甘特），既然它存在，让内置面板也走同一条路才是一致的。
 *
 * 暴露 API：`toggleToolbarPanel(key, anchor?)` / `openToolbarPanel(key, anchor?)` /
 * `closeToolbarPanel()` / `isToolbarPanelOpen(key?)` / `registerToolbarItem(item)` /
 * `refreshToolbar()`
 */

/**
 * 工具栏上的一项。**两型**：
 *
 * - **面板型**（给 `panel`）：点一下开浮层，内容由 `panel(ctx)` 往 `ctx.el` 里画；
 * - **动作型**（给 `onClick`）：点一下就干活，没有浮层（撤销 / 重做 / 打开搜索框）。
 *
 * 两个都给时以 `panel` 为准（同时又开浮层又执行动作没有合理语义）。
 */
export interface ToolbarItem {
  /** 唯一 key。重复注册后者被拒并告警 */
  key: string;
  /**
   * 按钮文字。**给函数就能跟随 `setLocale()`** —— 每次重绘现取；给字符串则是定死的。
   * 内置项一律用函数（核心的语言包是可切的）。
   */
  label: string | (() => string);
  /** SVG 字符串（`innerHTML` 插入）。不给就只有文字 */
  icon?: string;
  /** 靠左还是靠右，默认 `'left'`。「设置类」入口习惯上靠右 */
  side?: 'left' | 'right';
  /** 同侧排序，小的在前；默认 0（内置项用 10 / 20 / 30 / 40，留出插空间） */
  order?: number;
  /** 鼠标停留提示。不给就用 `label`。同样支持函数 */
  title?: string | (() => string);
  /**
   * 生效数量：数字或短文本，画在**图标与文字之间**（「1 分组」）。返回 `0` / `null` / `''`
   * = 不显示，按钮也不加 `is-active`。
   *
   * 短是硬要求 —— 它与标签同一行，长文本会把按钮撑开。一两个字符最好（数量、档位名）。
   *
   * **每次刷新都现读**，所以不必在状态变化时同步它 —— 调 `refresh()` 就行。
   */
  badge?: () => number | string | null | undefined;
  /** 置灰。动作型常用（撤销栈空了） */
  disabled?: () => boolean;
  /** 面板型：往 `ctx.el` 里画内容，返回收尾钩子 */
  panel?: (ctx: PanelContext) => PanelHandle | void;
  /** 动作型：点一下就执行。`anchor` 是按钮本身（要自己开浮层时当锚点用） */
  onClick?: (anchor: HTMLElement) => void;
}

/** 别的插件通过 `ctx.inject('toolbar')` 拿到的服务 */
export interface ToolbarService {
  /** 注册一项，返回反注册函数（在自己的 `destroy` 里调） */
  register(item: ToolbarItem): () => void;
  /**
   * 开合某一项的面板。
   *
   * 贡献方常要「用自己的 API 把面板打开」（甘特的 `toggleGanttConfig(btn)` 就是），
   * 而它手里只有这个服务 —— 没有这条的话只能去 `ctx.table` 上摸工具栏注入的实例方法，
   * 那是插件不该做的事（`VirtTableHost` 白名单里没有别的插件的 API）。
   *
   * `anchor` 不给就贴工具栏上那颗按钮；`bar: false` 时必须给。
   */
  toggle(key: string, anchor?: HTMLElement): void;
  /** 打开某一项的面板；已经开着就什么都不做 */
  open(key: string, anchor?: HTMLElement): void;
  /** 关掉当前打开的面板（同时只允许开一个，所以不必给 key） */
  close(): void;
  /** 某一项的面板开着吗；不给 `key` 问的是「有面板开着吗」 */
  isOpen(key?: string): boolean;
  /** 重算所有按钮的徽标与禁用态 */
  refresh(): void;
  has(key: string): boolean;
  /** 真的画出那条按钮条了吗（`bar: false` 时为 false） */
  readonly hasBar: boolean;
}

export interface ToolbarOptions {
  /**
   * 画不画那条按钮条，默认 `true`。
   *
   * `false` = 只提供面板与命令式 API，按钮放哪儿由使用方决定。
   */
  bar?: boolean;
  /**
   * 按钮条挂进哪个容器。不给时的解析顺序：
   * 别的插件通过 `provide('toolbarSlot', () => el)` 提供的槽（甘特用它让按钮条横跨
   * 任务面板与时间轴）→ 自动在 `.vt-root` 外面包一层。
   */
  mount?: HTMLElement | (() => HTMLElement | null);
  /** 文案覆盖。不给则取表格当前 locale 的 `toolbar` 块（跟随 `setLocale`） */
  texts?: Partial<VirtTableLocale['toolbar']>;
}

export function vtToolbar<T extends Record<string, any> = any>(
  options: ToolbarOptions = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtToolbar',
    setup(ctx: PluginContext<T>) {
      const texts = (): VirtTableLocale['toolbar'] => ({
        ...ctx.getLocale().toolbar,
        ...options.texts,
      });

      /**
       * 注册表。**只有一张** —— 每一项都是别人 `register()` 进来的（面板插件、`vtSearch`、
       * 付费包、使用方自己）。`Map` 保插入序，同侧再按 `order` 稳定排序。
       */
      const items = new Map<string, ToolbarItem>();

      const itemOf = (key: string): ToolbarItem | undefined => items.get(key);
      /** key → 按钮，`bar: false` 时这张表是空的 */
      const buttons = new Map<string, { btn: HTMLButtonElement; badgeEl: HTMLElement }>();

      let barEl: HTMLElement | null = null;
      /** 自动包出来的那层外壳（只有自己包过才在 destroy 里拆） */
      let shellEl: HTMLElement | null = null;
      /**
       * 按钮条是怎么挂上去的。决定它要不要**接管表格那张卡片的上半截**：
       *
       * - `'shell'`：我们自己包的壳，按钮条与表格**同宽、正好贴在它上面** → 可以接管；
       * - `'slot'`：别的插件给的槽（甘特）→ 那边的组件外缘由它自己定（甘特的时间轴 pane
       *   压根没有边框，工具栏画一圈会在右侧留一条悬空的 1px），只收圆角不接边框；
       * - `'mount'`：使用方给的容器 → 一概不碰他的外观。
       */
      let mountedBy: 'shell' | 'slot' | 'mount' | null = null;
      let mounted = false;

      /** 当前开着的那一个面板。**同时只允许开一个** */
      let open: {
        key: string;
        popup: PopupHandle;
        handle: PanelHandle | void;
        btn: HTMLElement;
      } | null = null;

      // ---------------- 注册表 ----------------

      const sorted = (side: 'left' | 'right'): ToolbarItem[] =>
        [...items.values()]
          .filter((it) => (it.side ?? 'left') === side)
          .map((it, i) => ({ it, i }))
          .sort((a, b) => (a.it.order ?? 0) - (b.it.order ?? 0) || a.i - b.i)
          .map((x) => x.it);

      const register = (item: ToolbarItem): (() => void) => {
        // 两个贡献方抢同一个 key —— 后者被拒（先到先得，且说清是谁撞了）
        if (items.has(item.key)) {
          console.warn(`[vtToolbar] 工具栏项 "${item.key}" 重复注册，已忽略后者。`);
          return () => {};
        }
        items.set(item.key, item);
        if (mounted) renderBar();
        return () => {
          items.delete(item.key);
          if (open?.key === item.key) closePanel();
          if (mounted) renderBar();
        };
      };

      const service: ToolbarService = {
        register,
        toggle: (key, anchor) => togglePanel(key, anchor),
        open: (key, anchor) => {
          if (open?.key !== key) togglePanel(key, anchor);
        },
        close: () => closePanel(),
        isOpen: (key) => (key ? open?.key === key : open !== null),
        refresh: () => syncStates(),
        has: (key) => itemOf(key) !== undefined,
        get hasBar() {
          return barEl !== null;
        },
      };
      ctx.provide('toolbar', service);

      // ---------------- 按钮条 ----------------

      /**
       * 找按钮条挂哪儿。
       *
       * **在 `onMounted` 里调**：`toolbarSlot` 由别的插件在自己的 `setup` 里 provide，
       * 而插件的安装顺序不该由使用方的数组顺序决定（甘特写在前面还是后面都得成立）。
       */
      function resolveHost(): HTMLElement | null {
        const opt = options.mount;
        if (opt) {
          mountedBy = 'mount';
          return ensureTokens(typeof opt === 'function' ? opt() : opt);
        }

        const slot = ctx.inject<() => HTMLElement | null>('toolbarSlot');
        const slotEl = slot?.();
        if (slotEl) {
          mountedBy = 'slot';
          return ensureTokens(slotEl);
        }

        /*
         * 没人给槽 → 自己在 `.vt-root` 外面包一层纵向 flex：按钮条在上、表格吃掉剩下的高度。
         * 使用方给的容器里可能还有别的节点，所以用 `insertBefore` 保住 root 的兄弟位置。
         *
         * 外壳带 `vt-fb`：那是核心给「表格之外的 DOM」准备的 **token 载体**，见下面
         * `ensureTokens` 的注释 —— 面板浮层要靠它才找得到 `--vt-*`。
         */
        const root = ctx.rootEl;
        const parent = root.parentElement;
        if (!parent) return null;
        mountedBy = 'shell';
        shellEl = document.createElement('div');
        shellEl.className = 'vt-toolbar-shell vt-fb';
        parent.insertBefore(shellEl, root);
        shellEl.appendChild(root);
        return shellEl;
      }

      /**
       * 让按钮条所在的这棵子树**能当浮层宿主**。
       *
       * `createPopup` 找宿主是从锚点往上 `closest('.vt-client') → '.vt-root') → '.vt-fb')`，
       * 找不到就退到 `document.body`。而工具栏的按钮在 `.vt-root` **之外** ——
       * 少了这一步的实测表现：面板掉到 body 上，整批 `--vt-*` 解析不到，于是变成
       * 「透明底 + 16px 黑字」压在表格上面（核心 AGENTS.md §7.2 记过这个坑）。
       *
       * 加一个 class 而不是别的招：`.vt-fb` 只带变量、不带任何外观，本来就是为这种场景
       * 准备的（`VtFilterBuilder` 对自己的容器也是这么做的）。已经在某个载体里面时不动它。
       *
       * ⚠️ 宿主还得**有高度**：面板的最大高度是按宿主可用高度夹的。所以 `mount` 请给一个
       * 与表格同高的外层容器，而不是一条只有按钮那么高的窄条 —— 后者会把面板夹扁。
       */
      function ensureTokens(host: HTMLElement | null): HTMLElement | null {
        if (host && !host.closest('.vt-client, .vt-root, .vt-fb')) {
          host.classList.add('vt-fb');
        }
        return host;
      }

      function renderBar(): void {
        if (!barEl) return;
        barEl.textContent = '';
        buttons.clear();

        const left = document.createElement('div');
        left.className = 'vt-toolbar-group';
        barEl.appendChild(left);
        for (const item of sorted('left')) left.appendChild(makeButton(item));

        const right = sorted('right');
        if (right.length > 0) {
          const box = document.createElement('div');
          box.className = 'vt-toolbar-group vt-toolbar-group--end';
          barEl.appendChild(box);
          for (const item of right) box.appendChild(makeButton(item));
        }
        syncStates();
      }

      const textOf = (v: string | (() => string) | undefined): string =>
        typeof v === 'function' ? v() : (v ?? '');

      /**
       * 一颗按钮：`图标 → 生效数量 → 文字`。
       *
       * **数量排在文字前面**，与文字连成一句读下来（「1 分组」「3 筛选」）。放在右上角当角标
       * 的话它和标签是两个东西，眼睛要先认标签再找角标；而它本来就是标签的一部分 ——
       * 用户回到界面时的问题是「我分了几级组」。
       *
       * **不画下拉箭头**：一排按钮各挂一个 ▾ 只是重复「点开有东西」这件所有人都会试的事，
       * 而它挤掉的是标签的宽度（窄容器里标签才是最后一道信息）。面板型与动作型的区别由
       * 点下去之后的反馈说明，不靠一个静态符号。
       */
      function makeButton(item: ToolbarItem): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vt-toolbar-button';
        btn.dataset.toolbarItem = item.key;
        btn.title = textOf(item.title ?? item.label);
        if (item.icon) btn.innerHTML = item.icon;

        const badgeEl = document.createElement('span');
        badgeEl.className = 'vt-toolbar-badge';
        badgeEl.style.display = 'none';
        btn.appendChild(badgeEl);

        const label = document.createElement('span');
        label.className = 'vt-toolbar-label';
        label.textContent = textOf(item.label);
        btn.appendChild(label);

        btn.addEventListener('click', () => activate(item, btn));
        buttons.set(item.key, { btn, badgeEl });
        return btn;
      }

      /** 徽标与禁用态。**每次都现读**，所以外部改了状态只要 `refresh()` 一下 */
      function syncStates(): void {
        for (const [key, { btn, badgeEl }] of buttons) {
          const item = itemOf(key);
          if (!item) continue;
          const raw = item.badge?.();
          const text = raw == null || raw === 0 || raw === '' ? '' : String(raw);
          badgeEl.textContent = text;
          badgeEl.style.display = text ? '' : 'none';
          btn.classList.toggle('is-active', text !== '');
          btn.disabled = item.disabled?.() ?? false;
        }
      }

      // ---------------- 面板开合 ----------------

      function activate(item: ToolbarItem, anchor: HTMLElement): void {
        if (item.panel) {
          togglePanel(item.key, anchor);
          return;
        }
        item.onClick?.(anchor);
        // 动作型也可能改了状态（撤销就是），顺手重算一遍徽标与禁用态
        syncStates();
      }

      function closePanel(): void {
        if (!open) return;
        const { popup, handle, btn } = open;
        // 先置空再销毁：popup 的 onClose 会回调进来，不置空会绕成无穷递归
        open = null;
        handle?.destroy?.();
        popup.destroy();
        btn.classList.remove('is-open');
      }

      function togglePanel(key: string, anchor?: HTMLElement): void {
        const wasOpen = open?.key === key;
        closePanel();
        if (wasOpen) return;

        const item = itemOf(key);
        if (!item?.panel) {
          if (!item) console.warn(`[vtToolbar] 没有注册过 "${key}" 这一项。`);
          return;
        }
        /*
         * 锚点优先用参数（`toggleToolbarPanel(key, myBtn)` 的场景），否则用工具栏上那颗按钮。
         * 两个都没有（`bar: false` 且没传锚点）→ 退到表格根节点，面板贴在左上角。
         * 这比什么都不发生好：使用方能看见面板，从而发现自己漏传了锚点。
         */
        const btn = anchor ?? buttons.get(key)?.btn ?? ctx.rootEl;
        const popup = createPopup({
          anchor: btn,
          owner: btn,
          placement: 'below',
          minWidth: key === FILTER_CONFIG_KEY ? 460 : 300,
          className: `vt-toolbar-popup vt-toolbar-popup--${key}`,
          onClose: closePanel,
        });
        const el = document.createElement('div');
        el.className = 'vt-toolbar-panel';
        popup.el.appendChild(el);
        btn.classList.add('is-open');

        // 先登记再建内容：面板在构造过程中就会调 resize()
        open = { key, popup, handle: undefined, btn };
        const panelCtx: PanelContext = {
          el,
          anchor: btn,
          resize: () => popup.update(),
          close: () => closePanel(),
          refresh: () => syncStates(),
          ui: createPanelUi(el),
        };
        open.handle = item.panel(panelCtx);
        popup.update();
      }

      // ---------------- 内置四项 ----------------

      ctx.on('onMounted', () => {
        mounted = true;
        if (options.bar !== false) {
          const host = resolveHost();
          if (host) {
            barEl = document.createElement('div');
            barEl.className = 'vt-toolbar';
            /*
             * **与表格拼成一块板子。** 表格开了 `border` 时它是一张圆角卡片，而按钮条默认是
             * 一条平的、没有侧边框的槽 —— 两者同宽地摞在一起，读起来是两个组件
             * （上面方角、下面圆角，中间还差两条侧边框）。`--card` 让按钮条接管卡片的上半截：
             * 上面两个圆角、左右与上边框都补上，下边框交给表格自己的上边框。
             *
             * 只在自己包壳时给：别的容器的外缘不是我们说了算的（见 `mountedBy`）。
             */
            if (mountedBy === 'shell' && ctx.getOptions().border === true) {
              barEl.classList.add('vt-toolbar--card');
            }
            // 槽可能已经有别的东西（使用方自己塞的按钮）→ 插在最前面，别覆盖它
            host.insertBefore(barEl, host.firstChild);
          }
        }
        renderBar();

        /*
         * 一项都没有 = 使用方装了工具栏却没装任何贡献按钮的插件。
         *
         * 值得 warn：这条按钮条本身没有任何内置项（那是刻意的，见文件头注），而「一条空槽」
         * 在界面上与「插件没装上」长得一模一样 —— 不说一句的话，升级的人只能对着空槽猜。
         */
        if (items.size === 0) {
          console.warn(
            '[vtToolbar] 一项都没有 —— 要哪颗按钮就装哪个插件（vtFieldConfig / vtFilterConfig / ' +
              'vtGroupConfig / vtSortConfig / vtRowHeightConfig / vtSearch / vtExport…），' +
              '或者 `plugins: [vtToolbar(), ...vtToolbarPanels()]` 一行装齐那四个面板。',
          );
        }
      });

      /*
       * 列变了要重算：徽标（「隐藏了几列」）总要刷，开着的面板则交给它自己的 `refresh()`。
       * 列可以从别处被改 —— `setState()` 还原一份视图、使用方自己调 `setColumnVisible`，
       * 而**面板里勾一下显隐也算**（那就是一次 `setColumnVisible`）。
       *
       * ⚠️ 这里曾经是「`closePanel()` + `togglePanel()`」。那等于拿关掉重开当刷新用，
       * 而勾选本身就会走到这条 —— 于是**在字段配置里每勾一次，面板就闪一次**，
       * 滚动位置还回到顶部。刷新的粒度只有面板自己知道，所以交给 `PanelHandle.refresh`。
       */
      ctx.on('onColumnsChanged', () => {
        syncStates();
        open?.handle?.refresh?.();
      });
      ctx.on('onLocaleChanged', () => renderBar());

      return {
        api: {
          toggleToolbarPanel: (key: string, anchor?: HTMLElement) => togglePanel(key, anchor),
          openToolbarPanel: (key: string, anchor?: HTMLElement) => {
            if (open?.key !== key) togglePanel(key, anchor);
          },
          closeToolbarPanel: () => closePanel(),
          isToolbarPanelOpen: (key?: string) => (key ? open?.key === key : open !== null),
          registerToolbarItem: (item: ToolbarItem) => register(item),
          refreshToolbar: () => syncStates(),
        },
        destroy(): void {
          closePanel();
          barEl?.remove();
          barEl = null;
          // 自己包出来的外壳要拆掉，并把 root 放回原位
          if (shellEl) {
            const parent = shellEl.parentElement;
            if (parent) parent.insertBefore(ctx.rootEl, shellEl);
            shellEl.remove();
            shellEl = null;
          }
        },
      };
    },
  };
}
