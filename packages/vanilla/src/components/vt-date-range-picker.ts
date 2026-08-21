import type { VirtTableColumn } from '../index';
import { zhCN, type VtCalendarTexts } from '../locale';
import { formatDay, formatRange, type DayStr, type VtDateShortcutsOption } from './_calendar';
import { createDateEditor } from './_date-editor';
import {
  type BaseColumnOptions,
  INPUT_CSS,
  clearableOn,
  commitValue,
  pickColumnProps,
  wrapWithClear,
} from './shared';

interface VtDateRangeCommon<T> extends BaseColumnOptions<T> {
  /** 常态与锚点回显的分隔符，默认 `' ~ '` */
  separator?: string;
  /** 最早可选，`'YYYY-MM-DD'` */
  min?: string;
  /** 最晚可选 */
  max?: string;
}

/** 自绘双月面板支路（默认） */
export interface VtDateRangePickerPanelOptions<T = any> extends VtDateRangeCommon<T> {
  native?: false;
  /** 并排几个月，默认 2；`.vt-root` 放不下时自动降级成 1 */
  panels?: 1 | 2;
  /** 0=周日 … 6=周六，默认 1（周一） */
  firstDayOfWeek?: number;
  /** 快捷项：数组整体替换，函数拿到内置全集自己拼（同 label 视作就地覆盖） */
  shortcuts?: VtDateShortcutsOption;
  /** 文案覆盖，缺省取 `zhCN.calendar`。**建列时读一次，不跟随运行时 `setLocale()`** */
  texts?: Partial<VtCalendarTexts>;
}

/** 原生控件支路：两个 `input[type=date]` 并排，即改造前的样子 */
export interface VtDateRangePickerNativeOptions<T = any> extends VtDateRangeCommon<T> {
  native: true;
  /* 下面几个是面板专属。声明成 never 而不是省略：`asCell()` 的 `Omit<A | B, K>` 只保留
     两支**共有**的键，不占位的话 `asCell(VtDateRangePicker, { native: true })` 编译不过 */
  panels?: never;
  firstDayOfWeek?: never;
  shortcuts?: never;
  texts?: never;
}

export type VtDateRangePickerOptions<T = any> =
  | VtDateRangePickerPanelOptions<T>
  | VtDateRangePickerNativeOptions<T>;

/** `renderEditor` 收到的上下文里本组件用到的那部分 */
interface EditCtx<T> {
  value: unknown;
  el: HTMLElement;
  row: T;
  rowIndex: number;
  column: { key: string };
}

/**
 * 日期区间列。值是 `['YYYY-MM-DD', 'YYYY-MM-DD']` 两个字符串。
 *
 * ```ts
 * VtDateRangePicker({ key: 'period', title: '项目周期', width: 260 })
 * VtDateRangePicker({ key: 'period', title: '项目周期', width: 260, clearable: true,
 *                     min: '2024-01-01', max: '2026-12-31', firstDayOfWeek: 0 })
 * VtDateRangePicker({ key: 'period', title: '项目周期', width: 260, native: true })  // 原生控件
 * ```
 *
 * 编辑态默认是**自绘的双月日历**：点起点 → 移动鼠标预览区间 → 点终点即写回并关面板。
 * 反向选择（先点晚的再点早的）自动归一，点同一天两次得到一天的区间。底部一排快捷项
 * （今天 / 昨天 / 本周 / 本月 / 本季度 / 最近 7 天 / 最近 30 天），可用 `shortcuts` 增删替换。
 * 键盘：`←→` 跨天、`↑↓` 跨周、`PageUp/Down` 跨月（配 `Shift` 跨年）、`Home/End` 到周首末、
 * `Enter` 确认、`Esc` 关闭。
 *
 * `clearable` **默认开**（两条支路都给）：面板支路是锚点上一个 `×` 且 `Delete` / `Backspace`
 * 同效，原生支路是外壳上那个 `×`；清空写回 `['', '']`。传 `clearable: false` 关掉。
 *
 * 改造前这里是两个原生 `input[type=date]` 并排，起止得分两次点开各自的原生日历分别选；
 * `native: true` 保留那条路。两支在 `min`/`max` 上的语义不同：原生支路把它们交给浏览器
 * （各家对越界输入的处理不一致），自绘支路是确定的 —— 越界格不可点，整段越界的快捷项不
 * 出现，部分越界的取交集。
 */
