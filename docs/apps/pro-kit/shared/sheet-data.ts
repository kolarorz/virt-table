/**
 * 电子表格形态的演示数据 —— 一张「季度预算表」。
 *
 * 与 `data.ts`（业务表格：列是**字段**）刻意不同：这里列是**坐标**（A/B/C…），
 * 每一格独立，公式写在格里。这是第二档 `vtFormula` 的用法形态。
 *
 * 数据里直接写 `'=B2*C2'` 这种原文：`vtFormula` 装载时会把它搬进 `_formulas`
 * 并把格里换成计算结果（见插件注释里的数据模型）。
 */

/** 一行 = 电子表格的一行，键就是列字母 */
export interface SheetRow extends Record<string, unknown> {
  /** 行号（1 基），同时当 itemKey；A1 的行号 = 数组下标 + 1，与它一致 */
  id: number;
  /** 公式原文由插件写在这里 */
  _formulas?: Record<string, string>;
}

/** 参与公式的列字母（顺序即 A、B、C…） */
export const SHEET_COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

/**
 * 造一张预算表：
 *
 * ```
 *      A(项目)   B(单价)  C(数量)  D(小计=B*C)  E(税率)  F(税额=D*E)  G(合计=D+F)
 * 1    表头文字…
 * 2    服务器      1200      8       =B2*C2      0.06     =D2*$E$2    =D2+F2
 * …
 * 12   合计                          =SUM(D2:D11)         =SUM(F2:F11) =SUM(G2:G11)
 * ```
 *
 * 几处刻意的设计：
 * - **第 1 行是表头文字**（不是核心的表头，是格子里的文本）—— 电子表格的表头就是普通格
 * - `$E$2` 用绝对引用，这样把 F 列往下填时税率永远指向 E2（演示填充与 `$` 的意义）
 * - 最后一行用 `SUM(区域)`，它依赖 10 个格，改任意一格都会重算（演示脏传播）
 */
export function makeSheet(): SheetRow[] {
  const items: Array<[name: string, price: number, qty: number]> = [
    ['服务器', 12000, 8],
    ['交换机', 3200, 4],
    ['机柜', 5800, 2],
    ['UPS 电源', 9400, 2],
    ['网线（箱）', 260, 30],
    ['光模块', 1450, 16],
    ['硬盘 4T', 880, 24],
    ['内存 32G', 640, 32],
    ['运维服务', 36000, 1],
    ['备件包', 7800, 1],
  ];

  const rows: SheetRow[] = [
    // 第 1 行：表头文字
    { id: 1, A: '项目', B: '单价', C: '数量', D: '小计', E: '税率', F: '税额', G: '合计' },
  ];

  items.forEach(([name, price, qty], i) => {
    const r = i + 2; // 数据从第 2 行开始
    rows.push({
      id: r,
      A: name,
      B: price,
      C: qty,
      D: `=B${r}*C${r}`,
      // 税率只有 E2 一格有值，其余行留空 —— 下面的公式用 $E$2 锁死它
      E: r === 2 ? 0.06 : null,
      F: `=ROUND(D${r}*$E$2, 2)`,
      G: `=D${r}+F${r}`,
    });
  });

  const last = items.length + 1; // 最后一行数据的行号
  rows.push({
    id: last + 1,
    A: '合计',
    B: null,
    C: `=SUM(C2:C${last})`,
    D: `=SUM(D2:D${last})`,
    E: null,
    F: `=SUM(F2:F${last})`,
    G: `=SUM(G2:G${last})`,
  });

  // 再留几行空白，方便在 demo 里手写公式试
  for (let i = 0; i < 6; i++) {
    rows.push({ id: rows.length + 1 });
  }

  return rows;
}
