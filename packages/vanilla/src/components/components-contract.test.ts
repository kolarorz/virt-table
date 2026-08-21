/**
 * `components.css` 的静态契约（只看 CSS 文本，不需要浏览器）。
 *
 * 守的是**行高不变量**在内置组件这一侧的那一半。核心侧由 `css-contract.test.ts` 守
 * （`.vt-cell-image` / `.vt-cell-option` / `.vt-cell-bool`），但单元格组件自己新增了一批
 * 单元格内的展示元素（开关、进度条、星级、链接、标签行…），它们同样能把 40px 的行高
 * 顶破，而 happy-dom 没有布局引擎、测不出来。
 *
 * 两条规则（都在 AGENTS.md §7.5 末两条有实测记录）：
 *   1. 展示元素的高度必须锁在 `var(--vt-line-height)` 上，不能靠 padding + line-height
 *      自然撑 —— 撑成 22px 就让行高变 42，`estimatedSize` 与实际行高对不上。
 *   2. 锁高之后还要 `vertical-align: top`：`inline-flex` / `inline-block` 参与基线对齐，
 *      底部 descender 空间照样顶高行盒；`middle` 无效（它仍以基线为参照）。
 *
 * 第 2 条做成**通用扫描**而不是逐个选择器点名：以后新增组件只要写了 inline-flex /
 * inline-block 就会被查到，不用记得回来补断言。
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * 两个文件一起读：查看器那 300 行已经拆到 `image-viewer.css`（`VtImage` 与
 * `vtFloatingImage` 两个入口共用，走 CSS `@import` 内联），但它仍然是这份契约的一部分 ——
 * 下面 §13 那批断言查的就是它。构建时两者本来也会被内联成同一份产物。
 */
const css = ['./components.css', './image-viewer.css']
  .map((f) => readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8'))
  .join('\n');

/** 去掉注释，避免注释里的示例代码被当成规则 */
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');

interface Rule {
  selector: string;
  body: string;
}

/**
 * 把 CSS 文本切成 `{selector, body}` 列表。
 * 够用即可：本文件没有嵌套 at-rule（`@import` 是单行语句，不带块）。
 */
const rules: Rule[] = [...stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
  // 第一条规则的选择器前面粘着不带块的 at-语句（`@import '../plugins/_panel.css';`）——
  // 切到最后一个分号之后，否则文件里第一条规则永远按名字查不到
  selector: m[1]!.slice(m[1]!.lastIndexOf(';') + 1).trim(),
  body: m[2]!,
}));

const ruleOf = (selector: string): Rule => {
  const hit = rules.find((r) => r.selector === selector);
  if (!hit) throw new Error(`规则没找到：${selector}`);
  return hit;
};

