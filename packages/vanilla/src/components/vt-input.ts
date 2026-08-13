import type { VirtTableColumn } from '../index';
import {
  type BaseColumnOptions,
  INPUT_CSS,
  commitValue,
  wrapWithClear,
  pickColumnProps,
  markValidity,
} from './shared';

export interface VtInputOptions<T = any> extends BaseColumnOptions<T> {
  maxLength?: number;
}

export function VtInput<T = any>(opts: VtInputOptions<T>): VirtTableColumn<T> {
  const col: VirtTableColumn<T> = {
    key: opts.key,
    title: opts.title,
    width: opts.width,
    ...pickColumnProps(opts),
  };

  if (!opts.disabled) {
    col.renderEditor = (ctx) => {
      const { value, row } = ctx;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'vt-comp-input';
      input.value = (value as string) ?? '';
      input.placeholder = opts.placeholder ?? '';
      if (opts.maxLength !== undefined) input.maxLength = opts.maxLength;
      input.style.cssText = INPUT_CSS;
      input.addEventListener('input', () => {
        commitValue(opts, ctx, input.value);
        if (opts.validator) markValidity(input, opts.validator(input.value, row));
      });
      if (opts.validator) markValidity(input, opts.validator(input.value, row));
      requestAnimationFrame(() => input.focus());

      return wrapWithClear(input, !!opts.clearable, () => {
        input.value = '';
        commitValue(opts, ctx, '');
      });
    };
  }

  return col;
}
