import { describe, it, expect } from 'vitest';
import { inferColumns, humanizeKey } from './infer-columns';

/* eslint-disable @typescript-eslint/no-explicit-any */

const byKey = (cols: any[]) => new Map(cols.map((c) => [c.key, c]));

describe('humanizeKey', () => {
  it('camelCase 断词并首字母大写', () => {
    expect(humanizeKey('createdAt')).toBe('Created At');
    expect(humanizeKey('customerName')).toBe('Customer Name');
  });

  it('snake_case / kebab-case 断词', () => {
    expect(humanizeKey('user_name')).toBe('User Name');
    expect(humanizeKey('user-name')).toBe('User Name');
  });

  it('全大写缩写保持原样', () => {
    expect(humanizeKey('ID')).toBe('ID');
    expect(humanizeKey('SKU_CODE')).toBe('SKU CODE');
  });

  it('连续大写只在后跟小写时断开', () => {
    expect(humanizeKey('HTTPServer')).toBe('HTTP Server');
  });

  it('空串原样返回', () => {
    expect(humanizeKey('')).toBe('');
  });
});

describe('inferColumns — 字段集合', () => {
  it('空数据返回空列', () => {
    expect(inferColumns([])).toEqual([]);
    expect(inferColumns(null as any)).toEqual([]);
  });

  it('取所有采样行字段的并集（不同来源拼起来的数据键不齐）', () => {
    const cols = inferColumns([{ a: 1 }, { b: 2 }, { a: 3, c: 4 }]);
    expect(cols.map((c) => c.key)).toEqual(['a', 'b', 'c']);
  });

  it('列序跟随字段首次出现的顺序', () => {
    const cols = inferColumns([{ z: 1, a: 2 }, { m: 3 }]);
    expect(cols.map((c) => c.key)).toEqual(['z', 'a', 'm']);
  });

  it('跳过 _ 开头的内部字段', () => {
    const cols = inferColumns([{ name: 'x', _rowType: 'group', __id: 1 }]);
    expect(cols.map((c) => c.key)).toEqual(['name']);
  });

  it('跳过 itemKey 与 exclude', () => {
    const cols = inferColumns([{ id: 1, name: 'x', secret: 'y' }], {
      itemKey: 'id',
      exclude: ['secret'],
    });
    expect(cols.map((c) => c.key)).toEqual(['name']);
  });

  it('只采样前 sampleSize 行', () => {
    const rows = [{ a: 1 }, { a: 2 }, { late: 3 }];
    expect(inferColumns(rows, { sampleSize: 2 }).map((c) => c.key)).toEqual(['a']);
  });

  it('忽略非对象行', () => {
    const cols = inferColumns([null, undefined, { a: 1 }] as any);
    expect(cols.map((c) => c.key)).toEqual(['a']);
  });
});

