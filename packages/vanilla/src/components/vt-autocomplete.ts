import type { VirtTableColumn } from '../index';
import { type PopupHandle, createPopup } from './_popup';
import {
  type BaseColumnOptions,
  type VtOption,
  INPUT_CSS,
  commitValue,
  pickColumnProps,
  wrapWithClear,
} from './shared';

export interface VtAutocompleteOptions<T = any> extends BaseColumnOptions<T> {
  /**
   * 建议源。同步返回数组，或返回 Promise（打接口）。
   * `query` 是输入框当前内容，过滤逻辑由使用方决定 —— 组件不猜「是前缀匹配还是模糊匹配」。
   */
  fetchSuggestions: (query: string, row: T) => VtOption[] | Promise<VtOption[]>;
  /** 请求防抖（ms），默认 200。同步源可以给 0 */
  debounce?: number;
  /** 聚焦时就请求一次（`query` 为当前值），默认 true */
  triggerOnFocus?: boolean;
  /** 选中建议时写回 `value` 还是 `label`，默认 `'value'` */
  emit?: 'value' | 'label';
  maxLength?: number;
  /** 没有建议时的提示文案，默认「无匹配项」 */
  emptyText?: string;
}

/**
 * 带建议下拉的输入列。
 *
 * ```ts
 * VtAutocomplete({
 *   key: 'city', title: '城市', width: 200,
 *   fetchSuggestions: (q) => CITIES.filter((c) => c.label.includes(q)),
 * })
 * // 异步源
 * VtAutocomplete({
 *   key: 'owner', title: '负责人', width: 200, debounce: 300,
 *   fetchSuggestions: async (q) => (await searchUsers(q)).map(u => ({ value: u.id, label: u.name })),
 * })
 * ```
 *
 * 输入框在单元格里（与 `VtInput` 同款），建议列表在 `_popup.ts` 的浮层里。
 * 键盘：`↓` / `↑` 移动高亮、`Enter` 选中、`Esc` 关闭。
 *
 * **自由输入也会写回**（不强制从建议里选）：表格里这一列多半是「可以随便填，但给点提示」。
 * 需要强约束就配列上的 `validator`。
 *
 * 异步竞态用递增的 `seq` 挡掉：慢请求先发、快请求后到时，旧结果不会盖掉新结果 ——
 * 防抖只能减少请求数，挡不住乱序返回。
 */
export function VtAutocomplete<T = any>(opts: VtAutocompleteOptions<T>): VirtTableColumn<T> {
  const col: VirtTableColumn<T> = {
    key: opts.key,
    title: opts.title,
    width: opts.width,
    ...pickColumnProps(opts),
  };

  if (opts.disabled) return col;

  col.renderEditor = (ctx) => {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'vt-comp-input';
    input.value = (ctx.value as string) ?? '';
    input.placeholder = opts.placeholder ?? '';
    if (opts.maxLength !== undefined) input.maxLength = opts.maxLength;
    input.style.cssText = INPUT_CSS;
    input.autocomplete = 'off';

    let popup: PopupHandle | null = null;
    let items: VtOption[] = [];
    let activeIndex = -1;
    let seq = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const closePopup = (): void => {
      popup?.destroy();
      popup = null;
      items = [];
      activeIndex = -1;
    };

    const renderList = (): void => {
      if (!popup) {
        // owner 用编辑浮层：建议列表可能在 input 挂进文档之前就被请求回来
        popup = createPopup({ anchor: input, owner: ctx.el, onClose: closePopup });
      }
      popup.el.innerHTML = '';

      if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'vt-comp-popup-empty';
        empty.textContent = opts.emptyText ?? '无匹配项';
        popup.el.appendChild(empty);
        popup.update();
        return;
      }

      const list = document.createElement('div');
      list.className = 'vt-filter-list';
      items.forEach((item, i) => {
        const el = document.createElement('div');
        el.className = 'vt-filter-item';
        if (i === activeIndex) el.classList.add('is-active');
        el.textContent = item.label;
        if (item.disabled) {
          el.setAttribute('aria-disabled', 'true');
        } else {
          // 用 mousedown 而不是 click：click 之前会先发生 blur/mousedown，
          // 那时 cell-editor 的 outside-click 已经在判定了 —— 早一步落地更稳
          el.addEventListener('mousedown', (e) => {
            e.preventDefault();
            pick(i);
          });
        }
        list.appendChild(el);
      });
      popup.el.appendChild(list);
      popup.update();
    };

    const pick = (i: number): void => {
      const item = items[i];
      if (!item || item.disabled) return;
      const emitted = opts.emit === 'label' ? item.label : item.value;
      input.value = item.label;
      commitValue(opts, ctx, emitted);
      closePopup();
      input.focus();
    };

    const request = (query: string): void => {
      const mySeq = ++seq;
      const result = opts.fetchSuggestions(query, ctx.row);
      Promise.resolve(result).then(
        (list) => {
          // 慢请求后到就丢弃；输入框已被回收（编辑关闭）也丢弃
          if (mySeq !== seq || !input.isConnected) return;
          items = list ?? [];
          activeIndex = -1;
          renderList();
        },
        () => {
          if (mySeq !== seq || !input.isConnected) return;
          items = [];
          renderList();
        },
      );
    };

    const scheduleRequest = (query: string): void => {
      const wait = opts.debounce ?? 200;
      clearTimeout(timer);
      if (wait <= 0) {
        request(query);
        return;
      }
      timer = setTimeout(() => request(query), wait);
    };

    input.addEventListener('input', () => {
      commitValue(opts, ctx, input.value);
      scheduleRequest(input.value);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (items.length === 0) return;
        e.preventDefault();
        e.stopPropagation();
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        activeIndex = (activeIndex + delta + items.length) % items.length;
        renderList();
        return;
      }
      if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        e.stopPropagation();
        pick(activeIndex);
      }
    });

    requestAnimationFrame(() => {
      input.focus();
      if (opts.triggerOnFocus !== false) request(input.value);
    });

    /**
     * `clearable` 此前是个**死选项**：`BaseColumnOptions` 里有、文档也写了，但这一支从没渲染
     * 那个 `×`（传了只是静默无效）。默认仍是**关**（输入类那一档：这是个真的文本框，全选 +
     * Backspace 就清得掉），只是传 `true` 时现在真的有叉了。
     *
     * 浮层的锚点仍是 `input`（外壳收窄 22px，所以建议列表也跟着窄一点点）—— 这一支刻意没传
     * `geometry`，改成拿外壳当锚点会连位置一起动，不在这次的范围里。
     */
    return wrapWithClear(input, !!opts.clearable, () => {
      input.value = '';
      commitValue(opts, ctx, '');
      closePopup();
      input.focus();
    });
  };

  return col;
}
