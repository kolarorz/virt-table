/**
 * **文档站样式 ↔ demo DOM** 这条隔离契约。
 *
 * 为什么需要它：demo 是 qiankun **同文档挂载**的（`components/PlaygroundHost.vue` 里
 * `start({ sandbox: true })`，既没有 shadow DOM 也没有选择器加前缀），而 virt-table
 * 渲染的是**真实的** `<table>/<thead>/<th>/<td>/<tr>`。于是文档站 CSS 里任何裸元素
 * 选择器都会静默命中 demo 内部 —— 没有编译期检查、没有报错，只是 demo 悄悄坏掉。
 *
 * 而且坏法不是"外观微调"，是功能性损坏。以 `.vp-doc table`(0,1,1) 压过
 * `.vt-table`(0,1,0) 为例：
 *   · `display: block` 顶掉 `display: table` → colgroup 列宽体系与固定列 sticky 参照系一起崩
 *   · `padding: 8px 16px` 顶掉 `--vt-cell-padding-*`(9px/14px) → 行高与虚拟滚动的账本
 *     `estimatedSize` 脱钩 → 滚动偏移漂移、表头错位
 *   · `tr:nth-child(2n)` 按 **DOM 下标**画斑马纹，而虚拟滚动下 DOM 下标 ≠ 逻辑行号
 *     → 条纹随滚动跳动闪烁
 *
 * 首页（`docs/index.md`）也在这条契约的适用范围内：hero 里嵌的是真实 VirtTable 实例
 * （`components/home/HomeLiveTable.vue`），因此 `home.css` 与其余样式同样禁写表格元素
 * 选择器。首页靠 frontmatter 的 `markdownStyles: false` 摘掉 `.vp-doc`。
 *
 * 这个文件把上面这些「静默」变成「漏一处就红」。四条断言：
 *   1. 除 doc-table.css 外的样式文件里**不得出现任何表格元素选择器**（按目录枚举，
 *      新增 css 自动纳入）—— 表格样式全部归 doc-table.css 的 `.vtd-table` 管
 *   2. `[data-vp-example]`（示例页正文容器）下的裸元素规则必须带 `:not(.playground-shell *)`
 *   3. doc-table.css 的每条选择器都必须以 `.vtd-table` 开头
 *   4. md 里不得在代码围栏外手写 `<table` —— 那种表格拿不到 markdown.config 注入的
 *      `.vtd-table`，会静默失样
 *
 * ---- 为什么第 2 条只管 `[data-vp-example]`，不管 `.vp-doc` ----
 *
 * `Layout.vue` 会在**嵌 demo 的路径**下把内容容器的 `.vp-doc` 摘掉、换成
 * `[data-vp-example]`（目前是 `/examples/` 与 `/ai/`，见那里的 `DEMO_HOSTING_SEGMENTS`）。
 * demo 只出现在这些页，所以 `.vp-doc xxx` 那批规则天然碰不到 demo，不需要排除；
 * 真正生效并越界的是 `[data-vp-example] xxx`。
 *
 * **新增嵌 demo 的路径时必须同步登记到 `DEMO_HOSTING_SEGMENTS`** —— 漏登记的页面会保留
 * `.vp-doc`，而那批规则没有 `:not(.playground-shell *)` 护栏。
 * （表格元素则一律禁止 —— 不给"以后 guide 页也嵌 demo"留坑。）
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const STYLES_DIR = fileURLToPath(new URL('.', import.meta.url));
const DOCS_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** demo 挂载子树的根：PlaygroundHost.vue 的根节点 */
const DEMO_SCOPE = ':not(.playground-shell *)';

/** 示例页正文容器：Layout.vue 在 /examples/ 下用它替换 .vp-doc */
const EXAMPLE_MARKER = '[data-vp-example]';

const TABLE_ELEMENTS = ['table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td'];

/**
 * 全局/结构性元素，不属于"文档正文排版"，不要求 demo 排除。
 * 给它们加 `:not(.playground-shell *)` 反而是错的（overscroll、字体平滑等就是要全局生效）。
 */
const GLOBAL_ELEMENTS = ['html', 'body', ':root', '*'];

const read = (file: string) => readFileSync(join(STYLES_DIR, file), 'utf-8');

/**
 * 受「禁止表格元素选择器」约束的样式文件 —— **按目录枚举，不写死清单**。
 *
 * 这样新增一份样式（home.css 就是这么进来的）自动被守住，不需要有人记得回来登记。
 * `doc-table.css` 单独排除：它是文档表格样式的唯一去处，本来就该写 `th` / `td`，
 * 由下面第 3 条断言约束它必须挂在 `.vtd-table` 作用域内。
 */
const SCANNED_FILES = readdirSync(STYLES_DIR)
  .filter((f) => f.endsWith('.css') && f !== 'doc-table.css')
  .sort();

/** 剥掉 CSS 注释——注释里会写 `.vp-doc table` 讲历史，扫进去就是假阳性 */
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * 抽出所有规则的选择器（逗号拆开后的单个 item）。
 * `@media` / `@supports` 的块头以 `@` 开头，keyframes 的关键帧是 `50%` / `from` / `to`，
 * 都不是选择器，滤掉。
 */
