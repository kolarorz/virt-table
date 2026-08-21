/**
 * 单元格组件的自绘浮层基元（`VtMultiSelect` / `VtAutocomplete` / `VtCascader` 共用）。
 *
 * 为什么内置组件不能直接 `document.body.appendChild` 一个下拉：
 *   1. `--vt-*` 只声明在 `.vt-root` / `.vt-fb` 上，body 的子节点继承不到 —— 整批
 *      `var()` 会静默失效（AGENTS.md §7.2 有实测：退化成「透明底 + 16px 黑字」）；
 *   2. 更要紧的是 `vtCellEditor` 的 outside-click：它只放行 `.vt-cell-cover` 内、
 *      `tbody` 内、以及第三方 popper。挂在别处的浮层一点就把编辑器关掉，
 *      连带把浮层的锚点（编辑器里的 input）一起清掉。
 *
 * 所以浮层挂 `.vt-client`（找不到再退 `.vt-root`），并打上 `data-vt-popup` ——
 * cell-editor 认这个属性放行（见 `plugins/cell-editor.ts` 的 `onOutsideClick`）。
 *
 * **宿主取 `.vt-client`，定位算法与 `.vt-cell-cover` 逐字一致**（`plugins/cell-editor.ts`
 * 的 `position()`）：`top` 是「相对容器可视区上缘」的差值（纵向 `overflow-y: hidden`，
 * `scrollTop` 恒 0），`left` 要**加上 `scrollLeft`** —— 那边是原生 scrollport，浮层作为
 * 绝对定位子节点会随内容一起横向滚动，`left` 必须是内容坐标。
 *
 * 挂进 scrollport 换来的正是「横滚时纹丝不动地贴着单元格」：浮层与 `.vt-cell-cover`
 * 由同一个 scrollport 搬运，横向位移由浏览器一次完成。挂在 `.vt-root` 上时浮层不在
 * scrollport 内，只能靠下面的锚定循环逐帧追 —— 与 cover 之间必然差一帧。
 *
 * 皮肤直接复用共享面板样式（`.vt-filter-panel` / `.vt-filter-list` / `.vt-filter-item`，
 * 由 `components.css` 里 `@import '../plugins/_panel.css'` 内联进来），于是内置组件的
 * 下拉与列头筛选下拉长得一模一样，不用再维护第二套面板外观。
 */

/** 浮层的锚定与生命周期由调用方通过这个 handle 控制 */
export interface PopupHandle {
  /** 内容容器：使用方往里 append 自己的列表 / 面板 */
  readonly el: HTMLElement;
  /**
   * 浮层实际挂载到的宿主（正常是 `.vt-client`，与 `.vt-cell-cover` 同一层）。
   * 算可用空间时要用它 —— 那也正是浮层会被 `overflow` 裁掉的那个盒子。
   */
  readonly host: HTMLElement;
  /** 重新测量并定位（内容高度变化后调用；锚点移动会自动跟随，不用手动调） */
  update(): void;
  /** 移除浮层与全部监听。重复调用无副作用 */
  destroy(): void;
}

/**
 * 定位模式。
 *
 * - `'below'`（默认）—— 挂在锚点下方，空间不足翻到上方。下拉、建议列表、确认气泡用这个。
 * - `'cover'` —— **盖住锚点**：左上角对齐、宽度取齐，高度由内容撑开。内联编辑器
 *   （`VtTextarea`）用这个 —— 视觉上就是「这个单元格正在被编辑」，而不是「旁边开了个面板」。
 *   长高顶出容器下缘时整体上移，仍然放不下就由调用方按 `host` 的高度限高。
 */
export type PopupPlacement = 'below' | 'cover';

