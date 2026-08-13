/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VirtTableColumn } from './index';
import { compareValues, matchFilter, filterPreserveStructure } from './pipeline';
import { zhCN } from './locale';

/**
 * 高级筛选模型（筛选管理器 / 条件构建器的数据层）。
 *
 * 与列头快捷筛选（`_activeFilters` + `matchFilter`）是**两套独立状态**：
 * 列头筛选保持原语义不变，本模型另行求值，最终在数据管线里 AND 组合。
 *
 * 模型是一棵递归条件树：组节点携带 and/or 逻辑，可任意深度嵌套。
 * 求值遵循「宽容」原则——空组、未完成条件（缺值）、指向未知列的条件
 * 一律视为「通过」，这样 UI 上正在编辑的半成品条件不会把表格瞬间筛空。
 */

/** 值域类别：决定该列可用哪些算子、用什么输入控件 */
export type FilterValueKind = 'text' | 'number' | 'date' | 'enum' | 'boolean';

/** 条件算子 */
export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'in'
  | 'notIn'
  | 'isEmpty'
  | 'isNotEmpty';

/** 叶子条件节点 */
export interface FilterCondition {
  kind: 'condition';
  colKey: string;
  operator: FilterOperator;
  /** between 用 value + value2；in/notIn 用数组；isEmpty/isNotEmpty 忽略 */
  value?: unknown;
  value2?: unknown;
}

/** 条件组节点（可嵌套） */
export interface FilterGroup {
  kind: 'group';
  logic: 'and' | 'or';
  children: FilterNode[];
}

export type FilterNode = FilterCondition | FilterGroup;

/** 根节点恒为组；null 表示无高级筛选 */
export type FilterModel = FilterGroup | null;

