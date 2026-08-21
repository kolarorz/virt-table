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
 * 它必须严格低于（或等于并靠顺序压过）hover / 选中行这些状态类高亮。实测踩过一次：
 * 裸写 `[rowspan]:not([rowspan='1'])` 是 (0,5,0)，压过了 hover 的 (0,4,0)，结果合并格
 * 「落在非斑马行时能 hover 变色、落在斑马行时不能」。修法是套 `:where()`（参数不计
 * 特异度）。这里直接从 CSS 文本算特异度来守住它。
 *
 * ⚠️ 前提变过一次：行级状态高亮现在自己就排除了跨行合并格（见下一个 describe），
 * 两边作用域互斥，这条关系于是降级成**保险** —— 万一有人去掉那边的排除，斑马行与
 * 非斑马行的 hover 也不会再分裂成两种表现。所以它继续守着，别因为「现在看不出后果」
 * 就删掉。
 */
describe('斑马纹：抹平规则不能压过状态高亮', () => {
  const cssText = readFileSync(
    fileURLToPath(new URL('./index.css', import.meta.url)),
    'utf8',
  );

  /**
   * 剥掉整段 `:where(...)`，**按括号配平**而不是正则。
   *
   * 正则 `:where\([^)]*\)` 在嵌套括号上会剥一半：`:where(:not([rowspan]), [rowspan='1'])`
   * 停在 `:not(` 的右括号处，剩下的 `, [rowspan='1'])` 又被当成一个属性选择器计入，
   * 特异度凭空 +1（实测 (0,4,0) 被算成 (0,5,0)）。
   */
  function stripWhere(sel: string): string {
    let out = '';
    for (let i = 0; i < sel.length; ) {
      if (!sel.startsWith(':where(', i)) {
        out += sel[i++];
        continue;
      }
      i += ':where('.length - 1; // 停在 '(' 上，交给下面配平
      for (let depth = 0; i < sel.length; i++) {
        if (sel[i] === '(') depth += 1;
        else if (sel[i] === ')') {
          depth -= 1;
          if (depth === 0) {
            i += 1;
            break;
          }
        }
      }
    }
    return out;
  }

  /** 够用的特异度计算：返回 [id, 类/属性/伪类, 元素]；`:where()` 的参数不计 */
  function specificity(sel: string): [number, number, number] {
    const s = stripWhere(sel);
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

  /**
   * 行级状态高亮不落在跨行合并格上。
   *
   * 理由写在 index.css 那条规则的注释里（对不齐 + 长段重锚闪烁）。这里守两件事：
   * 排除片段还在，以及 `[rowspan='1']` 那一半还在 —— 后者是真正容易被「简化」掉的：
   * 只写 `:not([rowspan])` 会把整表的高亮误杀，因为 DOM 池复用会在非合并格上反射出
   * `rowspan="1"`（一屏 34 个，`merge.dom.test.ts` 守着那个 DOM 契约）。
   */
  describe('行级状态高亮：排除跨行合并格', () => {
    const EXCLUDE = `:where(:not([rowspan]), [rowspan='1'])`;

    for (const [name, needle] of [
      ['hover 行', '.vt-tr:hover > .vt-td'],
      ['选中行', '.current-row > .vt-td'],
    ] as const) {
      it(`${name}高亮排除 rowspan>1 的格子`, () => {
        expect(selectorContaining(needle)).toContain(EXCLUDE);
      });
    }

    it('排除片段仍列上 [rowspan=\'1\']（否则整表高亮被误杀）', () => {
      for (const needle of ['.vt-tr:hover > .vt-td', '.current-row > .vt-td']) {
        expect(selectorContaining(needle)).toContain(`[rowspan='1']`);
      }
    });

    /**
     * 不写死数字（hover 那条带 `:hover` 是 (0,4,0)，选中行那条是 (0,3,0)），
     * 直接比「带排除片段」与「抠掉排除片段」两者相等 —— 这才是 `:where()` 的作用，
     * 也是斑马纹抹平规则那三条断言赖以成立的前提。
     */
    it('排除片段不改变特异度（:where 的参数不计）', () => {
      for (const needle of ['.vt-tr:hover > .vt-td', '.current-row > .vt-td']) {
        const sel = selectorContaining(needle);
        expect(specificity(sel)).toEqual(specificity(sel.replace(EXCLUDE, '')));
      }
    });

    /**
     * 选中列按列算，合并格属于那一列，染色本来就对齐 —— 刻意**不**排除。
     * 写成断言是为了让「漏改」和「刻意不改」在代码里可区分。
     */
    it('选中列高亮刻意不排除（按列算，本来就对齐）', () => {
      expect(selectorContaining('.current-column')).not.toContain('rowspan');
    });
  });
});

/**
 * 只读勾选框（`cellType: 'checkbox'` 渲染的那个，恒带 `disabled`）必须还能看出勾选态。
 *
 * `:disabled` 与 `:checked` 特异度相同 (0,2,0)，`:disabled` 在后 —— 它把底色顶成浅灰，
 * 而勾号是固定白色的 data URI（变量进不去 data URI），于是白勾画在浅灰底上等于隐形。
 * 电子表格案例里所有「已验收」的格子因此看起来都没勾。修法是补一条 `:disabled:checked`
 * (0,3,0) 把主色底还回来；这条断言守住它别被顺序或特异度改动悄悄吃掉。
 */
describe('只读勾选框：禁用态不能吃掉勾选态', () => {
  const cssText = readFileSync(
    fileURLToPath(new URL('./index.css', import.meta.url)),
    'utf8',
  );

  const bodyAfter = (needle: string): string => {
    const i = cssText.indexOf(needle);
    expect(i, `找不到选择器 ${needle}`).toBeGreaterThan(-1);
    const open = cssText.indexOf('{', i);
    return cssText.slice(open, cssText.indexOf('\n}', open));
  };

  it('存在 :disabled:checked 且把底色还成主色', () => {
    expect(bodyAfter('.vt-checkbox:disabled:checked')).toContain(
      'background-color: var(--vt-color-primary)',
    );
  });

  it(':disabled:checked 必须写在 :disabled 之后（同层级靠顺序也说得通）', () => {
    expect(cssText.indexOf('.vt-checkbox:disabled:checked')).toBeGreaterThan(
      cssText.indexOf('.vt-checkbox:disabled,'),
    );
  });
});

/**
 * `.vt-client` 的 `touch-action` 不能放行任何单指平移。
 *
 * 2026-08-14 移动端实测的 bug：竖向滚起来之后**横向完全滚不动**。当时是 `pan-x`
 * （横向交给浏览器原生 pan），两层原因叠在一起：
 *
 * 1. `preventDefault` 没有「只拦一条轴」的粒度 —— 纵向由 `InputController` 接管，
 *    它一拦，同一个手势里的横向分量也一起没了；
 * 2. 浏览器的方向判定**先于** JS：一旦它启动原生 pan-x，后续 `touchmove` 的
 *    `cancelable` 就变成 `false`，`InputController` 的轴锁说了不算，
 *    而它写的那次 `scrollLeft` 还会叠上去 —— 那条轴双倍速。
 *
 * 所以两条轴的触摸手势都归 `InputController`（见 `index.ts` 里传的 `crossEl`），
 * CSS 这边只要守住「别把轴让回浏览器」。谁改回 `pan-x` / `pan-y` / `auto`，这里就红。
 */
describe('滚动视口的 touch-action：两条轴都不让给浏览器', () => {
  /*
   * **剥掉注释**再断言。这些用例大量在查「块里有没有某条声明」，而注释里会为了说明
   * 「为什么不能写某条声明」而提到它（比如分组格那条就写着「不给 z-index」）——
   * 不剥的话一句注释就能让 `not.toMatch(/z-index/)` 误判。
   * class-contract.test.ts 对 CSS 也做了同样的处理，同一个理由。
   */
  const cssText = readFileSync(fileURLToPath(new URL('./index.css', import.meta.url)), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  /** 取任意一个规则块的块体（末尾以 `\n}` 收口，与本文件其它 helper 一致） */
  const bodyOf = (selector: string): string => {
    const i = cssText.indexOf(`\n${selector}`);
    expect(i, `找不到规则块：${selector}`).toBeGreaterThan(-1);
    const open = cssText.indexOf('{', i);
    return cssText.slice(open, cssText.indexOf('\n}', open));
  };

  /** 取 `.vt-client { ... }` 这一个块的块体（末尾以 `\n}` 收口，与本文件其它 helper 一致） */
  const clientBody = (): string => {
    const i = cssText.indexOf('\n.vt-client {');
    expect(i, '找不到 .vt-client 规则块').toBeGreaterThan(-1);
    const open = cssText.indexOf('{', i);
    return cssText.slice(open, cssText.indexOf('\n}', open));
  };

  it('不出现任何 pan-* 或 auto', () => {
    const declarations = clientBody().match(/touch-action\s*:\s*([^;]+);/g) ?? [];
    expect(declarations.length).toBeGreaterThan(0);
    for (const d of declarations) {
      expect(d).not.toMatch(/pan-/);
      expect(d).not.toMatch(/auto/);
      expect(d).not.toMatch(/manipulation/);
    }
  });

  it('`none` 打底在前、`pinch-zoom` 覆盖在后', () => {
    const body = clientBody();
    const none = body.indexOf('touch-action: none');
    const pinch = body.indexOf('touch-action: pinch-zoom');
    // 少了 none 兜底，不认 pinch-zoom 的老浏览器（Safari < 13）会把整条声明当无效、
    // 落回 auto —— 那等于把两条轴全还给浏览器，正是这条契约要防的事
    expect(none).toBeGreaterThan(-1);
    expect(pinch).toBeGreaterThan(none);
  });

  /**
   * 分组**行**里的标签不许自带 sticky。
   *
   * `.vt-group-label` 这个类名被两处复用：多级分组**表头/表尾**的分组格（那里要
   * 「横滚时在可见中间区内跟随」，靠自己的 `position: sticky; left: 左冻结区宽`），
   * 以及分组**行**（那里外层 `.vt-group-content` 已经是 sticky 容器）。
   *
   * 裸选择器会同时命中两者，于是分组行里的标签被容器夹到最右端、**压在条数徽标上**。
   * 有冻结列时必现（`--vt-fixed-left-w` 一大就一定夹到底）。所以那条规则必须限定作用域。
   */
  it('表头/表尾的分组标签 sticky 规则必须限定作用域，不能是裸 .vt-group-label', () => {
    const i = cssText.indexOf('left: var(--vt-fixed-left-w');
    expect(i, '找不到分组标签的 sticky 规则').toBeGreaterThan(-1);
    // 往前找到这条规则的选择器
    const head = cssText.slice(cssText.lastIndexOf('}', i) + 1, cssText.indexOf('{', i));
    expect(head).toMatch(/\.vt-th--group|\.vt-tfoot/);
    expect(head.trim().startsWith('.vt-group-label')).toBe(false);
  });

  /**
   * 分组行要能挡住覆盖层。
   *
   * 数据行靠 `td.vt-fixed-left`（sticky + `z-index: 4` + 底色）盖住任何 z-index 更低的
   * 覆盖层；分组行没有冻结列（一个 colSpan 铺满的格子），所以这个职责落在
   * `.vt-group-content` 上：宽度撑到左冻结区、抬到同层、底色继承。
   * 少任何一条，甘特那类覆盖层横滚时就会浮在任务列上面。
   */
  it('.vt-group-content 承担「遮住左冻结区」的职责', () => {
    const body = bodyOf('.vt-group-content {');
    expect(body).toMatch(/position\s*:\s*sticky/);
    expect(body).toMatch(/z-index\s*:\s*4\s*;/);
    // 恰好铺满左冻结区（不多不少：多了压住第一个时间桶，少了露出覆盖层）
    expect(body).toMatch(/min-width\s*:\s*var\(--vt-fixed-left-w[^)]*\)\s*;/);
    expect(body).toMatch(/background\s*:\s*inherit/);
  });

  /**
   * 遮盖必须盖满**整行高**，所以上下内边距归内层、分组格自己置零。
   *
   * 早先内边距在格子上，内层只有一行文字那么高（21px vs 行高 43px），上下各留 10/12px
   * 的缝 —— 覆盖层（z-index 3）就从缝里压在冻结的任务列上面，横滚时里程碑竖线与甘特条
   * 都会露出来（实测：那两条缝占了 34/76 行像素）。
   *
   * 同时它也是「零漂移」的前提：sticky 只会把元素往前推、不会拉到静态位置之前，
   * 格子留了 10px 左内边距的话，横滚前 10px 标题会跟着内容往左漂。
   */
  it('分组格上下与左内边距置零，改由 .vt-group-content 提供', () => {
    const cell = bodyOf('.vt-tr--group > .vt-group-cell {');
    // 四值写法：上 0 / 右 x / 下 0 / 左 0
    expect(cell).toMatch(/padding\s*:\s*0\s+var\(--vt-cell-padding-x\)\s+0\s+0\s*;/);
    // 不能再单独给左内边距（那就是漂移的成因）
    expect(cell).not.toMatch(/padding-left/);

    const inner = bodyOf('.vt-group-content {');
    // 上下内边距由内层给出 → 内层高度 = 整行高减上下边框
    expect(inner).toMatch(/padding\s*:\s*var\(--vt-cell-padding-y\)/);
    // 左侧同时承担「标题左缩进」与「层级缩进」
    expect(inner).toMatch(/--vt-group-cell-pad-l/);
    expect(inner).toMatch(/--vt-group-depth/);
    // 静态位置必须是 0，否则 sticky 会先漂再钉
    expect(inner).toMatch(/left\s*:\s*0\s*;/);
  });

  /**
   * 标签底色的浅调比例是**一个 token**，不是写死的 14%。
   *
   * 这个比例是「同一支色的浅底 + 实色字」这套配色的公式，而用同一支色画东西的地方不止
   * 标签格 —— 付费甘特插件的条底色按设计就等于胶囊底色。各写一个 14% 就是同一个公式的
   * 两份实现：改了这边那边不会跟着变（跨仓库更不会有人发现）。
   */
  it('标签底色走 --vt-cell-option-tint，不写死百分比', () => {
    expect(cssText).toMatch(
      /var\(--vt-cell-option-color\)\s+var\(--vt-cell-option-tint\)/,
    );
    // 不能退回写死的百分比
    expect(cssText).not.toMatch(/var\(--vt-cell-option-color\)\s+\d+%/);
    // token 本身要有默认值，否则 color-mix 整条失效（底色直接没了）
    expect(cssText).toMatch(/--vt-cell-option-tint\s*:\s*\d+%\s*;/);
  });

  /**
   * 遮盖的最后 1px：分组格自己的上下边框在 padding box 之外，内层的背景铺不到 ——
   * 覆盖层就能在那 2px 上画东西（实测：里程碑竖线正好压在分隔线上露出两点）。
   *
   * `::after` 往上下各反向长出一个边框宽把它吃掉，并**把那两条分隔线照原样重画一遍**：
   * 单纯遮住会让分隔线在左冻结区断掉几百 px，比露两个点更难看。
   */
  it('.vt-group-content::after 盖住分组格的上下边框，并把分隔线重画回来', () => {
    const body = bodyOf('.vt-group-content::after {');
    expect(body).toMatch(/position\s*:\s*absolute/);
    // 反向长出一个边框宽（上下都要）
    expect(body).toMatch(/top\s*:\s*calc\(\s*-1\s*\*\s*var\(--vt-border-width\)\s*\)/);
    expect(body).toMatch(/bottom\s*:\s*calc\(\s*-1\s*\*\s*var\(--vt-border-width\)\s*\)/);
    // 分隔线要重画，否则它在冻结区就断了
    expect(body).toMatch(/border-top\s*:\s*var\(--vt-border-width\)\s+solid\s+var\(--vt-group-border\)/);
    expect(body).toMatch(/border-bottom\s*:\s*var\(--vt-border-width\)\s+solid\s+var\(--vt-group-border\)/);
    // 多出来的边框不许改变尺寸
    expect(body).toMatch(/box-sizing\s*:\s*border-box/);
    // 沉到标题/开关之下，但仍在内层这个层叠上下文里（对外还是 4）
    expect(body).toMatch(/z-index\s*:\s*-1\s*;/);
    expect(body).toMatch(/background\s*:\s*inherit/);
  });

  /**
   * 分组格必须是「已定位但不建层叠上下文」。
   *
   * `position: relative` 让它排在 DOM 里更靠前的已定位覆盖层之上（时间轴装饰不该从
   * 结构分隔行身上透出来）；**不给 z-index** 才能让 `.vt-group-content` 的 `z-index: 4`
   * escape 出去盖住更高层的覆盖层。两半缺一个，就分别回到「底纹透过来」或
   * 「冻结区被浮层盖住」两个 bug 之一。
   */
  it('分组格 position: relative 且不带 z-index', () => {
    const body = bodyOf('.vt-tr--group > .vt-group-cell {');
    expect(body).toMatch(/position\s*:\s*relative/);
    expect(body).not.toMatch(/z-index/);
  });

  /**
   * 横向不许橡皮筋回弹。
   *
   * `overscroll-behavior` 只写一个 `contain` 是不够的：它挡滚动链、不挡本地回弹。
   * 触摸板纯水平手势下 `InputController` 的主轴（纵向）`delta` 是 0，
   * `_wouldOverscroll(0)` 恒真 → 走「让给滚动链」分支；此时横向也已到头，
   * `_scrollCross()` 没写动 `scrollLeft` 返回 false → **不 preventDefault** →
   * 事件落回原生 scrollport → macOS 弹一下。表格是数据网格，横向到头就该停住。
   *
   * 与纵向的 `auto` 不对称是有意的：横向「穿透给外层」与「不回弹」在这一个属性上
   * 二选一（`auto` 两个都给、`none` 两个都拦），而横向到头后外层能横滚的场景远比
   * 「macOS 上横扫到头弹一下」少见，所以先保 不回弹。
   */
  it('横向 overscroll-behavior 是 none（contain 挡不住本地回弹）', () => {
    const body = clientBody();
    expect(body).toMatch(/overscroll-behavior-x\s*:\s*none\s*;/);
    // 不能退回成一条 `overscroll-behavior: contain` —— 那正是有回弹的写法
    expect(body).not.toMatch(/overscroll-behavior\s*:\s*contain\s*;/);
  });

  /**
   * 纵向必须把滚动链交给外层：表格滚到底之后，页面（或任何可滚祖先）要能接着滚。
   *
   * 只有 `auto` 能做到。`contain` / `none` 都会把链掐死在这一层，表现是「表格嵌在页面里，
   * 滚到底之后整个页面再也滚不动」。别因为这一层纵向 `overflow: hidden` 且
   * `scrollHeight === clientHeight`（浏览器视角里纵向压根不可滚）就以为属性无效 ——
   * CDP 实测（Chrome 151）：`contain` 时 `window.scrollY` 始终为 0，`auto` 才滚起来。
   *
   * 位移不是这里实现的：`InputController._onWheel` 到边界时不 `preventDefault`，
   * 事件原样落回浏览器。这条声明只负责别挡路。
   */
  it('纵向是 auto（把滚动链交给外层，滚到底能带动页面）', () => {
    const body = clientBody();
    expect(body).toMatch(/overscroll-behavior-y\s*:\s*auto\s*;/);
    // contain / none 都会掐断链，是这条契约要防的两种退化
    expect(body).not.toMatch(/overscroll-behavior-y\s*:\s*(contain|none)\s*;/);
  });
});

/**
 * ---- 树形缩进的层级步进 ----
 *
 * 要守的不变量：**每加一层，内容起点固定右移一个 `--vt-indent-size`**。
 * 树形行的排布是 `缩进 × (层级-1) + 折叠箭头 + gap + 内容`，所以这条等式成立的前提有三个，
 * 三个都是「改一处就静默错掉」的类型：
 *   1. 两种缩进块（树形 / 分组）同宽，且宽度就是 `--vt-indent-size`；
 *   2. 折叠箭头的宽度也是 `--vt-indent-size`（否则第 1 层的偏移与后续层级的步进不同源）；
 *   3. **叶子节点的占位箭头必须仍占位**（`visibility` 而不是 `display: none`）——
 *      否则同一层里「有子节点的行」与「叶子行」的文字差 20+6px。
 *
 * 为什么现在值得单独守：`vtRowDrag` 的层级提示线与「指针横向位置 → 第几层」的换算
 * 都吃这套几何（它从任意数据行的 `.vt-tree-content` 反推第 1 层的位置，再按
 * `--vt-indent-size` 逐层推）。步进一旦不齐，箭头就会指错层级 —— 而那是 CSS 改动
 * 引起的、单测与类型都发现不了的故障。实测值见 AGENTS.md §7.24。
 */
describe('树形缩进：每一级步进一致', () => {
  /** 取某个选择器块的声明体（不含自定义属性过滤） */
  const bodyOf = (selectorHead: string): string => {
    const start = css.indexOf(selectorHead);
    expect(start, `选择器块没找到：${selectorHead}`).toBeGreaterThanOrEqual(0);
    const open = css.indexOf('{', start);
    return css.slice(open + 1, css.indexOf('\n}', open));
  };

  it('两种缩进块共用一条规则，宽度都是 --vt-indent-size', () => {
    const body = bodyOf('.vt-tree-indent,\n.vt-group-indent {');
    expect(body).toMatch(/width:\s*var\(--vt-indent-size\)/);
    // 共用一条规则就不可能一宽一窄
    expect(css).toContain('.vt-tree-indent,\n.vt-group-indent {');
  });

  it('折叠箭头的宽度也是 --vt-indent-size（第 1 层偏移与后续步进同源）', () => {
    const body = bodyOf('.vt-expand-icon,\n.vt-tree-toggle,\n.vt-group-toggle {');
    expect(body).toMatch(/width:\s*var\(--vt-indent-size\)/);
  });

  it('箭头与文本的间距走 --vt-tree-toggle-gap，且挂在箭头上（叶子占位也就带上了）', () => {
    // `.vt-tree-toggle {` 只会命中这条独立规则 —— 共用规则里它后面跟的是逗号
    const body = bodyOf('.vt-tree-toggle {');
    expect(body).toMatch(/margin-right:\s*var\(--vt-tree-toggle-gap\)/);
  });

  it('叶子的占位箭头仍占位：只能 visibility，不能 display:none / width:0', () => {
    const body = bodyOf('.vt-tree-toggle--leaf {');
    expect(body).toMatch(/visibility:\s*hidden/);
    expect(body).not.toMatch(/display\s*:\s*none/);
    expect(body).not.toMatch(/width\s*:/);
  });

  it('--vt-indent-size 是 px（层级换算按它做整数除法）', () => {
    expect(px(fallbackOf(base['--vt-indent-size']!))).toBeGreaterThan(0);
  });
});

/**
 * 工具栏与四个面板插件的版式契约。
 *
 * 这几条原先在付费甘特那侧 —— 面板与按钮条随「工具栏沉进核心」一起搬过来，守卫也跟着搬。
 * 它们都是**踩过才写下来的**：面板的内边距、分隔线的负外边距、控件那一列的伸缩，
 * 少任何一条的表现都是「看着像坏了」而不是报错。
 *
 * **读的是一组文件而不是一份**：面板那半边随四个面板插件（`vtFieldConfig` / `vtFilterConfig` /
 * `vtGroupConfig` / `vtSortConfig`）拆了出去 —— 基元在 `_panel-ui.css`，字段配置的手柄在
 * `field-config.css`，筛选的去壳规则在 `filter-config.css`。使用方引一个
 * `plugins/toolbar.css` 仍然拿到全部外观（`toolbar.ts` 经 JS `import` 把它们带进同一个 chunk），
 * 所以这里拼起来当一份看，与产物里的实际内容一致。
 */
describe('工具栏：面板版式与按钮条', () => {
  const cssOf = (name: string): string =>
    readFileSync(fileURLToPath(new URL(`./plugins/${name}`, import.meta.url)), 'utf8');
  /**
   * 这一组断言横跨「按钮条 + 面板基元 + 两个面板的专属规则」，而它们现在**分属不同的插件**
   * （工具栏不再把面板 CSS 拖进自己那份，见本组最后一条）。拼起来读是为了让每条断言仍然
   * 指着它该指的那条规则 —— 装了对应插件的页面上，这些规则确实同时在场。
   */
  const cssText = ['toolbar.css', '_panel-ui.css', 'field-config.css', 'filter-config.css']
    .map(cssOf)
    .join('\n');

  const bodyOf = (needle: string): string => {
    const i = cssText.indexOf(needle);
    expect(i, `找不到选择器 ${needle}`).toBeGreaterThan(-1);
    const open = cssText.indexOf('{', i);
    return cssText.slice(open, cssText.indexOf('\n}', open));
  };

  it('面板自己给内边距 —— 共享的 `.vt-filter-panel` 一点 padding 都没有', () => {
    /*
     * 那个类是给「一整列可点条目」的列表面板用的（条目自己带 padding），而工具栏面板是表单。
     * 少了这一条的实测表现：标题贴着边框、最后一行的开关半个身子压在圆角上。
     */
    const panel = bodyOf('.vt-toolbar-panel {');
    expect(panel).toMatch(/padding:\s*var\(--vt-toolbar-panel-pad\)/);
    expect(panel).toMatch(/--vt-toolbar-panel-pad:\s*\d+px/);
  });

  it('行距比行内 gap 大一档（一眼看出「一行是一个配置项」）', () => {
    const rowGap = /gap:\s*(\d+)px/.exec(bodyOf('.vt-toolbar-panel {'))?.[1];
    const inRow = /gap:\s*(\d+)px/.exec(bodyOf('.vt-toolbar-panel-row {'))?.[1];
    expect(Number(rowGap)).toBeGreaterThanOrEqual(Number(inRow));
  });

  it('分隔线与页脚通栏：负外边距正好抵掉面板的内边距', () => {
    expect(bodyOf('.vt-toolbar-panel-divider {')).toMatch(
      /margin:\s*\d+px\s+calc\(var\(--vt-toolbar-panel-pad\)\s*\*\s*-1\)/,
    );
    expect(bodyOf('.vt-toolbar-panel-footer {')).toMatch(
      /calc\(var\(--vt-toolbar-panel-pad\)\s*\*\s*-1\)/,
    );
  });

  it('控件撑满右侧那一列（几行的下拉框左右边缘都对齐）', () => {
    expect(bodyOf('.vt-toolbar-panel-control > .vt-field-select {')).toMatch(/flex:\s*1 1 auto/);
    expect(bodyOf('.vt-toolbar-rule > .vt-field-select {')).toMatch(/flex:\s*1 1 auto/);
  });

  it('标题字号跟着单元格走，不是面板那档 sm', () => {
    // 同一行里「开始日期」与「开始」一大一小会显得像两个东西
    expect(bodyOf('.vt-toolbar-panel-label {')).toMatch(/font-size:\s*var\(--vt-font-size\)/);
  });

  /**
   * 自动包出来的外壳**必须给 `.vt-root` 一个 `min-height: 0`**。
   *
   * flex 子项默认 `min-height: auto` 会让 root 按内容撑高 —— 而虚拟化是靠容器高度算窗口的，
   * 于是十万行的表把页面拉到几百万像素、滚动条完全失真。
   */
  it('外壳给表格 min-height: 0（否则虚拟化的容器高度会被内容撑破）', () => {
    const body = bodyOf('.vt-toolbar-shell > .vt-root {');
    expect(body).toMatch(/flex:\s*1 1 auto/);
    expect(body).toMatch(/min-height:\s*0/);
  });

  /**
   * 与表格拼成一块板子。少了这三条的实测表现：上面方角、下面圆角、中间差两条侧边框 ——
   * 一眼看出是两个组件摞在一起（用户第一句反馈就是「割裂」）。
   */
  it('按钮条接管卡片上半截：上圆角 + 侧/上边框，且**不留下边框**（缝归表格）', () => {
    const card = bodyOf('.vt-toolbar--card {');
    expect(card).toMatch(/border:\s*var\(--vt-border-width\)\s+solid/);
    // 两条 1px 叠起来会变成 2px 粗线
    expect(card).toMatch(/border-bottom-width:\s*0/);
    expect(card).toMatch(/border-top-left-radius:\s*var\(--vt-radius-root\)/);
    expect(card).toMatch(/border-top-right-radius:\s*var\(--vt-radius-root\)/);
  });

  it('上面两个圆角归了按钮条，表格那两个就得改方（否则露出两个小三角的底色）', () => {
    const body = bodyOf('.vt-toolbar-shell > .vt-toolbar + .vt-root {');
    expect(body).toMatch(/border-top-left-radius:\s*0/);
    expect(body).toMatch(/border-top-right-radius:\s*0/);
  });

  it('收角用兄弟选择器表达「谁在我上面」，不靠给表格加类', () => {
    // 按钮条不在时这条规则压根不命中，表格照旧圆四个角 —— 这是它比加类好的地方
    expect(cssText).toMatch(/\.vt-toolbar\s*\+\s*\.vt-root/);
  });

  it('靠右那组用 margin-left: auto，而不是给整条按钮条 justify-content', () => {
    // 那条槽是共享的：使用方往里塞自己的节点时不该被整体推到右边
    expect(bodyOf('.vt-toolbar-group--end {')).toMatch(/margin-left:\s*auto/);
    expect(bodyOf('.vt-toolbar {')).not.toMatch(/justify-content/);
    // 基础规则上不许有 auto：flex 里每个 auto 外边距都各自吃掉剩余空间
    expect(bodyOf('.vt-toolbar-button {')).not.toMatch(/margin-left:\s*auto/);
  });

  it('组内 gap 比条上的 gap 小一档（同侧的按钮是一伙的）', () => {
    const outer = /gap:\s*(\d+)px/.exec(bodyOf('.vt-toolbar {'))?.[1];
    const inner = /gap:\s*(\d+)px/.exec(bodyOf('.vt-toolbar-group {'))?.[1];
    expect(Number(inner)).toBeLessThan(Number(outer));
  });

  /**
   * 生效数量是**排在标签前面的一段文字**（「1 分组」），不是右上角的实心角标。
   *
   * 角标那版把数量和标签拆成了两个东西：眼睛先认标签、再去找角标，而它本来就是标签的
   * 一部分。所以这里守的是「它长得像文字」：没有实心底、没有胶囊圆角，靠主色 + 半档字重
   * 在一行里立住；`tabular-nums` 则保证 1 → 10 时按钮宽度不跳。
   */
  it('生效数量是前置的一段文字，不是实心角标', () => {
    const badge = bodyOf('.vt-toolbar-badge {');
    expect(badge).toMatch(/color:\s*var\(--vt-color-primary\)/);
    expect(badge).toMatch(/tabular-nums/);
    expect(badge).not.toMatch(/background/);
    expect(badge).not.toMatch(/border-radius/);
  });

  /**
   * 按钮高度**不沿用 `--vt-control-height`**（面板里的下拉/分段那档），自己一个变量。
   *
   * 工具栏是常驻的一条，比浮层里的控件宽松一档才不局促；而那个变量一动，面板里所有控件
   * 跟着变。带兜底值是为了让使用方只覆盖变量就能改高度。
   */
  it('按钮高度是工具栏自己的变量，兜底 28px', () => {
    const btn = bodyOf('.vt-toolbar-button {');
    expect(btn).toMatch(/height:\s*var\(--vt-toolbar-button-height,\s*28px\)/);
  });

  /**
   * 按钮**不画边框**：一排按钮各画一圈 1px，读起来是「五个独立输入框」，而它们是同一条
   * 工具栏上的五个入口。白底压在浅色槽（`.vt-toolbar` 的 `--vt-header-bg`）上已经分得开。
   */
  it('按钮无边框，靠白底与浅色槽的对比分离', () => {
    expect(bodyOf('.vt-toolbar-button {')).toMatch(/border:\s*0/);
    expect(bodyOf('.vt-toolbar-button {')).toMatch(/background:\s*var\(--vt-bg\)/);
    expect(bodyOf('.vt-toolbar {')).toMatch(/background:\s*var\(--vt-header-bg\)/);
  });

  /**
   * 筛选面板里装的是 `VtFilterBuilder`，它自带一层面板外壳（边框 + 阴影 + 内边距，画在
   * `.vt-fb-panel` 上），而此刻它已经在 `createPopup` 的 `.vt-filter-panel` 里 ——
   * 不去壳就是双边框 + 双阴影。
   *
   * **注意选的是 `.vt-fb-panel` 而不是 `.vt-fb`**：后者只是 token 载体（核心 index.css
   * 声明 `--vt-*` 的地方），身上没有外观可去。
   */
  it('筛选浮层里把筛选管理器自带的那层外壳去掉', () => {
    const body = bodyOf('.vt-toolbar-filter > .vt-fb-panel {');
    expect(body).toMatch(/border:\s*0/);
    expect(body).toMatch(/box-shadow:\s*none/);
    expect(body).toMatch(/padding:\s*0/);
  });

  /**
   * `.vt-fb` 的两个角色不许混：**它只带变量**。
   *
   * 核心 `index.css` 把 `--vt-*` 声明在 `.vt-root, .vt-fb` 上，付费插件的外壳与工具栏自己
   * 包的那层壳都靠它拿变量。筛选管理器一度把自己那张面板的外观（边框 + 阴影 + 12/14px 内边距）
   * 也画在同一个类上 —— 于是**任何一个 token 载体都白得一圈卡片**（实测：甘特外壳左右各被
   * 推进 15px，而那份 CSS 只是因为别处引了筛选管理器才在场）。
   */
  it('.vt-fb 只带变量：外观归 .vt-fb-panel', () => {
    const fbCss = readFileSync(
      fileURLToPath(new URL('./components/vt-filter-builder.css', import.meta.url)),
      'utf8',
    );
    // 这份 CSS 里不该出现「裸 .vt-fb」的规则块（`.vt-fb-xxx` 那些是它自己的子元素，不算）
    expect(fbCss).not.toMatch(/(^|\})\s*\.vt-fb\s*(,|\{)/);
    const panel = fbCss.slice(fbCss.indexOf('.vt-fb-panel {'));
    expect(panel).toMatch(/border:\s*var\(--vt-border-width\)/);
    expect(panel).toMatch(/padding:\s*12px 14px/);
  });

  /**
   * 那 400 行 `.vt-fb-*` **必须显式 `@import`** 进来：JS 侧 `import { VtFilterBuilder }`
   * 不会把它的 CSS 带进本插件的 chunk（那个模块与 components 共享，Vite 把 CSS 归给了
   * components）。漏了的表现是「筛选面板是没有样式的一坨」，而且只在打开面板时才看出来。
   */
  it('显式 @import 了筛选管理器的样式（JS import 带不进来）', () => {
    // 这条随「筛选面板成为 vtFilterConfig 插件」搬到了那份 CSS 里
    expect(cssOf('filter-config.css')).toMatch(
      /@import\s+'\.\.\/components\/vt-filter-builder\.css'/,
    );
  });

  /**
   * 反过来：**工具栏那份不许把面板插件的 CSS 拖进来**。
   *
   * 工具栏一颗按钮都不自带（面板各自是独立插件），所以它的样式表里只该有按钮条 + 面板基元。
   * 把面板 CSS `@import` 进来的后果是「只要排序面板也得吞下筛选管理器那 14KB」——
   * 那正是「自带四项」那一版的代价，换成显式装载就是为了摆脱它。
   */
  it('工具栏的 CSS 不含任何面板插件的样式（面板跟着各自的插件走）', () => {
    const toolbar = cssOf('toolbar.css');
    for (const name of [
      'field-config',
      'filter-config',
      'group-config',
      'sort-config',
      'row-height-config',
    ]) {
      expect(toolbar, `toolbar.css 不该 @import ${name}.css`).not.toMatch(
        new RegExp(`@import\\s+'\\./${name}\\.css'`),
      );
    }
    // 面板基元仍要：贡献方可以只借基元画自己的面板（付费甘特就是）
    expect(toolbar).toMatch(/@import\s+'\.\/_panel-ui\.css'/);
  });

  /**
   * 面板插件的 CSS 各自 `@import` 面板基元（四个自带的 + `vtRowHeightConfig`）。
   *
   * 它们都能**不装 `vtToolbar` 单独用**，那时使用方只会引 `plugins/<插件>.css` 一个文件 ——
   * 少了这一条的表现是「面板出来了但没有版式」：标题贴边、规则行挤成一坨，而且只在打开面板
   * 那一刻才看出来。基元没有条件依赖可言，所以四份一个都不能漏。
   */
  it('五个面板插件的 CSS 都自包含面板基元', () => {
    for (const name of [
      'field-config.css',
      'filter-config.css',
      'group-config.css',
      'sort-config.css',
      'row-height-config.css',
    ]) {
      expect(cssOf(name), `${name} 少了面板基元`).toMatch(/@import\s+'\.\/_panel-ui\.css'/);
    }
  });
});
