import { describe, it, expect } from 'vitest';
import type { VirtTableColumn } from './index';
import {
  buildAITableSchema,
  buildAIPromptContext,
  toAIToolJsonSchema,
  validateAIQuery,
  aiQueryToState,
} from './ai-query';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Row extends Record<string, any> {
  id: number;
  name: string;
  region: string;
  amount: number;
  date: string;
}

const columns: VirtTableColumn<Row>[] = [
  { key: 'idx', title: '序号', width: 60, type: 'index' },
  { key: 'name', title: '客户名称', width: 160 },
  {
    key: 'region',
    title: '大区',
    width: 120,
    filterType: 'enum',
    filters: [
      { label: '华东区', value: 'east' },
      { label: '华南区', value: 'south' },
    ],
  },
  { key: 'amount', title: '销售额', width: 120, filterType: 'number-range' },
  { key: 'date', title: '签约日期', width: 140, filterType: 'date-range' },
  { key: 'note', title: '备注', width: 200, sortable: false, hideable: false },
];

const cond = (colKey: string, operator: string, value?: unknown, value2?: unknown) => ({
  kind: 'condition',
  colKey,
  operator,
  ...(value !== undefined ? { value } : {}),
  ...(value2 !== undefined ? { value2 } : {}),
});
const group = (logic: 'and' | 'or', ...children: unknown[]) => ({ kind: 'group', logic, children });

const errors = (issues: Array<{ level: string }>) => issues.filter((i) => i.level === 'error');
const warns = (issues: Array<{ level: string }>) => issues.filter((i) => i.level === 'warn');

describe('buildAITableSchema', () => {
  it('跳过功能列，只描述可查询的数据列', () => {
    const schema = buildAITableSchema(columns);
    expect(schema.columns.map((c) => c.key)).toEqual(['name', 'region', 'amount', 'date', 'note']);
  });

  it('推断值域类别并给出对应算子', () => {
    const schema = buildAITableSchema(columns);
    const byKey = new Map(schema.columns.map((c) => [c.key, c]));
    expect(byKey.get('name')!.kind).toBe('text');
    expect(byKey.get('region')!.kind).toBe('enum');
    expect(byKey.get('amount')!.kind).toBe('number');
    expect(byKey.get('date')!.kind).toBe('date');
    expect(byKey.get('amount')!.operators).toContain('gt');
    expect(byKey.get('amount')!.operators).not.toContain('contains');
  });

  it('带出枚举候选的 label / value 对', () => {
    const region = buildAITableSchema(columns).columns.find((c) => c.key === 'region')!;
    expect(region.enumValues).toEqual([
      { label: '华东区', value: 'east' },
      { label: '华南区', value: 'south' },
    ]);
  });

  it('枚举候选超过上限时截断', () => {
    const many: VirtTableColumn<Row>[] = [
      {
        key: 'region',
        title: '大区',
        width: 100,
        filters: Array.from({ length: 80 }, (_, i) => ({ label: `L${i}`, value: i })),
      },
    ];
    const schema = buildAITableSchema(many, { maxEnumValues: 10 });
    expect(schema.columns[0].enumValues).toHaveLength(10);
  });

  it('sortable / hideable 如实反映', () => {
    const note = buildAITableSchema(columns).columns.find((c) => c.key === 'note')!;
    expect(note.sortable).toBe(false);
    expect(note.hideable).toBe(false);
  });

  it('today 可注入，保证可测性', () => {
    expect(buildAITableSchema(columns, { now: new Date(2026, 7, 12) }).today).toBe('2026-08-12');
  });
});

describe('buildAIPromptContext', () => {
  const text = buildAIPromptContext(buildAITableSchema(columns, { now: new Date(2026, 7, 12) }));

  it('写明基准日期，供模型换算相对时间', () => {
    expect(text).toContain('今天是 2026-08-12');
  });

  it('列出 key 与标题的对应，模型才能把「销售额」对上 amount', () => {
    expect(text).toContain('amount（销售额）');
  });

  it('枚举列给出 label=value 的映射', () => {
    expect(text).toContain('华东区="east"');
  });

  it('标注不可排序的列', () => {
    expect(text).toContain('该列不可排序');
  });
});

describe('toAIToolJsonSchema', () => {
  const js = toAIToolJsonSchema(buildAITableSchema(columns)) as any;

  it('用 enum 收窄列 key，把幻觉挡在生成阶段', () => {
    expect(js.$defs.condition.properties.colKey.enum).toEqual([
      'name',
      'region',
      'amount',
      'date',
      'note',
    ]);
  });

  it('排序只允许可排序的列', () => {
    expect(js.properties.sort.items.properties.colKey.enum).not.toContain('note');
  });

  it('条件树用 $ref 表达递归', () => {
    expect(js.$defs.group.properties.children.items.anyOf).toEqual([
      { $ref: '#/$defs/condition' },
      { $ref: '#/$defs/group' },
    ]);
  });
});

