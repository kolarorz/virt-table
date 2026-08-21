import type { CellImageValue } from '../cell-type';
import type { VirtTableColumn } from '../index';
import type { VtImageViewerTexts } from '../locale';
import { buildChips } from './_enum';
import { requestImage } from './_image-loader';
import { openImageViewer } from './_image-viewer';
import {
  type BaseColumnOptions,
  makeCellWrap,
  pickColumnProps,
  stopCellInterference,
} from './shared';

/**
 * 一张图。**复用核心 `cellType: 'image'` 的值形状**（`{ url, alt }`）再加一个缩略图地址 ——
 * 同一份行数据既能配 `cellType: 'image'` 也能换成 `VtImage`，不用改数据。
 */
export interface VtImageItem extends CellImageValue {
  /** 缩略图地址（列表小图 / CDN 裁切参数）。不给就用 `url`；查看器一律用 `url` */
  thumb?: string;
}

export interface VtImageOptions<T = any> extends Omit<BaseColumnOptions<T>, 'clearable'> {
  /**
   * 单元格里最多画几张缩略图，超出折叠成 `+N`（点它从第 N+1 张开始看）。默认 3；`0` 不折叠。
   *
   * 折叠计数复用 `.vt-comp-tag-more` —— 标签列、人员列、图片列的「还有 N 个」不该长得不一样。
   */
  maxCount?: number;
  /**
   * 缩略图的裁切方式，默认 `'cover'`。
   *
   * `'cover'` 是**正方形裁切**：一列缩略图宽高一致，边缘对得齐；`'contain'` 把整张图完整
   * 放进方框（留白），适合比例差异大、又必须看全貌的图（LOGO、图纸）。
   */
  fit?: 'cover' | 'contain';
  /**
   * 行值是 `'a.png|b.png'` 这类拼接字符串时的分隔符。**默认不拆**。
   *
   * 刻意不给默认值（比如 `','`）：data URI 里就有逗号（`data:image/png;base64,...`），
   * 默认拆的话「一张内联图」会被劈成两个坏链 —— 静默出错，比要多写一个选项糟得多。
   */
  separator?: string;
  /**
   * 自定义取图。给了它就**不再走内置形状解析**（字符串 / `{ url, alt, thumb }` / 两者的数组），
   * 用来对付「图片信息散在几个字段里」这类真实数据。
   */
  items?: (
    value: unknown,
    row: T,
    rowIndex: number,
  ) => ReadonlyArray<string | VtImageItem>;
  /** 点缩略图是否弹查看器，默认 `true`。`false`（或 `disabled: true`）就是纯展示，缩略图不可点 */
  viewer?: boolean;
  /** 查看器工具栏给下载按钮，默认 false */
  downloadable?: boolean;
  /**
   * 打开查看器之前调用。**返回 `false` 阻止内置查看器**（自己接管预览，比如打开业务弹窗）。
   * 返回其它值（含 `undefined`）照常打开。
   */
  onPreview?: (info: {
    items: VtImageItem[];
    index: number;
    row: T;
    rowIndex: number;
  }) => boolean | void;
  /** 查看器文案，默认 `zhCN.imageViewer`（组件建列时读一次，不跟随 `setLocale()`） */
  texts?: Partial<VtImageViewerTexts>;
}

/** 断图占位：与 `shared.ts` 那批图标同款（`currentColor` 描边 + `1em`） */
const BROKEN_SVG =
  '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" ' +
  'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="3" y="4" width="18" height="16" rx="2"/>' +
  '<path d="M3 16l4.5-4.5 3.5 3.5M21 15l-3.5-3.5-2 2M4 4l16 16"/></svg>';

/**
 * 图片列：缩略图 + 点开查看器。
 *
 * ```ts
 * VtImage({ key: 'cover', title: '封面', width: 120 })                       // 一格一张
 * VtImage({ key: 'pics', title: '相册', width: 160, maxCount: 3 })            // 多张，超出折叠 +N
 * VtImage({ key: 'pics', title: '图纸', width: 200, fit: 'contain', maxCount: 0 })
 * VtImage({ key: 'cover', title: '封面', width: 120, viewer: false })         // 纯展示，不可点
 * ```
 *
 * 值可以是 URL 字符串、`{ url, alt, thumb }`、或两者的数组；形状不合就用 `items` 自己给。
 *
 * **两件事与其它展示型组件不同，都写在了 `_image-loader.ts` / `_image-viewer.ts` 里：**
 *
 * 1. **取图不在渲染路径上**。`render` 只同步产出占位方框（零请求、零解码），加载排到空闲期，
 *    而且单元格被回收就丢弃任务 —— 快滚一屏不会浪费一次请求。核心的 `cellType: 'image'`
 *    是同步建 `<img src>` 的那一种，适合「就一列小图、数据量不大」；图多、行多、要看大图
 *    就用这个组件。
 * 2. **点缩略图弹自绘查看器**（缩放 / 旋转 / 拖拽 / 前后切换）。它不改值，所以归「纯展示」
 *    那一类：没有 `renderEditor`，也**不需要 `vtCellEditor` 插件** —— 与 `VtLink` 同档。
 */
