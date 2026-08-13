import { describe, it, expect } from 'vitest';
import {
  type FilterCondition,
  type FilterGroup,
  applyFilterModel,
  buildFilterModelPredicate,
  cloneFilterModel,
  countConditions,
  createFilterGroup,
  evalCondition,
  inferValueKind,
  isConditionComplete,
  isFilterModelActive,
  operandCount,
  operatorsForColumn,
} from './filter-model';
import { buildColumnFilterPredicate, filterPreserveStructure } from './pipeline';
import type { VirtTableColumn } from './index';

type Row = {
  id: number;
  name: string;
  age: number;
  city: string;
  date: string;
  note?: string | null;
  children?: Row[];
};

const cols: VirtTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80, filterValueKind: 'number' },
  { key: 'name', title: '姓名', width: 120, filterType: 'text' },
  { key: 'age', title: '年龄', width: 80, filterType: 'number-range' },
  {
    key: 'city',
    title: '城市',
    width: 100,
    filters: [
      { label: '北京', value: 'bj' },
      { label: '上海', value: 'sh' },
    ],
  },
  { key: 'date', title: '日期', width: 120, filterType: 'date-range' },
  { key: 'note', title: '备注', width: 120 },
];

const colOf = (key: string): VirtTableColumn<Row> => cols.find((c) => c.key === key)!;

const rows: Row[] = [
  { id: 1, name: 'Alice', age: 20, city: 'bj', date: '2024-01-10', note: 'x' },
  { id: 2, name: 'Bob', age: 30, city: 'sh', date: '2024-05-20', note: '' },
  { id: 3, name: 'Carol', age: 40, city: 'bj', date: '2024-09-30', note: null },
];

const cond = (c: Partial<FilterCondition>): FilterCondition => ({
  kind: 'condition',
  colKey: 'name',
  operator: 'contains',
  ...c,
});

const group = (logic: 'and' | 'or', children: FilterGroup['children']): FilterGroup => ({
  kind: 'group',
  logic,
  children,
});

const namesOf = (list: Row[]): string[] => list.map((r) => r.name);

// --------------- 元信息推断 ---------------

describe('inferValueKind', () => {
  it('filterValueKind 优先级最高', () => {
    expect(inferValueKind(colOf('id'))).toBe('number');
  });
  it('由 filterType 推断', () => {
    expect(inferValueKind(colOf('name'))).toBe('text');
    expect(inferValueKind(colOf('age'))).toBe('number');
    expect(inferValueKind(colOf('date'))).toBe('date');
  });
  it('有 filters 候选则为 enum', () => {
    expect(inferValueKind(colOf('city'))).toBe('enum');
  });
  it('无任何配置回落 text', () => {
    expect(inferValueKind(colOf('note'))).toBe('text');
  });
});

describe('operatorsForColumn', () => {
  it('按值域给候选算子', () => {
    expect(operatorsForColumn(colOf('age'))).toContain('between');
    expect(operatorsForColumn(colOf('city'))).toContain('in');
  });
  it('filterOperators 收窄候选', () => {
    const col: VirtTableColumn<Row> = { key: 'name', title: '姓名', width: 100, filterOperators: ['eq'] };
    expect(operatorsForColumn(col)).toEqual(['eq']);
  });
  it('收窄后为空时回落全集（避免 UI 无可选项）', () => {
    const col: VirtTableColumn<Row> = {
      key: 'name',
      title: '姓名',
      width: 100,
      filterType: 'text',
      filterOperators: ['between'], // text 类别没有 between
    };
    expect(operatorsForColumn(col).length).toBeGreaterThan(1);
  });
});

describe('operandCount', () => {
  it('区分无值/单值/双值/多值', () => {
    expect(operandCount('isEmpty')).toBe(0);
    expect(operandCount('isNotEmpty')).toBe(0);
    expect(operandCount('eq')).toBe(1);
    expect(operandCount('between')).toBe(2);
    expect(operandCount('in')).toBe('multi');
  });
});

// --------------- 条件完整性 ---------------

describe('isConditionComplete', () => {
  it('无值算子恒完整', () => {
    expect(isConditionComplete(cond({ operator: 'isEmpty' }))).toBe(true);
  });
  it('单值算子缺值不完整', () => {
    expect(isConditionComplete(cond({ operator: 'eq' }))).toBe(false);
    expect(isConditionComplete(cond({ operator: 'eq', value: '' }))).toBe(false);
    expect(isConditionComplete(cond({ operator: 'eq', value: 0 }))).toBe(true);
  });
  it('between 单边界也算完整', () => {
    expect(isConditionComplete(cond({ colKey: 'age', operator: 'between', value: 10 }))).toBe(true);
    expect(isConditionComplete(cond({ colKey: 'age', operator: 'between', value2: 10 }))).toBe(true);
    expect(isConditionComplete(cond({ colKey: 'age', operator: 'between' }))).toBe(false);
  });
  it('多值算子需非空数组', () => {
    expect(isConditionComplete(cond({ colKey: 'city', operator: 'in', value: [] }))).toBe(false);
    expect(isConditionComplete(cond({ colKey: 'city', operator: 'in', value: ['bj'] }))).toBe(true);
  });
  it('缺 colKey 不完整', () => {
    expect(isConditionComplete(cond({ colKey: '', operator: 'isEmpty' }))).toBe(false);
  });
});