describe('validateAIQuery — 结构与入口', () => {
  it('接受字符串形态的 JSON', () => {
    const r = validateAIQuery(JSON.stringify({ sort: [{ colKey: 'amount', order: 'desc' }] }), columns);
    expect(r.query.sort).toEqual([{ colKey: 'amount', order: 'desc' }]);
  });

  it('非法 JSON 整体报错且不可应用', () => {
    const r = validateAIQuery('{ 这不是 json', columns);
    expect(r.actionable).toBe(false);
    expect(errors(r.issues)).toHaveLength(1);
  });

  it('非对象返回值整体报错', () => {
    expect(validateAIQuery(42, columns).actionable).toBe(false);
  });

  it('空对象无可应用内容', () => {
    const r = validateAIQuery({ explanation: '没听懂' }, columns);
    expect(r.actionable).toBe(false);
    expect(r.query.explanation).toBe('没听懂');
  });

  it('顶层直接给 condition 时自动包一层 group', () => {
    const r = validateAIQuery({ filter: cond('amount', 'gt', 100) }, columns);
    expect(r.query.filter).toEqual({
      kind: 'group',
      logic: 'and',
      children: [{ kind: 'condition', colKey: 'amount', operator: 'gt', value: 100 }],
    });
  });

  it('filter: null 是「清空筛选」的有效意图', () => {
    const r = validateAIQuery({ filter: null }, columns);
    expect(r.query.filter).toBeNull();
    expect(r.actionable).toBe(true);
  });

  it('嵌套过深的畸形结构被截断而不是打穿栈', () => {
    let node: any = cond('amount', 'gt', 1);
    for (let i = 0; i < 15; i++) node = group('and', node);
    const r = validateAIQuery({ filter: node }, columns);
    expect(errors(r.issues).some((e) => e.message.includes('嵌套过深'))).toBe(true);
  });
});

describe('validateAIQuery — 幻觉与非法算子', () => {
  it('幻觉出的列名被丢弃并报 error', () => {
    const r = validateAIQuery({ filter: group('and', cond('profit', 'gt', 100)) }, columns);
    expect(r.query.filter).toBeUndefined();
    expect(errors(r.issues)[0].message).toContain('profit');
  });

  it('幻觉列与真实列混在一起时，只丢幻觉的那条', () => {
    const r = validateAIQuery(
      { filter: group('and', cond('profit', 'gt', 100), cond('amount', 'gt', 50)) },
      columns,
    );
    expect((r.query.filter as any).children).toHaveLength(1);
    expect((r.query.filter as any).children[0].colKey).toBe('amount');
    expect(errors(r.issues)).toHaveLength(1);
  });

  it('列不支持的算子被丢弃', () => {
    const r = validateAIQuery({ filter: group('and', cond('amount', 'contains', 'x')) }, columns);
    expect(r.query.filter).toBeUndefined();
    expect(errors(r.issues)[0].message).toContain('不支持算子');
  });

  it('枚举列收窄掉 eq 后，模型给的 eq 被救成 in 而不是丢弃', () => {
    // 列上用 filterOperators 只留 in/notIn 时，eq 不再合法；但它的语义就是单元素 in，可救
    const narrowed: VirtTableColumn<Row>[] = [
      { ...columns[2], filterOperators: ['in', 'notIn'] } as VirtTableColumn<Row>,
    ];
    const r = validateAIQuery({ filter: group('and', cond('region', 'eq', 'east')) }, narrowed);
    const c = (r.query.filter as any).children[0];
    expect(c.operator).toBe('in');
    expect(c.value).toEqual(['east']);
    expect(warns(r.issues)[0].message).toContain('已改为 in');
  });

  it('枚举列默认算子含 eq，此时不改算子但仍回译 label', () => {
    const r = validateAIQuery({ filter: group('and', cond('region', 'eq', '华东区')) }, columns);
    const c = (r.query.filter as any).children[0];
    expect(c.operator).toBe('eq');
    expect(c.value).toBe('east');
  });

  it('缺少必填取值的条件被丢弃', () => {
    const r = validateAIQuery({ filter: group('and', cond('amount', 'gt')) }, columns);
    expect(r.query.filter).toBeUndefined();
    expect(errors(r.issues)[0].message).toContain('缺少取值');
  });

  it('无操作数的算子不需要值', () => {
    const r = validateAIQuery({ filter: group('and', cond('name', 'isEmpty')) }, columns);
    expect((r.query.filter as any).children[0]).toEqual({
      kind: 'condition',
      colKey: 'name',
      operator: 'isEmpty',
    });
  });

  it('子节点全部无效时整个组被丢弃，而不是留一个空组', () => {
    const r = validateAIQuery({ filter: group('or', cond('ghost', 'eq', 1), cond('ghost2', 'eq', 2)) }, columns);
    expect(r.query.filter).toBeUndefined();
    expect(r.actionable).toBe(false);
  });

  it('非法 logic 回落 and 并告警', () => {
    const r = validateAIQuery({ filter: { kind: 'group', logic: 'xor', children: [cond('amount', 'gt', 1)] } }, columns);
    expect((r.query.filter as any).logic).toBe('and');
    expect(warns(r.issues)[0].message).toContain('logic');
  });

  it('缺 kind 时按结构推断', () => {
    const r = validateAIQuery(
      { filter: { logic: 'or', children: [{ colKey: 'amount', operator: 'gt', value: 1 }] } },
      columns,
    );
    expect((r.query.filter as any).logic).toBe('or');
    expect((r.query.filter as any).children[0].kind).toBe('condition');
  });
});

