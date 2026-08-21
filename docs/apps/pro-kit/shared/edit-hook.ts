/**
 * 单元格编辑的通知桥 —— 三端 playground 共用。
 *
 * ## 为什么需要这层间接
 *
 * `vtUndo` 的手动层要求「谁改了数据，谁把撤销/重做交给插件」（核心没有编辑事件，
 * `renderEditor` 返回的控件由使用方自己写回行数据，核心不知道发生了什么）。
 * 而录制要调 `table.recordChange()`，那是**表格实例**上的方法。
 *
 * 问题是列定义（`shared/data.ts` 的 `columns`）是**模块级常量、三端共用**，写在里面的
 * `renderEditor` 拿不到任何一端的 table 实例。于是编辑器只负责喊一声「我改了什么」，
 * 各端在自己拿到实例之后订阅，把它翻译成 `recordChange`。
 *
 * 真实项目里通常不需要这层：列定义就在持有表格实例的那个组件里，直接闭包引用即可。
 */

export interface CellEditInfo {
  /** 被编辑的行对象（已经写回了新值） */
  row: Record<string, unknown>;
  /** 被编辑的字段 */
  key: string;
  before: unknown;
  after: unknown;
  /** 给历史看的说明，如「编辑 项目 0007 的金额」 */
  label: string;
}

type Listener = (info: CellEditInfo) => void;

/** 单个监听者就够：一个页面里一端只有一张表 */
let listener: Listener | null = null;

/** 订阅编辑通知。传 `null` 取消订阅（组件卸载时要调，否则 React 严格模式下会留下旧闭包） */
export function onCellEdit(fn: Listener | null): void {
  listener = fn;
}

export function emitCellEdit(info: CellEditInfo): void {
  listener?.(info);
}
