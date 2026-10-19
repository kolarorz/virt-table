/**
 * `@virt-table-pro/pivot` 的**桩**（同级目录没有 pro 仓库的产物时由 vite alias 顶上）。
 * 背景与取舍见本目录 README，写法与 `xlsx.ts` 那份同款。
 *
 * 真包把明细行换成「行维度树 × 列维度分组表头」的交叉表：它用核心的
 * `transformSourceRows` 钩子在数据管线最前面接管行集，同时 `setColumns()` 换列。
 * 折叠展开、缩进、跨列表头格全部是核心的。
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PluginContext, VirtTablePlugin } from '@virt-table/vanilla';
import { stubNotice } from './stub-notice';

/** 聚合方式 */
export type PivotAgg = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'countDistinct';

/*
 * ⚠️ 泛型默认值必须与真包一致（`= any`），不能收紧成 `Record<string, unknown>`。
 *
 * 三端 app 的 tsconfig 把 `@virt-table-pro/*` 指到本目录（见各自的 tsconfig.app.json），
 * 于是 demo 的类型检查吃的是**桩**。收紧默认值会让 `setPivotConfig({ values: [...] })`
 * 在具体行类型下报「PivotValue<Row> 不能赋给 PivotValue<Record<string, unknown>>」——
 * 而真包那边完全正常。桩的类型是给 demo 用的契约副本，不该比真包更严。
 */

/** 一个值字段 */
export interface PivotValue<T = any> {
  field: string;
  agg: PivotAgg | ((rows: T[]) => unknown);
  /** 表头上显示的名字，默认「字段 + 聚合名」 */
  title?: string;
}

export interface PivotOptions<T = any> {
  /** 行维度字段，顺序即层级 */
  rows?: string[];
  /** 列维度字段（交叉分析的横轴），顺序即表头层级 */
  columns?: string[];
  values?: PivotValue<T>[];
  /** 行维度中间层出小计行，默认 true。false 时变成平表（每个维度各占一列） */
  showSubtotals?: boolean;
  /** 最后加一行总计，默认 true */
  showGrandTotal?: boolean;
  /** 有列维度时最右边再来一组总计列，默认 true */
  showColumnTotal?: boolean;
  /** 只统计满足条件的明细行 —— 列头筛选筛的是透视结果，源数据级的条件放这里 */
  filter?: (row: T) => boolean;
  /** 维度取值排序，默认 'asc'（数字型取值按数值排） */
  sortDimensions?: 'asc' | 'desc' | false;
  dimWidth?: number;
  valueWidth?: number;
  dimTitle?: string;
  totalTitle?: string;
  /** 维度格右侧的条数徽标，默认 true */
  showCount?: boolean;
  formatValue?: (value: unknown, v: PivotValue<T>) => string;
  renderValue?: (v: PivotValue<T>) => unknown;
}

/** 列维度取值树的一个节点 */
export interface ColNode {
  value: string;
  path: string[];
  children?: ColNode[];
}

/** 透视结果 */
export interface PivotResult {
  rows: Array<Record<string, unknown>>;
  colTree: ColNode[];
  colPaths: string[][];
  sourceCount: number;
}

export type PivotConfig<T = any> = PivotOptions<T> | null | undefined;

export function vtPivot<T extends Record<string, any> = any>(
  _options: PivotOptions<T> = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtPivot',
    setup(_ctx: PluginContext<T>) {
      stubNotice('vtPivot');
    },
  };
}

/** 真包用 `declare module` 注入这三个方法，这里照做一份 —— **可选**，桩生效时它们不存在 */
declare module '@virt-table/vanilla' {
  interface VirtTablePluginApi {
    /** 重设透视配置并重算；`null` 关掉透视 */
    setPivotConfig?(config: PivotConfig): void;
    /** 当前配置的副本，关着时 null */
    getPivotConfig?(): PivotOptions | null;
    /** 当前透视结果，关着时 null */
    getPivotResult?(): PivotResult | null;
  }
}