describe('validateAIQuery — 值的类型纠正', () => {
  it('数字列的字符串值被转成数字', () => {
    const r = validateAIQuery({ filter: group('and', cond('amount', 'gt', '1000000')) }, columns);
    expect((r.query.filter as any).children[0].value).toBe(1000000);
  });

  it('容忍千分位写法', () => {
    const r = validateAIQuery({ filter: group('and', cond('amount', 'gt', '1,000,000')) }, columns);
    expect((r.query.filter as any).children[0].value).toBe(1000000);
  });

  it('数字列给了非数字则丢弃并报错', () => {
    const r = validateAIQuery({ filter: group('and', cond('amount', 'gt', '很多')) }, columns);
    expect(r.query.filter).toBeUndefined();
    expect(errors(r.issues)[0].message).toContain('无法解析为数字');
  });

  it('日期列保留原字符串（求值时再归一）但校验可解析性', () => {
    const ok = validateAIQuery({ filter: group('and', cond('date', 'gte', '2025-10-01')) }, columns);
    expect((ok.query.filter as any).children[0].value).toBe('2025-10-01');
    const bad = validateAIQuery({ filter: group('and', cond('date', 'gte', '去年双十一')) }, columns);
    expect(errors(bad.issues)[0].message).toContain('无法解析为日期');
  });

  it('between 只给一端也成立', () => {
    const r = validateAIQuery({ filter: group('and', cond('amount', 'between', 100)) }, columns);
    const c = (r.query.filter as any).children[0];
    expect(c.value).toBe(100);
    expect(c.value2).toBeUndefined();
  });

  it('between 两端都缺则丢弃', () => {
    const r = validateAIQuery({ filter: group('and', cond('amount', 'between')) }, columns);
    expect(errors(r.issues)[0].message).toContain('缺少边界值');
  });

  it('枚举列的 label 被回译成 value', () => {
    const r = validateAIQuery({ filter: group('and', cond('region', 'in', ['华东区'])) }, columns);
    expect((r.query.filter as any).children[0].value).toEqual(['east']);
    expect(warns(r.issues)[0].message).toContain('回译');
  });

  it('枚举列已经填对 value 时不产生告警', () => {
    const r = validateAIQuery({ filter: group('and', cond('region', 'in', ['east'])) }, columns);
    expect((r.query.filter as any).children[0].value).toEqual(['east']);
    expect(warns(r.issues)).toHaveLength(0);
  });

  it('枚举列大小写/空白不一致也能对上', () => {
    const r = validateAIQuery({ filter: group('and', cond('region', 'in', [' EAST '])) }, columns);
    expect((r.query.filter as any).children[0].value).toEqual(['east']);
  });

  it('多值算子给了单值时自动包成数组', () => {
    const r = validateAIQuery({ filter: group('and', cond('region', 'in', 'east')) }, columns);
    expect((r.query.filter as any).children[0].value).toEqual(['east']);
  });

  it('候选里没有的枚举值原样保留（数据里可能真有）', () => {
    const r = validateAIQuery({ filter: group('and', cond('region', 'in', ['west'])) }, columns);
    expect((r.query.filter as any).children[0].value).toEqual(['west']);
  });
});