/** 各值域类别的候选算子（顺序即 UI 下拉顺序） */
const OPERATORS_BY_KIND: Record<FilterValueKind, FilterOperator[]> = {
  text: ['contains', 'notContains', 'eq', 'neq', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'],
  number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
  date: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
  enum: ['in', 'notIn', 'eq', 'neq', 'isEmpty', 'isNotEmpty'],
  boolean: ['eq', 'neq'],
};

/**
 * 算子的默认（简体中文）标签。单一事实源在 `locale.ts` 的 `zhCN.operators`；
 * 此处仅 re-export 以兼容既有引用。实际渲染时可由表格 `locale` / VtFilterBuilder
 * 的 `texts` 覆盖。
 */
export const OPERATOR_LABELS: Record<FilterOperator, string> = zhCN.operators;

/**
 * 推断列的值域类别：
 * `filterValueKind`（显式） > `filterType` > 有 `filters` 候选则 enum > text。
 */
export function inferValueKind<T extends Record<string, any>>(col: VirtTableColumn<T>): FilterValueKind {
  if (col.filterValueKind) return col.filterValueKind;
  switch (col.filterType) {
    case 'number-range':
      return 'number';
    case 'date-range':
      return 'date';
    case 'text':
      return 'text';
    case 'enum':
      return 'enum';
  }
  if (col.filters && col.filters.length > 0) return 'enum';
  return 'text';
}

/** 某列在管理器里的候选算子（列级 `filterOperators` 可收窄，顺序按类别默认序） */
export function operatorsForColumn<T extends Record<string, any>>(col: VirtTableColumn<T>): FilterOperator[] {
  const all = OPERATORS_BY_KIND[inferValueKind(col)];
  if (!col.filterOperators || col.filterOperators.length === 0) return all;
  const allow = new Set(col.filterOperators);
  const narrowed = all.filter((op) => allow.has(op));
  return narrowed.length > 0 ? narrowed : all;
}

/** 值域类别的候选算子 */
export function operatorsFor(kind: FilterValueKind): FilterOperator[] {
  return OPERATORS_BY_KIND[kind];
}

/**
 * 算子需要几个操作数：
 * 0 = 无值（isEmpty/isNotEmpty）；1 = 单值；2 = 双值（between）；'multi' = 多值（in/notIn）
 */
export function operandCount(op: FilterOperator): 0 | 1 | 2 | 'multi' {
  if (op === 'isEmpty' || op === 'isNotEmpty') return 0;
  if (op === 'between') return 2;
  if (op === 'in' || op === 'notIn') return 'multi';
  return 1;
}

/** 值是否「空」（不含 0 / false，它们是有意义的值） */
function isBlank(v: unknown): boolean {
  return v === null || v === undefined || v === '';
}

/** 条件是否填写完整（不完整则求值时视为通过） */
export function isConditionComplete(cond: FilterCondition): boolean {
  if (!cond.colKey) return false;
  switch (operandCount(cond.operator)) {
    case 0:
      return true;
    case 2:
      // between 只填一端也算完整（等价于单边界）
      return !isBlank(cond.value) || !isBlank(cond.value2);
    case 'multi':
      return Array.isArray(cond.value) && cond.value.length > 0;
    default:
      return !isBlank(cond.value);
  }
}

/** 按值域类别把值归一到可比较形态：date → 时间戳，number → Number，其余原样 */
function normalize(kind: FilterValueKind, v: unknown): unknown {
  if (isBlank(v)) return v;
  if (kind === 'date') {
    const t = v instanceof Date ? v.getTime() : new Date(v as any).getTime();
    return Number.isNaN(t) ? NaN : t;
  }
  if (kind === 'number') {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isNaN(n) ? NaN : n;
  }
  return v;
}

/**
 * 单条件求值。
 * - 列不存在 / 条件不完整 → true（宽容）
 * - `in` / `notIn` 复用 `matchFilter`，因此枚举语义与列头筛选一致，
 *   且自动尊重列的 `filterMethod`；其余算子不走 `filterMethod`（其签名无算子概念）。
 */
export function evalCondition<T extends Record<string, any>>(
  cond: FilterCondition,
  col: VirtTableColumn<T> | undefined,
  row: T,
): boolean {
  if (!col) return true;
  if (!isConditionComplete(cond)) return true;

  const cell = row[col.key];
  const op = cond.operator;

  if (op === 'isEmpty') return isBlank(cell);
  if (op === 'isNotEmpty') return !isBlank(cell);

  if (op === 'in' || op === 'notIn') {
    const values = Array.isArray(cond.value) ? cond.value : [cond.value];
    const hit = matchFilter(col, values, row);
    return op === 'in' ? hit : !hit;
  }

  const kind = inferValueKind(col);

  if (op === 'contains' || op === 'notContains' || op === 'startsWith' || op === 'endsWith') {
    const s = String(cell ?? '').toLowerCase();
    const q = String(cond.value ?? '').toLowerCase();
    switch (op) {
      case 'contains':
        return s.includes(q);
      case 'notContains':
        return !s.includes(q);
      case 'startsWith':
        return s.startsWith(q);
      default:
        return s.endsWith(q);
    }
  }

  if (op === 'between') {
    const c = normalize(kind, cell);
    if (typeof c === 'number' && Number.isNaN(c)) return false;
    const lo = normalize(kind, cond.value);
    const hi = normalize(kind, cond.value2);
    if (!isBlank(lo) && compareValues(c, lo) < 0) return false;
    if (!isBlank(hi) && compareValues(c, hi) > 0) return false;
    return true;
  }

  const c = normalize(kind, cell);
  const v = normalize(kind, cond.value);
  // 日期/数字无法解析的单元格不参与比较
  if (typeof c === 'number' && Number.isNaN(c)) return false;

  // eq/neq 对非数字/日期类别用宽松字符串比较，避免 '1' 与 1 的类型差异
  if (op === 'eq' || op === 'neq') {
    const equal =
      kind === 'number' || kind === 'date'
        ? c === v
        : c === v || String(cell ?? '') === String(cond.value ?? '');
    return op === 'eq' ? equal : !equal;
  }

  const r = compareValues(c, v);
  switch (op) {
    case 'gt':
      return r > 0;
    case 'gte':
      return r >= 0;
    case 'lt':
      return r < 0;
    default:
      return r <= 0;
  }
}

/**
 * 递归求值条件树。
 * 空组、全部为「未完成条件」的组一律通过——包括 or 组（否则编辑中会把表筛空）。
 */
export function evalFilterNode<T extends Record<string, any>>(
  node: FilterNode,
  colMap: Map<string, VirtTableColumn<T>>,
  row: T,
): boolean {
  if (node.kind === 'condition') {
    return evalCondition(node, colMap.get(node.colKey), row);
  }
  const effective = node.children.filter((child) => isNodeEffective(child, colMap));
  if (effective.length === 0) return true;
  if (node.logic === 'or') {
    return effective.some((child) => evalFilterNode(child, colMap, row));
  }
  return effective.every((child) => evalFilterNode(child, colMap, row));
}

/** 节点是否「有效」（会真正参与筛选）：条件需完整且列存在；组需含有效子节点 */
function isNodeEffective<T extends Record<string, any>>(
  node: FilterNode,
  colMap: Map<string, VirtTableColumn<T>>,
): boolean {
  if (node.kind === 'condition') {
    return isConditionComplete(node) && colMap.has(node.colKey);
  }
  return node.children.some((child) => isNodeEffective(child, colMap));
}

/**
 * 模型是否含至少一个完整条件（不校验列是否存在，仅看结构）。
 * 用于快路径判空、表头/工具栏激活态、行拖拽禁用判断。
 */
export function isFilterModelActive(model: FilterModel): boolean {
  if (!model) return false;
  const walk = (node: FilterNode): boolean =>
    node.kind === 'condition' ? isConditionComplete(node) : node.children.some(walk);
  return model.children.some(walk);
}

/** 统计模型里的有效条件数（供 UI 显示「已启用 N 个条件」） */
export function countConditions(model: FilterModel): number {
  if (!model) return 0;
  let n = 0;
  const walk = (node: FilterNode): void => {
    if (node.kind === 'condition') {
      if (isConditionComplete(node)) n++;
    } else {
      node.children.forEach(walk);
    }
  };
  model.children.forEach(walk);
  return n;
}

/** 构建行谓词；模型无生效条件时返回 null（调用方可跳过整趟遍历） */
export function buildFilterModelPredicate<T extends Record<string, any>>(
  model: FilterModel,
  columns: VirtTableColumn<T>[],
): ((row: T) => boolean) | null {
  if (!model || !isFilterModelActive(model)) return null;
  const root = model;
  const colMap = new Map(columns.map((c) => [c.key, c]));
  if (!isNodeEffective(root, colMap)) return null; // 条件全部指向未知列
  return (row: T) => evalFilterNode(root, colMap, row);
}

/** 结构保持地按模型筛选（树保留含命中后代的祖先；扁平行返回同一引用） */
export function applyFilterModel<T extends Record<string, any>>(
  items: T[],
  model: FilterModel,
  columns: VirtTableColumn<T>[],
  childrenKey = 'children',
): T[] {
  const keep = buildFilterModelPredicate(model, columns);
  if (!keep) return items;
  return filterPreserveStructure(items, keep, childrenKey);
}

/** 深拷贝模型（对外返回状态时用，避免外部改到内部对象） */
export function cloneFilterModel(model: FilterModel): FilterModel {
  if (!model) return null;
  const cloneNode = (node: FilterNode): FilterNode =>
    node.kind === 'condition'
      ? { ...node, value: Array.isArray(node.value) ? [...node.value] : node.value }
      : { kind: 'group', logic: node.logic, children: node.children.map(cloneNode) };
  return cloneNode(model) as FilterGroup;
}

/** 造一个空的根组（管理器初始化用） */
export function createFilterGroup(logic: 'and' | 'or' = 'and'): FilterGroup {
  return { kind: 'group', logic, children: [] };
}
