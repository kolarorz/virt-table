import type { VirtTableColumn } from '../index';
import {
  type BaseColumnOptions,
  type BoolValueOptions,
  boolWriteBack,
  commitValue,
  isBoolChecked,
  makeCellWrap,
  pickColumnProps,
  stopCellInterference,
} from './shared';

export interface VtSwitchOptions<T = any> extends BaseColumnOptions<T>, BoolValueOptions {
  /** 开启时的文案，画在开关右侧；不配就不画 */
  activeText?: string;
  /** 关闭时的文案 */
  inactiveText?: string;
}

/**
 * 开关列。值语义与交互模型和 `VtCheckbox` 完全一致（共用 `isBoolChecked` /
 * `boolWriteBack`，同样不给 `renderEditor`、同样要 `stopCellInterference`），
 * 差别只在外观：一个轨道 + 一个滑块。
 *
 * ```ts
 * VtSwitch({ key: 'enabled', title: '启用', width: 110 })
 * VtSwitch({ key: 'status', title: '状态', width: 140,
 *            trueValue: 'on', falseValue: 'off',
 *            activeText: '已开启', inactiveText: '已关闭' })
 * ```
 *
 * 用 `<button role="switch">` 而不是 `<input type="checkbox">`：轨道 + 滑块要两层
 * 元素才画得出来，而 `input` 不能有子节点（伪元素能凑出来，但拿不到 `aria-checked`
 * 那种明确的状态表达，读屏也读不出「开关」这个角色）。
 */
export function VtSwitch<T = any>(opts: VtSwitchOptions<T>): VirtTableColumn<T> {
  return {
    key: opts.key,
    title: opts.title,
    width: opts.width,
    ...pickColumnProps(opts),
    render: (ctx) => {
      const wrap = makeCellWrap('switch');
      let checked = isBoolChecked(ctx.value, opts);

      const track = document.createElement('button');
      track.type = 'button';
      track.className = 'vt-comp-switch-track';
      track.setAttribute('role', 'switch');
      track.setAttribute('aria-checked', String(checked));
      if (opts.disabled) track.disabled = true;

      const thumb = document.createElement('span');
      thumb.className = 'vt-comp-switch-thumb';
      track.appendChild(thumb);
      wrap.appendChild(track);

      const hasText = opts.activeText !== undefined || opts.inactiveText !== undefined;
      let textEl: HTMLElement | null = null;
      if (hasText) {
        textEl = document.createElement('span');
        textEl.className = 'vt-comp-switch-text';
        textEl.textContent = (checked ? opts.activeText : opts.inactiveText) ?? '';
        wrap.appendChild(textEl);
      }

      if (!opts.disabled) {
        track.addEventListener('click', () => {
          checked = !checked;
          track.setAttribute('aria-checked', String(checked));
          // 自己更新视图而不是 forceUpdate()：整表重渲染只为了翻一个开关太贵，
          // 而这里的 DOM 状态本身就是视图的全部
          if (textEl) textEl.textContent = (checked ? opts.activeText : opts.inactiveText) ?? '';
          commitValue(opts, ctx, boolWriteBack(checked, opts));
        });
        stopCellInterference(wrap);
      }

      return wrap;
    },
  };
}
