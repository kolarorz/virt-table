import type { VirtTableColumn } from '../index';
import {
  type BaseColumnOptions,
  type BoolValueOptions,
  boolWriteBack,
  commitValue,
  isBoolChecked,
  pickColumnProps,
  stopCellInterference,
} from './shared';

export interface VtCheckboxOptions<T = any> extends BaseColumnOptions<T>, BoolValueOptions {}

/**
 * 布尔列：单元格里直接画一个可点的勾选框。
 *
 * ```ts
 * VtCheckbox({ key: 'enabled', title: '启用', width: 100, align: 'center' })
 * VtCheckbox({ key: 'vip', title: 'VIP', trueValue: 'Y', falseValue: 'N' })
 * VtCheckbox({ key: 'locked', title: '锁定', disabled: true })   // 只读回显
 * ```
 *
 * 三点设计说明：
 *
 * 1. **不提供 `renderEditor`，点一下就改值**。给了的话装 `vtCellEditor` 的人点勾选框会先
 *    弹出一个盖住勾选框的编辑浮层，得点第二下才切换 —— 对一个开关型控件是纯粹的多余。
 *    代价是这一列不参与「编辑态」语义（Esc 撤销、`openCellEditor()` 打开），布尔列本来
 *    也没有可撤销的中间状态。
 * 2. **`stopCellInterference` 是必需的**，否则 `vtCellSelection` 会把点击当框选起点、
 *    `vtCellEditor`（默认 `trigger: 'click'`）会试图进入编辑态。
 * 3. 皮肤直接用核心的 `.vt-cell-bool` + `.vt-checkbox` —— 与 `cellType: 'checkbox'`
 *    的只读版同源，两者视觉必然一致，且高度已被 `css-contract.test.ts` 锁在行高上。
 *
 * 值不是 `true/false` 时配 `trueValue` / `falseValue`（`1/0`、`'Y'/'N'` 都常见）。
 * ⚠️ 用字符串枚举时**必须**配 `trueValue`：不配就退回 JS 真值判断，`'N'` 会被判成真。
 */
export function VtCheckbox<T = any>(opts: VtCheckboxOptions<T>): VirtTableColumn<T> {
  return {
    key: opts.key,
    title: opts.title,
    width: opts.width,
    ...pickColumnProps(opts),
    render: (ctx) => {
      const wrap = document.createElement('span');
      wrap.className = 'vt-cell-bool';

      const box = document.createElement('input');
      box.type = 'checkbox';
      box.className = 'vt-checkbox';
      box.checked = isBoolChecked(ctx.value, opts);
      box.disabled = !!opts.disabled;

      if (!opts.disabled) {
        box.addEventListener('change', () => {
          commitValue(opts, ctx, boolWriteBack(box.checked, opts));
        });
        stopCellInterference(wrap);
      }

      wrap.appendChild(box);
      return wrap;
    },
  };
}
