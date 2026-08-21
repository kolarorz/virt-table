/**
 * 图片的**异步取图队列**（`VtImage` 的常态缩略图与查看器的大图共用）。
 *
 * 这个文件就是「加载图片不影响主线程渲染」的全部实现。为什么不能像核心
 * `cellType: 'image'`（`cell-type.ts`）那样在 `render` 里直接 `new Image()` + `src = url`：
 *
 *   1. **行 DOM 是池化的**：`_fillCellContent` 每次重绘都新建 `.vt-td-text`，所以 `render`
 *      在滚动中会被反复调用。同步建 `<img>` 意味着每一帧都在发起请求 + 触发解码，而
 *      **图片解码默认发生在主线程**（`decoding` 不设成 `async` 时），正好落在滚动帧里。
 *   2. `loading="lazy"` 帮不上忙：单元格只在渲染窗口内存在，浏览器眼里它**一直是可见的**，
 *      于是懒加载等于立即加载。真正需要「懒」的那一层是虚拟滚动自己，浏览器不知道。
 *
 * 所以取图分成两步：`render` 只同步产出占位盒（零请求、零解码），加载排到**空闲期**再做，
 * 而且中途发现那一格已经被回收就直接丢弃。三条机制：
 *
 * | 机制 | 为什么 |
 * | --- | --- |
 * | 空闲期调度（`requestIdleCallback`） | 滚动帧里一次请求都不发；停下来才开始出图 |
 * | **先进先出 + 出队前剔掉废任务** | 进队顺序就是行序，所以出图是从上往下的（人读表的顺序）。而「快滚十屏后队头全是废任务」这件事**不需要靠 LIFO 解决**：滚走的那些格子早被回收，`alive()` 一查就跳过，一个请求都不会发 |
 * | `alive()` 双检 + 坏链表 | 单元格被回收（占位盒离开 DOM）就丢弃任务；加载失败的 URL 记进 `failed`，滚回去不再重试 |
 *
 * **只记失败，不记成功**：成功的图有浏览器自己的内存 / HTTP 缓存，我们再记一份也省不掉
 * 「新建 `<img>` + 解码」这两步（每个单元格都需要自己的元素），那份记录就只是空占内存。
 * 失败则相反 —— 不记的话一列坏链每滚过去一次就重发一轮请求。
 *
 * 队列是**模块级单例**：并发上限要对「整张表」成立，每个组件实例各一份队列的话，
 * 十列图片就是十倍并发。同一个理由让缓存也放在这里。
 */

/** 一次取图请求。`alive()` 为假时任务随时可以被静默丢弃 */
export interface ImageRequest {
  url: string;
  /**
   * 这个任务还有意义吗（通常是 `() => holder.isConnected`）。
   *
   * 出队前与解码完成后各查一次：虚拟滚动回收单元格时不会给任何通知，占位盒无声无息地
   * 离开 DOM —— 这是唯一能发现「这张图已经不用要了」的手段（同 `_popup.ts` 的锚点存活探针）。
   */
  alive(): boolean;
  /** 解码完成、可以直接 append 而不引起同步解码 */
  onOk(img: HTMLImageElement): void;
  /** 取图失败（404 / 防盗链 / 不是图片） */
  onError(): void;
}

/**
 * 真正去取图的那一步，抽成可替换的对象**只为可测**：happy-dom 没有网络、也没有
 * `HTMLImageElement.decode`，测试里换掉它就能同步地演出成功与失败两条路径。
 * 产品代码不要改它。
 */
export const imageIO = {
  load(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      /**
       * `decoding = 'async'` + `decode()`：解码交给浏览器自己的线程，**resolve 之后再
       * append 不会引起一次同步解码**。这是「不阻塞主线程渲染」里最关键的一行 ——
       * 只做空闲期调度但仍然同步解码的话，卡顿只是从滚动帧挪到了空闲帧。
       */
      img.decoding = 'async';
      // 装饰性的 alt 由调用方按需覆盖；这里给空串免得读屏念 URL
      img.alt = '';

      if (typeof img.decode === 'function') {
        img.src = url;
        // decode() 在加载失败时也会 reject（EncodingError），所以不用另外挂 onerror
        img.decode().then(() => resolve(img), reject);
        return;
      }
      // 老浏览器（与 happy-dom）：退回 onload/onerror，语义一致，只是少了「解码也完成了」这层保证
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`image load failed: ${url}`));
      img.src = url;
    });
  },
};

/** 同时在途的取图数上限。再多也只是排在浏览器的连接队列里，还会让解码堆在一起 */
const MAX_INFLIGHT = 4;

/**
 * 坏链表的条数上限。
 *
 * 有上限是因为十万行 × 每行几张图的表能把 URL 攒到极多，而这里只需要「最近撞见过的那些」
 * —— 会再被问到的本来就是刚滚过去的几屏。超出时按插入序淘汰最老的（`Set` 的迭代序）。
 */
const FAILED_MAX = 300;

/**
 * 空闲回调的兜底时限：页面一直忙时最多等这么久也要开工，否则「一直不出图」。
 * 200ms 是「用户已经感觉到停下来了」与「不侵占滚动帧」之间的折中。
 */
