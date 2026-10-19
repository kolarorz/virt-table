/**
 * 表格导入的**纯逻辑层**：CSV 文本 / xlsx 字节 → 二维数组 → 行对象。
 *
 * 零 DOM、零表格依赖，所以它是一条独立的 exports 子路径（`@virt-table/vanilla/sheet-import`）
 * —— 与 `ai-query` / `infer-columns` 同一种定位：**能在 Node / 服务端跑**。
 * 「用户上传 xlsx，后端解析入库」和「浏览器里导进表格」于是共用同一份实现。
 *
 * ## 为什么 xlsx 读取在**免费**版
 *
 * 付费的 `@virt-table-pro/xlsx` 卖的是**写**：样式、合并、多级表头、冻结窗格、活公式、
 * PDF 排版。读是另一件事，而 vxe-table 免费给了导入 —— 免费版缺它就是唯一一处会被拿去
 * 比较时掉分的地方。**导入向导**（列映射 → 类型推断 → 校验报错定位到格）才是付费点。
 *
 * ## 不引任何依赖，包括 XML 解析器
 *
 * OOXML 那几个 part 的形状极其规整（`<c r="A1" t="s"><v>0</v></c>`），所以这里用**扫描式
 * 正则**逐个元素取，而不是 `DOMParser`：
 *
 *   - `DOMParser` 在 Node 里不存在，用它就等于放弃「服务端也能跑」这条
 *   - 引 `@xmldom/xmldom` 之类会给每个使用方增加一份依赖，而我们只需要读四种元素
 *
 * 代价是**不支持奇异构造**（自定义命名空间前缀、`<mc:AlternateContent>` 包裹的 sheetData）。
 * Excel / WPS / Numbers / LibreOffice 导出的常规文件都在覆盖范围内；解析不出来时返回空
 * 而不是抛 —— 一个导入功能宁可说「这张表读不出内容」，也不该把整页炸掉。
 *
 * ## 解压走浏览器 / Node 自带的 `DecompressionStream`
 *
 * 与 `@virt-table-pro/xlsx` 写那侧对称（那边用 `CompressionStream('deflate-raw')`）。
 * zip 里 method=8 就是**裸 deflate**，`'deflate-raw'` 正好对得上 —— 用 `'deflate'`
 * 会因为多了 zlib 头尾而解不开。拿不到这个 API 时只支持不压缩（STORE）的条目并给出说明。
 */

/** 一格读出来的值。日期已经从序列号还原成 `Date` */
export type SheetValue = string | number | boolean | Date | null;

