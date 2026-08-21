/**
 * `@virt-table-pro/views` 的**桩**（`off` 档下由 vite alias 顶上）。
 * 背景与取舍见本目录上一级的 README，写法与 `undo.ts` 那份同款。
 *
 * 真包把列宽 / 列序 / 显隐 / 排序 / 两套筛选 / 分页存成命名视图，实现完全站在核心公开的
 * `getState()` / `setState()` 上。
 */
import type { PluginContext, VirtTablePlugin } from '@virt-table/vanilla';
import { stubNotice } from './stub-notice';

/** 一个已保存的视图。`state` 就是核心的 `VirtTableState`，桩里不必展开 */
export interface SavedView {
  name: string;
  state: unknown;
  createdAt: number;
  updatedAt: number;
}

/** 自定义存储。**刻意是同步接口** —— 见文档「共享视图：接服务端」那节 */
export interface ViewsStorage {
  loadViews(): SavedView[] | null;
  saveViews(views: SavedView[]): void;
}

export interface ViewsOptions {
  /** localStorage 的 key。**多表场景必改**，默认 key 是固定的会互相覆盖 */
  storageKey?: string;
  /** 传了它 `storageKey` 忽略 */
  storage?: ViewsStorage;
  /** 面板位置。`'anchor'` 需要给 `openViewPanel(anchor)` 传按钮 */
  placement?: 'anchor' | 'top-right';
  texts?: Partial<Record<string, string>>;
  /** 应用了某个视图后触发；`name === null` 表示当前视图被删掉了 */
  onViewChange?: (name: string | null, view: SavedView | null) => void;
}

export function vtViews<T extends Record<string, unknown> = Record<string, unknown>>(
  _options: ViewsOptions = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtViews',
    setup(_ctx: PluginContext<T>) {
      stubNotice('vtViews');
    },
  };
}

/** 真包用 `declare module` 注入这些方法，这里照做一份 —— **全部可选**，桩生效时它们不存在 */
declare module '@virt-table/vanilla' {
  interface VirtTablePluginApi {
    /** 存当前状态。不传名字则覆盖当前已应用的视图 */
    saveView?(name?: string): boolean;
    applyView?(name: string): boolean;
    /** 删视图，**表格当前状态不动** */
    deleteView?(name: string): boolean;
    /** 全部视图的**副本**（外部改了不影响插件内部） */
    listViews?(): SavedView[];
    getCurrentView?(): string | null;
    /** 全部视图的 JSON 串，可直接 POST 给服务端 */
    exportViews?(): string;
    /** 用一份 JSON **整体替换**视图列表 */
    importViews?(json: string): boolean;
    openViewPanel?(anchor?: HTMLElement): void;
    closeViewPanel?(): void;
    toggleViewPanel?(anchor?: HTMLElement): void;
    isViewPanelOpen?(): boolean;
  }
}
