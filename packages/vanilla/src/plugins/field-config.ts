/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PluginContext, VirtTablePlugin } from '../plugin';
import type { VirtTableColumn } from '../index';
import type { VirtTableLocale } from '../locale';
import type { ToolbarItem, ToolbarService } from './toolbar';
import type { PanelContext, PanelHandle } from '../internal/panel-ui';
import { createStandalonePanel } from '../internal/panel-popup';
import { TOOLBAR_ORDER } from '../internal/toolbar-order';
import './field-config.css';

/**
 * 字段配置插件：**勾选控制列显隐 + 拖手柄调整列序**。
 *
 * ```ts
 * // 装了工具栏 → 自动变成工具栏上的「字段配置」那颗按钮
 * new VirtTable(el, { columns, plugins: [vtToolbar(), vtFieldConfig()] });
 *
 * // 没装工具栏 → 按钮放哪儿由你决定
 * new VirtTable(el, { columns, plugins: [vtFieldConfig()] });
 * btn.onclick = () => table.toggleFieldConfig(btn);
 * ```
 *
 * ## 两种归宿，一份实现
 *
 * `onMounted` 里 `inject('toolbar')`：拿到了就把自己注册成工具栏上的一项（面板由工具栏开、
 * 徽标显示「藏了几列」），拿不到就走独立浮层，使用方用下面那组 API 开合。两条路吃的是同一个
 * `buildFieldsPanel`，所以不是两种档次的实现，只是换了个开合入口。
 *
 * ⚠️ `vtToolbar()` 默认**自带**这一项（`items` 里有 `'columns'`）。同时写 `vtFieldConfig()`
 * 时以插件的配置为准 —— 工具栏那边认「显式注册的同 key 项覆盖自带项」，所以想传
 * `reorder` / `canToggleColumn` / `texts` 就显式装本插件。
 *
 * ## 列上的两个开关
 *
 * `hidden` 设初始显隐，`hideable: false` 让这一列压根不出现在面板里（功能列的标题是空的，
 * 天然被排除）。勾掉分组表头节点等于整组隐藏。
 *
 * 「勾不掉」有两个来源：核心自己只拦**最后一列**（全勾掉会得到一张只有表头的空表），
 * 别的约束由知道原因的一方通过 `canToggleColumn` 传进来（付费甘特的「任务列是冻结列」走这条）。
 *
 * 暴露 API：`toggleFieldConfig(anchor?)` / `openFieldConfig(anchor?)` /
 * `closeFieldConfig()` / `isFieldConfigOpen()`
 */