/** 读出来的一张 sheet */
export interface ImportedSheet {
  name: string;
  /** `rows[r][c]`；行内缺的格是 `null`，行尾的空格已裁掉 */
  rows: SheetValue[][];
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV
// ─────────────────────────────────────────────────────────────────────────────

export interface ParseCsvOptions {
  /** 分隔符。不给则从首行**嗅**一个（见 `sniffDelimiter`） */
  delimiter?: string;
  /** 把纯数字的格转成 number（默认 `false`：CSV 是文本格式，转不转由调用方决定） */
  coerceNumbers?: boolean;
}

/**
 * 从首行嗅分隔符。
 *
 * 中文 Windows 的 Excel 导 CSV 默认用**分号**（区域设置里逗号是小数点），而
 * 「另存为制表符分隔」很常见 —— 只认逗号会让这两类文件整行挤成一格。
 * 判据是「哪个候选在首行里出现得最多」，在引号外计数（否则 `"上海, 中国"` 会把逗号算进去）。
 */
export function sniffDelimiter(text: string): string {
  const firstLine = text.slice(0, 64 * 1024).split(/\r?\n/)[0] ?? '';
  const candidates = [',', ';', '\t', '|'];
  let best = ',';
  let bestCount = 0;
  for (const d of candidates) {
    let count = 0;
    let quoted = false;
    for (let i = 0; i < firstLine.length; i++) {
      const ch = firstLine[i];
      if (ch === '"') quoted = !quoted;
      else if (!quoted && ch === d) count += 1;
    }
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

/** 纯数字文本 → number；不是就返回原文 */
function maybeNumber(s: string): string | number {
  if (s === '' || !/^-?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s.trim())) return s;
  const n = Number(s);
  return Number.isFinite(n) ? n : s;
}

/**
 * 解析 CSV / TSV（RFC 4180 那套：双引号包裹、内部引号翻倍、字段内可含换行）。
 *
 * 三件真实文件里一定会遇到、少一件就出错的事：
 *
 *   1. **BOM**。Excel 导出的 UTF-8 CSV 前面有 `﻿`，不剥掉的话第一列的列名会带一个
 *      看不见的字符 —— 表现是「明明列名一样，取值却是 undefined」。
 *   2. **CRLF**。Windows 的换行是 `\r\n`，只按 `\n` 切会让每行末尾多一个 `\r`。
 *   3. **字段内换行**。地址、备注里带换行完全正常，它被包在引号里 ——
 *      按行 split 再按分隔符 split 的写法在这儿必错，所以这里是**逐字符状态机**。
 */
export function parseCsv(text: string, options: ParseCsvOptions = {}): (string | number)[][] {
  let src = text;
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1); // BOM
  const delimiter = options.delimiter ?? sniffDelimiter(src);
  const coerce = options.coerceNumbers === true;

  const rows: (string | number)[][] = [];
  let row: (string | number)[] = [];
  let field = '';
  let quoted = false;
  let i = 0;

  const pushField = (): void => {
    row.push(coerce ? maybeNumber(field) : field);
    field = '';
  };
  const pushRow = (): void => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < src.length) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"' && field === '') {
      quoted = true;
      i += 1;
      continue;
    }
    if (ch === delimiter) {
      pushField();
      i += 1;
      continue;
    }
    if (ch === '\r') {
      // CRLF 与孤立的 CR 都当换行
      if (src[i + 1] === '\n') i += 1;
      pushRow();
      i += 1;
      continue;
    }
    if (ch === '\n') {
      pushRow();
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  // 最后一行没有换行结尾时也要收进来；但纯粹的尾随换行不该产出一行空行
  if (field !== '' || row.length > 0) pushRow();

  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// zip 解包
// ─────────────────────────────────────────────────────────────────────────────

type DecompressionStreamCtor = new (format: string) => {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
};

/** 环境有没有 `DecompressionStream('deflate-raw')`（没有就只读得懂 STORE 条目） */
export function canInflate(): boolean {
  const ctor = (globalThis as { DecompressionStream?: DecompressionStreamCtor })
    .DecompressionStream;
  return typeof ctor === 'function';
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array | null> {
  const ctor = (globalThis as { DecompressionStream?: DecompressionStreamCtor })
    .DecompressionStream;
  if (typeof ctor !== 'function') return null;
  try {
    const ds = new ctor('deflate-raw');
    const writer = ds.writable.getWriter();
    // 不 await：writer 的背压要等 reader 开始读才释放，先 await 会死锁
    void writer.write(data).then(() => writer.close());
    const chunks: Uint8Array[] = [];
    let total = 0;
    const reader = ds.readable.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.length;
      }
    }
    const out = new Uint8Array(total);
    let at = 0;
    for (const c of chunks) {
      out.set(c, at);
      at += c.length;
    }
    return out;
  } catch {
    return null;
  }
}

const SIG_EOCD = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;

/**
 * 解 zip：路径 → 字节。
 *
 * **从尾部倒着找 EOCD 签名**，不假设它就在最后 22 字节 —— zip 允许带注释，
 * 而某些工具（以及从后端流式落盘的文件）确实会带。按最大注释长度 65535 往回扫。
 *
 * 读的是**中央目录**而不是顺着本地头一路走：本地头里的长度字段在流式写入的 zip 里
 * 可能是 0（真值在 data descriptor 里），中央目录永远是准的。
 */
