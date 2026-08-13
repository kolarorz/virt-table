import { describe, it, expect } from 'vitest';
import { aggregate, computeCellSummary, computeSummaryRow, type SummaryColumn } from './summary';

type Row = { name: string; price: number; qty: number };

describe('aggregate', () => {
  const vals = [10, 20, 30];
  it('sum', () => expect(aggregate('sum', vals)).toBe('60'));
  it('avg', () => expect(aggregate('avg', vals)).toBe('20'));
  it('avg 非整数保留两位', () => expect(aggregate('avg', [10, 20, 25])).toBe('18.33'));
  it('max', () => expect(aggregate('max', vals)).toBe('30'));
  it('min', () => expect(aggregate('min', vals)).toBe('10'));
  it('count 计数行数（含非数字）', () => expect(aggregate('count', ['a', 'b', 3])).toBe('3'));
  it('字符串数字可聚合', () => expect(aggregate('sum', ['1', '2', '3'])).toBe('6'));
  it('无有效数字返回空', () => expect(aggregate('sum', ['x', 'y'])).toBe(''));
});

describe('computeSummaryRow', () => {
  const leaves: Row[] = [
    { name: 'a', price: 10, qty: 1 },
    { name: 'b', price: 20, qty: 2 },
    { name: 'c', price: 30, qty: 3 },
  ];

  it('首列放合计标签，聚合列出值，其余留空', () => {
    const cols: SummaryColumn<Row>[] = [
      { key: 'name' },
      { key: 'price', summary: 'sum' },
      { key: 'qty', summary: 'avg' },
    ];
    expect(computeSummaryRow(leaves, cols, '合计')).toEqual(['合计', '60', '2']);
  });

  it('summaryMethod 优先', () => {
    const cols: SummaryColumn<Row>[] = [
      { key: 'name' },
      { key: 'price', summary: 'sum', summaryMethod: (v) => `¥${(v as number[]).reduce((a, b) => a + b, 0)}` },
      { key: 'qty' },
    ];
    expect(computeSummaryRow(leaves, cols, '合计')).toEqual(['合计', '¥60', '']);
  });

  it('首列本身是聚合列时不放标签', () => {
    const cols: SummaryColumn<Row>[] = [
      { key: 'price', summary: 'sum' },
      { key: 'qty', summary: 'count' },
    ];
    expect(computeSummaryRow(leaves, cols, '合计')).toEqual(['60', '3']);
  });
});

describe('computeCellSummary（分组表尾逐格聚合）', () => {
  const rows: Row[] = [
    { name: 'a', price: 10, qty: 1 },
    { name: 'b', price: 20, qty: 2 },
    { name: 'c', price: 30, qty: 3 },
  ];

  it('叶子格：语义与单列聚合一致', () => {
    const col: SummaryColumn<Row> = { key: 'price', summary: 'sum' };
    expect(computeCellSummary(col, rows, [col])).toBe('60');
  });

  it('分组格：摊平旗下全部叶子列 × 全部行后聚合', () => {
    const group: SummaryColumn<Row> = { key: 'g', summary: 'sum' };
    const kids: SummaryColumn<Row>[] = [{ key: 'price' }, { key: 'qty' }];
    // (10+1) + (20+2) + (30+3) = 66
    expect(computeCellSummary(group, rows, kids)).toBe('66');
  });

  it('分组格 count 统计的是摊平后的单元格数，而非行数', () => {
    const group: SummaryColumn<Row> = { key: 'g', summary: 'count' };
    expect(computeCellSummary(group, rows, [{ key: 'price' }, { key: 'qty' }])).toBe('6');
  });

  it('summaryMethod 优先，且拿到摊平值与原始行', () => {
    const group: SummaryColumn<Row> = {
      key: 'g',
      summary: 'sum',
      summaryMethod: (values, src) => `${values.length}/${src.length}`,
    };
    // 2 个叶子列 × 3 行 = 6 个摊平值，原始行数 3
    expect(computeCellSummary(group, rows, [{ key: 'price' }, { key: 'qty' }])).toBe('6/3');
  });

  it('既无 summary 也无 summaryMethod 时返回 null（交由调用方决定留空/放标签）', () => {
    expect(computeCellSummary({ key: 'name' }, rows, [{ key: 'name' }])).toBeNull();
  });

  it('空数据行：有 summary 配置仍返回字符串而非 null', () => {
    expect(computeCellSummary({ key: 'price', summary: 'sum' }, [], [{ key: 'price' }])).toBe('');
    expect(computeCellSummary({ key: 'price', summary: 'count' }, [], [{ key: 'price' }])).toBe('0');
  });
});