// --------------- 单条件求值 ---------------

describe('evalCondition', () => {
  const row = rows[1]; // Bob / 30 / sh / 2024-05-20 / note:''

  it('text 类算子不区分大小写', () => {
    expect(evalCondition(cond({ value: 'bo' }), colOf('name'), row)).toBe(true);
    expect(evalCondition(cond({ operator: 'notContains', value: 'bo' }), colOf('name'), row)).toBe(false);
    expect(evalCondition(cond({ operator: 'startsWith', value: 'B' }), colOf('name'), row)).toBe(true);
    expect(evalCondition(cond({ operator: 'endsWith', value: 'B' }), colOf('name'), row)).toBe(true); // bob 以 b 结尾
    expect(evalCondition(cond({ operator: 'endsWith', value: 'OB' }), colOf('name'), row)).toBe(true);
    expect(evalCondition(cond({ operator: 'endsWith', value: 'A' }), colOf('name'), row)).toBe(false);
  });

  it('数值比较', () => {
    const c = (operator: FilterCondition['operator'], value: unknown): FilterCondition =>
      cond({ colKey: 'age', operator, value });
    expect(evalCondition(c('gt', 20), colOf('age'), row)).toBe(true);
    expect(evalCondition(c('gt', 30), colOf('age'), row)).toBe(false);
    expect(evalCondition(c('gte', 30), colOf('age'), row)).toBe(true);
    expect(evalCondition(c('lt', 30), colOf('age'), row)).toBe(false);
    expect(evalCondition(c('lte', 30), colOf('age'), row)).toBe(true);
    expect(evalCondition(c('eq', 30), colOf('age'), row)).toBe(true);
    expect(evalCondition(c('neq', 30), colOf('age'), row)).toBe(false);
  });

  it('字符串数值也能按数值比较（输入框回填的字符串）', () => {
    expect(evalCondition(cond({ colKey: 'age', operator: 'gt', value: '20' }), colOf('age'), row)).toBe(true);
  });

  it('between 是闭区间', () => {
    const c = cond({ colKey: 'age', operator: 'between', value: 30, value2: 40 });
    expect(evalCondition(c, colOf('age'), row)).toBe(true);
    expect(evalCondition({ ...c, value: 31 }, colOf('age'), row)).toBe(false);
    expect(evalCondition({ ...c, value: 10, value2: 30 }, colOf('age'), row)).toBe(true);
    expect(evalCondition({ ...c, value: 10, value2: 29 }, colOf('age'), row)).toBe(false);
  });

  it('between 只给一端时当单边界', () => {
    expect(
      evalCondition(cond({ colKey: 'age', operator: 'between', value: 40 }), colOf('age'), row),
    ).toBe(false);
    expect(
      evalCondition(cond({ colKey: 'age', operator: 'between', value2: 40 }), colOf('age'), row),
    ).toBe(true);
  });

  it('date 字符串归一为时间戳比较', () => {
    expect(evalCondition(cond({ colKey: 'date', operator: 'gt', value: '2024-01-01' }), colOf('date'), row)).toBe(true);
    expect(evalCondition(cond({ colKey: 'date', operator: 'lt', value: '2024-01-01' }), colOf('date'), row)).toBe(false);
    expect(
      evalCondition(
        cond({ colKey: 'date', operator: 'between', value: '2024-05-01', value2: '2024-05-31' }),
        colOf('date'),
        row,
      ),
    ).toBe(true);
  });

  it('日期/数字无法解析的单元格不命中', () => {
    const bad = { ...row, date: 'not-a-date' };
    expect(evalCondition(cond({ colKey: 'date', operator: 'gt', value: '2024-01-01' }), colOf('date'), bad)).toBe(false);
  });

  it('isEmpty 覆盖 null/undefined/空串，但不含 0 与 false', () => {
    const c = cond({ colKey: 'note', operator: 'isEmpty' });
    expect(evalCondition(c, colOf('note'), rows[0])).toBe(false); // 'x'
    expect(evalCondition(c, colOf('note'), rows[1])).toBe(true); // ''
    expect(evalCondition(c, colOf('note'), rows[2])).toBe(true); // null
    expect(evalCondition(c, colOf('note'), { ...rows[0], note: undefined })).toBe(true);
    expect(evalCondition({ ...c, colKey: 'age' }, colOf('age'), { ...row, age: 0 })).toBe(false);
  });

  it('isNotEmpty 是 isEmpty 的反面', () => {
    const c = cond({ colKey: 'note', operator: 'isNotEmpty' });
    expect(evalCondition(c, colOf('note'), rows[0])).toBe(true);
    expect(evalCondition(c, colOf('note'), rows[2])).toBe(false);
  });

  it('in / notIn 复用枚举语义', () => {
    expect(evalCondition(cond({ colKey: 'city', operator: 'in', value: ['sh'] }), colOf('city'), row)).toBe(true);
    expect(evalCondition(cond({ colKey: 'city', operator: 'in', value: ['bj'] }), colOf('city'), row)).toBe(false);
    expect(evalCondition(cond({ colKey: 'city', operator: 'notIn', value: ['bj'] }), colOf('city'), row)).toBe(true);
    expect(
      evalCondition(cond({ colKey: 'city', operator: 'in', value: ['bj', 'sh'] }), colOf('city'), row),
    ).toBe(true);
  });

  it('in / notIn 尊重列的 filterMethod', () => {
    const col: VirtTableColumn<Row> = {
      key: 'city',
      title: '城市',
      width: 100,
      filters: [{ label: '北京', value: 'bj' }],
      filterMethod: (value, r) => r.city !== value, // 故意反向
    };
    expect(evalCondition(cond({ colKey: 'city', operator: 'in', value: ['bj'] }), col, row)).toBe(true);
    expect(evalCondition(cond({ colKey: 'city', operator: 'notIn', value: ['bj'] }), col, row)).toBe(false);
  });

  it('eq 对文本列做宽松比较（数字 1 与 "1" 视为相等）', () => {
    const col: VirtTableColumn<Row> = { key: 'note', title: '备注', width: 100 };
    expect(evalCondition(cond({ colKey: 'note', operator: 'eq', value: 1 }), col, { ...row, note: '1' })).toBe(true);
  });

  it('列不存在或条件不完整时视为通过', () => {
    expect(evalCondition(cond({ colKey: 'ghost', operator: 'eq', value: 1 }), undefined, row)).toBe(true);
    expect(evalCondition(cond({ operator: 'contains' }), colOf('name'), row)).toBe(true);
  });
});

