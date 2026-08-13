/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VirtTableColumn } from './index';

/**
 * 数据管线纯逻辑：排序比较器、结构保持排序、结构保持筛选、叶子收集、筛选匹配。
 *
 * 这些函数都是无副作用的纯函数，便于单测（见 pipeline.test.ts）。
 * VirtTable 的统一枢纽 `_rebuildData` 按固定顺序调用它们：
 *   原始数据 → 筛选 → 排序 → 结构展开(_flattenTree) → 聚合 → 提交。
 *
 * 关键约定：筛选/排序都作用于「结构展开之前的原始行」，因此 group/expand
 * 合成行永远不会进入比较器/筛选；且对**无 children 的扁平行返回同一引用**
 * （只有带 children 的树节点才浅克隆），保证单元格编辑的写回不会丢失。
 */

export type SortOrder = 'asc' | 'desc';

/** 单列排序状态 */
export interface SortSpec {
  colKey: string;
  order: SortOrder;
}

/** 筛选类型（enum 为默认；其余为富筛选，Phase 4 使用） */
export type FilterType = 'enum' | 'text' | 'number-range' | 'date-range';

/** 通用值比较：null 最小，数字按大小，其余按字符串字典序 */
export function compareValues(av: unknown, bv: unknown): number {
  if (av === bv) return 0;
  if (av === null || av === undefined) return -1;
  if (bv === null || bv === undefined) return 1;
  if (typeof av === 'number' && typeof bv === 'number') return av - bv;
  const as = String(av);
  const bs = String(bv);
  return as < bs ? -1 : as > bs ? 1 : 0;
}

/**
 * 构建多列比较器；无有效排序返回 null。
 * 依次比较 `_sortState` 中的每一列，遇到第一个非零结果即返回（乘方向）。
 */
export function buildComparator<T extends Record<string, any>>(
  sortState: SortSpec[],
  columns: VirtTableColumn<T>[],
): ((a: T, b: T) => number) | null {
  if (!sortState.length) return null;
  const colMap = new Map(columns.map((c) => [c.key, c]));
  const specs = sortState
    .map((s) => ({ col: colMap.get(s.colKey), order: s.order }))
    .filter((s): s is { col: VirtTableColumn<T>; order: SortOrder } => !!s.col);
  if (!specs.length) return null;

  return (a: T, b: T): number => {
    for (const { col, order } of specs) {
      const dir = order === 'desc' ? -1 : 1;
      let r: number;
      if (col.sortMethod) {
        r = col.sortMethod(a, b);
      } else {
        r = compareValues(a[col.key], b[col.key]);
      }
      if (r !== 0) return r * dir;
    }
    return 0; // 等值保持原序（Array.prototype.sort 现代引擎稳定）
  };
}

/**
 * 结构保持排序：对每一层兄弟节点排序，递归排序 children。
 * 扁平行（无 children）返回同一引用；仅带 children 的树节点浅克隆，
 * 避免改动 `_originList` 原始 children 顺序（保证「清除排序」可恢复原序）。
 */
export function sortPreserveStructure<T extends Record<string, any>>(
  items: T[],
  cmp: (a: T, b: T) => number,
  childrenKey = 'children',
): T[] {
  const sorted = items.slice().sort(cmp);
  return sorted.map((it) => {
    const kids = (it as any)[childrenKey] as T[] | undefined;
    if (Array.isArray(kids) && kids.length) {
      return { ...it, [childrenKey]: sortPreserveStructure(kids, cmp, childrenKey) } as T;
    }
    return it;
  });
}

/**
 * 判断某行是否命中某列的筛选。
 * - 有 filterMethod：任一 value 命中即通过。
 * - number-range：values 为 [{min?,max?}]，判断单元格数值是否落区间。
 * - date-range：values 为 [{start?,end?}]，判断日期是否落区间。
 * - text：values 为 [关键字]，子串匹配（不区分大小写）。
 * - enum（默认）：值精确相等（=== 语义）。
 */
