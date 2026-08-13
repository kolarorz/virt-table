import type { VirtTableColumn } from '../index';
import { type PopupHandle, createPopup } from './_popup';
import {
  type BaseColumnOptions,
  type Dynamic,
  commitValue,
  makeAnchor,
  pickColumnProps,
  resolveDynamic,
} from './shared';

/**
 * 链接值的对象形状：**文案与地址分开存**，一格自包含。
 *
 * 只读列照旧接受纯字符串（值即文案）。可编辑列写回时按「有没有地址」定形状 ——
 * 有地址写 `{ text, url }`，没有地址退回纯字符串，见 `serializeLink` 的注释。
 */
export interface VtLinkValue {
  text?: string;
  url?: string;
}

interface VtLinkCommonOptions<T> extends Omit<BaseColumnOptions<T>, 'clearable' | 'onChange'> {
  /** 新窗口打开（自动补 `rel="noopener noreferrer"`） */
  target?: '_blank' | '_self';
  /** 点击回调。与地址可共存（先回调再跳转） */
  onClick?: (row: T, rowIndex: number) => void;
  /** 下划线时机，默认 `hover` */
  underline?: 'always' | 'hover' | 'never';
}

/** 只读链接列（默认）。文案与地址可以来自 `text` / `href` / `protocol`，也可以来自值 */
export interface VtLinkReadonlyOptions<T = any> extends VtLinkCommonOptions<T> {
  editable?: false;
  /**
   * 链接地址。不配、也没有 `protocol`、值里也没有 `url` 时，渲染成一个「看起来是链接的
   * 按钮」（靠 `onClick` 响应）—— 表格里更常见的用法：点一下打开抽屉/弹窗，而不是跳页面。
   */
  href?: Dynamic<string | undefined, T>;
  /** 协议糖：直接用单元格值拼 `mailto:` / `tel:`，不用自己写 `href` 函数 */
  protocol?: 'mailto' | 'tel';
  /** 显示文案，默认用值（对象值取 `text`） */
  text?: Dynamic<string | undefined, T>;
}

/**
 * 可编辑链接列：文案与地址都住在**值**里（`VtLinkValue`），激活后在下拉面板里分别改。
 *
 * `href` / `protocol` / `text` 在这一支里**不许配**（类型上就拒）：它们是「文案或地址另有
 * 来源」的开关，配了之后面板改完会被它们盖掉 —— 那是一次静默失效，比编译错误难查得多。
 */
export interface VtLinkEditableOptions<T = any> extends VtLinkCommonOptions<T> {
  editable: true;
  href?: never;
  protocol?: never;
  text?: never;
  onChange?: BaseColumnOptions<T>['onChange'];
  /** 文案栏的标签，默认「文案」 */
  textLabel?: string;
  /** 链接栏的标签，默认「链接」 */
  urlLabel?: string;
  textPlaceholder?: string;
  urlPlaceholder?: string;
}

export type VtLinkOptions<T = any> = VtLinkReadonlyOptions<T> | VtLinkEditableOptions<T>;

/** 解析出来的一对「文案 + 地址」 */
interface LinkParts {
  text: string;
  url: string;
}

/**
 * 读值。两种形状都认：
 *   - 纯字符串 / 数字 —— 值即文案，没有地址（老形状，一直是这么用的）
 *   - `{ text, url }` —— 文案与地址分开存（可编辑列写回的形状）
 */
function parseLink(value: unknown): LinkParts {
  if (value == null) return { text: '', url: '' };
  if (typeof value === 'object') {
    const v = value as VtLinkValue;
    return {
      text: v.text == null ? '' : String(v.text),
      url: v.url == null ? '' : String(v.url),
    };
  }
  return { text: String(value), url: '' };
}

/**
 * 写回的形状。**没有地址就退回纯字符串**，而不是一律写 `{ text, url: '' }`。
 *
 * 这一列的值会被排序、筛选、框选复制（`String(row[key])`）反复消费：能是标量的时候就别
 * 变成对象。有地址时对象不可避免 —— 一格里要存两个字段。
 */
function serializeLink(parts: LinkParts): string | VtLinkValue {
  return parts.url ? { text: parts.text, url: parts.url } : parts.text;
}

/**
 * 允许出现在 `href` 上的协议。
 *
 * 白名单而不是黑名单：可编辑列的地址是**用户手打进面板**的（只读列的也来自后端数据），
 * `javascript:` / `data:` 落到 `<a href>` 上就是一次存储型 XSS —— 别人打开这张表，点一下
 * 这个单元格就执行。名单外的地址一律当「没有地址」处理（渲染成按钮/纯文本）。
 */
const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:', 'ftp:']);

/** 协议前缀。相对地址（`/detail/1`、`#anchor`、`./a`）没有协议，直接放行 */
const SCHEME_RE = /^([a-zA-Z][a-zA-Z0-9+.-]*):/;

