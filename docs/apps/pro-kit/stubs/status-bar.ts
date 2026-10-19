/**
 * `@virt-table-pro/status-bar` 的**桩**（同级目录没有 pro 仓库的产物时由 vite alias 顶上）。
 * 背景与取舍见本目录 README，写法与 `pivot.ts` 那份同款。
 *
 * 真包在表格底部加一条实时汇总：框选一片给出计数/求和/平均/极值，左边是行数统计。
 * 它靠核心的 `CellSelectionService.subscribe`（多消费者订阅）跟着选区刷，
 * 靠 `getSourceRowCount()` 拿筛选前的总行数。
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PluginContext, VirtTablePlugin } from '@virt-table/vanilla';
import { stubNotice } from './stub-notice';

/*
 * ⚠️ 泛型默认值必须与真包一致（`= any`），不能收紧成 `Record<string, unknown>`。
 * 三端 app 的类型检查吃的是**桩**（见各自 tsconfig 的 `@virt-table-pro/*` 映射），
 * 收紧会让 demo 在具体行类型下报错，而真包那边完全正常。
 */

/** 一项能算的东西 */
export type StatusAggKind =
  | 'count'
  | 'numericCount'
  | 'filled'
  | 'sum'
  | 'avg'
  | 'min'
  | 'max'
  | 'distinct';

/** 左侧那组「一共多少行」的计数项 */
export type StatusCountKind = 'total' | 'filtered' | 'checked' | 'selectedRows';

export interface AggregateResult {
  count: number;
  numericCount: number;
  filled: number;
  sum: number | null;
  avg: number | null;
  min: number | null;
  max: number | null;
  distinct: number;
}

export interface StatusBarItem {
  key: string;
  label: string;
  /** 空字符串则整项不显示 */
  value: string;
  copyText?: string;
  side?: 'left' | 'right';
}

export interface StatusBarSummary {
  selection: AggregateResult;
  range: { startRow: number; startCol: number; endRow: number; endCol: number } | null;
  /** 选区覆盖了哪些列（leaf 列的 key） */
  columnKeys: string[];
  total: number;
  filtered: number;
  checked: number;
  selectedRows: number;
}

export interface StatusBarOptions<T = any> {
  mount?: HTMLElement | (() => HTMLElement | null);
  aggregates?: StatusAggKind[];
  counts?: StatusCountKind[];
  format?: (
    value: number,
    kind: StatusAggKind,
    ctx: { columnKeys: string[]; result: AggregateResult },
  ) => string;
  items?: (summary: StatusBarSummary) => StatusBarItem[];
  copyOnClick?: boolean;
  texts?: Partial<Record<StatusAggKind | StatusCountKind | 'copied', string>>;
  visible?: boolean;
  _?: T;
}

export function vtStatusBar<T extends Record<string, any> = any>(
  _options: StatusBarOptions<T> = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtStatusBar',
    setup(_ctx: PluginContext<T>) {
      stubNotice('vtStatusBar');
    },
  };
}

/** 真包的纯算术层也是公开导出，桩这边给同名的空实现 —— demo 里引了它就得解析得到 */
export function aggregate(_values: readonly unknown[]): AggregateResult {
  return {
    count: 0,
    numericCount: 0,
    filled: 0,
    sum: null,
    avg: null,
    min: null,
    max: null,
    distinct: 0,
  };
}

export function toNumber(_value: unknown): number | null {
  return null;
}

export function formatNumber(value: number, _kind: StatusAggKind): string {
  return String(value);
}

/** 真包用 `declare module` 注入这几个方法，这里照做一份 —— **可选**，桩生效时它们不存在 */
declare module '@virt-table/vanilla' {
  interface VirtTablePluginApi {
    /** 重新计算并重绘状态栏 */
    refreshStatusBar?(): void;
    /** 当前汇总：选区聚合 + 行数统计 */
    getStatusBarSummary?(): StatusBarSummary;
    /** 显隐状态栏；不传参则切换 */
    showStatusBar?(visible?: boolean): void;
    /** 状态栏当前是否显示 */
    isStatusBarVisible?(): boolean;
  }
}
