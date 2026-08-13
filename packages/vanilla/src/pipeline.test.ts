import { describe, it, expect } from 'vitest';
import {
  compareValues,
  buildComparator,
  sortPreserveStructure,
  matchFilter,
  applyRowFilters,
  filterPreserveStructure,
  buildColumnFilterPredicate,
  collectLeaves,
  type SortSpec,
} from './pipeline';
import type { VirtTableColumn } from './index';

type Row = { id: number; name: string; age: number; children?: Row[] };

const cols: VirtTableColumn<Row>[] = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: 'Name', width: 120 },
  { key: 'age', title: 'Age', width: 80 },
];

// --------------- compareValues ---------------

describe('compareValues', () => {
  it('数字按大小', () => {
    expect(compareValues(1, 2)).toBeLessThan(0);
    expect(compareValues(2, 1)).toBeGreaterThan(0);
    expect(compareValues(2, 2)).toBe(0);
  });
  it('null/undefined 最小', () => {
    expect(compareValues(null, 1)).toBeLessThan(0);
    expect(compareValues(1, undefined)).toBeGreaterThan(0);
    expect(compareValues(null, null)).toBe(0);
  });
  it('字符串字典序', () => {
    expect(compareValues('a', 'b')).toBeLessThan(0);
    expect(compareValues('b', 'a')).toBeGreaterThan(0);
  });
});

// --------------- buildComparator ---------------

