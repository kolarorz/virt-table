/**
 * 桩生效时在**界面上**留一条可见提示。
 *
 * ## 为什么光 warn 不够
 *
 * 四个桩原来各自 `console.warn` 一次就完事。代价是：一个 `VT_PRO=off` 档构建出来的站，
 * 电子表格案例里没有浮动图片、没有公式、Ctrl+Z 没反应，而页面正文照旧写着「试试拖动
 * 那张图」—— **看起来就是站坏了**，而不是「这里的付费能力没装」。
 *
 * 这正是 `docs/apps/vanilla/vite.config.ts` 与 `check-pro-leak.mjs` 都在防的那类事故：
 * 「本该带付费能力却发成桩档」的站点没有任何外部症状。构建日志里那一行只有构建的人看得到，
 * 而看站的人看不到。所以这里补一条**看站的人也能看到**的信号。
 *
 * ## 形态：视口左下角一条固定提示
 *
 * 刻意**不往 `ctx.rootEl` 里插 DOM** —— 那是核心自己管的子树（行、列、浮层都按它的几何算），
 * 往里塞东西就得考虑会不会被当成一行、会不会吃掉指针事件。挂在 `document.body` 上的固定
 * 元素与表格完全无关，最坏情况只是遮住一角。
 *
 * 多个桩合并进**同一条**提示（页面上可能同时装着四个），与真包那枚许可角标同样的做法。
 */

/** 已经报过的桩插件名，合并进同一条提示 */
const missing = new Set<string>();
let el: HTMLElement | null = null;

/** 桩插件在 `setup` 里调一次。同一个插件重复调只算一次 */
export function stubNotice(pluginName: string): void {
  if (missing.has(pluginName)) return;
  missing.add(pluginName);

  console.warn(
    `[${pluginName}] 这是桩：对应的付费包不在本仓库里。` +
      '\n把 virt-table-pro clone 到同级目录（或设 VT_PRO_DIR）后跑 pnpm pro:build，重启 dev server 即可看到真插件。' +
      '\n只想构建一个不含付费能力的站点：VT_PRO=off pnpm build:docs（本提示即为该档的界面信号）',
  );

  // SSR / 单测环境没有 document，只保留 console 那一份
  if (typeof document === 'undefined') return;

  if (!el) {
    el = document.createElement('div');
    el.setAttribute('aria-live', 'polite');
    // 内联样式而不是 class：桩目录不参与任何 CSS 构建，加一个 .css 文件只为这条提示不值当
    el.style.cssText = [
      'position:fixed',
      'left:12px',
      'bottom:12px',
      'z-index:2147483000',
      'max-width:min(420px, calc(100vw - 24px))',
      'padding:8px 12px',
      'border:1px solid #d97706',
      'border-radius:8px',
      'background:#fffbeb',
      'color:#7c2d12',
      'font:12px/1.6 var(--vt-font-family, system-ui, sans-serif)',
      'box-shadow:0 2px 10px rgb(0 0 0 / 12%)',
      'pointer-events:none',
    ].join(';');
    document.body.appendChild(el);
  }

  const names = [...missing].join(' · ');
  el.textContent = `本页的付费能力未装载（${names}）—— 演示为桩，功能不可用。完整能力见「企业版」。`;
}
