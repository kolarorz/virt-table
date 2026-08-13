import { describe, it, expect } from 'vitest';
import { escapeCsvCell, rowsToCsv, toCsvString, rowsToHtmlTable, toExcelHtml } from './export';

describe('escapeCsvCell', () => {
  it('普通值原样', () => expect(escapeCsvCell('abc')).toBe('abc'));
  it('null/undefined → 空', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });
  it('含逗号需包裹', () => expect(escapeCsvCell('a,b')).toBe('"a,b"'));
  it('含引号翻倍并包裹', () => expect(escapeCsvCell('a"b')).toBe('"a""b"'));
  it('含换行需包裹', () => expect(escapeCsvCell('a\nb')).toBe('"a\nb"'));
  it('数字转字符串', () => expect(escapeCsvCell(42)).toBe('42'));
});

describe('rowsToCsv', () => {
  it('CRLF 分隔行，逗号分隔列', () => {
    expect(rowsToCsv([['a', 'b'], ['c', 'd']])).toBe('a,b\r\nc,d');
  });
  it('转义生效', () => {
    expect(rowsToCsv([['x,y', 'z']])).toBe('"x,y",z');
  });
  it('自定义分隔符', () => {
    expect(rowsToCsv([['a', 'b']], ';')).toBe('a;b');
  });
});

describe('toCsvString', () => {
  it('带 BOM 前缀', () => {
    const s = toCsvString([['a']]);
    expect(s.charCodeAt(0)).toBe(0xfeff);
    expect(s.slice(1)).toBe('a');
  });
});

describe('rowsToHtmlTable', () => {
  it('含表头与转义', () => {
    const html = rowsToHtmlTable(['H1'], [['<b>']]);
    expect(html).toContain('<th>H1</th>');
    expect(html).toContain('<td>&lt;b&gt;</td>');
  });
  it('无表头时不含 thead', () => {
    expect(rowsToHtmlTable([], [['a']])).not.toContain('<thead>');
  });
});

describe('toExcelHtml', () => {
  it('输出完整 HTML 文档', () => {
    const html = toExcelHtml(['H'], [['v']], 'T');
    expect(html).toContain('<html');
    expect(html).toContain('<title>T</title>');
    expect(html).toContain('<td>v</td>');
  });
});
