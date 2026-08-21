/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PluginContext } from '../plugin';
import type { VirtTableColumn } from '../index';
import type { SelectFieldOption } from '../components/_select-field';
import { isDataColumn } from './column';

/**
 * 「这一列能拿来分组 / 排序吗」—— 分组与排序两个面板插件共享的候选列推断。
 *
 * 与面板长什么样无关，纯判据 + 取样，所以单独一个文件：`vtGroupConfig` 与 `vtSortConfig`
 * 各自是一个插件，谁也不该 import 另一个只为了拿这两个函数。
 */


/** 推断取值时最多看多少行 —— 十万行的表不必全扫，前若干行足以判断这一列是不是分类 */
const SAMPLE_ROWS = 500;
/**
 * 一列最多有几种取值还能拿来分组。按「负责人」分组几十个人是正常的，
 * 而几百种取值意味着这不是一个分类维度。
 */
const MAX_GROUP_DISTINCT = 50;

/**
 * 取样本行。**必须往 `children` 里钻，也必须跳过合成行。**
 *
 * 传进来的是 `ctx.getList()`，也就是**显示列表**，里面有两类不是业务数据的东西：分组行
 * （`_rowType: 'group'`，身上只有 `_groupName` / `_groupCount`）与展开行（`'expand'`）。
 * 而分组默认是折叠的，于是「开了分组之后显示列表里一行数据都没有」—— 只数顶层的话每一列的
 * 取值集合都是空的，面板会说「没有适合分组的列」，而用户面前明明就是一张分好组的表。
 *
 * 分组行与树形父节点身上都挂着 `children`，钻进去就拿得到真实数据行。
 *
 * **还要按对象身份去重。** 分组展开时同一行会出现两次（显示列表里的那一份 + 从分组行的
 * `children` 钻到的那一份），于是样本量翻倍 —— 而下面「取值种类要少于样本行数」那条判据吃的
 * 正是这个比值：名称三行三个值本该被排除，样本翻成 6 行之后 `3 < 6` 成立，它就混进候选了
 * （实测：开完第一级分组，第二级的下拉里冒出「名称」）。
 */
function sampleRows<T extends Record<string, any>>(rows: T[]): T[] {
  const out: T[] = [];
  const seen = new Set<unknown>();
  const walk = (list: T[]): void => {
    for (const row of list) {
      if (out.length >= SAMPLE_ROWS) return;
      const type = (row as any)._rowType;
      if (type !== 'group' && type !== 'expand' && !seen.has(row)) {
        seen.add(row);
        out.push(row);
      }
      const kids = (row as any).children;
      if (Array.isArray(kids) && kids.length > 0) walk(kids as T[]);
    }
  };
  walk(rows);
  return out;
}

/**
 * 「像不像一个日期」。
 *
 * **不用 `new Date(x)` 试**：`Date` 的构造对字符串宽容到没有判据（`'2'` 会变成 2001 年），
 * 拿它筛选会把任务编号列也认成日期列。只认三种明确形态：`YYYY-MM-DD`、`Date` 实例、
 * 毫秒时间戳量级的数字（> 1e11）。
 */
function isDateLike(v: unknown): boolean {
  if (v instanceof Date) return !Number.isNaN(v.getTime());
  if (typeof v === 'number') return Number.isFinite(v) && Math.abs(v) > 1e11;
  if (typeof v !== 'string') return false;
  return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}([ T]|$)/.test(v.trim());
}

/** 能当分组维度的列：取值种类不多、不是日期、且**至少有一个取值重复出现** */
export function inferGroupColumns<T extends Record<string, any>>(
  ctx: PluginContext<T>,
): Array<{ key: string; title: string }> {
  const sample = sampleRows(ctx.getList());
  if (sample.length === 0) return [];
  return (ctx.table.getVisibleColumns() as VirtTableColumn<T>[])
    .filter((col) => isDataColumn(col) && !!col.title)
    .filter((col) => {
      const values = new Set<string>();
      for (const row of sample) {
        const raw = (row as Record<string, unknown>)[col.key];
        if (raw == null || raw === '') continue;
        if (typeof raw !== 'string' && typeof raw !== 'number') return false;
        if (isDateLike(raw)) return false;
        values.add(String(raw));
        if (values.size > MAX_GROUP_DISTINCT) return false;
      }
      /*
       * 要求「取值种类少于样本行数」= 至少有一个值重复。少了这条，**逐行唯一**的列
       * （名称、编号）在小表上会挤进候选：三行三个名字也满足「不超过 50 种」，
       * 而按它分组等于给每行套一个只有自己的分组 —— 那不是分组，是把表打散。
       */
      return values.size >= 2 && values.size < sample.length;
    })
    .map((col) => ({ key: String(col.key), title: String(col.title) }));
}

/**
 * 能拿来排序的列。判据**不看数据看列配置**：`sortable: false` 是使用方明确说过「这列不排序」
 * （表头点击排序也认这一条），面板不该给他绕过去的入口。反过来没写 `sortable` 的列一律可选 ——
 * 核心要求 `sortable: true` 才在表头显示箭头，但 `sort()` 对任何列都有效，而这颗按钮的意义
 * 正是「按任何一列排」。
 */
export function inferSortColumns<T extends Record<string, any>>(
  ctx: PluginContext<T>,
): Array<{ key: string; title: string }> {
  return (ctx.table.getVisibleColumns() as VirtTableColumn<T>[])
    .filter((col) => isDataColumn(col) && !!col.title && col.sortable !== false)
    .map((col) => ({ key: String(col.key), title: String(col.title) }));
}

export const toOptions = (list: Array<{ key: string; title: string }>): SelectFieldOption[] =>
  list.map((c) => ({ value: c.key, label: c.title }));
