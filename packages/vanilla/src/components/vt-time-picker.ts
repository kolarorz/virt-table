import type { VirtTableColumn } from '../index';
import {
  type BaseColumnOptions,
  INPUT_CSS,
  commitValue,
  wrapWithClear,
  pickColumnProps,
} from './shared';

export interface VtTimePickerOptions<T = any> extends BaseColumnOptions<T> {
  /** 最早可选，`HH:mm` 或 `HH:mm:ss` */
  min?: string;
  /** 最晚可选 */
  max?: string;
  /** 步进（秒）。给 1 就出现秒位 */
  step?: number;
}

/**
 * 时间列。与 `VtDatePicker` 同构，只是把原生控件换成 `input[type=time]`。
 *
 * ```ts
 * VtTimePicker({ key: 'startAt', title: '开始时间', width: 160 })
 * VtTimePicker({ key: 'checkAt', title: '打卡', width: 180, step: 1, clearable: true })
 * ```
 *
 * 值就是原生控件的字符串格式（`'09:30'` / `step` 带秒时 `'09:30:15'`），不做二次解析
 * —— 表格拿到什么就存什么，格式化留给使用方的 `render` 或数据层。
 */
export function VtTimePicker<T = any>(opts: VtTimePickerOptions<T>): VirtTableColumn<T> {
  const col: VirtTableColumn<T> = {
    key: opts.key,
    title: opts.title,
    width: opts.width,
    ...pickColumnProps(opts),
  };

  if (!opts.disabled) {
    col.renderEditor = (ctx) => {
      const input = document.createElement('input');
      input.type = 'time';
      input.className = 'vt-comp-input vt-comp-time';
      input.value = (ctx.value as string) ?? '';
      if (opts.min) input.min = opts.min;
      if (opts.max) input.max = opts.max;
      if (opts.step !== undefined) input.step = String(opts.step);
      input.style.cssText = INPUT_CSS;
      input.addEventListener('change', () => {
        commitValue(opts, ctx, input.value);
      });
      requestAnimationFrame(() => input.focus());

      return wrapWithClear(input, !!opts.clearable, () => {
        input.value = '';
        commitValue(opts, ctx, '');
      });
    };
  }

  return col;
}