function isSafeUrl(raw: string): boolean {
  /*
   * 先剥掉控制字符与空白再判协议：浏览器解析 href 时会忽略它们，所以
   * `java\tscript:alert(1)` 是**能跑的** —— 不剥就等于没检查。剥出来的串只用于判定，
   * 真正写进 href 的仍是原串。
   */
  const probe = raw.replace(/[\u0000-\u0020]/g, '');
  const scheme = SCHEME_RE.exec(probe);
  if (!scheme) return true;
  return SAFE_SCHEMES.has(scheme[0]!.toLowerCase());
}

/**
 * 链接列。
 *
 * ```ts
 * // 只读：点一下打开详情（没有地址 → 渲染 <button>）
 * VtLink({ key: 'name', title: '名称', width: 200, onClick: (row) => openDetail(row) })
 * VtLink({ key: 'email', title: '邮箱', width: 220, protocol: 'mailto' })
 * VtLink({ key: 'homepage', title: '主页', width: 220,
 *          href: (row) => row.homepage, target: '_blank' })
 *
 * // 可编辑：值是 `{ text, url }`，激活后在下拉面板里分别改文案与地址
 * VtLink({ key: 'ref', title: '参考链接', width: 240, editable: true, target: '_blank' })
 * ```
 *
 * 有地址时渲染 `<a>`，没有则渲染 `<button>` —— 不给一个无 `href` 的 `<a>`，那种元素
 * 键盘聚焦不到、读屏也不报「链接」，是个只有外观没有语义的空壳。
 *
 * `target: '_blank'` 一律补 `rel="noopener noreferrer"`：不补的话新页面能通过
 * `window.opener` 反向操作本页（表格里的地址常常来自后端数据）。地址过 `isSafeUrl`
 * 白名单，名单外（`javascript:` 之类）按「没有地址」处理。
 */
