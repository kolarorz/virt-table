/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VirtTableColumn, VirtTableState, VirtTableColumnState } from './index';
import type { SortSpec } from './pipeline';
import {
  type FilterCondition,
  type FilterGroup,
  type FilterNode,
  type FilterOperator,
  type FilterValueKind,
  inferValueKind,
  operandCount,
  operatorsForColumn,
} from './filter-model';

/**
 * 自然语言查询的**纯逻辑层**：把「表格能被怎么查」描述给大模型，再把大模型吐回来的
 * JSON 校验、纠错、落成 `VirtTableState`。
 *
 * 三条边界（想改之前先看这里）：
 *
 * 1. **不发网络请求、不引 SDK、不认识任何厂商。** 中间那步「调模型」由使用方给回调
 *    （`vtAIQuery` 的 `resolve`）。理由同 `remote.ts` 做成受控层：key 不该落前端，
 *    企业自研网关 / 服务端代理 / 本地模型都得能接。
 *
 * 2. **校验不是可选项，是这一层存在的主要理由。** `filter-model.ts` 的求值刻意「宽容」
 *    ——未知列、不完整条件一律视为通过，这样 UI 上编辑到一半的条件不会把表筛空。
 *    但大模型幻觉出一个列名时，同样的宽容会变成「筛了却没效果」，用户完全无从判断。
 *    所以这里**在应用前**把问题挑出来（`AIQueryIssue`），由调用方决定是提示还是中止。
 *
 * 3. **输出是 `VirtTableState`，不是私有形状。** 复用 `setState()` 已有的批量提交
 *    （一次列重建 + 一次管线重算）与版本校验，AI 这条路不新增任何数据通路。
 */

// ---------------------------------------------------------------------------
// 1. 查询形状：大模型要产出的东西
// ---------------------------------------------------------------------------

/**
 * 大模型的目标产物。字段全可选 —— 「只排序不筛选」是常见诉求。
 *
 * 与 `VirtTableState` 的关系：这是**面向自然语言的简化投影**。不直接让模型产出
 * `VirtTableState` 是因为后者含 `version` / 列宽 / 分页等与语义无关的字段，
 * 塞进 tool schema 只会增加幻觉面。
 */
export interface AIQuery {
  /** 高级筛选条件树；`null` 表示显式清空 */
  filter?: FilterGroup | null;
  /** 排序，数组顺序即多列排序优先级 */
  sort?: SortSpec[];
  /** 「只看这几列」——列出的列可见，其余可隐藏列一律隐藏 */
  columns?: string[];
  /** 关键词搜索（对应 `setSearchTerm`，是查询状态的一部分） */
  search?: string;
  /** 模型对自己这次意图的自然语言复述，用于让用户确认「它是不是听懂了」 */
  explanation?: string;
}

/** 校验诊断。`error` = 该片段已被丢弃；`warn` = 已自动修正但保留 */
export interface AIQueryIssue {
  level: 'error' | 'warn';
  /** 出问题的位置，如 `filter.children[0]` / `sort[1]` / `columns` */
  path: string;
  message: string;
}

export interface AIQueryValidation {
  /** 规范化后的查询；全部内容都被丢弃时各字段为空 */
  query: AIQuery;
  issues: AIQueryIssue[];
  /** 是否有任何可应用的内容（全空时应用没有意义，调用方可据此提示「没听懂」） */
  actionable: boolean;
}

// ---------------------------------------------------------------------------
// 2. Schema：把表格描述给大模型
// ---------------------------------------------------------------------------

/** 单列对大模型的描述 */
export interface AITableColumnSchema {
  key: string;
  /** 列标题，模型主要靠它把「销售额」对上 `amount` */
  label: string;
  kind: FilterValueKind;
  /** 该列允许的算子（已按列的 `filterOperators` 收窄） */
  operators: FilterOperator[];
  /** 枚举候选。`label` 是用户会说的词，`value` 是必须填进条件的值 */
  enumValues?: Array<{ label: string; value: unknown }>;
  sortable: boolean;
  /** 是否可被「只看这几列」隐藏 */
  hideable: boolean;
}

