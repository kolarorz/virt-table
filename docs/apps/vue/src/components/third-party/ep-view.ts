/**
 * Element Plus 查看态的「轻 DOM」—— 渲染 / 交互分离的另一半。
 *
 * ## 为什么查看态不挂真实组件
 *
 * `col.render` 的调用频率 = 可见单元格数 × 行重填次数（见 vanilla 侧
 * `_fillCellContent`：行 DOM 虽然复用，内容却是每次重填的）。而 Vue 侧每个返回 VNode
 * 的单元格都要单独 `render()` 挂载，行一出视口再由 `_cleanupRow` 卸载。这笔
 * mount / unmount 的钱是组件库收的 —— 虚拟化内核再快也退不回来。
 *
 * ## 为什么外观不能靠手写模仿
 *
 * 旧写法是自己定义 `.vt-ep-input-like { border: 1px solid #dcdfe6 }` 去描 el-input 的样子，
 * 这注定漂移：Element Plus 换主题、开暗色、升版本，模仿的那份都不会跟着变。更直接的问题是
 * `.el-input__wrapper` 的边框根本不是 border，而是 inset box-shadow —— 从渲染方式上就不一样。
 *
 * 所以这里改成**直接复用 Element Plus 自己的类名**：静态 DOM + 官方 CSS，零 JS 实例，
 * 主题变量自动跟随。一致性由「共用同一份样式源」保证，而不是靠人眼对齐两份 CSS。
 *
 * ## 两个核对出来的坑
 *
 * 1. `.el-radio-button` 的选中态选择器是
 *    `.is-active .el-radio-button__original-radio:not(:disabled) + .el-radio-button__inner`
 *    —— 少了 `__original-radio` 这个兄弟节点，选中色出不来。这里用 `<span>` 顶替原生
 *    `<input>`：span 永远不满足 `:disabled`，选择器照样命中，又不会抢 Tab 焦点。
 * 2. `.el-checkbox-button` 的选中态是 `.is-checked .el-checkbox-button__inner`，
 *    **不**依赖兄弟节点 —— 两个组件规则不同，别照抄。
 *
 * 所有类名与层级对着 element-plus@2.13.7 的 `dist/index.css` 核过。
 */

/** `@element-plus/icons-vue` 的 ArrowDown / Clock，原样抄 path，省掉图标组件实例 */
const ICON_ARROW_DOWN = [
  'M831.872 340.864 512 652.672 192.128 340.864a30.59 30.59 0 0 0-42.752 0 29.12 29.12 0 0 0 0 41.6L489.664 714.24a32 32 0 0 0 44.672 0l340.288-331.712a29.12 29.12 0 0 0 0-41.728 30.59 30.59 0 0 0-42.752 0z',
] as const;

const ICON_CLOCK = [
  'M512 896a384 384 0 1 0 0-768 384 384 0 0 0 0 768m0 64a448 448 0 1 1 0-896 448 448 0 0 1 0 896',
  'M480 256a32 32 0 0 1 32 32v256a32 32 0 0 1-64 0V288a32 32 0 0 1 32-32',
  'M480 512h256q32 0 32 32t-32 32H480q-32 0-32-32t32-32',
] as const;

