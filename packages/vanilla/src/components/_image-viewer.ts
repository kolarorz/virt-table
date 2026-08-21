/**
 * 图片查看器浮层（`VtImage` 点缩略图弹出的那个）。
 *
 * 与 `_popup.ts` 的下拉浮层不是一类东西，所以没有复用它：那边是**锚在某个单元格上**的面板
 * （要跟着锚点走、锚点消失就自毁），这里是**盖住整个视口的模态**，跟单元格的位置无关 ——
 * 打开之后表格底下是否还在滚动、那一行有没有被回收，都不该影响正在看的这张图。
 *
 * 但两条硬约束与 `_popup.ts` 完全一样：
 *
 *   1. **不许挂 `document.body`**：`--vt-*` 只声明在 `.vt-root` / `.vt-fb` 上，挂 body 的
 *      子树一个变量都继承不到（AGENTS.md §7.2 有实测：退化成「透明底 + 16px 黑字」，
 *      暗色也不跟随）。所以宿主取 `owner.closest('.vt-root')`，用 `position: fixed` 铺满视口
 *      —— `.vt-root` 不是包含块（没有 transform / filter / contain），所以 fixed 仍以视口为参照，
 *      `plugins/drag-sort.css` 的拖拽 ghost 就是同一套（root 内的 fixed 元素，一直好用）。
 *   2. **要带 `data-vt-popup`**：`vtCellEditor` 的 outside-click 白名单认这个属性
 *      （`plugins/cell-editor.ts` 的 `onOutsideClick`）。不打的话，装了编辑器的表上点一下
 *      查看器就把编辑态关掉。
 *
 * 键盘事件**必须 `stopPropagation`**：`vtKeyboardNav` 把 keydown 挂在 `.vt-root` 上，而浮层是
 * root 的后代 —— 不拦的话按 `←` `→` 换图会同时把底下的单元格选区一起挪走。
 */
import { type VtImageViewerTexts, zhCN } from '../locale';
import { requestImage } from './_image-loader';

/** 查看器认的一张图：地址 + 说明（说明会显示在底部，也是 `<img alt>`） */
export interface ViewerImage {
  url: string;
  alt?: string;
  /** 底部列表条那格用的小图，不给就用 `url`（`VtImageItem` 的同名字段直接透传过来） */
  thumb?: string;
}

export interface ImageViewerOptions {
  /** 这一格的全部图片 */
  items: readonly ViewerImage[];
  /** 打开时看第几张（0 起，越界会被夹住） */
  index: number;
  /**
   * 找宿主（`.vt-root`）的起点，一般就是被点的那个缩略图。
   *
   * 必须是**已经挂进文档**的元素，否则 `closest()` 是 `null` → 只能退到 body，
   * 于是全套 `--vt-*` 失效（见文件头第 1 条）。
   */
  owner: HTMLElement;
  /** 工具栏文案，默认 `zhCN.imageViewer` */
  texts?: Partial<VtImageViewerTexts>;
  /** 工具栏给下载按钮，默认 false */
  downloadable?: boolean;
}

/* 图标：与 `shared.ts` 那批同款 —— `currentColor` 描边 + `1em` 尺寸，于是颜色跟着文字、
 * 大小跟着字号，暗色主题自动跟随。常量字符串，不含任何外部输入。 */
const svg = (body: string): string =>
  '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  body +
  '</svg>';

const ICON_CLOSE = svg('<path d="M6 6l12 12M18 6L6 18"/>');
const ICON_CHEVRON = svg('<path d="M15 5l-7 7 7 7"/>');
const ICON_ZOOM_IN = svg('<circle cx="11" cy="11" r="7"/><path d="M16 16l4.5 4.5M8 11h6M11 8v6"/>');
const ICON_ZOOM_OUT = svg('<circle cx="11" cy="11" r="7"/><path d="M16 16l4.5 4.5M8 11h6"/>');
const ICON_RESET = svg('<path d="M4 9V4h5M20 15v5h-5M20 9V4h-5M4 15v5h5"/>');
const ICON_ROTATE = svg('<path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4"/>');
const ICON_DOWNLOAD = svg('<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14"/>');