// --------------- 条件树求值 ---------------

describe('buildFilterModelPredicate + 嵌套逻辑', () => {
  const pick = (model: FilterGroup): string[] => {
    const p = buildFilterModelPredicate(model, cols);
    return p ? namesOf(rows.filter(p)) : namesOf(rows);
  };

  it('and 组：全部满足', () => {
    expect(
      pick(
        group('and', [
          cond({ colKey: 'age', operator: 'gte', value: 30 }),
          cond({ colKey: 'city', operator: 'in', value: ['bj'] }),
        ]),
      ),
    ).toEqual(['Carol']);
  });

  it('or 组：任一满足', () => {
    expect(
      pick(
        group('or', [
          cond({ colKey: 'age', operator: 'lt', value: 25 }),
          cond({ colKey: 'city', operator: 'in', value: ['sh'] }),
        ]),
      ),
    ).toEqual(['Alice', 'Bob']);
  });

  it('嵌套：A 且 (B 或 C)', () => {
    const model = group('and', [
      cond({ colKey: 'age', operator: 'gte', value: 30 }),
      group('or', [
        cond({ colKey: 'name', operator: 'contains', value: 'bo' }),
        cond({ colKey: 'city', operator: 'in', value: ['bj'] }),
      ]),
    ]);
    expect(pick(model)).toEqual(['Bob', 'Carol']);
  });

  it('深层嵌套（三层）', () => {
    const model = group('and', [
      cond({ colKey: 'id', operator: 'gt', value: 0 }),
      group('or', [
        group('and', [
          cond({ colKey: 'age', operator: 'gte', value: 40 }),
          cond({ colKey: 'city', operator: 'in', value: ['bj'] }),
        ]),
        cond({ colKey: 'name', operator: 'eq', value: 'Alice' }),
      ]),
    ]);
    expect(pick(model)).toEqual(['Alice', 'Carol']);
  });

  it('空组 / 未完成条件 / 孤儿列都视为通过（不把表筛空）', () => {
    expect(buildFilterModelPredicate(createFilterGroup('and'), cols)).toBeNull();
    expect(buildFilterModelPredicate(group('and', [cond({ operator: 'contains' })]), cols)).toBeNull();
    expect(
      buildFilterModelPredicate(group('and', [cond({ colKey: 'ghost', operator: 'eq', value: 1 })]), cols),
    ).toBeNull();
    expect(buildFilterModelPredicate(null, cols)).toBeNull();
  });

  it('or 组内混有未完成条件时只按已完成的求值', () => {
    const model = group('or', [
      cond({ colKey: 'name', operator: 'eq', value: 'Alice' }),
      cond({ colKey: 'name', operator: 'eq' }), // 未完成，应被忽略而非放行全部
    ]);
    expect(pick(model)).toEqual(['Alice']);
  });

  it('and 组内的未完成条件不影响结果', () => {
    const model = group('and', [
      cond({ colKey: 'name', operator: 'eq', value: 'Alice' }),
      cond({ colKey: 'age', operator: 'between' }),
    ]);
    expect(pick(model)).toEqual(['Alice']);
  });

  it('嵌套空组不影响父组结果', () => {
    const model = group('and', [
      cond({ colKey: 'city', operator: 'in', value: ['bj'] }),
      createFilterGroup('or'),
    ]);
    expect(pick(model)).toEqual(['Alice', 'Carol']);
  });
});

