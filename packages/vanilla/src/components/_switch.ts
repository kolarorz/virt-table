/**
 * **表格之外**也能用的开关（`VtSwitch` 列组件的内核）。
 *
 * 为什么要把它抽出来：付费插件的配置面板（甘特的「甘特图配置」下拉里有「仅计算工作日」）
 * 需要一个开关，而 `VtSwitch` 是**列工厂** —— 它返回的是 `VirtTableColumn`，只能装在列上。
 * 少了这一层，每个插件都得照抄一遍 `.vt-comp-switch-track` / `-thumb` 的 DOM 结构与
 * `aria-checked` 的写法；抄错一处（比如漏掉 `role="switch"`）读屏器就读不出这是开关，
 * 而且**没人会发现**。
 *
 * 用 `<button role="switch">` 而不是 `<input type="checkbox">`：轨道 + 滑块要两层元素才画
 * 得出来，而 `input` 不能有子节点。
 */

export interface SwitchHandle {
  /** 整个控件（开关 + 可选文案）。使用方 append 到自己的容器里 */
  readonly el: HTMLElement;
  /** 轨道本体（要给它加 `title` / `aria-label` 时用） */
  readonly track: HTMLButtonElement;
  checked(): boolean;
  /** 改状态，**不**触发 `onChange`（外部状态变了来同步视图用） */
  setChecked(next: boolean): void;
  setDisabled(next: boolean): void;
}

export interface SwitchOptions {
  checked?: boolean;
  disabled?: boolean;
  /** 开启时画在开关右侧的文案；两个都不给就不画文案节点 */
  activeText?: string;
  inactiveText?: string;
  /** 用户切换时调用（`setChecked()` 不触发） */
  onChange?: (checked: boolean) => void;
}

export function createSwitch(opts: SwitchOptions = {}): SwitchHandle {
  const el = document.createElement('span');
  el.className = 'vt-comp-cell vt-comp-switch';

  let checked = opts.checked === true;

  const track = document.createElement('button');
  track.type = 'button';
  track.className = 'vt-comp-switch-track';
  track.setAttribute('role', 'switch');
  track.setAttribute('aria-checked', String(checked));
  track.disabled = opts.disabled === true;

  const thumb = document.createElement('span');
  thumb.className = 'vt-comp-switch-thumb';
  track.appendChild(thumb);
  el.appendChild(track);

  const hasText = opts.activeText !== undefined || opts.inactiveText !== undefined;
  const textEl = hasText ? document.createElement('span') : null;
  if (textEl) {
    textEl.className = 'vt-comp-switch-text';
    el.appendChild(textEl);
  }

  const paint = (): void => {
    track.setAttribute('aria-checked', String(checked));
    if (textEl) textEl.textContent = (checked ? opts.activeText : opts.inactiveText) ?? '';
  };
  paint();

  track.addEventListener('click', () => {
    if (track.disabled) return;
    checked = !checked;
    paint();
    opts.onChange?.(checked);
  });

  return {
    el,
    track,
    checked: () => checked,
    setChecked(next: boolean): void {
      checked = next;
      paint();
    },
    setDisabled(next: boolean): void {
      track.disabled = next;
    },
  };
}
