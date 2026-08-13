/**
 * **JS 写出的 class ↔ CSS 里的选择器** 这条契约。
 *
 * 为什么需要它：class 名是这个仓库里**唯一没人守的跨文件引用**。
 * TS 里 `el.className = 'vt-foo'` 与 CSS 里 `.vt-foo { … }` 之间没有任何编译期联系 ——
 * 改错、改一半、或者留下一个没人消费的死类名，全都**静默通过**：不报错、不红、
 * 只是样式没了或多了一行骗人的代码。
 *
 * 这与标识符改名的处境正好相反：`renderEdit → renderEditor` 那次敢一次改 272 处，
 * 是因为漏一处就 tsc 报错。CSS 那边没有这个保障，所以「要不要顺带把 class 也改名」
 * 的答案一直是「不敢」。这个文件就是把「不敢」的根因消掉：有了它，class 名也变成
 * 「漏一处就红」。
 *
 * ---- 扫描规则 ----
 *
 * 只扫**静态字面量**：`'vt-foo'` / `'vt-a vt-b'` / 模板串里的固定片段。动态拼接的
 * （`vt-td--${col.type}`、`vt-tr--group-lv${n}`）扫不到，也不该扫 —— 那些的正确性
 * 由生成它们的那份枚举保证（`col.type` 的取值就是 CSS 里那几条规则）。
 *
 * 两个必要的降噪，都是实测踩出来的（第一版扫描 8 个「缺失」里有 4 个是这两类假阳性）：
 *   1. **先剥注释**：注释里讲历史结构时会写 `` `.vt-skeleton` ``（那是已删除的旧元素）
 *   2. **跳过含 `/` 的字面量**：`from './vt-cascader'` 这种模块路径会被拆出 `vt-cascader`
 *
 * ---- 只做单向 ----
 *
 * 只查「JS 用到但 CSS 没有」，不查反向（「CSS 有但 JS 没用」）。因为反向大量合法：
 * `.vt-root--dark` / `.vt-compact` / `.vt-loose` 这些是**给使用方加在容器上的**，
 * 核心代码永远不会写它们。反向扫描会变成一张长期需要维护的例外清单，收益远低于噪音。
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('.', import.meta.url));

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(SRC);
/** 产品代码（测试本身不算：测试里会为了造场景手写 class） */
const tsFiles = files.filter((f) => /\.ts$/.test(f) && !/\.test(-d)?\.ts$/.test(f));
/** 全部样式：核心 + plugins/* + components/*（class 可能定义在任一处） */
const cssText = files
  .filter((f) => f.endsWith('.css'))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

/** 剥掉块注释与行注释，避免把注释里提到的历史 class 当成在用 */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * 没有对应 CSS 选择器、但**刻意如此**的 class。
 *
 * 判定标准：它不是外观的载体，只是一个「抓手」——
 * 要么与一个已有样式的基类成对出现，要么纯粹给查询/使用方覆盖用。
 * 新增条目必须写清理由，否则这份白名单会退化成「把红的都加进来」。
 */
const ALLOWLIST: Record<string, string> = {
  'vt-tbody': '<tbody> 不需要样式；这个类是给查询/事件委托定位用的抓手',
  'vt-pagination-prev':
    '与已有样式的 .vt-pagination-btn 成对出现，只用于单独定位上一页按钮',
  'vt-pagination-next': '同上，下一页按钮',
  'vt-comp-link-panel':
    '作为 createPopup 的额外 className 传入，面板皮肤来自 .vt-comp-popup；这个类只是给使用方单独覆盖链接面板的抓手',
};

/** 收集产品代码里出现的静态 `vt-*` class 字面量 → 首次出现的文件 */
function collectUsedClasses(): Map<string, string> {
  const used = new Map<string, string>();
  for (const file of tsFiles) {
    const src = stripComments(readFileSync(file, 'utf8'));
    // 单引号 / 双引号 / 反引号里的单行内容
    for (const m of src.matchAll(/['"`]([^'"`\n]*)['"`]/g)) {
      const literal = m[1]!;
      if (literal.includes('/')) continue; // 模块路径 / URL
      // 一个字面量里可能有多个 class（`'vt-a vt-b'`），也可能是选择器片段（`.vt-a > .vt-b`）
      for (const token of literal.split(/[\s.>+~,]+/)) {
        if (/^vt-[a-z0-9-]+$/.test(token) && !used.has(token)) {
          used.set(token, file.slice(SRC.length));
        }
      }
    }
  }
  return used;
}

const used = collectUsedClasses();

describe('class 契约：JS 写出的每个 class 都要有 CSS 选择器', () => {
  it('扫到的静态 class 数量在合理量级（扫描器本身没坏）', () => {
    // 这条守的是扫描器：正则被改坏时 used 会突然变成 0 或 1，
    // 其余用例会全部「通过」，等于静默失效。
    expect(used.size).toBeGreaterThan(100);
  });

  it('没有孤立的 class（要么 CSS 里有规则，要么在白名单里并写明理由）', () => {
    const orphans = [...used]
      .filter(([cls]) => !cssText.includes(`.${cls}`) && !(cls in ALLOWLIST))
      .map(([cls, file]) => `${cls}（${file}）`);
    expect(
      orphans,
      '这些 class 被 JS 写进 DOM 但 CSS 里没有任何规则消费 —— ' +
        '要么是改名漏了一侧，要么是死类名。若确实只是抓手，加进 ALLOWLIST 并写理由。',
    ).toEqual([]);
  });

  it('白名单本身不过期：里面的 class 必须仍被 JS 使用，且仍然没有 CSS 规则', () => {
    for (const [cls, reason] of Object.entries(ALLOWLIST)) {
      expect(used.has(cls), `${cls} 已经不再被 JS 使用，从 ALLOWLIST 删掉`).toBe(true);
      expect(
        cssText.includes(`.${cls}`),
        `${cls} 现在有 CSS 规则了，从 ALLOWLIST 删掉（理由曾是：${reason}）`,
      ).toBe(false);
    }
  });

  /**
   * 单元格高亮走覆盖层，不走祖先类门控。曾经有过一行
   * `vt-client--highlight-select-cell` 而 CSS 里没人消费它 —— 这条把它钉住。
   */
  it('三个 highlight 修饰类都有 CSS 规则，且没有第四个', () => {
    const modifiers = [...used].map(([c]) => c).filter((c) => c.startsWith('vt-client--'));
    expect(modifiers.sort()).toEqual([
      'vt-client--highlight-hover-row',
      'vt-client--highlight-select-col',
      'vt-client--highlight-select-row',
    ]);
    for (const m of modifiers) expect(cssText).toContain(`.${m}`);
    expect(cssText).toContain('.vt-active-cell-overlay');
  });
});