export interface AITableSchema {
  columns: AITableColumnSchema[];
  /** 生成时刻的日期（`YYYY-MM-DD`），供模型解析「上个月」「去年 Q4」等相对时间 */
  today: string;
}

export interface AITableSchemaOptions {
  /** 覆盖「今天」，便于测试与服务端渲染保持确定性 */
  now?: Date;
  /**
   * 枚举候选的条数上限，默认 50。
   * 上千个候选塞进 prompt 既贵又会挤掉真正重要的上下文；超出时截断并在描述里标注。
   */
  maxEnumValues?: number;
}

/** 功能列（序号 / 复选框 / 展开箭头 …）不参与查询，也不该被「只看这几列」隐藏 */
const FUNCTIONAL_COL_TYPES = new Set(['index', 'checkbox', 'expand', 'radio', 'drag', 'tree']);

function isQueryableColumn<T extends Record<string, any>>(col: VirtTableColumn<T>): boolean {
  if (col.type && FUNCTIONAL_COL_TYPES.has(col.type)) return false;
  return !!col.key;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * 从当前叶子列生成表格 schema。
 *
 * 传 `getLeafColumns()` 的结果（分组表头摊平后的数据列）——分组节点自身没有
 * `key`，也不承载数据，不该出现在查询里。
 */
export function buildAITableSchema<T extends Record<string, any>>(
  columns: VirtTableColumn<T>[],
  options: AITableSchemaOptions = {},
): AITableSchema {
  const maxEnum = options.maxEnumValues ?? 50;
  const cols: AITableColumnSchema[] = [];

  for (const col of columns) {
    if (!isQueryableColumn(col)) continue;
    const key = String(col.key);
    const schema: AITableColumnSchema = {
      key,
      label: col.title || key,
      kind: inferValueKind(col),
      operators: operatorsForColumn(col),
      sortable: col.sortable !== false,
      // 与列面板同口径：hideable 未显式关闭即可隐藏
      hideable: col.hideable !== false,
    };
    if (col.filters && col.filters.length > 0) {
      schema.enumValues = col.filters
        .slice(0, maxEnum)
        .map((f) => ({ label: String(f.label ?? f.value), value: f.value }));
    }
    cols.push(schema);
  }

  return { columns: cols, today: toISODate(options.now ?? new Date()) };
}

/**
 * 把 schema 渲染成可直接拼进 system prompt 的文本。
 *
 * 为什么给文本而不只给 JSON Schema：算子适用性、枚举 label→value 的对应关系、
 * 相对时间的基准日期这几件事，用自然语言说比塞进 JSON Schema 的 `description`
 * 更省 token 也更容易被遵守。JSON Schema 那份（`toAIToolJsonSchema`）负责**结构**
 * 约束，这份负责**语义**约束，两者配合用。
 */
export function buildAIPromptContext(schema: AITableSchema): string {
  const lines: string[] = [];
  lines.push(`今天是 ${schema.today}。相对时间（如「上个月」「去年 Q4」）请据此换算成具体日期。`);
  lines.push('');
  lines.push('可查询的列：');
  for (const c of schema.columns) {
    const parts = [`- ${c.key}（${c.label}），类型 ${c.kind}，可用算子：${c.operators.join(' / ')}`];
    if (c.enumValues && c.enumValues.length > 0) {
      const pairs = c.enumValues
        .map((e) => (String(e.value) === e.label ? e.label : `${e.label}=${JSON.stringify(e.value)}`))
        .join('，');
      parts.push(`  候选值（左侧是用户会说的词，右侧是必须填进条件的值）：${pairs}`);
    }
    if (!c.sortable) parts.push('  该列不可排序');
    lines.push(parts.join('\n'));
  }
  lines.push('');
  lines.push(
    '规则：condition.colKey 必须是上面列出的 key，不要臆造；' +
      '算子必须取自该列的可用算子；' +
      '枚举列请填 value 而不是 label；' +
      '日期填 YYYY-MM-DD 字符串；' +
      'explanation 用一句中文复述你的理解，供用户确认。',
  );
  return lines.join('\n');
}

/**
 * 生成可直接用作 tool / function calling `input_schema` 的 JSON Schema。
 *
 * 刻意用**枚举收窄**列 key 与算子：能被 schema 约束掉的幻觉就别指望 prompt 去管，
 * 支持 constrained decoding 的服务端会直接把非法取值挡在生成阶段。
 */
export function toAIToolJsonSchema(schema: AITableSchema): Record<string, unknown> {
  const colKeys = schema.columns.map((c) => c.key);
  const sortableKeys = schema.columns.filter((c) => c.sortable).map((c) => c.key);
  const allOperators = [...new Set(schema.columns.flatMap((c) => c.operators))];

  // 条件树是递归结构，用 $defs + $ref 表达；顶层 filter 恒为 group
  const condition = {
    type: 'object',
    properties: {
      kind: { const: 'condition' },
      colKey: { type: 'string', enum: colKeys },
      operator: { type: 'string', enum: allOperators },
      value: {
        description:
          'eq/neq/contains 等单值算子填单值；between 填下界（上界填 value2）；' +
          'in/notIn 填数组；isEmpty/isNotEmpty 不填',
      },
      value2: { description: '仅 between 使用，填上界' },
    },
    required: ['kind', 'colKey', 'operator'],
    additionalProperties: false,
  };

  const group = {
    type: 'object',
    properties: {
      kind: { const: 'group' },
      logic: { type: 'string', enum: ['and', 'or'] },
      children: {
        type: 'array',
        items: { anyOf: [{ $ref: '#/$defs/condition' }, { $ref: '#/$defs/group' }] },
      },
    },
    required: ['kind', 'logic', 'children'],
    additionalProperties: false,
  };

  return {
    type: 'object',
    $defs: { condition, group },
    properties: {
      filter: {
        ...group,
        description: '筛选条件树；不需要筛选时省略该字段',
      },
      sort: {
        type: 'array',
        description: '排序，数组顺序即多列排序优先级',
        items: {
          type: 'object',
          properties: {
            colKey: { type: 'string', enum: sortableKeys },
            order: { type: 'string', enum: ['asc', 'desc'] },
          },
          required: ['colKey', 'order'],
          additionalProperties: false,
        },
      },
      columns: {
        type: 'array',
        description: '只显示这几列；用户没有提出列相关诉求时省略该字段',
        items: { type: 'string', enum: colKeys },
      },
      search: { type: 'string', description: '全表关键词搜索，仅在用户明确要「搜索」时使用' },
      explanation: { type: 'string', description: '用一句中文复述你的理解，供用户确认' },
    },
    required: ['explanation'],
    additionalProperties: false,
  };
}

// ---------------------------------------------------------------------------
// 3. 校验与规范化：把模型的输出变成可信的输入
// ---------------------------------------------------------------------------

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * 按值域类别把模型给的值强制成可比较形态。
 *
 * 大模型极常把数字写成字符串（`"1000000"`），日期写成各种格式。`filter-model.ts`
 * 的 `normalize` 求值时也会转，但那里转失败只是「这行不匹配」，静默且无从排查；
 * 在这里转失败要变成一条 issue。
 */
function coerceValue(
  kind: FilterValueKind,
  raw: unknown,
): { ok: true; value: unknown } | { ok: false; reason: string } {
  if (kind === 'number') {
    if (typeof raw === 'number') return Number.isFinite(raw) ? { ok: true, value: raw } : { ok: false, reason: '不是有限数字' };
    if (typeof raw === 'string' && raw.trim() !== '') {
      // 容忍模型写出 "1,000,000" 这类带千分位的数字
      const n = Number(raw.replace(/,/g, '').trim());
      if (Number.isFinite(n)) return { ok: true, value: n };
    }
    return { ok: false, reason: `无法解析为数字：${JSON.stringify(raw)}` };
  }

  if (kind === 'date') {
    if (raw instanceof Date) {
      return Number.isNaN(raw.getTime()) ? { ok: false, reason: '无效日期' } : { ok: true, value: raw };
    }
    if (typeof raw === 'string' || typeof raw === 'number') {
      const t = new Date(raw).getTime();
      if (!Number.isNaN(t)) return { ok: true, value: raw };
    }
    return { ok: false, reason: `无法解析为日期：${JSON.stringify(raw)}` };
  }

  if (kind === 'boolean') {
    if (typeof raw === 'boolean') return { ok: true, value: raw };
    if (raw === 'true') return { ok: true, value: true };
    if (raw === 'false') return { ok: true, value: false };
    return { ok: false, reason: `无法解析为布尔值：${JSON.stringify(raw)}` };
  }

  return { ok: true, value: raw };
}

/**
 * 枚举列上把 label 回译成 value。
 *
 * 这是实测里最高频的一类偏差：用户说「华东区」，列的候选是
 * `{ label: '华东区', value: 'east' }`，模型十有八九直接填 `'华东区'`。
 * prompt 里已经写了「请填 value」，但不能只靠 prompt —— 这里兜住。
 */
function resolveEnumValue(col: AITableColumnSchema, raw: unknown): { value: unknown; mapped: boolean } {
  if (!col.enumValues || col.enumValues.length === 0) return { value: raw, mapped: false };
  // 已经是合法 value 就原样放行
  if (col.enumValues.some((e) => e.value === raw)) return { value: raw, mapped: false };
  const s = String(raw);
  const byLabel = col.enumValues.find((e) => e.label === s);
  if (byLabel) return { value: byLabel.value, mapped: true };
  // 宽松再试一轮：忽略大小写与首尾空白
  const norm = s.trim().toLowerCase();
  const loose = col.enumValues.find(
    (e) => e.label.trim().toLowerCase() === norm || String(e.value).trim().toLowerCase() === norm,
  );
  if (loose) return { value: loose.value, mapped: true };
  return { value: raw, mapped: false };
}

/** 规范化单个条件；返回 null 表示该条件不可用（已记 issue） */
function normalizeCondition(
  raw: Record<string, unknown>,
  colMap: Map<string, AITableColumnSchema>,
  path: string,
  issues: AIQueryIssue[],
): FilterCondition | null {
  const colKey = typeof raw.colKey === 'string' ? raw.colKey : '';
  const col = colMap.get(colKey);
  if (!col) {
    issues.push({
      level: 'error',
      path,
      message: `列 "${colKey}" 不存在，该条件已丢弃`,
    });
    return null;
  }

  let operator = raw.operator as FilterOperator;
  if (!col.operators.includes(operator)) {
    // 常见可救的一类：模型对枚举列用了 eq，语义上等价于 in 单元素
    if (operator === 'eq' && col.operators.includes('in')) {
      issues.push({
        level: 'warn',
        path,
        message: `列 "${col.label}" 是枚举列，算子 eq 已改为 in`,
      });
      operator = 'in';
    } else {
      issues.push({
        level: 'error',
        path,
        message: `列 "${col.label}" 不支持算子 "${String(raw.operator)}"（可用：${col.operators.join('/')}），该条件已丢弃`,
      });
      return null;
    }
  }

  const arity = operandCount(operator);
  const cond: FilterCondition = { kind: 'condition', colKey, operator };

  if (arity === 0) return cond;

  const coerceOne = (v: unknown, slot: string): unknown | undefined => {
    let val = v;
    if (col.kind === 'enum') {
      const r = resolveEnumValue(col, val);
      if (r.mapped) {
        issues.push({
          level: 'warn',
          path,
          message: `列 "${col.label}" 的值 ${JSON.stringify(val)} 已按候选项回译为 ${JSON.stringify(r.value)}`,
        });
      }
      val = r.value;
      return val;
    }
    const r = coerceValue(col.kind, val);
    if (!r.ok) {
      issues.push({ level: 'error', path: `${path}.${slot}`, message: `${col.label}：${r.reason}` });
      return undefined;
    }
    return r.value;
  };

  if (arity === 'multi') {
    const arr = Array.isArray(raw.value) ? raw.value : raw.value === undefined ? [] : [raw.value];
    const out: unknown[] = [];
    for (const v of arr) {
      const got = coerceOne(v, 'value');
      if (got !== undefined) out.push(got);
    }
    if (out.length === 0) {
      issues.push({ level: 'error', path, message: `列 "${col.label}" 的 ${operator} 没有可用取值，该条件已丢弃` });
      return null;
    }
    cond.value = out;
    return cond;
  }

  if (arity === 2) {
    // between 允许只给一端（等价于单边界），与 isConditionComplete 的口径一致
    const lo = raw.value === undefined || raw.value === null || raw.value === '' ? undefined : coerceOne(raw.value, 'value');
    const hi = raw.value2 === undefined || raw.value2 === null || raw.value2 === '' ? undefined : coerceOne(raw.value2, 'value2');
    if (lo === undefined && hi === undefined) {
      issues.push({ level: 'error', path, message: `列 "${col.label}" 的 between 缺少边界值，该条件已丢弃` });
      return null;
    }
    if (lo !== undefined) cond.value = lo;
    if (hi !== undefined) cond.value2 = hi;
    return cond;
  }

  if (raw.value === undefined || raw.value === null || raw.value === '') {
    issues.push({ level: 'error', path, message: `列 "${col.label}" 的 ${operator} 缺少取值，该条件已丢弃` });
    return null;
  }
  const got = coerceOne(raw.value, 'value');
  if (got === undefined) return null;
  cond.value = got;
  return cond;
}

/** 规范化节点（条件或组）；返回 null 表示整棵子树都不可用 */
function normalizeNode(
  raw: unknown,
  colMap: Map<string, AITableColumnSchema>,
  path: string,
  issues: AIQueryIssue[],
  depth: number,
): FilterNode | null {
  if (!isPlainObject(raw)) {
    issues.push({ level: 'error', path, message: '不是合法的条件节点，已丢弃' });
    return null;
  }

  // 深度上限：模型偶尔会吐出自引用的畸形结构，别让它把栈打穿
  if (depth > 10) {
    issues.push({ level: 'error', path, message: '条件树嵌套过深（>10 层），该分支已丢弃' });
    return null;
  }

  // kind 缺失时按结构推断：有 children 视作组，否则视作条件
  const kind = raw.kind === 'group' || raw.kind === 'condition' ? raw.kind : Array.isArray(raw.children) ? 'group' : 'condition';

  if (kind === 'condition') return normalizeCondition(raw, colMap, path, issues);

  const logic = raw.logic === 'or' ? 'or' : 'and';
  if (raw.logic !== 'and' && raw.logic !== 'or') {
    issues.push({ level: 'warn', path, message: `logic "${String(raw.logic)}" 不合法，已按 and 处理` });
  }

  const rawChildren = Array.isArray(raw.children) ? raw.children : [];
  const children: FilterNode[] = [];
  rawChildren.forEach((child, i) => {
    const node = normalizeNode(child, colMap, `${path}.children[${i}]`, issues, depth + 1);
    if (node) children.push(node);
  });

  if (children.length === 0) return null;
  return { kind: 'group', logic, children };
}

/**
 * 校验并规范化大模型返回的查询。
 *
 * 入参是 `unknown` —— 它来自模型，任何形状都可能出现（含已经 `JSON.parse` 过的
 * 对象、字符串形态的 JSON）。字符串会先尝试解析一次，失败则整体报错。
 */
export function validateAIQuery<T extends Record<string, any>>(
  raw: unknown,
  columns: VirtTableColumn<T>[],
  options: AITableSchemaOptions = {},
): AIQueryValidation {
  const issues: AIQueryIssue[] = [];
  const query: AIQuery = {};

  let input = raw;
  if (typeof input === 'string') {
    try {
      input = JSON.parse(input);
    } catch {
      return {
        query,
        issues: [{ level: 'error', path: '', message: '返回内容不是合法 JSON' }],
        actionable: false,
      };
    }
  }

  if (!isPlainObject(input)) {
    return {
      query,
      issues: [{ level: 'error', path: '', message: '返回内容不是对象' }],
      actionable: false,
    };
  }

  const schema = buildAITableSchema(columns, options);
  const colMap = new Map(schema.columns.map((c) => [c.key, c]));

  // ---- filter ----
  if (input.filter === null) {
    query.filter = null; // 显式清空是有意义的意图（「取消筛选」）
  } else if (input.filter !== undefined) {
    const node = normalizeNode(input.filter, colMap, 'filter', issues, 0);
    if (node) {
      // 顶层恒为组：模型直接给单个条件时补一层，免得调用方还要判断
      query.filter = node.kind === 'group' ? node : { kind: 'group', logic: 'and', children: [node] };
    }
  }

  // ---- sort ----
  if (Array.isArray(input.sort)) {
    const sort: SortSpec[] = [];
    const seen = new Set<string>();
    input.sort.forEach((s, i) => {
      const path = `sort[${i}]`;
      if (!isPlainObject(s)) {
        issues.push({ level: 'error', path, message: '不是合法的排序项，已丢弃' });
        return;
      }
      const colKey = typeof s.colKey === 'string' ? s.colKey : '';
      const col = colMap.get(colKey);
      if (!col) {
        issues.push({ level: 'error', path, message: `列 "${colKey}" 不存在，该排序已丢弃` });
        return;
      }
      if (!col.sortable) {
        issues.push({ level: 'error', path, message: `列 "${col.label}" 不可排序，该排序已丢弃` });
        return;
      }
      if (seen.has(colKey)) {
        issues.push({ level: 'warn', path, message: `列 "${col.label}" 重复出现，已保留第一次` });
        return;
      }
      seen.add(colKey);
      const order = s.order === 'desc' ? 'desc' : 'asc';
      if (s.order !== 'asc' && s.order !== 'desc') {
        issues.push({ level: 'warn', path, message: `order "${String(s.order)}" 不合法，已按 asc 处理` });
      }
      sort.push({ colKey, order });
    });
    query.sort = sort;
  }

  // ---- columns ----
  if (Array.isArray(input.columns)) {
    const cols: string[] = [];
    for (const c of input.columns) {
      const key = String(c);
      if (!colMap.has(key)) {
        issues.push({ level: 'error', path: 'columns', message: `列 "${key}" 不存在，已忽略` });
        continue;
      }
      if (!cols.includes(key)) cols.push(key);
    }
    // 一列都没留下时不能应用：那会把所有可隐藏列全藏掉，等于清空表格
    if (cols.length > 0) query.columns = cols;
    else if (input.columns.length > 0) {
      issues.push({ level: 'error', path: 'columns', message: '没有任何有效列，已忽略列显隐调整' });
    }
  }

  // ---- search / explanation ----
  if (typeof input.search === 'string' && input.search.trim() !== '') query.search = input.search.trim();
  if (typeof input.explanation === 'string') query.explanation = input.explanation;

  const actionable =
    query.filter !== undefined ||
    (query.sort?.length ?? 0) > 0 ||
    (query.columns?.length ?? 0) > 0 ||
    query.search !== undefined;

  return { query, issues, actionable };
}

// ---------------------------------------------------------------------------
// 4. 映射到 VirtTableState
// ---------------------------------------------------------------------------

/**
 * 把规范化后的查询映射成 `setState()` 能吃的状态。
 *
 * `currentColumns` 只在 `query.columns` 存在时用到：需要在**保持现有列序与列宽**的
 * 前提下改显隐，所以得先把当前叶子列摊出来，而不是凭 `query.columns` 重造一份
 * ——后者会把用户拖过的列宽和列序一并抹掉。
 *
 * `search` 不进 `VirtTableState`（它不是可持久化视图状态，见 `VirtTableState` 注释），
 * 由 `vtAIQuery` 单独调 `setSearchTerm`。
 */
export function aiQueryToState<T extends Record<string, any>>(
  query: AIQuery,
  currentColumns: VirtTableColumn<T>[],
  stateVersion: number,
): VirtTableState {
  const state: VirtTableState = { version: stateVersion };

  if (query.filter !== undefined) state.filterModel = query.filter;
  if (query.sort) state.sort = query.sort.map((s) => ({ ...s }));

  if (query.columns && query.columns.length > 0) {
    const wanted = new Set(query.columns);
    const columns: VirtTableColumnState[] = currentColumns.map((col) => {
      const key = String(col.key);
      const entry: VirtTableColumnState = { key, width: col.width };
      // 功能列与不可隐藏的列不受「只看这几列」摆布，保持现状
      if (!isQueryableColumn(col) || col.hideable === false) entry.hidden = !!col.hidden;
      else entry.hidden = !wanted.has(key);
      return entry;
    });
    state.columns = columns;
  }

  return state;
}
