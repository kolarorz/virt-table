/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createSelectField,
  type SelectFieldHandle,
  type SelectFieldOption,
} from '../components/_select-field';
import { createSwitch, type SwitchHandle, type SwitchOptions } from '../components/_switch';

/**
 * 面板基元 —— 「一个下拉浮层里的一张脸」长什么样，只在这里定义一次。
 *
 * ## 为什么在 `internal/` 而不是 `plugins/toolbar.ts`
 *
 * 这套基元原先长在工具栏里，因为最早只有工具栏开面板。现在字段配置 / 筛选 / 分组 / 排序
 * 各自是一个**独立插件**（`vtFieldConfig` / `vtFilterConfig` / `vtGroupConfig` / `vtSortConfig`），
 * 它们既能挂进工具栏，也能不装工具栏单独用 —— 后者要是拿不到基元，就得自己 `createElement`，
 * 于是同一个产品里会出现两套行距与两种标题字号。
 *
 * 放 `internal/` 而不是 `plugins/`：`vite.config.ts` 把 `src/plugins/*.ts` **每个文件都当公开入口**
 * （`readdirSync`），搁那儿会凭空多出一个 `@virt-table/vanilla/plugins/panel-ui` 子路径 ——
 * 一个没人该 import 的公开面。类型仍从 `plugins/toolbar` 以 `ToolbarPanelUi` /
 * `ToolbarPanelContext` / `ToolbarPanelHandle` 这三个既有名字导出（付费包与文档在用）。
 *
 * 样式在 `plugins/_panel-ui.css`，由工具栏与四个面板插件各自 `@import` 内联 ——
 * 类名仍是 `.vt-toolbar-panel-*`（历史来源），改名的收益抵不上一次全站类名迁移。
 */

/** 面板返回的钩子 */
export interface PanelHandle {
  /** 面板被关掉 / 插件卸载时调 */
  destroy?: () => void;
  /**
   * **就地**把面板同步到最新状态。开着的面板收到「状态被别处改了」时由宿主调。
   *
   * 存在的理由是别再拿「关掉重开」当刷新用。那条路把整个浮层销毁重建，用户看到的是
   * **面板闪一下**（实测：在字段配置里勾一下显隐 —— 那次勾选本身就会派发
   * `onColumnsChanged`，于是每勾一次闪一次），顺带丢掉滚动位置与焦点。
   *
   * 所以「重画」的粒度由面板自己定：结构没变就只改几个 `checked` / `disabled`，
   * 真的换了列树才重建 DOM。不实现这条的面板，宿主什么都不做（而不是退回重建浮层）。
   */
  refresh?: () => void;
}

/** 面板实现拿到的东西。工具栏与独立浮层各自造一个，形状完全一致 */
export interface PanelContext {
  /** 内容容器，面板独占它 */
  el: HTMLElement;
  /** 锚点元素（工具栏上那颗按钮，或使用方传进来的按钮）。**在面板里再开浮层时必须把它或 `el` 当 owner** */
  anchor: HTMLElement;
  /** 内容高度变了 → 重新定位浮层 */
  resize(): void;
  /** 关掉这个面板 */
  close(): void;
  /**
   * 状态落地了 → 重算按钮的徽标与禁用态。
   *
   * 单独用（没装工具栏）时没有按钮可刷，这里是个空实现 —— 面板照写 `refresh()`，
   * 两种宿主的代码因此完全同一份。
   */
  refresh(): void;
  /** 面板基元。用它画，面板之间的行距与控件外观才是一套 */
  ui: PanelUi;
}

/**
 * 面板基元。
 *
 * **存在的理由是一致性**：五六个面板各自 `createElement` 的话，行距、标题字号、分割线的负边距
 * 很快就各不相同 —— 而它们是同一个下拉里的几张脸，不一致会立刻被看出来。控件本体一律来自核心
 * 的共享件（`createSelectField` / `createSwitch`），所以贡献方一笔控件外观都不用画。
 */