export interface PopupOptions {
  /**
   * 锚点。用来判定「点到浮层外面」，也是**存活探针** —— 它离开 DOM 时浮层自毁。
   * 一般就是编辑器里返回给核心的那个元素（会被 cell-editor 的 `innerHTML = ''` 清掉）。
   */
  anchor: HTMLElement;
  /**
   * 取几何用的元素，默认取 `anchor`。
   *
   * 需要它是因为**存活探针和几何基准可以不是同一个元素**：`cover` 模式要盖住整个单元格，
   * 而 `.vt-cell-cover` 有 2px 边框，里面的 anchor 比单元格窄 4px（列上配了
   * `editorChrome: false` 时更窄 —— 裸模式补了一个 `--vt-cell-padding-x` 的内边距）；
   * 但反过来又不能拿 `.vt-cell-cover` 当探针 —— cell-editor 关闭时只是把它
   * `display: none` + 清空内容，元素本身**一直连在 DOM 上**，拿它当探针浮层永远不自毁。
   */
  geometry?: HTMLElement;
  /**
   * 用来查找宿主（`.vt-client`）的起点，默认取 `anchor`。
   *
   * **在 `renderEditor` 里创建浮层时必须传 `ctx.el`**：那一刻 `anchor` 是刚 `createElement`
   * 出来的、还没挂进文档（cell-editor 拿到返回值之后才 append），`anchor.closest()` 必然
   * 是 `null` → 浮层会落到兜底的 `document.body` 上，`--vt-*` 一个都继承不到（§7.2 有实测：
   * 退化成「透明底 + 16px 黑字」，暗色也不跟随）。`ctx.el` 是编辑浮层 `.vt-cell-cover`，
   * 它本来就是 `.vt-client` 的子节点，永远找得到宿主。
   */
  owner?: HTMLElement;
  /** 定位模式，默认 `'below'` */
  placement?: PopupPlacement;
  /** 追加类名 */
  className?: string;
  /** 最小宽度，默认与锚点同宽（下拉与输入框对齐是常见预期）。`cover` 模式忽略——那边宽度必须取齐单元格 */
  minWidth?: number;
  /** Esc 或点到外面时调用。使用方通常在这里 `destroy()` 并做收尾写回 */
  onClose?: () => void;
}

/** 浮层与锚点 / 容器边缘之间的留白 */
const GAP = 4;

/**
 * **打开中的浮层栈**，按打开顺序排列。为「浮层里再开一个浮层」而存在。
 *
 * 每个浮层的 outside-click 只认「点在我自己或我的锚点里」，而嵌套的子浮层是挂在
 * **宿主**上的（`.vt-client` / `.vt-fb`），DOM 上是父浮层的**兄弟**而不是后代 ——
 * 于是点子浮层里的一项，父浮层判定为「点到外面」把自己关掉，连带把子浮层的锚点
 * 一起清掉（付费插件的甘特配置面板就是这个形状：面板里每一行都是个下拉）。
 *
 * 规则：点击落在**比我更晚打开**的浮层里时，我不关。反过来点回下层浮层，上层照常关掉
 * （级联收起，与各家下拉的共同行为一致）。
 */
const OPEN_STACK: Array<{ el: HTMLElement }> = [];

const clamp = (v: number, min: number, max: number): number =>
  Math.min(Math.max(v, min), max);