export async function unzip(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const out = new Map<string, Uint8Array>();
  if (bytes.length < 22) return out;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  let eocd = -1;
  const from = Math.max(0, bytes.length - 22 - 0xffff);
  for (let i = bytes.length - 22; i >= from; i--) {
    if (dv.getUint32(i, true) === SIG_EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return out;

  const count = dv.getUint16(eocd + 10, true);
  let at = dv.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();

  for (let n = 0; n < count && at + 46 <= bytes.length; n++) {
    if (dv.getUint32(at, true) !== SIG_CENTRAL) break;
    const method = dv.getUint16(at + 10, true);
    const compSize = dv.getUint32(at + 20, true);
    const nameLen = dv.getUint16(at + 28, true);
    const extraLen = dv.getUint16(at + 30, true);
    const commentLen = dv.getUint16(at + 32, true);
    const offset = dv.getUint32(at + 42, true);
    const path = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLen));
    at += 46 + nameLen + extraLen + commentLen;

    if (offset + 30 > bytes.length || dv.getUint32(offset, true) !== SIG_LOCAL) continue;
    const localNameLen = dv.getUint16(offset + 26, true);
    const localExtraLen = dv.getUint16(offset + 28, true);
    const start = offset + 30 + localNameLen + localExtraLen;
    const body = bytes.subarray(start, start + compSize);

    if (method === 0) {
      out.set(path, body);
    } else if (method === 8) {
      const raw = await inflateRaw(body);
      if (raw) out.set(path, raw);
    }
    // 其余压缩方法（bzip2 / lzma）不管：xlsx 实际上只用 0 与 8
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// XML 扫描（见文件头「不引任何依赖，包括 XML 解析器」）
// ─────────────────────────────────────────────────────────────────────────────

/** XML 实体反转义。`&#38;` / `&#x26;` 这类数字实体也要认 */
function unescapeXml(s: string): string {
  if (s.indexOf('&') < 0) return s;
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** 取某个属性 */
function attr(tag: string, name: string): string | null {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? unescapeXml(m[1]) : null;
}

/**
 * 共享字符串表。
 *
 * 一个 `<si>` 里可能有**多个** `<t>`（富文本：`<si><r><t>粗</t></r><r><t>体</t></r></si>`），
 * 全部拼起来才是那格的完整文本 —— 只取第一个 `<t>` 会把带格式的字符串截断，
 * 而那在真实文件里非常常见（Excel 里给半句话加粗就会产出这种结构）。
 */
function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>|<si\b[^>]*\/>/g;
  let m: RegExpExecArray | null;
  while ((m = siRe.exec(xml)) !== null) {
    const inner = m[1] ?? '';
    let text = '';
    const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>|<t\b[^>]*\/>/g;
    let t: RegExpExecArray | null;
    while ((t = tRe.exec(inner)) !== null) text += unescapeXml(t[1] ?? '');
    out.push(text);
  }
  return out;
}

/** 内置的日期数字格式 id。自定义格式（≥164）另按 formatCode 判断 */
const BUILTIN_DATE_FMT = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

/**
 * `styles.xml` → 「第 i 个 cellXf 是不是日期格式」。
 *
 * 为什么必须读它：xlsx 里**日期就是数字**，`<c r="A1" s="3"><v>46265</v></c>` 到底是
 * 「46265 件」还是「2026-08-31」，唯一的区别是它引用的那个 cellXf 的 `numFmtId`。
 * 不读 styles 的导入器会把所有日期读成五位数 —— 那是这类工具最常见的 bug。
 */
function parseDateStyles(xml: string): boolean[] {
  /** numFmtId → 是不是日期 */
  const custom = new Map<number, boolean>();
  const numFmtRe = /<numFmt\b[^>]*\/>/g;
  let m: RegExpExecArray | null;
  while ((m = numFmtRe.exec(xml)) !== null) {
    const id = Number(attr(m[0], 'numFmtId'));
    const code = attr(m[0], 'formatCode') ?? '';
    if (!Number.isFinite(id)) continue;
    /*
     * 判据：格式串里有 y/m/d/h/s 这类日期时间占位符。
     * 先剔掉两种会误判的东西：引号里的字面文本（`"年"`）与颜色段（`[Red]`）——
     * `"d 天"` 里那个 d 是字面文字，不是日。
     */
    const bare = code.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '');
    custom.set(id, /[ymdhs]/i.test(bare));
  }

  const out: boolean[] = [];
  const xfsBlock = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(xml)?.[1] ?? '';
  const xfRe = /<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g;
  while ((m = xfRe.exec(xfsBlock)) !== null) {
    const id = Number(attr(m[0], 'numFmtId') ?? '0');
    out.push(BUILTIN_DATE_FMT.has(id) || custom.get(id) === true);
  }
  return out;
}

/** A1 记法里的列字母 → 0 基列号 */
function colOf(ref: string): number {
  let n = 0;
  for (let i = 0; i < ref.length; i++) {
    const c = ref.charCodeAt(i);
    if (c < 65 || c > 90) break;
    n = n * 26 + (c - 64);
  }
  return n - 1;
}

/**
 * Excel 日期序列号 → `Date`。
 *
 * 纪元是 1899-12-30（Lotus 1-2-3 把 1900 当闰年那个 bug，Excel 为兼容保留至今），
 * 与 `@virt-table-pro/xlsx` 写那侧的 `dateToSerial` 严格互逆。用 UTC 分量构造再取本地
 * 同名时刻，避免东八区把 `00:00` 读成前一天 16:00。
 */
export function serialToDate(serial: number): Date {
  const ms = Math.round((serial - 25569) * 86400000);
  const utc = new Date(ms);
  return new Date(
    utc.getUTCFullYear(),
    utc.getUTCMonth(),
    utc.getUTCDate(),
    utc.getUTCHours(),
    utc.getUTCMinutes(),
    utc.getUTCSeconds(),
    utc.getUTCMilliseconds(),
  );
}

/** 一张 sheet 的 XML → 二维值 */
function parseSheet(xml: string, shared: string[], dateXf: boolean[]): SheetValue[][] {
  const rows: SheetValue[][] = [];
  const rowRe = /<row\b([^>]*)>([\s\S]*?)<\/row>|<row\b([^>]*)\/>/g;
  let rm: RegExpExecArray | null;

  while ((rm = rowRe.exec(xml)) !== null) {
    const head = rm[1] ?? rm[3] ?? '';
    const inner = rm[2] ?? '';
    // `r` 是 1 基行号。缺了就顺着往下排（某些导出器省略它）
    const r1 = Number(attr(`<row${head}>`, 'r') ?? '0');
    const rowIndex = r1 > 0 ? r1 - 1 : rows.length;

    const cells: SheetValue[] = [];
    const cRe = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/g;
    let cm: RegExpExecArray | null;
    let cursor = 0;
    while ((cm = cRe.exec(inner)) !== null) {
      const cHead = cm[1] ?? cm[3] ?? '';
      const body = cm[2] ?? '';
      const ref = attr(`<c${cHead}>`, 'r');
      const col = ref ? colOf(ref) : cursor;
      cursor = col + 1;

      const t = attr(`<c${cHead}>`, 't');
      const sIdx = Number(attr(`<c${cHead}>`, 's') ?? '-1');
      let value: SheetValue = null;

      if (t === 'inlineStr') {
        let text = '';
        const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
        let tm: RegExpExecArray | null;
        while ((tm = tRe.exec(body)) !== null) text += unescapeXml(tm[1] ?? '');
        value = text;
      } else {
        const raw = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(body)?.[1];
        if (raw !== undefined) {
          const text = unescapeXml(raw);
          if (t === 's') {
            value = shared[Number(text)] ?? '';
          } else if (t === 'b') {
            value = text === '1';
          } else if (t === 'e') {
            // 公式错误（#DIV/0! 之类）：原样当文本给出去，别悄悄变成 null
            value = text;
          } else if (t === 'str') {
            value = text;
          } else {
            const n = Number(text);
            if (Number.isFinite(n)) {
              // 日期就是数字，区别只在它引用的 cellXf 的 numFmtId（见 parseDateStyles）
              value = sIdx >= 0 && dateXf[sIdx] ? serialToDate(n) : n;
            } else {
              value = text;
            }
          }
        }
      }
      // 稀疏行：中间没写的格补 null
      while (cells.length < col) cells.push(null);
      cells[col] = value;
    }

    while (rows.length < rowIndex) rows.push([]);
    // 行尾的空格裁掉（Excel 常给整行写满到最后一个用过的列）
    let end = cells.length;
    while (end > 0 && (cells[end - 1] === null || cells[end - 1] === '')) end -= 1;
    rows[rowIndex] = cells.slice(0, end);
  }
  return rows;
}

/**
 * 读 xlsx（或 xlsm —— 同一个容器）。
 *
 * 返回**全部** sheet，顺序与工作簿里一致。解析不出内容时返回空数组而不是抛：
 * 一个导入功能宁可说「这张表读不出内容」，也不该把整页炸掉。
 */
export async function readXlsx(bytes: Uint8Array): Promise<ImportedSheet[]> {
  const files = await unzip(bytes);
  const decoder = new TextDecoder();
  const text = (path: string): string => {
    const buf = files.get(path);
    return buf ? decoder.decode(buf) : '';
  };

  const workbook = text('xl/workbook.xml');
  if (!workbook) return [];

  const shared = parseSharedStrings(text('xl/sharedStrings.xml'));
  const dateXf = parseDateStyles(text('xl/styles.xml'));

  /** rId → 目标路径（`worksheets/sheet1.xml`） */
  const rels = new Map<string, string>();
  const relRe = /<Relationship\b[^>]*\/>/g;
  let m: RegExpExecArray | null;
  const relXml = text('xl/_rels/workbook.xml.rels');
  while ((m = relRe.exec(relXml)) !== null) {
    const id = attr(m[0], 'Id');
    const target = attr(m[0], 'Target');
    if (id && target) rels.set(id, target.replace(/^\/?xl\//, '').replace(/^\//, ''));
  }

  const out: ImportedSheet[] = [];
  const sheetRe = /<sheet\b[^>]*\/>/g;
  let idx = 0;
  while ((m = sheetRe.exec(workbook)) !== null) {
    idx += 1;
    const name = attr(m[0], 'name') ?? `Sheet${idx}`;
    const rid = attr(m[0], 'r:id') ?? attr(m[0], 'id');
    /*
     * 走 rels 找真实路径；找不到就退回按序号猜 `worksheets/sheetN.xml`。
     * 退路是必要的：WPS 与部分导出器的 rels 里用的是别的属性前缀，
     * 而按序号猜在 99% 的文件上都对（sheet 的 rId 与序号同序）。
     */
    const rel = rid ? rels.get(rid) : undefined;
    const path = `xl/${rel ?? `worksheets/sheet${idx}.xml`}`;
    const xml = text(path);
    if (!xml) continue;
    out.push({ name, rows: parseSheet(xml, shared, dateXf) });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 二维数组 → 行对象
// ─────────────────────────────────────────────────────────────────────────────

export interface RowsToObjectsOptions {
  /**
   * 表头怎么来：
   * - `'first'`（默认）—— 第一行是表头
   * - `string[]` —— 自己给一份，全部行都当数据
   * - `false` —— 没有表头，键是 `col1` / `col2` …
   */
  header?: 'first' | string[] | false;
  /** 跳过前 N 行（表头之前的标题行 / 说明行）。默认 0 */
  skipRows?: number;
  /** 整行都是空的就丢掉，默认 `true` */
  dropEmptyRows?: boolean;
}

export interface RowsToObjectsResult {
  /** 列 key，顺序即列序 */
  keys: string[];
  /** 每行一个对象 */
  rows: Array<Record<string, SheetValue>>;
}

/**
 * 二维数组 → 行对象。
 *
 * 键**直接用表头文字**，不做 slug 化 —— 那样列标题与 key 一一对应，
 * 配 `inferColumns()` 时列头显示的就是文件里那个中文标题，不需要再维护一份映射。
 * 重名的列加 `_2` / `_3` 后缀（Excel 里两列都叫「金额」很常见），空标题退成 `colN`。
 */
export function rowsToObjects(
  rows: readonly SheetValue[][],
  options: RowsToObjectsOptions = {},
): RowsToObjectsResult {
  const skip = Math.max(0, Math.floor(options.skipRows ?? 0));
  const body = rows.slice(skip);
  const headerMode = options.header ?? 'first';

  let keys: string[];
  let dataFrom = 0;
  if (Array.isArray(headerMode)) {
    keys = [...headerMode];
  } else if (headerMode === 'first') {
    const head = body[0] ?? [];
    keys = head.map((v, i) => {
      const s = v === null || v === undefined ? '' : String(v).trim();
      return s || `col${i + 1}`;
    });
    dataFrom = 1;
  } else {
    const width = body.reduce((w, r) => Math.max(w, r.length), 0);
    keys = Array.from({ length: width }, (_, i) => `col${i + 1}`);
  }

  // 重名去重：Excel 里两列都叫「金额」很常见，不去重后一列会盖掉前一列
  const reserved = new Set(keys);
  const used = new Set<string>();
  const suffixes = new Map<string, number>();
  keys = keys.map((key) => {
    let candidate = key;
    if (used.has(candidate)) {
      let suffix = suffixes.get(key) ?? 2;
      do candidate = `${key}_${suffix++}`;
      while (reserved.has(candidate) || used.has(candidate));
      suffixes.set(key, suffix);
    }
    used.add(candidate);
    return candidate;
  });

  const dropEmpty = options.dropEmptyRows !== false;
  const out: Array<Record<string, SheetValue>> = [];
  for (let r = dataFrom; r < body.length; r++) {
    const line = body[r] ?? [];
    if (dropEmpty && line.every((v) => v === null || v === '')) continue;
    const obj: Record<string, SheetValue> = {};
    for (let c = 0; c < keys.length; c++) obj[keys[c]] = line[c] ?? null;
    out.push(obj);
  }
  return { keys, rows: out };
}
