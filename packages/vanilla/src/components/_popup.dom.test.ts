// @vitest-environment happy-dom
/**
 * `_popup.ts` 的**宿主与定位契约**：浮层必须与 `.vt-cell-cover` 挂同一层、用同一套公式。
 *
 * 这些是 `components.dom.test.ts` 里测不到的那部分 —— 那边只断言「浮层挂进去了、带
 * `data-vt-popup`」，因为 happy-dom 没有布局引擎，`getBoundingClientRect()` 全返 0。
 * 本文件的做法是**把 rect 直接钉死**（宿主与几何基准都换成固定值），于是坐标算式变成
 * 纯函数，可以逐个数字地断言 —— 恰好是最容易悄悄错掉、真机上只表现为「偏了一点」的那层。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createPopup } from './_popup';

type Rect = { left: number; top: number; width: number; height: number };

/** 钉死一个元素的 rect（happy-dom 没有布局，不钉就全是 0，`position()` 会直接藏起来） */
const stubRect = (el: HTMLElement, r: Rect): void => {
  el.getBoundingClientRect = () =>
    ({
      x: r.left,
      y: r.top,
      left: r.left,
      top: r.top,
      right: r.left + r.width,
      bottom: r.top + r.height,
      width: r.width,
      height: r.height,
      toJSON: () => ({}),
    }) as DOMRect;
};

/** 表格骨架：`.vt-root` > `.vt-client` > `.vt-cell-cover`（cell-editor 的编辑浮层就在这层） */
const scaffold = (opts: { clientRect?: Rect; scrollLeft?: number } = {}) => {
  const root = document.createElement('div');
  root.className = 'vt-root';
  const client = document.createElement('div');
  client.className = 'vt-client';
  root.appendChild(client);
  document.body.appendChild(root);
  stubRect(client, opts.clientRect ?? { left: 100, top: 50, width: 400, height: 300 });
  if (opts.scrollLeft !== undefined) client.scrollLeft = opts.scrollLeft;

  const cover = document.createElement('div');
  cover.className = 'vt-cell-cover';
  client.appendChild(cover);

  return { root, client, cover };
};

