import type { VirtTableColumn } from '../index';
import { createSwitch } from './_switch';
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
      /*
       * 开关本体走 `createSwitch()`（`_switch.ts`）—— 那份也被插件的配置面板用着。
       * 一处实现的意思是：`role="switch"` / `aria-checked` / 轨道与滑块的结构只有一份，
       * 改了两边一起变。这里只补「列组件那一层」的事：写回与阻断单元格干扰。
       */
      const sw = createSwitch({
        checked: isBoolChecked(ctx.value, opts),
        disabled: opts.disabled,
        activeText: opts.activeText,
        inactiveText: opts.inactiveText,
        // 自己更新视图而不是 forceUpdate()：整表重渲染只为了翻一个开关太贵，
        // 而这里的 DOM 状态本身就是视图的全部（`createSwitch` 已经画好了）
        onChange: (checked) => commitValue(opts, ctx, boolWriteBack(checked, opts)),
      });
      /*
       * 把它的子节点搬到单元格外壳里，而不是把 `sw.el` 整个塞进来：`createSwitch` 自带
       * 一层 `.vt-comp-cell .vt-comp-switch` 外壳（表单里它就是最外层），这里外面已经有
       * `makeCellWrap('switch')` 了 —— 两层锁高会打架（契约测试盯着「锁高只能有一处」）。
       * 搬完 handle 上的引用照样有效（`setChecked` 操作的是 track / 文案本身）。
       */
      wrap.append(...sw.el.childNodes);

      if (!opts.disabled) stopCellInterference(wrap);

      return wrap;
    },
  };
}