describe('buildComparator', () => {
  it('无排序返回 null', () => {
    expect(buildComparator([], cols)).toBeNull();
  });

  it('单列升序', () => {
    const cmp = buildComparator([{ colKey: 'age', order: 'asc' }], cols)!;
    const rows: Row[] = [
      { id: 1, name: 'c', age: 30 },
      { id: 2, name: 'a', age: 10 },
      { id: 3, name: 'b', age: 20 },
    ];
    const sorted = rows.slice().sort(cmp);
    expect(sorted.map((r) => r.age)).toEqual([10, 20, 30]);
  });

  it('单列降序', () => {
    const cmp = buildComparator([{ colKey: 'age', order: 'desc' }], cols)!;
    const rows: Row[] = [
      { id: 1, name: 'c', age: 30 },
      { id: 2, name: 'a', age: 10 },
    ];
    expect(rows.slice().sort(cmp).map((r) => r.age)).toEqual([30, 10]);
  });

  it('多列：先 age 升序，再 name 升序', () => {
    const state: SortSpec[] = [
      { colKey: 'age', order: 'asc' },
      { colKey: 'name', order: 'asc' },
    ];
    const cmp = buildComparator(state, cols)!;
    const rows: Row[] = [
      { id: 1, name: 'b', age: 20 },
      { id: 2, name: 'a', age: 20 },
      { id: 3, name: 'z', age: 10 },
    ];
    expect(rows.slice().sort(cmp).map((r) => r.name)).toEqual(['z', 'a', 'b']);
  });

  it('sortMethod 优先', () => {
    const c: VirtTableColumn<Row>[] = [
      { key: 'name', title: 'N', width: 80, sortMethod: (a, b) => a.name.length - b.name.length },
    ];
    const cmp = buildComparator([{ colKey: 'name', order: 'asc' }], c)!;
    const rows: Row[] = [
      { id: 1, name: 'aaa', age: 1 },
      { id: 2, name: 'a', age: 1 },
      { id: 3, name: 'aa', age: 1 },
    ];
    expect(rows.slice().sort(cmp).map((r) => r.name)).toEqual(['a', 'aa', 'aaa']);
  });

  it('等值保持原序（稳定）', () => {
    const cmp = buildComparator([{ colKey: 'age', order: 'asc' }], cols)!;
    const rows: Row[] = [
      { id: 1, name: 'a', age: 10 },
      { id: 2, name: 'b', age: 10 },
      { id: 3, name: 'c', age: 10 },
    ];
    expect(rows.slice().sort(cmp).map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it('未知列被忽略后无排序返回 null', () => {
    expect(buildComparator([{ colKey: 'nope', order: 'asc' }], cols)).toBeNull();
  });
});

// --------------- sortPreserveStructure ---------------

describe('sortPreserveStructure', () => {
  const cmp = buildComparator([{ colKey: 'age', order: 'asc' }], cols)!;

  it('扁平行返回同一引用（不克隆，保证编辑写回）', () => {
    const a: Row = { id: 1, name: 'a', age: 20 };
    const b: Row = { id: 2, name: 'b', age: 10 };
    const out = sortPreserveStructure([a, b], cmp);
    expect(out[0]).toBe(b); // 同一引用
    expect(out[1]).toBe(a);
  });

  it('递归排序 children，父节点浅克隆但不改原始顺序', () => {
    const orig: Row[] = [
      {
        id: 1,
        name: 'p',
        age: 5,
        children: [
          { id: 11, name: 'c2', age: 30 },
          { id: 12, name: 'c1', age: 10 },
        ],
      },
    ];
    const out = sortPreserveStructure(orig, cmp);
    expect(out[0].children!.map((c) => c.age)).toEqual([10, 30]);
    // 原始未被改动
    expect(orig[0].children!.map((c) => c.age)).toEqual([30, 10]);
  });
});

// --------------- matchFilter ---------------

describe('matchFilter', () => {
  const nameCol: VirtTableColumn<Row> = { key: 'name', title: 'N', width: 80 };

  it('enum 默认精确匹配', () => {
    expect(matchFilter(nameCol, ['a'], { id: 1, name: 'a', age: 1 })).toBe(true);
    expect(matchFilter(nameCol, ['a'], { id: 1, name: 'b', age: 1 })).toBe(false);
  });

  it('空 values 通过', () => {
    expect(matchFilter(nameCol, [], { id: 1, name: 'x', age: 1 })).toBe(true);
  });

  it('filterMethod 优先', () => {
    const col: VirtTableColumn<Row> = {
      key: 'age', title: 'A', width: 80,
      filterMethod: (v, row) => row.age > (v as number),
    };
    expect(matchFilter(col, [18], { id: 1, name: 'x', age: 20 })).toBe(true);
    expect(matchFilter(col, [18], { id: 1, name: 'x', age: 10 })).toBe(false);
  });

  it('text 子串不区分大小写', () => {
    const col: VirtTableColumn<Row> = { key: 'name', title: 'N', width: 80, filterType: 'text' };
    expect(matchFilter(col, ['AB'], { id: 1, name: 'xabcy', age: 1 })).toBe(true);
    expect(matchFilter(col, ['zz'], { id: 1, name: 'xabcy', age: 1 })).toBe(false);
  });

  it('number-range 区间', () => {
    const col: VirtTableColumn<Row> = { key: 'age', title: 'A', width: 80, filterType: 'number-range' };
    expect(matchFilter(col, [{ min: 10, max: 30 }], { id: 1, name: 'x', age: 20 })).toBe(true);
    expect(matchFilter(col, [{ min: 10, max: 30 }], { id: 1, name: 'x', age: 40 })).toBe(false);
    expect(matchFilter(col, [{ min: 10 }], { id: 1, name: 'x', age: 40 })).toBe(true);
  });

  it('date-range 区间', () => {
    const col: VirtTableColumn<any> = { key: 'd', title: 'D', width: 80, filterType: 'date-range' };
    expect(matchFilter(col, [{ start: '2024-01-01', end: '2024-12-31' }], { d: '2024-06-01' })).toBe(true);
    expect(matchFilter(col, [{ start: '2024-01-01', end: '2024-12-31' }], { d: '2025-06-01' })).toBe(false);
  });
});

// --------------- applyRowFilters ---------------

describe('applyRowFilters', () => {
  it('无筛选返回同一引用', () => {
    const rows: Row[] = [{ id: 1, name: 'a', age: 1 }];
    expect(applyRowFilters(rows, new Map(), cols)).toBe(rows);
  });

  it('扁平过滤，保留行返回同一引用', () => {
    const a: Row = { id: 1, name: 'a', age: 1 };
    const b: Row = { id: 2, name: 'b', age: 2 };
    const filters = new Map<string, any[]>([['name', ['a']]]);
    const out = applyRowFilters([a, b], filters, cols);
    expect(out).toEqual([a]);
    expect(out[0]).toBe(a);
  });

  it('树：保留命中节点及其含命中后代的祖先', () => {
    const tree: Row[] = [
      {
        id: 1, name: 'parent', age: 1,
        children: [
          { id: 11, name: 'keep', age: 2 },
          { id: 12, name: 'drop', age: 3 },
        ],
      },
      { id: 2, name: 'lonely', age: 4 },
    ];
    const filters = new Map<string, any[]>([['name', ['keep']]]);
    const out = applyRowFilters(tree, filters, cols);
    // parent 自身不命中，但因含命中子孙而保留
    expect(out.length).toBe(1);
    expect(out[0].id).toBe(1);
    expect(out[0].children!.map((c) => c.name)).toEqual(['keep']);
  });

  it('筛选项存在但值为空数组时不淘汰任何行', () => {
    const a: Row = { id: 1, name: 'a', age: 1 };
    const filters = new Map<string, any[]>([['name', []]]);
    expect(applyRowFilters([a], filters, cols)).toEqual([a]);
  });
});

// --------------- filterPreserveStructure / buildColumnFilterPredicate ---------------

describe('filterPreserveStructure', () => {
  it('扁平行返回同一引用', () => {
    const a: Row = { id: 1, name: 'a', age: 1 };
    const b: Row = { id: 2, name: 'b', age: 2 };
    const out = filterPreserveStructure([a, b], (r) => r.name === 'b');
    expect(out).toHaveLength(1);
    expect(out[0]).toBe(b);
  });

  it('树：保留含命中后代的祖先，且祖先被浅克隆（不改原数据）', () => {
    const kid: Row = { id: 11, name: 'keep', age: 2 };
    const parent: Row = { id: 1, name: 'p', age: 1, children: [kid, { id: 12, name: 'drop', age: 3 }] };
    const out = filterPreserveStructure([parent], (r) => r.name === 'keep');
    expect(out[0]).not.toBe(parent);
    expect(out[0].children).toEqual([kid]);
    expect(parent.children).toHaveLength(2); // 原数据未被改动
  });
});

describe('buildColumnFilterPredicate', () => {
  const rows: Row[] = [
    { id: 1, name: 'a', age: 10 },
    { id: 2, name: 'b', age: 20 },
  ];

  it('无筛选返回 null', () => {
    expect(buildColumnFilterPredicate(new Map(), cols)).toBeNull();
  });

  it('全为空值筛选返回 null', () => {
    expect(buildColumnFilterPredicate(new Map([['name', []]]), cols)).toBeNull();
  });

  it('未知列被忽略', () => {
    expect(buildColumnFilterPredicate(new Map([['ghost', ['x']]]), cols)).toBeNull();
  });

  it('多列之间是 AND', () => {
    const p = buildColumnFilterPredicate(
      new Map<string, any[]>([
        ['name', ['b']],
        ['age', [20]],
      ]),
      cols,
    )!;
    expect(rows.filter(p).map((r) => r.id)).toEqual([2]);
    const p2 = buildColumnFilterPredicate(
      new Map<string, any[]>([
        ['name', ['a']],
        ['age', [20]],
      ]),
      cols,
    )!;
    expect(rows.filter(p2)).toEqual([]);
  });
});

// --------------- collectLeaves ---------------

describe('collectLeaves', () => {
  it('扁平数据即所有行', () => {
    const rows: Row[] = [{ id: 1, name: 'a', age: 1 }, { id: 2, name: 'b', age: 2 }];
    expect(collectLeaves(rows)).toEqual(rows);
  });

  it('树只收叶子，避免父子双重计数', () => {
    const tree: Row[] = [
      {
        id: 1, name: 'p', age: 100,
        children: [
          { id: 11, name: 'a', age: 1 },
          { id: 12, name: 'b', age: 2 },
        ],
      },
    ];
    expect(collectLeaves(tree).map((r) => r.id)).toEqual([11, 12]);
  });
});