export interface FieldConfigOptions<T extends Record<string, any> = any> {
  /**
   * 给不给拖拽换序，默认 `true`。
   *
   * `false` = 只有勾选显隐（不画手柄，提示文案也跟着换）。列序另有入口时用它 ——
   * 例如已经装了 `vtColumnDrag`（在**表头上**拖），面板里再来一套会有两个「正确的做法」。
   */
  reorder?: boolean;
  /**
   * 某一列能不能切显隐。返回字符串 = **不能**，且这句话就是置灰后鼠标停上去的原因。
   *
   * 核心自己只拦一条（最后一列不许勾掉）。别的约束由知道原因的那一方传进来 ——
   * 例如甘特的「任务列是冻结列」：冻结列是按含隐藏列的列序挑的，藏掉它会让冻结落在
   * 一个隐藏列上，而核心并不认识这条规则。
   */
  canToggleColumn?: (col: VirtTableColumn<T>) => true | string;
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

/**
 * 工具栏上这一项的 key。**仍是 `'columns'`** —— `toggleToolbarPanel('columns')` 是已公开的
 * 契约，面板搬进插件不该让它失效。
 */
export const FIELD_CONFIG_KEY = 'columns';



const ICON =
  '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" ' +
  'stroke-width="1.8" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><path d="M10 4.5v15M15 4.5v15"/></svg>';

/** 面板里的一行 */
interface FieldEntry<T extends Record<string, any>> {
  col: VirtTableColumn<T>;
  /** 分组表头下的层级（0 = 顶层）。缩进用，也是「能不能互相换位」的判据 */
  level: number;
  /** 同一父节点下的兄弟共享这个标记；`moveColumn` 只允许兄弟之间换位 */
  parentKey: string;
  /** 分组表头节点 —— 它自己不参与拖拽换序 */
  group: boolean;
}

/** 越过多少 px 才算拖拽而不是点击（与 `internal/drag.ts` 的默认阈值一致） */
const DRAG_THRESHOLD = 4;

/**
 * 「字段配置」：**勾选控制显隐 + 拖手柄调整列序**。
 *
 * 显隐与列序合在同一个列表里 —— 一眼看全有哪些列、哪些开着、什么顺序。与 `vtColumnDrag`
 * （在**表头上**拖）不冲突：那是同一件事的另一个入口，两个都装时用 `reorder: false` 关掉这边。
 * 皮肤复用共享的 `.vt-filter-list` / `.vt-filter-item` / `.vt-filter-checkbox`。
 *
 * 「勾不掉」有两个来源：核心自己只拦**最后一列**（全勾掉会得到一张只有表头的空表，
 * `setColumnVisible` 不拦这个）；别的约束由知道原因的一方通过 `canToggleColumn` 传进来。
 */
export function buildFieldsPanel<T extends Record<string, any>>(
  ctx: PluginContext<T>,
  panel: PanelContext,
  texts: Texts,
  options: FieldConfigOptions<T> = {},
): PanelHandle {
  const canToggle = options.canToggleColumn;
  /** 不画手柄这一档：`reorder: false` 时面板退回「只勾显隐」 */
  const reorder = options.reorder !== false;
  const { ui } = panel;
  let rowOf = new Map<HTMLElement, FieldEntry<T>>();
  let entries: FieldEntry<T>[] = [];
  let list: HTMLElement | null = null;
  let line: HTMLElement | null = null;
  /**
   * 当前画出来的那棵列树的结构签名。`refresh()` 用它判断「要不要重建 DOM」——
   * 显隐**不进签名**（勾选不改结构），列序、层级、分组身份都进。
   */
  let signature = '';
  let drag: {
    pointerId: number;
    startY: number;
    started: boolean;
    from: FieldEntry<T>;
    fromEl: HTMLElement;
    target: { key: string; after: boolean } | null;
  } | null = null;

  function render(): void {
    endDrag();
    panel.el.textContent = '';
    rowOf = new Map();
    line = null;
    ui.title(texts.columns);

    entries = collectEntries(ctx.table.getAllColumns() as VirtTableColumn<T>[]);
    if (entries.length === 0) {
      ui.empty(texts.noColumns);
      panel.resize();
      return;
    }

    /** 还剩几列是显示着的 —— 决定「最后一列不许勾掉」 */
    const visibleCount = entries.filter((e) => !e.group && !e.col.hidden).length;

    list = document.createElement('div');
    list.className = 'vt-filter-list vt-toolbar-fields';
    panel.el.appendChild(list);

    for (const entry of entries) {
      const { col, level, group } = entry;
      const item = document.createElement('label');
      item.className = 'vt-filter-item vt-toolbar-fields-item';
      if (level > 0) item.style.setProperty('--vt-panel-level', String(level));
      item.dataset.colKey = String(col.key);
      rowOf.set(item, entry);

      /*
       * 手柄。**只有它能发起拖拽**（不是整行）—— 整行发起会与勾选框抢手势：
       * 按下想勾选、指针抖了 5px 就变成拖拽，勾选反而没生效。
       */
      if (reorder) {
        const grip = document.createElement('span');
        grip.className = 'vt-toolbar-fields-grip';
        grip.innerHTML = ui.icons.grip;
        grip.setAttribute('aria-hidden', 'true');
        if (group) {
          // 分组表头节点：换位要连整组一起搬，语义不清（`moveColumn` 也只在兄弟间换）
          grip.classList.add('is-disabled');
        } else {
          grip.addEventListener('pointerdown', (e) => onGripDown(e, item, entry));
        }
        item.appendChild(grip);
      }

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'vt-filter-checkbox';
      cb.checked = !col.hidden;

      applyLock(item, cb, entry, visibleCount);
      /*
       * **监听无条件绑定**（锁定态只体现在 `disabled` 上，而 disabled 的 input 压根不触发
       * change）。绑在「当时没锁」的分支里的话，`syncLocks()` 把某一行从锁定改回可用之后
       * 那一行就成了死的 —— 勾它没有任何反应。
       *
       * 落地后**不自己重画**：`setColumnVisible` 会派发 `onColumnsChanged`，宿主转手调
       * 本面板的 `refresh()` → `syncLocks()` 就地同步。自己再 `render()` 一次只是白重建一遍 DOM。
       */
      cb.addEventListener('change', () => {
        ctx.table.setColumnVisible(String(col.key), cb.checked);
        panel.refresh();
      });
      item.appendChild(cb);

      const span = document.createElement('span');
      span.className = 'vt-toolbar-fields-name';
      span.textContent = String(col.title);
      if (group) span.classList.add('vt-filter-item-group');
      item.appendChild(span);

      list.appendChild(item);
    }

    ui.hint(reorder ? texts.columnsHint : texts.columnsHintNoReorder);
    signature = signatureOf(entries);
    panel.resize();
  }

  /**
   * 一行的「勾不掉」状态。两个来源，谁先命中说谁：`canToggleColumn` 给的理由，
   * 或者核心自己那一条 —— 最后一列不许勾掉（全勾掉会得到一张只有表头的空表）。
   */
  function applyLock(
    item: HTMLElement,
    cb: HTMLInputElement,
    entry: FieldEntry<T>,
    visibleCount: number,
  ): void {
    const { col, group } = entry;
    const vetoed = group ? null : canToggle?.(col);
    const locked =
      typeof vetoed === 'string'
        ? vetoed
        : !group && !col.hidden && visibleCount <= 1
        ? texts.columnsLast
        : null;
    cb.disabled = locked !== null;
    item.classList.toggle('vt-toolbar-fields-item--locked', locked !== null);
    if (locked !== null) item.title = locked;
    else item.removeAttribute('title');
  }

  /**
   * 就地同步勾选态与锁定态，**一个 DOM 节点都不重建**。
   *
   * 勾一下显隐走的就是这条：那次 `setColumnVisible` 本身会派发 `onColumnsChanged`，
   * 早先的做法是借机把面板整个关掉重开 —— 于是每勾一次面板闪一次，滚动位置也回到顶部。
   * 而勾选改变的只有两件事：那一行的 `checked`，以及「只剩一列了」时别人的锁定态。
   */
  function syncLocks(next: FieldEntry<T>[]): void {
    const visibleCount = next.filter((e) => !e.group && !e.col.hidden).length;
    const rows = [...rowOf.keys()];
    next.forEach((entry, i) => {
      const item = rows[i];
      if (!item) return;
      // 列对象可能是 `setColumns` 之后的新副本 —— 拖拽的落点判定读 `rowOf`，得换成新的
      rowOf.set(item, entry);
      const cb = item.querySelector<HTMLInputElement>('.vt-filter-checkbox');
      if (!cb) return;
      cb.checked = !entry.col.hidden;
      applyLock(item, cb, entry, visibleCount);
    });
    entries = next;
  }

  /**
   * 宿主发现「列被别处改了」时调这条（工具栏在 `onColumnsChanged` 里，独立浮层同理）。
   *
   * **只有列树的结构变了才重建 DOM**：换序、加列、`setColumns` 整体替换属于这一类；
   * 勾一下显隐不属于 —— 那时只同步几个 `checked` 与锁定态。
   */
  function refresh(): void {
    const next = collectEntries(ctx.table.getAllColumns() as VirtTableColumn<T>[]);
    if (signatureOf(next) === signature) syncLocks(next);
    else render();
  }

  // ---- 拖拽换序 ----

  function showLine(el: HTMLElement, after: boolean): void {
    if (!list) return;
    if (!line) {
      line = document.createElement('div');
      line.className = 'vt-toolbar-fields-drop-line';
      list.appendChild(line);
    }
    const box = list.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    line.style.display = '';
    line.style.top = `${(after ? r.bottom : r.top) - box.top + list.scrollTop}px`;
  }

  const hideLine = (): void => {
    if (line) line.style.display = 'none';
  };

  /**
   * 指针 Y → 落在哪一条的前面还是后面。
   *
   * 只认**与源同一父节点**的兄弟（`moveColumn` 也只在兄弟间换位：跨分组换位会改表头结构）。
   * 落不下去时返回 `null`，于是提示线索性不画 —— 比「画了线但松手没反应」诚实。
   */
  function hitTest(
    clientY: number,
    from: FieldEntry<T>,
  ): { el: HTMLElement; target: FieldEntry<T>; after: boolean } | null {
    for (const [el, entry] of rowOf) {
      if (entry.group || entry.parentKey !== from.parentKey) continue;
      const r = el.getBoundingClientRect();
      if (clientY < r.top || clientY >= r.bottom) continue;
      if (entry.col.key === from.col.key) return null; // 落在自己身上
      const after = clientY > r.top + r.height / 2;

      // 落点归约后就是原位 → 不算落点（与 `moveColumn` 里的算术一致）
      const sibs = entries.filter((e) => !e.group && e.parentKey === from.parentKey);
      const fromIdx = sibs.indexOf(from);
      const toIdx = sibs.indexOf(entry);
      let insertIdx = after ? toIdx + 1 : toIdx;
      if (fromIdx < insertIdx) insertIdx -= 1;
      return insertIdx === fromIdx ? null : { el, target: entry, after };
    }
    return null;
  }

  function onPointerMove(e: PointerEvent): void {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (!drag.started) {
      if (Math.abs(e.clientY - drag.startY) < DRAG_THRESHOLD) return;
      drag.started = true;
      drag.fromEl.classList.add('is-dragging');
      list?.classList.add('vt-toolbar-fields--dragging');
    }
    const hit = hitTest(e.clientY, drag.from);
    if (hit) {
      drag.target = { key: String(hit.target.col.key), after: hit.after };
      showLine(hit.el, hit.after);
    } else {
      drag.target = null;
      hideLine();
    }
    // 拖拽中不选中文字（手柄上按住后指针会扫过一串列名）
    e.preventDefault();
  }

  function onPointerUp(e: PointerEvent): void {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const { started, from, target } = drag;
    endDrag();
    if (!started || !target) return;
    /*
     * 落地成功后核心会 `setColumns` → 派发 `onColumnsChanged` → 宿主调本面板的 `refresh()`，
     * 那时列序变了、结构签名对不上，于是走整体 `render()`。所以这里不必自己重画。
     *
     * 而**落点归约后与原位相同时 `moveColumn` 返回 false、一个事件都不发** —— 上面
     * `endDrag()` 已经把拖拽态收干净了，面板停在原样正是对的。
     */
    if (ctx.table.moveColumn(String(from.col.key), target.key, target.after)) {
      panel.refresh();
    }
  }

  function onPointerCancel(e: PointerEvent): void {
    if (!drag || e.pointerId !== drag.pointerId) return;
    endDrag();
  }

  function endDrag(): void {
    if (drag) {
      drag.fromEl.classList.remove('is-dragging');
      drag = null;
    }
    list?.classList.remove('vt-toolbar-fields--dragging');
    hideLine();
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerCancel);
  }