export function VtImage<T = any>(opts: VtImageOptions<T>): VirtTableColumn<T> {
  const maxCount = opts.maxCount ?? 3;
  const contain = opts.fit === 'contain';
  /** 能不能点开查看器。`disabled` 与其它组件同义：关掉交互，只留展示 */
  const clickable = opts.viewer !== false && !opts.disabled;

  return {
    key: opts.key,
    title: opts.title,
    width: opts.width,
    ...pickColumnProps(opts),
    render: (ctx) => {
      const items = resolveItems(opts, ctx.value, ctx.row, ctx.rowIndex);
      if (items.length === 0) return opts.placeholder ?? '';

      const wrap = makeCellWrap('image');

      /** 打开查看器（点击与键盘同一条路径） */
      const open = (index: number, owner: HTMLElement): void => {
        const stopped =
          opts.onPreview?.({ items, index, row: ctx.row, rowIndex: ctx.rowIndex }) === false;
        if (stopped) return;
        openImageViewer({
          items,
          index,
          owner,
          texts: opts.texts,
          downloadable: opts.downloadable,
        });
      };

      /** 把一个元素变成「可点开第 index 张」的按钮 */
      const bindOpen = (el: HTMLElement, index: number, label: string): void => {
        el.setAttribute('role', 'button');
        el.tabIndex = 0;
        el.setAttribute('aria-label', label);
        el.addEventListener('click', () => open(index, el));
        el.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          // 空格默认会滚动页面；Enter 在某些宿主里会提交表单
          e.preventDefault();
          e.stopPropagation();
          open(index, el);
        });
      };

      const nodes = buildChips(items, {
        maxCount,
        chip: (item, i) => {
          const box = document.createElement('span');
          box.className = 'vt-comp-image-item vt-comp-image-item--loading';
          if (contain) box.classList.add('vt-comp-image-item--contain');
          if (item.alt) box.title = item.alt;

          /*
           * 这里**只挂占位盒，不建 `<img>`** —— 整个组件的性能取舍就在这一行。
           * 排期、并发、缓存、回收即弃全在 `_image-loader.ts`，见那个文件的头注。
           *
           * `alive` 拿 `isConnected` 当探针：虚拟滚动回收这一行时 `.vt-td-text` 整棵被换掉
           * （核心 `_fillCellContent` 每次重绘都新建），占位盒于是离开文档 —— 没有任何事件
           * 会通知我们，只能这样问。
           */
          requestImage({
            url: item.thumb || item.url,
            alive: () => box.isConnected,
            onOk: (img) => {
              img.className = 'vt-comp-image-img';
              // 图是装饰：说明文字在 title / aria-label 上，alt 再念一遍是噪音
              img.alt = '';
              box.classList.remove('vt-comp-image-item--loading');
              box.textContent = '';
              box.appendChild(img);
            },
            onError: () => {
              // 断图图标而不是浏览器默认的碎图占位（那个在 21px 的方框里只剩一团马赛克）
              box.classList.remove('vt-comp-image-item--loading');
              box.classList.add('vt-comp-image-item--error');
              box.innerHTML = BROKEN_SVG;
            },
          });

          if (clickable) bindOpen(box, i, item.alt || `图片 ${i + 1}`);
          return box;
        },
      });

      for (const node of nodes) wrap.appendChild(node);

      /**
       * `+N` 也可点：从**被折叠的第一张**开始看。
       *
       * 折叠计数是 `buildChips` 追加的最后一个节点（`.vt-comp-tag-more`），所以这里按类名认它，
       * 而不是按「有没有超出」再算一遍 —— 两处各算一次早晚会漂。
       */
      const more = nodes[nodes.length - 1];
      if (clickable && more?.classList.contains('vt-comp-tag-more')) {
        bindOpen(more, maxCount, `查看全部 ${items.length} 张图片`);
      }

      // 常态里可交互的组件都要拦：不然点一下图会同时被 vtCellSelection 当框选起点、
      // 被 vtCellEditor 当进入编辑（见 shared.ts 的 stopCellInterference）
      if (clickable) stopCellInterference(wrap);
      return wrap;
    },
  };
}

/** 行值 → 图片列表。空列表由调用方回落 `placeholder` */
function resolveItems<T>(
  opts: VtImageOptions<T>,
  value: unknown,
  row: T,
  rowIndex: number,
): VtImageItem[] {
  const raw = opts.items ? opts.items(value, row, rowIndex) : value;
  const list: unknown[] =
    raw == null || raw === ''
      ? []
      : Array.isArray(raw)
        ? (raw as unknown[])
        : typeof raw === 'string' && opts.separator
          ? raw.split(opts.separator)
          : [raw];

  const out: VtImageItem[] = [];
  for (const one of list) {
    if (typeof one === 'string') {
      const url = one.trim();
      if (url) out.push({ url });
    } else if (one && typeof one === 'object' && typeof (one as VtImageItem).url === 'string') {
      const item = one as VtImageItem;
      if (item.url) out.push(item);
    }
    // 数字 / 布尔 / `{ src }` 这类不认的形状直接跳过 —— 结果是这一格显示 placeholder，
    // 而不是一个永远加载失败的断图。需要它们就传 `items` 自己转
  }
  return out;
}
