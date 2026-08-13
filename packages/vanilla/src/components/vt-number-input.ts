import type { VirtTableColumn } from '../index';
import {
  type BaseColumnOptions,
  INPUT_CSS,
  commitValue,
  wrapWithClear,
  pickColumnProps,
  markValidity,
} from './shared';

export interface VtNumberInputOptions<T = any> extends BaseColumnOptions<T> {
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
}

function formatNumber(val: unknown, precision?: number): string {
  if (val === null || val === undefined || val === '') return '';
  const n = Number(val);
  if (Number.isNaN(n)) return String(val);
  return precision !== undefined ? n.toFixed(precision) : String(n);
}

export function VtNumberInput<T = any>(opts: VtNumberInputOptions<T>): VirtTableColumn<T> {
  const col: VirtTableColumn<T> = {
    key: opts.key,
    title: opts.title,
    width: opts.width,
    ...pickColumnProps(opts),
    render: ({ value }) => formatNumber(value, opts.precision),
  };

  if (!opts.disabled) {
    col.renderEditor = (ctx) => {
      const { value, row, column } = ctx;
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'vt-comp-input';
      input.value = (value as any) ?? '';
      input.placeholder = opts.placeholder ?? '';
      if (opts.min !== undefined) input.min = String(opts.min);
      if (opts.max !== undefined) input.max = String(opts.max);
      if (opts.step !== undefined) input.step = String(opts.step);
      input.style.cssText = INPUT_CSS;
      input.addEventListener('input', () => {
        const v = input.value;
        const parsed = v === '' ? null : Number(v);
        commitValue(opts, ctx, parsed);
        if (opts.validator) markValidity(input, opts.validator(parsed, row));
      });
      if (opts.validator) markValidity(input, opts.validator((row as any)[column.key], row));
      requestAnimationFrame(() => input.focus());

      return wrapWithClear(input, !!opts.clearable, () => {
        input.value = '';
        commitValue(opts, ctx, null);
      });
    };
  }

  return col;
}
