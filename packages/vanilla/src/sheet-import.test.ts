/**
 * 导入的纯逻辑层。
 *
 * xlsx 那一组**真造一个 zip 出来再读回去** —— 不是断言「解析器没抛」，而是端到端
 * 往返：手写 OOXML 各 part → 用 `CompressionStream` 压成 zip → `readXlsx()` 读回。
 * 这类解析器的失败模式全是「读出来是空表 / 日期变成五位数」，只验不抛等于什么都没验。
 */
import { describe, expect, it } from 'vitest';
import { deflateRawSync } from 'node:zlib';
import {
  canInflate,
  parseCsv,
  readXlsx,
  rowsToObjects,
  serialToDate,
  sniffDelimiter,
  unzip,
  type SheetValue,
} from './sheet-import';

// ─────────────────────────────────────────────────────────────────────────────
// CSV
// ─────────────────────────────────────────────────────────────────────────────

describe('sniffDelimiter', () => {
  it('逗号 / 分号 / 制表符 / 竖线', () => {
    expect(sniffDelimiter('a,b,c')).toBe(',');
    // 中文 Windows 的 Excel 导出默认用分号
    expect(sniffDelimiter('a;b;c')).toBe(';');
    expect(sniffDelimiter('a\tb\tc')).toBe('\t');
    expect(sniffDelimiter('a|b|c')).toBe('|');
  });

  it('只数引号外的（否则「上海, 中国」里那个逗号会被算进去）', () => {
    expect(sniffDelimiter('"上海, 中国";"北京, 中国"')).toBe(';');
  });

  it('一个都没有时退回逗号', () => {
    expect(sniffDelimiter('single')).toBe(',');
  });
});

