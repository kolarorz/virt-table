/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VirtTableColumn } from './index';
import type { CellContentType } from './cell-type';

/**
 * 从样本数据推断列配置。
 *
 * 为什么需要这个：现有表格库都隐含假设「开发者预先定义 columns」，而 agent 抓回来的
 * 数据、模型吐出来的结果、临时的 SQL 查询结果**事前不知道 schema**。没有推断就只能
 * 在外面手写一圈 `Object.keys(...).map(...)`，每个人都写一遍且都写得不太对
 * （数字列不右对齐、长文本列被压成 100px、内部字段也建了列）。
 *
 * 这一层是**纯逻辑、零 DOM**，所以也能在服务端先把列算好随数据一起下发。
 *
 * 推断是**尽力而为**，产出的是「能直接用的起点」而不是「最终答案」——
 * 调用方可以拿到结果后再改（`inferColumns(rows).map(c => c.key === 'id' ? {...c, width: 60} : c)`）。
 */

/** 值域类别的内部判定结果 */
type ValueKind = 'number' | 'boolean' | 'date' | 'url' | 'image' | 'longText' | 'text';

export interface InferColumnsOptions {
  /** 采样行数上限，默认 50。数据量大时没必要全扫 */
  sampleSize?: number;
  /** 不建列的字段名（除了这里给的，`_` 开头的字段一律跳过） */
  exclude?: string[];
  /** 行唯一标识字段。给了就不为它建列（它通常是内部 id，用户不关心） */
  itemKey?: string;
  /** 列宽下限 / 上限，默认 80 / 320 */
  minWidth?: number;
  maxWidth?: number;
  /** 把字段名转成列标题；默认 camelCase / snake_case → 空格分词并首字母大写 */
  titleOf?: (key: string) => string;
  /** 是否给推断出的数字列配 `cellType: 'number'`，默认 true */
  useCellType?: boolean;
}

/** `createdAt` → `Created At`；`user_name` → `User Name`；`URL` 原样 */
export function humanizeKey(key: string): string {
  if (!key) return key;
  // 全大写的缩写（ID / URL / SKU）保持原样
  if (/^[A-Z0-9_]+$/.test(key)) return key.replace(/_/g, ' ');
  return key
    .replace(/[_-]+/g, ' ')
    // camelCase → camel Case；连续大写视作缩写，只在其后跟小写时断开（HTTPServer → HTTP Server）
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim()
    // 每个词都首字母大写；已大写的（缩写、camel 断出来的第二段）原样不动
    .replace(/(^|\s)(\S)/g, (_, sp: string, c: string) => sp + c.toUpperCase());
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg|bmp)(\?|#|$)/i;

/** 看起来像日期的字符串：ISO 8601 或 `YYYY/MM/DD`，且能被 Date 解析 */
function looksLikeDate(s: string): boolean {
  // 先用形状卡一道 —— 不然 '123' 之类会被 new Date() 当成时间戳解析掉
  if (!/^\d{4}[-/]\d{1,2}[-/]\d{1,2}([T ]|$)/.test(s)) return false;
  return !Number.isNaN(new Date(s).getTime());
}

function looksLikeUrl(s: string): boolean {
  return /^https?:\/\/\S+$/i.test(s);
}

/** 单个值的类别 */
function kindOfValue(v: unknown): ValueKind | null {
  if (v === null || v === undefined || v === '') return null; // 空值不参与投票
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'number') return Number.isFinite(v) ? 'number' : null;
  if (v instanceof Date) return 'date';
  if (typeof v === 'string') {
    if (looksLikeDate(v)) return 'date';
    if (looksLikeUrl(v)) return IMAGE_EXT.test(v) ? 'image' : 'url';
    // 纯数字字符串**不**判成数字：它可能是订单号 / 手机号 / 邮编，
    // 右对齐加千分位反而是错的。真是数字的字段通常本来就是 number 类型。
    return v.length > 60 ? 'longText' : 'text';
  }
  return 'text'; // 对象 / 数组 → 交给默认 String() 渲染
}

/** 中文等宽字符按 2 计，粗略估算显示宽度 */
function displayWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += /[一-龥　-〿＀-￯]/.test(ch) ? 2 : 1;
  return w;
}

