/**
 * 分页纯逻辑：页数计算、页码夹取、页码条项(带省略号)生成。
 * 无 DOM 依赖，供 index.ts 调用与单测复用。
 */

/** 总页数：至少 1 页；total<=0 或 pageSize<=0 时返回 1 */
export function pageCount(total: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
}

/** 将页码夹取到 [1, pageCount] 区间；非法输入回落到 1 */
export function clampPage(page: number, total: number, pageSize: number): number {
  const count = pageCount(total, pageSize);
  if (!Number.isFinite(page)) return 1;
  return Math.min(count, Math.max(1, Math.floor(page)));
}

/** 页码条一项：数字页码或省略号占位 */
export type PagerItem = number | 'ellipsis';

/**
 * 生成页码条项，Element Plus 风格：
 * - 总页数 <= 7 时全部展示；
 * - 否则首尾页常显，当前页 ±1 展示，其余区段折叠为 'ellipsis'。
 *   如 page=5,count=20 -> [1,'ellipsis',4,5,6,'ellipsis',20]
 */
export function buildPagerItems(page: number, count: number): PagerItem[] {
  const total = Math.max(1, Math.floor(count));
  const cur = Math.min(total, Math.max(1, Math.floor(page)));
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const items: PagerItem[] = [1];
  const left = Math.max(2, cur - 1);
  const right = Math.min(total - 1, cur + 1);
  if (left > 2) items.push('ellipsis');
  for (let p = left; p <= right; p++) items.push(p);
  if (right < total - 1) items.push('ellipsis');
  items.push(total);
  return items;
}