export interface PanelUi {
  /** 面板标题（一个面板最多一条，放最上面） */
  title(text: string): HTMLElement;
  /** 一行：左标题 + 右控件。`label` 传空串 = 接着上一行的续行 */
  row(label: string, control: HTMLElement): HTMLElement;
  divider(): void;
  /** 一行说明文字。用来把「为什么这一项现在是这个样子」说出来 */
  hint(text: string): HTMLElement;
  /** 空态：一句话，而不是留一个点了没反应的按钮 */
  empty(text: string): HTMLElement;
  /** 规则行（一列下拉 + 一个方向 + 一个删除） */
  ruleRow(): HTMLElement;
  /** 下拉。`owner` 已经替你指向面板 —— 传控件自己会让浮层掉到 body 上、`--vt-*` 全失效 */
  select(opts: {
    options: SelectFieldOption[];
    value: string | null;
    placeholder: string;
    emptyText: string;
    minWidth?: number;
    onChange: (value: string) => void;
  }): SelectFieldHandle;
  switch(opts?: SwitchOptions): SwitchHandle;
  /** 两三档的切换（升 / 降 / 原序）。比下拉少点一下，且当前档一眼可见 */
  segmented(
    items: Array<{ value: string; label: string; title?: string }>,
    value: string,
    onPick: (value: string) => void,
  ): HTMLElement;
  iconButton(label: string, svg: string, onClick: () => void): HTMLButtonElement;
  /** 「+ 添加一条」。通栏虚线框 —— 它是列表的延续，不是并列的普通按钮 */
  addButton(text: string, onClick: () => void): HTMLButtonElement;
  /** 底部操作栏（靠右） */
  footer(): HTMLElement;
  button(text: string, variant: 'primary' | 'plain', onClick: () => void): HTMLButtonElement;
  /** 常用图标，省得每个贡献方自己画一遍 */
  icons: { trash: string; grip: string };
}

const ICON_TRASH =
  '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" ' +
  'stroke-width="1.8" stroke-linecap="round" aria-hidden="true">' +
  '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10 11v5M14 11v5"/></svg>';

const ICON_GRIP =
  '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">' +
  '<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/>' +
  '<circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/>' +
  '<circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>';

/** 面板基元的实现。`host` 就是面板的内容容器，所有基元直接往它上面追加 */
export function createPanelUi(host: HTMLElement): PanelUi {
  return {
    title(text) {
      const el = document.createElement('div');
      el.className = 'vt-toolbar-panel-title';
      el.textContent = text;
      host.appendChild(el);
      return el;
    },
    row(label, control) {
      const line = document.createElement('div');
      line.className = 'vt-toolbar-panel-row';
      const cap = document.createElement('span');
      cap.className = 'vt-toolbar-panel-label';
      cap.textContent = label;
      const slot = document.createElement('div');
      slot.className = 'vt-toolbar-panel-control';
      slot.appendChild(control);
      line.append(cap, slot);
      host.appendChild(line);
      return line;
    },
    divider() {
      const hr = document.createElement('div');
      hr.className = 'vt-toolbar-panel-divider';
      host.appendChild(hr);
    },
    hint(text) {
      const el = document.createElement('div');
      el.className = 'vt-toolbar-panel-hint';
      el.textContent = text;
      host.appendChild(el);
      return el;
    },
    empty(text) {
      const el = document.createElement('div');
      el.className = 'vt-toolbar-panel-empty';
      el.textContent = text;
      host.appendChild(el);
      return el;
    },
    ruleRow() {
      const row = document.createElement('div');
      row.className = 'vt-toolbar-rule';
      host.appendChild(row);
      return row;
    },
    select(opts) {
      return createSelectField({
        options: opts.options,
        value: opts.value,
        placeholder: opts.placeholder,
        emptyText: opts.emptyText,
        // 宿主查找要从**面板**起算：控件此刻还没挂进文档，从它自己 closest() 必然是 null
        owner: host,
        minWidth: opts.minWidth ?? 150,
        onChange: opts.onChange,
      });
    },
    switch: (opts) => createSwitch(opts),
    segmented(list, value, onPick) {
      const wrap = document.createElement('div');
      wrap.className = 'vt-toolbar-seg';
      wrap.setAttribute('role', 'group');
      for (const it of list) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vt-toolbar-seg-item';
        btn.textContent = it.label;
        if (it.title) btn.title = it.title;
        const active = it.value === value;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
        btn.addEventListener('click', () => {
          if (!active) onPick(it.value);
        });
        wrap.appendChild(btn);
      }
      return wrap;
    },
    iconButton(label, svg, onClick) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vt-toolbar-panel-icon-btn';
      btn.innerHTML = svg;
      btn.title = label;
      btn.setAttribute('aria-label', label);
      btn.addEventListener('click', onClick);
      return btn;
    },
    addButton(text, onClick) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vt-toolbar-panel-add';
      btn.textContent = `+ ${text}`;
      btn.addEventListener('click', onClick);
      host.appendChild(btn);
      return btn;
    },
    footer() {
      const foot = document.createElement('div');
      foot.className = 'vt-toolbar-panel-footer';
      host.appendChild(foot);
      return foot;
    },
    button(text, variant, onClick) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `vt-toolbar-panel-btn vt-toolbar-panel-btn--${variant}`;
      btn.textContent = text;
      btn.addEventListener('click', onClick);
      return btn;
    },
    icons: { trash: ICON_TRASH, grip: ICON_GRIP },
  };
}