/** 编辑器返回给核心的那个元素（存活探针）：真实路径里由 cell-editor 挂进 cover */
const anchorIn = (cover: HTMLElement): HTMLElement => {
  const a = document.createElement('div');
  cover.appendChild(a);
  return a;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('宿主', () => {
  it('取 .vt-client（不是 .vt-root），并且排在 .vt-cell-cover 之后', () => {
    const { client, cover } = scaffold();
    stubRect(cover, { left: 260, top: 130, width: 160, height: 40 });

    const popup = createPopup({ anchor: anchorIn(cover), owner: cover, geometry: cover });

    expect(popup.host, '宿主必须是 .vt-client —— cover 就挂在这层').toBe(client);
    expect(popup.el.parentElement).toBe(client);
    const order = [...client.children];
    expect(
      order.indexOf(popup.el) > order.indexOf(cover),
      '浮层排在 cover 之后（同 z-index 语义外再加一道 DOM 顺序保证）',
    ).toBe(true);
    popup.destroy();
  });

  it('骨架外单独用组件时退回 .vt-root（--vt-* 只声明在它上面）', () => {
    const root = document.createElement('div');
    root.className = 'vt-root';
    document.body.appendChild(root);
    const holder = document.createElement('div');
    root.appendChild(holder);
    stubRect(root, { left: 0, top: 0, width: 400, height: 300 });
    stubRect(holder, { left: 10, top: 10, width: 100, height: 20 });

    const popup = createPopup({ anchor: anchorIn(holder), owner: holder, geometry: holder });
    expect(popup.host).toBe(root);
    popup.destroy();
  });
});

describe('定位（与 plugins/cell-editor.ts 的 position() 同一套公式）', () => {
  it('cover 模式：left 加宿主 scrollLeft（内容坐标），top 不加（scrollTop 恒 0）', () => {
    const { cover } = scaffold({ scrollLeft: 300 });
    // 单元格在可视区里的位置（横向已经滚过 300）
    stubRect(cover, { left: 260, top: 130, width: 160, height: 40 });

    const popup = createPopup({
      anchor: anchorIn(cover),
      owner: cover,
      geometry: cover,
      placement: 'cover',
    });

    // 260 - 100（宿主 left）+ 300（scrollLeft）
    expect(popup.el.style.left).toBe('460px');
    // 130 - 50（宿主 top）；纵向不加滚动量 —— .vt-client 是 overflow-y: hidden
    expect(popup.el.style.top).toBe('80px');
    // 宽度取齐单元格，不是 min-width
    expect(popup.el.style.width).toBe('160px');
    popup.destroy();
  });

  it('below 模式：先在可视区坐标夹紧，夹完才 + scrollLeft', () => {
    const { cover } = scaffold({ scrollLeft: 300 });
    stubRect(cover, { left: 260, top: 130, width: 160, height: 40 });

    const popup = createPopup({ anchor: anchorIn(cover), owner: cover, geometry: cover });
    // 面板比单元格宽（happy-dom 量不出来，直接钉死）
    Object.defineProperty(popup.el, 'offsetWidth', { value: 200, configurable: true });
    popup.update();

    // 可视区坐标 160 落在 [4, 400-200-4=196] 内 → 不动，再换算成内容坐标 160+300。
    // 先加 scrollLeft 再夹的写法会得到 196（面板被按到容器左边缘），那是坏的
    expect(popup.el.style.left).toBe('460px');
    // 锚点下缘 170 - 宿主 top 50 + 4 间隙
    expect(popup.el.style.top).toBe('124px');
    // 剩余空间封顶：300 - 124 - 4
    expect(popup.el.style.maxHeight).toBe('172px');
    popup.destroy();
  });

  it('几何基准 rect 归零（行滚出渲染窗口，cover 被 display:none）→ 藏起来而不是按 0 定位', () => {
    const { cover } = scaffold();
    stubRect(cover, { left: 260, top: 130, width: 160, height: 40 });
    const popup = createPopup({
      anchor: anchorIn(cover),
      owner: cover,
      geometry: cover,
      placement: 'cover',
    });
    expect(popup.el.style.visibility).toBe('');

    stubRect(cover, { left: 0, top: 0, width: 0, height: 0 });
    popup.update();
    expect(popup.el.style.visibility, '不能把浮层扔到容器左上角').toBe('hidden');
    // 复位后自己回来
    stubRect(cover, { left: 260, top: 130, width: 160, height: 40 });
    popup.update();
    expect(popup.el.style.visibility).toBe('');
    popup.destroy();
  });
});

describe('纵向输入不冒到 .vt-client（那层的 InputController 会 preventDefault）', () => {
  it.each(['wheel', 'touchstart', 'touchmove'])('%s 在浮层内被截住', (type) => {
    const { client, cover } = scaffold();
    stubRect(cover, { left: 260, top: 130, width: 160, height: 40 });
    const popup = createPopup({ anchor: anchorIn(cover), owner: cover, geometry: cover });

    let reachedClient = 0;
    client.addEventListener(type, () => {
      reachedClient += 1;
    });

    // 从面板内部的列表项发出（真实场景：在长名单里滚动）
    const item = document.createElement('div');
    popup.el.appendChild(item);
    const e = new Event(type, { bubbles: true, cancelable: true });
    item.dispatchEvent(e);

    expect(reachedClient, '否则表格在浮层底下滚，而面板自己的列表滚不动').toBe(0);
    expect(e.defaultPrevented, '只截传播、不拦默认行为 —— 面板内部该滚的照样滚').toBe(false);
    popup.destroy();
  });

  it('表体上的同类事件照常到达 .vt-client（截的只是浮层这一支）', () => {
    const { client } = scaffold();
    const td = document.createElement('td');
    client.appendChild(td);

    let reachedClient = 0;
    client.addEventListener('wheel', () => {
      reachedClient += 1;
    });
    td.dispatchEvent(new Event('wheel', { bubbles: true }));
    expect(reachedClient).toBe(1);
  });
});