export function escapeHtml(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 尺寸与对齐全交给 `.el-icon`（`width:1em;height:1em;inline-flex`），这里只管 path */
function elIcon(paths: readonly string[], extraClass = ''): string {
  const inner = paths
    .map((d) => `<path fill="currentColor" d="${d}"></path>`)
    .join('');
  return (
    `<i class="el-icon${extraClass ? ` ${extraClass}` : ''}">` +
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${inner}</svg>` +
    `</i>`
  );
}

/**
 * `.el-input__inner` 在真实组件里是 `<input>`。换成 `<span>` 后它仍是
 * `.el-input__wrapper`（inline-flex）的 flex item，会被 blockify，
 * `width:100% / height / line-height` 照旧生效；只有 `::placeholder` 得自己顶上，
 * 用官方占位色变量而不是写死灰色。
 */
function inputInner(text: string, placeholder: string): string {
  return text
    ? `<span class="el-input__inner">${escapeHtml(text)}</span>`
    : `<span class="el-input__inner ep-view-ph">${escapeHtml(placeholder)}</span>`;
}

function asText(value: unknown): string {
  return value == null || value === '' ? '' : String(value);
}

/** ElInput（size=small）的查看态 */
export function epInput(value: unknown, placeholder = ''): string {
  return (
    `<div class="el-input el-input--small"><div class="el-input__wrapper">` +
    inputInner(asText(value), placeholder) +
    `</div></div>`
  );
}

/**
 * ElTimePicker 的查看态。
 *
 * 单值时间选择器渲染成 `.el-date-editor.el-input`（`--timerange` 那类修饰类只属于区间选择），
 * 前缀时钟图标走 `.el-input__prefix > .el-input__prefix-inner`。
 */
export function epTimePicker(value: unknown, placeholder = '选择时间'): string {
  const prefix =
    `<span class="el-input__prefix"><span class="el-input__prefix-inner">` +
    elIcon(ICON_CLOCK) +
    `</span></span>`;
  return (
    `<div class="el-date-editor el-input el-input--small"><div class="el-input__wrapper">` +
    prefix +
    inputInner(asText(value), placeholder) +
    `</div></div>`
  );
}

/** ElRadioGroup + ElRadioButton（size=small）的查看态。`__original-radio` 见文件头坑位 1 */
export function epRadioGroup(
  options: readonly { value: string; label: string }[],
  value: unknown,
): string {
  const items = options
    .map((o) => {
      const active = o.value === value ? ' is-active' : '';
      return (
        `<label class="el-radio-button el-radio-button--small${active}">` +
        `<span class="el-radio-button__original-radio"></span>` +
        `<span class="el-radio-button__inner">${escapeHtml(o.label)}</span>` +
        `</label>`
      );
    })
    .join('');
  return `<div class="el-radio-group">${items}</div>`;
}

/** ElCheckboxGroup + ElCheckboxButton（size=small）的查看态 */
export function epCheckboxGroup(
  options: readonly string[],
  values: readonly string[],
): string {
  const picked = new Set(values);
  const items = options
    .map((o) => {
      const checked = picked.has(o) ? ' is-checked' : '';
      return (
        `<label class="el-checkbox-button el-checkbox-button--small${checked}">` +
        `<span class="el-checkbox-button__original"></span>` +
        `<span class="el-checkbox-button__inner">${escapeHtml(o)}</span>` +
        `</label>`
      );
    })
    .join('');
  return `<div class="el-checkbox-group">${items}</div>`;
}

/** `.el-select` 外壳：wrapper 的边框同样是 inset box-shadow，尾部箭头走 `.el-select__caret` */
function selectShell(selection: string): string {
  return (
    `<div class="el-select el-select--small"><div class="el-select__wrapper">` +
    selection +
    `<div class="el-select__suffix">${elIcon(ICON_ARROW_DOWN, 'el-select__caret')}</div>` +
    `</div></div>`
  );
}

/**
 * 真实组件里选中项那个 div 同时挂 `__selected-item` 和 `__placeholder`
 * （后者是 absolute，流式空间由旁边的 `__input-wrapper` 占）。这里没有 input，
 * 高度靠 `.el-select--small .el-select__wrapper { min-height: 24px }` 撑住。
 */
function selectPlaceholder(text: string, transparent: boolean): string {
  const cls =
    'el-select__selected-item el-select__placeholder' +
    (transparent ? ' is-transparent' : '');
  return (
    `<div class="el-select__selection">` +
    `<div class="${cls}"><span>${escapeHtml(text)}</span></div>` +
    `</div>`
  );
}

/** ElSelect 单选的查看态 */
export function epSelectText(label: string, placeholder = '请选择'): string {
  return selectShell(selectPlaceholder(label || placeholder, !label));
}

/**
 * ElSelect 多选 + `collapse-tags` 的查看态。
 *
 * `maxCollapseTags` 跟着 ElSelect 的默认值 **1**。旧的手写版本 `slice(0, 2)` 显示两个 tag，
 * 一激活就变成一个 + `+N` —— 这正是「两态各写一份」最典型的漂移。
 *
 * tag 不需要写 effect 类：`light` 是默认（CSS 里没有 `el-tag--light`），
 * 而 `.el-select__selection .el-tag { border-color: transparent }` 由父级层级自动命中。
 */
export function epSelectTags(
  labels: readonly string[],
  placeholder = '请选择',
  maxCollapseTags = 1,
): string {
  if (labels.length === 0) return selectShell(selectPlaceholder(placeholder, true));

  const tag = (text: string) =>
    `<div class="el-select__selected-item">` +
    `<span class="el-tag el-tag--info el-tag--small">` +
    `<span class="el-tag__content">${escapeHtml(text)}</span>` +
    `</span></div>`;

  const visible = labels.slice(0, maxCollapseTags);
  const rest = labels.length - visible.length;
  const tags = visible.map(tag).join('') + (rest > 0 ? tag(`+ ${rest}`) : '');
  return selectShell(`<div class="el-select__selection">${tags}</div>`);
}
