import { createPopup, type PopupHandle } from './_popup';

/**
 * **表格之外**的单选下拉：一个带边框的下拉框 + 一个面板。
 *
 * ## 为什么核心要有这一件
 *
 * `VtSelect` 是**列工厂**（返回 `VirtTableColumn`），只能装在单元格上；它的锚点
 * （`makeAnchor`）也刻意不画边框 —— 那是「单元格里的回显」，边框由 `.vt-cell-cover` 提供。
 * 而插件的**配置面板**里需要的是普通表单里那种下拉框（甘特的「甘特图配置」下拉里有
 * 开始日期 / 结束日期 / 标题展示 / 颜色显示四个）。
 *
 * 少了这一件，每个插件都要自己搭一遍：`document.body.appendChild` 一个 div（于是整批
 * `--vt-*` 静默失效，见 `_popup.ts` 开头）、自己写 outside-click（于是点一下就把别人的
 * 单元格编辑器关掉）、自己画一套面板皮肤（于是同一个页面上有两种下拉长相）。
 * 收口在核心之后，浮层宿主查找、嵌套浮层的 outside-click、面板皮肤、选中态的对勾
 * 全都是**一份实现**。
 *
 * ## 外观从哪来
 *
 * 复用 `.vt-comp-anchor`（下拉控件的回显 + 箭头）与 `.vt-filter-item` / `.vt-comp-check`
 * （面板项 + 选中对勾），只多一个 `.vt-field-select` 负责「边框 + 固定高度」——
 * 单元格里那份高度是行高说了算，表单里得自己立起来。
 */

const CHEVRON_SVG =
  '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" ' +
  'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M9 6l6 6-6 6"/></svg>';

const CHECK_SVG =
  '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" ' +
  'stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M5 13l4 4L19 7"/></svg>';

export interface SelectFieldOption {
  value: string;
  label: string;
  /** 给一个色点（状态、优先级这类分类值） */
  color?: string;
  /** 置灰不可选（保留在列表里说明「有这一项但此刻不能选」） */
  disabled?: boolean;
}

export interface SelectFieldOptions {
  options: SelectFieldOption[];
  /** 当前值；不在 `options` 里（或为 null）时显示 placeholder */
  value?: string | null;
  placeholder?: string;
  /**
   * 找浮层宿主的起点，默认取控件自己。
   *
   * 控件**创建时还没挂进文档**的场合要显式给（`closest()` 那时必然是 null，浮层会掉到
   * `document.body` 上、`--vt-*` 一个都继承不到）—— 与 `PopupOptions.owner` 同一个道理。
   */
  owner?: HTMLElement;
  /** 面板最小宽度，默认与控件同宽 */
  minWidth?: number;
  /** 列表为空时面板里的那句话 */
  emptyText?: string;
  disabled?: boolean;
  /** 用户选了一项（`setValue()` 不触发） */
  onChange?: (value: string, option: SelectFieldOption) => void;
}

export interface SelectFieldHandle {
  readonly el: HTMLElement;
  value(): string | null;
  /** 改值，**不**触发 `onChange` */
  setValue(next: string | null): void;
  setOptions(next: SelectFieldOption[]): void;
  setDisabled(next: boolean): void;
  /** 面板开着就收起 */
  close(): void;
  destroy(): void;
}

export function createSelectField(opts: SelectFieldOptions): SelectFieldHandle {
  let list = opts.options.slice();
  let value = opts.value ?? null;

  const el = document.createElement('div');
  el.className = 'vt-comp-anchor vt-field-select';
  el.tabIndex = 0;
  el.setAttribute('role', 'combobox');
  el.setAttribute('aria-haspopup', 'listbox');
  el.setAttribute('aria-expanded', 'false');

  const dot = document.createElement('span');
  dot.className = 'vt-field-select-dot';
  const text = document.createElement('span');
  text.className = 'vt-comp-anchor-text';
  const caret = document.createElement('span');
  caret.className = 'vt-comp-anchor-caret';
  caret.innerHTML = CHEVRON_SVG;
  el.append(dot, text, caret);

  let popup: PopupHandle | null = null;

  const paint = (): void => {
    const hit = list.find((o) => o.value === value);
    text.textContent = hit?.label ?? opts.placeholder ?? '';
    el.classList.toggle('vt-comp-anchor--placeholder', !hit);
    if (hit?.color) {
      dot.style.display = '';
      dot.style.background = hit.color;
    } else {
      dot.style.display = 'none';
    }
  };

  const close = (): void => {
    popup?.destroy();
    popup = null;
    el.setAttribute('aria-expanded', 'false');
  };

  const open = (): void => {
    if (popup || opts.disabled) return;
    popup = createPopup({
      anchor: el,
      owner: opts.owner ?? el,
      placement: 'below',
      minWidth: opts.minWidth ?? el.getBoundingClientRect().width,
      onClose: close,
    });
    el.setAttribute('aria-expanded', 'true');

    const panel = document.createElement('div');
    panel.className = 'vt-filter-list';
    panel.setAttribute('role', 'listbox');
    if (list.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'vt-comp-popup-empty';
      empty.textContent = opts.emptyText ?? '暂无选项';
      panel.appendChild(empty);
    }
    for (const o of list) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'vt-filter-item';
      item.setAttribute('role', 'option');
      const selected = o.value === value;
      item.setAttribute('aria-selected', String(selected));
      item.classList.toggle('is-selected', selected);
      item.disabled = o.disabled === true;

      if (o.color) {
        const d = document.createElement('span');
        d.className = 'vt-field-select-dot';
        d.style.background = o.color;
        item.appendChild(d);
      }
      const label = document.createElement('span');
      label.className = 'vt-field-select-label';
      label.textContent = o.label;
      item.appendChild(label);
      // 选中态不只靠颜色（色觉障碍不友好），给一个对勾 —— 与单选面板同款
      const check = document.createElement('span');
      check.className = 'vt-comp-check';
      if (selected) check.innerHTML = CHECK_SVG;
      item.appendChild(check);

      item.addEventListener('click', () => {
        if (o.disabled) return;
        value = o.value;
        paint();
        close();
        opts.onChange?.(o.value, o);
      });
      panel.appendChild(item);
    }
    popup.el.appendChild(panel);
    popup.update();
  };

  el.addEventListener('click', () => (popup ? close() : open()));
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (popup) close();
      else open();
    }
  });

  const setDisabled = (next: boolean): void => {
    opts.disabled = next;
    el.classList.toggle('vt-field-select--disabled', next);
    el.tabIndex = next ? -1 : 0;
    if (next) close();
  };
  setDisabled(opts.disabled === true);
  paint();

  return {
    el,
    value: () => value,
    setValue(next: string | null): void {
      value = next;
      paint();
    },
    setOptions(next: SelectFieldOption[]): void {
      list = next.slice();
      // 面板开着时重建它：选项变了还显示旧列表是最容易骗到人的一种状态
      if (popup) {
        close();
        open();
      }
      paint();
    },
    setDisabled,
    close,
    destroy(): void {
      close();
      el.remove();
    },
  };
}