function extractSelectors(css: string): string[] {
  const out: string[] = [];
  for (const match of stripComments(css).matchAll(/([^{}]+)\{/g)) {
    const head = match[1].trim();
    if (!head || head.startsWith('@')) continue;
    for (const item of head.split(',')) {
      const sel = item.trim().replace(/\s+/g, ' ');
      if (!sel || /^\d+%$/.test(sel) || sel === 'from' || sel === 'to') continue;
      out.push(sel);
    }
  }
  return out;
}

/** 挖空 `:not(...)` / `:is(...)` / `:where(...)` 的括号内容，避免干扰 compound 拆分 */
const hollowFunctionalPseudos = (sel: string) =>
  sel.replace(/:(?:not|is|where|has)\([^()]*\)/g, ':__fn__');

/** 拆成 compound 序列（按后代 / > / + / ~ 切） */
const toCompounds = (sel: string) =>
  hollowFunctionalPseudos(sel)
    .split(/\s*[>+~]\s*|\s+/)
    .filter(Boolean);

/** compound 剥掉伪类/伪元素后剩下的元素名；带 class/id/attr 限定则返回 null */
function bareElementOf(compound: string): string | null {
  const base = compound.replace(/::?[a-zA-Z-]+(?::__fn__)?/g, '').replace(/:__fn__/g, '');
  if (!base) return null;
  if (/[.#[]/.test(base)) return null;
  return /^[a-z][a-z0-9]*$/.test(base) ? base : null;
}

/** item 里除页面级容器外，是否还有 class / id / 属性限定 */
function hasOwnQualifier(sel: string): boolean {
  const rest = hollowFunctionalPseudos(sel).split(EXAMPLE_MARKER).join(' ');
  return /[.#[]/.test(rest);
}

describe('文档站样式与 demo 的隔离契约', () => {
  it('除 doc-table.css 外的样式文件不得出现任何表格元素选择器', () => {
    const offenders: string[] = [];

    for (const file of SCANNED_FILES) {
      for (const sel of extractSelectors(read(file))) {
        const hit = toCompounds(sel)
          .map(bareElementOf)
          .filter((el): el is string => el !== null && TABLE_ELEMENTS.includes(el));
        if (hit.length) offenders.push(`${file}: ${sel}  →  裸 ${[...new Set(hit)].join(' / ')}`);
      }
    }

    expect(
      offenders,
      `表格样式必须留在 doc-table.css 的 .vtd-table 作用域里。\n` +
        `这里出现表格元素选择器意味着它会命中 demo 里 virt-table 的真实 <table>：\n` +
        offenders.join('\n'),
    ).toEqual([]);
  });

  it('[data-vp-example] 下的裸元素规则必须排除 demo 子树', () => {
    const offenders: string[] = [];

    for (const file of SCANNED_FILES) {
      for (const sel of extractSelectors(read(file))) {
        if (!sel.includes(EXAMPLE_MARKER)) continue;
        if (sel.includes(DEMO_SCOPE)) continue;
        // 有自己的 class/attr 限定（如 `[class*='language-'] pre`）就够精确，不会碰到 demo
        if (hasOwnQualifier(sel)) continue;

        const bare = toCompounds(sel)
          .map(bareElementOf)
          .filter((el): el is string => el !== null && !GLOBAL_ELEMENTS.includes(el));
        if (bare.length) offenders.push(`${file}: ${sel}  →  裸 ${[...new Set(bare)].join(' / ')}`);
      }
    }

    expect(
      offenders,
      `示例页正文样式越界进了 demo。给这些选择器补上 ${DEMO_SCOPE}：\n` + offenders.join('\n'),
    ).toEqual([]);
  });

  it('doc-table.css 的每条选择器都在 .vtd-table 作用域内', () => {
    const offenders = extractSelectors(read('doc-table.css')).filter(
      (sel) => !sel.startsWith('.vtd-table'),
    );

    expect(
      offenders,
      '文档表格样式只能挂在 .vtd-table 上，否则会命中 demo 的表格：\n' + offenders.join('\n'),
    ).toEqual([]);
  });

  it('md 里不得在代码围栏外手写 <table>', () => {
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name === '.vitepress' || name === 'dist') continue;
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (name.endsWith('.md')) check(p);
      }
    };

    const check = (file: string) => {
      let inFence = false;
      readFileSync(file, 'utf-8')
        .split('\n')
        .forEach((line, i) => {
          if (/^\s*(```|~~~)/.test(line)) {
            inFence = !inFence;
            return;
          }
          if (inFence) return;
          // 行内代码里的 `<table>` 是在讲实现（decisions.md / pinned.md 里大量出现），
          // 不是真的 HTML 标签，剥掉再查
          if (/<table[\s>]/.test(line.replace(/`[^`]*`/g, ''))) {
            offenders.push(`${file.slice(DOCS_ROOT.length)}:${i + 1}: ${line.trim()}`);
          }
        });
    };

    walk(DOCS_ROOT);

    expect(
      offenders,
      '手写 HTML 表格拿不到 markdown.config 注入的 .vtd-table，会完全失样。\n' +
        '要么改成 Markdown 表格语法，要么自己写 class="vtd-table"：\n' +
        offenders.join('\n'),
    ).toEqual([]);
  });
});