const IDLE_TIMEOUT = 200;

/** 加载失败过的 URL（见文件头「只记失败，不记成功」） */
const failed = new Set<string>();

/**
 * 待办队列，**先进先出**。
 *
 * 进队顺序就是核心的渲染顺序（`_fillCellContent` 逐格调 `render`，行从上往下），所以出图
 * 自然是从上往下 —— 那正是人读表的顺序。
 *
 * ⚠️ 这里走过两次弯路，别改回去：
 *
 *   1. **纯 LIFO**（`queue.pop()`）—— 动机是「快滚十屏后队头全是废任务，用户盯着的那一屏
 *      反而最后才出」。但那件事**根本不需要 LIFO**：滚走的格子早被回收，`alive()` 一查就
 *      跳过（连请求都不发）。代价却是一屏图**从最后一行往上**冒出来。
 *   2. **按帧分批、批之间 LIFO + 批内 FIFO** —— 想同时要「新屏优先」和「屏内顺序」。结果在
 *      **初次挂载**上翻车：核心第一次重绘只画了前 6 行、第二次才补到 21 行，而前 6 行**沿用
 *      了原有 DOM**（占位盒没离开文档 → 任务还活着、还留在第一批）。于是出图顺序是
 *      「第 7 行往下走完，再回头补前 6 行」—— 用户报的就是这个。
 *
 * 结论：顺序上只需要一条规则（进队顺序 = 行序 = 出图顺序），「不做废功」交给 `alive()`。
 */
let queue: ImageRequest[] = [];

let inflight = 0;

/** 已排期但还没跑的那个空闲回调的取消函数（`null` 表示当前没有排期） */
let cancelScheduled: (() => void) | null = null;

function rememberFailure(url: string): void {
  failed.add(url);
  if (failed.size > FAILED_MAX) {
    const oldest = failed.values().next();
    if (!oldest.done) failed.delete(oldest.value);
  }
}

/** 把 `fn` 排到空闲期。没有 `requestIdleCallback`（Safari 老版本、happy-dom）就退定时器 */
function onIdle(fn: () => void): () => void {
  const ric = (globalThis as any).requestIdleCallback as
    | ((cb: () => void, opts?: { timeout: number }) => number)
    | undefined;
  if (typeof ric === 'function') {
    const id = ric(fn, { timeout: IDLE_TIMEOUT });
    return () => (globalThis as any).cancelIdleCallback?.(id);
  }
  const id = setTimeout(fn, 16);
  return () => clearTimeout(id);
}

function schedule(): void {
  if (cancelScheduled || (queue.length === 0 && inflight === 0)) return;
  cancelScheduled = onIdle(() => {
    cancelScheduled = null;
    drain();
  });
}

/** 起一个任务；完成后再排一次期（**不直接接着 drain**，保证每次开工都在空闲期） */
function start(req: ImageRequest): void {
  inflight++;
  imageIO.load(req.url).then(
    (img) => {
      inflight--;
      // 解码完成期间那一格可能已经被回收了 —— 这时候 append 会把图挂到一棵游离的树上
      if (req.alive()) req.onOk(img);
      schedule();
    },
    () => {
      inflight--;
      rememberFailure(req.url);
      if (req.alive()) req.onError();
      schedule();
    },
  );
}

/** 排空到并发上限。队列里已经作废的任务顺手丢掉（回收得越快，废任务越多） */
function drain(): void {
  while (inflight < MAX_INFLIGHT && queue.length > 0) {
    const req = queue.shift()!;
    // 已经被回收的格子在这里被剔掉：一次 `isConnected` 而已，不发请求、不解码
    if (!req.alive()) continue;
    start(req);
  }
  // 还有剩（并发满了）就等某个任务完成时的那次 schedule 接着做
}

/**
 * 排一次取图。
 *
 * **已知坏链直接同步回调 `onError`**：那一格上一次就没加载出来，先画占位盒再变断图等于
 * 白闪一次，而且这条路径上没有任何解码工作，同步做不影响渲染帧。看过的好图仍然要走队列
 * —— 显示它依然需要一个新的 `<img>` 与一次解码（图片本体命中浏览器缓存，所以很快）。
 */
export function requestImage(req: ImageRequest): void {
  if (failed.has(req.url)) {
    req.onError();
    return;
  }
  queue.push(req);
  schedule();
}

/**
 * 同步排空队列（**测试用**）。
 *
 * 产品代码不该调它：那等于放弃「只在空闲期开工」这条唯一的保证。
 * 反复 drain + 让出宏任务，直到队列与在途都空（有迭代上限，免得 `imageIO` 被换成
 * 永不 settle 的实现时把测试挂死）。
 */
export async function flushImageQueue(): Promise<void> {
  for (let i = 0; i < 200 && (queue.length > 0 || inflight > 0); i++) {
    drain();
    await new Promise((r) => setTimeout(r, 0));
  }
}

/** 清空队列与坏链表（**测试用**：每个用例都该从「什么都没看过」开始） */
export function resetImageLoader(): void {
  cancelScheduled?.();
  cancelScheduled = null;
  queue = [];
  inflight = 0;
  failed.clear();
}
