/**
 * `index.css` 的静态契约。两类，都只看 CSS 文本、不需要浏览器：
 *   1. 设计令牌的算术不变量（行高等式）
 *   2. 选择器特异度关系（斑马纹抹平不能压过状态高亮）
 *
 * 放同一个文件是因为它们的验证手段一样：解析 CSS 文本。真实布局与级联结果测不了
 * （happy-dom 没有布局引擎），那部分靠 CDP 实测，结论记在 AGENTS.md。
 *
 * ---- 1. 设计令牌的算术不变量 ----
 *
 * 唯一要守的等式：**行高 + 上下内边距 + 1px 下边框 = 该密度声称的行高**，
 * 而后者就是使用方要传给 `estimatedSize` 的数。
 *
 * 为什么值得单独测：`fixedSize: true` 模式按 `estimatedSize` 建立滚动几何，模型只要比实际
 * 矮哪怕 0.69px/行，十万行量级下 `scrollTop` 就能超出模型总高，而 `@virt-list/core` 的
 * `_calcRange()` 越界后不 clamp、原地不动 —— 窗口永久冻结、下方留几百万 px 空白。
 * 这个 bug 曾经真的在的（行高是 40.69px），起因只是 `--vt-line-height` 写成了无单位比例。
 * 详见 AGENTS.md §7.11。
 *
 * 真实布局高度测不了（happy-dom 没有布局引擎，得走 CDP），但令牌算术是纯数字，
 * 谁动了 padding / line-height 这里立刻会红。
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('./index.css', import.meta.url)), 'utf8');

/** 取某个选择器块里声明的自定义属性（只看块内第一次出现） */
function tokensOf(selectorHead: string): Record<string, string> {
  const start = css.indexOf(selectorHead);
  if (start < 0) throw new Error(`选择器块没找到：${selectorHead}`);
  const open = css.indexOf('{', start);
  const end = css.indexOf('\n}', open);
  const body = css.slice(open, end);
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    if (!(m[1] in out)) out[m[1]] = m[2].trim();
  }
  return out;
}

const px = (v: string): number => {
  const n = Number.parseFloat(v);
  if (!/px\s*$/.test(v) || Number.isNaN(n)) throw new Error(`不是 px 值：${v}`);
  return n;
};

const base = tokensOf('.vt-root,\n.vt-fb {');
const compact = tokensOf('.vt-root--compact,\n.vt-compact {');
const loose = tokensOf('.vt-root--loose,\n.vt-loose {');

/** 从 `var(--vt-density-x, 21px)` 里取兜底值 */
const fallbackOf = (decl: string): string => {
  const m = decl.match(/var\([^,]+,\s*([^)]+)\)\s*$/);
  return (m ? m[1] : decl).trim();
};

/**
 * 取某密度下该 token 的实际值。
 *
 * 密度块设的是 `--vt-density-*`（见 index.css 里那段注释：直接改 `--vt-cell-padding-y`
 * 会因为「元素自己声明的值胜过继承」而让外层容器上的 `.vt-compact` 失效），
 * 所以这里要先查 density 变量，缺了才回落到 base 声明里的兜底值。
 */
const resolve = (block: Record<string, string>, key: string): string => {
  const densityKey = key.replace('--vt-', '--vt-density-');
  return block[densityKey] ?? fallbackOf(base[key]!);
};

const rowHeight = (block: Record<string, string>): number =>
  px(resolve(block, '--vt-line-height')) +
  px(resolve(block, '--vt-cell-padding-y')) * 2 +
  px(resolve(block, '--vt-border-width'));