describe('inferColumns — 类型推断', () => {
  it('数字列右对齐并配 cellType', () => {
    const c = byKey(inferColumns([{ amount: 100 }, { amount: 250 }])).get('amount')!;
    expect(c.align).toBe('right');
    expect(c.cellType).toBe('number');
    expect(c.sortable).toBe(true);
  });

  it('useCellType: false 时不配 cellType，但仍右对齐', () => {
    const c = byKey(inferColumns([{ amount: 100 }], { useCellType: false })).get('amount')!;
    expect(c.cellType).toBeUndefined();
    expect(c.align).toBe('right');
  });

  it('纯数字字符串不判成数字（可能是订单号 / 手机号）', () => {
    const c = byKey(inferColumns([{ orderNo: '13800138000' }])).get('orderNo')!;
    expect(c.align).toBeUndefined();
    expect(c.cellType).toBeUndefined();
  });

  it('布尔列居中', () => {
    const c = byKey(inferColumns([{ active: true }, { active: false }])).get('active')!;
    expect(c.align).toBe('center');
    expect(c.width).toBe(90);
  });

  it('ISO 日期字符串判成日期（可排序，不右对齐）', () => {
    const c = byKey(inferColumns([{ at: '2026-08-12' }, { at: '2026-08-13T10:00:00Z' }])).get('at')!;
    expect(c.sortable).toBe(true);
    expect(c.align).toBeUndefined();
  });

  it('Date 对象判成日期', () => {
    const c = byKey(inferColumns([{ at: new Date('2026-08-12') }])).get('at')!;
    expect(c.sortable).toBe(true);
  });

  it('不把 "123" 之类当日期', () => {
    const c = byKey(inferColumns([{ v: '123' }])).get('v')!;
    expect(c.sortable).toBe(true); // 按 text 处理
    expect(c.align).toBeUndefined();
  });

  it('图片 URL 配 cellType: image', () => {
    const c = byKey(inferColumns([{ avatar: 'https://x.com/a.png' }])).get('avatar')!;
    expect(c.cellType).toBe('image');
    expect(c.width).toBe(80);
    expect(c.sortable).toBeUndefined();
  });

  it('普通 URL 不配 image，也不可排序', () => {
    const c = byKey(inferColumns([{ link: 'https://example.com/page' }])).get('link')!;
    expect(c.cellType).toBeUndefined();
    expect(c.sortable).toBeUndefined();
  });

  it('长文本给 tooltip 而不是换行', () => {
    const c = byKey(inferColumns([{ desc: 'x'.repeat(120) }])).get('desc')!;
    expect(c.textOverflow).toBe('tooltip');
    expect(c.sortable).toBeUndefined();
  });

  it('按多数票判定，不被单行异常值带偏', () => {
    const rows = [{ v: 'oops' }, { v: 2 }, { v: 3 }, { v: 4 }];
    expect(byKey(inferColumns(rows)).get('v')!.align).toBe('right');
  });

  it('空值不参与投票', () => {
    const rows = [{ v: null }, { v: undefined }, { v: '' }, { v: 42 }];
    expect(byKey(inferColumns(rows)).get('v')!.cellType).toBe('number');
  });

  it('整列全空时回落 text 且仍建列', () => {
    const c = byKey(inferColumns([{ v: null }, { v: '' }])).get('v')!;
    expect(c.cellType).toBeUndefined();
    expect(c.width).toBeGreaterThan(0);
  });

  it('对象值不炸，按 text 处理', () => {
    const c = byKey(inferColumns([{ meta: { a: 1 } }])).get('meta')!;
    expect(c.key).toBe('meta');
  });
});

describe('inferColumns — 列宽', () => {
  it('宽度夹在上下限之间', () => {
    const narrow = byKey(inferColumns([{ a: 'x' }])).get('a')!;
    expect(narrow.width).toBeGreaterThanOrEqual(80);
    const wide = byKey(inferColumns([{ description: 'y'.repeat(200) }])).get('description')!;
    expect(wide.width).toBeLessThanOrEqual(320);
  });

  it('上下限可配', () => {
    const c = byKey(inferColumns([{ a: 'x' }], { minWidth: 150 })).get('a')!;
    expect(c.width).toBe(150);
  });

  it('标题比内容长时按标题算', () => {
    const c = byKey(inferColumns([{ aVeryLongFieldName: 'x' }])).get('aVeryLongFieldName')!;
    // 'A Very Long Field Name' 22 字符 → 明显宽于内容 'x'
    expect(c.width).toBeGreaterThan(150);
  });

  it('用 P90 而不是最大值，一行超长内容不撑爆整列', () => {
    const rows = [...Array.from({ length: 20 }, () => ({ v: 'ab' })), { v: 'z'.repeat(300) }];
    expect(byKey(inferColumns(rows)).get('v')!.width).toBeLessThan(120);
  });

  it('中文按双宽计算', () => {
    const cn = byKey(inferColumns([{ v: '中文中文中文中文' }])).get('v')!;
    const en = byKey(inferColumns([{ v: 'abcdefgh' }])).get('v')!;
    expect(cn.width).toBeGreaterThan(en.width);
  });
});

describe('inferColumns — 标题', () => {
  it('默认走 humanizeKey', () => {
    expect(byKey(inferColumns([{ createdAt: 1 }])).get('createdAt')!.title).toBe('Created At');
  });

  it('titleOf 可自定义（接中文字典）', () => {
    const dict: Record<string, string> = { amount: '销售额' };
    const c = byKey(inferColumns([{ amount: 1 }], { titleOf: (k) => dict[k] ?? k })).get('amount')!;
    expect(c.title).toBe('销售额');
  });
});
