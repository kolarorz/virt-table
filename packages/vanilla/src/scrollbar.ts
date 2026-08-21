/**
 * 自绘滚动条的**公开入口**：`@virt-table/vanilla/scrollbar`
 *
 * ```ts
 * import { Scrollbar, type ScrollbarHost } from '@virt-table/vanilla/scrollbar';
 * ```
 *
 * ## 为什么单独开一个子路径
 *
 * 表格自己那两条滚动条是自绘的（见 `_initScrollbars()` 与 index.css §3.1）：容器的
 * `overflow-y` 是 hidden、纵向位移由 JS 接管，原生滚动条压根不存在；横向那条虽然是真
 * scrollport，但 macOS 的浮层滚动条**只在滚动那一瞬间出现**，「hover 显形」原生做不到。
 * 自绘是这两件事的唯一出路。
 *
 * 第一个外部消费者是付费包 `@virt-table-pro/gantt`：二期把时间轴搬进了插件**自己的**
 * 横向滚动容器（左右两个 pane 各自横滚），那个容器要一条 hover 显形的横条；而它纵向一行
 * DOM 都没有（行永远只由左表拥有），要一条驱动左表纵向偏移的竖条。
 *
 * 那个包只能吃核心的**公开契约**（见 pro 仓库 AGENTS.md 第一条：碰私有成员的话，核心
 * 每次重构都会在客户侧炸掉而 CI 抓不到）。于是按那条约定的做法，把能力在核心沉淀成
 * 公开 API —— 就是这个文件。
 *
 * 单独成入口而不是挂到主入口，与 `components/image-viewer` 同源：主入口是整张表，
 * 只想画一条滚动条的使用方不该为此付钱。两个入口引用**同一个** `Scrollbar`，
 * Rollup 会把它提成共享 chunk，所以不会出现两份实现。
 *
 * ## 为什么类型是在这里重新声明的，而不是 `export type ... from`
 *
 * 实现来自 `@virt-list/vanilla`（那边的 barrel 明确写了「透出它们是为了让别的虚拟化组件
 * 共用同一套滚动条外观与手势」），而它是本包的 **devDependency** —— 它的字节被 vite 打进
 * `dist`，使用方的 `node_modules` 里没有这个包。所以 `.d.ts` 里**不能出现**指向它的
 * 模块说明符：那会在客户侧变成一条解析不了的 import（`skipLibCheck` 下静默退化成 `any`，
 * 关掉就直接报错）。
 *
 * 于是这里把形状**照抄一份**（三个接口共十来行，不是复制实现），并给类值一个显式类型。
 * 附带的好处是这条公开面从此由核心自己说了算：virt-list 那边加内部方法不会漏到客户的
 * 类型提示里，删掉我们承诺过的东西则会在这里当场类型不匹配。
 *
 * ## 没有配套的 CSS
 *
 * 刻意不给。画出来的是 `.virt-scrollbar` + `.virt-scrollbar__thumb`，外观全靠一组
 * `--virt-scrollbar-*` 变量，而**显形规则绑在宿主的容器类名上** —— virt-list 那份绑
 * `.virt-list__client`、表格这份绑 `.vt-root`（index.css §3.1），都不通用。使用方自己写
 * 一小块：把 `--virt-scrollbar-*` 映射到自己的 token，再按自己的容器写 `:hover` 那一条。
 * §3.1 就是抄的模板。
 */
import { Scrollbar as ListScrollbar } from '@virt-list/vanilla';

/** 滚动条向宿主要的三个数，以及把用户意图交回去的两个回调 */
export interface ScrollbarHost {
  /** 视口尺寸（滚动轴方向） */
  getClientSize(): number;
  /** 内容总尺寸 */
  getTotalSize(): number;
  /** 滑块当前应处的位置比例，0..1 */
  getRatio(): number;
  /** 用户把滑块拖到了某个比例 */
  onRatio(ratio: number): void;
  /**
   * 一次拖拽结束。
   *
   * 不定高内容用它挂渐进修正（拖拽途中新行才刚渲染出来，真实高度回填后目标位置会变）；
   * 定高 / 纯像素的轴没有这个问题，给个空函数即可。
   */
  onDragEnd(): void;
}

export interface ScrollbarOptions {
  /** true = 横条（沿 x 轴），false = 竖条 */
  horizontal: boolean;
  /** 滑块长度下限（px），默认 20 —— 太短抓不住 */
  minThumbSize?: number;
  /** 停止滚动多久后淡出（ms）。0 表示常驻（轨道会带上 `is-persistent`） */
  autoHideDelay?: number;
}

/** 一条自绘滚动条。轨道与滑块由它自己建，宿主只需把 `el` 挂到该在的地方 */
export interface ScrollbarInstance {
  /** 轨道元素（`.virt-scrollbar`）。位置与尺寸由宿主的 CSS 给 */
  readonly el: HTMLElement;
  /** 滑块元素（`.virt-scrollbar__thumb`） */
  readonly thumbEl: HTMLElement;
  /** 正在拖拽滑块。拖拽期间宿主不要反向写内容位置，否则会和指针互相拉扯 */
  readonly dragging: boolean;
  /**
   * 按当前尺寸与位置刷新滑块。内容长度、视口尺寸、滚动位置任一变化后都要调一次。
   *
   * 内容短到不需要滚动时它会摘掉 `is-enabled`（CSS 里那是 `display: block` 的开关）。
   */
  update(): void;
  /**
   * 丢弃缓存的轨道长度。轨道**自己**的尺寸变了（而视口没变）时要调。
   *
   * ⚠️ **可选**，因为它只存在于尚未发布的 `@virt-list/vanilla` 里。当前发布版
   * （0.0.7）没有这个方法 —— 声明成必选会造成两件事：
   *   1. 本文件那句 `Scrollbar = ListScrollbar` 的断言编译不过（TS2419）；
   *   2. 更糟的是**下游会照着必选去调**，于是客户装上发布版之后运行时
   *      `invalidateGeometry is not a function`（`@virt-table-pro/gantt` 的双 pane
   *      就这么崩过一次）。
   *
   * 所以调用处一律 `bar.invalidateGeometry?.()`：拿不到就少一次缓存失效，
   * 表现是滑块长度**可能滞后一帧**，而不是整个组件挂掉。virt-list 发布之后这个 `?`
   * 可以去掉，但**不急** —— 留着它，插件对 peer 范围里的老版本也是安全的。
   */
  invalidateGeometry?(): void;
  /** 有滚动发生：短暂加上 `is-active` 显形，随后淡出（`autoHideDelay` 为 0 时是空操作） */
  notifyActivity(): void;
  destroy(): void;
}

/**
 * 单轴自绘滚动条。只管「画滑块」与「指针位置 ↔ 比例」的换算，与数据源无关 ——
 * 纵横两条都用它，差别只在宿主给的 `getTotalSize` / `getRatio` 从哪来。
 */
export const Scrollbar: new (
  host: ScrollbarHost,
  options: ScrollbarOptions,
) => ScrollbarInstance = ListScrollbar;
