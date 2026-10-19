/**
 * `@virt-table-pro/charts` 的**桩**（同级目录没有 pro 仓库的产物时由 vite alias 顶上）。
 * 背景与取舍见本目录 README，写法与 `pivot.ts` 那份同款。
 *
 * 真包一期出的是**单元格迷你图**（`vtSparkline`）：在 `onCellRendered` 里把一段静态 SVG
 * 画进格子，不引图表库、不建实例。同包的 `vtCharts`（选区出图）仍是占位。
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PluginContext, VirtTablePlugin, VirtTableColumn } from '@virt-table/vanilla';
import { stubNotice } from './stub-notice';

/*
 * ⚠️ 泛型默认值必须与真包一致（`= any`）。三端 app 的类型检查吃的是**桩**，
 * 收紧会让 demo 在具体行类型下报错，而真包那边完全正常。
 */

export type SparklineType = 'line' | 'area' | 'bar' | 'winloss';
export type SparklineMarker = 'first' | 'last' | 'min' | 'max';

export interface SparklineGeometry {
  width: number;
  height: number;
}

export interface SparklineSpec<T = any> {
  type?: SparklineType;
  /** 数组存在行上哪个字段。**默认就是列 key** */
  field?: string;
  values?: (row: T) => readonly unknown[];
  color?: string;
  negativeColor?: string;
  fill?: string;
  lineWidth?: number;
  /** `'row'` 每行自己的极值 / `'shared'` 整列共用 / `[lo, hi]` 写死 */
  range?: 'row' | 'shared' | [number, number];
  markers?: SparklineMarker[] | false;
  baseline?: number;
  gaps?: 'break' | 'skip';
  tooltip?:
    | boolean
    | ((ctx: {
        row: T;
        index: number;
        value: number | null;
        values: Array<number | null>;
        column: VirtTableColumn<T>;
      }) => string);
}

export interface SparklineOptions<T = any> {
  /** 哪些列画迷你图，键是列 key */
  columns: Record<string, SparklineSpec<T>>;
  defaults?: Omit<SparklineSpec<T>, 'field' | 'values'>;
  /** 单元格左右/上下留白，默认 `[4, 4]` */
  padding?: [number, number];
}

export function vtSparkline<T extends Record<string, any> = any>(
  _options: SparklineOptions<T>,
): VirtTablePlugin<T> {
  return {
    name: 'vtSparkline',
    setup(_ctx: PluginContext<T>) {
      stubNotice('vtSparkline');
    },
  };
}

/** SVG 生成层在真包里是公开导出（导出/打印那条路要用），桩这边给同名空实现 */
export function buildSparklineSvg(
  _values: readonly unknown[],
  _geom: SparklineGeometry,
  _style: unknown,
): string {
  return '';
}

/* --------------------------------------------------- 选区出图（真包里也还没做） */

export interface ChartsOptions<T = any> {
  renderer?: (el: HTMLElement, data: unknown) => { update(data: unknown): void; destroy(): void };
  defaultType?: 'line' | 'bar' | 'pie' | 'scatter';
  liveUpdate?: boolean;
  _?: T;
}

export function vtCharts<T extends Record<string, any> = any>(
  _options: ChartsOptions<T> = {},
): VirtTablePlugin<T> {
  return {
    name: 'vtCharts',
    setup(_ctx: PluginContext<T>) {
      stubNotice('vtCharts');
    },
  };
}

/** 真包用 `declare module` 注入这几个方法，这里照做一份 —— **可选**，桩生效时它们不存在 */
declare module '@virt-table/vanilla' {
  interface VirtTablePluginApi {
    /** 单独生成一段迷你图 SVG，给导出/打印用 */
    renderSparklineSvg?(
      values: readonly unknown[],
      colKey?: string,
      geom?: SparklineGeometry,
    ): string;
    /** 丢掉缓存并重画全部迷你图 */
    refreshSparklines?(): void;
  }
}
