/**
 * `@virt-table-pro/undo` 的**桩**（同级目录没有 pro 仓库的产物时由 vite alias 顶上）。
 * 背景与取舍见本目录 README，写法与 `floating-image.ts` 那份同款。
 *
 * 真包是**两层机制**：查询状态（列宽/列序/显隐/排序/筛选/分页）自动入栈，
 * 数据变更由使用方在写回时调一次 `recordChange()`（核心没有任何编辑事件，猜不出来）。
 */
import type { PluginContext, VirtTablePlugin } from '@virt-table/vanilla';
import { stubNotice } from './stub-notice';

/** 快捷键挂在哪一层：表格根元素（默认）/ 整个 document / 不绑 */
export type UndoHotkeyTarget = 'root' | 'document' | false;

export interface HistoryChangeInfo {
  canUndo: boolean;
  canRedo: boolean;
  /** 两侧标签，离当前最近的排最前 */
  labels: { undo: string[]; redo: string[] };
}

export interface UndoOptions {
  /** 最多保留多少条历史，默认 50 */
  limit?: number;
  /** 是否自动捕获查询状态变更，默认 true */
  autoCapture?: boolean;
  /** 快捷键挂载位置，默认 `'root'`。Cmd/Ctrl+Z 撤销，Shift+Cmd/Ctrl+Z 或 Ctrl+Y 重做 */
  hotkeys?: UndoHotkeyTarget;
  /** 历史长度或游标变化时触发，用它刷自己的撤销/重做按钮 */
  onChange?: (info: HistoryChangeInfo) => void;
}

/** `recordChange()` 的入参：只记录、不执行（调它的时候变更通常已经发生了） */
export interface RecordChangeInput {
  label: string;
  undo: () => void;
  redo: () => void;
}

export function vtUndo<T extends Record<string, unknown> = Record<string, unknown>>(
  _options: UndoOptions = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtUndo',
    setup(_ctx: PluginContext<T>) {
      stubNotice('vtUndo');
    },
  };
}

/** 真包用 `declare module` 注入这些方法，这里照做一份 —— **全部可选**，桩生效时它们不存在 */
declare module '@virt-table/vanilla' {
  interface VirtTablePluginApi {
    undo?(): boolean;
    redo?(): boolean;
    canUndo?(): boolean;
    canRedo?(): boolean;
    clearHistory?(): void;
    /** 当前历史概况：两侧可用性与标签 */
    getHistory?(): HistoryChangeInfo;
    /** 录一条数据变更（核心不通知这类变更，只能使用方说一声） */
    recordChange?(input: RecordChangeInput): void;
    /** 多步合成一条：里面的状态变更与 `recordChange` 都并进去，撤销一次全退回 */
    recordTransaction?(label: string, fn: () => void): void;
  }
}
