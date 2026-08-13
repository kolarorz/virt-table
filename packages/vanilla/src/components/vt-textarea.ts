import type { VirtTableColumn } from '../index';
import { createPopup } from './_popup';
import {
  type BaseColumnOptions,
  commitValue,
  markValidity,
  pickColumnProps,
} from './shared';

export interface VtTextareaOptions<T = any>
  extends Omit<BaseColumnOptions<T>, 'clearable'> {
  /**
   * 最多长到几行，超过就内部滚动。**默认不限**——只受表格可视高度约束。
   *
   * 不给默认上限是因为「随内容撑开」才是这个组件的点：写了 20 行就该看到 20 行，
   * 只要容器装得下。想要更克制的观感（比如始终不超过半屏）再配它。
   */
  maxRows?: number;
  maxLength?: number;
}

/**
 * 多行文本列：常态一行截断，编辑态**盖住单元格**、随内容长高。
 *
 * ```ts
 * VtTextarea({ key: 'remark', title: '备注', width: 240, textOverflow: 'tooltip' })
 * VtTextarea({ key: 'desc', title: '描述', width: 240, maxRows: 12, maxLength: 500 })
 * ```
 *
 * **为什么编辑框不直接放在 `.vt-cell-cover` 里**（那样最省事）：cover 的高度**就是单元格
 * 高度**，而它 `display: flex` + `> * { height: 100% }` —— 编辑框要么被压回一行，要么撑破
 * 那个盒子。所以编辑框走 `_popup.ts`：与 cover **同挂 `.vt-client`、同一套定位**，用
 * `cover` 模式对齐「左上角 + 宽度」，高度自己长，视觉上就是单元格自己长高了。
 *
 * 长度上限由 `.vt-client` 的可视高度给（那层 `overflow-y: hidden`，超出会被裁掉）——
 * 见下面 `autoGrow` 里的 `byHost`。
 *
 * 三条几何规则：
 *   - 宽度恒等于单元格（不是 `min-width`，横向不许溢出，否则会盖住相邻列）；
 *   - 初始高度等于单元格，随输入长高，到 `maxRows` 或容器下缘封顶（之后内部滚动）；
 *   - 长高顶出容器下缘时整体上移，保证编辑区始终完整可见。
 *
 * 值实时写回行数据（与 `VtInput` 一致），关闭编辑器时核心会 `forceUpdate()` 刷新常态。
 * 换行不提交 —— 多行输入里 Enter 就是换行；结束编辑按 Esc 或点别处。
 */
export function VtTextarea<T = any>(opts: VtTextareaOptions<T>): VirtTableColumn<T> {
  const col: VirtTableColumn<T> = {
    key: opts.key,
    title: opts.title,
    width: opts.width,
    ...pickColumnProps(opts),
  };

  if (!opts.disabled) {
    col.renderEditor = (ctx) => {
      // 返回给核心的这个元素**只当存活探针**：cell-editor 关闭编辑时会把它连同
      // .vt-cell-cover 的内容一起清掉，锚定循环据此自毁浮层。几何基准另取（见下）。
      const anchor = document.createElement('div');
      anchor.className = 'vt-comp-textarea-anchor';

      const popup = createPopup({
        anchor,
        // 此刻 anchor 还没挂进文档，宿主要从编辑浮层（已在 .vt-client 里）去找
        owner: ctx.el,
        /**
         * 几何基准取 `.vt-cell-cover`（`ctx.el`）而不是 `<td>`。
         *
         * 两者的 rect 实测完全一致（都是 249,131,260,40），但 cover 是 cell-editor
         * 创建并持续维护的**稳定元素**，而 `<td>` 会被行 DOM 池复用 —— 拿 td 当基准，
         * 滚动之后那个元素已经属于别的行，编辑框会贴到错误的位置去。
         * 跟着 cover 还顺带继承了它的「滚出窗口就隐藏、滚回来再显形」。
         */
        geometry: ctx.el,
        placement: 'cover',
        onClose: () => popup.destroy(),
      });

      const ta = document.createElement('textarea');
      ta.className = 'vt-comp-textarea';
      ta.value = (ctx.value as string) ?? '';
      ta.rows = 1; // 高度全由 autoGrow 算，rows 只作为兜底
      if (opts.placeholder) ta.placeholder = opts.placeholder;
      if (opts.maxLength !== undefined) ta.maxLength = opts.maxLength;

      /**
       * 编辑框的初始内高：单元格高度扣掉浮层自己的上下边框。
       *
       * `cellH` 是 td 的 border-box 高（默认 40），而浮层是 `box-sizing: border-box`
       * 且有 2px 边框 —— 直接把 40 给 textarea 的话浮层会变成 44，比单元格高一圈。
       */
      const cellH = ctx.el.getBoundingClientRect().height;
      const frameH = (() => {
        const cs = getComputedStyle(popup.el);
        return (
          (Number.parseFloat(cs.borderTopWidth) || 0) +
          (Number.parseFloat(cs.borderBottomWidth) || 0)
        );
      })();
      const baseH = Math.max(0, cellH - frameH);

      const autoGrow = (): void => {
        // 必须先塌回去再读 scrollHeight：textarea 的 scrollHeight 不会小于当前 height，
        // 不重置的话删内容时只增不减
        ta.style.height = '0px';
        const content = ta.scrollHeight;

        const line = Number.parseFloat(getComputedStyle(ta).lineHeight) || 20;
        const byRows = opts.maxRows ? line * opts.maxRows : Infinity;
        // 不能超出容器可视高度，否则底部会被 .vt-client 的 overflow 裁掉
        const byHost = popup.host.getBoundingClientRect().height - frameH - 8;

        const h = Math.min(Math.max(content, baseH), byRows, Math.max(baseH, byHost));
        ta.style.height = `${h}px`;
        // 到顶之后靠内部滚动，没到顶就不要出滚动条（否则空行也显示一条灰轨）
        ta.style.overflowY = content > h ? 'auto' : 'hidden';
        popup.update();
      };

      ta.addEventListener('input', () => {
        commitValue(opts, ctx, ta.value);
        if (opts.validator) markValidity(ta, opts.validator(ta.value, ctx.row));
        autoGrow();
      });
      if (opts.validator) markValidity(ta, opts.validator(ta.value, ctx.row));

      popup.el.appendChild(ta);
      autoGrow();
      requestAnimationFrame(() => {
        // 光标落到末尾，而不是选中全文——点开就是想接着写
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
        // 首帧 ctx.el 可能还没定位好，量到的 cellH 会偏；这里再校一次
        autoGrow();
      });

      return anchor;
    };
  }

  return col;
}