describe('components.css：行高不变量', () => {
  it('展示型元素的高度锁在 --vt-line-height 上', () => {
    // `.vt-comp-cell` 是所有展示型组件的公共外层；另两个是自己独立成元素的
    for (const sel of ['.vt-comp-cell', '.vt-comp-link', '.vt-comp-tag-more']) {
      expect(ruleOf(sel).body, `${sel} 应把 height 锁在行高上`).toMatch(
        /height:\s*var\(--vt-line-height\)/,
      );
    }
  });

  it('锁高的元素都声明了 vertical-align: top', () => {
    for (const sel of ['.vt-comp-cell', '.vt-comp-link', '.vt-comp-tag-more']) {
      expect(ruleOf(sel).body, `${sel} 缺 vertical-align: top`).toMatch(
        /vertical-align:\s*top/,
      );
    }
  });

  it('凡是 inline-flex / inline-block 的规则都必须配 vertical-align: top', () => {
    const offenders = rules
      .filter((r) => /display:\s*inline-(flex|block)/.test(r.body))
      // 绝对/固定定位的盒子被移出常规流，不参与行内布局 → 基线对齐那条不适用
      // （`.vt-comp-clear` 就是这种：absolute 钉在输入框右侧）
      .filter((r) => !/position:\s*(absolute|fixed)/.test(r.body))
      .filter((r) => !/vertical-align:\s*top/.test(r.body))
      .map((r) => r.selector);
    expect(offenders, 'inline 级盒子不配 vertical-align: top 会把行盒顶高').toEqual([]);
  });

  it('`.vt-comp-cell` 的修饰类不许重新声明 height（锁高只能有一处）', () => {
    const offenders = rules
      .filter((r) => /^\.vt-comp-cell--/.test(r.selector))
      .filter((r) => /(^|[;{\s])height:/.test(r.body))
      .map((r) => r.selector);
    expect(offenders).toEqual([]);
  });
});

describe('components.css：一律走设计令牌', () => {
  it('不出现字面颜色（颜色必须引用 --vt-* 变量）', () => {
    const offenders: string[] = [];
    for (const rule of rules) {
      // 十六进制色、rgb()/hsl() 函数写法都算字面值
      const hits = rule.body.match(/#[0-9a-fA-F]{3,8}\b|\b(rgb|rgba|hsl|hsla)\(/g);
      if (hits) offenders.push(`${rule.selector} → ${hits.join(', ')}`);
    }
    expect(offenders).toEqual([]);
  });

  it('过渡时长与缓动也走令牌（避免各组件各写一套手感）', () => {
    const offenders: string[] = [];
    for (const rule of rules) {
      for (const m of rule.body.matchAll(/transition:[^;]+;/g)) {
        // 允许 `linear`；具体时长必须是 var(--vt-transition*)
        if (/\d+m?s/.test(m[0])) offenders.push(`${rule.selector} → ${m[0].trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('components.css：clearable 外壳的右侧留白', () => {
  /**
   * `input[type=date|time]` 的原生指示器（日历/时钟）和 `input[type=number]` 的 spinner
   * 都钉在输入框 content box 的右端，正好是绝对定位的 `×` 那块地 —— 不留白就两个图标叠
   * 在一起（用户报的「日期单元格里删除和日历图标重合」）。
   *
   * 留白只能扣在**外壳**上：输入框的 padding 来自内联的 `INPUT_CSS`，样式表压不过它。
   * happy-dom 量不出重合，只能静态守着这三条。
   */
  it('外壳自己扣出右侧留白，且是 border-box（否则宽度溢出）', () => {
    const wrap = ruleOf('.vt-comp-wrap');
    expect(wrap.body, '.vt-comp-wrap 缺右侧留白 → × 会压在原生指示器上').toMatch(
      /padding-right:\s*\d+px/,
    );
    expect(wrap.body, '加了 padding 就必须 border-box').toMatch(/box-sizing:\s*border-box/);
  });

  it('留白宽于 × 自身占位（× 是 18px 宽 + right: 6px）', () => {
    const gutter = Number(/padding-right:\s*(\d+)px/.exec(ruleOf('.vt-comp-wrap').body)![1]);
    const clear = ruleOf('.vt-comp-clear').body;
    const width = Number(/(^|[;{\s])width:\s*(\d+)px/.exec(clear)![2]);
    expect(gutter).toBeGreaterThanOrEqual(width);
  });

  it('输入框自己不再声明 padding-right（内联样式压得死，写了也是死代码）', () => {
    expect(ruleOf('.vt-comp-wrap > .vt-comp-input').body).not.toMatch(/padding-right:/);
  });
});

describe('components.css：面板项的对齐', () => {
  /**
   * `.vt-filter-item[role='option']` 那条 `space-between` 是给「文案 + 对勾」两个子元素
   * 的项写的（`VtSelect`）。人员项有三个子元素（头像 / 姓名块 / 对勾），继承那条会把
   * 中间的姓名块推到行中央 —— 名字长短不同，起始位置就参差不齐（用户报的「下拉列表里
   * 没有左对齐」）。所以人员项必须自己声明 flex-start，并用 auto 外边距把对勾顶到右边。
   *
   * happy-dom 没有布局引擎，量不出「对齐」，只能静态守着这两条规则。
   */
  it('人员面板项左对齐，对勾靠 auto 外边距顶到右侧', () => {
    expect(ruleOf('.vt-comp-person-item').body).toMatch(/justify-content:\s*flex-start/);
    expect(ruleOf('.vt-comp-person-item .vt-comp-check').body).toMatch(
      /margin-left:\s*auto/,
    );
  });
});

describe('components.css：可交互的东西要在光标上说出来', () => {
  /**
   * 用户反馈「人员 hover 的时候应该用手指样式」：`.vt-comp-person` 悬停会弹名片、点一下
   * 进选人面板，却顶着默认的文本光标 —— 看起来就是一段普通文字。
   *
   * 做成清单式断言而不是只查人员一处：这批「常态里就可交互」的展示元素（锚点、人员胶囊、
   * 清除叉）都必须是 pointer，以后再加一个也该进这个清单。
   */
  it('常态可交互的展示元素都声明 cursor: pointer', () => {
    for (const sel of [
      '.vt-comp-person',
      '.vt-comp-anchor',
      '.vt-comp-clear',
      '.vt-comp-image-item',
    ]) {
      expect(ruleOf(sel).body, `${sel} 缺 cursor: pointer`).toMatch(/cursor:\s*pointer/);
    }
  });
});

describe('components.css：图片缩略图的尺寸只跟随行高', () => {
  /**
   * `VtImage` 刻意**不提供尺寸选项**：缩略图写死 56px 会把 40px 的行顶到 75px，而
   * `estimatedSize` 还是 40 —— 正是 §7.11 那条「滚不到底」。所以它的尺寸只能是
   * 「外层锁住的行内容高 × 1:1 方框」，要大图就把行配高。
   *
   * 这一条比「锁高清单」更严：清单里那些元素是**自己**锁在 `--vt-line-height` 上，
   * 而缩略图必须**跟随**外层，一旦有人给它补一个 px 高度，行高不变量就破了。
   */
  it('.vt-comp-image-item 跟随外层高度（100% + 1:1），不写死像素', () => {
    const body = ruleOf('.vt-comp-image-item').body;
    expect(body).toMatch(/height:\s*100%/);
    expect(body).toMatch(/aspect-ratio:\s*1/);
    expect(body, '写死 px 高度会把行顶高').not.toMatch(/height:\s*[\d.]+(px|em|rem)/);
  });

  it('没有别的单元格内的 .vt-comp-image* 规则再声明 height', () => {
    const offenders = rules
      // 只查**单元格内**那几个类：查看器（`-viewer-*`）是铺满视口的模态浮层，
      // 它的按钮、切换箭头有自己的固定尺寸，与行高不变量无关
      .filter((r) => /^\.vt-comp-image[\w-]*$/.test(r.selector))
      .filter((r) => !r.selector.includes('-viewer'))
      .filter((r) => r.selector !== '.vt-comp-image-item')
      .filter((r) => /(^|[;{\s])height:/.test(r.body))
      .map((r) => r.selector);
    // `.vt-comp-image-img` 是 100%/100%（填满占位盒），不算自己定尺寸 —— 它在下面单独查
    expect(offenders.filter((s) => s !== '.vt-comp-image-img')).toEqual([]);
    expect(ruleOf('.vt-comp-image-img').body).toMatch(/height:\s*100%/);
  });
});

describe('components.css：图片查看器的层级', () => {
  /**
   * 这条钉的是一个**真实被用户撞到的 bug**：第一版舞台是 `position: absolute; inset: 0`
   * （铺满整个浮层），顶栏也是 absolute —— 两个都不带 z-index 的定位元素里后写的赢，于是
   * 舞台整片盖住工具栏，真实鼠标点「放大」命中的是舞台、被判成「点了幕布」→ 查看器关掉。
   *
   * 修法是改成流内 flex 列（顶栏 / 舞台 / 说明 / 列表条四个流内项）。happy-dom 没有布局引擎、
   * 更没有命中判定，测不出「按钮能不能点到」，所以只能在这里守住「舞台不许再铺满」。
   */
  it('舞台是流内 flex 项，不是铺满浮层的绝对定位层', () => {
    const stage = ruleOf('.vt-comp-image-viewer-stage').body;
    expect(stage, '舞台一旦 absolute inset 就会盖住工具栏').not.toMatch(
      /position:\s*absolute/,
    );
    expect(stage).toMatch(/flex:\s*1/);
    // flex 项不写 min-height: 0 的话内容撑不下时不肯缩，图会顶穿底部的列表条
    expect(stage).toMatch(/min-height:\s*0/);
  });

  it('顶栏与说明也在流里（没有一个压在另一个上面）', () => {
    for (const sel of ['.vt-comp-image-viewer-bar', '.vt-comp-image-viewer-caption']) {
      expect(ruleOf(sel).body, `${sel} 不该绝对定位`).not.toMatch(/position:\s*absolute/);
    }
  });

  /**
   * 第二个同源的 bug（也是真实鼠标才撞出来的）：舞台不裁剪时，**放大后的图会盖住工具栏**
   * —— transform 过的元素自成层叠上下文、画在流内内容之上，于是点一次「放大」之后旋转 /
   * 缩小 / 还原全部落在图上，没有任何反应。裁剪 + 操作区抬层两条都要。
   */
  it('舞台裁掉放大的图，操作区（顶栏 / 说明 / 列表条）在它之上', () => {
    expect(ruleOf('.vt-comp-image-viewer-stage').body, '不裁剪，放大的图会压住工具栏').toMatch(
      /overflow:\s*hidden/,
    );
    for (const sel of [
      '.vt-comp-image-viewer-bar',
      '.vt-comp-image-viewer-caption',
      '.vt-comp-image-viewer-strip',
    ]) {
      expect(ruleOf(sel).body, `${sel} 缺 z-index`).toMatch(/z-index:\s*1/);
    }
  });
});

describe('components.css：复用而不是另写一套', () => {
  it('面板皮肤走 CSS @import 内联，不在 JS 里 import', () => {
    // 走 JS import 会被 Rollup 提成 hash 命名的公共 chunk，使用方引不到（AGENTS.md §3.1）
    expect(css).toMatch(/@import\s+'\.\.\/plugins\/_panel\.css'/);
  });

  it('浮层不自己重画面板外壳（底色/边框/阴影全靠 .vt-filter-panel）', () => {
    // 只查 `.vt-comp-popup` 自身：给面板项加键盘高亮、禁用态这类「皮肤里没有的状态」
    // 是允许的，重新定义外壳才是问题（那意味着两套面板外观要各自维护）
    const own = rules.find((r) => r.selector === '.vt-comp-popup');
    expect(own, '.vt-comp-popup 规则没找到').toBeDefined();
    expect(own!.body).not.toMatch(/(^|[;{\s])(background|border|box-shadow):/);
  });
});

describe('components.css：表格之外的表单件', () => {
  /*
   * `createSelectField` 的下拉框要和**表格里的选择单元格**看着是一套东西：一样的字号
   * （`--vt-font-size`，不是面板那档 sm —— 里面回显的是数据）、一样的圆角与边框令牌，
   * 展开时主色边框 + focus 环（照 `.vt-cell-cover` 的路子，只把 2px 收成 1px）。
   */
  const field = ruleOf('.vt-field-select').body;

  it('字号跟着单元格走，不用面板那档 sm', () => {
    expect(field).toMatch(/font-size:\s*var\(--vt-font-size\)/);
  });

  it('高度用 min-height（字号 / 密度变了跟着长，不把文字挤扁）', () => {
    expect(field).toMatch(/min-height:/);
    // 只该有 min-height，不该另有一个写死的 height（`min-height` 自身要排除掉）
    expect(field.replace(/min-height/g, '')).not.toMatch(/\bheight:\s*\d/);
  });

  it('展开态给主色边框 + focus 环（与编辑浮层同一套表达）', () => {
    const open = ruleOf(
      ".vt-field-select:focus-visible,\n.vt-field-select[aria-expanded='true']",
    ).body;
    expect(open).toMatch(/border-color:\s*var\(--vt-color-primary\)/);
    expect(open).toMatch(/box-shadow:\s*0 0 0 3px var\(--vt-focus-ring-color\)/);
  });
});