describe('parseCsv', () => {
  it('基本切分', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('剥 BOM（Excel 导出的 UTF-8 CSV 一定有）', () => {
    // 不剥的话第一列列名带一个看不见的字符 → 取值永远 undefined
    const rows = parseCsv('﻿姓名,年龄\n甲,30');
    expect(rows[0]).toEqual(['姓名', '年龄']);
  });

  it('CRLF 与孤立 CR 都当换行', () => {
    expect(parseCsv('a,b\r\n1,2\r3,4')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('引号包裹：内部逗号、换行、翻倍的引号', () => {
    const rows = parseCsv('a,b\n"上海, 中国","第一行\n第二行"\n"他说""好""",x');
    expect(rows[1]).toEqual(['上海, 中国', '第一行\n第二行']);
    expect(rows[2]).toEqual(['他说"好"', 'x']);
  });

  it('尾随换行不产出一行空行', () => {
    expect(parseCsv('a,b\n1,2\n')).toHaveLength(2);
  });

  it('最后一行没有换行也收进来', () => {
    expect(parseCsv('a,b\n1,2')).toHaveLength(2);
  });

  it('空字段保留位置', () => {
    expect(parseCsv('a,,c')).toEqual([['a', '', 'c']]);
  });

  it('指定分隔符时不再嗅', () => {
    expect(parseCsv('a;b,c', { delimiter: ';' })).toEqual([['a', 'b,c']]);
  });

  it('coerceNumbers：纯数字转 number，其余原样', () => {
    const rows = parseCsv('1,2.5,-3,1e3,007,abc,,１２３', { coerceNumbers: true });
    expect(rows[0]).toEqual([1, 2.5, -3, 1000, 7, 'abc', '', '１２３']);
  });

  it('不开 coerceNumbers 时全是字符串', () => {
    expect(parseCsv('1,2')).toEqual([['1', '2']]);
  });

  it('空文本 → 空数组', () => {
    expect(parseCsv('')).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rowsToObjects
// ─────────────────────────────────────────────────────────────────────────────

describe('rowsToObjects', () => {
  const grid: SheetValue[][] = [
    ['姓名', '年龄'],
    ['甲', 30],
    ['乙', 28],
  ];

  it('默认第一行是表头，键就是表头文字', () => {
    const r = rowsToObjects(grid);
    expect(r.keys).toEqual(['姓名', '年龄']);
    expect(r.rows).toEqual([
      { 姓名: '甲', 年龄: 30 },
      { 姓名: '乙', 年龄: 28 },
    ]);
  });

  it('自己给表头时**全部行**都是数据', () => {
    const r = rowsToObjects(grid, { header: ['a', 'b'] });
    expect(r.rows).toHaveLength(3);
    expect(r.rows[0]).toEqual({ a: '姓名', b: '年龄' });
  });

  it('header: false → colN', () => {
    const r = rowsToObjects(grid, { header: false });
    expect(r.keys).toEqual(['col1', 'col2']);
    expect(r.rows).toHaveLength(3);
  });

  it('重名列加后缀（Excel 里两列都叫「金额」很常见）', () => {
    const r = rowsToObjects([['金额', '金额', '金额'], [1, 2, 3]]);
    expect(r.keys).toEqual(['金额', '金额_2', '金额_3']);
    expect(r.rows[0]).toEqual({ 金额: 1, 金额_2: 2, 金额_3: 3 });
  });

  it('空表头退成 colN', () => {
    const r = rowsToObjects([['姓名', '', null], ['甲', 1, 2]]);
    expect(r.keys).toEqual(['姓名', 'col2', 'col3']);
  });

  it('skipRows 跳过表头之前的标题行', () => {
    const r = rowsToObjects([['2026 年度报表'], ['姓名', '年龄'], ['甲', 30]], { skipRows: 1 });
    expect(r.keys).toEqual(['姓名', '年龄']);
    expect(r.rows).toEqual([{ 姓名: '甲', 年龄: 30 }]);
  });

  it('整行空的丢掉，可以关', () => {
    const g: SheetValue[][] = [['a'], ['1'], [], [null], ['2']];
    expect(rowsToObjects(g).rows).toHaveLength(2);
    expect(rowsToObjects(g, { dropEmptyRows: false }).rows).toHaveLength(4);
  });

  it('行比表头短时缺的补 null', () => {
    const r = rowsToObjects([['a', 'b', 'c'], [1]]);
    expect(r.rows[0]).toEqual({ a: 1, b: null, c: null });
  });

  it('表头去重后 keys 与 rows 的键严格一致', () => {
    const r = rowsToObjects([['x', 'x'], [1, 2]]);
    expect(Object.keys(r.rows[0])).toEqual(r.keys);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// serialToDate
// ─────────────────────────────────────────────────────────────────────────────

describe('serialToDate', () => {
  it('与写那侧的 dateToSerial 严格互逆', () => {
    // 25569 = 1970-01-01；46265 = 2026-08-31（含 1900 闰年 bug 的那套编号）
    expect(serialToDate(25569).getFullYear()).toBe(1970);
    const d = serialToDate(46265);
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 8, 31]);
  });

  it('小数部分是时分秒', () => {
    const d = serialToDate(46265.5);
    expect(d.getHours()).toBe(12);
  });

  it('整数序列号落在本地 00:00（不因时区掉到前一天）', () => {
    const d = serialToDate(46265);
    expect([d.getHours(), d.getMinutes()]).toEqual([0, 0]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// zip / xlsx —— 真造一个包再读回来
// ─────────────────────────────────────────────────────────────────────────────

/** 极简 zip 打包器（测试专用）。`compress` 走 Node 的 deflateRawSync */
function makeZip(entries: Array<{ path: string; text: string }>, compress = true): Uint8Array {
  const enc = new TextEncoder();
  const chunks: number[] = [];
  const central: number[] = [];
  const u16 = (arr: number[], v: number) => arr.push(v & 0xff, (v >>> 8) & 0xff);
  const u32 = (arr: number[], v: number) =>
    arr.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);

  /** CRC32（zip 头里要填，虽然本实现的读取端不校验，但真实文件里它是对的） */
  const crcTable = Array.from({ length: 256 }, (_, i) => {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (data: Uint8Array): number => {
    let c = 0xffffffff;
    for (const b of data) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };

  for (const e of entries) {
    const raw = enc.encode(e.text);
    const body = compress ? new Uint8Array(deflateRawSync(raw)) : raw;
    const nameBytes = enc.encode(e.path);
    const offset = chunks.length;
    u32(chunks, 0x04034b50);
    u16(chunks, 20);
    u16(chunks, 0x0800);
    u16(chunks, compress ? 8 : 0);
    u16(chunks, 0);
    u16(chunks, 0);
    u32(chunks, crc32(raw));
    u32(chunks, body.length);
    u32(chunks, raw.length);
    u16(chunks, nameBytes.length);
    u16(chunks, 0);
    chunks.push(...nameBytes, ...body);

    u32(central, 0x02014b50);
    u16(central, 20);
    u16(central, 20);
    u16(central, 0x0800);
    u16(central, compress ? 8 : 0);
    u16(central, 0);
    u16(central, 0);
    u32(central, crc32(raw));
    u32(central, body.length);
    u32(central, raw.length);
    u16(central, nameBytes.length);
    u16(central, 0);
    u16(central, 0);
    u16(central, 0);
    u16(central, 0);
    u32(central, 0);
    u32(central, offset);
    central.push(...nameBytes);
  }

  const cdStart = chunks.length;
  const out = [...chunks, ...central];
  u32(out, 0x06054b50);
  u16(out, 0);
  u16(out, 0);
  u16(out, entries.length);
  u16(out, entries.length);
  u32(out, central.length);
  u32(out, cdStart);
  u16(out, 0);
  return new Uint8Array(out);
}

const XD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

/** 造一个最小可读的 xlsx */
function makeXlsx(opts: {
  sheets: Array<{ name: string; sheetXml: string }>;
  shared?: string[];
  stylesXml?: string;
}): Array<{ path: string; text: string }> {
  const { sheets, shared = [], stylesXml } = opts;
  return [
    {
      path: 'xl/workbook.xml',
      text:
        XD +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
        sheets
          .map((s, i) => `<sheet name="${s.name}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
          .join('') +
        '</sheets></workbook>',
    },
    {
      path: 'xl/_rels/workbook.xml.rels',
      text:
        XD +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        sheets
          .map(
            (_s, i) =>
              `<Relationship Id="rId${i + 1}" Type="x" Target="worksheets/sheet${i + 1}.xml"/>`,
          )
          .join('') +
        '</Relationships>',
    },
    {
      path: 'xl/sharedStrings.xml',
      text:
        XD +
        `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${shared.length}" uniqueCount="${shared.length}">` +
        shared.map((t) => `<si><t>${t}</t></si>`).join('') +
        '</sst>',
    },
    ...(stylesXml ? [{ path: 'xl/styles.xml', text: XD + stylesXml }] : []),
    ...sheets.map((s, i) => ({ path: `xl/worksheets/sheet${i + 1}.xml`, text: XD + s.sheetXml })),
  ];
}

const sheetWrap = (inner: string): string =>
  `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${inner}</sheetData></worksheet>`;

describe('unzip', () => {
  it('读得回 STORE 与 DEFLATE 两种条目', async () => {
    const files = await unzip(makeZip([{ path: 'a.txt', text: 'hello' }], false));
    expect(new TextDecoder().decode(files.get('a.txt'))).toBe('hello');
  });

  it.runIf(canInflate())('DEFLATE 条目也解得开', async () => {
    const big = 'x'.repeat(500);
    const files = await unzip(makeZip([{ path: 'a.txt', text: big }], true));
    expect(new TextDecoder().decode(files.get('a.txt'))).toBe(big);
  });

  it('不是 zip / 太短 → 空 Map，不抛', async () => {
    expect((await unzip(new Uint8Array([1, 2, 3]))).size).toBe(0);
    expect((await unzip(new Uint8Array(0))).size).toBe(0);
  });

  it('尾部带注释的 zip 也能找到 EOCD（不假设它在最后 22 字节）', async () => {
    const zip = makeZip([{ path: 'a.txt', text: 'hi' }], false);
    // 手动把注释长度改掉并追加注释
    const comment = new TextEncoder().encode('generated by something');
    const withComment = new Uint8Array(zip.length + comment.length);
    withComment.set(zip);
    withComment.set(comment, zip.length);
    const dv = new DataView(withComment.buffer);
    dv.setUint16(zip.length - 2, comment.length, true);
    const files = await unzip(withComment);
    expect(files.has('a.txt')).toBe(true);
  });
});

describe.runIf(canInflate())('readXlsx', () => {
  it('共享字符串 / 数字 / 布尔 / 公式缓存值', async () => {
    const parts = makeXlsx({
      shared: ['姓名', '甲'],
      sheets: [
        {
          name: '员工',
          sheetXml: sheetWrap(
            '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>' +
              '<row r="2"><c r="A2"><v>30</v></c><c r="B2" t="b"><v>1</v></c>' +
              '<c r="C2" t="str"><f>A2&amp;""</f><v>三十</v></c></row>',
          ),
        },
      ],
    });
    const sheets = await readXlsx(makeZip(parts));
    expect(sheets).toHaveLength(1);
    expect(sheets[0].name).toBe('员工');
    expect(sheets[0].rows[0]).toEqual(['姓名', '甲']);
    expect(sheets[0].rows[1]).toEqual([30, true, '三十']);
  });

  it('inlineStr 与富文本（一个 si 里多个 t）都能拼全', async () => {
    const parts = makeXlsx({
      sheets: [
        { name: 'S', sheetXml: sheetWrap('<row r="1"><c r="A1" t="inlineStr"><is><t>行</t><t>内</t></is></c></row>') },
      ],
    });
    let sheets = await readXlsx(makeZip(parts));
    expect(sheets[0].rows[0][0]).toBe('行内');

    // 共享字符串里的富文本：<si><r><t>粗</t></r><r><t>体</t></r></si>
    const rich = makeXlsx({ sheets: [{ name: 'S', sheetXml: sheetWrap('<row r="1"><c r="A1" t="s"><v>0</v></c></row>') }] });
    rich[2].text = XD + '<sst><si><r><t>粗</t></r><r><t>体</t></r></si></sst>';
    sheets = await readXlsx(makeZip(rich));
    // 只取第一个 <t> 会截断成「粗」—— 那在真实文件里非常常见
    expect(sheets[0].rows[0][0]).toBe('粗体');
  });

  it('**日期**按 styles 里的 numFmtId 还原成 Date，不是五位数', async () => {
    const parts = makeXlsx({
      // cellXfs：0 = 常规，1 = 内置日期格式 14
      stylesXml:
        '<styleSheet><cellXfs count="2">' +
        '<xf numFmtId="0"/><xf numFmtId="14"/>' +
        '</cellXfs></styleSheet>',
      sheets: [
        {
          name: 'S',
          sheetXml: sheetWrap(
            '<row r="1"><c r="A1"><v>46265</v></c><c r="B1" s="1"><v>46265</v></c></row>',
          ),
        },
      ],
    });
    const sheets = await readXlsx(makeZip(parts));
    // A1 没有日期格式 → 还是数字；B1 有 → Date
    expect(sheets[0].rows[0][0]).toBe(46265);
    const d = sheets[0].rows[0][1] as Date;
    expect(d).toBeInstanceOf(Date);
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 8, 31]);
  });

  it('自定义日期格式（≥164）也认', async () => {
    const parts = makeXlsx({
      stylesXml:
        '<styleSheet><numFmts count="2">' +
        '<numFmt numFmtId="164" formatCode="yyyy&quot;年&quot;m&quot;月&quot;"/>' +
        // 这个不是日期：d 在引号里，是字面文字
        '<numFmt numFmtId="165" formatCode="0&quot;d 天&quot;"/>' +
        '</numFmts><cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="164"/><xf numFmtId="165"/></cellXfs></styleSheet>',
      sheets: [
        {
          name: 'S',
          sheetXml: sheetWrap(
            '<row r="1"><c r="A1" s="1"><v>46265</v></c><c r="B1" s="2"><v>7</v></c></row>',
          ),
        },
      ],
    });
    const sheets = await readXlsx(makeZip(parts));
    expect(sheets[0].rows[0][0]).toBeInstanceOf(Date);
    // 引号里的 d 是字面文字，不该被当成「日」
    expect(sheets[0].rows[0][1]).toBe(7);
  });

  it('稀疏行：中间跳过的格补 null，行尾空格裁掉', async () => {
    const parts = makeXlsx({
      sheets: [
        { name: 'S', sheetXml: sheetWrap('<row r="1"><c r="A1"><v>1</v></c><c r="D1"><v>4</v></c></row>') },
      ],
    });
    const sheets = await readXlsx(makeZip(parts));
    expect(sheets[0].rows[0]).toEqual([1, null, null, 4]);
  });

  it('跳过的行也补上（r 是 1 基行号）', async () => {
    const parts = makeXlsx({
      sheets: [
        { name: 'S', sheetXml: sheetWrap('<row r="1"><c r="A1"><v>1</v></c></row><row r="3"><c r="A3"><v>3</v></c></row>') },
      ],
    });
    const sheets = await readXlsx(makeZip(parts));
    expect(sheets[0].rows).toHaveLength(3);
    expect(sheets[0].rows[1]).toEqual([]);
    expect(sheets[0].rows[2]).toEqual([3]);
  });

  it('多 sheet：顺序与工作簿一致', async () => {
    const parts = makeXlsx({
      sheets: [
        { name: '第一张', sheetXml: sheetWrap('<row r="1"><c r="A1"><v>1</v></c></row>') },
        { name: '第二张', sheetXml: sheetWrap('<row r="1"><c r="A1"><v>2</v></c></row>') },
      ],
    });
    const sheets = await readXlsx(makeZip(parts));
    expect(sheets.map((s) => s.name)).toEqual(['第一张', '第二张']);
    expect(sheets[1].rows[0]).toEqual([2]);
  });

  it('XML 实体（含数字实体）反转义', async () => {
    const parts = makeXlsx({
      shared: ['a &amp; b &lt;c&gt; &#38; &#x26;'],
      sheets: [{ name: 'S', sheetXml: sheetWrap('<row r="1"><c r="A1" t="s"><v>0</v></c></row>') }],
    });
    const sheets = await readXlsx(makeZip(parts));
    expect(sheets[0].rows[0][0]).toBe('a & b <c> & &');
  });

  it('公式错误值原样当文本给出去，不悄悄变 null', async () => {
    const parts = makeXlsx({
      sheets: [{ name: 'S', sheetXml: sheetWrap('<row r="1"><c r="A1" t="e"><v>#DIV/0!</v></c></row>') }],
    });
    const sheets = await readXlsx(makeZip(parts));
    expect(sheets[0].rows[0][0]).toBe('#DIV/0!');
  });

  it('rels 里找不到目标时按序号退回 worksheets/sheetN.xml', async () => {
    const parts = makeXlsx({
      sheets: [{ name: 'S', sheetXml: sheetWrap('<row r="1"><c r="A1"><v>9</v></c></row>') }],
    });
    // 把 rels 整个清空 —— WPS 等导出器的属性前缀可能对不上
    parts[1].text = XD + '<Relationships/>';
    const sheets = await readXlsx(makeZip(parts));
    expect(sheets[0].rows[0]).toEqual([9]);
  });

  it('不是 xlsx（没有 workbook.xml）→ 空数组，不抛', async () => {
    const sheets = await readXlsx(makeZip([{ path: 'random.txt', text: 'hi' }]));
    expect(sheets).toEqual([]);
  });

  it('端到端：读回来直接喂 rowsToObjects', async () => {
    const parts = makeXlsx({
      shared: ['姓名', '部门', '甲', '研发'],
      sheets: [
        {
          name: '员工',
          sheetXml: sheetWrap(
            '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>' +
              '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" t="s"><v>3</v></c></row>',
          ),
        },
      ],
    });
    const sheets = await readXlsx(makeZip(parts));
    const { keys, rows } = rowsToObjects(sheets[0].rows);
    expect(keys).toEqual(['姓名', '部门']);
    expect(rows).toEqual([{ 姓名: '甲', 部门: '研发' }]);
  });
});


describe('表头后缀冲突回归', () => {
  it.each([
    [['a', 'a', 'a_2'], ['a', 'a_3', 'a_2']],
    [['a', 'a_2', 'a', 'a_2'], ['a', 'a_2', 'a_3', 'a_2_2']],
    [['', 'col1', 'col1_2'], ['col1', 'col1_3', 'col1_2']],
  ])('保留原始字段并避开生成后缀冲突：%j', (header, expected) => {
    const values = header.map((_, i) => i + 1);
    const result = rowsToObjects([header, values]);
    expect(result.keys).toEqual(expected);
    expect(Object.values(result.rows[0])).toEqual(values);
  });
});