  function onGripDown(e: PointerEvent, el: HTMLElement, entry: FieldEntry<T>): void {
    // 只接受主指针的左键等价按下：滤掉右键、中键与多指里的次指针
    if (!e.isPrimary || e.button !== 0) return;
    /*
     * 手柄在 `<label>` 里，**必须拦掉默认行为**：label 的默认动作是把点击转给里面的勾选框 ——
     * 不拦的话「按住手柄拖一下」会顺手把这一列的显隐翻过来。
     */
    e.preventDefault();
    e.stopPropagation();
    drag = {
      pointerId: e.pointerId,
      startY: e.clientY,
      started: false,
      from: entry,
      fromEl: el,
      target: null,
    };
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerCancel);
  }

  render();
  return { destroy: endDrag, refresh };
}

/**
 * 结构签名：**只含「DOM 长什么样」的部分**，不含显隐。
 *
 * 勾一下显隐 → 签名不变 → 就地同步；换序 / 加列 / 换整棵列树 → 签名变 → 重建 DOM。
 */
function signatureOf<T extends Record<string, any>>(list: FieldEntry<T>[]): string {
  return list.map((e) => `${String(e.col.key)}|${e.level}|${e.parentKey}|${e.group ? 'g' : 'c'}`).join(',');
}

/**
 * 列树 → 面板里的行列表。规则与 `vtFieldConfig` 一致：**有标题且 `hideable !== false`**
 * 才出现（功能列的标题是空的，天然被排除）。
 */