describe('设计令牌：行高几何', () => {
  it('--vt-line-height 必须是 px，不能是无单位比例', () => {
    // 无单位比例 × 字号几乎必然算出小数（14 × 1.55 = 21.7），行高就对不上 estimatedSize
    expect(() => px(resolve(base, '--vt-line-height'))).not.toThrow();
    expect(resolve(base, '--vt-line-height')).toMatch(/^\d+(\.\d+)?px$/);
  });

  it.each([
    { name: '默认', block: base, expected: 40 },
    { name: '紧凑 .vt-compact', block: compact, expected: 30 },
    { name: '宽松 .vt-loose', block: loose, expected: 50 },
  ])('$name 密度的行高等式凑成整数 $expected（= 该密度要传的 estimatedSize）', ({ block, expected }) => {
    expect(rowHeight(block)).toBe(expected);
  });

  it('三种密度的行高都是整数（亚像素会累积成滚动几何误差）', () => {
    for (const block of [base, compact, loose]) {
      expect(Number.isInteger(rowHeight(block))).toBe(true);
    }
  });

  it('密度变体只覆盖内边距与字号相关令牌，不碰边框宽度', () => {
    // 边框宽度变了行高等式就得重算，属于要显式改这个测试的改动
    expect(compact['--vt-border-width']).toBeUndefined();
    expect(loose['--vt-border-width']).toBeUndefined();
    expect(base['--vt-border-width']).toBe('1px');
  });

  /**
   * 这条守的是一个真踩过的坑：密度块曾经直接声明 `--vt-cell-padding-y` 等 token，
   * 而 `.vt-root` 自己也声明同名 token —— CSS 变量里「元素自己声明的值胜过继承」，
   * 于是把 `.vt-compact` 加在**外层容器**上完全无效（实测父元素 19px、root 仍 21px、
   * 行高照旧 40）。改走 `--vt-density-*` 间接层才三种用法都成立。
   */
  it('密度块只设 --vt-density-*，不直接改最终 token', () => {
    for (const [name, block] of [['紧凑', compact], ['宽松', loose]] as const) {
      const direct = Object.keys(block).filter(
        (k) => !k.startsWith('--vt-density-'),
      );
      expect(direct, `${name}密度块里这些声明会挡住外层容器的密度类`).toEqual([]);
    }
  });

  /**
   * `cellType` 的内容元素（标签 / 图片 / 布尔）不能比行内容区高，否则把行撑高、
   * `estimatedSize` 立刻对不上。踩过：`.vt-cell-option` 第一版用 padding + line-height
   * 自然撑高，算出 22~23px，demo 实测行高从 40 变 42。
   */
  it('cellType 的内容元素高度都锁在 --vt-line-height 上', () => {
    for (const sel of ['.vt-cell-image', '.vt-cell-option', '.vt-cell-bool']) {
      const i = css.indexOf(sel + ' {');
      expect(i, `${sel} 规则没找到`).toBeGreaterThan(-1);
      const body = css.slice(i, css.indexOf('\n}', i));
      const prop = sel === '.vt-cell-image' ? 'max-height' : 'height';
      expect(body, `${sel} 应把 ${prop} 锁在行高上`).toMatch(
        new RegExp(`${prop}:\\s*var\\(--vt-(line-height|cell-image-max-h)`),
      );
    }
    // 图片那个变量本身也要指向 line-height
    const base2 = tokensOf('.vt-root,\n.vt-fb {');
    expect(base2['--vt-cell-image-max-h']).toBe('var(--vt-line-height)');
  });

  it('base 块里的密度 token 都经过 --vt-density-* 间接层（否则外层密度类失效）', () => {
    for (const key of [
      '--vt-line-height',
      '--vt-font-size',
      '--vt-cell-padding-y',
      '--vt-cell-padding-x',
      '--vt-header-padding-y',
    ]) {
      expect(base[key], key).toMatch(/^var\(--vt-density-[\w-]+,/);
    }
  });
});

/**
 * 上面那条抹平规则的**特异度**同样是契约，而且比选择器本身更容易被误改。
 *
 * 它必须严格低于（或等于并靠顺序压过）hover / 选中行这些状态类高亮 —— 否则合并格会
 * 吃掉交互反馈。实测踩过一次：裸写 `[rowspan]:not([rowspan='1'])` 是 (0,5,0)，压过了
 * hover 的 (0,4,0)，结果合并格「落在非斑马行时能 hover 变色、落在斑马行时不能」。
 * 修法是套 `:where()`（参数不计特异度）。这里直接从 CSS 文本算特异度来守住它。
 */
describe('斑马纹：抹平规则不能压过状态高亮', () => {
  const cssText = readFileSync(
    fileURLToPath(new URL('./index.css', import.meta.url)),
    'utf8',
  );

  /** 够用的特异度计算：返回 [id, 类/属性/伪类, 元素]；`:where()` 的参数不计 */
  function specificity(sel: string): [number, number, number] {
    const s = sel.replace(/:where\([^)]*\)/g, '');
    const ids = (s.match(/#[\w-]+/g) ?? []).length;
    const classes =
      (s.match(/\.[\w-]+/g) ?? []).length +
      (s.match(/\[[^\]]*\]/g) ?? []).length +
      (s.match(/(?<!:):(?!:)[\w-]+/g) ?? []).length; // 伪类，排除 ::伪元素
    const elements = (s.match(/(?:^|[\s>+~])([a-z]+)(?![\w-([])/g) ?? []).length;
    return [ids, classes, elements];
  }

  /** 在 CSS 里找到包含某片段的那条选择器 */
  function selectorContaining(needle: string): string {
    const line = cssText
      .split('\n')
      .find((l) => l.includes(needle) && l.trimEnd().endsWith('{'));
    if (!line) throw new Error(`CSS 里没找到含 "${needle}" 的选择器`);
    return line.replace(/\s*\{$/, '').trim();
  }

  const cmp = (a: number[], b: number[]) =>
    a[0]! - b[0]! || a[1]! - b[1]! || a[2]! - b[2]!;

  it('抹平规则的特异度不高于 hover 行高亮', () => {
    const flatten = specificity(selectorContaining(`.vt-td:where([rowspan]`));
    const hover = specificity(selectorContaining('.vt-tr:hover > .vt-td'));
    expect(cmp(flatten, hover)).toBeLessThanOrEqual(0);
  });

  it('抹平规则的特异度不高于选中行高亮', () => {
    const flatten = specificity(selectorContaining(`.vt-td:where([rowspan]`));
    const selected = specificity(selectorContaining('.current-row > .vt-td'));
    expect(cmp(flatten, selected)).toBeLessThanOrEqual(0);
  });

  it('抹平规则写在基础斑马纹规则之后（同级靠顺序取胜）', () => {
    const base = specificity('.vt-tr.is-striped > .vt-td');
    const flatten = specificity(selectorContaining(`.vt-td:where([rowspan]`));
    expect(cmp(flatten, base)).toBe(0); // 同级
    expect(cssText.indexOf(`.vt-td:where([rowspan]`)).toBeGreaterThan(
      cssText.indexOf('.vt-tr.is-striped > .vt-td,'),
    );
  });
});
