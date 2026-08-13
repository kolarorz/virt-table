/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * 自动聚合合计行的纯逻辑。VirtTable 在数据管线末端用筛选/排序后的叶子行调用，
 * 产出一行 string[]（按渲染列序），再交给现有 tfoot 渲染。
 */

export type SummaryType = 'sum' | 'avg' | 'count' | 'max' | 'min';

/** 聚合列的最小接口（避免与 VirtTableColumn 循环依赖，仅取所需字段） */
export interface SummaryColumn<T = any> {
  key: string;
  summary?: SummaryType;
  summaryMethod?: (values: unknown[], rows: T[]) => string | number;
}

/** 数值格式化：整数不保留小数，非整数保留两位 */
function fmt(n: number): string {
  if (!Number.isFinite(n)) return '';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** 对一组原始单元格值做内置聚合 */
export function aggregate(type: SummaryType, values: unknown[]): string {
  if (type === 'count') return String(values.length);
  const nums = values
    .map((v) => (typeof v === 'number' ? v : Number(v)))
    .filter((v) => !Number.isNaN(v));
  if (nums.length === 0) return '';
  switch (type) {
    case 'sum': return fmt(nums.reduce((a, b) => a + b, 0));
    case 'avg': return fmt(nums.reduce((a, b) => a + b, 0) / nums.length);
    case 'max': return fmt(Math.max(...nums));
    case 'min': return fmt(Math.min(...nums));
    default: return '';
  }
}

/**
 * 计算单个表尾格的聚合值，叶子格与分组格共用一套语义：
 * 把该格覆盖的**全部叶子列 × 全部行**的原始值摊平成一维 values，再交给
 * `summaryMethod`（优先）或内置 `summary` 聚合。
 *
 * 叶子格传 `leaves = [node]`，摊平结果即 `rows.map(r => r[node.key])`，
 * 与 `computeSummaryRow` 的单列语义完全一致。
 *
 * 节点既没配 `summaryMethod` 也没配 `summary` 时返回 `null`（表示“该格没有聚合值”，
 * 由调用方决定是否放合计标签或留空）。
 */
export function computeCellSummary<T extends Record<string, any>>(
  node: SummaryColumn<T>,
  rows: T[],
  leaves: SummaryColumn<T>[],
): string | null {
  if (!node.summaryMethod && !node.summary) return null;
  const values: unknown[] = [];
  for (const row of rows) {
    for (const leaf of leaves) values.push(row[leaf.key]);
  }
  if (node.summaryMethod) return String(node.summaryMethod(values, rows));
  return aggregate(node.summary!, values);
}

/**
 * 计算合计行。columns 按**渲染列序**传入（[...left, ...center, ...right]），
 * 返回等长的 string[]。首列无自定义聚合时放合计标签。
 */
export function computeSummaryRow<T extends Record<string, any>>(
  leaves: T[],
  columns: SummaryColumn<T>[],
  summaryText: string,
): string[] {
  return columns.map((col, i) => {
    const values = leaves.map((r) => r[col.key]);
    if (col.summaryMethod) return String(col.summaryMethod(values, leaves));
    if (col.summary) return aggregate(col.summary, values);
    if (i === 0) return summaryText;
    return '';
  });
}
