/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PluginContext } from '../plugin';
import { createPopup, type PopupHandle } from '../components/_popup';
import { createPanelUi, type PanelContext, type PanelHandle } from './panel-ui';

/**
 * 「不装工具栏也能用」的那半边 —— 把一个面板实现装进独立浮层。
 *
 * 四个面板插件（`vtFieldConfig` / `vtFilterConfig` / `vtGroupConfig` / `vtSortConfig`）都有两种
 * 归宿：装了 `vtToolbar` 就注册成工具栏上的一颗按钮（面板由工具栏开），没装就走这里 ——
 * 使用方自己放按钮，调插件的 `toggleXxx(anchor)`。
 *
 * 两条路吃的是**同一个面板实现**（同一个 `build(panel)`），差别只在浮层由谁开、
 * `refresh()` 有没有徽标可刷。所以「单独用」不是一个降级档，就是同一张脸换了个开合入口。
 *
 * 浮层一律走核心的 `createPopup`：Esc 关闭、点浮层外关闭（听 `pointerdown`，这点很重要 ——
 * `vtCellSelection` 的拖选起手会 `preventDefault()` 掉兼容 mouse 事件，听 `mousedown` 的浮层
 * 点表格里的格子关不掉）、锚点离开 DOM 时自毁，全都是那边现成的。
 */
export interface StandalonePanel {
  /** 开合。已经开着就关掉（按钮点两下的语义） */
  toggle(anchor?: HTMLElement): void;
  /** 打开；已经开着就什么都不做 */
  open(anchor?: HTMLElement): void;
  close(): void;
  isOpen(): boolean;
  /**
   * 状态被别处改了 → 让开着的面板**就地**同步（面板自己定重画粒度，见 `PanelHandle.refresh`）。
   * 没开着，或这个面板没实现 `refresh`，都是空操作 —— 不会退回「关掉重开」那条闪一下的路。
   */
  refresh(): void;
  destroy(): void;
}

export interface StandalonePanelOptions {
  /**
   * 浮层的追加类名。约定 `vt-toolbar-popup--<key>`（与工具栏那条路完全同名）——
   * 面板样式挂在这些类上，两条路共用一份 CSS，不存在「单独用时少了皮肤」。
   */
  className: string;
  /** 最小宽度。不给则与锚点同宽（`createPopup` 的默认） */
  minWidth?: number;
  /** 面板内容。返回收尾钩子 */
  build(panel: PanelContext): PanelHandle | void;
}

export function createStandalonePanel<T extends Record<string, any>>(
  ctx: PluginContext<T>,
  options: StandalonePanelOptions,
): StandalonePanel {
  let open: { popup: PopupHandle; handle: PanelHandle | void; anchor: HTMLElement } | null = null;

  const close = (): void => {
    if (!open) return;
    const { popup, handle } = open;
    // 先置空再销毁：popup 的 onClose 会回调进来，不置空就绕成无穷递归
    open = null;
    handle?.destroy?.();
    popup.destroy();
  };

  /**
   * 建浮层 + 建内容。
   *
   * 锚点不给时退到 `ctx.rootEl`（面板贴到表格左上角）—— 与工具栏 `bar: false` 时同一个兜底。
   * 这比什么都不发生好：使用方能看见面板，从而发现自己漏传了锚点。
   */
  const build = (anchor: HTMLElement): void => {
    const popup = createPopup({
      anchor,
      owner: anchor,
      placement: 'below',
      minWidth: options.minWidth,
      className: `vt-toolbar-popup ${options.className}`,
      onClose: close,
    });
    const el = document.createElement('div');
    el.className = 'vt-toolbar-panel';
    popup.el.appendChild(el);

    // 先登记再建内容：面板在构造过程中就会调 resize()
    open = { popup, handle: undefined, anchor };
    const panel: PanelContext = {
      el,
      anchor,
      resize: () => popup.update(),
      close,
      // 没有工具栏按钮，没有徽标要刷
      refresh: () => {},
      ui: createPanelUi(el),
    };
    open.handle = options.build(panel);
    popup.update();
  };

  return {
    open(anchor) {
      if (open) return;
      build(anchor ?? ctx.rootEl);
    },
    toggle(anchor) {
      if (open) {
        close();
        return;
      }
      build(anchor ?? ctx.rootEl);
    },
    close,
    isOpen: () => open !== null,
    refresh() {
      open?.handle?.refresh?.();
    },
    destroy: close,
  };
}
