import type { VirtTableColumn } from '../index';
import { zhCN, type VtCalendarTexts } from '../locale';
import { formatDay, type DayStr, type VtDateShortcutsOption } from './_calendar';
import { createDateEditor } from './_date-editor';
import {
  type BaseColumnOptions,
  INPUT_CSS,
  clearableOn,
  commitValue,
  pickColumnProps,
  wrapWithClear,
} from './shared';

interface VtDatePickerCommon<T> extends BaseColumnOptions<T> {
  /** 最早可选，`'YYYY-MM-DD'` */
  min?: string;
  /** 最晚可选 */
  max?: string;
}

/** 自绘面板支路（默认） */
export interface VtDatePickerPanelOptions<T = any> extends VtDatePickerCommon<T> {
  native?: false;
  /** 0=周日 … 6=周六，默认 1（周一） */
  firstDayOfWeek?: number;
  /** 快捷项：数组整体替换，函数拿到内置全集自己拼。单日模式下内置只留「今天 / 昨天」 */
  shortcuts?: VtDateShortcutsOption;
  /** 文案覆盖，缺省取 `zhCN.calendar`。**建列时读一次，不跟随运行时 `setLocale()`** */
  texts?: Partial<VtCalendarTexts>;
}

/** 原生控件支路：`input[type=date]`，即改造前的样子 */
export interface VtDatePickerNativeOptions<T = any> extends VtDatePickerCommon<T> {
  native: true;
  /* 面板专属选项在这一支声明成 never 而不是省略 —— 理由见 vt-date-range-picker.ts 同处注释 */
  firstDayOfWeek?: never;
  shortcuts?: never;
  texts?: never;
}

export type VtDatePickerOptions<T = any> =
  | VtDatePickerPanelOptions<T>
  | VtDatePickerNativeOptions<T>;

/** `renderEditor` 收到的上下文里本组件用到的那部分 */
interface EditCtx<T> {
  value: unknown;
  el: HTMLElement;
  row: T;
  rowIndex: number;
  column: { key: string };
}

/**
 * 日期列。值就是 `'YYYY-MM-DD'` 字符串，不做二次解析 —— 表格拿到什么就存什么。
 *
 * ```ts
 * VtDatePicker({ key: 'joinDate', title: '入职日期', width: 160 })
 * VtDatePicker({ key: 'deadline', title: '截止', width: 160, clearable: true, min: '2024-01-01' })
 * VtDatePicker({ key: 'joinDate', title: '入职日期', width: 160, native: true })  // 原生控件
 * ```
 *
 * 编辑态默认是**自绘的单月日历**（与 `VtDateRangePicker` 同一套面板，只是单选 + 单月）：
 * 外观跟随 `--vt-*`（含暗色），而且同一张表里日期列与区间列点开长得一样。底部快捷项只留
 * 「今天 / 昨天」——「本周」这类区间语义在单日下没有意义，`resolveShortcuts` 按模式滤掉。
 * 键盘与区间版一致（`←→` 跨天、`↑↓` 跨周、`PageUp/Down` 跨月、`Enter` 确认）。
 *
 * `native: true` 切回浏览器原生 `input[type=date]`（不跟随暗色主题，但不依赖本库的面板实现）。
 *
 * `clearable` **默认开**（两条支路都给）：面板支路是锚点右侧一个 `×` 且 `Delete` /
 * `Backspace` 同效，原生支路是 `.vt-comp-wrap` 外壳上那个 `×`。传 `clearable: false` 关掉。
 */
export function VtDatePicker<T = any>(opts: VtDatePickerOptions<T>): VirtTableColumn<T> {
  const col: VirtTableColumn<T> = {
    key: opts.key,
    title: opts.title,
    width: opts.width,
    ...pickColumnProps(opts),
    /*
     * 改造前这个组件没有 render（核心回落到 `String(value)`）。加上它是为了与编辑态锚点共用
     * 同一个格式化函数 —— 点开单元格文字不许跳。合法值上二者同结果，两处有意的差别：空值
     * 改为显示 placeholder（`placeholder` 本就是「空值占位」的语义），非法日期串（如
     * `'2026-2-3'`）显示成空。
     */
    render: ({ value }) => formatDay(value) || (opts.placeholder ?? ''),
  };

  if (opts.disabled) return col;

  col.renderEditor = (opts.native
    ? nativeEdit(opts)
    : panelEdit(opts as VtDatePickerPanelOptions<T>)) as VirtTableColumn<T>['renderEditor'];

  return col;
}

/** 自绘面板支路 */
function panelEdit<T>(opts: VtDatePickerPanelOptions<T>) {
  const texts: VtCalendarTexts = { ...zhCN.calendar, ...(opts.texts ?? {}) };

  return (ctx: EditCtx<T>): HTMLElement =>
    createDateEditor(ctx, {
      mode: 'single',
      texts,
      min: opts.min,
      max: opts.max,
      firstDayOfWeek: opts.firstDayOfWeek,
      panels: 1,
      shortcuts: opts.shortcuts,
      placeholder: opts.placeholder,
      // 日历里只能改选另一天，没有「选回空」那一格 —— 所以 × 默认给（见 `clearableOn`）
      clearable: clearableOn(opts),
      // 单日模式下面板只看 [0]，第二位跟着传同一天，省掉一个特例分支
      read: (v) => {
        const d = formatDay(v);
        return [d, d];
      },
      write: (range: [DayStr, DayStr]) => range[0],
      emptyValue: '',
      display: (v) => formatDay(v),
      commit: (v) => commitValue(opts, ctx as never, v as never),
    });
}

/**
 * 原生控件支路。与改造前逐字相同 —— 它是 `.vt-comp-date::-webkit-calendar-picker-indicator`
 * 与 `.vt-comp-wrap` 那条右侧留白（给 clearable 的 `×` 让位，免得和原生日历图标重合）的
 * 消费者。
 */
function nativeEdit<T>(opts: VtDatePickerNativeOptions<T>) {
  return (ctx: EditCtx<T>): HTMLElement => {
    const input = document.createElement('input');
    input.type = 'date';
    input.className = 'vt-comp-input vt-comp-date';
    input.value = (ctx.value as string) ?? '';
    if (opts.min) input.min = opts.min;
    if (opts.max) input.max = opts.max;
    input.style.cssText = INPUT_CSS;
    input.addEventListener('change', () => {
      commitValue(opts, ctx as never, input.value as never);
    });
    requestAnimationFrame(() => input.focus());

    return wrapWithClear(input, clearableOn(opts), () => {
      input.value = '';
      commitValue(opts, ctx as never, '' as never);
    });
  };
}
