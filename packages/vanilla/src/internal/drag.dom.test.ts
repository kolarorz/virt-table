// @vitest-environment happy-dom
/** 拖拽手势基元的 Pointer Events 行为。写法说明见 AGENTS.md §5.1 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { startDrag, isPrimaryPointer } from './drag';

const down = (init: PointerEventInit = {}) =>
  new PointerEvent('pointerdown', {
    bubbles: true, clientX: 100, clientY: 100, button: 0,
    isPrimary: true, pointerId: 1, pointerType: 'mouse', ...init,
  });
const move = (x: number, y: number, pointerId = 1) =>
  new PointerEvent('pointermove', { bubbles: true, clientX: x, clientY: y, pointerId });
const up = (pointerId = 1) =>
  new PointerEvent('pointerup', { bubbles: true, clientX: 0, clientY: 0, pointerId });
const cancel = (pointerId = 1) =>
  new PointerEvent('pointercancel', { bubbles: true, clientX: 0, clientY: 0, pointerId });

const spies = () => ({
  onStart: vi.fn(), onMove: vi.fn(), onDrop: vi.fn(), onCancel: vi.fn(),
});

afterEach(() => {
  // 万一某个用例没走到 up，把残留监听清掉（startDrag 只在 up/cancel 时解绑）
  document.dispatchEvent(up());
  document.dispatchEvent(up(2));
});

describe('isPrimaryPointer', () => {
  it('只接受主指针 + button 0', () => {
    expect(isPrimaryPointer(down())).toBe(true);
    expect(isPrimaryPointer(down({ button: 2 }))).toBe(false); // 右键
    expect(isPrimaryPointer(down({ button: 1 }))).toBe(false); // 中键
    expect(isPrimaryPointer(down({ isPrimary: false }))).toBe(false); // 多指里的次指针
  });

  it('触屏 / 手写笔一样通过（只看 isPrimary + button）', () => {
    expect(isPrimaryPointer(down({ pointerType: 'touch' }))).toBe(true);
    expect(isPrimaryPointer(down({ pointerType: 'pen' }))).toBe(true);
  });
});

describe('startDrag 阈值', () => {
  it('没动就松手 → onCancel，不触发 onStart / onDrop', () => {
    const h = spies();
    startDrag(down(), h);
    document.dispatchEvent(up());
    expect(h.onCancel).toHaveBeenCalledOnce();
    expect(h.onStart).not.toHaveBeenCalled();
    expect(h.onDrop).not.toHaveBeenCalled();
  });

  it('没越过阈值的移动不算开始拖', () => {
    const h = spies();
    startDrag(down(), h);
    document.dispatchEvent(move(103, 100)); // dx=3 < 4
    expect(h.onStart).not.toHaveBeenCalled();
    expect(h.onMove).not.toHaveBeenCalled();
    document.dispatchEvent(up());
    expect(h.onCancel).toHaveBeenCalledOnce();
  });

  it('越过阈值 → onStart 只一次，之后每次 move 都回调，带上 dx/dy', () => {
    const h = spies();
    startDrag(down(), h);
    document.dispatchEvent(move(110, 100));
    document.dispatchEvent(move(120, 105));
    expect(h.onStart).toHaveBeenCalledOnce();
    expect(h.onMove).toHaveBeenCalledTimes(2);
    expect(h.onMove.mock.calls[1].slice(1)).toEqual([20, 5]);
    document.dispatchEvent(up());
    expect(h.onDrop).toHaveBeenCalledOnce();
    expect(h.onCancel).not.toHaveBeenCalled();
  });

  it('threshold 0 → 第一次 move 就算（列宽拖拽用这个跟手）', () => {
    const h = spies();
    startDrag(down(), { ...h, threshold: 0 });
    document.dispatchEvent(move(100, 100)); // dx=dy=0
    expect(h.onStart).toHaveBeenCalledOnce();
    expect(h.onMove).toHaveBeenCalledOnce();
    document.dispatchEvent(up());
  });
});

describe('startDrag 多指与取消', () => {
  it('按 pointerId 过滤：别的指针的事件一概不理', () => {
    const h = spies();
    startDrag(down({ pointerId: 7 }), h);
    document.dispatchEvent(move(200, 200, 9)); // 另一根手指
    expect(h.onMove).not.toHaveBeenCalled();
    document.dispatchEvent(up(9));
    expect(h.onCancel).not.toHaveBeenCalled(); // 也不该被它结束掉
    document.dispatchEvent(move(200, 200, 7));
    expect(h.onMove).toHaveBeenCalledOnce();
    document.dispatchEvent(up(7));
    expect(h.onDrop).toHaveBeenCalledOnce();
  });

  it('pointercancel（系统接管手势）走 onCancel，即使已经拖起来了', () => {
    const h = spies();
    startDrag(down(), h);
    document.dispatchEvent(move(120, 100));
    expect(h.onStart).toHaveBeenCalledOnce();
    document.dispatchEvent(cancel());
    expect(h.onCancel).toHaveBeenCalledOnce();
    expect(h.onDrop).not.toHaveBeenCalled();
  });

  it('结束后监听已解绑：后续事件不再回调', () => {
    const h = spies();
    startDrag(down(), h);
    document.dispatchEvent(move(120, 100));
    document.dispatchEvent(up());
    h.onMove.mockClear();
    document.dispatchEvent(move(300, 300));
    document.dispatchEvent(up());
    expect(h.onMove).not.toHaveBeenCalled();
    expect(h.onDrop).toHaveBeenCalledOnce(); // 仍是那一次
  });

  it('两个手势可以独立并存（各自的 pointerId）', () => {
    const a = spies();
    const b = spies();
    startDrag(down({ pointerId: 1 }), a);
    startDrag(down({ pointerId: 2 }), b);
    document.dispatchEvent(move(120, 100, 1));
    expect(a.onMove).toHaveBeenCalledOnce();
    expect(b.onMove).not.toHaveBeenCalled();
    document.dispatchEvent(move(120, 100, 2));
    expect(b.onMove).toHaveBeenCalledOnce();
    document.dispatchEvent(up(1));
    document.dispatchEvent(up(2));
    expect(a.onDrop).toHaveBeenCalledOnce();
    expect(b.onDrop).toHaveBeenCalledOnce();
  });
});