describe('validateAIQuery — sort 与 columns', () => {
  it('丢弃不存在的排序列', () => {
    const r = validateAIQuery({ sort: [{ colKey: 'ghost', order: 'desc' }] }, columns);
    expect(r.query.sort).toEqual([]);
    expect(errors(r.issues)).toHaveLength(1);
  });

  it('丢弃不可排序的列', () => {
    const r = validateAIQuery({ sort: [{ colKey: 'note', order: 'asc' }] }, columns);
    expect(r.query.sort).toEqual([]);
    expect(errors(r.issues)[0].message).toContain('不可排序');
  });

  it('保留多列排序的顺序', () => {
    const r = validateAIQuery(
      { sort: [{ colKey: 'region', order: 'asc' }, { colKey: 'amount', order: 'desc' }] },
      columns,
    );
    expect(r.query.sort).toEqual([
      { colKey: 'region', order: 'asc' },
      { colKey: 'amount', order: 'desc' },
    ]);
  });

  it('重复列只保留第一次', () => {
    const r = validateAIQuery(
      { sort: [{ colKey: 'amount', order: 'desc' }, { colKey: 'amount', order: 'asc' }] },
      columns,
    );
    expect(r.query.sort).toEqual([{ colKey: 'amount', order: 'desc' }]);
    expect(warns(r.issues)[0].message).toContain('重复');
  });

  it('非法 order 回落 asc', () => {
    const r = validateAIQuery({ sort: [{ colKey: 'amount', order: '倒序' }] }, columns);
    expect(r.query.sort).toEqual([{ colKey: 'amount', order: 'asc' }]);
  });

  it('columns 过滤幻觉列并去重', () => {
    const r = validateAIQuery({ columns: ['name', 'ghost', 'name', 'amount'] }, columns);
    expect(r.query.columns).toEqual(['name', 'amount']);
    expect(errors(r.issues)[0].message).toContain('ghost');
  });

  it('columns 全部无效时整体忽略，避免把表格藏空', () => {
    const r = validateAIQuery({ columns: ['ghost1', 'ghost2'] }, columns);
    expect(r.query.columns).toBeUndefined();
    expect(r.actionable).toBe(false);
  });

  it('search 去除首尾空白，空串视为没有', () => {
    expect(validateAIQuery({ search: '  上海  ' }, columns).query.search).toBe('上海');
    expect(validateAIQuery({ search: '   ' }, columns).query.search).toBeUndefined();
  });
});

describe('aiQueryToState', () => {
  it('筛选与排序直接映射', () => {
    const state = aiQueryToState(
      { filter: group('and', cond('amount', 'gt', 100)) as any, sort: [{ colKey: 'amount', order: 'desc' }] },
      columns,
      1,
    );
    expect(state.version).toBe(1);
    expect(state.filterModel).toBeTruthy();
    expect(state.sort).toEqual([{ colKey: 'amount', order: 'desc' }]);
  });

  it('不给 columns 时状态里就没有 columns 字段（保持现状语义）', () => {
    const state = aiQueryToState({ sort: [] }, columns, 1);
    expect('columns' in state).toBe(false);
  });

  it('「只看这几列」隐藏其余可隐藏列，并保留现有列宽与列序', () => {
    const state = aiQueryToState({ columns: ['name', 'amount'] }, columns, 1);
    const byKey = new Map(state.columns!.map((c) => [c.key, c]));
    expect(state.columns!.map((c) => c.key)).toEqual(['idx', 'name', 'region', 'amount', 'date', 'note']);
    expect(byKey.get('name')!.hidden).toBe(false);
    expect(byKey.get('amount')!.hidden).toBe(false);
    expect(byKey.get('region')!.hidden).toBe(true);
    expect(byKey.get('name')!.width).toBe(160);
  });

  it('功能列与 hideable:false 的列不受摆布', () => {
    const state = aiQueryToState({ columns: ['name'] }, columns, 1);
    const byKey = new Map(state.columns!.map((c) => [c.key, c]));
    expect(byKey.get('idx')!.hidden).toBe(false);
    expect(byKey.get('note')!.hidden).toBe(false);
  });

  it('filter: null 落成 filterModel: null（清空）', () => {
    const state = aiQueryToState({ filter: null }, columns, 1);
    expect('filterModel' in state).toBe(true);
    expect(state.filterModel).toBeNull();
  });

  it('search 不进视图状态（它不是可持久化字段）', () => {
    const state = aiQueryToState({ search: '上海' }, columns, 1);
    expect(Object.keys(state)).toEqual(['version']);
  });
});
