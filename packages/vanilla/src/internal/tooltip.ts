/**
 * 溢出文本 tooltip —— 支撑 `textOverflow: 'tooltip'`（列级或全局）。
 *
 * 两个刻意的选择：
 *
 * 1. **事件委托**，不逐格绑监听。虚拟滚动复用行 DOM，`_applyCellContent` 会反复
 *    重填同一批 `td`，逐格 `addEventListener` 会随复用不断累积。
 * 2. **浮层挂在 `.vt-root` 内**，不做 body portal。`--vt-*` 变量、明暗主题、
 *    `prefers-reduced-motion` 降级（核心那条 `.vt-root *` 规则）全部自然继承，
 *    销毁时跟着根节点一起走。代价是会被 `.vt-root` 的 `overflow: hidden` 裁掉，
 *    所以定位要上下翻转 + 左右夹取，长文本靠换行而不是撑宽。
 *
 *    **别改成挂 body（已拍板）**：那只能用 `position: fixed`，而 fixed 锚在视口 ——
 *    页面或任一祖先容器滚动时，锚定的单元格移动而浮层不动，就得在每层滚动容器上
 *    挂监听逐帧重算位置，视觉上必然卡顿。挂 root 内用 `absolute` 是相对 root 定位，
 *    root 滚它就跟着滚，零 JS。（注意不是表格内部滚动的问题 —— 那个我们直接隐藏。）
 *    真要解决裁剪，正路是 CSS anchor positioning + popover，等浏览器支持铺开再说。
 *
 *    这也是全库的统一约定：所有用 `--vt-*` 的浮层（右键菜单、搜索框、筛选面板、
 *    列设置面板、拖拽 ghost）都挂在 `.vt-root` 子树里。`position: fixed` 的元素
 *    照样按视口定位，也不会被 root 的 `overflow: hidden` 裁掉。
 *
 * 定位几何抽成了纯函数 `placeTooltip()`，有 `tooltip.test.ts` 覆盖；带 DOM 的部分
 * 只负责测量与写样式。
 */

/** 浮层与单元格之间的间隙（含箭头高度） */
const GAP = 8;
/** 夹取时与 root 客户区边缘保持的距离 */
const EDGE = 4;
/** 箭头到浮层边缘的最小距离，避免夹取后箭头压在圆角上 */
const ARROW_INSET = 10;

export interface Size {
  width: number;
  height: number;
}

/** 相对 root 客户区左上角的矩形 */
export interface CellBox extends Size {
  top: number;
  left: number;
}

export interface Placement {
  left: number;
  top: number;
  /** 是否翻到了单元格下方（箭头要挪到浮层上沿） */
  below: boolean;
  /** 箭头相对浮层左边缘的横向位置 */
  arrowX: number;
}

/**
 * 纯几何：把浮层摆在单元格旁且不越出 root 客户区。
 *
 * 优先放单元格上方；上方装不下翻到下方；两边都装不下时选空间大的一侧，再把
 * 坐标夹回客户区内。夹取之后浮层不再居中于单元格，所以箭头位置要单独算。
 */
export function placeTooltip(cell: CellBox, tip: Size, box: Size): Placement {
  const cellBottom = cell.top + cell.height;
  const spaceAbove = cell.top;
  const spaceBelow = box.height - cellBottom;

  const fitsAbove = spaceAbove - GAP - tip.height >= EDGE;
  const fitsBelow = cellBottom + GAP + tip.height <= box.height - EDGE;
  const above = fitsAbove || (!fitsBelow && spaceAbove > spaceBelow);

  const top = clamp(
    above ? cell.top - GAP - tip.height : cellBottom + GAP,
    EDGE,
    Math.max(EDGE, box.height - tip.height - EDGE),
  );

  const cellCenter = cell.left + cell.width / 2;
  const left = clamp(cellCenter - tip.width / 2, EDGE, Math.max(EDGE, box.width - tip.width - EDGE));
  const arrowX = clamp(
    cellCenter - left,
    ARROW_INSET,
    Math.max(ARROW_INSET, tip.width - ARROW_INSET),
  );

  return { left: Math.round(left), top: Math.round(top), below: !above, arrowX: Math.round(arrowX) };
}

export interface TooltipOptions {
  /** 浮层挂载点，同时是定位与夹取的参照（`.vt-root`，本身已是 `position: relative`） */
  root: HTMLElement;
  /** 委托监听的容器（`tbody`） */
  delegate: HTMLElement;
  /** 命中选择器 */
  selector: string;
  /** 滚动容器：滚动会让定位失效、行 DOM 也可能被复用，直接隐藏 */
  scroller?: HTMLElement;
  /** 悬停多久才弹，默认 150ms —— 再短会在横扫单元格时闪 */
  delay?: number;
}