/** 缩放边界。按钮 / 键盘一档 1.25 倍；滚轮不用「档」，见下面 `WHEEL_ZOOM_RATE` */
const SCALE_MIN = 0.2;
const SCALE_MAX = 8;
const SCALE_STEP = 1.25;

/**
 * 滚轮缩放的速率：每 1px 的 `deltaY` 缩放 `e^0.0012`。
 *
 * **不能沿用按钮那种「一次事件 = 一档 1.25 倍」** —— 触控板上一次两指滑动会连发几十个
 * `wheel`（每个 `deltaY` 只有个位数），一档一档乘下来瞬间就顶到 `SCALE_MAX`，表现就是
 * 「稍微一碰就放到最大」。按 `deltaY` 的大小连续换算之后：触控板一个事件（Δ3）约 1.004 倍
 * （几十个累起来才是一次自然的缩放），鼠标一格（Δ100）约 1.13 倍 —— 比原来的 1.25 也温和。
 */
const WHEEL_ZOOM_RATE = 0.0012;

/** 单个 wheel 事件计入的 `deltaY` 上限：个别设备/驱动会一次甩出上千的值 */
const WHEEL_DELTA_MAX = 150;

/** 同时只可能开一张（模态）。再开一次先把上一个收掉 */
let active: { destroy: () => void } | null = null;

/** 关掉当前查看器（没开则无副作用）。`VtImage` 卸载与测试都用它 */
export function closeImageViewer(): void {
  active?.destroy();
  active = null;
}

/**
 * 打开查看器。
 *
 * 大图走 `_image-loader` 的同一条队列与缓存 —— 缩略图刚看过的那张在缓存里，点开时几乎
 * 立刻出图；而且解码同样在浏览器自己的线程上完成，打开的这一帧不会卡。
 */
