/**
 * `@virt-table-pro/gantt` 的**桩**（同级目录没有 pro 仓库的产物时由 vite alias 顶上）。
 * 背景与取舍见本目录 README。
 *
 * 与 `floating-image.ts` 那份同款：返回一个合法插件、只调一次 `stubNotice()`、
 * 不往表格子树里插任何 DOM，
 * 并把 demo 用到的类型与实例方法声明齐（方法一律**可选**，逼调用方写
 * `table.setGanttZoom?.(…)` —— 桩生效时它们在运行时确实不存在）。
 *
 * 这里只列 demo 真正用到的字段。桩不是 API 文档，真源是付费包自己的 d.ts 与文档站。
 */
import type { PluginContext, VirtTablePlugin } from '@virt-table/vanilla';
import { stubNotice } from './stub-notice';

export type GanttZoom = 'day' | 'week' | 'month' | 'quarter';

export interface GanttMarker {
  date: unknown;
  label?: string;
  color?: string;
  className?: string;
}

/** 一个法定节假日。给日期就够，带 `label` 的话表头那一格会用它做 `title` */
export type GanttHoliday =
  | string
  | number
  | Date
  | { date: string | number | Date; label?: string };

export interface GanttChange<T = Record<string, unknown>> {
  kind: string;
  rowKey: string;
  row: T;
  rowIndex: number;
  start: number;
  end: number;
  progress: number;
  prev: { start: number; end: number; progress: number };
}

export interface GanttCreate<T = Record<string, unknown>> {
  rowKey: string;
  row: T;
  rowIndex: number;
  start: number;
  end: number;
}

export interface GanttEditable {
  move?: boolean;
  resize?: boolean;
  progress?: boolean;
  create?: boolean;
  marker?: boolean;
  reorder?: boolean;
}

export interface GanttOptions<T = Record<string, unknown>> {
  start: keyof T | ((row: T) => unknown);
  end: keyof T | ((row: T) => unknown);
  endInclusive?: boolean;
  progress?: keyof T | ((row: T) => unknown);
  /** 字段名或函数。字段名那种写法配置面板能回显、也能当场换成别的列 */
  barLabel?: string | ((row: T, rowIndex: number) => string | undefined);
  barColor?: {
    field: keyof T | ((row: T) => unknown);
    colors: Record<string, string>;
    fallback?: string;
    tint?: number;
  };
  /** 顶部「甘特图配置」工具栏。`true` = 全开，给对象可以只留其中几行 */
  toolbar?: boolean | Record<string, boolean>;
  /** 只计算工作日：条上的工期数字跳过非工作日，那几列画斜线 */
  workdaysOnly?: boolean;
  /** 计工期时也跳过法定节假日（要配 `holidays`） */
  skipHolidays?: boolean;
  /** 法定节假日表。插件不内置任何国家的调休安排，这是入参 */
  holidays?: GanttHoliday[];
  /** 非工作日判定（默认周六周日）。国内的补班日要靠它排除 */
  isNonWorking?: (date: Date) => boolean;
  zoom?: GanttZoom;
  bucketWidth?: number | Partial<Record<GanttZoom, number>>;
  range?: { start: unknown; end: unknown };
  markers?: GanttMarker[];
  markerColors?: string[];
  onMarkersChange?: (markers: GanttMarker[]) => void;
  summaryBars?: boolean | 'group' | 'container';
  /** 左侧任务面板的初始宽度（px）。不给时按业务列总宽推，但不超过容器的 45% */
  panelWidth?: number;
  /** 允许拖两个 pane 的分界调面板宽度，默认 true */
  panelResizable?: boolean;
  /** 冻结面板开头那几列（功能列 + 第一个数据列），默认 true */
  freezeFirstColumn?: boolean;
  editable?: boolean | GanttEditable;
  zoomSwitcher?: boolean | GanttZoom[];
  panelToggle?: boolean;
  showToday?: boolean;
  onChange?: (e: GanttChange<T>) => void;
  onCreate?: (e: GanttCreate<T>) => void;
  onBarClick?: (rowKey: string, row: T, ev: MouseEvent) => void;
  onZoomChange?: (zoom: GanttZoom) => void;
  /** 时间轴范围变了（首帧 / 换粒度 / 按数据自动扩展）。真包里它总是异步送达 */
  onRangeChange?: (range: { start: number; end: number }) => void;
  /** 从表头新增了一个里程碑（需 `editable.marker`） */
  onMarkerCreate?: (marker: GanttMarker) => void;
}

export function vtGantt<T extends Record<string, unknown> = Record<string, unknown>>(
  _options: GanttOptions<T>,
): VirtTablePlugin<T> {
  return {
    name: 'vtGantt',
    setup(_ctx: PluginContext<T>) {
      stubNotice('vtGantt');
    },
  };
}

/** 真包用 `declare module` 注入这些方法，这里照做一份 —— **全部可选**，桩生效时它们不存在 */
declare module '@virt-table/vanilla' {
  interface VirtTablePluginApi {
    setGanttZoom?(zoom: GanttZoom): void;
    getGanttZoom?(): GanttZoom;
    setGanttRange?(start: unknown, end: unknown): void;
    getGanttRange?(): { start: number; end: number } | null;
    setGanttMarkers?(markers: GanttMarker[]): void;
    getGanttMarkers?(): GanttMarker[];
    setGanttWorkdaysOnly?(on: boolean): void;
    setGanttSkipHolidays?(on: boolean): void;
    setGanttHolidays?(list: GanttHoliday[] | null): void;
    setGanttNonWorking?(fn: ((d: Date) => boolean) | null): void;
    setGanttFields?(next: { start?: string; end?: string }): void;
    setGanttLabelField?(field: string | null): void;
    setGanttProgressField?(field: string | null): void;
    setGanttBarColor?(next: GanttOptions['barColor'] | null): void;
    setGanttBarFixedColor?(color: string | null): void;
    scrollGanttTo?(date: unknown): void;
    refreshGantt?(): void;
    collapseGanttPanel?(): void;
    expandGanttPanel?(): void;
    toggleGanttPanel?(): void;
    isGanttPanelCollapsed?(): boolean;
  }
}
