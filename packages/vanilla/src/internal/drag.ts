/**
 * 拖拽手势基元：按下后超过阈值才算「开始拖」，避免把点击误判成拖拽。
 *
 * 抽出来是因为**三处都要用**：列宽调整（`_startResize`，留在核心）、
 * 列拖拽排序（`vtColumnDrag`）、行拖拽排序（`vtRowDrag`）。
 *
 * 走 **Pointer Events**（不是 mouse），所以鼠标 / 触屏 / 手写笔一套代码通吃。
 * 两个配套要求，缺一个触屏就不工作：
 *
 * 1. **发起元素必须设 `touch-action`**（`none` 或 `pan-y`）。触屏上浏览器一旦决定
 *    开始滚动就不会再把 move 事件给我们，而 `preventDefault()` 对 `pointermove`
 *    拦不住滚动 —— 只有 `touch-action` 能在手势开始前就把这块区域让出来。
 * 2. **按 `pointerId` 过滤**：多指同时按时会有多条事件流，不过滤会串。
 *
 * 刻意**没用 `setPointerCapture`**：手势一旦开始（`touch-action` 已经让浏览器放弃
 * 滚动），事件流就会持续送到 document，不需要捕获；而捕获会把事件重定向到发起元素，
 * 元素在拖拽中被移除时（虚拟滚动回收行）还得额外处理 `releasePointerCapture` 抛错。
 */

export interface DragHandlers {
  /** 超过多少 px 才算开始拖（默认 4；传 0 表示第一次 move 就算） */
  threshold?: number;
  /** 首次越过阈值时触发一次 */
  onStart?: () => void;
  onMove: (ev: PointerEvent, dx: number, dy: number) => void;
  /** 拖过阈值后松手 */
  onDrop: (ev: PointerEvent) => void;
  /** 没拖过阈值就松手（等价于一次点击），或手势被系统取消（`pointercancel`） */
  onCancel?: () => void;
}

/** 只接受主指针的「左键等价」按下：滤掉右键、中键，以及多指里的次指针 */
export function isPrimaryPointer(e: PointerEvent): boolean {
  return e.isPrimary && e.button === 0;
}

export function startDrag(e: PointerEvent, handlers: DragHandlers): void {
  const { pointerId } = e;
  const startX = e.clientX;
  const startY = e.clientY;
  const threshold = handlers.threshold ?? 4;
  let started = false;

  const cleanup = (): void => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onPointerCancel);
  };

  const onMove = (ev: PointerEvent): void => {
    if (ev.pointerId !== pointerId) return;
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    if (!started) {
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
      started = true;
      handlers.onStart?.();
    }
    // 拦的是文本选中之类的默认行为；触屏滚动靠发起元素的 touch-action，不靠这里
    ev.preventDefault();
    handlers.onMove(ev, dx, dy);
  };

  const onUp = (ev: PointerEvent): void => {
    if (ev.pointerId !== pointerId) return;
    cleanup();
    if (started) handlers.onDrop(ev);
    else handlers.onCancel?.();
  };

  /** 系统取消手势（来电、多指、浏览器接管…）：一律按「没拖成」处理 */
  const onPointerCancel = (ev: PointerEvent): void => {
    if (ev.pointerId !== pointerId) return;
    cleanup();
    handlers.onCancel?.();
  };

  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onPointerCancel);
}

/**
 * 吞掉紧随拖拽之后的那一次 click。
 *
 * 不做的话：拖完列头松手，浏览器还会派发一次 click，会误触发表头排序。
 * 触屏上浏览器同样会在 pointerup 之后合成 click，所以这条对两种输入都需要。
 */
export function swallowNextClick(): void {
  const swallow = (ce: MouseEvent): void => {
    ce.stopPropagation();
    ce.preventDefault();
  };
  document.addEventListener('click', swallow, { capture: true, once: true });
  setTimeout(() => document.removeEventListener('click', swallow, true), 0);
}
