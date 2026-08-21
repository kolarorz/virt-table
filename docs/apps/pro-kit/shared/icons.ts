/**
 * demo 壳里用到的小图标，**三端共用一份**。
 *
 * ## 为什么不用 Unicode 字符
 *
 * 撤销 / 重做原来写的是 `↶` / `↷`（U+21B6 / U+21B7）。那两个字符在多数系统字体里是**极细的
 * 发丝线**、基线还偏上，与旁边 13px 的中文按钮文字放在一起明显不是一套东西 —— 而且不同
 * 平台字体差异极大（Windows 上直接换成另一种笔形，某些字体里根本缺字变成豆腐块）。
 *
 * 所以走**内联 SVG**：`stroke="currentColor"` + `1em` 尺寸，于是颜色跟着按钮文字走
 * （包括 `:disabled` 变灰）、大小跟着字号走、暗色主题自动跟随，与核心组件里那批图标
 * （箭头、对勾）同一套画法。
 *
 * ## 为什么导出的是 path 而不是整段 svg
 *
 * 三端的模板机制不同：React 直接写 JSX、Vue 写模板、vanilla 拼字符串。**path 才是设计**，
 * 外壳只有三行，各端自己写反而比 `v-html` / `dangerouslySetInnerHTML` 干净。
 * 需要 HTML 字符串的那一端（vanilla）用下面的 `iconHtml()`。
 */

/** 图标外壳的公共属性（三端各自写 `<svg>` 时照抄） */
export const ICON_SVG_ATTRS = {
  viewBox: '0 0 24 24',
  width: '1em',
  height: '1em',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/**
 * 撤销：一支往左的箭头 + 一段回卷的弧。
 *
 * 两段 path 而不是一段：箭头是折线、弧是圆弧，合成一段的话 `stroke-linejoin` 会在
 * 交接处拐出一个尖角。
 */
export const UNDO_PATHS = ['M9 14 4 9l5-5', 'M4 9h11a5 5 0 0 1 0 10h-4'];

/** 重做：撤销的镜像（沿 x = 12 翻） */
export const REDO_PATHS = ['M15 14l5-5-5-5', 'M20 9H9a5 5 0 0 0 0 10h4'];

/** 拼成 HTML 字符串（vanilla 端的 `innerHTML` 用） */
export function iconHtml(paths: string[]): string {
  const attrs =
    `viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" ` +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
  return `<svg ${attrs}>${paths.map((d) => `<path d="${d}"/>`).join('')}</svg>`;
}

/**
 * 给按钮换成「图标 + 文字」。
 *
 * 图标与文字之间的间距由 `.pg-btn` 的 `gap` 给（见 shell.css）—— 不用 `&nbsp;` 之类的
 * 假间距：那种写法在按钮 `disabled` 变灰时会跟着一起淡，间距看着还会变。
 */
export function setIconLabel(btn: HTMLElement, paths: string[], label: string): void {
  btn.innerHTML = iconHtml(paths);
  btn.appendChild(document.createTextNode(label));
}