export function createPopup(opts: PopupOptions): PopupHandle {
  const { anchor } = opts;
  const placement = opts.placement ?? 'below';
  /** 几何基准（默认就是锚点本身，见 `geometry` 的注释） */
  const geoEl = opts.geometry ?? anchor;
  /**
   * 宿主优先取 `.vt-client` —— **`.vt-cell-cover` 就挂在这层**，浮层与它同一个包含块、
   * 同一个 scrollport，横滚时两者被浏览器一起搬走，不会错开。
   *
   * 退 `.vt-root` 是为了「组件在表格骨架外被单独使用」（单测就是这么搭的）仍能拿到
   * `--vt-*`；再退 body 只为不抛异常。两个兜底都不是滚动容器，`scrollLeft` 恒 0，
   * 下面的定位公式照样成立。
   */
  const owner = opts.owner ?? anchor;
  const host =
    (owner.closest('.vt-client') as HTMLElement | null) ??
    (owner.closest('.vt-root') as HTMLElement | null) ??
    /*
     * `.vt-fb` 是**表格之外**那批 DOM 的 token 载体（筛选管理器面板、以及付费插件自己搭的
     * 容器 —— 甘特的双 pane 外壳就带这个类）。少了这一支，从那些地方开的浮层会掉到
     * `document.body`，于是整批 `var(--vt-*)` 静默失效（§7.2 有实测：透明底 + 16px 黑字）。
     */
    (owner.closest('.vt-fb') as HTMLElement | null) ??
    document.body;

  const el = document.createElement('div');
  // 面板皮肤只给 below 模式：cover 是「盖住单元格的内联编辑框」，不是面板，
  // 套上 .vt-filter-panel 的底色/圆角/弹出动画反而不对
  el.className = [
    'vt-comp-popup',
    placement === 'cover' ? 'vt-comp-popup--cover' : 'vt-filter-panel',
    opts.className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  // cell-editor 的 outside-click 白名单认这个属性
  el.dataset.vtPopup = '';
  // 锚点还没挂进文档时量不出位置（renderEditor 里就是这种情况），先藏起来，
  // 等锚定循环第一次量到真实位置再显形 —— 否则会在左上角闪一帧
  el.style.visibility = 'hidden';
  /**
   * **纵向输入到这里为止**，一步都不许冒到 `.vt-client` 上去。
   *
   * 挂进 scrollport 的代价就这一条：核心把纵向滚动整个接管了（`overflow-y: hidden` +
   * `InputController` 在 `.vt-client` 上监听 `wheel` / `touchmove`，**非 passive、会
   * `preventDefault`**）。浮层成了它的后代之后，在下拉列表上滚一下会同时发生两件坏事：
   * 表格在浮层底下滚起来（锚点跟着走，浮层追着锚点动），而列表自己的原生滚动被
   * `preventDefault` 吃掉 —— `.vt-filter-list` 是 `max-height: 260px; overflow-y: auto`，
   * 长名单直接变成滚不动。
   *
   * 只 `stopPropagation` 不 `preventDefault`：面板内部该滚的照样由浏览器滚。
   * 滚到列表尽头也**刻意不续传**给表格 —— 浮层是锚在某个单元格上的，把它底下的表格
   * 滚走没有任何合理语义。
   */
  const stopScrollChain = (e: Event): void => e.stopPropagation();
  el.addEventListener('wheel', stopScrollChain, { passive: true });
  el.addEventListener('touchstart', stopScrollChain, { passive: true });
  el.addEventListener('touchmove', stopScrollChain, { passive: true });
  host.appendChild(el);

  let alive = true;
  /** 上一帧的几何，用来判断是否需要重新定位（横滚 / 列宽变化都会让它动） */
  let lastGeoKey = '';
  let rafId = 0;

  const position = (): void => {
    if (!anchor.isConnected) return;
    const hostRect = host.getBoundingClientRect();
    const gRect = geoEl.getBoundingClientRect();

    /**
     * 几何基准量不出尺寸 → 藏起来，不要按 0 去定位。
     *
     * 会发生在被编辑的行滚出渲染窗口时：`vtCellEditor` 把 `.vt-cell-cover` 设成
     * `display: none`（编辑态保留，滚回来还要用），它的 rect 于是全为 0。这时候按 0
     * 定位会把浮层扔到容器左上角 —— 一个既不属于任何单元格、又明明可见的框。
     * 藏起来则天然跟着宿主一起回来：cover 复位后 rect 变化，锚定循环会重新定位并显形。
     */
    if (!geoEl.isConnected || (gRect.width === 0 && gRect.height === 0)) {
      el.style.visibility = 'hidden';
      return;
    }

    /**
     * 绝对定位的参照是宿主的 **padding-box**（边框内侧），而 `getBoundingClientRect()`
     * 给的是 **border-box**。`.vt-client` 没有边框（下面两个兜底宿主里 `.vt-root` 有 1px），
     * 不扣的话整体偏 1px —— cover 模式下「盖住单元格」会明显错开一像素
     * （CDP 实测：写 `left: 241px` 实际落在 250 而不是 249）。
     */
    const hostStyle = getComputedStyle(host);
    const bl = Number.parseFloat(hostStyle.borderLeftWidth) || 0;
    const bt = Number.parseFloat(hostStyle.borderTopWidth) || 0;
    /** 可用区（padding-box）尺寸，算余量时也要用它而不是 border-box */
    const innerW = hostRect.width - bl - (Number.parseFloat(hostStyle.borderRightWidth) || 0);
    const innerH = hostRect.height - bt - (Number.parseFloat(hostStyle.borderBottomWidth) || 0);
    /**
     * 横向要补上宿主的滚动量，纵向不用 —— 与 `.vt-cell-cover` 同一条规则
     * （`plugins/cell-editor.ts` 的 `position()`）：`.vt-client` 的 `overflow-y: hidden`
     * 让 `scrollTop` 恒为 0（纵向位移归 JS 掌管），而横向是原生 scrollport，浮层会跟着
     * 内容一起滚，`left` 必须写成内容坐标。
     */
    const sx = host.scrollLeft;

    if (placement === 'cover') {
      // 宽度取齐单元格，高度交给内容（调用方负责把内容限制在 host 高度内）
      el.style.width = `${gRect.width}px`;
      const h = el.offsetHeight;
      const top = gRect.top - hostRect.top - bt;
      // 撑高之后可能顶出容器下缘 → 整体上移；仍然放不下就贴着上缘
      const maxTop = Math.max(0, innerH - h - GAP);
      el.style.top = `${Math.max(0, Math.min(top, maxTop))}px`;
      el.style.left = `${gRect.left - hostRect.left - bl + sx}px`;
      el.style.visibility = '';
      return;
    }

    el.style.minWidth = `${opts.minWidth ?? gRect.width}px`;

    // 先按内容自然高度量一次，再决定放哪边（放完才知道要不要限高）
    el.style.maxHeight = '';
    const h = el.offsetHeight;
    const w = el.offsetWidth;

    const belowTop = gRect.bottom - hostRect.top - bt + GAP;
    const spaceBelow = innerH - belowTop - GAP;
    const spaceAbove = gRect.top - hostRect.top - bt - GAP * 2;

    // 下方放得下就放下方；放不下则比较两侧余量，取大的那边（而不是无条件翻上）
    if (h <= spaceBelow || spaceBelow >= spaceAbove) {
      el.style.top = `${belowTop}px`;
      el.style.maxHeight = `${Math.max(0, spaceBelow)}px`;
    } else {
      el.style.top = `${Math.max(GAP, gRect.top - hostRect.top - bt - GAP - Math.min(h, spaceAbove))}px`;
      el.style.maxHeight = `${Math.max(0, spaceAbove)}px`;
    }

    // 先在**可视区坐标**里夹紧（要判定的是「有没有露出容器边缘」），夹完才换算成内容坐标：
    // 反过来先加 sx 再夹，横滚之后夹的就是另一个区间，面板会被按到左边缘去
    const left = gRect.left - hostRect.left - bl;
    el.style.left = `${clamp(left, GAP, Math.max(GAP, innerW - w - GAP)) + sx}px`;
    el.style.visibility = '';
  };

  const onOutside = (e: PointerEvent): void => {
    const target = e.target as HTMLElement;
    if (el.contains(target) || anchor.contains(target)) return;
    // 点在「我之上」的嵌套浮层里 → 不是点到外面（见 OPEN_STACK 的注释）
    const mine = OPEN_STACK.findIndex((p) => p.el === el);
    if (mine >= 0) {
      for (let i = mine + 1; i < OPEN_STACK.length; i++) {
        if (OPEN_STACK[i].el.contains(target)) return;
      }
    }
    opts.onClose?.();
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    // 嵌套时 Esc 只收起**最上面**那一层（一次按键关掉整叠是各家下拉都没有的行为）
    if (OPEN_STACK.length > 0 && OPEN_STACK[OPEN_STACK.length - 1].el !== el) return;
    opts.onClose?.();
  };

  /**
   * 锚定循环。两件事都必须做，而且都只能靠轮询：
   *   - **锚点消失就自毁**：编辑浮层被关闭（`innerHTML = ''`）或承载的 `<td>` 被虚拟
   *     滚动回收时，锚点无声无息地离开 DOM，浮层收不到任何事件 —— 不自毁就会留一个
   *     悬空面板挂在表格上。
   *   - **锚点移动就跟随**：纵向位移归 JS（`.vt-client` 的 `scrollTop` 恒 0，内容靠
   *     `.vt-table` 的残差 `top` 移动），滚一下锚点就换了行高位置，而 cell-editor 的
   *     `onScroll` 只管它自己那层 `.vt-cell-cover`。列宽变化、排序筛选换行也走这条。
   *     横滚现在**不需要**它了 —— 浮层与 cover 同在 `.vt-client` 这个 scrollport 里，
   *     浏览器一起搬；这一帧重算出来的内容坐标与上一帧相同，写回去是个空操作。
   *
   * 每帧的成本是一次 `isConnected` + 一次 `getBoundingClientRect`，且只在浮层打开期间跑。
   */
  const tick = (): void => {
    if (!alive) return;
    if (!anchor.isConnected) {
      destroy();
      return;
    }
    const r = geoEl.getBoundingClientRect();
    const key = `${r.left}|${r.top}|${r.width}`;
    if (key !== lastGeoKey) {
      lastGeoKey = key;
      position();
    }
    rafId = requestAnimationFrame(tick);
  };

  function destroy(): void {
    if (!alive) return;
    alive = false;
    const at = OPEN_STACK.findIndex((p) => p.el === el);
    if (at >= 0) OPEN_STACK.splice(at, 1);
    cancelAnimationFrame(rafId);
    document.removeEventListener('pointerdown', onOutside);
    document.removeEventListener('keydown', onKeyDown);
    el.remove();
  }

  /*
   * 听 `pointerdown` 而不是 `mousedown`：`vtCellSelection` 的拖选起手在 pointerdown 里
   * `preventDefault()`，会连带取消兼容 mouse 事件 —— 表体内的 mousedown 根本不存在，
   * 于是浮层点表格里的格子关不掉（CDP 实测：pointerdown 1 / mousedown 0 / click 1）。
   */
  OPEN_STACK.push({ el });
  document.addEventListener('pointerdown', onOutside);
  document.addEventListener('keydown', onKeyDown);
  rafId = requestAnimationFrame(tick);
  position();

  return {
    el,
    host,
    update: () => {
      if (alive) position();
    },
    destroy,
  };
}