interface ColumnStat {
  key: string;
  votes: Map<ValueKind, number>;
  /** 内容显示宽度的分位数样本 */
  widths: number[];
  filled: number;
}

/**
 * 推断列配置。
 *
 * 判定按**多数票**而不是第一行：agent 数据里第一行的某个字段常常是 null 或异常值。
 * 字段集合取所有采样行的**并集**——不同来源拼起来的数据每行的键可能不一致。
 */
export function inferColumns<T extends Record<string, any>>(
  rows: T[],
  options: InferColumnsOptions = {},
): VirtTableColumn<T>[] {
  const {
    sampleSize = 50,
    exclude = [],
    itemKey,
    minWidth = 80,
    maxWidth = 320,
    titleOf = humanizeKey,
    useCellType = true,
  } = options;

  if (!Array.isArray(rows) || rows.length === 0) return [];

  const skip = new Set(exclude);
  if (itemKey) skip.add(itemKey);

  const sample = rows.slice(0, Math.max(1, sampleSize));
  // Map 保插入序 —— 列序跟随字段在数据里首次出现的顺序，这是最不意外的顺序
  const stats = new Map<string, ColumnStat>();

  for (const row of sample) {
    if (!row || typeof row !== 'object') continue;
    for (const key of Object.keys(row)) {
      if (key.startsWith('_') || skip.has(key)) continue;
      let stat = stats.get(key);
      if (!stat) {
        stat = { key, votes: new Map(), widths: [], filled: 0 };
        stats.set(key, stat);
      }
      const value = row[key];
      const kind = kindOfValue(value);
      if (kind === null) continue;
      stat.filled++;
      stat.votes.set(kind, (stat.votes.get(kind) ?? 0) + 1);
      stat.widths.push(displayWidth(String(value)));
    }
  }

  const columns: VirtTableColumn<T>[] = [];
  for (const stat of stats.values()) {
    // 一列全是空值时没有票，回落 text
    let kind: ValueKind = 'text';
    let best = 0;
    for (const [k, n] of stat.votes) {
      if (n > best) {
        best = n;
        kind = k;
      }
    }

    const title = titleOf(stat.key);
    const col: VirtTableColumn<T> = {
      key: stat.key,
      title,
      width: estimateWidth(stat, title, kind, minWidth, maxWidth),
    };

    if (kind === 'number') {
      col.align = 'right';
      if (useCellType) col.cellType = 'number' satisfies CellContentType;
    } else if (kind === 'boolean') {
      col.align = 'center';
    } else if (kind === 'image') {
      col.align = 'center';
      if (useCellType) col.cellType = 'image' satisfies CellContentType;
    } else if (kind === 'longText') {
      // 长文本给 tooltip 而不是换行：换行会让行高参差，虚拟滚动下滚动条会一直抖
      col.textOverflow = 'tooltip';
    }

    // 能排序的类别才开排序；长文本 / 图片 / URL 排序没有意义
    if (kind === 'number' || kind === 'date' || kind === 'text' || kind === 'boolean') {
      col.sortable = true;
    }

    columns.push(col);
  }

  return columns;
}

/**
 * 列宽：取内容的 P90 显示宽度与标题宽度的较大者，换算成 px 再夹在上下限之间。
 *
 * 用 P90 而不是最大值：一两行超长内容不该把整列撑到 320px，那种情况交给
 * `showOverflowTooltip`。
 */
function estimateWidth(
  stat: ColumnStat,
  title: string,
  kind: ValueKind,
  minWidth: number,
  maxWidth: number,
): number {
  if (kind === 'image') return 80;
  if (kind === 'boolean') return 90;

  let contentWidth = 0;
  if (stat.widths.length > 0) {
    const sorted = [...stat.widths].sort((a, b) => a - b);
    contentWidth = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))];
  }
  const chars = Math.max(contentWidth, displayWidth(title));
  // 7px/字符 + 左右 padding 与排序图标的余量
  const px = Math.round(chars * 7 + 34);
  return Math.min(maxWidth, Math.max(minWidth, px));
}