export function VtLink<T = any>(opts: VtLinkOptions<T>): VirtTableColumn<T> {
  const underline = opts.underline ?? 'hover';
  const editable = opts.editable === true && !opts.disabled;

  /** 常态与编辑态锚点共用：算出这一行最终显示的文案与地址 */
  const resolve = (value: unknown, row: T, rowIndex: number): LinkParts => {
    const parts = parseLink(value);
    const text = resolveDynamic(opts.text, row, rowIndex) ?? parts.text;
    // 优先级：protocol > href > 值里的 url。前两个是列上的显式配置，比数据更「说得算」
    const seed = parts.text || parts.url;
    const raw = opts.protocol
      ? seed && `${opts.protocol}:${seed}`
      : (resolveDynamic(opts.href, row, rowIndex) ?? parts.url);
    const url = raw && isSafeUrl(raw) ? raw : '';
    // 只有地址没有文案时拿地址当文案 —— 空文案的链接在表格里就是个看不见的格子
    return { text: text || url, url };
  };

  /**
   * 造展示元素。`tag` 让编辑态锚点能复用同一套外观：锚点里用 `<span>`（同款样式但不跳转），
   * 否则点一下正在编辑的单元格就把页面导航走了。
   */
  const buildLink = (parts: LinkParts, tag?: 'span'): HTMLElement => {
    const el = tag
      ? document.createElement('span')
      : parts.url
        ? document.createElement('a')
        : (document.createElement('button') as HTMLElement);
    el.className = `vt-comp-link vt-comp-link--underline-${underline}`;
    el.textContent = parts.text;

    if (el instanceof HTMLAnchorElement) {
      el.href = parts.url;
      if (opts.target) {
        el.target = opts.target;
        if (opts.target === '_blank') el.rel = 'noopener noreferrer';
      }
    } else if (el instanceof HTMLButtonElement) {
      el.type = 'button';
    }
    return el;
  };

  const col: VirtTableColumn<T> = {
    key: opts.key,
    title: opts.title,
    width: opts.width,
    ...pickColumnProps(opts),
    render: ({ value, row, rowIndex }) => {
      const parts = resolve(value, row, rowIndex);
      if (!parts.text) return opts.placeholder ?? '';

      const el = buildLink(parts);

      if (opts.disabled) {
        el.setAttribute('aria-disabled', 'true');
        el.style.pointerEvents = 'none';
        el.style.color = 'var(--vt-text-disabled)';
        return el;
      }

      if (opts.onClick) {
        el.addEventListener('click', () => opts.onClick!(row, rowIndex));
      }

      /*
       * 拦掉指针事件冒泡（AGENTS.md §7.14 那条：不拦就会被 vtCellSelection 当框选起点、
       * 被 vtCellEditor 当进入编辑）。可编辑列**放 dblclick 过去** —— 链接元素常常铺满
       * 整个单元格，剩给「点空白进编辑」的只有左右两条内边距；双击是这时唯一还够用的
       * 指针入口（`vtCellEditor({ trigger: 'dblclick' })`）。mousedown / click 照旧拦：
       * 点链接就是跳转/回调，不该顺手开编辑器或起一块选区。
       */
      const swallow = editable
        ? (['mousedown', 'click'] as const)
        : (['mousedown', 'click', 'dblclick'] as const);
      for (const type of swallow) el.addEventListener(type, (e) => e.stopPropagation());

      return el;
    },
  };

  if (!editable) return col;

  const eOpts = opts as VtLinkEditableOptions<T>;

  /**
   * 可编辑列按文案排序：对象值走默认比较等于比 `{}`（永远相等，点表头没反应）。
   * 使用方自己给了 `sortMethod` 就用他的。
   */
  if (opts.sortable && opts.sortMethod === undefined) {
    col.sortMethod = (a, b) =>
      parseLink((a as any)[opts.key]).text.localeCompare(parseLink((b as any)[opts.key]).text);
  }

  col.renderEditor = (ctx) => {
    /**
     * 面板里是**暂存值**：确定才写回、取消就丢掉。
     *
     * 与枚举面板的「勾一下即写回」相反 —— 那边一次编辑就是一次选择，这边一次编辑要同时改
     * 两个字段，中途写回等于把半成品落库（文案改完还没填地址就先写了个无地址的值），
     * `onChange` 也会多触发一次。
     */
    let parts = resolve(ctx.value, ctx.row, ctx.rowIndex);

    const anchor = makeAnchor(opts.placeholder);
    // 回显与常态同款（同一个 buildLink）：否则点一下单元格，蓝色链接变成黑色文字，
    // 观感是「换了一列」而不是「这一格在编辑」（AGENTS.md §7.14 那条）
    const syncAnchor = (): void => {
      if (parts.text) anchor.setNodes([buildLink(parts, 'span')]);
      else anchor.setText('');
    };

    let popup: PopupHandle | null = null;
    let firstInput: HTMLInputElement | null = null;

    const close = (): void => {
      popup?.destroy();
      popup = null;
      firstInput = null;
    };

    /** 一栏：标签 + 输入框。装在 `<label>` 里，点标签也能聚焦 */
    const field = (
      host: HTMLElement,
      label: string,
      value: string,
      placeholder?: string,
    ): HTMLInputElement => {
      const wrap = document.createElement('label');
      wrap.className = 'vt-comp-link-field';

      const caption = document.createElement('span');
      caption.className = 'vt-comp-link-label';
      caption.textContent = label;

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'vt-filter-text';
      input.value = value;
      if (placeholder) input.placeholder = placeholder;
      input.autocomplete = 'off';

      wrap.append(caption, input);
      host.appendChild(wrap);
      return input;
    };

    const open = (): void => {
      if (popup) return;
      popup = createPopup({
        anchor: anchor.el,
        // 锚点此刻还没挂进文档，宿主从编辑浮层去找（见 _popup.ts 的 owner）
        owner: ctx.el,
        // 几何基准取单元格盒子：锚点在 cover 的 2px 边框内侧，拿它会错开
        geometry: ctx.el,
        className: 'vt-comp-link-panel',
        /*
         * 至少 260px。默认宽度是单元格宽（下拉与单元格对齐的通用预期），但这个面板里是
         * 两个要装得下网址的输入框 —— 挂在 120px 的窄列上就只剩十来个字符的可视宽度。
         * 取 max 而不是写死：宽列仍然对齐单元格。
         */
        minWidth: Math.max(260, ctx.el.getBoundingClientRect().width),
        onClose: close,
      });

      const body = document.createElement('div');
      body.className = 'vt-comp-link-fields';
      popup.el.appendChild(body);

      const textEl = field(body, eOpts.textLabel ?? '文案', parts.text, eOpts.textPlaceholder);
      const urlEl = field(
        body,
        eOpts.urlLabel ?? '链接',
        parts.url,
        eOpts.urlPlaceholder ?? 'https://',
      );
      firstInput = textEl;

      const commit = (): void => {
        parts = { text: textEl.value.trim(), url: urlEl.value.trim() };
        syncAnchor();
        commitValue(eOpts, ctx, serializeLink(parts));
        close();
        anchor.el.focus();
      };

      const dismiss = (): void => {
        close();
        anchor.el.focus();
      };

      for (const input of [textEl, urlEl]) {
        input.addEventListener('keydown', (e) => {
          // 两个键都要 stopPropagation：不拦的话 vtKeyboardNav 把它们当成「换单元格」
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            commit();
          } else if (e.key === 'Escape') {
            e.stopPropagation();
            dismiss();
          }
        });
      }

      const actions = document.createElement('div');
      actions.className = 'vt-filter-actions';

      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'vt-filter-btn';
      cancel.textContent = '取消';
      cancel.addEventListener('click', dismiss);

      const confirm = document.createElement('button');
      confirm.type = 'button';
      confirm.className = 'vt-filter-btn vt-filter-btn--primary';
      confirm.textContent = '确定';
      confirm.addEventListener('click', commit);

      actions.append(cancel, confirm);
      popup.el.appendChild(actions);
      popup.update();
    };

    anchor.el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (popup) close();
      else open();
    });
    anchor.el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        if (!popup) open();
      }
    });

    syncAnchor();
    // 激活即展开，少一次点击（与枚举面板同一手感）。**同步**创建而不是等 rAF：
    // 此刻锚点还没进文档，`_popup` 会先 visibility: hidden，等锚定循环量到位置再显形
    open();
    // focus 必须等元素进了文档才有效；焦点给文案栏（激活即可打字改文案）
    requestAnimationFrame(() => (firstInput ?? anchor.el).focus());

    return anchor.el;
  };

  return col;
}