function collectEntries<T extends Record<string, any>>(
  columns: VirtTableColumn<T>[],
): FieldEntry<T>[] {
  const out: FieldEntry<T>[] = [];
  const walk = (cols: VirtTableColumn<T>[], level: number, parentKey: string): void => {
    for (const col of cols) {
      const kids = col.children;
      const group = Array.isArray(kids) && kids.length > 0;
      if (col.hideable !== false && col.title) out.push({ col, level, parentKey, group });
      if (group) walk(kids!, level + 1, String(col.key));
    }
  };
  walk(columns, 0, '');
  return out;
}

/**
 * 工具栏上这一项的描述。**工具栏自带的那份与本插件注册的那份都走这里** ——
 * 图标、徽标、排序位于是只有一处定义。
 *
 * @internal 给 `plugins/toolbar.ts` 与本文件用，不在 barrel 里导出。
 */
export function fieldConfigToolbarItem<T extends Record<string, any>>(
  ctx: PluginContext<T>,
  texts: () => Texts,
  options: FieldConfigOptions<T> = {},
): ToolbarItem {
  return {
    key: FIELD_CONFIG_KEY,
    label: () => texts().columns,
    icon: ICON,
    order: TOOLBAR_ORDER.fieldConfig,
    // 隐藏了几列就显示几 —— 「为什么我少了一列」最常见的答案
    badge: () =>
      (ctx.table.getAllColumns() as VirtTableColumn<T>[]).filter(
        (c) => c.hidden && c.title && c.hideable !== false,
      ).length,
    panel: (p) => buildFieldsPanel<T>(ctx, p, texts(), options),
  };
}