export function VtDateRangePicker<T = any>(
  opts: VtDateRangePickerOptions<T>,
): VirtTableColumn<T> {
  const sep = opts.separator ?? ' ~ ';

  const col: VirtTableColumn<T> = {
    key: opts.key,
    title: opts.title,
    width: opts.width,
    ...pickColumnProps(opts),
    // 与编辑态锚点共用 formatRange —— 点开单元格文字不跳，靠的就是同一个函数
    render: ({ value }) => formatRange(value, sep) || (opts.placeholder ?? ''),
  };

  if (opts.disabled) return col;

  col.renderEditor = (opts.native
    ? nativeEdit(opts)
    : panelEdit(opts as VtDateRangePickerPanelOptions<T>)) as VirtTableColumn<T>['renderEditor'];

  return col;
}

/** 自绘面板支路 */
function panelEdit<T>(opts: VtDateRangePickerPanelOptions<T>) {
  const sep = opts.separator ?? ' ~ ';
  const texts: VtCalendarTexts = { ...zhCN.calendar, ...(opts.texts ?? {}) };

  return (ctx: EditCtx<T>): HTMLElement =>
    createDateEditor(ctx, {
      mode: 'range',
      texts,
      min: opts.min,
      max: opts.max,
      firstDayOfWeek: opts.firstDayOfWeek,
      panels: opts.panels ?? 2,
      shortcuts: opts.shortcuts,
      placeholder: opts.placeholder,
      // 与单日版同一条规则：锚点没有「变回空」的手段，× 默认给（见 `clearableOn`）
      clearable: clearableOn(opts),
      read: (v) => (Array.isArray(v) ? [formatDay(v[0]), formatDay(v[1])] : ['', '']),
      write: (range: [DayStr, DayStr]) => [range[0], range[1]],
      // 空值沿用改造前的形状（`['', '']`），别换成 null —— 排序/导出/剪贴板都按老形状在用
      emptyValue: ['', ''],
      display: (v) => formatRange(v, sep),
      commit: (v) => commitValue(opts, ctx as never, v as never),
    });
}

/**
 * 原生控件支路。与改造前逐字相同的实现 —— 它同时是 `.vt-comp-date-range` /
 * `.vt-comp-date-range-sep` 那两条 CSS 的消费者（所以那几条不是孤儿，别删）。
 */
function nativeEdit<T>(opts: VtDateRangePickerNativeOptions<T>) {
  const sep = opts.separator ?? ' ~ ';

  return (ctx: EditCtx<T>): HTMLElement => {
    const arr = (ctx.value as [string, string]) ?? ['', ''];
    const start = Array.isArray(arr) ? arr[0] ?? '' : '';
    const end = Array.isArray(arr) ? arr[1] ?? '' : '';

    const wrap = document.createElement('div');
    wrap.className = 'vt-comp-date-range';

    const mkInput = (value: string): HTMLInputElement => {
      const input = document.createElement('input');
      input.type = 'date';
      input.className = 'vt-comp-input vt-comp-date';
      input.value = value;
      if (opts.min) input.min = opts.min;
      if (opts.max) input.max = opts.max;
      input.style.cssText = INPUT_CSS + 'flex:1;';
      return input;
    };

    const startInput = mkInput(start);
    const endInput = mkInput(end);

    const sepSpan = document.createElement('span');
    sepSpan.className = 'vt-comp-date-range-sep';
    sepSpan.textContent = sep;

    const sync = (): void => {
      commitValue(opts, ctx as never, [startInput.value, endInput.value] as never);
    };
    startInput.addEventListener('change', sync);
    endInput.addEventListener('change', sync);

    wrap.append(startInput, sepSpan, endInput);
    requestAnimationFrame(() => startInput.focus());

    /**
     * 原生支路也要那个 `×`。
     *
     * 改造前这一支根本没有清除按钮（`clearable` 在这里是个死选项），于是「区间列填过一次
     * 就填不回空」—— 两个原生 `input[type=date]` 各自只能改选日期。套 `.vt-comp-wrap` 与
     * 单日版的原生支路同款：留白扣在外壳上，`×` 落在两个原生日历图标右边。
     */
    return wrapWithClear(wrap, clearableOn(opts), () => {
      startInput.value = '';
      endInput.value = '';
      // 空值沿用既有形状（`['', '']`），与面板支路的 `emptyValue` 一致
      commitValue(opts, ctx as never, ['', ''] as never);
    });
  };
}