export function matchFilter<T extends Record<string, any>>(
  col: VirtTableColumn<T>,
  values: any[],
  row: T,
): boolean {
  if (!values || values.length === 0) return true;
  if (col.filterMethod) {
    return values.some((v) => col.filterMethod!(v, row));
  }

  const cell = row[col.key];
  switch (col.filterType) {
    case 'number-range': {
      const num = typeof cell === 'number' ? cell : Number(cell);
      if (Number.isNaN(num)) return false;
      return values.some((v) => {
        const { min, max } = (v ?? {}) as { min?: number; max?: number };
        if (min !== undefined && min !== null && num < min) return false;
        if (max !== undefined && max !== null && num > max) return false;
        return true;
      });
    }
    case 'date-range': {
      const t = cell instanceof Date ? cell.getTime() : new Date(cell as any).getTime();
      if (Number.isNaN(t)) return false;
      return values.some((v) => {
        const { start, end } = (v ?? {}) as { start?: string | number | Date; end?: string | number | Date };
        if (start != null && t < new Date(start).getTime()) return false;
        if (end != null && t > new Date(end).getTime()) return false;
        return true;
      });
    }
    case 'text': {
      const s = String(cell ?? '').toLowerCase();
      return values.some((v) => s.includes(String(v ?? '').toLowerCase()));
    }
    default:
      return values.some((v) => v === cell);
  }
}

/**
 * 结构保持筛选骨架：树场景保留「命中节点」及其「含命中后代的祖先」；
 * 扁平场景等价于普通 filter。扁平行返回同一引用；仅祖先节点浅克隆其 children。
 *
 * 列头筛选（`applyRowFilters`）与高级筛选（`applyFilterModel`）共用此骨架，
 * 只是传入的 `keep` 谓词不同；两者同时生效时应组合成单个谓词走一次遍历。
 */
export function filterPreserveStructure<T extends Record<string, any>>(
  items: T[],
  keep: (row: T) => boolean,
  childrenKey = 'children',
): T[] {
  const walk = (arr: T[]): T[] => {
    const out: T[] = [];
    for (const it of arr) {
      const kids = (it as any)[childrenKey] as T[] | undefined;
      const keptKids = Array.isArray(kids) ? walk(kids) : undefined;
      if (keep(it) || (keptKids && keptKids.length > 0)) {
        out.push(keptKids !== undefined ? ({ ...it, [childrenKey]: keptKids } as T) : it);
      }
    }
    return out;
  };
  return walk(items);
}

/**
 * 列头筛选的行谓词：各列之间 AND；空值/未知列跳过。
 * 无任何生效筛选返回 null（调用方可据此跳过遍历）。
 */
export function buildColumnFilterPredicate<T extends Record<string, any>>(
  activeFilters: Map<string, any[]>,
  columns: VirtTableColumn<T>[],
): ((row: T) => boolean) | null {
  if (!activeFilters.size) return null;
  const colMap = new Map(columns.map((c) => [c.key, c]));
  const specs: Array<{ col: VirtTableColumn<T>; values: any[] }> = [];
  for (const [key, values] of activeFilters) {
    if (!values || values.length === 0) continue;
    const col = colMap.get(key);
    if (!col) continue;
    specs.push({ col, values });
  }
  if (!specs.length) return null;

  return (row: T): boolean => {
    for (const { col, values } of specs) {
      if (!matchFilter(col, values, row)) return false;
    }
    return true;
  };
}

/**
 * 结构保持筛选：树场景保留「命中节点」及其「含命中后代的祖先」；
 * 扁平场景等价于普通 filter。扁平行返回同一引用；仅祖先节点浅克隆其 children。
 */
export function applyRowFilters<T extends Record<string, any>>(
  items: T[],
  activeFilters: Map<string, any[]>,
  columns: VirtTableColumn<T>[],
  childrenKey = 'children',
): T[] {
  if (!activeFilters.size) return items;
  const keep = buildColumnFilterPredicate(activeFilters, columns);
  if (!keep) return filterPreserveStructure(items, () => true, childrenKey);
  return filterPreserveStructure(items, keep, childrenKey);
}

/**
 * 收集叶子行（无 children 的行）。用于聚合合计，避免树场景父/子双重计数。
 * 扁平数据时即所有行。
 */
export function collectLeaves<T extends Record<string, any>>(
  items: T[],
  childrenKey = 'children',
): T[] {
  const out: T[] = [];
  const walk = (arr: T[]) => {
    for (const it of arr) {
      const kids = (it as any)[childrenKey] as T[] | undefined;
      if (Array.isArray(kids) && kids.length > 0) walk(kids);
      else out.push(it);
    }
  };
  walk(items);
  return out;
}
