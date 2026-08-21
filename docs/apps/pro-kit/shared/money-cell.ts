/**
 * 金额单元格 —— 三端 playground 共用的 `col.render`。
 *
 * 为什么不用核心的 `cellType: 'number'`：那条分支刻意**不做**千分位与精度
 * （见核心 `cell-type.ts` 里的注释「那是格式化职责」），它只保证纵向对齐
 * （全局 `font-variant-numeric: tabular-nums`）。所以「¥ 12,345.00 + 负数变色 +
 * 占比条」这类展示只能落在 `render` 上，这个文件就是那份 `render`。
 *
 * 返回 **HTMLElement 而不是 HTML 字符串**：核心对字符串走 `innerHTML`
 * （index.ts 里 `content.source === 'render'` 那一支），拼字符串就得自己管转义。
 * 金额是数字看似无害，但 `currency` 与列配置都可能来自外部，用 DOM API 直接免疫。
 */
import type { CellRenderContext } from '@virt-table/vanilla';

export interface MoneyCellOptions {
  /** 货币符号，默认 `¥` */
  currency?: string;
  /** 小数位，默认 2 */
  decimals?: number;
  /**
   * 占比条的分母（取绝对值比较）。省略或给 0 就不画条。
   *
   * 刻意要求**显式传入**而不是内部扫一遍数据算最大值：列定义是模块级常量，
   * 拿不到 list；而且分母跟着数据浮动的话，翻页 / 筛选后同一个金额的条长会变，
   * 反而看不出大小关系。
   */
  max?: number;
  /** 千分位分组按哪个 locale 走，默认 `zh-CN` */
  locale?: string;
}

/**
 * 造一个金额列的 `render`。
 *
 * `Intl.NumberFormat` 在**闭包外**建好复用：虚拟滚动每次滚动都会重画可见行的
 * 每一格，放进 render 里就是每格 new 一个 Intl 实例（它的构造相当重）。
 */
export function moneyCell<T extends Record<string, unknown>>(
  options: MoneyCellOptions = {},
): (ctx: CellRenderContext<T>) => HTMLElement {
  const { currency = '¥', decimals = 2, max = 0, locale = 'zh-CN' } = options;
  const nf = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return ({ value }) => {
    const wrap = document.createElement('span');
    wrap.className = 'pg-money';

    const n = typeof value === 'number' ? value : Number(value);
    // 空值/脏数据显示占位符而不是 `NaN`：金额列里一个 NaN 会让人以为是计算错了
    if (value == null || value === '' || !Number.isFinite(n)) {
      wrap.classList.add('pg-money--empty');
      wrap.textContent = '—';
      return wrap;
    }

    const negative = n < 0;
    if (negative) wrap.classList.add('pg-money--neg');

    if (max > 0) {
      const bar = document.createElement('i');
      bar.className = 'pg-money__bar';
      // 百分比走自定义属性而不是直接写 width：条的圆角/内边距/明暗配色都在 CSS 里，
      // 这里只交出「多长」这一个数
      const pct = Math.min(100, (Math.abs(n) / max) * 100);
      bar.style.setProperty('--pg-money-pct', `${pct.toFixed(1)}%`);
      wrap.appendChild(bar);
    }

    const sym = document.createElement('span');
    sym.className = 'pg-money__sym';
    // 负号跟符号连排（`-¥1,234.00`)，不放在数字前 —— 数字整体右对齐才能对得住小数点
    sym.textContent = negative ? `-${currency}` : currency;

    const num = document.createElement('span');
    num.className = 'pg-money__num';
    num.textContent = nf.format(Math.abs(n));

    wrap.append(sym, num);
    return wrap;
  };
}