// --------------- 状态辅助 ---------------

describe('isFilterModelActive / countConditions', () => {
  it('只有完整条件才算生效', () => {
    expect(isFilterModelActive(null)).toBe(false);
    expect(isFilterModelActive(createFilterGroup('and'))).toBe(false);
    expect(isFilterModelActive(group('and', [cond({ operator: 'eq' })]))).toBe(false);
    expect(isFilterModelActive(group('and', [cond({ operator: 'eq', value: 'a' })]))).toBe(true);
  });
  it('嵌套组里的条件也计入', () => {
    const model = group('and', [group('or', [cond({ operator: 'eq', value: 'a' })])]);
    expect(isFilterModelActive(model)).toBe(true);
    expect(countConditions(model)).toBe(1);
  });
  it('countConditions 只数完整条件', () => {
    const model = group('and', [
      cond({ operator: 'eq', value: 'a' }),
      cond({ operator: 'eq' }),
      cond({ operator: 'isEmpty' }),
    ]);
    expect(countConditions(model)).toBe(2);
  });
});

describe('cloneFilterModel', () => {
  it('深拷贝：改动副本不影响原模型', () => {
    const model = group('and', [
      group('or', [cond({ colKey: 'city', operator: 'in', value: ['bj'] })]),
    ]);
    const copy = cloneFilterModel(model)!;
    const inner = copy.children[0] as FilterGroup;
    (inner.children[0] as FilterCondition).value = ['sh'];
    inner.logic = 'and';
    const origInner = model.children[0] as FilterGroup;
    expect((origInner.children[0] as FilterCondition).value).toEqual(['bj']);
    expect(origInner.logic).toBe('or');
  });
  it('null 原样返回', () => {
    expect(cloneFilterModel(null)).toBeNull();
  });
});

// --------------- 结构保持与组合 ---------------

describe('applyFilterModel', () => {
  const tree: Row[] = [
    {
      id: 1,
      name: 'Root',
      age: 99,
      city: 'bj',
      date: '2024-01-01',
      children: [
        { id: 2, name: 'Alice', age: 20, city: 'bj', date: '2024-01-10' },
        { id: 3, name: 'Bob', age: 30, city: 'sh', date: '2024-05-20' },
      ],
    },
  ];

  it('无生效条件时返回同一引用', () => {
    expect(applyFilterModel(rows, null, cols)).toBe(rows);
    expect(applyFilterModel(rows, createFilterGroup('and'), cols)).toBe(rows);
  });

  it('扁平行返回同一引用（保证单元格编辑写回）', () => {
    const out = applyFilterModel(rows, group('and', [cond({ colKey: 'name', operator: 'eq', value: 'Bob' })]), cols);
    expect(out).toHaveLength(1);
    expect(out[0]).toBe(rows[1]);
  });

  it('树形：命中子节点时保留祖先', () => {
    const out = applyFilterModel(tree, group('and', [cond({ colKey: 'name', operator: 'eq', value: 'Bob' })]), cols);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Root');
    expect(namesOf(out[0].children!)).toEqual(['Bob']);
  });

  it('树形：祖先与子节点都不命中则整体剔除', () => {
    const out = applyFilterModel(tree, group('and', [cond({ colKey: 'name', operator: 'eq', value: 'Zoe' })]), cols);
    expect(out).toHaveLength(0);
  });
});

describe('与列头筛选组合（AND）', () => {
  it('两个谓词组合等价于交集', () => {
    const pCol = buildColumnFilterPredicate(new Map([['city', ['bj']]]), cols)!;
    const pModel = buildFilterModelPredicate(
      group('or', [
        cond({ colKey: 'age', operator: 'lt', value: 25 }),
        cond({ colKey: 'age', operator: 'gt', value: 35 }),
      ]),
      cols,
    )!;
    const out = filterPreserveStructure(rows, (r) => pCol(r) && pModel(r));
    expect(namesOf(out)).toEqual(['Alice', 'Carol']);
  });
});