export interface TooltipController {
  /** 立即隐藏；未显示时是空操作，可以放在渲染路径上调用 */
  hide(): void;
  destroy(): void;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function createTooltip(options: TooltipOptions): TooltipController {
  const { root, delegate, selector, scroller, delay = 150 } = options;

  let el: HTMLElement | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  /** 当前命中的文本容器（未必已弹出，可能还在等 delay） */
  let current: HTMLElement | null = null;

  function ensureEl(): HTMLElement {
    if (el) return el;
    el = document.createElement('div');
    el.className = 'vt-tooltip';
    el.setAttribute('role', 'tooltip');
    // 单元格里的文本节点始终是完整的（省略号只是视觉裁剪），读屏本来就能读到全文，
    // 所以浮层对辅助技术隐藏，不必给每个单元格生成 id 做 aria-describedby 关联。
    el.setAttribute('aria-hidden', 'true');
    root.appendChild(el);
    return el;
  }

  function hide(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    current = null;
    if (el) el.style.display = 'none';
  }

  /**
   * 只有真被裁掉的文本才值得弹。
   *
   * ⚠️ 读 `scrollWidth` 会**强制刷新布局**：布局干净时约 0.15µs，脏了则要 20µs+
   * （实测差 100 倍以上）。滚动时指针底下的行在动，`mouseover` 会在布局脏的时候
   * 不断触发，所以这个判断放在 delay 计时器里做 —— 横扫一排单元格不产生任何重排，
   * 只有真正停下来那一格付一次。
   */
  function isTruncated(target: HTMLElement): boolean {
    return target.scrollWidth - target.clientWidth > 1;
  }

  function show(target: HTMLElement): void {
    const text = target.textContent ?? '';
    if (!text) return;

    const tip = ensureEl();
    // absolute 的原点是 root 的 padding box，而 getBoundingClientRect() 给的是
    // border box —— `.vt-root--border` 有 1px 外框，不减掉就整体偏 1px
    const rootRect = root.getBoundingClientRect();
    const originX = rootRect.left + root.clientLeft;
    const originY = rootRect.top + root.clientTop;
    const box: Size = { width: root.clientWidth, height: root.clientHeight };

    tip.textContent = text;
    tip.style.maxWidth = `${Math.max(120, box.width - EDGE * 2)}px`;
    // 先以隐形态占位渲染一次拿尺寸，定位好再显形，避免在错位置上闪一帧
    tip.style.visibility = 'hidden';
    tip.style.display = 'block';

    const rect = target.getBoundingClientRect();
    const place = placeTooltip(
      { top: rect.top - originY, left: rect.left - originX, width: rect.width, height: rect.height },
      { width: tip.offsetWidth, height: tip.offsetHeight },
      box,
    );

    tip.classList.toggle('vt-tooltip--below', place.below);
    tip.style.left = `${place.left}px`;
    tip.style.top = `${place.top}px`;
    tip.style.setProperty('--vt-tooltip-arrow-x', `${place.arrowX}px`);
    tip.style.visibility = '';
  }

  // mouseenter 不冒泡，委托只能用 mouseover / mouseout
  function onOver(e: Event): void {
    const hit = (e.target as HTMLElement | null)?.closest?.(selector) as HTMLElement | null;
    if (!hit || !delegate.contains(hit) || hit === current) return;
    hide();
    current = hit;
    // 这里刻意不碰布局，截断判定推到计时器里（见 isTruncated 的注释）
    timer = setTimeout(() => {
      timer = null;
      if (current === hit && isTruncated(hit)) show(hit);
    }, delay);
  }

  function onOut(e: MouseEvent): void {
    // 在同一格内部挪动（文本 → 子元素）不算离开
    const to = e.relatedTarget as Node | null;
    if (current && to && current.contains(to)) return;
    hide();
  }

  delegate.addEventListener('mouseover', onOver);
  delegate.addEventListener('mouseout', onOut);
  scroller?.addEventListener('scroll', hide, { passive: true });

  return {
    hide,
    destroy() {
      hide();
      delegate.removeEventListener('mouseover', onOver);
      delegate.removeEventListener('mouseout', onOut);
      scroller?.removeEventListener('scroll', hide);
      el?.remove();
      el = null;
    },
  };
}