export function openImageViewer(opts: ImageViewerOptions): void {
  const items = opts.items.filter((it) => !!it.url);
  if (items.length === 0) return;
  closeImageViewer();

  const texts: VtImageViewerTexts = { ...zhCN.imageViewer, ...(opts.texts ?? {}) };
  const host =
    (opts.owner.closest('.vt-root') as HTMLElement | null) ??
    (opts.owner.closest('.vt-fb') as HTMLElement | null) ??
    document.body;

  let current = Math.min(Math.max(opts.index, 0), items.length - 1);
  let scale = 1;
  let rotate = 0;
  let tx = 0;
  let ty = 0;
  let alive = true;
  /** 关闭后把焦点还给点开它的那个缩略图（模态的基本礼貌，也让键盘用户不丢位置） */
  const prevFocus = document.activeElement as HTMLElement | null;

  const root = document.createElement('div');
  root.className = 'vt-comp-image-viewer';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', texts.counter(current + 1, items.length));
  // cell-editor 的 outside-click 白名单认这个属性（见文件头第 2 条）
  root.dataset.vtPopup = '';
  // 键盘操作挂在浮层自己身上，所以它必须可聚焦
  root.tabIndex = -1;

  /* ---- 顶栏：左边计数，右边工具栏 ---- */
  const bar = document.createElement('div');
  bar.className = 'vt-comp-image-viewer-bar';

  const count = document.createElement('span');
  count.className = 'vt-comp-image-viewer-count';
  bar.appendChild(count);

  const tools = document.createElement('div');
  tools.className = 'vt-comp-image-viewer-tools';
  bar.appendChild(tools);

  const makeBtn = (icon: string, label: string, onClick: () => void): HTMLElement => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vt-comp-image-viewer-btn';
    btn.innerHTML = icon;
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.addEventListener('click', onClick);
    return btn;
  };

  tools.appendChild(makeBtn(ICON_ZOOM_OUT, texts.zoomOut, () => zoom(1 / SCALE_STEP, true)));

  const scaleText = document.createElement('span');
  scaleText.className = 'vt-comp-image-viewer-scale';
  tools.appendChild(scaleText);

  tools.appendChild(makeBtn(ICON_ZOOM_IN, texts.zoomIn, () => zoom(SCALE_STEP, true)));
  tools.appendChild(makeBtn(ICON_RESET, texts.reset, () => resetTransform(true)));
  tools.appendChild(
    makeBtn(ICON_ROTATE, texts.rotate, () => {
      rotate += 90;
      paintTransform(true);
    }),
  );

  /**
   * 下载用 `<a download>` 而不是 fetch + blob：同源图片一键存盘，跨域时浏览器会忽略
   * `download` 改成新标签页打开 —— 那也是能接受的降级，而 fetch 会直接被 CORS 拦掉、
   * 什么都得不到。
   */
  const dl = document.createElement('a');
  if (opts.downloadable) {
    dl.className = 'vt-comp-image-viewer-btn';
    dl.innerHTML = ICON_DOWNLOAD;
    dl.title = texts.download;
    dl.setAttribute('aria-label', texts.download);
    dl.setAttribute('download', '');
    dl.target = '_blank';
    dl.rel = 'noopener';
    tools.appendChild(dl);
  }

  tools.appendChild(makeBtn(ICON_CLOSE, texts.close, () => closeImageViewer()));
  root.appendChild(bar);

  /**
   * ---- 舞台 ----
   *
   * **顶栏 / 舞台 / 说明 / 列表条是同一列 flex 里的四个流内项**，舞台占满剩下的高度。
   *
   * 第一版舞台是 `position: absolute; inset: 0`（铺满整个浮层），而顶栏也是 absolute ——
   * 两个都不带 z-index 的定位元素里**后写的那个赢**，于是舞台整片盖在工具栏上：真实鼠标
   * 点「放大」，命中的是舞台，判定成「点了幕布」→ **整个查看器被关掉**。用户报的就是这个
   * （之前的自动化测试用 `el.click()`，绕过命中判定，所以一路都是绿的）。改成流内布局之后
   * 顶栏与舞台不再重叠，点击落在谁身上就是谁。
   */
  const stage = document.createElement('div');
  stage.className = 'vt-comp-image-viewer-stage';
  root.appendChild(stage);

  const figure = document.createElement('div');
  figure.className = 'vt-comp-image-viewer-figure';
  stage.appendChild(figure);

  const spinner = document.createElement('div');
  spinner.className = 'vt-spinner';
  const failed = document.createElement('div');
  failed.className = 'vt-comp-image-viewer-failed';
  failed.textContent = texts.loadFailed;

  /* ---- 左右切换（单图时不挂）。挂在**舞台**里：这样它们相对图片垂直居中，
         而且点它们时 `e.target` 是按钮而不是舞台，不会被判成点幕布 ---- */
  const prevBtn = makeBtn(ICON_CHEVRON, texts.prev, () => step(-1));
  prevBtn.classList.add('vt-comp-image-viewer-nav', 'vt-comp-image-viewer-nav--prev');
  const nextBtn = makeBtn(ICON_CHEVRON, texts.next, () => step(1));
  nextBtn.classList.add('vt-comp-image-viewer-nav', 'vt-comp-image-viewer-nav--next');
  if (items.length > 1) {
    stage.appendChild(prevBtn);
    stage.appendChild(nextBtn);
  }

  /* ---- 底部说明（alt） ---- */
  const caption = document.createElement('div');
  caption.className = 'vt-comp-image-viewer-caption';
  root.appendChild(caption);

  /**
   * ---- 底部列表条（多图才有） ----
   *
   * 光有 `←` `→` 与 `3 / 8` 的话，「跳到第 6 张」得按五次，也看不出别的几张长什么样。
   * 一排小图是图片查看器的常规解法：**一眼看全 + 一下直达**。
   *
   * 小图走的是同一条取图队列（`_image-loader`），所以它们也不会在打开的那一帧里解码；
   * 而且**排在大图后面进队**（见下面 `show()` 之后那个循环）—— 同一批内先进先做，
   * 正在看的那张必须先出来。
   */
  const thumbs: HTMLElement[] = [];
  if (items.length > 1) {
    const strip = document.createElement('div');
    strip.className = 'vt-comp-image-viewer-strip';
    items.forEach((item, i) => {
      const thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.className = 'vt-comp-image-viewer-thumb';
      if (item.alt) thumb.title = item.alt;
      thumb.setAttribute('aria-label', item.alt || texts.counter(i + 1, items.length));
      thumb.addEventListener('click', () => {
        if (i === current) return;
        current = i;
        show();
      });
      thumbs.push(thumb);
      strip.appendChild(thumb);
    });
    root.appendChild(strip);
  }

  /* ------------------------------------------------------------------ *
   * 行为
   * ------------------------------------------------------------------ */

  /**
   * 写 transform。
   *
   * `animate` 只给**离散动作**（按钮、键盘、旋转、还原、双击）：滚轮与拖拽是连续手势，
   * 每个事件都重启一次 120ms 过渡的话，图会一直追在指针后面，手感是黏的。
   */
  function paintTransform(animate = false): void {
    figure.classList.toggle('vt-comp-image-viewer-figure--animated', animate);
    // 顺序要紧：先平移再缩放再旋转，于是拖拽的位移量与屏幕像素一致（不被 scale 放大）
    figure.style.transform = `translate(${tx}px, ${ty}px) scale(${scale}) rotate(${rotate}deg)`;
    scaleText.textContent = `${Math.round(scale * 100)}%`;
  }

  function resetTransform(animate = false): void {
    scale = 1;
    rotate = 0;
    tx = 0;
    ty = 0;
    paintTransform(animate);
  }

  function zoom(by: number, animate = false): void {
    scale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale * by));
    paintTransform(animate);
  }

  /** 换图。**缩放与旋转归零** —— 上一张放大了 3 倍不该让下一张也从 3 倍开始看 */
  function step(delta: number): void {
    if (items.length < 2) return;
    // 首尾循环：多图浏览里「到头了点不动」比绕回去更让人以为卡住了
    current = (current + delta + items.length) % items.length;
    show();
  }

  /** 画当前这一张：先占位（spinner），解码完成再换成真图 */
  function show(): void {
    const item = items[current]!;
    resetTransform();
    count.textContent = items.length > 1 ? texts.counter(current + 1, items.length) : '';
    caption.textContent = item.alt ?? '';
    root.setAttribute('aria-label', texts.counter(current + 1, items.length));
    if (opts.downloadable) dl.href = item.url;

    // 列表条：选中态 + 把当前那格滚进可视范围（长相册里 `→` 到第 20 张也看得见自己在哪）
    thumbs.forEach((thumb, i) => {
      const on = i === current;
      thumb.classList.toggle('vt-comp-image-viewer-thumb--current', on);
      thumb.setAttribute('aria-current', on ? 'true' : 'false');
      if (on) thumb.scrollIntoView?.({ block: 'nearest', inline: 'center' });
    });

    figure.textContent = '';
    figure.appendChild(spinner);

    /** 拿这一张的序号做闭包快照：切图很快时旧任务的回调不许再往舞台上画 */
    const shot = current;
    requestImage({
      url: item.url,
      alive: () => alive && shot === current,
      onOk: (img) => {
        img.className = 'vt-comp-image-viewer-img';
        img.alt = item.alt ?? '';
        // 直接用取图队列解码好的那个元素：再建一个 `<img src>` 等于让浏览器重新走一遍解码
        figure.textContent = '';
        figure.appendChild(img);
      },
      onError: () => {
        figure.textContent = '';
        figure.appendChild(failed);
      },
    });
  }

  /**
   * 点幕布关闭 —— 只认「落在舞台本身」的那一下（`e.target === stage`）。
   *
   * 图的外壳是个 `86vw × 76vh` 的确定尺寸盒子（理由见 components.css §13：`max-*` 让内容撑
   * 时，没有固有宽度的 SVG 会把整个舞台塌成 0×0），所以它占了大半屏、点它不关闭 ——
   * 那块地要留给拖拽平移。关闭还有 `Esc` 与 ✕ 两条路，外壳之外也还剩 14vw / 24vh 幕布。
   */
  stage.addEventListener('pointerdown', (e) => {
    if (e.target === stage) closeImageViewer();
  });

  /** 双击在「适应窗口」与「放大一倍」之间切 —— 看细节最快的一步 */
  figure.addEventListener('dblclick', () => {
    if (scale === 1) zoom(2, true);
    else resetTransform(true);
  });

  /* 拖拽平移：用 pointer capture，指针移出浮层（甚至移出窗口）也不会丢事件 */
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  figure.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    figure.setPointerCapture?.(e.pointerId);
    // 不 preventDefault：dblclick 还要照常派发
    e.stopPropagation();
  });
  figure.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    tx += e.clientX - lastX;
    ty += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    paintTransform();
  });
  const endDrag = (): void => {
    dragging = false;
  };
  figure.addEventListener('pointerup', endDrag);
  figure.addEventListener('pointercancel', endDrag);

  /**
   * 滚轮缩放。`passive: false` + `preventDefault` 两件都要：
   * 不拦的话页面（或表格外层容器）会在浮层底下一起滚。
   */
  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    /*
     * `deltaMode` 折算成像素：0 = 像素（绝大多数情况）、1 = 行、2 = 页。不折算的话
     * 按行上报的设备（部分 Windows 鼠标驱动）一次只有 Δ3，滚起来几乎不动。
     */
    const px =
      e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
    const delta = Math.max(-WHEEL_DELTA_MAX, Math.min(WHEEL_DELTA_MAX, px));
    zoom(Math.exp(-delta * WHEEL_ZOOM_RATE));
  };
  root.addEventListener('wheel', onWheel, { passive: false });

  /**
   * 键盘。**每一个分支都 `stopPropagation`**（见文件头）：方向键与 Esc 在
   * `vtKeyboardNav` / `vtCellEditor` 那边各有语义，漏一个就会「换图的同时选区也动了」。
   */
  const onKeyDown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case 'Escape':
        closeImageViewer();
        break;
      case 'ArrowLeft':
        step(-1);
        break;
      case 'ArrowRight':
        step(1);
        break;
      case '+':
      case '=':
        zoom(SCALE_STEP, true);
        break;
      case '-':
        zoom(1 / SCALE_STEP, true);
        break;
      case '0':
        resetTransform(true);
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  };
  root.addEventListener('keydown', onKeyDown);

  host.appendChild(root);
  show();

  /*
   * 列表条的小图**在 `show()` 之后**才排队：同一批内按进队顺序做，所以正在看的那张大图
   * 先取，一排小图跟在后面。反过来（先排小图）的话，打开查看器要等一排小图取完才见大图。
   */
  thumbs.forEach((thumb, i) => {
    const item = items[i]!;
    requestImage({
      url: item.thumb || item.url,
      alive: () => thumb.isConnected,
      onOk: (img) => {
        img.className = 'vt-comp-image-viewer-thumb-img';
        img.alt = '';
        thumb.textContent = '';
        thumb.appendChild(img);
      },
      onError: () => thumb.classList.add('vt-comp-image-viewer-thumb--error'),
    });
  });

  root.focus();

  active = {
    destroy: () => {
      if (!alive) return;
      alive = false;
      root.removeEventListener('wheel', onWheel);
      root.removeEventListener('keydown', onKeyDown);
      root.remove();
      // 还给缩略图。`isConnected` 要查：那一行可能已经被虚拟滚动回收了
      if (prevFocus?.isConnected) prevFocus.focus?.();
    },
  };
}
