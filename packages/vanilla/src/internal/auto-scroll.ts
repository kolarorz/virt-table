/**
 * 边缘自动滚动：鼠标拖到滚动容器边缘时持续滚动。
 *
 * 抽出来是因为**框选（vtCellSelection）与行拖拽（vtRowDrag）都要用**，
 * 而两者是各自独立的插件——不抽的话得复制两份 rAF 循环。
 *
 * 用法：拖拽开始时创建一个 controller，`mousemove` 里 `update(x, y)`，
 * 结束时 `stop()`。每帧滚动后会回调 `onTick`，让调用方按新的滚动位置更新自己的状态。
 */

export interface AutoScrollOptions {
  /** 距边缘多少 px 内开始滚动（默认 40） */
  zone?: number;
  /** 基础速度 px/帧（默认 8，越靠边越快） */
  speed?: number;
  /** 每帧滚动后触发（滚动位置已更新），用于重算命中单元格、重绘浮层 */
  onTick?: () => void;
  /**
   * 纵向滚动一段距离。**必传才有纵向自动滚动**。
   *
   * 纵向滚动位置由 JS 掌管（容器的 overflow-y 是 hidden），`scroller.scrollTop += dy`
   * 已经无效 —— 写进去浏览器不会动，读出来恒为 0。调用方必须把位移交回给虚拟滚动的
   * 偏移量（表格里是 `core.scrollFromUser(getOffset() + dy)`）。
   *
   * 横向不需要对应的钩子：那边仍是原生 scrollport，直接写 `scrollLeft` 就行。
   */
  scrollByY?: (dy: number) => void;
}

export interface AutoScrollController {
  /** 按当前鼠标位置重算滚动方向与速度；进入/离开边缘会自动启停 rAF */
  update(clientX: number, clientY: number): void;
  /** 停止滚动并取消 rAF */
  stop(): void;
  /** 当前是否正在滚动 */
  isScrolling(): boolean;
}

export function createAutoScroll(
  scroller: HTMLElement,
  options: AutoScrollOptions = {},
): AutoScrollController {
  const zone = options.zone ?? 40;
  const speed = options.speed ?? 8;
  let raf = 0;
  let dx = 0;
  let dy = 0;

  const stop = (): void => {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    dx = 0;
    dy = 0;
  };

  const tick = (): void => {
    if (dx === 0 && dy === 0) {
      stop();
      return;
    }
    // 横向仍是原生 scrollport，直接写；纵向必须走回调（见 scrollByY）
    if (dx !== 0) scroller.scrollLeft += dx;
    if (dy !== 0) options.scrollByY?.(dy);
    options.onTick?.();
    raf = requestAnimationFrame(tick);
  };

  return {
    update(clientX: number, clientY: number): void {
      const rect = scroller.getBoundingClientRect();
      dx = 0;
      dy = 0;

      // 越靠边越快（至少 1 倍速）
      if (clientY < rect.top + zone) {
        dy = -speed * Math.max(1, (rect.top + zone - clientY) / zone);
      } else if (clientY > rect.bottom - zone) {
        dy = speed * Math.max(1, (clientY - (rect.bottom - zone)) / zone);
      }
      if (clientX < rect.left + zone) {
        dx = -speed * Math.max(1, (rect.left + zone - clientX) / zone);
      } else if (clientX > rect.right - zone) {
        dx = speed * Math.max(1, (clientX - (rect.right - zone)) / zone);
      }

      if ((dx !== 0 || dy !== 0) && !raf) {
        raf = requestAnimationFrame(tick);
      } else if (dx === 0 && dy === 0) {
        stop();
      }
    },
    stop,
    isScrolling: () => raf !== 0,
  };
}