export function vtFieldConfig<T extends Record<string, any> = any>(
  options: FieldConfigOptions<T> = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtFieldConfig',
    setup(ctx: PluginContext<T>) {
      const texts = (): Texts => ({ ...ctx.getLocale().toolbar, ...options.texts });

      /** 没装工具栏时走这条：自己开浮层 */
      const standalone = createStandalonePanel(ctx, {
        className: `vt-toolbar-popup--${FIELD_CONFIG_KEY}`,
        minWidth: 300,
        build: (panel) => buildFieldsPanel<T>(ctx, panel, texts(), options),
      });

      let toolbar: ToolbarService | null = null;
      let unregister: (() => void) | null = null;

      /*
       * **在 `onMounted` 里 inject**：服务表所有插件共享，而 `onMounted` 排在全部 `setup` 之后 ——
       * 于是「先写 vtToolbar 还是先写 vtFieldConfig」都成立（顺序无关的可选依赖）。
       */
      ctx.on('onMounted', () => {
        toolbar = ctx.inject<ToolbarService>('toolbar') ?? null;
        // `toolbar: false` = 不占工具栏的位置，但**面板仍然可用**（走下面那组 API 自己开浮层）
        if (options.toolbar === false) toolbar = null;
        unregister = toolbar?.register(fieldConfigToolbarItem(ctx, texts, options)) ?? null;
      });

      /*
       * 列显隐 / 列序变了要同步勾选态。装了工具栏的话那边会调同一个 `refresh()`（它还要刷徽标），
       * 这里只管独立浮层 —— 没开着时是空操作。
       */
      ctx.on('onColumnsChanged', () => {
        if (!toolbar) standalone.refresh();
      });

      const toggle = (anchor?: HTMLElement): void =>
        toolbar ? toolbar.toggle(FIELD_CONFIG_KEY, anchor) : standalone.toggle(anchor);

      return {
        api: {
          toggleFieldConfig: toggle,
          openFieldConfig: (anchor?: HTMLElement) =>
            toolbar ? toolbar.open(FIELD_CONFIG_KEY, anchor) : standalone.open(anchor),
          closeFieldConfig: () => (toolbar ? toolbar.close() : standalone.close()),
          isFieldConfigOpen: () =>
            toolbar ? toolbar.isOpen(FIELD_CONFIG_KEY) : standalone.isOpen(),
        },
        destroy() {
          unregister?.();
          standalone.destroy();
        },
      };
    },
  };
}
