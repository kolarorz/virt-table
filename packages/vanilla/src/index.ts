/* eslint-disable @typescript-eslint/no-explicit-any */
import { VirtListCore } from '@virt-list/core';
import type { ListState, VirtListOptions, VirtListEvents } from '@virt-list/core';
/**
 * 自绘滚动条直接复用 virt-list 的实现，不在表格里再写一份。
 *
 * `Scrollbar` 只管「画滑块」与「指针位置 ↔ 比例」的换算，是单轴的、与数据源无关的，
 * 所以纵横两条都用它：纵向的 host 读 core 的账本，横向的 host 读容器的 `scrollWidth`。
 * `positionToRatio` / `ratioToPosition` 是一对严格互逆的纯函数，纵向的按索引映射
 * 靠它们保证「拖到某处松手滑块不跳」。
 */
import {
  Scrollbar,
  InputController,
  positionToRatio,
  ratioToPosition,
} from '@virt-list/vanilla';
import './index.css';
import {
  type MergeCell,
  getMergeInfo,
  calcRenderRect,
  calcMergeRowCount,
  buildMergeCoveredSet,
  planRowCells,
  buildMergeRuns,
  findMergeRun,
  clampMergeRunsToWindow,
  mergeRunsInRange,
  type MergeRuns,
} from './merge';
export type { MergeCell } from './merge';
export {
  buildMergesFromSpan,
  type SpanResult,
  type SpanMethodContext,
} from './merge';
import {
  type SortOrder,
  type SortSpec,
  type FilterType,
  buildComparator,
  sortPreserveStructure,
  buildColumnFilterPredicate,
  filterPreserveStructure,
  collectLeaves,
} from './pipeline';
export type { SortOrder, SortSpec, FilterType } from './pipeline';
export {
  applyRowFilters,
  matchFilter,
  compareValues,
  filterPreserveStructure,
  buildColumnFilterPredicate,
} from './pipeline';
import {
  type FilterModel,
  type FilterNode,
  type FilterGroup,
  type FilterCondition,
  type FilterOperator,
  type FilterValueKind,
  buildFilterModelPredicate,
  isFilterModelActive,
  cloneFilterModel,
} from './filter-model';
export type {
  CellContentType,
  CellImageValue,
  CellOptionValue,
} from './cell-type';
export type {
  FilterModel,
  FilterNode,
  FilterGroup,
  FilterCondition,
  FilterOperator,
  FilterValueKind,
} from './filter-model';
export {
  OPERATOR_LABELS,
  applyFilterModel,
  buildFilterModelPredicate,
  cloneFilterModel,
  countConditions,
  createFilterGroup,
  evalCondition,
  evalFilterNode,
  inferValueKind,
  isConditionComplete,
  isFilterModelActive,
  operandCount,
  operatorsFor,
  operatorsForColumn,
} from './filter-model';
import {
  type HeaderMatrixCell,
  buildHeaderMatrix,
  columnTreeDepth,
  flattenLeafColumns,
  hasColumnGroup,
  isColumnGroup,
  planHeaderRow,
  propagateFixed,
} from './header-group';
export {
  buildHeaderMatrix,
  columnTreeDepth,
  flattenLeafColumns,
  hasColumnGroup,
  isColumnGroup,
  planHeaderRow,
  propagateFixed,
  visibleChildren,
  type HeaderColumnLike,
  type HeaderMatrixCell,
  type HeaderRowPlan,
} from './header-group';
import { computeCellSummary, computeSummaryRow, type SummaryType } from './summary';
export {
  aggregate,
  computeCellSummary,
  computeSummaryRow,
  type SummaryType,
} from './summary';
import { type VirtTableLocale, type DeepPartial, zhCN, mergeLocale } from './locale';
export { type VirtTableLocale, type DeepPartial, zhCN, enUS, mergeLocale } from './locale';
import { pageCount, clampPage, buildPagerItems } from './pagination';
export { pageCount, clampPage, buildPagerItems, type PagerItem } from './pagination';
import { createAutoScroll } from './internal/auto-scroll';
import { startDrag, isPrimaryPointer } from './internal/drag';
import { createTooltip, type TooltipController } from './internal/tooltip';
import {
  PluginRuntime,
  type VirtTablePlugin,
  type CellSelectionRange,
  type SelectionRect,
} from './plugin';
export { PluginRuntime } from './plugin';
export type {
  VirtTablePlugin,
  PluginContext,
  PluginHandle,
  PluginHooks,
  PluginRowData,
  VirtTableHost,
  CellSelectionRange,
  SelectionRect,
  SelectionRows,
  CellSelectionService,
} from './plugin';
// 插件只从 `@virt-table/vanilla/plugins` 导出（见 plugins/index.ts 的说明）：
// 主入口一旦 re-export 它们，插件代码与各自的 CSS 就会落进核心 chunk。
// 下面两个类型给 VirtTablePluginApi 用；`import type` 不产生任何运行时引用。
import type { ExportOptions } from './plugins/export';
import type { SearchMatch } from './plugins/search';
import type { AIQueryResult } from './plugins/ai-query';
import type { AIQuery, AITableSchema } from './ai-query';
import type { AIStreamState, AIStreamChunk, AIStreamConsumeOptions } from './plugins/ai-stream';
import type { AIColumnCellState } from './plugins/ai-column';
import {
  RemoteController,
  infiniteBarView,
  runLoadData,
  settleControlled,
  toRequest,
  TOTAL_UNKNOWN,
  type DataRequest,
  type DataResponse,
  type LoadMoreContext,
  type RemoteState,
  type CommitMode,
  type RemoteReason,
} from './remote';
export {
  RemoteController,
  channelOf,
  deriveHasMore,
  deriveHasPrev,
  infiniteBarView,
  type InfiniteBarView,
  runLoadData,
  settleControlled,
  toRequest,
  TOTAL_UNKNOWN,
  type DataRequest,
  type DataResponse,
  type LoadMoreContext,
  type RemoteState,
  type RemoteQuery,
  type RemoteReason,
  type RemoteChannel,
  type CommitMode,
} from './remote';
export { escapeCsvCell, rowsToCsv, toCsvString, rowsToHtmlTable, toExcelHtml } from './export';
// 内置表单组件（VtInput / VtSelect / VtFilterBuilder …）只从
// `@virt-table/vanilla/components` 导出——核心表格不用它们，放主入口会把
// VtFilterBuilder 那 400 多行 CSS 一起带进核心样式表。
export {
  createSpreadsheetClipboardHandlers,
  getSpreadsheetCellData,
  getSpreadsheetCellDisplayText,
  renderSpreadsheetCellHtml,
  setSpreadsheetCellData,
  type SpreadsheetCellData,
  type SpreadsheetCellMap,
  type SpreadsheetCellType,
  type SpreadsheetClipboardPayload,
  type SpreadsheetClipboardHelpers,
} from './spreadsheet';
import {
  renderCellContent,
  type CellContentType,
} from './cell-type';

/** `VirtTableState` 的结构版本。改动状态形状时 +1，旧状态会被 setState 告警忽略 */
const VIRT_TABLE_STATE_VERSION = 1;

/** 折叠/展开开关图标（展开行 / 树形 / 分组通用），展开态由 CSS 旋转 90° */
const CHEVRON_SVG =
  '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" ' +
  'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M9 6l6 6-6 6"/></svg>';

export interface CellRenderContext<T> {
  value: T[keyof T];
  row: T;
  rowIndex: number;
  column: VirtTableColumn<T>;
}

export interface CellEditContext<T> extends CellRenderContext<T> {
  el: HTMLElement;
}

export interface HeaderRenderContext<T> {
  column: VirtTableColumn<T>;
  /** 是否为多级分组表头的分组节点（有 children、不承载数据） */
  isGroup?: boolean;
  /** 所在表头行（0 基）；扁平表头恒为 0 */
  headerRow?: number;
}

export interface ExpandRenderContext<T> {
  column: VirtTableColumn<T>;
  row: T;
}

/** 多级分组表尾的单元格渲染上下文 */
export interface FooterRenderContext<T> {
  /** 该格对应的列节点（分组节点或叶子列） */
  column: VirtTableColumn<T>;
  /** 是否为分组节点 */
  isGroup: boolean;
  /** 所在表尾行（0 基，与表头同序：0 是最外层分组） */
  footerRow: number;
  /** 该格覆盖的可见叶子列（分组格为其全部叶子后代，叶子格为它自己） */
  leafColumns: VirtTableColumn<T>[];
  /** 当前视图的叶子数据行（已筛选/排序，不含分组行/展开行） */
  rows: T[];
  /** showSummary 下该格的自动聚合结果；没有聚合配置时为空串 */
  summary: string;
}

/**
 * 单元格级渲染配置。既是 `setCellRender()` 的入参，也是行数据 `_cellRenders` 的值类型。
 *
 * **与列级同形**是刻意的：内容层的每个粒度都接受 `render` 与 `cellType` 两种来源。
 * 早先这里只有 `render`，于是「就这一格画成 option 胶囊」得手写 render 去复刻
 * `.vt-cell-option` 的内置样式 —— 同一层的不同粒度接受不同形状，是纯粹的坑。
 */
export interface CellRenderConfig<T = any> {
  render?: (ctx: CellRenderContext<T>) => string | HTMLElement;
  /**
   * 这一格的内容类型，语义与 `col.cellType` 完全相同，只是作用范围是单个格子。
   *
   * 优先级低于**同级**的 `render`，但高于列级的 `render`（粒度优先，见
   * `_resolveCellContent`）。
   */
  cellType?: CellContentType;
  renderEditor?: (ctx: CellEditContext<T>) => HTMLElement | null | void;
}

/**
 * 内容层解析的结果（`_resolveCellContent` 的返回值）。三种内容来源各是一支，
 * 装填方式完全不同：`render` 可能给 HTML 字符串，`cellType` 走判别式结果（只有
 * rich-text 碰 innerHTML），`value` 一律 `textContent`。
 */
type ResolvedCellContent<T> =
  | { source: 'render'; render: (ctx: CellRenderContext<T>) => string | HTMLElement }
  | { source: 'cellType'; cellType: CellContentType }
  | { source: 'value' };

/**
 * 行数据上那批下划线字段的**契约**。以前它们全靠约定，使用方既拿不到类型提示
 * （只能 `as any`），也分不清哪些能自己写、哪些是内核写入的。
 *
 * 用法：`interface Row extends VirtTableRowExtras<Row> { id: number; name: string }`
 *
 * ⚠️ `_cellRenders` 能用但**不推荐**：把函数塞进数据对象会污染
 * `JSON.stringify` / 深拷贝 / 数据 diff，且在 React/Vue 端拿不到 VNode 包装
 * （返回 JSX 会失败）。请改用 `setCellRender()`，它存在表格实例里、不碰你的数据。
 */
export interface VirtTableRowExtras<T = any> {
  /** 单元格级渲染配置（兼容入口，优先用 `setCellRender()`） */
  _cellRenders?: Record<string, CellRenderConfig<T>>;
  /** 树形子节点（也用于懒加载回填） */
  children?: T[];
  /** 只读，内核写入：树形层级，从 1 起 */
  readonly _treeLevel?: number;
  /** 只读，内核写入：分组层级，从 1 起 */
  readonly _groupLevel?: number;
  /** 只读，内核写入：是否有子节点（含懒加载未展开） */
  readonly _hasChildren?: boolean;
  /** 只读，内核写入：合成行类型（分组行 / 展开行），数据行为 undefined */
  readonly _rowType?: 'group' | 'expand';
}

export interface VirtTableColumn<T = any> {
  key: string;
  title: string;
  /**
   * 列宽（px）。分组节点（有 `children`）可省略：其宽度恒等于可见子列宽度之和。
   */
  width: number;
  /**
   * 子列 —— 配置它即成为**多级分组表头**的分组节点：本列不承载数据，
   * 只在表头占一格并横跨全部可见叶子后代；真正的数据列是树的叶子。
   *
   * 约束：
   * - `fixed` 以分组为准，会强制下发给所有后代（避免分组与叶子分属不同冻结区段）
   * - `sortable`/`filters`/`render` 等数据相关配置写在叶子列上
   * - 与 `headerData`/`headerMerges`（手写多行表头）互斥，配置 children 时后者被忽略
   */
  children?: VirtTableColumn<T>[];
  fixed?: 'left' | 'right';
  /**
   * **功能列**：独占整个单元格（序号 / 勾选 / 单选 / 拖拽 / 展开），配在它们上的
   * `render` 会被忽略并告警。唯一例外是 `tree` —— 它只加缩进与折叠箭头，内容照常走
   * `render` / `cellType` / 默认取值。
   *
   * 别和 `cellType` 混淆：那个管「值画成什么样」，这个管「这一列是不是功能列」。
   */
  type?: 'index' | 'checkbox' | 'expand' | 'tree' | 'radio' | 'drag';
  /**
   * **内容类型**：把 `row[key]` 按内置样式渲染，省掉手写 `render`。
   *
   * | 取值 | 期望的值 |
   * | --- | --- |
   * | `text` / `number` | 原始值（`number` 不做千分位，那是格式化职责） |
   * | `rich-text` | HTML 字符串（**按 HTML 插入，自负安全**） |
   * | `image` | URL 字符串，或 `{ url, alt }` |
   * | `option` | 标签字符串，或 `{ label, color }` |
   * | `checkbox` | 布尔（渲染成只读勾选框） |
   *
   * 优先级低于 `render`（单元格级与列级都算），高于默认取值。与 `textOverflow`、
   * `mergeKey` 等容器能力叠加使用没有限制。
   */
  cellType?: CellContentType;
  render?: (ctx: CellRenderContext<T>) => string | HTMLElement;
  renderEditor?: (ctx: CellEditContext<T>) => HTMLElement | null | void;
  /**
   * 编辑浮层（`vtCellEditor`）要不要替这一列画外观 —— 边框、focus 环，默认 `true`。
   *
   * 默认那套建立在一个契约上：**浮层画外观，编辑器组件退化成纯内容层**。内置 `vt-*`
   * 遵守它（`.vt-comp-input` 自己 `border: none; background: transparent`），所以默认值
   * 对它们是对的。
   *
   * 但**第三方组件库自带一整套外观**（静态边框 + `.is-focus` 加深 + error 变红 + hover
   * 变色），和浮层的边框叠起来就是两层框，高度也对不上：浮层会把组件拉满单元格，而组件
   * 自己有固定 size（`el-input--small` 是 24px）。这类列设 `false`，浮层退成纯定位层
   * （只保留背景盖住底下的查看态），外观连交互态一起交给组件自己。
   *
   * 全表统一时用插件选项更省事：`vtCellEditor({ chrome: false })`；列上这个值优先。
   */
  editorChrome?: boolean;
  renderHeader?: (ctx: HeaderRenderContext<T>) => string | HTMLElement;
  renderExpandRow?: (ctx: ExpandRenderContext<T>) => string | HTMLElement;
  align?: 'left' | 'center' | 'right';
  vAlign?: 'top' | 'middle' | 'bottom';
  headerAlign?: 'left' | 'center' | 'right';
  headerVAlign?: 'top' | 'middle' | 'bottom';
  footerAlign?: 'left' | 'center' | 'right';
  footerVAlign?: 'top' | 'middle' | 'bottom';
  textOverflow?: 'ellipsis' | 'tooltip';
  /**
   * 相邻同键自动纵向合并（「按值合并」）。
   *
   * - `true` —— 用 `row[key]` 作为比较键
   * - 函数 —— 自定义比较键；返回 `undefined` 表示该行不参与合并
   *
   * 键用 `!==` 比较，请返回原始值；要按多字段合并就自己拼成字符串。
   * 分段在数据管线末端（筛选 / 排序 / 树形展开**之后**）重算，因此**不影响排序**
   * ——与静态 `merges` 不同，配了 `mergeKey` 的列照样能排序。分组行与树形层级变化处
   * 会自动断段。
   *
   * ⚠️ 只对**非固定列**生效：`merges` 的坐标系里固定列不参与合并（见
   * `docs/vanilla/guide/notes.md` 的「合并单元格的坐标系」）。配在固定列上会告警并忽略。
   */
  mergeKey?: boolean | ((row: T, rowIndex: number) => unknown);
  /**
   * `mergeKey` 的单段最大跨度，超出则断开。
   *
   * 不配则不限。长段在滚动时会「重锚」（合并格起点被抬到可视区顶部，内容跟着走）；
   * 不想要这个观感就用它把段切碎，代价是长段之间出现分隔线。
   */
  mergeMaxSpan?: number;
  resizable?: boolean;
  minWidth?: number;
  maxWidth?: number;
  filters?: Array<{ label: string; value: unknown; checked?: boolean }>;
  filterMultiple?: boolean;
  filterMethod?: (value: unknown, row: T) => boolean;
  /** 筛选类型：enum(默认，枚举勾选) | text(关键字) | number-range | date-range */
  filterType?: FilterType;
  /** 高级筛选值域类别（默认由 filterType/filters 推断），决定可用算子与输入控件 */
  filterValueKind?: FilterValueKind;
  /** 高级筛选可用算子白名单（默认按值域类别给全集） */
  filterOperators?: FilterOperator[];
  /** 是否可点击表头排序 */
  sortable?: boolean;
  /** 自定义排序比较（返回 <0 / 0 / >0） */
  sortMethod?: (a: T, b: T) => number;
  /** 初始排序方向 */
  defaultSort?: SortOrder;
  /**
   * 自动聚合类型（配合 option.showSummary）。
   * 写在**分组节点**上时（多级分组表尾），聚合范围是它旗下全部叶子列 × 全部行的摊平值。
   */
  summary?: SummaryType;
  /** 自定义聚合，返回合计单元格内容。分组节点上的 values 为旗下全部叶子列的摊平值 */
  summaryMethod?: (values: unknown[], rows: T[]) => string | number;
  /**
   * 多级分组表尾：该列节点在表尾格里显示的静态内容（分组节点与叶子列都可用）。
   * 优先级低于 `renderFooter`、高于 `summary` 自动聚合。
   */
  footerValue?: string | number;
  /** 多级分组表尾：该列节点表尾格的自定义渲染（返回字符串时按 HTML 插入） */
  renderFooter?: (ctx: FooterRenderContext<T>) => string | HTMLElement;
  /** 导出时的单元格取值（覆盖默认 row[key]） */
  exportValue?: (row: T) => string | number;
  /** 单元格校验：返回 true 通过，返回字符串为错误信息 */
  validator?: (value: unknown, row: T) => true | string;
  /** 是否隐藏该列 */
  hidden?: boolean;
  /** 是否允许在列设置面板中切换显隐（默认 true） */
  hideable?: boolean;
}

export interface VirtTableOptions<T extends Record<string, any>>
  extends Omit<VirtListOptions<T>, 'horizontal'> {
  columns: VirtTableColumn<T>[];
  colBuffer?: number;
  merges?: MergeCell[];
  headerData?: string[][];
  headerMerges?: MergeCell[];
  footerData?: string[][];
  footerMerges?: MergeCell[];
  border?: boolean;
  stripe?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  emptyText?: string;
  align?: 'left' | 'center' | 'right';
  vAlign?: 'top' | 'middle' | 'bottom';
  headerAlign?: 'left' | 'center' | 'right';
  headerVAlign?: 'top' | 'middle' | 'bottom';
  footerAlign?: 'left' | 'center' | 'right';
  footerVAlign?: 'top' | 'middle' | 'bottom';
  /**
   * **表级内容类型兜底**：没配 `render` / `cellType` 的列按它渲染。内容层最低一级
   * （只比 `String(row[key])` 高）。
   *
   * 只有 `cellType` 有表级形态，**刻意不提供表级 `render`** —— 那等于「所有列画得
   * 一模一样」，真实需求（整表的外观/类名）由 `cellClass` / `cellStyle` 承担。
   */
  cellType?: CellContentType;
  textOverflow?: 'ellipsis' | 'tooltip';
  /**
   * `textOverflow: 'tooltip'` 的浮层配置。
   *
   * 做成对象而不是扁平的 `tooltipDelay`，是留着后面加 `maxWidth` / `placement`
   * 之类不用再动一次 API（包未发布，趁早）。
   */
  tooltip?: {
    /**
     * 悬停延迟（ms，默认 150）。0 表示立即弹。
     *
     * 太小会在鼠标横扫单元格时闪，太大则显得迟钝。浏览器原生气泡的延迟约 1s 起
     * 且不可调，这是当初自绘浮层的原因之一。
     */
    delay?: number;
  };
  highlightHoverRow?: boolean;
  highlightSelectRow?: boolean;
  highlightSelectCol?: boolean;
  highlightSelectCell?: boolean;
  headerClass?: string;
  headerStyle?: string;
  rowClass?: string | ((row: T, index: number) => string);
  rowStyle?: string | ((row: T, index: number) => string);
  cellClass?: string | ((column: VirtTableColumn<T>, row: T) => string);
  cellStyle?: string | ((column: VirtTableColumn<T>, row: T) => string);
  defaultExpandAll?: boolean;
  groupConfig?: { field: string; sort?: 'asc' | 'desc' }[];
  /** 选区变化回调（由 `vtCellSelection` 插件派发；也可写在插件配置的 onChange 里） */
  onCellSelectionChange?: (range: { startRow: number; startCol: number; endRow: number; endCol: number } | null) => void;
  /**
   * 插件列表：把可选的 UI / 交互层按需装入。
   *
   * 例：`plugins: [vtContextMenu(fn), vtSearch(), vtClipboard(), vtExport()]`。
   * 插件在构造时装载，运行时替换本字段不会重新装载。
   */
  plugins?: VirtTablePlugin<T>[];
  /**
   * 自绘滚动条停止滚动多久后淡出（ms）。`0` 表示常驻，默认 1200。
   *
   * 两条滚动条都是自绘的浮层轨道（纵向由 core 的偏移量驱动，横向驱动原生 `scrollLeft`），
   * 默认淡出与 macOS 的 overlay 滚动条一致，指针悬在表格上时也会显形。
   */
  scrollbarAutoHide?: number;
  /** 自绘滚动条滑块的最小长度（px），默认 20。太短会没法用鼠标抓住 */
  scrollbarMinThumbSize?: number;
  onFilterChange?: (filters: Record<string, unknown[]>) => void;
  /** 高级筛选模型（AND/OR 条件树）；与列头筛选是 AND 关系 */
  filterModel?: FilterModel;
  /** 高级筛选模型变化回调 */
  onFilterModelChange?: (model: FilterModel) => void;
  /** 排序模式：single(单列，默认) | multiple(Shift+点击多列) */
  sortMode?: 'single' | 'multiple';
  /** 排序变化回调 */
  onSortChange?: (sortState: SortSpec[]) => void;
  /** 加载态遮罩 */
  loading?: boolean;
  /** 加载态文案 */
  loadingText?: string;
  /** 国际化文案覆盖：与内置 zhCN 深合并（默认 zhCN，另有内置 enUS）。emptyText/loadingText/summaryText 优先级更高 */
  locale?: DeepPartial<VirtTableLocale>;
  /** 主题：light(默认) | dark */
  theme?: 'light' | 'dark';
  /** 显示自动聚合合计行（占用表尾，配合列的 summary/summaryMethod） */
  showSummary?: boolean;
  /** 合计行首列标签 */
  summaryText?: string;
  /** 列顺序变化回调 */
  onColumnOrderChange?: (columns: VirtTableColumn<T>[]) => void;
  /** 行顺序变化回调 */
  onRowOrderChange?: (list: T[], from: number, to: number) => void;
  /** 置顶固定行（不参与虚拟滚动，冻结在表头下方） */
  pinnedTop?: T[];
  /** 置底固定行（冻结在表尾上方） */
  pinnedBottom?: T[];
  onCheckChange?: (checked: boolean, row: T) => void;
  onCheckAll?: (checked: boolean) => void;
  /** 单选行变化回调（配合 type:'radio' 列） */
  onRadioChange?: (row: T) => void;
  onExpandChange?: (row: T, expandedKeys: string[]) => void;
  onTreeToggle?: (row: T, expanded: boolean) => void;
  onGroupToggle?: (row: T, expanded: boolean) => void;
  onRowRemoved?: (tr: HTMLTableRowElement) => void;
  /**
   * 分页器（仅服务端 UI 模式）：存在即渲染分页条。表格只渲染 UI 并派发 onPageChange，
   * 不做任何数据切片；total 由外部提供，用户在 onPageChange 里自行取数并 setList。
   * 配了 `loadData` / `onLoadMore` 时改由表格负责取数，无需再自行处理 onPageChange。
   */
  /**
   * 分页器。传了就渲染分页条（总数 + 每页条数 + 上/下页 + 页码 + 跳页）。
   *
   * **默认是客户端分页**：表格自己切片，`total` 由筛选后的行数派生，翻页不用管数据。
   * 开 `manualPagination`（或 `dataMode: 'server'`）则切换成服务端模式——表格只渲染
   * 分页器、派发 `onPageChange`，数据与 `total` 由使用方负责。
   */
  pagination?: {
    /**
     * 总条数（默认 0）。**仅服务端分页模式有效**；客户端分页下由筛选后的行数派生，
     * 传了会被忽略（`setTotal()` 同样会告警并跳过）。
     */
    total?: number;
    /** 当前页（1 基，默认 1） */
    page?: number;
    /** 每页条数（默认 pageSizes[0] ?? 10） */
    pageSize?: number;
    /** 每页条数下拉选项（默认 [10, 20, 50, 100]） */
    pageSizes?: number[];
  };
  /** 翻页/切换每页条数回调，参数为最新的页码与每页条数 */
  onPageChange?: (page: number, pageSize: number) => void;

  // --------------- 服务端数据 / 无限滚动 ---------------

  /**
   * 排序交给服务端：表头点击/`sort()` 不再本地排序，只更新排序状态并重新取数。
   * `dataMode: 'server'` 是它与 manualFiltering / manualPagination 三者的快捷方式。
   */
  manualSorting?: boolean;
  /** 筛选交给服务端：列头筛选与高级筛选不再本地过滤，只更新状态并重新取数 */
  manualFiltering?: boolean;
  /** 分页/加载交给服务端：翻页与无限滚动都通过取数完成 */
  manualPagination?: boolean;
  /** 快捷方式：'server' 等价于 manualSorting/manualFiltering/manualPagination 全开 */
  dataMode?: 'client' | 'server';

  /**
   * 取数糖层：给了它就由表格编排请求（竞态、去重、状态、错误重试都不用管）。
   * 与受控层 `onLoadMore` 互斥（同时存在时 `onLoadMore` 优先）。
   */
  loadData?: (req: DataRequest) => Promise<DataResponse<T>> | DataResponse<T>;
  /**
   * 受控层：需要取数时调用（已去重、已判 hasMore、已加锁）。
   * 用户自己发请求，然后 `ctx.done(rows, meta)` 交付或 `ctx.fail(err)`；
   * 也可返回 Promise —— reject 自动记为失败，resolve 未交付则视为已自行 setList。
   */
  onLoadMore?: (ctx: LoadMoreContext<T>) => void | Promise<void>;
  /** 受控层：向上加载更早的数据（需 infinite.direction 含 'up'），语义同 onLoadMore */
  onLoadPrev?: (ctx: LoadMoreContext<T>) => void | Promise<void>;

  /** 无限滚动配置（存在即启用）；与 `pagination` 互斥——同时给出时以 pagination 为准并告警 */
  infinite?: {
    /** 是否启用（默认 true；给了 infinite 对象即视为想启用） */
    enabled?: boolean;
    /** 每批条数（默认 50；同时给 pagination 时以 pagination.pageSize 为准） */
    pageSize?: number;
    /** 距底/距顶多少 px 触发（默认 200），写入内核的 `edgeThreshold` */
    distance?: number;
    /** 首屏是否自动取第一批（默认 true；已给 list 初值时默认 false） */
    autoLoadFirst?: boolean;
    /** 只渲染「加载更多」按钮，不自动触发（弱网/移动端友好） */
    manual?: boolean;
    /** 加载方向：down(默认) | up | both */
    direction?: 'down' | 'up' | 'both';
    /** 到底后是否显示「没有更多」（默认 true） */
    showNoMore?: boolean;
  };

  /** 每批数据取回后触发（含首屏与追加） */
  onLoad?: (res: DataResponse<T>, req: DataRequest) => void;
  /** 取数失败触发（表格会保留已加载数据并在状态条给出重试入口） */
  onLoadError?: (err: unknown, req: DataRequest) => void;
  /** 远程状态变化（loading/hasMore/total/page 等），可用于外部同步 UI */
  onRemoteStateChange?: (state: RemoteState) => void;

  // --------------- 树形子节点懒加载 ---------------

  /**
   * 树形按需取子节点（配合 `type: 'tree'` 列）：首次展开某节点时调用，
   * 返回的行会写进该节点的 `children`。展开期间该节点的箭头变为加载中。
   * 返回空数组表示确实没有子节点（不会重复请求，箭头变叶子）。
   */
  loadChildren?: (
    row: T,
    ctx: { level: number; signal: AbortSignal },
  ) => Promise<T[]> | T[];
  /**
   * 判断某行「可能有子节点」——决定未加载时是否显示展开箭头。
   * 默认读 `row.hasChildren`。
   */
  hasChildren?: (row: T) => boolean;
  /** 子节点取回后触发 */
  onChildrenLoaded?: (row: T, children: T[]) => void;
  /** 子节点取数失败触发；节点会回到折叠态，可再次点击重试 */
  onChildrenLoadError?: (row: T, err: unknown) => void;
}

/** 单列的可持久化状态 */
export interface VirtTableColumnState {
  key: string;
  /** 逻辑列宽（不含 `_widthScale` 容器拉伸系数），与 `column.width` 同义 */
  width?: number;
  hidden?: boolean;
}

/**
 * 可持久化的视图状态：列宽 / 列序 / 列显隐 / 排序 / 筛选。
 *
 * 每个字段都是可选的 —— `setState()` 只应用**出现的**字段，所以可以只持久化其中一部分
 * （比如只存列宽与列序，让排序每次回到默认）。
 */
export interface VirtTableState {
  /** 结构版本。当前为 1；`setState()` 遇到不认识的版本会告警并整体忽略 */
  version: number;
  /** 叶子列状态；**数组顺序即列序**（含隐藏列，这样隐藏列的位置也能还原） */
  columns?: VirtTableColumnState[];
  /** 排序状态；多列排序时数组顺序有意义 */
  sort?: SortSpec[];
  /** 列头筛选：列 key → 勾选值 */
  columnFilters?: Record<string, unknown[]>;
  /** 高级筛选条件树（筛选管理器） */
  filterModel?: FilterModel;
  /**
   * 分页。只在配了 `pagination` option 时有意义。
   *
   * `total` 不进状态：客户端分页下它由筛选后的行数派生，服务端分页下由使用方
   * 在取数后 `setTotal()` 给。存下来只会在数据变了之后骗人。
   */
  pagination?: { page?: number; pageSize?: number };
}

export interface VirtTableEvents<T extends Record<string, any>>
  extends VirtListEvents<T> {
  /**
   * 可视区间变化时触发。
   *
   * core 从 0.0.4 起不再提供这个事件（它在那边是 `update` 的冗余信息），但它是
   * virt-table 的公开 API，所以改由表格自己从 `update` 的 `state.inViewBegin/End`
   * 派生 —— 语义与旧版完全一致：**区间真的变了**才派发，不随每次滚动刷。
   */
  rangeUpdate?: (inViewBegin: number, inViewEnd: number) => void;
}

/**
 * DOM structure (with horizontal column virtualization):
 *
 * root (user-provided container)
 * └── div.vt-root (position:relative, overflow:hidden)
 *     ├── div.vt-client (overflow:auto)
 *     │   ├── div.vt-skeleton  (float:left, height = itemsTotalSize)
 *     │   └── table.vt-table   (table-layout:fixed, width = sum(col.width) * _widthScale)
 *     │       ├── colgroup > col * N
 *     │       ├── thead > tr * N > th * columns + [th-height]
 *     │       │     N > 1 when headerMerges (手写多行表头) or 列树带 children (多级分组表头)；
 *     │       │     分组表头的中间段同样横向虚拟化：[th-pad-left] + th * visible + [th-pad-right]
 *     │       ├── tbody
 *     │       │
 *     │           ├── tr.vt-padding (height = leadingSize)
 *     │           └── tr * rendered-rows
 *     │                 └── [td-pad-left] + td * visible + [td-pad-right] + [td-height]
 *     │       └── tfoot > tr * N > td * columns + [td-height]  (if footerData)
 *     ├── div.vt-fixed-shadow (left)
 *     └── div.vt-fixed-shadow (right)
 */
export class VirtTable<T extends Record<string, any>> {
  private _core: VirtListCore<T>;
  /** 可见叶子列（分组表头摊平后的数据列）；由 _applyColumnTree 派生 */
  private _columns: VirtTableColumn<T>[] = [];
  private _options: VirtTableOptions<T>;
  /** 合并后的完整 locale（zhCN 深合并 options.locale）；setLocale 可运行时替换 */
  private _locale: VirtTableLocale;

  // 全量列树（含隐藏、含分组节点）；_columns 为「可见叶子列」，两者在列显隐 / 分组表头时区分
  private _allColumns: VirtTableColumn<T>[] = [];
  /** 全量叶子列（含隐藏），由 _applyColumnTree 派生。数据管线的筛选/排序用它 */
  private _allLeafColumns: VirtTableColumn<T>[] = [];

  // 多级分组表头：列树里出现 children 时启用，表头改走网格渲染并支持横向虚拟化
  private _hasColumnGroups = false;
  /** 表头行数 = 列树深度（扁平列为 1） */
  private _headerDepth = 1;
  private _headerMatrixLeft: HeaderMatrixCell<VirtTableColumn<T>>[][] = [];
  private _headerMatrixCenter: HeaderMatrixCell<VirtTableColumn<T>>[][] = [];
  private _headerMatrixRight: HeaderMatrixCell<VirtTableColumn<T>>[][] = [];
  /** 列树里是否有节点配了 footerValue / renderFooter（决定分组表尾是否有内容可渲染） */
  private _hasFooterNodeContent = false;
  /** 当前视图的叶子数据行，供分组表尾逐格聚合 */
  private _summaryLeaves: T[] = [];

  private _root: HTMLElement;
  private _rootEl!: HTMLElement;
  private _clientEl!: HTMLElement;
  private _tableEl!: HTMLTableElement;
  private _colgroupEl!: HTMLTableColElement;
  /**
   * 表头 / 表尾**各自独立的 table**，与 body table 平级放在滚动容器里。
   *
   * 为什么不留在 body table 里（原来的做法）：`<table>` 是一个整体的布局上下文，行高与
   * 列宽相互依赖。虚拟滚动每帧都在改 tbody（padding 占位行高度、行内容、rowSpan），
   * 于是整个 table 的布局被无效化，`<thead>` 明明内容没变也跟着失效、要重新 paint +
   * 光栅化 —— 主线程忙时来不及提交就是**整条表头闪白**。
   *
   * CDP 实测（人为阻塞主线程 30ms/帧 + 快速滚动）：表头空白帧 **41% → 0%**，
   * 唯一变量就是「表头在不在 body table 里」。详见 AGENTS.md §7.10。
   *
   * 为什么仍放在**滚动容器内**（而不是像 el-table 那样挂到容器外）：留在容器里，横向
   * 滚动时它随内容一起被合成器平移，**零 JS、零滞后**（实测横滚 30 帧最大偏差 0.03px，
   * 纯亚像素舍入）。挂到容器外就得用 `scroll` + `transform` 同步，等于把纵向的锅甩给横向。
   *
   * 仍然是 `<table>`，所以多级分组表头依赖的 `rowSpan` 自动分配高度**完全保留**
   * （实测 rowSpan=3 → 126px = 3×42、rowSpan=2 → 84px）。
   */
  private _headerWrapEl?: HTMLElement;
  private _pendingHeaderWrap?: HTMLElement;
  private _footerWrapEl?: HTMLElement;
  private _headerColgroupEl?: HTMLTableColElement;
  private _footerColgroupEl?: HTMLTableColElement;
  private _headerTableEl?: HTMLTableElement;
  private _footerTableEl?: HTMLTableElement;
  private _theadEl!: HTMLTableSectionElement;
  private _tbodyEl!: HTMLTableSectionElement;
  private _paddingTr!: HTMLTableRowElement;

  // vertical virtualization
  private _itemPool: Map<string, HTMLTableRowElement> = new Map();
  private _renderedKeys: string[] = [];
  private _domReady = false;

  // horizontal column virtualization
  private _colPrefixSums: number[] = [];
  /** 列宽拉伸系数：列宽之和窄于容器时表格会铺满容器，列被等比放大（详见 _syncWidthScale） */
  private _widthScale = 1;
  private _renderColBegin = 0;
  private _renderColEnd = 0;
  private _lastScrollLeft = -1;
  private _lastClientWidth = -1;
  private _widthResizeObserver: ResizeObserver | null = null;
  private _rowDataMap: Map<string, { item: T; rowIndex: number }> = new Map();
  /**
   * 单元格级渲染配置（`setCellRender`）。存在实例里而不是写回行数据 —— 行数据是使用方的，
   * 往里塞函数会污染序列化/深拷贝/diff。键是 `rowKey`，值是 `colKey → 配置`。
   */
  private _cellRenderMap: Map<string, Map<string, CellRenderConfig<T>>> = new Map();
  private _boundOnHScroll: () => void;

  // fixed columns
  private _leftFixedCols: VirtTableColumn<T>[] = [];
  private _centerCols: VirtTableColumn<T>[] = [];
  private _rightFixedCols: VirtTableColumn<T>[] = [];
  private _leftFixedOffsets: number[] = [];
  private _rightFixedOffsets: number[] = [];
  private _leftFixedWidth = 0;
  private _rightFixedWidth = 0;
  private _leftShadowEl!: HTMLElement;
  private _rightShadowEl!: HTMLElement;

  // ---- 自绘滚动条 / 输入接管 ----
  /** 纵向滚动条：按**索引**映射到 core 的偏移量 */
  private _scrollbarY: Scrollbar | null = null;
  /** 横向滚动条：按**像素**映射，直接驱动容器的原生 `scrollLeft` */
  private _scrollbarX: Scrollbar | null = null;
  /** 滚轮 / 键盘 / 触摸的接管者（仅纵向；横向仍由浏览器处理） */
  private _input: InputController | null = null;

  // empty state
  private _emptyEl!: HTMLElement;

  // loading state
  private _loadingEl!: HTMLElement;

  // checkbox
  private _checkedRows: Set<string> = new Set();
  private _headerCheckbox: HTMLInputElement | null = null;

  // radio (single row selection)
  private _selectedRadioKey: string | null = null;

  // drag reorder

  // highlight selection
  private _selectRowKey: string | null = null;
  private _selectColKey: string | null = null;
  private _activeCellOverlayEl: HTMLDivElement | null = null;
  private _boundOnBodyClick: ((e: MouseEvent) => void) | null = null;

  /** `textOverflow: 'tooltip'` 的浮层，首个这样的单元格渲染时才创建 */
  private _tooltip: TooltipController | null = null;

  // column resize
  private _resizeLine: HTMLElement | null = null;

  // expand / tree / group
  private _originList: T[] = [];
  private _foldMap: Record<string, boolean> = {};
  private _expandMap: Record<string, boolean> = {};
  private _expandRowCache: Record<string, T> = {};
  private _hasExpandCol = false;
  private _hasTreeCol = false;

  // merge cell support
  private _merges: MergeCell[] = [];
  private _placeholderMerges: MergeCell[] = [];
  private _renderMerges: MergeCell[] = [];
  /** 自动合并（列 `mergeKey`）的分段索引，数据管线末端重算 */
  private _mergeRuns: MergeRuns[] = [];
  /** 最近一次渲染的行区间，自动合并按它裁剪 */
  private _renderRowBegin = 0;
  private _renderRowEnd = 0;
  private _baseColBegin = 0;
  private _baseColEnd = 0;
  private _inViewRowBegin = 0;
  private _inViewRowEnd = 0;
  private _userRenderControl?: (
    begin: number,
    end: number,
  ) => { begin: number; end: number };
  private _needsTheadRebuild = false;
  private _needsRowCellsRebuild = false;

  // column filters
  private _activeFilters: Map<string, any[]> = new Map();

  // advanced filter (AND/OR 条件树；与列头筛选独立，管线里 AND 组合)
  private _filterModel: FilterModel = null;

  // sort (multi-column)
  private _sortState: SortSpec[] = [];

  // cell cover overlay

  // clipboard
  /** 搜索词：查询状态（进 RemoteQuery.search），由 vtSearch 插件写入 */
  private _searchTerm = '';

  // 插件运行时（右键菜单等可选能力已迁出主类，见 plugin.ts / plugins/*）
  private _pluginRuntime: PluginRuntime<T> | null = null;
  /** 插件通过 PluginHandle.api 提供的命令式方法，已合并到实例上 */
  private _pluginApi: Record<string, (...args: any[]) => any> = {};

  // tfoot
  private _tfootEl!: HTMLTableSectionElement;

  // pagination（仅服务端 UI 模式：只渲染分页条 + 派发 onPageChange，不做数据切片）
  private _paginationEl: HTMLDivElement | null = null;
  private _page = 1;
  private _pageSize = 10;
  private _total = 0;
  private _pageSizes: number[] = [10, 20, 50, 100];

  // 服务端数据 / 无限滚动
  private _remote: RemoteController<T> | null = null;
  /** 无限滚动状态条（底部）与向上加载状态条（顶部） */
  private _infiniteFooterEl: HTMLDivElement | null = null;
  private _infiniteHeaderEl: HTMLDivElement | null = null;
  /** 最近一次请求参数，供 onLoad/onLoadError 回调透出 */
  private _lastRequest: DataRequest | null = null;
  /** 无限滚动是否启用（含方向） */
  private _infiniteDown = false;
  private _infiniteUp = false;

  // 树形子节点懒加载：按行 key 记「在途 / 已加载」，不写进用户数据对象
  private _lazyLoading: Set<string> = new Set();
  private _lazyLoaded: Set<string> = new Set();
  private _lazyAborts: Map<string, AbortController> = new Map();

  /**
   * 使用方传入的事件回调。
   *
   * 存成字段而不是只留在构造函数的闭包里：`offsetChange` / `rangeUpdate` 的派发点
   * 分散在多个方法里（滚动、patch），闭包捕获会让那些方法只能写在构造函数内部。
   */
  private _userEvents?: VirtTableEvents<T>;

  /** 上一次派发过的可视区间，用于 rangeUpdate 去重（core 已不再提供该事件） */
  private _lastInViewBegin = -1;
  private _lastInViewEnd = -1;

  get core(): VirtListCore<T> {
    return this._core;
  }

  get state(): ListState {
    return this._core.state;
  }

  get leftFixedCount(): number {
    return this._leftFixedCols.length;
  }

  constructor(
    root: HTMLElement,
    options: VirtTableOptions<T>,
    externalEvents?: VirtTableEvents<T>,
  ) {
    this._root = root;
    this._options = options;
    this._userEvents = externalEvents;
    this._locale = mergeLocale(zhCN, options.locale);
    this._applyColumnTree(options.columns);
    this._merges = options.merges ?? [];
    this._boundOnHScroll = this._onHScroll.bind(this);

    this._hasExpandCol = this._columns.some((c) => c.type === 'expand');
    this._hasTreeCol = this._columns.some((c) => c.type === 'tree');

    // 初始排序：从列的 defaultSort 收集
    for (const col of this._columns) {
      if (col.defaultSort) this._sortState.push({ colKey: col.key, order: col.defaultSort });
    }

    // 初始高级筛选模型（在首次 _computeDisplayList 之前就位）
    this._filterModel = options.filterModel ? cloneFilterModel(options.filterModel) : null;

    // 分页状态初始化（仅当传入 pagination option 时才渲染分页条）
    if (options.pagination) {
      const p = options.pagination;
      if (p.pageSizes && p.pageSizes.length > 0) this._pageSizes = p.pageSizes.slice();
      this._pageSize = p.pageSize ?? this._pageSizes[0] ?? 10;
      this._total = p.total ?? 0;
      this._page = clampPage(p.page ?? 1, this._total, this._pageSize);
    }

    // 无限滚动：距底触发阈值要写进内核（默认 0 会导致必须滚到像素级底部才触发）
    const inf = options.infinite;
    let infEnabled = !!inf && inf.enabled !== false;
    if (infEnabled && options.pagination) {
      // 两者语义互斥：分页是「页视图」（每次 replace，当前页 = 唯一状态），
      // 无限滚动是「累积流」（append，页码只表示取到第几批）。同时启用会让
      // 「当前第几页」有两个互相打架的含义，因此以 pagination 为准并关掉 infinite。
      console.warn(
        '[VirtTable] pagination 与 infinite 互斥（分页是页视图、无限滚动是累积流），' +
          'infinite 将被忽略。请二选一。',
      );
      infEnabled = false;
    }
    this._infiniteDown = infEnabled && (inf!.direction ?? 'down') !== 'up';
    this._infiniteUp =
      infEnabled && (inf!.direction === 'up' || inf!.direction === 'both');
    if (this._infiniteDown || this._infiniteUp) {
      // core 从 0.0.4 起把 `scrollDistance` 更名为 `edgeThreshold`（语义不变：
      // 触发 toTop / toBottom 的容差距离）
      options.edgeThreshold = options.edgeThreshold ?? inf?.distance ?? 200;
    }

    // 列拆分需先于数据计算（聚合合计行按渲染列序生成）
    this._splitColumns();
    this._buildColPrefixSums();
    this._baseColEnd = Math.max(0, this._centerCols.length - 1);

    // 统一数据管线：_originList 始终为唯一数据源
    this._originList = options.list ?? [];
    options.list = this._computeDisplayList();

    this._renderColEnd = this._baseColEnd;

    this._warnFixedMergeKey();
    this._warnTypeWithRender();
    this._rebuildMergeRuns();

    // 自动合并同样需要这个钩子：它是拿到「最终渲染行区间」的唯一时机
    if (this._merges.length > 0 || this._hasAutoMerge()) {
      this._userRenderControl = options.renderControl;
      options.renderControl = (begin: number, end: number) =>
        this._mergeRenderControl(begin, end);
    }

    const events: VirtListEvents<T> = {
      scroll: (e) => externalEvents?.scroll?.(e),
      toTop: (item) => {
        // 先给远程控制器消费（内部去重：toTop 每次向上滚动都会 emit）
        if (this._infiniteUp && !this._options.infinite?.manual) this._remote?.loadPrev();
        externalEvents?.toTop?.(item);
      },
      toBottom: (item) => {
        if (this._infiniteDown && !this._options.infinite?.manual) this._remote?.loadMore();
        externalEvents?.toBottom?.(item);
      },
      itemResize: (id, size) => externalEvents?.itemResize?.(id, size),
      /**
       * 纵向偏移量生效时**同步**触发 —— 新模型下「表格滚动了」的唯一通知渠道。
       *
       * `.vt-client` 的 overflow-y 是 hidden，浏览器不会派发原生纵向 `scroll` 事件，
       * 所以过去挂在那上面顺带完成的几件事都得在这里显式做一遍。
       * 内容的移动也在这里，与随后的 DOM patch 落在同一个同步任务里 ——
       * 这正是「位置与 DOM 同帧提交」。
       */
      offsetChange: (offset) => {
        this._onVScroll(offset);
      },
      // `reason` 是 core 0.0.7 加的第三个参数（它把一次外部事件引发的多条通知合并成
       // 一条，reason 取这一趟里最强的那个）。表格自己不消费它，但必须原样透传 ——
       // `VirtTableEvents extends VirtListEvents`，使用方的 update 签名里有它。
      update: (renderList, state, reason) => {
        if (this._domReady) {
          this._patch(renderList, state);
        }
        externalEvents?.update?.(renderList, state, reason);
        // core 不再提供 rangeUpdate，由这里从 state 派生（见 VirtTableEvents.rangeUpdate）。
        // 放在 _patch 之后：使用方在回调里查询 DOM 时，新区间的行已经在页面上了
        this._emitRangeUpdate(state);
      },
    };

    this._core = new VirtListCore<T>(options, events);
    this._buildDOM();
    // DOM 就绪后才能拿到容器宽度：列宽窄于容器时按实际拉伸系数重算列几何
    this._applyWidthScale();
    this._syncGeometryVars();
    this._calcColRange();
    if (this._merges.length > 0) this._expandColRangeForMerges();
    if (this._options.showHeader !== false) this._rebuildThead();
    if (this._getFooterRowCount() > 0) this._rebuildTfoot();
    // 表头/表尾建好才有高度，纵向 sticky 变量要在这之后再同步一次
    this._syncGeometryVars();
    this._rebuildPinnedRows();
    this._initFiltersFromChecked();
    this._domReady = true;
    this._patch(this._core.renderList, this._core.state);
    /**
     * 滚动条与输入接管要在 `bindDOM` **之前**装好。
     *
     * `bindDOM` 会按 `start` / `offset` / `initialPosition` 做首屏定位，那一步就会
     * 同步回调 `offsetChange` → `_onVScroll` → 摸到 `_scrollbarY`。装晚了首屏那次
     * 定位的滑块位置就丢了（要等下一次滚动才对）。
     */
    this._initScrollbars();
    this._core.bindDOM(this._clientEl);

    /**
     * 表头 / 表尾登记为账本里的 `stickyHeader` / `stickyFooter` 槽。
     *
     * 两者都必须 observe：`getMaxOffset()` = `getTotalSize() - clientSize`，而
     * `getTotalSize()` 把这两个槽都计入。少 observe 表尾的话账本比实际矮一截，
     * 滚到底时末行会被表尾盖住（原来这段空间由 `.vt-footer-spacer` 在文档流里占）。
     *
     * 被 observe 的元素必须自带 `dataset.id`，否则 core 的 ResizeObserver 回调
     * 直接跳过它 —— id 写在 `_buildDOM` 里的 wrap 上。
     */
    if (this._options.showHeader !== false && this._headerWrapEl) {
      this._core.observeSlotEl(this._headerWrapEl);
    }
    if (this._footerWrapEl) this._core.observeSlotEl(this._footerWrapEl);
    this._clientEl.addEventListener('scroll', this._boundOnHScroll, { passive: true });
    this._initWidthResizeObserver();
    this._updateFixedShadow();
    this._initRemote();
    // 一切就绪后再通知插件（此时行 DOM 已首帧渲染，可安全查询）
    this._pluginRuntime?.emitMounted();
  }

  // --------------- 服务端数据 / 无限滚动 ---------------

  /** 是否由服务端负责排序 */
  private get _serverSort(): boolean {
    return this._options.manualSorting ?? this._options.dataMode === 'server';
  }

  /** 是否由服务端负责筛选 */
  private get _serverFilter(): boolean {
    return this._options.manualFiltering ?? this._options.dataMode === 'server';
  }

  /** 是否由服务端负责分页/加载 */
  private get _serverPage(): boolean {
    return this._options.manualPagination ?? this._options.dataMode === 'server';
  }

  /**
   * 是否由表格自己做分页切片（客户端分页）。
   *
   * `manualPagination`（或 `dataMode: 'server'`）关掉它 —— 那时表格只渲染分页器、
   * 派发 `onPageChange`，数据由使用方自己换。这让三个 manual 开关终于对称：
   * manualSorting / manualFiltering / manualPagination 各自跳过管线里对应的一段。
   *
   * 与无限滚动互斥：两者都在管当前该显示哪些行，同时开没有意义。
   */
  private get _clientPage(): boolean {
    return (
      !!this._options.pagination &&
      !this._serverPage &&
      !this._infiniteDown &&
      !this._infiniteUp
    );
  }

  /** 是否有取数实现（受控层或糖层） */
  private get _hasFetcher(): boolean {
    return !!(this._options.onLoadMore || this._options.loadData);
  }

  /**
   * 构造末尾初始化远程控制器：只要给了取数实现或开了无限滚动就建。
   * 首屏是否自动取数：显式 autoLoadFirst 优先，否则「没有初始 list」时自动取。
   */
  private _initRemote(): void {
    const inf = this._options.infinite;
    const enabled = this._hasFetcher || this._infiniteDown || this._infiniteUp;
    if (!enabled) return;

    // 分页模式（与 infinite 互斥）下每页条数由分页条掌管
    const pageSize = this._options.pagination ? this._pageSize : (inf?.pageSize ?? 50);

    this._remote = new RemoteController<T>(
      {
        request: (ctx) => this._runFetcher(ctx),
        commit: (rows, mode, res, reason) => this._commitRemoteRows(rows, mode, res, reason),
        onStateChange: (state) => this._onRemoteState(state),
        getQuery: () => ({
          sort: this.getSortState(),
          filters: this.getActiveFilters(),
          filterModel: this.getFilterModel(),
          search: this._searchTerm,
        }),
      },
      {
        pageSize,
        enablePrev: this._infiniteUp,
        total: this._options.pagination ? this._total : undefined,
      },
    );
    this._remote.syncLoadedCount(this._originList.length);

    if (this._infiniteDown || this._infiniteUp) this._buildInfiniteBars();
    this._renderInfiniteBars();

    const autoFirst = inf?.autoLoadFirst ?? this._originList.length === 0;
    if (this._hasFetcher && autoFirst) this._remote.load('init');
  }

  /** 执行取数：受控层优先，其次糖层 */
  private _runFetcher(ctx: LoadMoreContext<T>): void {
    const { onLoadMore, onLoadPrev, loadData } = this._options;
    this._lastRequest = toRequest(ctx);

    if (ctx.channel === 'prev' && onLoadPrev) {
      settleControlled(onLoadPrev(ctx), ctx);
      return;
    }
    if (onLoadMore) {
      settleControlled(onLoadMore(ctx), ctx);
      return;
    }
    if (loadData) {
      runLoadData(loadData, ctx);
      return;
    }
    // 开了无限滚动但没给取数实现：解锁并交由外部事件（toBottom）自行处理
    ctx.done();
  }

  /** 数据落地：replace 换整批、append 追加、prepend 前插（含滚动补偿） */
  private _commitRemoteRows(
    rows: T[],
    mode: CommitMode,
    res: Omit<DataResponse<T>, 'rows'>,
    reason: RemoteReason,
  ): void {
    if (res.total !== undefined) {
      this._total = Math.max(0, res.total);
      if (this._paginationEl) this._renderPagination();
    }
    // 服务端聚合行：直接接管表尾（本地聚合在 server 模式只能算已加载数据）
    if (res.footerData !== undefined) {
      this._options.footerData = res.footerData;
      const count = this._getFooterRowCount();
      if (count > 0 && !this._tfootEl.parentElement) this._tableEl.appendChild(this._tfootEl);
      if (count > 0) this._rebuildTfoot();
    }

    if (mode === 'append') {
      this._appendRows(rows);
    } else if (mode === 'prepend') {
      this._prependRows(rows);
    } else {
      const keepScroll = reason === 'refresh';
      const offset = keepScroll ? this._core.getOffset() : 0;
      this.setList(rows);
      if (keepScroll) this._core.scrollToOffset(offset);
      else if (this._originList.length > 0) this._core.scrollToTop();
    }

    if (this._lastRequest) {
      this._options.onLoad?.({ rows, ...res }, this._lastRequest);
    }
  }

  /** 追加行：不清空行 DOM 池，已渲染的行保持原样，滚动位置天然不变 */
  private _appendRows(rows: T[]): void {
    if (rows.length === 0) {
      this._renderInfiniteBars();
      return;
    }
    this._originList = this._originList.concat(rows);
    this._rebuildData({ keepPool: true });
    this._remote?.syncLoadedCount(this._originList.length);
    this._renderInfiniteBars();
  }

  /**
   * 前插行：先记录总高与偏移，写数据后把滚动位置往下推回等量距离，
   * 避免「加载历史数据后视口跳到新内容顶部」。
   *
   * 新插入的行首帧按 `estimatedSize` 占位，之后 ResizeObserver 会用实测高度修正
   * `itemsTotalSize`（即使开了 `fixedSize` 也可能有零点几 px 的行高差累积），因此补偿
   * 要跟着总高变化多校正几帧，直到 delta 稳定为止。
   */
  private _prependRows(rows: T[]): void {
    if (rows.length === 0) {
      this._renderInfiniteBars();
      return;
    }
    const beforeTotal = this._core.getTotalSize();
    const beforeOffset = this._core.getOffset();
    this._originList = rows.concat(this._originList);
    this._rebuildData({ keepPool: true });
    this._remote?.syncLoadedCount(this._originList.length);

    let lastDelta = -1;
    /** 期望停留的偏移；用于分辨「总高又被修正」与「用户自己滚了」 */
    let expected = -1;
    const applyCompensation = (): void => {
      const delta = this._core.getTotalSize() - beforeTotal;
      if (delta <= 0) return;
      lastDelta = delta;
      expected = beforeOffset + delta;
      this._core.scrollToOffset(expected);
    };
    applyCompensation();

    if (typeof requestAnimationFrame !== 'undefined') {
      // ResizeObserver 写完新行实测高度可能晚于首帧（每行零点几 px 的差会累积成
      // 十几 px），所以持续校正到 delta 连续若干帧不变；期间用户一滚动就让位。
      let stable = 0;
      let frames = 0;
      const tick = (): void => {
        if (!this._remote || frames >= 40) return; // 硬上限 ≈ 650ms
        frames += 1;
        // 偏移被用户改动（不是我们设的值）→ 放弃校正，别把人拽回去
        if (expected >= 0 && Math.abs(this._core.getOffset() - expected) > 2) return;
        const delta = this._core.getTotalSize() - beforeTotal;
        if (delta === lastDelta) {
          stable += 1;
          if (stable >= 3) return;
        } else {
          stable = 0;
          applyCompensation();
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    this._renderInfiniteBars();
  }

  /** 远程状态变化 → 驱动遮罩/状态条/分页条/外部回调 */
  private _onRemoteState(state: RemoteState): void {
    // 首屏与换参用全屏遮罩；追加只亮状态条，不遮已有数据
    this.setLoading(state.loading);
    if (state.total !== TOTAL_UNKNOWN && state.total !== this._total) {
      this._total = state.total;
      this._page = clampPage(state.page, this._total, this._pageSize);
      if (this._paginationEl) this._renderPagination();
    }
    this._renderInfiniteBars();
    if (state.error && this._lastRequest) {
      this._options.onLoadError?.(state.error, this._lastRequest);
    }
    this._options.onRemoteStateChange?.(state);
  }

  /** 重新取第一批并清空已加载数据（换排序/筛选后由内部调用，外部也可主动调） */
  reload(): void {
    this._remote?.reload();
  }

  /** 重拉当前已加载区间，保留滚动位置 */
  refresh(): void {
    this._remote?.refresh();
  }

  /** 手动加载下一批（infinite.manual 模式下由「加载更多」按钮驱动） */
  loadMore(): void {
    this._remote?.loadMore();
  }

  /** 手动加载更早的一批（向上加载） */
  loadPrev(): void {
    this._remote?.loadPrev();
  }

  /** 重试上次失败的请求 */
  retryLoad(): void {
    this._remote?.retry();
  }

  /** 当前远程状态快照；未启用服务端能力时返回 null */
  getRemoteState(): RemoteState | null {
    return this._remote?.getState() ?? null;
  }

  /** 运行时替换取数实现（不会自动重取，需要的话再调 reload()） */
  setLoadData(loadData: VirtTableOptions<T>['loadData']): void {
    this._options.loadData = loadData;
  }

  /** 手动追加数据（不经过 dataSource；用于自行管理请求的场景） */
  appendRows(rows: T[]): void {
    this._appendRows(rows);
  }

  /** 手动前插数据（含滚动补偿） */
  prependRows(rows: T[]): void {
    this._prependRows(rows);
  }

  /**
   * 标记「还有更多 / 到底了」。手动管理数据（appendRows）时用它控制状态条与触发闸门；
   * 由 loadData/onLoadMore 交付的数据会自动推导，无需调用。
   */
  setHasMore(hasMore: boolean, direction: 'down' | 'up' = 'down'): void {
    this._remote?.setHasMore(hasMore, direction);
  }

  /** 手动设置游标（配合 appendRows 自行分页时使用） */
  setCursor(cursor: string | null, direction: 'down' | 'up' = 'down'): void {
    this._remote?.setCursor(cursor, direction);
  }

  // --------------- public proxy API ---------------

  scrollToIndex(index: number): void {
    this._core.scrollToIndex(index);
  }

  scrollIntoView(index: number): void {
    this._core.scrollIntoView(index);
  }

  scrollToTop(): void {
    this._core.scrollToTop();
  }

  scrollToBottom(): void {
    this._core.scrollToBottom();
  }

  scrollToOffset(offset: number): void {
    this._core.scrollToOffset(offset);
  }

  /**
   * 当前纵向偏移量。
   *
   * 新模型下这是「滚到哪了」的唯一真相 —— `.vt-client` 的 overflow-y 是 hidden，
   * 它的 `scrollTop` 恒为 0。
   */
  getOffset(): number {
    return this._core.getOffset();
  }

  /**
   * 纵向相对滚动，按「用户发起」记账（触发 toTop / toBottom 与自动续拉）。
   *
   * 拖拽到边缘的自动滚动（框选 / 行拖拽）走这条：那确实是用户意图，
   * 且拖到底部时应当把下一页拉进来。纯程序化定位仍用 `scrollToOffset`。
   */
  scrollByY(dy: number): void {
    this._core.scrollFromUser(this._core.getOffset() + dy);
  }

  scrollToCell(rowIndex: number, colIndex: number): void {
    this._core.scrollIntoView(rowIndex);

    const centerIdx = this._centerCols.findIndex((c) => c === this._columns[colIndex]);
    if (centerIdx >= 0 && this._clientEl) {
      const colLeft = this._colPrefixSums[centerIdx] ?? 0;
      const colRight = this._colPrefixSums[centerIdx + 1] ?? colLeft;
      const viewWidth = this._clientEl.clientWidth - this._leftFixedWidth - this._rightFixedWidth;
      const target = colLeft - Math.max(0, (viewWidth - (colRight - colLeft)) / 2);
      this._clientEl.scrollLeft = Math.max(0, target);
    }
  }

  reset(): void {
    this._core.reset();
  }

  setList(list: T[]): void {
    this._originList = list ?? [];
    this._rebuildData();
    this._remote?.syncLoadedCount(this._originList.length);
    this._renderInfiniteBars();
  }

  setColumns(columns: VirtTableColumn<T>[]): void {
    // 入参视为全量列树（含隐藏、含分组节点），_columns 派生为可见叶子列
    this._applyColumnTree(columns);
    this._hasExpandCol = this._columns.some((c) => c.type === 'expand');
    this._hasTreeCol = this._columns.some((c) => c.type === 'tree');
    this._syncWidthScale();
    this._splitColumns();
    this._buildColPrefixSums();
    this._baseColEnd = Math.max(0, this._centerCols.length - 1);
    this._warnFixedMergeKey();
    this._warnTypeWithRender();
    this._rebuildMergeRuns();
    this._rebuildColgroup();
    this._syncGeometryVars();
    this._calcColRange();
    if (this._merges.length > 0) this._expandColRangeForMerges();
    this._rebuildThead();
    if (this._getFooterRowCount() > 0) this._rebuildTfoot();
    this._syncGeometryVars();
    this._rebuildPinnedRows();
    this._leftShadowEl.style.left = `${this._leftFixedWidth - 1}px`;
    this._updateShadowPosition();
    this._updateFixedShadow();
    this._clearItemPool();
    this._core.forceUpdate();
    this._pluginRuntime?.emitColumnsChanged();
  }

  /** 设置某列显隐；传分组节点的 key 即整组显隐 */
  setColumnVisible(colKey: string, visible: boolean): void {
    const col = this._findColumnByKey(colKey);
    if (!col) return;
    col.hidden = !visible;
    // 面板勾选态的同步由 vtColumnPanel 插件通过 onColumnsChanged 钩子接管
    this.setColumns([...this._allColumns]);
  }

  /** 当前可见的叶子列（数据列，不含分组节点） */
  getVisibleColumns(): VirtTableColumn<T>[] {
    return [...this._columns];
  }

  /** 全量列树（含隐藏列与分组节点） */
  getAllColumns(): VirtTableColumn<T>[] {
    return [...this._allColumns];
  }

  /** 全量叶子列（含隐藏，摊平分组表头后的数据列） */
  getLeafColumns(): VirtTableColumn<T>[] {
    return flattenLeafColumns(this._allColumns, true);
  }

  /** 表头行数（多级分组表头 = 列树深度） */
  getHeaderDepth(): number {
    return this._getHeaderRowCount();
  }

  // --------------- column tree (grouped header) ---------------

  /**
   * 应用列树：归一化分组的 fixed → 摊平出可见叶子列 → 计算表头深度。
   *
   * `_allColumns` 保存用户传入的原始列树（含隐藏列与分组节点）；
   * `_columns` / `_options.columns` 始终是**可见叶子列**，表体渲染、前缀和、
   * 合并单元格、排序筛选、导出、框选等一律基于它——分组表头只影响 thead。
   */
  private _applyColumnTree(columns: VirtTableColumn<T>[]): void {
    this._allColumns = columns;
    this._hasColumnGroups = hasColumnGroup(columns);
    this._hasFooterNodeContent = false;
    if (this._hasColumnGroups) {
      propagateFixed(columns);
      if (this._options.headerData || this._options.headerMerges) {
        console.warn(
          '[VirtTable] 列配置了 children（多级分组表头），headerData / headerMerges 将被忽略。',
        );
      }
      const scanFooter = (cols: VirtTableColumn<T>[]) => {
        for (const col of cols) {
          if (col.footerValue != null || col.renderFooter) this._hasFooterNodeContent = true;
          if (isColumnGroup(col)) scanFooter(col.children!);
        }
      };
      scanFooter(columns);
      if (this._hasGroupedFooter() && (this._options.footerData || this._options.footerMerges)) {
        console.warn(
          '[VirtTable] 已启用多级分组表尾（列 children + showSummary/footerValue/renderFooter），' +
            'footerData / footerMerges 将被忽略。',
        );
      }
    }
    this._columns = flattenLeafColumns(columns);
    // 全量叶子列（含隐藏）。数据管线用它而不是 `_columns`：筛选/排序是**数据层**的，
    // 隐藏一列不该让它上面的条件失效（AG Grid / Excel 同此语义）。在这里派生是
    // 顺带的——`_columns` 本来就要走一趟同样的遍历。
    this._allLeafColumns = flattenLeafColumns(columns, true);
    this._options.columns = this._columns;
    this._headerDepth = this._hasColumnGroups ? columnTreeDepth(columns) : 1;
  }

  /**
   * 是否走多级分组表尾：列树有分组，且表尾确实有内容来源
   * （开了 showSummary，或有节点配了 footerValue / renderFooter）。
   * 否则退回 footerData / footerMerges 的扁平表尾路径。
   */
  private _hasGroupedFooter(): boolean {
    return (
      this._hasColumnGroups &&
      (this._options.showSummary === true || this._hasFooterNodeContent)
    );
  }

  /** 按 key 在列树里查找（含分组节点与隐藏列） */
  private _findColumnByKey(colKey: string): VirtTableColumn<T> | null {
    const walk = (cols: VirtTableColumn<T>[]): VirtTableColumn<T> | null => {
      for (const col of cols) {
        if (col.key === colKey) return col;
        if (isColumnGroup(col)) {
          const hit = walk(col.children!);
          if (hit) return hit;
        }
      }
      return null;
    };
    return walk(this._allColumns);
  }

  /** 返回列树中直接持有该列的数组（顶层列返回 _allColumns），用于同级重排 */
  private _findColumnSiblings(target: VirtTableColumn<T>): VirtTableColumn<T>[] | null {
    const walk = (cols: VirtTableColumn<T>[]): VirtTableColumn<T>[] | null => {
      if (cols.includes(target)) return cols;
      for (const col of cols) {
        if (isColumnGroup(col)) {
          const hit = walk(col.children!);
          if (hit) return hit;
        }
      }
      return null;
    };
    return walk(this._allColumns);
  }

  /**
   * 重建表头网格。按顶层节点的 `fixed` 拆成左固定 / 中间 / 右固定三段，
   * 各段独立建网格（`start` 为段内叶子下标），只有中间段参与横向虚拟化。
   */
  private _rebuildHeaderMatrix(): void {
    if (!this._hasColumnGroups) {
      this._headerMatrixLeft = [];
      this._headerMatrixCenter = [];
      this._headerMatrixRight = [];
      return;
    }
    const left: VirtTableColumn<T>[] = [];
    const center: VirtTableColumn<T>[] = [];
    const right: VirtTableColumn<T>[] = [];
    for (const col of this._allColumns) {
      if (col.hidden) continue;
      if (col.fixed === 'left') left.push(col);
      else if (col.fixed === 'right') right.push(col);
      else center.push(col);
    }
    const depth = this._headerDepth;
    this._headerMatrixLeft = buildHeaderMatrix(left, depth);
    this._headerMatrixCenter = buildHeaderMatrix(center, depth);
    this._headerMatrixRight = buildHeaderMatrix(right, depth);
  }

  setMerges(merges: MergeCell[]): void {
    const hadMerges = this._merges.length > 0;
    this._merges = merges;
    this._updateRenderMerges([]);

    if (merges.length > 0 && !hadMerges) {
      this._userRenderControl = this._options.renderControl;
      (this._options as unknown as Record<string, unknown>).renderControl = (
        begin: number,
        end: number,
      ) => this._mergeRenderControl(begin, end);
    } else if (merges.length === 0 && hadMerges && !this._hasAutoMerge()) {
      // 自动合并还在用这个钩子拿渲染区间，不能因为静态 merges 清空就摘掉
      (this._options as unknown as Record<string, unknown>).renderControl =
        this._userRenderControl;
    }

    this._calcColRange();
    if (merges.length > 0) this._expandColRangeForMerges();
    this._rebuildThead();
    this._clearItemPool();
    this._core.forceUpdate();
  }

  setHeaderMerges(merges: MergeCell[], headerData?: string[][]): void {
    this._options.headerMerges = merges;
    if (headerData !== undefined) this._options.headerData = headerData;
    this._rebuildThead();
  }

  setFooterData(data: string[][], merges?: MergeCell[]): void {
    this._options.footerData = data;
    if (merges !== undefined) this._options.footerMerges = merges;
    const count = this._getFooterRowCount();
    if (count > 0) {
      if (!this._tfootEl.parentElement) {
        this._tableEl.appendChild(this._tfootEl);
      }
      this._rebuildTfoot();
    } else {
      this._clearFooterRows();
      this._tfootEl.remove();
    }
    this._rebuildPinnedRows();
  }

  forceUpdate(): void {
    this._clearItemPool();
    this._core.forceUpdate();
  }

  // --------------- 单元格级渲染 ---------------

  /**
   * 给**单个格子**指定内容（`render` / `cellType`）与编辑器（`renderEditor`），覆盖列上的同名配置。
   *
   * 三件与列级不同的事：
   * - 单元格级 `cellType` 赢过列级 `render`（粒度优先，见 `_resolveCellContent`）
   * - 它能**穿透功能列**（`type` 为 index/checkbox/radio/expand/drag 的列），是「就这一行
   *   不给勾选框 / 序号换成图标」唯一的官方出口；列级撞功能列仍旧告警忽略
   * - 装内置单元格组件请用 `asCell()`（`@virt-table/vanilla/components`），它整对写入
   *   `render` + `renderEditor`，不会配出「常态与编辑态不是同一个控件」
   *
   * 与写行数据 `_cellRenders` 的区别：配置存在表格实例里，不碰你的数据对象
   * （不污染 `JSON.stringify` / 深拷贝 / diff），且 React / Vue 端会自动套上
   * VNode → DOM 的挂载与回收（直接写 `_cellRenders` 拿不到这层，返回 JSX 会失败）。
   *
   * 传 `null` 清除该格配置。会同步重绘（低频操作）；要批量设置请用 `setCellRenders()`，
   * 它只在末尾刷新一次。
   */
  setCellRender(
    rowKey: string,
    colKey: string,
    config: CellRenderConfig<T> | null,
  ): void {
    this._writeCellRender(rowKey, colKey, config);
    if (this._domReady) this.forceUpdate();
  }

  /** 批量版 `setCellRender`：整批写完只刷新一次 */
  setCellRenders(
    entries: Array<{ rowKey: string; colKey: string; config: CellRenderConfig<T> | null }>,
  ): void {
    for (const e of entries) this._writeCellRender(e.rowKey, e.colKey, e.config);
    if (this._domReady) this.forceUpdate();
  }

  /** 该格的单元格级配置（**不含**列级 fallback）；没配过返回 undefined */
  getCellRender(rowKey: string, colKey: string): CellRenderConfig<T> | undefined {
    return this._cellRenderMap.get(rowKey)?.get(colKey);
  }

  /**
   * 该格**最终生效**的渲染配置。插件与三端适配层用它，避免各自再实现一遍优先级
   * （cell-editor 就曾自己读 `_cellRenders`）。
   *
   * `render` / `cellType` 走同一条内容链（`_resolveCellContent`），所以**两者最多只有
   * 一个有值** —— 必须和 DOM 里实际画出来的一致，否则插件会按一份「理论上生效」的
   * 配置去判断，而屏幕上是另一回事。
   *
   * `renderEditor` **独立回落**（单元格级 > 列级）。它不是内容链的例外，而是属于另一层
   * （**会话层**）：编辑内容压根不在这一格的 DOM 里 —— `vtCellEditor` 把 `.vt-cell-cover`
   * 挂在滚动容器上盖住单元格（`plugins/cell-editor.ts`）。好处是能「只改这一格的常态、
   * 编辑照旧」；代价是能配出「常态是进度条、点开是列上的下拉」这种错配，所以装单元格
   * 组件请用 `asCell()` 整对写入。
   */
  resolveCellRender(rowKey: string, colKey: string): CellRenderConfig<T> {
    const col = this.getLeafColumns().find((c) => c.key === colKey);
    const item = this._rowDataMap.get(rowKey)?.item;
    const perCell = item
      ? this._cellRenderConfigOf(colKey, item)
      : this._cellRenderMap.get(rowKey)?.get(colKey);
    const content = this._resolveCellContent(col, perCell);
    return {
      render: content.source === 'render' ? content.render : undefined,
      cellType: content.source === 'cellType' ? content.cellType : undefined,
      renderEditor: perCell?.renderEditor ?? col?.renderEditor,
    };
  }

  /** 清除单元格级配置：给 `rowKey` 只清那一行，不给则全清 */
  clearCellRenders(rowKey?: string): void {
    if (rowKey === undefined) this._cellRenderMap.clear();
    else this._cellRenderMap.delete(rowKey);
    if (this._domReady) this.forceUpdate();
  }

  private _writeCellRender(
    rowKey: string,
    colKey: string,
    config: CellRenderConfig<T> | null,
  ): void {
    if (!config) {
      const m = this._cellRenderMap.get(rowKey);
      m?.delete(colKey);
      if (m && m.size === 0) this._cellRenderMap.delete(rowKey);
      return;
    }
    let m = this._cellRenderMap.get(rowKey);
    if (!m) {
      m = new Map();
      this._cellRenderMap.set(rowKey, m);
    }
    m.set(colKey, config);
  }

  /** 切换主题 */
  setTheme(theme: 'light' | 'dark'): void {
    this._options.theme = theme;
    this._rootEl.classList.toggle('vt-root--dark', theme === 'dark');
  }

  /** 当前生效的完整 locale（供 VtFilterBuilder 等取默认文案） */
  getLocale(): VirtTableLocale {
    return this._locale;
  }

  /**
   * 运行时切换/覆盖国际化文案。入参与 zhCN 深合并（传入完整的 enUS 即整体切英文；
   * 传入 DeepPartial 则在中文基础上局部覆盖）。会即时刷新已渲染的相关 DOM。
   */
  setLocale(locale: DeepPartial<VirtTableLocale>): void {
    this._locale = mergeLocale(zhCN, locale);
    this._options.locale = locale;
    // 空数据 / 加载态文案（单项 option 优先，保持与构造期一致）
    if (this._emptyEl) this._emptyEl.textContent = this._options.emptyText ?? this._locale.empty;
    if (this._loadingEl) {
      const textEl = this._loadingEl.querySelector('.vt-loading-text');
      if (textEl) textEl.textContent = this._options.loadingText ?? this._locale.loading;
    }
    // 表头排序提示随 locale 变化 → 重建表头
    if (this._options.showHeader !== false) this._rebuildThead();
    // 合计行首列标签随 locale 变化 → 重算(数据未变，仅刷新标签)
    if (this._options.showSummary) this._rebuildData();
    // 分页条文案随 locale 变化 → 重绘
    if (this._paginationEl) this._renderPagination();
    // 无限滚动状态条文案随 locale 变化 → 重绘
    this._renderInfiniteBars();
    // 插件自建 UI 的文案（如菜单项标签）交由插件自己刷新
    this._pluginRuntime?.emitLocaleChanged(this._locale);
  }

  /**
   * 客户端分页下把 total 同步成「筛选后的行数」，并 clamp 当前页。
   *
   * 必须在切片**之前**调用：筛掉一批数据后当前页可能已经超出范围，
   * 不 clamp 就会切出空数组、页面看起来是空的。
   */
  private _syncDerivedTotal(count: number): void {
    const nextTotal = Math.max(0, count);
    const nextPage = clampPage(this._page, nextTotal, this._pageSize);
    const changed = nextTotal !== this._total || nextPage !== this._page;
    this._total = nextTotal;
    this._page = nextPage;
    if (changed && this._paginationEl) this._renderPagination();
  }

  /** 跳转到指定页（1 基，自动 clamp）。仅在页码真正变化时派发 onPageChange */
  setPage(page: number): void {
    if (!this._paginationEl) {
      const prev = this._page;
      this._page = clampPage(page, this._total, this._pageSize);
      if (this._clientPage && this._page !== prev) this._rebuildData();
      if (this._hasFetcher && this._serverPage) this._remote?.goToPage(this._page);
      return;
    }
    this._goToPage(page);
  }

  /** 设置每页条数：重置到第 1 页并派发 onPageChange(1, pageSize) */
  setPageSize(pageSize: number): void {
    if (pageSize <= 0 || pageSize === this._pageSize) return;
    this._pageSize = pageSize;
    this._page = 1;
    if (this._paginationEl) this._renderPagination();
    if (this._clientPage) {
      this._rebuildData();
      this.scrollToTop();
    }
    // 有取数实现时由表格负责重取；否则维持「派发事件、用户自行取数」
    if (this._hasFetcher) this._remote?.setPageSize(pageSize);
    this._options.onPageChange?.(this._page, this._pageSize);
  }

  /** 更新总条数（取数返回后调用）：clamp 当前页并重绘，不派发事件 */
  setTotal(total: number): void {
    if (this._clientPage) {
      console.warn(
        '[virt-table] setTotal 在客户端分页下无效：total 由筛选后的行数自动派生。' +
          '要自己管 total 请开 manualPagination（或 dataMode: \'server\'）。',
      );
      return;
    }
    this._total = Math.max(0, total);
    this._page = clampPage(this._page, this._total, this._pageSize);
    this._remote?.setTotal(this._total);
    if (this._paginationEl) this._renderPagination();
  }

  /** 读取当前分页状态 */
  getPagination(): { page: number; pageSize: number; total: number } {
    return { page: this._page, pageSize: this._pageSize, total: this._total };
  }

  /** 切换加载态遮罩 */
  setLoading(loading: boolean): void {
    this._options.loading = loading;
    if (!this._loadingEl) return;
    this._loadingEl.style.display = loading ? '' : 'none';
    if (loading) this._rootEl.setAttribute('aria-busy', 'true');
    else this._rootEl.removeAttribute('aria-busy');
  }

  getCheckedRows(): T[] {
    const list = this._options.list ?? [];
    const key = this._options.itemKey;
    return list.filter((item) => this._checkedRows.has(String(item[key])));
  }

  /**
   * 全部已勾选行的 key，按**勾选顺序**（内部是 `Set`，插入序即勾选序；
   * `setCheckedRows(keys)` 则沿用传入数组的顺序）。
   *
   * 与 `getCheckedRows()` 的分工：后者按当前 `list` 过滤并返回**行对象**，因此
   * **拿不到「已勾选但不在当前页」的项** —— 服务端分页下要提交全部选中项就用这个。
   * 反过来，需要当前页的显示顺序请用 `getCheckedRows()`：off-page 的 key 没有显示
   * 顺序可言，这里不做排序。
   */
  getCheckedKeys(): string[] {
    return [...this._checkedRows];
  }

  setCheckedRows(keys: string[]): void {
    this._checkedRows = new Set(keys);
    this._refreshCheckboxes();
    this._updateHeaderCheckbox();
  }

  clearCheckedRows(): void {
    this._checkedRows.clear();
    this._refreshCheckboxes();
    this._updateHeaderCheckbox();
  }

  destroy(): void {
    this._clientEl.removeEventListener('scroll', this._boundOnHScroll);
    this._widthResizeObserver?.disconnect();
    this._widthResizeObserver = null;
    if (this._boundOnBodyClick) {
      this._tbodyEl.removeEventListener('click', this._boundOnBodyClick as EventListener);
    }
    if (this._options.showHeader !== false && this._headerWrapEl) {
      this._core.unobserveSlotEl(this._headerWrapEl);
    }
    if (this._footerWrapEl) this._core.unobserveSlotEl(this._footerWrapEl);
    if (this._headerWrapEl || this._footerWrapEl) {
      this._clientEl.removeEventListener('scroll', this._boundSyncSectionX);
    }
    // 自绘滚动条与输入接管都在 document 上挂了监听（拖拽 / 惯性），必须显式拆
    this._scrollbarY?.destroy();
    this._scrollbarY = null;
    this._scrollbarX?.destroy();
    this._scrollbarX = null;
    this._input?.destroy();
    this._input = null;
    this._removeResizeLine();
    this._tooltip?.destroy();
    this._tooltip = null;
    // 插件按注册逆序卸载（依赖方先走）
    this._pluginRuntime?.destroy();
    this._pluginRuntime = null;
    this._pluginApi = {};

    this._itemPool.forEach((el) => {
      this._options.onRowRemoved?.(el);
      this._core.resizeObserver?.unobserve(el);
    });
    this._itemPool.clear();
    this._rowDataMap.clear();

    for (const abort of this._lazyAborts.values()) abort.abort();
    this._lazyAborts.clear();
    this._lazyLoading.clear();

    this._remote?.destroy();
    this._remote = null;
    this._infiniteFooterEl = null;
    this._infiniteHeaderEl = null;
    this._lastRequest = null;

    this._core.destroy();
    this._paginationEl = null;
    this._root.innerHTML = '';
  }

  // --------------- width resize ---------------

  private _initWidthResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;
    let prevWidth = this._clientEl.clientWidth;
    /**
     * 这个观察器管两件事，合用一个实例：
     *
     * 1. **容器宽度**变化 → `_onWidthChange()`（列宽拉伸系数、列窗口、固定列阴影）；
     * 2. **表头 / 表尾高度**变化 → `_syncGeometryVars()`。
     *
     * 第 2 件是后补的，起因是一个真实 bug：`--vt-body-view-t/h` 由 `offsetHeight`
     * **快照**而来，而 `_syncGeometryVars()` 只在 6 个离散时机被调用（构造、setColumns、
     * 容器 resize…）。多级分组表头的高度是「多行 + rowSpan 自动分配」算出来的，
     * 会在那些时机**之外**变化：
     *   - 构造时刚 `_rebuildThead()` 完，浏览器可能还没完成布局，量到的是中间值；
     *   - 横滚触发分组格 colspan 裁剪 → 表头重建 → 高度可能变，而 `_onHScroll`
     *     里并没有调 `_syncGeometryVars()`；
     *   - 字体加载完成后表头重新排版，完全没有通知。
     * 于是纵向轨道的高度、`.vt-merge-label` 的居中基准都会停在过期值上。
     *
     * core 的 ResizeObserver 也一直在盯这两个 wrap（登记为 stickyHeader / stickyFooter
     * 槽），尺寸变化如今会派发 `update`（core 0.0.5 修的，见其 `_writeSlotSize`）——
     * 但那条路径只够把**表体重新摆一次**，`--vt-body-view-*` 这两个 CSS 变量 core
     * 并不知道，仍要在这里自己量、自己写。
     */
    this._widthResizeObserver = new ResizeObserver((entries) => {
      let widthChanged = false;
      let sectionResized = false;

      for (const entry of entries) {
        if (entry.target === this._clientEl) {
          const newWidth = entry.contentRect.width;
          if (newWidth !== prevWidth) {
            prevWidth = newWidth;
            widthChanged = true;
          }
        } else {
          // 表头 / 表尾的 wrap：高度变了，可见表体带跟着变
          sectionResized = true;
        }
      }

      // `_onWidthChange()` 末尾已经会调 `_syncGeometryVars()`，别重复跑一遍
      if (widthChanged) this._onWidthChange();
      else if (sectionResized) this._syncGeometryVars();
    });
    this._widthResizeObserver.observe(this._clientEl);
    if (this._headerWrapEl) this._widthResizeObserver.observe(this._headerWrapEl);
    if (this._footerWrapEl) this._widthResizeObserver.observe(this._footerWrapEl);
  }

  private _onWidthChange(): void {
    this._lastClientWidth = -1;
    const scaleChanged = this._applyWidthScale();
    // 可见中间区宽度随容器变化 → sticky 分组标签的定位变量要同步
    this._syncGeometryVars();
    if (this._calcColRange() || scaleChanged) {
      if (this._merges.length > 0) this._expandColRangeForMerges();
      this._rebuildAllRowCells();
      if (scaleChanged) {
        // 固定列的 sticky 偏移是行内样式，系数变化后需重建表头/表尾/固定行
        if (this._options.showHeader !== false) this._rebuildThead();
        if (this._getFooterRowCount() > 0) this._rebuildTfoot();
        this._rebuildPinnedRows();
      } else {
        // 分组表头/表尾随列窗口渲染，窗口变化时需重建
        if (this._hasColumnGroups && this._options.showHeader !== false) this._rebuildThead();
        if (this._hasGroupedFooter()) this._rebuildTfoot();
      }
      this._updateActiveCellOverlay();
    }
    this._updateFixedShadow();
    /**
     * 容器尺寸变了，两条滑块的长度都要重算（纵向还依赖 clientSize）；
     * 表头 / 表尾也可能刚被重建（列宽系数变化时整个重建），高度随之改变。
     */
    this._scrollbarY?.update();
    this._scrollbarX?.update();
    this._syncGeometryVars();
  }

  // --------------- column prefix sums ---------------

  /**
   * 有效列宽 = 声明列宽 × 拉伸系数。
   * `.vt-table` 带 `min-width:100%`，列宽之和窄于容器时表格会铺满容器、列被等比放大，
   * 因此所有几何计算（前缀和 / 固定列偏移 / colgroup）都必须用有效列宽，
   * 否则 JS 算出的坐标会小于实际渲染宽度（框选框宽度对不上列宽即此因）。
   */
  private _colWidth(col: VirtTableColumn<T>): number {
    return col.width * this._widthScale;
  }

  /**
   * 可用内容宽度：与 CSS `min-width:100%` 解析出的宽度保持一致。
   * `clientWidth` 是四舍五入后的整数，直接用它拉伸可能比真实内容区宽零点几像素，
   * 从而凭空多出一条横向滚动条，所以在差距不足 1px 时取小数值（差距过大说明祖先有
   * transform 缩放，此时 rect 不可信，退回 clientWidth）。
   */
  private _availableWidth(): number {
    const el = this._clientEl;
    if (!el) return 0;
    const layout = el.clientWidth;
    if (layout <= 0) return 0;
    const scrollbar = Math.max(0, el.offsetWidth - el.clientWidth);
    const rect = el.getBoundingClientRect().width - scrollbar;
    return Math.abs(rect - layout) < 1 ? Math.min(rect, layout) : layout;
  }

  /** 重新计算列宽拉伸系数，返回系数是否发生变化 */
  private _syncWidthScale(): boolean {
    const clientWidth = this._availableWidth();
    let logicalTotal = 0;
    for (const col of this._columns) logicalTotal += col.width;
    const next =
      clientWidth > 0 && logicalTotal > 0 && clientWidth > logicalTotal
        ? clientWidth / logicalTotal
        : 1;
    if (Math.abs(next - this._widthScale) < 1e-4) return false;
    this._widthScale = next;
    return true;
  }

  /** 同步拉伸系数并重建依赖列宽的几何数据，返回系数是否发生变化 */
  private _applyWidthScale(): boolean {
    if (!this._syncWidthScale()) return false;
    this._splitColumns();
    this._buildColPrefixSums();
    this._rebuildColgroup();
    this._leftShadowEl.style.left = `${this._leftFixedWidth - 1}px`;
    this._updateShadowPosition();
    return true;
  }

  private _buildColPrefixSums(): void {
    this._colPrefixSums = [0];
    for (const col of this._centerCols) {
      this._colPrefixSums.push(
        this._colPrefixSums[this._colPrefixSums.length - 1] + this._colWidth(col),
      );
    }
  }

  private _splitColumns(): void {
    this._leftFixedCols = [];
    this._centerCols = [];
    this._rightFixedCols = [];

    for (const col of this._columns) {
      if (col.fixed === 'left') this._leftFixedCols.push(col);
      else if (col.fixed === 'right') this._rightFixedCols.push(col);
      else this._centerCols.push(col);
    }

    this._leftFixedOffsets = [];
    let offset = 0;
    for (const col of this._leftFixedCols) {
      this._leftFixedOffsets.push(offset);
      offset += this._colWidth(col);
    }
    this._leftFixedWidth = offset;

    this._rightFixedOffsets = [];
    offset = 0;
    for (let i = this._rightFixedCols.length - 1; i >= 0; i--) {
      this._rightFixedOffsets[i] = offset;
      offset += this._colWidth(this._rightFixedCols[i]);
    }
    this._rightFixedWidth = offset;

    // 表头网格按同一套冻结区段划分，与叶子列拆分保持同步
    this._rebuildHeaderMatrix();

    this._validateFixedWidth();
  }

  private _validateFixedWidth(): void {
    const clientWidth = this._clientEl?.clientWidth ?? this._rootEl?.clientWidth ?? this._root.clientWidth;
    if (clientWidth > 0 && this._leftFixedWidth + this._rightFixedWidth > clientWidth) {
      console.error(
        `[VirtTable] 固定列总宽度 (${this._leftFixedWidth} + ${this._rightFixedWidth} = ${this._leftFixedWidth + this._rightFixedWidth}px) 超出容器宽度 (${clientWidth}px)，固定列将无法正常显示。`,
      );
    }
  }

  private _updateShadowPosition(): void {
    const scrollbarWidth = this._clientEl
      ? this._clientEl.offsetWidth - this._clientEl.clientWidth
      : 0;
    // 10px 是阴影宽度
    this._rightShadowEl.style.right =
      `${this._rightFixedWidth + scrollbarWidth + 10}px`;
  }

  private _updateFixedShadow(): void {
    if (!this._clientEl) return;
    const { scrollLeft, scrollWidth, clientWidth } = this._clientEl;

    let status: 'none' | 'left' | 'right' | 'middle';
    if (scrollWidth <= clientWidth) {
      status = 'none';
    } else if (scrollLeft === 0) {
      status = 'left';
    } else if (Math.abs(scrollLeft + clientWidth - scrollWidth) < 1) {
      status = 'right';
    } else {
      status = 'middle';
    }

    const showLeft =
      status !== 'left' &&
      status !== 'none' &&
      this._leftFixedCols.length > 0;
    const showRight =
      status !== 'right' &&
      status !== 'none' &&
      this._rightFixedCols.length > 0;

    this._leftShadowEl.classList.toggle('vt-fixed-shadow--left', showLeft);
    this._rightShadowEl.classList.toggle('vt-fixed-shadow--right', showRight);
  }

  /**
   * Determine which columns are inside the horizontal viewport.
   * Returns true if the range changed.
   */
  private _calcColRange(): boolean {
    const totalCenterCols = this._centerCols.length;
    if (totalCenterCols === 0) {
      this._baseColBegin = 0;
      this._baseColEnd = -1;
      this._renderColBegin = 0;
      this._renderColEnd = -1;
      return false;
    }

    const scrollLeft = this._clientEl?.scrollLeft ?? 0;
    const clientWidth = this._clientEl?.clientWidth ?? 0;

    if (clientWidth <= 0) {
      const changed =
        this._baseColBegin !== 0 ||
        this._baseColEnd !== totalCenterCols - 1;
      this._baseColBegin = 0;
      this._baseColEnd = totalCenterCols - 1;
      this._renderColBegin = 0;
      this._renderColEnd = totalCenterCols - 1;
      return changed;
    }

    const effectiveViewWidth = Math.max(
      0,
      clientWidth - this._leftFixedWidth - this._rightFixedWidth,
    );
    const viewRight = scrollLeft + effectiveViewWidth;
    const buffer = this._options.colBuffer ?? 0;

    let begin = 0;
    for (let i = 0; i < totalCenterCols; i++) {
      if (this._colPrefixSums[i + 1] > scrollLeft) {
        begin = i;
        break;
      }
    }

    let end = totalCenterCols - 1;
    for (let i = begin; i < totalCenterCols; i++) {
      if (this._colPrefixSums[i] >= viewRight) {
        end = i - 1;
        break;
      }
    }

    begin = Math.max(0, begin - buffer);
    end = Math.min(totalCenterCols - 1, end + buffer);

    const changed =
      begin !== this._baseColBegin || end !== this._baseColEnd;
    this._baseColBegin = begin;
    this._baseColEnd = end;
    this._renderColBegin = begin;
    this._renderColEnd = end;
    return changed;
  }

  /**
   * 横向滚动。挂在 `.vt-client` 的原生 `scroll` 事件上。
   *
   * 横向**刻意保留原生 scrollport**（`overflow-x: auto`）：`td.vt-fixed-left/right`、
   * `.vt-group-label`、`.vt-merge-label` 三处 `position: sticky` 都以它为参照，
   * 横向一旦改成 JS 位移，这三套定位会同时失效。自绘横向滚动条只是**驱动 scrollLeft**，
   * 不接管位移本身，所以本方法与固定列 / 列虚拟化的逻辑完全不用动。
   *
   * 纵向已不再经过这里（overflow-y 是 hidden，浏览器不派发纵向 scroll），
   * 见 `_onVScroll`。
   */
  private _onHScroll(): void {
    const scrollLeft = this._clientEl.scrollLeft;
    const clientWidth = this._clientEl.clientWidth;

    this._removeResizeLine();

    // 自绘横条要跟着原生 scrollLeft 走：拖滑块以外的横向滚动（shift+滚轮、触摸板横扫、
    // scrollToCell）都只改 scrollLeft，滑块位置得在这里补上
    this._scrollbarX?.notifyActivity();
    this._scrollbarX?.update();

    // 放在下面的早返回之前：插件浮层（编辑器 / 框选）跟随的是像素位置，
    // 即使列窗口没变也要重算
    this._pluginRuntime?.emitScroll(scrollLeft, this._core.getOffset());

    if (
      scrollLeft === this._lastScrollLeft &&
      clientWidth === this._lastClientWidth
    ) {
      return;
    }
    this._lastScrollLeft = scrollLeft;
    this._lastClientWidth = clientWidth;

    /**
     * 固定列阴影只取决于 `scrollLeft` / `scrollWidth` / `clientWidth`，纵向滚动时三者都不变，
     * 所以放在早返回**之后** —— 放前面等于每次纵向滚动都白读一次 `scrollWidth`，而 scroll
     * 回调此刻布局是脏的（虚拟滚动刚改过 padding 行高度），这一读就是一次**强制同步布局**。
     * CPU profile 实测：自动合并 demo 里 `_onHScroll` 曾占 5.1% self time（对照的斑马纹 demo
     * 完全不上榜），而主线程在 scroll 回调里多花的每一毫秒都直接延长「新内容还没画出来」的
     * 空白窗口（见 AGENTS §7.10）。
     * `scrollWidth` / `clientWidth` 真正会变的场合另有三个调用点覆盖：初始化、`setColumns`、
     * 容器 resize（`_onWidthChange`）。
     */
    this._updateFixedShadow();

    if (!this._calcColRange()) return;

    if (this._merges.length > 0) this._expandColRangeForMerges();
    this._rebuildAllRowCells();
    // 分组表头/表尾也按列窗口渲染，列范围变了就得跟着重建（置顶/置底固定行不受影响）
    if (this._hasColumnGroups && this._options.showHeader !== false) this._rebuildThead();
    if (this._hasGroupedFooter()) this._rebuildTfoot();
    this._updateActiveCellOverlay();
  }

  /**
   * 纵向滚动。由 core 的 `offsetChange` **同步**驱动，不是 DOM 事件。
   *
   * `.vt-client` 的 overflow-y 是 hidden，浏览器不再派发纵向 `scroll` 事件，
   * 所以过去挂在原生事件上「顺带」完成的几件事都得在这里显式做一遍。
   * 逐项都是必需的，不是保险起见：
   */
  private _onVScroll(offset: number): void {
    // 内容就位。必须第一个做，且必须同步 —— 与随后的 DOM patch 同帧提交
    this._applyBodyOffset();

    // 滚动条显形 + 滑块跟随
    this._scrollbarY?.notifyActivity();
    this._scrollbarY?.update();

    // 列宽指示线是按当时的滚动位置画的绝对定位线，滚动后位置就失效了
    this._removeResizeLine();

    /**
     * 溢出文本 tooltip 必须收起：行 DOM 会被虚拟滚动复用，滚过之后指针底下那一格
     * 已经换了内容，tooltip 里却还是旧文本。
     * 原来由 `internal/tooltip.ts` 里挂在 scroller 上的原生 `scroll` 监听兜住，
     * 那条监听现在只覆盖横向。
     */
    this._tooltip?.hide();

    /**
     * 当前单元格描边浮层要重定位。
     *
     * 原生滚动时期它是免费的：浮层是滚动容器的子节点、按内容坐标定位，容器一滚就跟着走。
     * 现在容器不滚了（内容靠表体的 `top` 移动），浮层留在原地，只能每帧重算。
     * 方法内部有两级早返回（没开 `highlightSelectCell` / 没选中单元格），常态下极便宜。
     */
    this._updateActiveCellOverlay();

    // 插件浮层跟随（cell-editor 的编辑框、cell-selection 的框选层都订阅 onScroll）
    this._pluginRuntime?.emitScroll(this._clientEl?.scrollLeft ?? 0, offset);
  }

  // --------------- 自绘滚动条 ---------------

  /**
   * 滚到底时视口顶部那一行的索引，也就是 `inViewBegin` 的上限 —— 纵向滑块映射的分母。
   *
   * 不能用 `list.length - 1`：那样滚到底时滑块只走到 `(len - 可见行数) / len`，
   * 永远碰不到轨道尽头。
   */
  private _maxRowBegin(): number {
    return this._core.getIndexByOffset(this._core.getMaxOffset());
  }

  /**
   * 当前纵向位置对应的滑块比例。
   *
   * 按**索引**而不是像素：不定高表格的 `itemsTotalSize` 随实测行高回填一直在变，
   * 按像素算滑块会在手指底下反复跳。`frac`（视口顶部扎进该行内部的比例）
   * 让高行内部也能连续移动，不是一格一格跳。
   */
  private _verticalRatio(): number {
    const { inViewBegin } = this._core.state;
    const pos = this._core.getItemPosByIndex(inViewBegin);
    const frac = pos.current > 0 ? (this._core.getOffset() - pos.top) / pos.current : 0;
    return positionToRatio({ inViewBegin, maxBegin: this._maxRowBegin(), frac });
  }

  /** 用户把纵向滑块拖到了 ratio，换算成偏移量并立即落位 */
  private _scrollToVerticalRatio(ratio: number): void {
    /**
     * 两端交给 core 的专用路径：按索引换算出的目标是「那一行的顶部」，
     * 到不了真正的底部，末尾会差半屏。
     */
    if (ratio >= 1) {
      this._core.scrollToBottom();
      return;
    }
    if (ratio <= 0) {
      this._core.scrollToTop();
      return;
    }

    const { index, frac } = ratioToPosition(ratio, this._maxRowBegin());
    const pos = this._core.getItemPosByIndex(index);
    /**
     * 拖拽热路径刻意**不用** `scrollToIndex`：它会挂渐进修正任务，而那个任务会和下一次
     * move 抢偏移量。修正只在松手时做一次（见 `onDragEnd`）。
     *
     * 走 `scrollFromUser` 而非 `scrollToOffset`：只有前者会触发 `toTop` / `toBottom`
     * 判定与自动续拉，否则拖到底不会触发 `loadMore`，无限滚动整个失效。
     */
    this._core.scrollFromUser(pos.top + frac * pos.current);
  }

  /** 横向可滚动的最大距离（原生 scrollLeft 的上限） */
  private _maxScrollLeft(): number {
    if (!this._clientEl) return 0;
    return Math.max(0, this._clientEl.scrollWidth - this._clientEl.clientWidth);
  }

  /**
   * 创建两条自绘滚动条与纵向输入接管。
   *
   * 轨道挂在 `_rootEl` 而**不是** `_clientEl` 上：`.vt-header` / `.vt-footer` 是
   * `_rootEl` 的子节点且 `z-index: 10`，挂在 `_clientEl` 里的轨道会被它们盖住
   * （`_clientEl` 自身没有 z-index，整个子树都在表头表尾下面）。
   */
  private _initScrollbars(): void {
    const autoHideDelay = this._options.scrollbarAutoHide ?? 1200;
    const minThumbSize = this._options.scrollbarMinThumbSize;

    this._scrollbarY = new Scrollbar(
      {
        getClientSize: () => this._core.slotSize.clientSize,
        getTotalSize: () => this._core.getTotalSize(),
        getRatio: () => this._verticalRatio(),
        onRatio: (ratio) => this._scrollToVerticalRatio(ratio),
        /**
         * 松手后再挂一次渐进修正：拖拽途中新行才刚渲染出来，它们的真实高度回填后
         * 目标位置会变，这一步把误差收敛掉。
         */
        onDragEnd: () => this._core.scrollToIndex(this._core.state.inViewBegin),
      },
      { horizontal: false, autoHideDelay, minThumbSize },
    );
    this._rootEl.appendChild(this._scrollbarY.el);

    /**
     * 横条只负责**驱动原生 `scrollLeft`**，不接管横向位移本身。
     *
     * 因此换算是纯像素的、不需要索引量化：列没有「不定宽随测量回填」的问题，
     * `scrollWidth` 是稳定的。写 `scrollLeft` 会照常触发原生 `scroll` →
     * `_onHScroll` / `_syncSectionX`，固定列与列虚拟化的逻辑一行都不用改。
     */
    this._scrollbarX = new Scrollbar(
      {
        getClientSize: () => this._clientEl?.clientWidth ?? 0,
        getTotalSize: () => this._clientEl?.scrollWidth ?? 0,
        getRatio: () => {
          const max = this._maxScrollLeft();
          return max > 0 ? (this._clientEl?.scrollLeft ?? 0) / max : 0;
        },
        onRatio: (ratio) => {
          if (this._clientEl) this._clientEl.scrollLeft = ratio * this._maxScrollLeft();
        },
        // 横向没有不定宽，落位一次就是准的，无需收敛
        onDragEnd: () => {},
      },
      { horizontal: true, autoHideDelay, minThumbSize },
    );
    this._rootEl.appendChild(this._scrollbarX.el);

    /**
     * 纵向输入接管。`overflow-y: hidden` 之后浏览器不再提供任何纵向滚动手段，
     * 滚轮 / 触摸 / 惯性都得自己实现。横向不接管（`horizontal: false`）——
     * 那边仍是原生 scrollport，触摸板横扫与 shift+滚轮由浏览器处理。
     *
     * 键盘在装了 `vtKeyboardNav` 时必须让给插件：该插件在 `_rootEl` 上监听 keydown，
     * 而 InputController 挂在 `_clientEl`（`_rootEl` 的后代）上，冒泡时**先**于它触发
     * —— 两者都处理方向键的话，一次按键会既滚一段又移一格。插件自己已实现
     * PageUp/Down、Home/End 的翻页与定位，把键盘整体交给它即可。
     */
    const hasKeyboardNav = (this._options.plugins ?? []).some(
      (p) => p?.name === 'vtKeyboardNav',
    );
    this._input = new InputController(
      this._clientEl,
      {
        getOffset: () => this._core.getOffset(),
        getMaxOffset: () => this._core.getMaxOffset(),
        getClientSize: () => this._core.slotSize.clientSize,
        // 用户输入必须走 scrollFromUser：只有它触发 toTop / toBottom 与自动续拉。
        // 走 scrollToOffset（程序化路径）的话，滚轮滚到底不会触发 loadMore
        scrollBy: (delta) => this._core.scrollFromUser(this._core.getOffset() + delta),
        scrollTo: (offset) => this._core.scrollFromUser(offset),
        scrollToTop: () => this._core.scrollToTop(),
        scrollToBottom: () => this._core.scrollToBottom(),
        onActivity: () => this._scrollbarY?.notifyActivity(),
      },
      false,
      { keyboard: !hasKeyboardNav },
    );

    // 首次量出滑块长度与启用状态。轨道是浮层、不影响任何几何变量，
    // 所以不需要在这里重算 _syncGeometryVars()
    this._scrollbarY.update();
    this._scrollbarX.update();
    this._syncScrollbarVars();
  }

  // --------------- merge cell helpers ---------------

  /** 有列配了 `mergeKey` 且落在中间列上 */
  private _hasAutoMerge(): boolean {
    return this._mergeRuns.length > 0;
  }

  /**
   * 重建自动合并的分段索引。数据管线末端调用（筛选 / 排序 / 树形展开之后），
   * 一列一趟 O(行数) 扫描；实测 100 万行约 3.3ms、内存 781KB。
   *
   * 分段索引不进 `_merges`：那会让 `buildRowMergeIndex` 按覆盖行数建 Map（100 万
   * 覆盖行 = 64.8ms），也会让 `calcRenderRect` 把渲染起点拉回段首（实测 rowspan
   * 5 万时 materialize 5 万个 `<tr>`）。每帧再按渲染窗口裁剪，见 `merge.ts` 末尾。
   */
  private _rebuildMergeRuns(): void {
    const list = this._options.list ?? [];
    const runs: MergeRuns[] = [];

    for (let ci = 0; ci < this._centerCols.length; ci++) {
      const col = this._centerCols[ci];
      if (!col.mergeKey) continue;
      const getKey =
        typeof col.mergeKey === 'function'
          ? col.mergeKey
          : (row: T) => row[col.key as keyof T];
      runs.push(
        buildMergeRuns({
          colIndex: ci,
          rowCount: list.length,
          keyOf: (i) => getKey(list[i], i),
          // 分组行自成一段，树形层级变化处断开 —— 否则父子行会被并成一格
          isBoundary: (i) => {
            const cur = list[i] as any;
            const prev = list[i - 1] as any;
            return (
              cur._rowType === 'group' ||
              prev._rowType === 'group' ||
              cur._treeLevel !== prev._treeLevel ||
              cur._groupLevel !== prev._groupLevel
            );
          },
          maxSpan: col.mergeMaxSpan,
        }),
      );
    }

    this._mergeRuns = runs;
  }

  /** 固定列上配 `mergeKey` 是无效的（不在合并坐标系里），给一次告警 */
  /**
   * 功能列（`type`）**独占**单元格，配在它们上的 `render` 会被忽略 —— 以前是静默的，
   * 使用方只能靠调试发现。`tree` 不在此列：它是装饰器，缩进 + 箭头之后照常走内容链。
   *
   * 只警告**列级**：列级配了就是整列都不要那个控件，那不该配 `type`。单元格级
   * （`setCellRender`）是允许穿透的，见 `_applyCellContentInner` 里的 `pierced`。
   */
  private _warnTypeWithRender(): void {
    const flat = (cols: VirtTableColumn<T>[]): VirtTableColumn<T>[] =>
      cols.flatMap((c) => (c.children?.length ? flat(c.children) : [c]));
    for (const col of flat(this._options.columns)) {
      if (col.type && col.type !== 'tree' && (col.render || col.renderEditor || col.cellType)) {
        console.warn(
          `[virt-table] 列 "${col.key}" 的 type="${col.type}" 是功能列，独占单元格内容 —— ` +
            '同时配的 render / renderEditor / cellType 会被忽略。要整列自定义内容请去掉 type，' +
            '或改用 type="tree"（它只加缩进与折叠箭头，内容仍走内容链）；' +
            '只想让个别格子特殊，用 setCellRender()（单元格级可以穿透功能列）。',
        );
      }
    }
  }

  private _warnFixedMergeKey(): void {
    for (const col of [...this._leftFixedCols, ...this._rightFixedCols]) {
      if (col.mergeKey) {
        console.warn(
          `[virt-table] 列 "${col.key}" 配了 mergeKey，但它是固定列 —— ` +
            '固定列不参与合并单元格坐标系，该配置被忽略。',
        );
      }
    }
  }

  private _updateRenderMerges(placeholders: MergeCell[]): void {
    const prev = this._renderMerges;
    this._placeholderMerges = placeholders;
    // 自动合并按当前渲染行区间裁剪，产出数量以窗口大小为界（与数据规模无关）
    const auto = this._hasAutoMerge()
      ? clampMergeRunsToWindow(this._mergeRuns, this._renderRowBegin, this._renderRowEnd)
      : [];
    const next =
      placeholders.length > 0 || auto.length > 0
        ? [...placeholders, ...this._merges, ...auto]
        : this._merges;

    let changed = prev.length !== next.length;
    if (!changed) {
      for (let i = 0; i < prev.length; i++) {
        const a = prev[i];
        const b = next[i];
        if (
          a.rowIndex !== b.rowIndex ||
          a.colIndex !== b.colIndex ||
          a.rowspan !== b.rowspan ||
          a.colspan !== b.colspan
        ) {
          changed = true;
          break;
        }
      }
    }

    this._renderMerges = next;
    // Important: merge list can change even when col range is unchanged.
    // Rebuild center cells to avoid reusing stale DOM merge layout.
    if (changed && this._domReady) {
      this._needsRowCellsRebuild = true;
    }
  }

  private _mergeRenderControl(
    begin: number,
    end: number,
  ): { begin: number; end: number } {
    if (this._userRenderControl) {
      const ctrl = this._userRenderControl(begin, end);
      begin = ctrl.begin;
      end = ctrl.end;
    }

    const listLen = (this._options.list ?? []).length;
    const buffer = this._options.buffer ?? 0;
    const bufferTop = this._options.bufferTop ?? buffer;
    const bufferBottom = this._options.bufferBottom ?? buffer;
    begin = Math.max(0, begin - bufferTop);
    end = Math.min(end + bufferBottom, listLen > 0 ? listLen - 1 : 0);

    this._inViewRowBegin = begin;
    this._inViewRowEnd = end;

    if (this._merges.length === 0) {
      // 只有自动合并：**刻意不扩张渲染区间**，直接按最终区间裁剪分段。
      // 扩张才是虚拟滚动被打穿的原因（见 _rebuildMergeRuns 的注释）。
      this._renderRowBegin = begin;
      this._renderRowEnd = end;
      if (this._hasAutoMerge()) this._updateRenderMerges([]);
      return { begin, end };
    }

    const renderRect = calcRenderRect(this._merges, {
      ys: begin,
      ye: end,
      xs: this._renderColBegin,
      xe: this._renderColEnd,
    });

    const oldCb = this._renderColBegin;
    const oldCe = this._renderColEnd;
    this._renderColBegin = Math.min(this._renderColBegin, renderRect.xs);
    this._renderColEnd = Math.max(this._renderColEnd, renderRect.xe);

    // 静态 merges 可能把区间撑宽，自动合并要按撑宽后的区间裁剪
    this._renderRowBegin = renderRect.ys;
    this._renderRowEnd = renderRect.ye;
    this._updateRenderMerges(renderRect.placeholderMerges);

    if (
      this._domReady &&
      (oldCb !== renderRect.xs || oldCe !== renderRect.xe)
    ) {
      this._needsRowCellsRebuild = true;
    }

    return { begin: renderRect.ys, end: renderRect.ye };
  }

  private _expandColRangeForMerges(): void {
    if (this._merges.length === 0) return;

    const renderRect = calcRenderRect(this._merges, {
      ys: this._inViewRowBegin,
      ye: this._inViewRowEnd,
      xs: this._baseColBegin,
      xe: this._baseColEnd,
    });

    this._renderColBegin = Math.min(this._renderColBegin, renderRect.xs);
    this._renderColEnd = Math.max(this._renderColEnd, renderRect.xe);

    this._updateRenderMerges(renderRect.placeholderMerges);

    // Horizontal range changes can also alter required render rows
    // (merge rowspan crossing top/bottom boundaries). Align with Vue behavior.
    if (
      this._domReady &&
      (renderRect.ys !== this._core.state.renderBegin ||
        renderRect.ye !== this._core.state.renderEnd)
    ) {
      this._needsRowCellsRebuild = true;
      this._core.manualRender(renderRect.ys, renderRect.ye);
    }
  }

  /**
   * Update center cells for all currently pooled rows when the
   * horizontal column range changes. Fixed cols and height td are
   * kept stable (DOM reuse). Expand/group rows are skipped because
   * their full-colspan td is unaffected by column range.
   */
  private _rebuildAllRowCells(): void {
    this._rowDataMap.forEach(({ item, rowIndex }, key) => {
      const tr = this._itemPool.get(key);
      if (!tr) return;
      const rowType = (item as any)._rowType as string | undefined;
      if (rowType === 'expand' || rowType === 'group') return;
      this._updateCenterCells(tr, item, rowIndex);
    });
  }

  // --------------- expand / tree / group ---------------

  private _flattenTree(source: T[]): T[] {
    const itemKey = this._options.itemKey;
    const defaultAll = this._options.defaultExpandAll ?? false;
    const hasGroupConfig = !!this._options.groupConfig;
    const result: T[] = [];

    let list = source;
    if (hasGroupConfig && list.length > 0 && !(list[0] as any)._rowType) {
      list = this._constructGroups(list) as T[];
    }

    const walk = (items: T[], treeLevel: number, groupLevel: number) => {
      for (const item of items) {
        const key = String(item[itemKey]);
        const rowType = (item as any)._rowType as string | undefined;
        const children = (item as any).children as T[] | undefined;
        const hasKids = Array.isArray(children) && children.length > 0;

        if (rowType === 'group') {
          if (this._foldMap[key] === undefined) {
            this._foldMap[key] = !defaultAll;
          }
          (item as any)._groupLevel = groupLevel;
          (item as any)._hasChildren = hasKids;
          result.push(item);
          if (hasKids && !this._foldMap[key]) {
            walk(children!, treeLevel, groupLevel + 1);
          }
        } else {
          // 懒加载节点：children 还没取回来，但已知「可能有子节点」→ 照样给箭头
          const lazyPending = this._hasTreeCol && !hasKids && this._isLazyParent(item, key);
          if (this._hasTreeCol && (hasKids || lazyPending)) {
            if (this._foldMap[key] === undefined) {
              // 懒节点默认折叠：defaultExpandAll 不该在初始化时就把整棵树拉下来
              this._foldMap[key] = lazyPending ? true : !defaultAll;
            }
            (item as any)._treeLevel = treeLevel;
            (item as any)._groupLevel = groupLevel;
            (item as any)._hasChildren = true;
            (item as any)._lazyPending = lazyPending;
            result.push(item);
            if (!this._foldMap[key] && hasKids) {
              walk(children!, treeLevel + 1, groupLevel);
            }
          } else {
            (item as any)._treeLevel = treeLevel;
            (item as any)._groupLevel = groupLevel;
            (item as any)._hasChildren = false;
            result.push(item);
          }

          if (this._hasExpandCol) {
            if (this._expandMap[key] === undefined) {
              this._expandMap[key] = defaultAll;
            }
            if (this._expandMap[key]) {
              const expandKey = key + '__expand';
              if (!this._expandRowCache[expandKey]) {
                this._expandRowCache[expandKey] = {
                  [itemKey]: expandKey,
                  _rowType: 'expand',
                  _parentId: key,
                } as unknown as T;
              }
              result.push(this._expandRowCache[expandKey]);
            }
          }
        }
      }
    };

    walk(list, 1, 1);
    return result;
  }

  private _constructGroups(list: T[]): T[] {
    const gc = this._options.groupConfig;
    if (!gc || gc.length === 0) return list;

    const buildLevel = (items: T[], levelIdx: number, parentPath: string): T[] => {
      if (levelIdx >= gc.length) return items;
      const { field, sort } = gc[levelIdx];
      const groups = new Map<string, T[]>();
      for (const item of items) {
        const val = String(item[field] ?? '');
        if (!groups.has(val)) groups.set(val, []);
        groups.get(val)!.push(item);
      }
      let keys = Array.from(groups.keys());
      if (sort === 'asc') keys.sort();
      else if (sort === 'desc') keys.sort().reverse();

      const itemKey = this._options.itemKey;
      return keys.map((k) => {
        const groupPath = parentPath ? `${parentPath}/${field}:${k}` : `${field}:${k}`;
        const children = buildLevel(groups.get(k)!, levelIdx + 1, groupPath);
        return {
          [itemKey]: `__group_${groupPath}`,
          _rowType: 'group',
          _groupName: k,
          _groupField: field,
          // 该分组下的数据条数（用于分组行右侧计数徽标）
          _groupCount: groups.get(k)!.length,
          children,
        } as unknown as T;
      });
    };

    return buildLevel(list, 0, '');
  }

  toggleExpand(rowKey: string): void {
    this._expandMap[rowKey] = !this._expandMap[rowKey];
    this._reflatten();
    const item = this._originList.find(
      (it) => String(it[this._options.itemKey]) === rowKey,
    );
    if (item) {
      const expandedKeys = Object.keys(this._expandMap).filter(
        (k) => this._expandMap[k],
      );
      this._options.onExpandChange?.(item, expandedKeys);
    }
  }

  // --------------- 树形子节点懒加载 ---------------

  /** 该行是否「可能有子节点但还没加载」 */
  private _isLazyParent(row: T, key: string): boolean {
    if (!this._options.loadChildren) return false;
    if (this._lazyLoaded.has(key)) return false; // 已取过（哪怕取回空数组）
    const probe = this._options.hasChildren;
    return probe ? !!probe(row) : !!(row as any).hasChildren;
  }

  /** 在 _originList 里按 key 找到原始行（写回 children 用，不依赖引用是否被管线克隆过） */
  private _findOriginRow(key: string): T | null {
    const itemKey = this._options.itemKey;
    let found: T | null = null;
    const walk = (items: T[]): void => {
      for (const it of items) {
        if (found) return;
        if (String(it[itemKey]) === key) {
          found = it;
          return;
        }
        const kids = (it as any).children as T[] | undefined;
        if (Array.isArray(kids) && kids.length) walk(kids);
      }
    };
    walk(this._originList);
    return found;
  }

  /** 给某行的树形箭头切换加载态（只碰这一行的 DOM，不整表重建） */
  private _setLazyToggleLoading(key: string, loading: boolean): void {
    const toggle = this._itemPool.get(key)?.querySelector<HTMLElement>('.vt-tree-toggle');
    if (!toggle) return;
    toggle.classList.toggle('vt-tree-toggle--loading', loading);
    toggle.innerHTML = loading ? '<span class="vt-spinner vt-spinner--xs"></span>' : CHEVRON_SVG;
  }

  /**
   * 取某节点的子节点（首次展开时自动触发，也可手动调用）。
   * 同一行在途只请求一次；返回空数组也记为「已加载」，避免反复请求。
   */
  loadChildrenFor(rowKey: string): void {
    const loader = this._options.loadChildren;
    if (!loader) return;
    if (this._lazyLoading.has(rowKey) || this._lazyLoaded.has(rowKey)) return;
    const row = this._findOriginRow(rowKey);
    if (!row) return;

    const abort = new AbortController();
    this._lazyAborts.set(rowKey, abort);
    this._lazyLoading.add(rowKey);
    this._setLazyToggleLoading(rowKey, true);

    const level = ((row as any)._treeLevel as number) || 1;
    const settle = (): void => {
      this._lazyLoading.delete(rowKey);
      this._lazyAborts.delete(rowKey);
    };
    const onOk = (children: T[]): void => {
      if (abort.signal.aborted) return;
      settle();
      this._lazyLoaded.add(rowKey);
      (row as any).children = children;
      if (children.length === 0) {
        // 确实没有子节点：折叠状态留着，箭头会在重建后变叶子
        this._foldMap[rowKey] = true;
      }
      this._rebuildData();
      this._options.onChildrenLoaded?.(row, children);
    };
    const onErr = (err: unknown): void => {
      if (abort.signal.aborted) return;
      settle();
      // 回到折叠态，箭头恢复可点（再次点击即重试）
      this._foldMap[rowKey] = true;
      this._setLazyToggleLoading(rowKey, false);
      this._options.onChildrenLoadError?.(row, err);
    };

    try {
      const ret = loader(row, { level, signal: abort.signal });
      if (ret && typeof (ret as Promise<T[]>).then === 'function') {
        (ret as Promise<T[]>).then(
          (rows) => onOk(Array.isArray(rows) ? rows : []),
          (err) => onErr(err),
        );
      } else {
        onOk(Array.isArray(ret) ? (ret as T[]) : []);
      }
    } catch (err) {
      onErr(err);
    }
  }

  /**
   * 清除某节点的懒加载缓存标记（并可选清空其 children），
   * 下次展开会重新调用 `loadChildren`。
   */
  resetLazyNode(rowKey: string, clearChildren = true): void {
    this._lazyAborts.get(rowKey)?.abort();
    this._lazyAborts.delete(rowKey);
    this._lazyLoading.delete(rowKey);
    this._lazyLoaded.delete(rowKey);
    if (clearChildren) {
      const row = this._findOriginRow(rowKey);
      if (row) (row as any).children = undefined;
    }
    this._foldMap[rowKey] = true;
    this._rebuildData();
  }

  toggleFold(rowKey: string): void {
    // 子节点正在取：忽略点击。否则连点会按奇偶翻转折叠态，
    // 数据到达时展开与否变得随机（箭头此时是 spinner，本就不该可点）
    if (this._lazyLoading.has(rowKey)) return;

    // 懒节点首次展开：先取子节点（加载完成后由 _rebuildData 展开）
    const willExpand = !!this._foldMap[rowKey];
    if (willExpand && this._options.loadChildren && !this._lazyLoaded.has(rowKey)) {
      const row = this._findOriginRow(rowKey);
      const kids = row ? ((row as any).children as T[] | undefined) : undefined;
      if (row && !(Array.isArray(kids) && kids.length > 0) && this._isLazyParent(row, rowKey)) {
        this._foldMap[rowKey] = false; // 记为展开，数据到位后自然展开
        this.loadChildrenFor(rowKey);
        this._options.onTreeToggle?.(row, true);
        return;
      }
    }

    this._foldMap[rowKey] = !this._foldMap[rowKey];
    const expanded = !this._foldMap[rowKey];
    this._reflatten();
    const flatItem = (this._options.list ?? []).find(
      (it) => String(it[this._options.itemKey]) === rowKey,
    );
    if (flatItem) {
      if ((flatItem as any)._rowType === 'group') {
        this._options.onGroupToggle?.(flatItem, expanded);
      } else {
        this._options.onTreeToggle?.(flatItem, expanded);
      }
    }
  }

  expandAll(): void {
    if (this._hasExpandCol) {
      for (const key of Object.keys(this._expandMap)) {
        this._expandMap[key] = true;
      }
      this._forEachItem(this._originList, (item) => {
        this._expandMap[String(item[this._options.itemKey])] = true;
      });
    }
    for (const key of Object.keys(this._foldMap)) {
      this._foldMap[key] = false;
    }
    this._reflatten();
  }

  collapseAll(): void {
    if (this._hasExpandCol) {
      for (const key of Object.keys(this._expandMap)) {
        this._expandMap[key] = false;
      }
    }
    for (const key of Object.keys(this._foldMap)) {
      this._foldMap[key] = true;
    }
    this._reflatten();
  }

  private _forEachItem(items: T[], fn: (item: T) => void): void {
    for (const item of items) {
      fn(item);
      const children = (item as any).children as T[] | undefined;
      if (children) this._forEachItem(children, fn);
    }
  }

  // --------------- 统一数据管线枢纽 ---------------

  /**
   * 计算最终展示用的扁平行数组。固定顺序：
   *   _originList → ①筛选(结构保持) → ②排序(结构保持) → ③结构展开(_flattenTree) → ④聚合
   * 筛选/排序均作用于「结构展开之前的原始行」，group/expand 合成行不会进入。
   * 纯扁平且无任何变换时走零开销快路径。
   *
   * `manualSorting` / `manualFiltering`（或 dataMode:'server'）下跳过对应阶段：
   * 数据已由服务端排好/筛好，本地再算一遍既冗余又会与服务端口径打架。
   */
  private _computeDisplayList(): T[] {
    const hasTree = this._hasTreeCol;
    const hasGroup = !!this._options.groupConfig;
    const hasExpand = this._hasExpandCol;
    const hasSort = !this._serverSort && this._sortState.length > 0;
    const hasFilter = !this._serverFilter && this._activeFilters.size > 0;
    const hasFilterModel = !this._serverFilter && isFilterModelActive(this._filterModel);

    const hasClientPage = this._clientPage;

    if (
      !hasTree && !hasGroup && !hasExpand &&
      !hasSort && !hasFilter && !hasFilterModel && !hasClientPage
    ) {
      this._recomputeSummary(this._originList);
      return this._originList;
    }

    // ① 筛选（结构保持：树保留祖先）
    // 列头筛选与高级筛选模型组合成单个谓词，只走一趟遍历（避免两次树克隆）
    let prepared = this._originList;
    if (!this._serverFilter) {
      const pCol = buildColumnFilterPredicate(this._activeFilters, this._allLeafColumns);
      const pModel = buildFilterModelPredicate(this._filterModel, this._allLeafColumns);
      if (pCol && pModel) {
        prepared = filterPreserveStructure(prepared, (row) => pCol(row) && pModel(row));
      } else if (pCol || pModel) {
        prepared = filterPreserveStructure(prepared, (pCol ?? pModel)!);
      }
    }

    // ② 排序（结构保持：递归排序兄弟）
    if (!this._serverSort) {
      const cmp = buildComparator(this._sortState, this._allLeafColumns);
      if (cmp) prepared = sortPreserveStructure(prepared, cmp);
    }

    // ③ 分页切片（客户端分页）
    //
    // 切的是**根行**，而不是展开后的扁平行：树形/分组必须在切完的这一页上再展开，
    // 否则会把父节点和它的子节点切到两页去。总条数由筛选后的根行数派生，
    // 所以筛完自动更新，不需要使用方 setTotal。
    if (hasClientPage) {
      this._syncDerivedTotal(prepared.length);
      const start = (this._page - 1) * this._pageSize;
      prepared = prepared.slice(start, start + this._pageSize);
    }

    // ④ 聚合（用筛选+排序+分页后的叶子，天然反映当前视图 —— 开了分页就是本页合计）
    this._recomputeSummary(collectLeaves(prepared));

    // ③ 结构展开（分组构造 / 树折叠 / expand 附加行）
    if (hasGroup || hasTree || hasExpand) {
      return this._flattenTree(prepared);
    }
    return prepared;
  }

  /**
   * 排序/筛选状态变化后的统一提交口：
   * - 该维度由服务端负责 → 清空已加载数据并重新取第一批；
   * - 否则走本地管线重算。
   */
  private _commitQueryChange(
    reason: 'sort' | 'filter',
    opts?: { resetPage?: boolean },
  ): void {
    // 筛选改变了行集合，按惯例回到第 1 页（排序不重置：行还是那些行）。
    // 用开关而非无条件重置，是因为 setState 还原页码时不能被顶掉。
    if (opts?.resetPage && this._clientPage) this._page = 1;
    const server = reason === 'sort' ? this._serverSort : this._serverFilter;
    if (server && this._remote && this._hasFetcher) {
      this._remote.reload(reason);
      return;
    }
    this._rebuildData();
  }

  /**
   * 统一重建入口：所有数据变换（换数据/排序/筛选/折叠展开/聚合）都汇入此处。
   * `keepPool`：无限滚动追加/前插时已渲染行的内容并未变化，保留行 DOM 池可避免整屏重建。
   */
  private _rebuildData(opts?: { keepPool?: boolean }): void {
    const flat = this._computeDisplayList();
    this._options.list = flat;
    // 分段必须在这里重算：它依赖的是**展开后的显示顺序**，筛选/排序/折叠都会改
    this._rebuildMergeRuns();
    if (!opts?.keepPool) this._clearItemPool();
    this._core.updateOptions({ list: flat });
    this._pluginRuntime?.emitDataChanged(flat);
  }

  /** 兼容旧调用：树/分组折叠展开走统一枢纽 */
  private _reflatten(): void {
    this._rebuildData();
  }

  /**
   * 重算表尾所依赖的视图数据。合计占用表尾。
   * - 扁平表尾 + showSummary：算出一维合计行写进 footerData（原行为）
   * - 分组表尾：只缓存当前视图叶子行，聚合在渲染时逐格算（分组格要跨列摊平，一维表达不了）；
   *   `renderFooter` 也可能依赖行数据，因此不开 showSummary 也要缓存
   */
  private _recomputeSummary(leaves: T[]): void {
    const groupedFooter = this._hasGroupedFooter();
    if (!this._options.showSummary && !groupedFooter) return;
    this._summaryLeaves = leaves;
    if (groupedFooter) {
      // 分组表尾自己按列树逐格算聚合，不经过 footerData
      this._options.footerData = undefined;
    } else {
      const renderOrder = [
        ...this._leftFixedCols,
        ...this._centerCols,
        ...this._rightFixedCols,
      ];
      const summaryRow = computeSummaryRow(leaves, renderOrder, this._options.summaryText ?? this._locale.summary);
      this._options.footerData = [summaryRow];
    }
    // 运行时（DOM 已就绪）需重建表尾；构造期由后续初始化统一构建
    if (this._domReady) {
      if (!this._tfootEl.parentElement) this._tableEl.appendChild(this._tfootEl);
      this._rebuildTfoot();
      this._rebuildPinnedRows();
    }
  }

  // --------------- sort ---------------

  /** 表头点击：三态循环 none→asc→desc→none；Shift 多列（需 sortMode:'multiple'） */
  private _toggleSort(colKey: string, additive: boolean): void {
    if (this._merges.length > 0) return; // 合并单元格与排序冲突
    const multiple = this._options.sortMode === 'multiple' && additive;
    const idx = this._sortState.findIndex((s) => s.colKey === colKey);
    const existing = idx >= 0 ? this._sortState[idx] : null;
    const next: SortOrder | null = !existing ? 'asc' : existing.order === 'asc' ? 'desc' : null;

    if (multiple) {
      if (next === null) {
        if (idx >= 0) this._sortState.splice(idx, 1);
      } else if (existing) {
        existing.order = next;
      } else {
        this._sortState.push({ colKey, order: next });
      }
    } else {
      this._sortState = next === null ? [] : [{ colKey, order: next }];
    }

    this._commitQueryChange('sort');
    this._rebuildThead();
    this._options.onSortChange?.(this.getSortState());
  }

  /** 以编程方式设置某列排序；order 为 null 表示取消该列 */
  sort(colKey: string, order: SortOrder | null): void {
    const idx = this._sortState.findIndex((s) => s.colKey === colKey);
    if (order === null) {
      if (idx >= 0) this._sortState.splice(idx, 1);
    } else if (this._options.sortMode === 'multiple') {
      if (idx >= 0) this._sortState[idx].order = order;
      else this._sortState.push({ colKey, order });
    } else {
      this._sortState = [{ colKey, order }];
    }
    this._commitQueryChange('sort');
    this._rebuildThead();
    this._options.onSortChange?.(this.getSortState());
  }

  clearSort(): void {
    if (this._sortState.length === 0) return;
    this._sortState = [];
    this._commitQueryChange('sort');
    this._rebuildThead();
    this._options.onSortChange?.(this.getSortState());
  }

  /**
   * 导出可持久化的视图状态（列宽 / 列序 / 列显隐 / 排序 / 筛选）。
   *
   * 典型用法：`localStorage.setItem(k, JSON.stringify(table.getState()))`，
   * 下次 `table.setState(JSON.parse(...))`。
   *
   * 三点说明：
   * - 列宽给的是**逻辑宽度**（`column.width`），不含容器拉伸系数 `_widthScale`——
   *   换个窗口宽度打开时按新容器重新拉伸，才是想要的效果。
   * - `columns` 含隐藏列，顺序即列序。
   * - 与 `getRemoteState()` 无关，那个是服务端取数状态机的运行时状态，不该持久化。
   */
  getState(): VirtTableState {
    const state: VirtTableState = {
      version: VIRT_TABLE_STATE_VERSION,
      columns: this.getLeafColumns().map((c) => ({
        key: String(c.key),
        width: c.width,
        hidden: !!c.hidden,
      })),
      sort: this.getSortState(),
      columnFilters: this.getActiveFilters(),
      // 无高级筛选时给 `null` 而不是省略字段：`setState` 区分「不给字段 = 保持现状」
      // 与「给空值 = 清空」，省略的话 `setState(getState())` 就不是恒等操作了
      // ——先存快照、之后加了筛选再还原，那条筛选会留在表上清不掉。
      filterModel: this.getFilterModel(),
    };
    if (this._options.pagination) {
      state.pagination = { page: this._page, pageSize: this._pageSize };
    }
    return state;
  }

  /**
   * 应用 `getState()` 导出的状态。**只应用出现的字段**，缺的保持现状。
   *
   * 全过程只做一次列重建 + 一次数据管线重算，不会因为逐列 `setColumnVisible` /
   * 逐列 `sort` 而触发 N 次重排。
   *
   * @returns 是否应用成功（版本不认识时返回 `false` 并告警）
   */
  setState(state: VirtTableState | null | undefined): boolean {
    if (!state) return false;
    if (state.version !== VIRT_TABLE_STATE_VERSION) {
      console.warn(
        `[virt-table] setState: 不认识的状态版本 ${state.version}（当前 ${VIRT_TABLE_STATE_VERSION}），已忽略。`,
      );
      return false;
    }

    // ---- 列：宽度 / 显隐 / 顺序，就地改列树，最后统一 setColumns ----
    if (state.columns && state.columns.length > 0) {
      const byKey = new Map(state.columns.map((c) => [c.key, c]));
      for (const col of flattenLeafColumns(this._allColumns, true)) {
        const saved = byKey.get(String(col.key));
        if (!saved) continue; // 状态里没有的列（数据/配置变了）保持现状
        if (typeof saved.width === 'number' && saved.width > 0) col.width = saved.width;
        if (typeof saved.hidden === 'boolean') col.hidden = saved.hidden;
      }
      this._applyColumnOrder(state.columns.map((c) => c.key));
      // 拖过列宽后 _widthScale 可能不是 1，这里直接重建，让它按新宽度重算
      this.setColumns([...this._allColumns]);
    }

    // ---- 排序 / 筛选：改内部状态，最后一次性提交 ----
    let queryChanged = false;
    if (state.sort) {
      const leafKeys = new Set(this.getLeafColumns().map((c) => String(c.key)));
      const next = state.sort.filter((sp) => leafKeys.has(sp.colKey));
      this._sortState =
        this._options.sortMode === 'multiple' ? next.map((sp) => ({ ...sp })) : next.slice(0, 1);
      queryChanged = true;
    }
    if (state.columnFilters) {
      this._activeFilters.clear();
      for (const col of this._columns) {
        const values = state.columnFilters[String(col.key)];
        // 同步列上的 filters[].checked，否则筛选面板打开时勾选态与实际不一致
        this._syncFilterChecked(col, values ?? []);
        if (values && values.length > 0) this._activeFilters.set(String(col.key), [...values]);
      }
      queryChanged = true;
    }
    if ('filterModel' in state) {
      this._filterModel = state.filterModel ? cloneFilterModel(state.filterModel) : null;
      queryChanged = true;
    }

    // ---- 分页：只在配了 pagination 时应用，避免凭空唤出一个不存在的分页器 ----
    let pagerChanged = false;
    if (state.pagination && this._options.pagination) {
      const { page, pageSize } = state.pagination;
      if (typeof pageSize === 'number' && pageSize > 0 && pageSize !== this._pageSize) {
        this._pageSize = pageSize;
        pagerChanged = true;
      }
      if (typeof page === 'number' && page > 0) {
        const next = clampPage(page, this._total, this._pageSize);
        if (next !== this._page) {
          this._page = next;
          pagerChanged = true;
        }
      }
      if (pagerChanged && this._paginationEl) this._renderPagination();
    }

    if (queryChanged) {
      // 这里刻意不带 resetPage：正在还原页码，不能被顶回第 1 页
      this._commitQueryChange('filter');
      this._rebuildThead();
      if (state.sort) this._options.onSortChange?.(this.getSortState());
      if (state.columnFilters) this._options.onFilterChange?.(this.getActiveFilters());
      if ('filterModel' in state) this._options.onFilterModelChange?.(this.getFilterModel());
    } else if (pagerChanged) {
      // 只改了分页 → 单独重算一次切片（queryChanged 那条路已经含重算）
      if (this._clientPage) this._rebuildData();
    }
    if (pagerChanged) this._options.onPageChange?.(this._page, this._pageSize);
    return true;
  }

  /**
   * 按给定的叶子列 key 顺序重排列树。
   *
   * 只在**同一层兄弟之间**重排（与 `moveColumn` 同约束）：分组表头下把叶子列跨组搬家
   * 没有意义，所以分组节点按其后代里最小的目标位次参与排序，组内再各自排。
   * 状态里没出现的列保持原有相对位置并排在后面。
   */
  private _applyColumnOrder(order: string[]): void {
    const rank = new Map(order.map((k, i) => [k, i]));
    const effRank = (col: VirtTableColumn<T>): number => {
      const kids = col.children;
      if (!kids || kids.length === 0) return rank.get(String(col.key)) ?? Infinity;
      let min = Infinity;
      for (const kid of kids) min = Math.min(min, effRank(kid));
      return min;
    };
    const sortSiblings = (list: VirtTableColumn<T>[]): void => {
      const decorated = list.map((c, i) => ({ c, i, r: effRank(c) }));
      // 稳定排序：位次相同（含都是 Infinity）时保持原顺序
      decorated.sort((a, b) => (a.r !== b.r ? a.r - b.r : a.i - b.i));
      list.splice(0, list.length, ...decorated.map((d) => d.c));
      for (const c of list) if (c.children?.length) sortSiblings(c.children);
    };
    sortSiblings(this._allColumns);
  }

  getSortState(): SortSpec[] {
    return this._sortState.map((s) => ({ ...s }));
  }

  private _getExpandCol(): VirtTableColumn<T> | undefined {
    return this._columns.find((c) => c.type === 'expand');
  }

  // --------------- DOM build ---------------

  private _buildDOM(): void {
    this._root.innerHTML = '';

    this._rootEl = document.createElement('div');
    this._rootEl.className = 'vt-root';
    if (this._options.border) this._rootEl.classList.add('vt-root--border');
    if (this._options.theme === 'dark') this._rootEl.classList.add('vt-root--dark');
    this._rootEl.setAttribute('role', 'grid');
    this._root.appendChild(this._rootEl);

    this._clientEl = document.createElement('div');
    let clientCls = 'vt-client';
    if (this._options.highlightHoverRow) clientCls += ' vt-client--highlight-hover-row';
    if (this._options.highlightSelectRow) clientCls += ' vt-client--highlight-select-row';
    if (this._options.highlightSelectCol) clientCls += ' vt-client--highlight-select-col';
    /*
     * ⚠️ 这里**刻意没有** `vt-client--highlight-select-cell`。
     *
     * 上面三个修饰类都是 CSS 的开关（`.vt-client--highlight-select-row .current-row > .vt-td`
     * 之类），而单元格高亮走的是**覆盖层**（`.vt-active-cell-overlay`，见下面创建处 +
     * index.css），根本不需要祖先类做门控。曾经有过这么一行、但 CSS 里没有任何规则消费它 ——
     * 死类名比缺类名更坏：读代码的人会以为存在一条 CSS 开关。
     * 由 `class-contract.test.ts` 守着（JS 写出的每个 class 都必须有对应选择器或进白名单）。
     */
    this._clientEl.className = clientCls;
    this._clientEl.dataset.id = 'client';
    /**
     * 键盘输入要落在这一层上（`InputController` 挂在这里），没有 tabIndex 收不到 keydown。
     * 焦点环由 CSS 的 `:focus-visible` 控制：鼠标点击不出现，Tab 进来才出现。
     */
    this._clientEl.tabIndex = 0;

    /**
     * ⚠️ 这里**不再有**撑开滚动高度的占位块（原来的 `.vt-skeleton`，高度 = itemsTotalSize）。
     *
     * 纵向滚动位置已归 JS 掌管（`.vt-client` 的 overflow-y 是 hidden），内容靠
     * `.vt-table` 的残差 `top` 移动，所以没有任何元素的**几何尺寸**随行数增长 ——
     * 最高的元素只有一屏。两个老坑随之消失：
     *
     * 1. 浏览器对元素高度有上限（Chrome 实测 33,554,428px），超限部分被直接截掉、
     *    那些行永远滚不到；
     * 2. AGENTS.md §7.11 那条「fixed 行高比模型矮 0.69px/行 → 十万行后 scrollTop
     *    超出模型总高 → 渲染窗口永久冻结、下方几百万 px 空白」。新 core 的
     *    `_writeOffset` 以账本 `getTotalSize() - clientSize` 为唯一权威并 clamp，
     *    不存在「浏览器的 scrollHeight 与账本对不上」这回事。
     */

    this._tableEl = document.createElement('table');
    this._tableEl.className = 'vt-table';

    this._colgroupEl = document.createElement(
      'colgroup',
    ) as HTMLTableColElement;
    this._tableEl.appendChild(this._colgroupEl);
    // 注意：列宽在三份 colgroup 都建好之后才统一填（见本方法末尾的 _rebuildColgroup），
    // 在这里调用的话表头/表尾那两份还不存在，会被静默跳过、列宽全错

    this._theadEl = document.createElement('thead');
    this._theadEl.className = 'vt-thead';
    if (this._options.showHeader !== false) {
      const { wrap, table, colgroup } = this._buildSectionTable('vt-header');
      table.appendChild(this._theadEl);
      this._headerWrapEl = wrap;
      this._headerTableEl = table;
      this._headerColgroupEl = colgroup;
      this._pendingHeaderWrap = wrap;
      /**
       * 表头在账本里登记为 `stickyHeader` 槽 —— 语义严格对上：它挂在 `.vt-root` 上、
       * **完全不参与内容流**（所以不是 `header` 槽），但它**占住滚动空间**
       * （`getSlotSize()` 计入它，`getMaxOffset()` 因此自动为它留出顶部那一段）。
       *
       * 于是文档流里不再需要等高占位块（原来的 `.vt-header-spacer`）：内容的起始位置
       * 是**算**出来的（见 `_applyBodyOffset`，表体从 `stickyHeaderSize` 处排起）。
       *
       * ⚠️ `dataset.id` 必须写在 **wrap** 上而不是 `<thead>` 上：core 的 ResizeObserver
       * 完全按 `dataset.id` 分派槽位，而被 observe 的正是 wrap。以前 id 挂在 `<thead>`
       * 上、observe 的却是 wrap，两者错位 —— 回调里 id 为 undefined 直接 `continue`，
       * 表头高度在账本里一直是 0。原生滚动时期靠占位块兜住了，新模型下会让末行被表尾盖住。
       */
      wrap.dataset.id = 'stickyHeader';
    }

    this._tbodyEl = document.createElement('tbody');
    this._tbodyEl.className = 'vt-tbody';

    this._paddingTr = document.createElement('tr');
    this._paddingTr.className = 'vt-padding';
    this._tbodyEl.appendChild(this._paddingTr);

    this._tableEl.appendChild(this._tbodyEl);

    this._tfootEl = document.createElement('tfoot');
    this._tfootEl.className = 'vt-tfoot';
    /**
     * 表尾容器**无条件创建**，即使此刻没有表尾内容。
     *
     * 因为有 4 处代码做「惰性插入」：`tfoot` 没父级时把它 append 到 body table
     * （服务端聚合 / `setFooterData` / `showSummary` 运行时 / `_rebuildPinnedRows`）。
     * 只要这里先把 `tfoot` 放进 `.vt-footer`，它就永远有父级，那 4 处判断都不会触发
     * —— 否则 tfoot 会落回 body table，而 sticky 已经移到容器上，它就掉到表格末尾看不见了
     * （`pinnedBottom` 置底固定行踩过：实测位置在容器下方 400px 外）。
     *
     * 空 `tfoot` 时容器高度为 0，不占位、无视觉影响。
     */
    {
      const { wrap, table, colgroup } = this._buildSectionTable('vt-footer');
      table.appendChild(this._tfootEl);
      this._footerWrapEl = wrap;
      this._footerTableEl = table;
      this._footerColgroupEl = colgroup;
      this._pendingFooterWrap = wrap;
      // 表尾对称地登记为 `stickyFooter` 槽：不参与内容流，但占滚动空间，
      // 末行因此不会被它盖住。同样取代了原来的 `.vt-footer-spacer` 占位块。
      wrap.dataset.id = 'stickyFooter';
    }

    this._clientEl.appendChild(this._tableEl);

    // 三份 colgroup 都就位了，统一填列宽与表格总宽
    this._rebuildColgroup();

    // 没开这个选项时浮层不预建，但也不是「永远没有」：`setActiveCell()` 会按需补上
    // （`vtCellEditor` 的激活态走这条路），见 `_ensureActiveCellOverlay`
    if (this._options.highlightSelectCell) this._ensureActiveCellOverlay();

    this._rootEl.appendChild(this._clientEl);

    /**
     * 表头与表尾都挂在 **`.vt-root`（滚动容器外）**，用 `position: absolute`。
     *
     * 为什么不用 sticky：sticky 的粘性余量由主线程每帧算出的布局决定。主线程跟不上时
     * 余量是旧值，元素就被摆到半路 —— 表尾方向尤其明显，因为它的余量直接来自 body table
     * 的高度（那正是虚拟滚动每帧在改的东西）。染色抓帧实测（阻塞主线程 30ms/帧 + 快速滚动，
     * 212 帧）：sticky 下表尾只有 **4%** 的帧贴底，**61% 跑到中间、8% 跑到顶部**；
     * 改 absolute 后 **99%** 贴底。
     *
     * absolute 挂在 `.vt-root` 上就完全不参与滚动，纵向永不出错。代价是横向要 JS 同步
     * （`_syncSectionX` 改内层 table 的 `left`），主线程卡顿时会滞后一帧 —— 这个取舍
     * 是明确的：横向慢半拍远比纵向乱跳可接受。
     *
     * 文档流里不需要占位块：表头表尾在账本里登记为 `stickyHeader` / `stickyFooter` 槽，
     * 上下两段的滚动空间由 `getSlotSize()` / `getMaxOffset()` 表达（见 `_applyBodyOffset`）。
     */
    if (this._pendingHeaderWrap) {
      this._rootEl.appendChild(this._pendingHeaderWrap);
      this._pendingHeaderWrap = undefined;
    }
    if (this._pendingFooterWrap) {
      this._rootEl.appendChild(this._pendingFooterWrap);
      this._pendingFooterWrap = undefined;
    }
    if (this._headerWrapEl || this._footerWrapEl) {
      this._clientEl.addEventListener('scroll', this._boundSyncSectionX, {
        passive: true,
      });
    }

    this._leftShadowEl = document.createElement('div');
    this._leftShadowEl.className = 'vt-fixed-shadow';
    this._leftShadowEl.style.left = `${this._leftFixedWidth - 1}px`;
    this._rootEl.appendChild(this._leftShadowEl);

    this._rightShadowEl = document.createElement('div');
    this._rightShadowEl.className = 'vt-fixed-shadow';
    this._rootEl.appendChild(this._rightShadowEl);
    this._updateShadowPosition();

    this._emptyEl = document.createElement('div');
    this._emptyEl.className = 'vt-empty';
    this._emptyEl.textContent = this._options.emptyText ?? this._locale.empty;
    this._emptyEl.style.display = 'none';
    this._rootEl.appendChild(this._emptyEl);

    // 加载态遮罩（覆盖整个组件，含固定表头）
    this._loadingEl = document.createElement('div');
    this._loadingEl.className = 'vt-loading-mask';
    this._loadingEl.innerHTML =
      '<div class="vt-loading-inner"><span class="vt-spinner"></span>' +
      `<span class="vt-loading-text">${this._options.loadingText ?? this._locale.loading}</span></div>`;
    this._loadingEl.style.display = this._options.loading ? '' : 'none';
    if (this._options.loading) this._rootEl.setAttribute('aria-busy', 'true');
    this._rootEl.appendChild(this._loadingEl);

    // 分页条：仅当启用 pagination option 时创建（作为 _rootEl 最后一个 flow 子节点）
    if (this._options.pagination) this._buildPagination();

    if (this._options.highlightSelectRow || this._options.highlightSelectCol || this._options.highlightSelectCell) {
      const handler = this._onBodyClick.bind(this);
      this._boundOnBodyClick = handler;
      this._tbodyEl.addEventListener('mousedown', handler as EventListener);
    }


    this._setupPlugins();
  }

  // --------------- 插件运行时 ---------------

  /**
   * 装载插件。在核心 DOM 就绪后、首帧渲染前执行，因此插件 setup 里可以安全地
   * 追加浮层、绑定 tbody 事件，但拿不到行 DOM（需要行的请用 onRowCreated 钩子）。
   */
  private _setupPlugins(): void {
    const plugins = this._options.plugins ?? [];
    if (plugins.length === 0) return;

    this._pluginRuntime = new PluginRuntime<T>(
      this,
      {
        rootEl: this._rootEl,
        clientEl: this._clientEl,
        tableEl: this._tableEl,
        theadEl: this._theadEl,
        tbodyEl: this._tbodyEl,
        tfootEl: this._tfootEl,
      },
      {
        getOptions: () => this._options,
        getColumns: () => this._columns,
        getList: () => this._options.list ?? [],
        getRowData: (rowKey) => this._rowDataMap.get(rowKey),
        resolveCellRender: (rowKey, colKey) => this.resolveCellRender(rowKey, colKey),
        getLocale: () => this._locale,
      },
    );

    // 核心方法优先：插件 API 不得覆盖已有成员
    const reserved = new Set<string>();
    let proto: object | null = Object.getPrototypeOf(this);
    while (proto && proto !== Object.prototype) {
      for (const key of Object.getOwnPropertyNames(proto)) reserved.add(key);
      proto = Object.getPrototypeOf(proto);
    }

    this._pluginApi = this._pluginRuntime.setup(plugins, reserved);
    Object.assign(this, this._pluginApi);
  }

  /** 插件注入的命令式 API（供三端 ref 自动透传，无需逐个手写转发） */
  getPluginApi(): Record<string, (...args: any[]) => any> {
    return this._pluginApi;
  }

  private _pendingFooterWrap?: HTMLElement;

  /**
   * 造一个「sticky 容器 + 独立 table + 自己的 colgroup」三件套，给表头 / 表尾用。
   *
   * `width: max-content` 是关键：div 默认宽度等于容器宽度，那横向滚动时它压根不会动
   * （宽度就是视口宽度，没有可滚动的部分）。设成内容宽度后它随内容一起平移。
   */
  private _buildSectionTable(cls: string): {
    wrap: HTMLElement;
    table: HTMLTableElement;
    colgroup: HTMLTableColElement;
  } {
    const wrap = document.createElement('div');
    wrap.className = cls;
    const table = document.createElement('table');
    table.className = 'vt-table';
    const colgroup = document.createElement('colgroup') as HTMLTableColElement;
    table.appendChild(colgroup);
    wrap.appendChild(table);
    return { wrap, table, colgroup };
  }

  /**
   * 重建列宽。表头 / 表尾各有独立 table，所以 colgroup 要同步**三份**。
   *
   * 这是方案③ 唯一新增的 JS 维护成本，但它只在**列变化**时跑（列宽拖拽、容器缩放、
   * 列显隐），不在滚动路径上 —— 与「每帧同步横向位移」完全是两回事。
   */
  private _rebuildColgroup(): void {
    const widths: number[] = [];
    for (const col of [
      ...this._leftFixedCols,
      ...this._centerCols,
      ...this._rightFixedCols,
    ]) {
      widths.push(this._colWidth(col));
    }
    const totalWidth = widths.reduce((a, b) => a + b, 0);

    const fill = (target: HTMLTableColElement | undefined): void => {
      if (!target) return;
      target.innerHTML = '';
      for (const w of widths) {
        const colEl = document.createElement('col');
        colEl.style.width = `${w}px`;
        colEl.style.minWidth = `${w}px`;
        target.appendChild(colEl);
      }
      // 末列 0 宽：承载行高撑格（见 .vt-cell-h）
      const heightCol = document.createElement('col');
      heightCol.style.width = '0px';
      heightCol.style.minWidth = '0px';
      target.appendChild(heightCol);
    };
    fill(this._colgroupEl);
    fill(this._headerColgroupEl);
    fill(this._footerColgroupEl);

    const w = `${totalWidth}px`;
    this._tableEl.style.width = w;
    if (this._headerTableEl) this._headerTableEl.style.width = w;
    if (this._footerTableEl) this._footerTableEl.style.width = w;
    // 表头/表尾在滚动容器外，横向靠 transform 跟随；列宽变了要重新对齐一次
    this._syncSectionX();
  }

  private _getHeaderRowCount(): number {
    // 多级分组表头：行数即列树深度，headerData/headerMerges 不参与
    if (this._hasColumnGroups) return this._headerDepth;
    return calcMergeRowCount(
      this._options.headerData,
      this._options.headerMerges,
      1,
    );
  }

  private _getFooterRowCount(): number {
    // 多级分组表尾：与表头同序、行数一致（列树深度），footerData/footerMerges 不参与
    if (this._hasGroupedFooter()) return this._headerDepth;
    return calcMergeRowCount(
      this._options.footerData,
      this._options.footerMerges,
      0,
    );
  }

  /**
   * 清空表头的表头行，但保留置顶固定行（`.vt-tr--pinned-top` 也挂在 thead 里，
   * 不能被表头重建顺手删掉）。
   */
  private _clearHeaderRows(): void {
    for (const tr of Array.from(this._theadEl.children)) {
      if (!tr.classList.contains('vt-tr--pinned')) tr.remove();
    }
  }

  /** 追加一行表头：应用 headerClass/headerStyle，并始终排在置顶固定行之前 */
  private _appendHeaderRow(tr: HTMLTableRowElement): void {
    const { headerClass, headerStyle } = this._options;
    if (headerClass) tr.className += ` ${headerClass}`;
    if (headerStyle) tr.style.cssText += `;${headerStyle}`;
    const firstPinned = this._theadEl.querySelector('.vt-tr--pinned-top');
    if (firstPinned) this._theadEl.insertBefore(tr, firstPinned);
    else this._theadEl.appendChild(tr);
  }

  /**
   * 把冻结区宽度与「可见中间区」宽度暴露成 CSS 变量，供分组格的 sticky 标签定位。
   * 只随容器尺寸/列宽变化更新，**不随滚动更新**——滚动中的跟随由 CSS sticky 在
   * 合成器里逐帧完成，主线程零开销。
   */
  /**
   * 写入 sticky 内层定位所需的几何变量。只在容器 / 列宽 / 表头表尾变化时写，**不随滚动**。
   *
   * 横向（分组标签）：`--vt-fixed-left-w` / `--vt-center-view-w`
   * 纵向（自动合并标签）：`--vt-body-view-t`（可见数据区上缘 = sticky 表头高度）
   *                       `--vt-body-view-h`（可见数据区高度，扣掉表头与 sticky 表尾）
   */
  /**
   * 表头 / 表尾的横向跟随。两者都挂在滚动容器**外**（`.vt-root`），拿不到合成器对
   * 容器内元素的免费平移，只能自己跟。
   *
   * 用改 `left` 而不是 `scrollLeft`：这里是单向同步（body → section），不存在 AG Grid
   * 那种双向回环问题（它要维护 `lastScrollSource` 防回环）。
   *
   * ⚠️ 也**不能用 transform**：它会给后代建立包含块，固定列表头的 `position: sticky; left`
   * 会失去参照、跟着整体被推走（实测横滚 500px 后固定列表头偏差 −500px，与表体错开）。
   */
  private _syncSectionX = (): void => {
    const x = this._clientEl?.scrollLeft ?? 0;
    // 用 left 而不是 transform：transform 会给后代建立包含块，让固定列表头的
    // `position: sticky; left` 失去参照而跟着一起被推走（实测横滚 500px 后固定列
    // 表头偏差 -500px，与表体错开）。left 不建包含块，容器内的 sticky 照常工作。
    const v = `${-x}px`;
    // 偏移内层 table，不动外层 —— 外层被钉在可视区内（right 让出了滚动条宽度）
    if (this._headerTableEl) this._headerTableEl.style.left = v;
    if (this._footerTableEl) this._footerTableEl.style.left = v;
  };

  private _boundSyncSectionX = (): void => this._syncSectionX();

  /**
   * 把滚动条尺寸写成 CSS 变量，供表头 / 表尾让出对应边界。
   *
   * 它们挂在 `.vt-root` 上、铺满整个宽度，不让出的话会盖住滚动条 —— 不只是视觉遮挡，
   * `pointer-events` 也被吃掉，表头/表尾高度那两段里滚动条**拖不动**。
   *
   * 两条滚动条都是 **overlay 浮层**：不占布局空间，谁都不用为它们让位。
   * 这两个变量因此恒为 0，只为兼容可能引用了它们的使用方样式而保留。
   */
  /**
   * 滚动条让位量 —— **恒为 0**，因为两条轨道都是不占布局空间的 overlay 浮层。
   *
   * 保留这两个变量是为了兼容：使用方的自定义样式里可能写着
   * `right: var(--vt-scrollbar-w)`，删掉会让它解析成无效值。
   *
   * ⚠️ 别再把它们改回「轨道粗细」。曾经那样做过，结果是一个自相矛盾的组合：
   * 表头表尾被永久抬高 / 收窄 10px 留出一条空带，而那条带的遮挡物（轨道）
   * **会自动淡出** —— 横条一淡出，底部空带就露出下方仍在滚动的行内容。
   * 拖竖条时横条淡出，穿透就发生在那一刻。要么两边都让位且常驻，要么都不让位；
   * 这里选了后者（overlay），详见 AGENTS §7.13。
   */
  private _syncScrollbarVars(): void {
    if (!this._rootEl) return;
    this._rootEl.style.setProperty('--vt-scrollbar-w', '0px');
    this._rootEl.style.setProperty('--vt-scrollbar-h', '0px');
  }

  private _syncGeometryVars(): void {
    if (!this._rootEl) return;

    // 轨道是浮层、不占布局空间，`clientWidth` / `clientHeight` 直接就是可见区尺寸，
    // 不需要再扣任何东西
    const clientWidth = this._clientEl?.clientWidth ?? 0;
    const centerView = Math.max(0, clientWidth - this._leftFixedWidth - this._rightFixedWidth);
    this._rootEl.style.setProperty('--vt-fixed-left-w', `${this._leftFixedWidth}px`);
    this._rootEl.style.setProperty('--vt-center-view-w', `${centerView}px`);

    const clientHeight = this._clientEl?.clientHeight ?? 0;
    /**
     * 量 **wrap** 而不是 `<thead>` / `<tfoot>`：占住上下两段的是 `.vt-header` /
     * `.vt-footer` 这两个 wrap，它们也正是 core 登记为 `stickyHeader` / `stickyFooter`
     * 槽、被 ResizeObserver 观察的元素。两处用同一个测量对象，账本与 CSS 变量才不会错开
     * （`_applyBodyOffset` 用的是账本里的 `stickyHeaderSize`）。
     */
    const headH =
      this._options.showHeader === false
        ? 0
        : (this._headerWrapEl?.offsetHeight ?? this._theadEl?.offsetHeight ?? 0);
    const footH = this._footerWrapEl?.offsetHeight ?? this._tfootEl?.offsetHeight ?? 0;
    const bodyView = Math.max(0, clientHeight - headH - footH);
    this._rootEl.style.setProperty('--vt-body-view-t', `${headH}px`);
    this._rootEl.style.setProperty('--vt-body-view-h', `${bodyView}px`);

    /**
     * 同一次测量顺手报给 core 的账本（`stickyHeader` / `stickyFooter` 两个槽）。
     *
     * 表头 / 表尾的尺寸平时由 core 的 ResizeObserver 维护（`observeSlotEl`），但 RO 是
     * **异步**的，而首帧 `_patch()`（→ `_applyBodyOffset()`，表体从 `stickyHeaderSize`
     * 处排起）与 `bindDOM()` 的首屏定位都在第一次 RO 回调之前跑完 —— 那时账本里是 0，
     * 表体就从 0 排起，**第一行整行躲在表头背后**（表头 42px / 行高 40px）。
     * 用户报的现象是「点开单元格编辑器再失焦（`forceUpdate()`），凭空多出一行 id=0」，
     * 其实那一行一直都在，只是首屏被压住了；排序 / 滚动 / 容器 resize 同样能「治好」它。
     *
     * `setSlotSize()` 是 core 为此开的同步通道：值变了它会自己 `_notify()` →
     * 走到 `_patch()` → `_applyBodyOffset()`，所以这里不需要再手动重摆一次。
     * 重复报同一个值是空操作，可以放心每次重建表头/表尾之后无脑调。
     *
     * 账本与 `--vt-body-view-*` 由此出自同一次测量，两边不会再错开。
     */
    this._core.setSlotSize('stickyHeader', headH);
    this._core.setSlotSize('stickyFooter', footH);
  }

  /**
   * 把表体摆到当前偏移量对应的位置。对齐 `VirtList._applyLayout()`。
   *
   * 写入的是**残差**：`表体的文档位置 - offset`。表体的文档位置 =
   * `stickyHeaderSize`（表头占的滚动空间）+ `leadingSize`（渲染窗口之前所有行的累计高度）。
   * 残差量级不超过一屏多一点，所以永远碰不到浏览器对位移量的上限。
   *
   * ⚠️ 用 `position: relative` + `top`，**不能用 transform** —— 这是与 virt-list
   * 唯一的实现分歧，且是必须的：`.vt-table` 是 `td.vt-fixed-left/right` 的祖先，
   * transform 会给后代建立包含块，让固定列的 `position: sticky; left` 失去参照、
   * 跟着内容一起被推走（实测横滚 500px 后偏差 −500px，见 index.css 里表头横向同步
   * 那段注释）。`left`/`top` 不建包含块，容器内的 sticky 照常工作 —— 表头的横向同步
   * (`_syncSectionX`) 正是同一手法，纵向沿用它。
   *
   * 代价是每帧一次表体布局失效（transform 本可以只走合成）。但表体只有一屏 DOM
   * （约 30 行），且虚拟滚动本来每帧都在重建行、布局早就要算，实际增量很小。
   */
  private _applyBodyOffset(): void {
    if (!this._tableEl) return;
    const { leadingSize } = this._core.state;
    const { stickyHeaderSize } = this._core.slotSize;
    this._tableEl.style.top = `${stickyHeaderSize + leadingSize - this._core.getOffset()}px`;
  }

  /**
   * 返回分组格的内容容器。
   *
   * 中间段的分组格会被列窗口裁剪，而裁剪是按**整列**取整的、滚动却是逐像素的，
   * 直接在格子里居中会让标签一边随内容匀速漂移、一边在跨列时跳半个列宽。
   * 因此中间段套一层 sticky 内层（宽度 = min(本格宽, 可见中间区宽)）：分组比可见区宽时
   * 内层被钉在可见区并居中，标签稳定不动；分组较窄时内层退化为本格宽，仍是格内居中。
   *
   * 左右冻结段的分组格本身就 sticky 冻结在视口内、也从不被裁剪，套 sticky 内层反而会
   * 被 `left` 偏移推出格子，因此直接用格子本身承载内容。
   */
  private _groupCellSlot(cell: HTMLTableCellElement, sticky: boolean): HTMLElement {
    if (!sticky) return cell;
    cell.classList.add('vt-group--sticky');
    const label = document.createElement('span');
    label.className = 'vt-group-label';
    cell.appendChild(label);
    return label;
  }

  /**
   * 冻结列单元格的 sticky 偏移。分组表头的一格可能横跨多个冻结叶子列：
   * 左固定取首个叶子的左偏移，右固定取末个叶子的右偏移（右偏移自右向左累加）。
   */
  private _applyFixedCellStyle(
    cell: HTMLElement,
    fixed: 'left' | 'right' | undefined,
    startIdx: number,
    span = 1,
  ): void {
    if (fixed === 'left') {
      if (startIdx >= 0 && startIdx < this._leftFixedOffsets.length) {
        cell.classList.add('vt-fixed-left');
        cell.style.left = `${this._leftFixedOffsets[startIdx]}px`;
      }
    } else if (fixed === 'right') {
      const endIdx = startIdx + span - 1;
      if (endIdx >= 0 && endIdx < this._rightFixedOffsets.length) {
        cell.classList.add('vt-fixed-right');
        cell.style.right = `${this._rightFixedOffsets[endIdx]}px`;
      }
    }
  }

  private _rebuildThead(): void {
    if (this._options.showHeader === false) return;
    this._clearHeaderRows();
    this._headerCheckbox = null;
    if (this._hasColumnGroups) this._buildTheadGrouped();
    else this._buildTheadFlat();
  }

  /**
   * 多级分组表头。表头被视为 `depth × 叶子列数` 的网格（见 header-group.ts），
   * 左/右冻结段整段渲染，中间段按当前列窗口 `[_renderColBegin, _renderColEnd]`
   * 做横向虚拟化：窗口外折叠成贯通整个表头高度的留白格，跨越窗口边界的分组格裁剪到窗口内。
   */
  private _buildTheadGrouped(): void {
    const depth = this._headerDepth;
    const centerCount = this._centerCols.length;

    for (let row = 0; row < depth; row++) {
      const tr = document.createElement('tr');
      tr.setAttribute('role', 'row');

      // 左固定段：整段渲染，不参与虚拟化
      for (const cell of this._headerMatrixLeft[row] ?? []) {
        tr.appendChild(this._createGroupedHeaderCell(cell, cell.span, 'left'));
      }

      // 中间段：按列窗口裁剪
      for (const item of planHeaderRow(
        this._headerMatrixCenter,
        row,
        this._renderColBegin,
        this._renderColEnd,
        centerCount,
        depth,
      )) {
        if (item.type === 'pad') {
          const pad = document.createElement('th');
          pad.className = 'vt-cell-pad';
          pad.colSpan = item.colSpan;
          if (item.rowSpan > 1) pad.rowSpan = item.rowSpan;
          tr.appendChild(pad);
        } else {
          tr.appendChild(this._createGroupedHeaderCell(item.cell, item.colSpan, undefined));
        }
      }

      // 右固定段：整段渲染
      for (const cell of this._headerMatrixRight[row] ?? []) {
        tr.appendChild(this._createGroupedHeaderCell(cell, cell.span, 'right'));
      }

      if (row === 0) {
        const heightTh = document.createElement('th');
        heightTh.className = 'vt-cell-h';
        if (depth > 1) heightTh.rowSpan = depth;
        tr.appendChild(heightTh);
      }

      this._appendHeaderRow(tr);
    }
  }

  /** 生成一个分组表头单元格（`colSpan` 可能已被列窗口裁剪，故单独传入） */
  private _createGroupedHeaderCell(
    cell: HeaderMatrixCell<VirtTableColumn<T>>,
    colSpan: number,
    fixed: 'left' | 'right' | undefined,
  ): HTMLTableCellElement {
    const col = cell.col;
    const th = document.createElement('th');
    th.className = 'vt-th';
    th.setAttribute('role', 'columnheader');
    if (colSpan > 1) th.colSpan = colSpan;
    if (cell.rowSpan > 1) th.rowSpan = cell.rowSpan;

    this._applyFixedCellStyle(th, fixed, cell.start, cell.span);

    if (cell.isLeaf) {
      th.dataset.colKey = col.key;
      const hAlign =
        col.headerAlign ?? col.align ?? this._options.headerAlign ?? this._options.align;
      if (hAlign) th.style.textAlign = hAlign;
      const hVAlign =
        col.headerVAlign ?? col.vAlign ?? this._options.headerVAlign ?? this._options.vAlign;
      if (hVAlign) th.style.verticalAlign = hVAlign;
      this._applyHeaderContent(th, col, cell.row);
      // 叶子列必然贯通到最后一行，列宽拖拽手柄挂在它上面
      this._applyHeaderResizeTrigger(th, col);
    } else {
      th.classList.add('vt-th--group');
      th.dataset.groupKey = col.key;
      const hVAlign = col.headerVAlign ?? col.vAlign ?? this._options.headerVAlign;
      if (hVAlign) th.style.verticalAlign = hVAlign;
      // 中间段的分组标题走 sticky 内层，跟随横向滚动时不跳（见 _groupCellSlot）
      const slot = this._groupCellSlot(th, fixed === undefined);
      // 分组标题默认居中（跨多列时居中更易读），显式配置优先
      slot.style.textAlign = col.headerAlign ?? col.align ?? 'center';
      if (col.renderHeader) {
        const content = col.renderHeader({ column: col, isGroup: true, headerRow: cell.row });
        if (typeof content === 'string') {
          slot.textContent = content;
          if (content) th.title = content;
        } else {
          slot.appendChild(content);
        }
      } else {
        slot.textContent = col.title;
        if (col.title) th.title = col.title;
      }
    }

    return th;
  }

  /** 列宽拖拽手柄（仅叶子列） */
  private _applyHeaderResizeTrigger(th: HTMLTableCellElement, col: VirtTableColumn<T>): void {
    if (!col.resizable) return;
    // 手柄是 absolute，需要 th 是定位元素；但冻结列表头本身就是 sticky（已是定位元素），
    // 若再写成 relative 会把冻结定位覆盖掉，表头与表体错位。
    if (!th.classList.contains('vt-fixed-left') && !th.classList.contains('vt-fixed-right')) {
      th.style.position = 'relative';
    }
    const trigger = document.createElement('div');
    trigger.className = 'vt-resize-trigger';
    trigger.addEventListener('pointerdown', (e) => {
      if (!isPrimaryPointer(e)) return;
      e.preventDefault();
      this._startResize(e, col, th);
    });
    th.appendChild(trigger);
  }

  /** 叶子列表头内容：功能列控件 / 自定义渲染 / 标题 + 筛选、排序、列拖拽 */
  /** 填充表头单元格，并在完成后派发 onHeaderCellRendered（早返回同样收口，理由见 _applyCellContent） */
  private _applyHeaderContent(
    th: HTMLTableCellElement,
    col: VirtTableColumn<T>,
    headerRow = 0,
  ): void {
    this._applyHeaderContentInner(th, col, headerRow);
    if (this._pluginRuntime?.hasHeaderCellHooks) {
      this._pluginRuntime.emitHeaderCellRendered(th, col, headerRow);
    }
  }

  private _applyHeaderContentInner(
    th: HTMLTableCellElement,
    col: VirtTableColumn<T>,
    headerRow = 0,
  ): void {
    // 与表体功能列保持一致的表头对齐/内边距
    if (col.type && col.type !== 'tree') {
      th.classList.add(`vt-th--${col.type}`);
    }
    if (col.type === 'checkbox') {
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'vt-checkbox';
      this._headerCheckbox = cb;
      this._updateHeaderCheckbox();
      cb.addEventListener('change', () => {
        if (cb.checked) {
          const list = this._options.list;
          for (const item of list) {
            this._checkedRows.add(String(item[this._options.itemKey]));
          }
        } else {
          this._checkedRows.clear();
        }
        this._refreshCheckboxes();
        this._options.onCheckAll?.(cb.checked);
      });
      th.appendChild(cb);
      return;
    }
    if (col.renderHeader) {
      const content = col.renderHeader({ column: col, isGroup: false, headerRow });
      if (typeof content === 'string') th.textContent = content;
      else th.appendChild(content);
    } else {
      th.textContent = col.title;
    }

    // 排序（有合并单元格时禁用，因合并按绝对行号）
    if (col.sortable && this._merges.length === 0) {
      th.classList.add('vt-th--sortable');
      const st = this._sortState.find((s) => s.colKey === col.key);
      th.setAttribute('aria-sort', st ? (st.order === 'asc' ? 'ascending' : 'descending') : 'none');
      const sortIcon = document.createElement('span');
      sortIcon.className = 'vt-sort-icon';
      // 排序只由图标触发，图标本身可聚焦
      sortIcon.dataset.sortKey = col.key;
      sortIcon.setAttribute('tabindex', '0');
      sortIcon.setAttribute('role', 'button');
      sortIcon.setAttribute('title', this._locale.sortTip(col.title ?? ''));
      const dir = st?.order;
      if (dir) sortIcon.classList.add(dir === 'asc' ? 'vt-sort-icon--asc' : 'vt-sort-icon--desc');
      const svgAttr =
        'viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
      const arrowUp = `<svg ${svgAttr}><path d="M12 19V5"/><path d="M6 11l6-6 6 6"/></svg>`;
      const arrowDown = `<svg ${svgAttr}><path d="M12 5v14"/><path d="M6 13l6 6 6-6"/></svg>`;
      const arrowBoth = `<svg ${svgAttr}><path d="M8 9l4-4 4 4"/><path d="M8 15l4 4 4-4"/></svg>`;
      sortIcon.innerHTML = dir === 'asc' ? arrowUp : dir === 'desc' ? arrowDown : arrowBoth;
      if (this._options.sortMode === 'multiple' && this._sortState.length > 1 && st) {
        const badge = document.createElement('span');
        badge.className = 'vt-sort-order';
        badge.textContent = String(this._sortState.findIndex((s) => s.colKey === col.key) + 1);
        sortIcon.appendChild(badge);
      }
      th.appendChild(sortIcon);
      sortIcon.addEventListener('mousedown', (e) => {
        // 阻止列拖拽/框选等在图标上启动
        e.stopPropagation();
      });
      sortIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleSort(col.key, e.shiftKey);
      });
      sortIcon.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._toggleSort(col.key, e.shiftKey);
          // 表头已重建，把焦点还给新生成的同列图标
          this._theadEl
            .querySelector<HTMLElement>(`.vt-sort-icon[data-sort-key="${col.key}"]`)
            ?.focus();
        }
      });
    }

  }

  /** 扁平表头（含 headerData / headerMerges 手写多行表头），整段渲染不做横向虚拟化 */
  private _buildTheadFlat(): void {
    const hMerges = this._options.headerMerges ?? [];
    const hData = this._options.headerData;
    const rowCount = this._getHeaderRowCount();
    const covered = buildMergeCoveredSet(hMerges);

    const renderOrder = [
      ...this._leftFixedCols,
      ...this._centerCols,
      ...this._rightFixedCols,
    ];

    for (let row = 0; row < rowCount; row++) {
      const tr = document.createElement('tr');
      tr.setAttribute('role', 'row');

      for (let ci = 0; ci < renderOrder.length; ci++) {
        if (covered.has(`${row},${ci}`)) continue;

        const col = renderOrder[ci];
        const merge = getMergeInfo(hMerges, row, ci);
        const isPrimary = merge
          ? merge.rowIndex === row && merge.colIndex === ci
          : false;

        if (merge && !isPrimary) continue;

        const th = document.createElement('th');
        th.className = 'vt-th';
        th.setAttribute('role', 'columnheader');

        if (isPrimary && merge) {
          if (merge.rowspan > 1) th.rowSpan = merge.rowspan;
          if (merge.colspan > 1) th.colSpan = merge.colspan;
        }

        const fixedIdx =
          col.fixed === 'left'
            ? this._leftFixedCols.indexOf(col)
            : col.fixed === 'right'
              ? this._rightFixedCols.indexOf(col)
              : -1;
        this._applyFixedCellStyle(th, col.fixed, fixedIdx);

        const hAlign = col.headerAlign ?? col.align ?? this._options.headerAlign ?? this._options.align;
        if (hAlign) th.style.textAlign = hAlign;
        const hVAlign = col.headerVAlign ?? col.vAlign ?? this._options.headerVAlign ?? this._options.vAlign;
        if (hVAlign) th.style.verticalAlign = hVAlign;

        const cellText = hData?.[row]?.[ci];
        if (cellText != null && cellText !== '') {
          th.textContent = cellText;
        } else if (row === 0) {
          this._applyHeaderContent(th, col, row);
        }

        const cellEndRow = isPrimary && merge
          ? merge.rowIndex + merge.rowspan - 1
          : row;
        const isLeafCell = cellEndRow === rowCount - 1 && (!merge || merge.colspan === 1);
        // 只有「单列且贯通到末行」的格子能唯一对应一列，供 _columnAtPoint / 列拖拽定位
        if (isLeafCell) th.dataset.colKey = col.key;
        if (cellEndRow === rowCount - 1) {
          this._applyHeaderResizeTrigger(th, col);
        }

        tr.appendChild(th);
      }

      if (row === 0) {
        const heightTh = document.createElement('th');
        heightTh.className = 'vt-cell-h';
        if (rowCount > 1) heightTh.rowSpan = rowCount;
        tr.appendChild(heightTh);
      }

      this._appendHeaderRow(tr);
    }
  }

  // --------------- pinned rows ---------------

  /** 构建一个固定行（渲染全部列，靠 colgroup 与主体对齐；置于 sticky 的 thead/tfoot 中冻结） */
  private _buildPinnedRow(item: T, rowIndex: number, kind: 'top' | 'bottom'): HTMLTableRowElement {
    const tr = document.createElement('tr');
    tr.className = `vt-tr vt-tr--pinned vt-tr--pinned-${kind}`;
    tr.setAttribute('role', 'row');
    const renderOrder = [...this._leftFixedCols, ...this._centerCols, ...this._rightFixedCols];
    for (const col of renderOrder) {
      const td = document.createElement('td');
      td.className = 'vt-td';
      if (col.fixed === 'left') {
        const i = this._leftFixedCols.indexOf(col);
        td.classList.add('vt-fixed-left');
        td.style.left = `${this._leftFixedOffsets[i]}px`;
      } else if (col.fixed === 'right') {
        const i = this._rightFixedCols.indexOf(col);
        td.classList.add('vt-fixed-right');
        td.style.right = `${this._rightFixedOffsets[i]}px`;
      }
      this._applyCellContent(td, col, item, rowIndex);
      tr.appendChild(td);
    }
    const h = document.createElement('td');
    h.className = 'vt-cell-h';
    tr.appendChild(h);
    return tr;
  }

  /** 重建固定行：置顶行进 sticky thead 尾部，置底行进 sticky tfoot 头部 */
  private _rebuildPinnedRows(): void {
    this._theadEl.querySelectorAll('.vt-tr--pinned-top').forEach((el) => el.remove());
    const top = this._options.pinnedTop ?? [];
    top.forEach((item, i) => this._theadEl.appendChild(this._buildPinnedRow(item, i, 'top')));

    this._tfootEl.querySelectorAll('.vt-tr--pinned-bottom').forEach((el) => el.remove());
    const bottom = this._options.pinnedBottom ?? [];
    if (bottom.length > 0 && !this._tfootEl.parentElement) {
      this._tableEl.appendChild(this._tfootEl);
    }
    // 逐行 insertBefore(firstChild) 会把顺序倒过来，因此统一插到「第一个非固定行」之前
    const firstFooterRow = this._tfootEl.querySelector('.vt-tfoot-row');
    bottom.forEach((item, i) =>
      this._tfootEl.insertBefore(this._buildPinnedRow(item, i, 'bottom'), firstFooterRow),
    );

    /**
     * 固定行是**塞进 thead / tfoot 里**的，加一行就把那一段抬高一行的高度 ——
     * 表头那一段的高度正是表体的起始位置（账本里的 `stickyHeaderSize`）。
     * 不在这里重新量一次，首屏就会用「没有固定行时」的表头高度摆表体，
     * 第一条数据行正好躲在固定行背后（`table-pinned` demo 实测：表头段 82px，
     * 表体却从 42px 排起，行 0 整行不可见）。
     */
    this._syncGeometryVars();
  }

  /** 更新置顶/置底固定行 */
  setPinnedRows(top?: T[], bottom?: T[]): void {
    if (top !== undefined) this._options.pinnedTop = top;
    if (bottom !== undefined) this._options.pinnedBottom = bottom;
    this._rebuildPinnedRows();
  }

  /** 清空表尾的表尾行，保留置底固定行（`.vt-tr--pinned-bottom` 同样挂在 tfoot 里） */
  private _clearFooterRows(): void {
    for (const tr of Array.from(this._tfootEl.children)) {
      if (!tr.classList.contains('vt-tr--pinned')) tr.remove();
    }
  }

  /** 追加一行表尾：始终排在置底固定行之后 */
  private _appendFooterRow(tr: HTMLTableRowElement): void {
    this._tfootEl.appendChild(tr);
  }

  private _rebuildTfoot(): void {
    this._clearFooterRows();
    if (this._getFooterRowCount() === 0) return;
    if (this._hasGroupedFooter()) this._buildTfootGrouped();
    else this._buildTfootFlat();
  }

  /**
   * 多级分组表尾。与表头**同序**（最外层分组在上、叶子在下），因此表尾网格与表头网格
   * 逐行完全一致，直接复用同一份 `_headerMatrix*`，无需另建。
   * 中间段同样按列窗口 `[_renderColBegin, _renderColEnd]` 裁剪 + 留白，与表头共用 `planHeaderRow`。
   */
  private _buildTfootGrouped(): void {
    const depth = this._headerDepth;
    const centerCount = this._centerCols.length;
    const rows = this._summaryLeaves;

    for (let row = 0; row < depth; row++) {
      const tr = document.createElement('tr');
      tr.className = 'vt-tfoot-row';
      tr.setAttribute('role', 'row');

      for (const cell of this._headerMatrixLeft[row] ?? []) {
        tr.appendChild(
          this._createGroupedFooterCell(cell, cell.span, 'left', this._leftFixedCols, rows, row, depth),
        );
      }

      for (const item of planHeaderRow(
        this._headerMatrixCenter,
        row,
        this._renderColBegin,
        this._renderColEnd,
        centerCount,
        depth,
      )) {
        if (item.type === 'pad') {
          const pad = document.createElement('td');
          pad.className = 'vt-cell-pad';
          pad.colSpan = item.colSpan;
          if (item.rowSpan > 1) pad.rowSpan = item.rowSpan;
          tr.appendChild(pad);
        } else {
          tr.appendChild(
            this._createGroupedFooterCell(
              item.cell,
              item.colSpan,
              undefined,
              this._centerCols,
              rows,
              row,
              depth,
            ),
          );
        }
      }

      for (const cell of this._headerMatrixRight[row] ?? []) {
        tr.appendChild(
          this._createGroupedFooterCell(cell, cell.span, 'right', this._rightFixedCols, rows, row, depth),
        );
      }

      if (row === 0) {
        const heightTd = document.createElement('td');
        heightTd.className = 'vt-cell-h';
        if (depth > 1) heightTd.rowSpan = depth;
        tr.appendChild(heightTd);
      }

      this._appendFooterRow(tr);
    }
  }

  /**
   * 生成一个分组表尾单元格。内容优先级：
   * `renderFooter` > `footerValue` > `summary`/`summaryMethod` 自动聚合 > 合计标签（仅首列叶子格）> 空。
   */
  private _createGroupedFooterCell(
    cell: HeaderMatrixCell<VirtTableColumn<T>>,
    colSpan: number,
    fixed: 'left' | 'right' | undefined,
    sectionLeaves: VirtTableColumn<T>[],
    rows: T[],
    footerRow: number,
    depth: number,
  ): HTMLTableCellElement {
    const col = cell.col;
    const td = document.createElement('td');
    td.className = 'vt-td';
    if (colSpan > 1) td.colSpan = colSpan;
    if (cell.rowSpan > 1) td.rowSpan = cell.rowSpan;

    this._applyFixedCellStyle(td, fixed, cell.start, cell.span);

    // 该格覆盖的叶子列：分组格取其全部可见叶子后代，叶子格就是它自己
    const leafColumns = sectionLeaves.slice(cell.start, cell.start + cell.span);

    // 分组小计格与分组表头同构：中间段走 sticky 内层，滚动时标签不跳
    let slot: HTMLElement = td;
    if (cell.isLeaf) {
      td.dataset.colKey = col.key;
      const fAlign =
        col.footerAlign ?? col.align ?? this._options.footerAlign ?? this._options.align;
      if (fAlign) td.style.textAlign = fAlign;
    } else {
      td.classList.add('vt-td--group');
      td.dataset.groupKey = col.key;
      slot = this._groupCellSlot(td, fixed === undefined);
      // 分组小计跨多列，默认居中（与分组表头一致），显式配置优先
      slot.style.textAlign = col.footerAlign ?? col.align ?? 'center';
    }
    const fVAlign =
      col.footerVAlign ?? col.vAlign ?? this._options.footerVAlign ?? this._options.vAlign;
    if (fVAlign) td.style.verticalAlign = fVAlign;

    let summary = this._options.showSummary
      ? computeCellSummary(col, rows, leafColumns)
      : null;
    // 合计行标签：整表第一列的叶子格、且它自己没有聚合配置时占位（与扁平表尾语义一致）
    if (summary === null && this._options.showSummary && cell.isLeaf && col === this._columns[0]) {
      summary = this._options.summaryText ?? this._locale.summary;
    }

    // 分组格恒为单行，顺带挂 title 让被裁剪的内容仍可查看
    const setText = (text: string) => {
      slot.textContent = text;
      if (text && !cell.isLeaf) td.title = text;
    };

    if (col.renderFooter) {
      const content = col.renderFooter({
        column: col,
        isGroup: !cell.isLeaf,
        footerRow,
        leafColumns,
        rows,
        summary: summary ?? '',
      });
      if (typeof content === 'string') slot.innerHTML = content;
      else if (content) slot.appendChild(content);
    } else if (col.footerValue != null) {
      setText(String(col.footerValue));
    } else if (summary !== null) {
      setText(summary);
    }

    return td;
  }

  /** 扁平表尾（footerData / footerMerges），整段渲染不做横向虚拟化 */
  private _buildTfootFlat(): void {
    const fMerges = this._options.footerMerges ?? [];
    const fData = this._options.footerData ?? [];
    const rowCount = this._getFooterRowCount();
    const covered = buildMergeCoveredSet(fMerges);

    const renderOrder = [
      ...this._leftFixedCols,
      ...this._centerCols,
      ...this._rightFixedCols,
    ];

    for (let row = 0; row < rowCount; row++) {
      const tr = document.createElement('tr');
      tr.className = 'vt-tfoot-row';

      for (let ci = 0; ci < renderOrder.length; ci++) {
        if (covered.has(`${row},${ci}`)) continue;

        const col = renderOrder[ci];
        const merge = getMergeInfo(fMerges, row, ci);
        const isPrimary = merge
          ? merge.rowIndex === row && merge.colIndex === ci
          : false;

        if (merge && !isPrimary) continue;

        const td = document.createElement('td');
        td.className = 'vt-td';

        if (isPrimary && merge) {
          if (merge.rowspan > 1) td.rowSpan = merge.rowspan;
          if (merge.colspan > 1) td.colSpan = merge.colspan;
        }

        const fixedIdx =
          col.fixed === 'left'
            ? this._leftFixedCols.indexOf(col)
            : col.fixed === 'right'
              ? this._rightFixedCols.indexOf(col)
              : -1;
        this._applyFixedCellStyle(td, col.fixed, fixedIdx);

        const fAlign = col.footerAlign ?? col.align ?? this._options.footerAlign ?? this._options.align;
        if (fAlign) td.style.textAlign = fAlign;
        const fVAlign = col.footerVAlign ?? col.vAlign ?? this._options.footerVAlign ?? this._options.vAlign;
        if (fVAlign) td.style.verticalAlign = fVAlign;

        // 只有「单列且贯通到末行」的格子能唯一对应一列（与扁平表头一致）
        const cellEndRow = isPrimary && merge ? merge.rowIndex + merge.rowspan - 1 : row;
        if (cellEndRow === rowCount - 1 && (!merge || merge.colspan === 1)) {
          td.dataset.colKey = col.key;
        }

        const cellText = fData[row]?.[ci];
        if (cellText != null && cellText !== '') {
          td.textContent = String(cellText);
        }

        tr.appendChild(td);
      }

      if (row === 0) {
        const heightTd = document.createElement('td');
        heightTd.className = 'vt-cell-h';
        if (rowCount > 1) heightTd.rowSpan = rowCount;
        tr.appendChild(heightTd);
      }

      this._appendFooterRow(tr);
    }
  }

  private _clearItemPool(): void {
    this._itemPool.forEach((el) => {
      this._core.resizeObserver?.unobserve(el);
      el.remove();
    });
    this._itemPool.clear();
    this._rowDataMap.clear();
    this._renderedKeys = [];
  }

  // --------------- incremental DOM patching ---------------

  /**
   * 派发 `rangeUpdate`。core 0.0.4 起不再提供这个事件，改由表格自己从 `update` 派生。
   *
   * 去重是语义的一部分而不是优化：旧版 core 只在**区间边界变化**时 emit，而 `update`
   * 每次滚动、每次尺寸回填都会来。不去重的话使用方（常见用法是在回调里重算浮层、
   * 拉取可见行的详情）会被滚动过程中的每一帧打中。
   */
  private _emitRangeUpdate(state: ListState): void {
    const { inViewBegin, inViewEnd } = state;
    if (inViewBegin === this._lastInViewBegin && inViewEnd === this._lastInViewEnd) return;
    this._lastInViewBegin = inViewBegin;
    this._lastInViewEnd = inViewEnd;
    this._userEvents?.rangeUpdate?.(inViewBegin, inViewEnd);
  }

  private _patch(renderList: T[], reactiveData: ListState): void {
    // 行 DOM 会被复用，重填之后悬停中的那格内容可能已经换人；滚动那条路由
    // tooltip 自己的 scroll 监听兜住，这里管的是换数据/排序/筛选触发的重绘
    this._tooltip?.hide();
    if (this._needsTheadRebuild) {
      this._rebuildThead();
      this._needsTheadRebuild = false;
    }

    const { itemKey } = this._options;
    const listLen = this._options.list?.length ?? 0;
    this._emptyEl.style.display = listLen === 0 ? '' : 'none';
    this._rootEl.setAttribute('aria-rowcount', String(listLen));
    this._rootEl.setAttribute('aria-colcount', String(this._columns.length));

    /**
     * 区间 / 行高变了，表体的文档位置随之改变，重新摆一次。
     *
     * 这是 `_applyBodyOffset` 的第二个驱动源（另一个是 `offsetChange`，即滚动本身），
     * 与 virt-list 的 `_patch` → `_applyLayout` 一致。缺了这一路，尺寸回填后
     * `leadingSize` 变了而位置没跟上，视口就会错位。
     *
     * 注意这里**不再写任何随行数增长的尺寸**：原来的
     * `_skeletonEl.style.height = itemsTotalSize`（撑开滚动高度）与
     * `_paddingTr.style.height = leadingSize`（顶部占位）都由残差 `top` 取代了。
     * `_paddingTr` 本身留着当行插入的锚点（见下方 `prevNode`），高度恒为 0。
     */
    this._applyBodyOffset();
    // 总高 / 视口变了，滑块尺寸要跟着改
    this._scrollbarY?.update();

    const newKeys: string[] = [];
    for (const item of renderList) {
      newKeys.push(String(item[itemKey]));
    }

    const newKeySet = new Set(newKeys);
    for (const key of this._renderedKeys) {
      if (!newKeySet.has(key)) {
        const el = this._itemPool.get(key);
        if (el) {
          this._options.onRowRemoved?.(el);
          this._core.resizeObserver?.unobserve(el);
          el.remove();
          this._itemPool.delete(key);
        }
        this._rowDataMap.delete(key);
      }
    }

    if (renderList.length === 0) {
      this._renderedKeys = [];
      return;
    }

    const renderBegin = reactiveData.renderBegin;

    let prevNode: ChildNode = this._paddingTr;
    for (let i = 0; i < renderList.length; i++) {
      const item = renderList[i]!;
      const key = String(item[itemKey]);

      this._rowDataMap.set(key, { item, rowIndex: renderBegin + i });

      let tr = this._itemPool.get(key);
      if (!tr) {
        tr = this._createRow(item, renderBegin + i);
        this._core.resizeObserver?.observe(tr);
        this._itemPool.set(key, tr);
        // 热路径：无插件注册该钩子时完全跳过
        if (this._pluginRuntime?.hasRowHooks) {
          this._pluginRuntime.emitRowCreated(tr, item, renderBegin + i);
        }
      } else if (this._needsRowCellsRebuild) {
        const rowType = (item as any)._rowType as string | undefined;
        if (rowType !== 'expand' && rowType !== 'group') {
          this._updateCenterCells(tr, item, renderBegin + i);
        }
      }

      const nextSibling = prevNode.nextSibling;
      if (nextSibling !== tr) {
        this._tbodyEl.insertBefore(tr, nextSibling);
      }
      prevNode = tr;
    }

    this._renderedKeys = newKeys;
    this._needsRowCellsRebuild = false;
    this._updateActiveCellOverlay();
    // 一帧渲染完成：行 DOM 与位置都已就位，插件可据此重绘依赖行几何的浮层
    this._pluginRuntime?.emitRendered();
  }

  private _createRow(item: T, rowIndex: number): HTMLTableRowElement {
    const tr = document.createElement('tr');
    const key = String(item[this._options.itemKey]);
    const rowType = (item as any)._rowType as string | undefined;
    tr.className = 'vt-tr';
    tr.dataset.id = key;
    tr.dataset.rowKey = key;
    tr.setAttribute('role', 'row');
    tr.setAttribute('aria-rowindex', String(rowIndex + 1));

    if (rowType === 'expand') {
      tr.classList.add('vt-tr--expand');
      this._fillExpandRow(tr, item);
      return tr;
    }
    if (rowType === 'group') {
      tr.classList.add('vt-tr--group');
      this._fillGroupRow(tr, item);
      return tr;
    }

    if (this._options.stripe && rowIndex % 2 === 1) {
      tr.classList.add('is-striped');
    }
    if (this._selectRowKey === key) {
      tr.classList.add('current-row');
    }

    const { rowClass, rowStyle } = this._options;
    if (rowClass) {
      const cls =
        typeof rowClass === 'function' ? rowClass(item, rowIndex) : rowClass;
      if (cls) tr.className += ` ${cls}`;
    }
    if (rowStyle) {
      const style =
        typeof rowStyle === 'function' ? rowStyle(item, rowIndex) : rowStyle;
      if (style) tr.style.cssText = style;
    }

    this._fillRowCells(tr, item, rowIndex);
    return tr;
  }

  /**
   * 填充数据单元格，并在完成后派发 onCellRendered。
   *
   * 之所以包一层：`_applyCellContentInner` 对功能列（序号/勾选/树…）有 6 处早返回，
   * 在这里统一收口才能保证插件对**每个**单元格都收到通知。
   */
  private _applyCellContent(
    td: HTMLTableCellElement,
    col: VirtTableColumn<T>,
    item: T,
    rowIndex: number,
  ): void {
    this._applyCellContentInner(td, col, item, rowIndex);
    // 热路径：无插件注册该钩子时完全跳过
    if (this._pluginRuntime?.hasCellHooks) {
      this._pluginRuntime.emitCellRendered(td, col, item, rowIndex);
    }
  }

  private _applyCellContentInner(
    td: HTMLTableCellElement,
    col: VirtTableColumn<T>,
    item: T,
    rowIndex: number,
  ): void {
    td.dataset.colKey = col.key;
    td.setAttribute('role', 'gridcell');
    if (this._selectColKey === col.key) {
      td.classList.add('current-column');
    }
    // 功能列（序号/勾选/单选/拖拽/展开）加类型类，供样式收窄内边距并居中
    if (col.type && col.type !== 'tree') {
      td.classList.add(`vt-td--${col.type}`);
    }

    const align = col.align ?? this._options.align;
    if (align) td.style.textAlign = align;

    const vAlign = col.vAlign ?? this._options.vAlign;
    if (vAlign) td.style.verticalAlign = vAlign;


    const { cellClass, cellStyle } = this._options;
    if (cellClass) {
      const cls =
        typeof cellClass === 'function' ? cellClass(col, item) : cellClass;
      if (cls) td.className += ` ${cls}`;
    }
    if (cellStyle) {
      const style =
        typeof cellStyle === 'function' ? cellStyle(col, item) : cellStyle;
      if (style) td.style.cssText += `;${style}`;
    }

    /**
     * 功能列的**穿透**（接管层唯一的口子）：这一格配了单元格级内容（`setCellRender` /
     * `_cellRenders`）时，不再由功能列独占，内容照常走统一的内容链。
     *
     * 为什么只放开单元格级：列级 `render` 撞功能列是**配置写错了**（整列都不要勾选框，
     * 那就别配 `type`），继续告警忽略；而「就这一行不给勾选 / 序号换成锁图标」是真实
     * 且常见的需求，在此之前**没有任何官方出口**（既没有 `selectable`，也没法用 render）。
     *
     * ⚠️ 穿透只改 UI，不改选择态语义：勾选框没画出来，但该行仍在 `_checkedRows` 的
     * 作用域里，表头全选照样会选中它。要真禁止选中得自己在 `onCheckChange` 里挡。
     */
    // `col.type` 判断放在前面短路：普通列（绝大多数格）不必为此多查一次配置表
    const pierced =
      col.type !== undefined &&
      col.type !== 'tree' &&
      this._hasCellContentOverride(col, item);

    if (col.type === 'index' && !pierced) {
      td.textContent = String(rowIndex + 1);
      return;
    }

    if (col.type === 'expand' && !pierced) {
      const key = String(item[this._options.itemKey]);
      const isOpen = !!this._expandMap[key];
      const icon = document.createElement('span');
      icon.className = 'vt-expand-icon' + (isOpen ? ' vt-expand-icon--open' : '');
      icon.innerHTML = CHEVRON_SVG;
      icon.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleExpand(key);
      });
      td.appendChild(icon);
      return;
    }

    if (col.type === 'tree') {
      const groupLevel = ((item as any)._groupLevel as number) || 0;
      const treeLevel = ((item as any)._treeLevel as number) || 1;
      const hasKids = !!(item as any)._hasChildren;
      const key = String(item[this._options.itemKey]);
      const isFolded = !!this._foldMap[key];

      // flex 行容器：`td` 是 `table-cell`，缩进与箭头上的 `flex-shrink: 0`（CSS 里一直
      // 写着）在它下面是死规则。套一层 flex 才能让内容区 `flex: 1 + min-width: 0`，
      // 这是 ellipsis 在「缩进 + 箭头 + 文本」这种组合里生效的唯一可靠写法。
      const row = document.createElement('div');
      row.className = 'vt-tree-row';
      td.appendChild(row);

      for (let l = 1; l < groupLevel; l++) {
        const sp = document.createElement('span');
        sp.className = 'vt-group-indent';
        row.appendChild(sp);
      }
      for (let l = 1; l < treeLevel; l++) {
        const sp = document.createElement('span');
        sp.className = 'vt-tree-indent';
        row.appendChild(sp);
      }

      const toggle = document.createElement('span');
      if (hasKids) {
        // 懒加载在途：箭头位置显示小 spinner（行 DOM 被虚拟滚动重建后也保持）
        const loadingKids = this._lazyLoading.has(key);
        toggle.className =
          'vt-tree-toggle' +
          (isFolded ? '' : ' vt-tree-toggle--open') +
          (loadingKids ? ' vt-tree-toggle--loading' : '');
        toggle.innerHTML = loadingKids
          ? '<span class="vt-spinner vt-spinner--xs"></span>'
          : CHEVRON_SVG;
        toggle.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleFold(key);
        });
      } else {
        toggle.className = 'vt-tree-toggle vt-tree-toggle--leaf';
      }
      row.appendChild(toggle);

      // tree 列是**装饰器**：缩进 + 折叠箭头画完，内容仍走统一的装配出口，
      // 因此它和普通列一样能吃到 textOverflow（以前这里是第二份复制的 render 解析）
      const textSpan = document.createElement('span');
      textSpan.className = 'vt-tree-content';
      row.appendChild(textSpan);
      this._fillCellContent(textSpan, col, item, rowIndex);
      return;
    }

    if (col.type === 'checkbox' && !pierced) {
      const key = String(item[this._options.itemKey]);
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'vt-checkbox';
      cb.checked = this._checkedRows.has(key);
      cb.addEventListener('change', () => {
        if (cb.checked) {
          this._checkedRows.add(key);
        } else {
          this._checkedRows.delete(key);
        }
        this._updateHeaderCheckbox();
        this._options.onCheckChange?.(cb.checked, item);
      });
      td.appendChild(cb);
      return;
    }

    if (col.type === 'radio' && !pierced) {
      const key = String(item[this._options.itemKey]);
      const rd = document.createElement('input');
      rd.type = 'radio';
      rd.className = 'vt-radio';
      rd.checked = this._selectedRadioKey === key;
      rd.addEventListener('change', () => {
        this._selectedRadioKey = key;
        this._refreshRadios();
        this._options.onRadioChange?.(item);
      });
      td.appendChild(rd);
      return;
    }

    if (col.type === 'drag' && !pierced) {
      const handle = document.createElement('span');
      handle.className = 'vt-drag-handle';
      handle.title = this._locale.dragRow;
      handle.innerHTML = '<svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="currentColor"><path d="M384 160a64 64 0 1 1-128 0 64 64 0 0 1 128 0zM384 512a64 64 0 1 1-128 0 64 64 0 0 1 128 0zM384 864a64 64 0 1 1-128 0 64 64 0 0 1 128 0zM768 160a64 64 0 1 1-128 0 64 64 0 0 1 128 0zM768 512a64 64 0 1 1-128 0 64 64 0 0 1 128 0zM768 864a64 64 0 1 1-128 0 64 64 0 0 1 128 0z"/></svg>';
      // mousedown 由 vtRowDrag 插件通过 onCellRendered 钩子绑定
      td.appendChild(handle);
      return;
    }

    const groupLevel = ((item as any)._groupLevel as number) || 0;
    if (
      groupLevel > 1 &&
      !this._hasTreeCol &&
      col === this._options.columns[0]
    ) {
      for (let l = 1; l < groupLevel; l++) {
        const sp = document.createElement('span');
        sp.className = 'vt-group-indent';
        td.appendChild(sp);
      }
    }
    // 自动合并的 primary 格：内容交给 sticky 内层承载（见 _mergeCellSlot）
    this._fillCellContent(this._mergeCellSlot(td, col, rowIndex), col, item, rowIndex);
  }

  /**
   * 单元格内容装配 —— **三条渲染路径唯一的出口**。
   *
   * 拆出来的原因是踩过的坑：容器装配（`.vt-td-text` 包装 + `textOverflow`）原先写在
   * 「没有 render」的 else 分支里，于是任何配了 `render` 的列，`textOverflow` 与
   * `mergeKey` 的 sticky 内层都**静默失效** —— 使用方只会觉得特性坏了，没有任何告警。
   * 这两件事属于**单元格容器**的关注点，与内容从哪来无关，所以统一在这里做。
   *
   * `slot` 由调用方给：普通格是 td 自己，被重锚的自动合并格是 `.vt-merge-label`
   * （见 `_mergeCellSlot`），tree 列是箭头右侧的内容容器。三者共享同一套装配。
   */
  private _fillCellContent(
    slot: HTMLElement,
    col: VirtTableColumn<T>,
    item: T,
    rowIndex: number,
  ): void {
    const textWrap = document.createElement('div');
    textWrap.className = 'vt-td-text';
    const textOverflow = col.textOverflow ?? this._options.textOverflow;
    if (textOverflow === 'ellipsis') {
      textWrap.classList.add('vt-td-text--ellipsis');
    } else if (textOverflow === 'tooltip') {
      // 自绘浮层：监听走 tbody 事件委托，这里只打标记（见 _ensureTooltip）
      textWrap.classList.add('vt-td-text--ellipsis', 'vt-td-text--tooltip');
      this._ensureTooltip();
    }

    const content = this._resolveCellContent(col, this._cellRenderConfigOf(col.key, item));
    if (content.source === 'render') {
      const result = content.render({ value: item[col.key], row: item, rowIndex, column: col });
      if (typeof result === 'string') {
        textWrap.innerHTML = result;
      } else if (result) {
        textWrap.appendChild(result);
      }
    } else if (content.source === 'cellType') {
      const result = renderCellContent(content.cellType, item[col.key]);
      // 按种类装填：只有 rich-text 走 innerHTML，其余不碰 HTML 解析
      if (!result) textWrap.textContent = item[col.key] != null ? String(item[col.key]) : '';
      else if (result.kind === 'text') textWrap.textContent = result.text;
      else if (result.kind === 'html') textWrap.innerHTML = result.html;
      else textWrap.appendChild(result.node);
    } else {
      textWrap.textContent = item[col.key] != null ? String(item[col.key]) : '';
    }
    slot.appendChild(textWrap);
  }

  /**
   * 内容层解析 —— **优先级链的唯一实现**，决定这一格的**常态**（没进入编辑时的样子）。
   *
   * 分层模型：接管层（合成行 / 功能列）→ 内容层（这里）→ 容器层；编辑态属于**会话层**，
   * 不走这条链（见 `resolveCellRender`）。四层的完整说明在 AGENTS.md §7.17。
   *
   * 排序规则只有一条：**粒度越细越优先，同粒度内越具体越优先**（`render` 比 `cellType`
   * 具体）。展开就是：
   *
   *   单元格级 render > 单元格级 cellType > 列级 render > 列级 cellType
   *     > 表级 cellType > 默认取值
   *
   * 注意「粒度优先」意味着**单元格级 `cellType` 赢过列级 `render`** —— 否则给某一格配
   * 了 `cellType` 却毫无反应（被列级 render 吃掉），是解释不通的。
   *
   * 返回判别式而不是「render 或 undefined」：加进 `cellType` 这一档之后，调用方要区分
   * 的是**三种内容来源**，用 `undefined` 表达就只能在外面再补一次 `col.cellType` 判断
   * —— 那正是这个方法要消灭的第二处实现。以前这段在 tree 分支和普通分支里各写了一份
   * （逐字复制），漏改一处就是「tree 列行为和普通列不一致」这类极难查的 bug。
   */
  private _resolveCellContent(
    col: Pick<VirtTableColumn<T>, 'render' | 'cellType'> | undefined,
    perCell: CellRenderConfig<T> | undefined,
  ): ResolvedCellContent<T> {
    if (perCell?.render) return { source: 'render', render: perCell.render };
    if (perCell?.cellType) return { source: 'cellType', cellType: perCell.cellType };
    if (col?.render) return { source: 'render', render: col.render };
    if (col?.cellType) return { source: 'cellType', cellType: col.cellType };
    const tableLevel = this._options.cellType;
    if (tableLevel) return { source: 'cellType', cellType: tableLevel };
    return { source: 'value' };
  }

  /**
   * 该格有没有**单元格级**的内容配置。功能列穿透判定用它（见 `_applyCellContentInner`）：
   * 只认单元格级，列级撞功能列是配置写错了，仍旧告警忽略（`_warnTypeWithRender`）。
   */
  private _hasCellContentOverride(col: VirtTableColumn<T>, item: T): boolean {
    const perCell = this._cellRenderConfigOf(col.key, item);
    return !!(perCell?.render || perCell?.cellType);
  }

  /**
   * 该格的单元格级配置：`setCellRender()` 优先，回落到行数据 `_cellRenders`（兼容路径）。
   * 只管「单元格级」，列级 fallback 由调用方各自处理（渲染取 render、编辑取 renderEditor）。
   */
  private _cellRenderConfigOf(
    colKey: string,
    item: T,
  ): CellRenderConfig<T> | undefined {
    const rowKey = String(item[this._options.itemKey]);
    return (
      this._cellRenderMap.get(rowKey)?.get(colKey) ??
      (item as any)._cellRenders?.[colKey]
    );
  }

  /**
   * 返回自动合并格的内容容器。
   *
   * 与分组标签（`_groupCellSlot`）是**同一个问题的纵向版本**：合并块按渲染窗口裁剪，
   * 而裁剪是按**整行**取整的、滚动却是逐像素的 —— 直接在格子里垂直居中，文字会一边
   * 随内容匀速上移、一边在窗口前进一行时回跳一整行高（实测锯齿幅度 32px / 每 5 帧一次）。
   *
   * 所以套一层 sticky 内层（高度 = min(本格高, 可见数据区高)），由 CSS sticky 在合成器
   * 逐帧完成跟随，不受整行取整影响，主线程零开销：
   *   - 段比可见区高 → 内层取可见区高、被钉在可见数据区内，文字稳定不动
   *   - 段较矮       → 内层取本格高，退化为格内居中（本来也不会被裁）
   *
   * 只对**配了 `mergeKey` 的列**生效：静态 `merges` 不做窗口裁剪（`calcRenderRect` 会把
   * 渲染区间撑到真实段首），格子位置在文档流里是稳定的，套 sticky 只会把它钉歪。
   */
  private _mergeCellSlot(
    td: HTMLTableCellElement,
    col: VirtTableColumn<T> | undefined,
    rowIndex: number,
  ): HTMLElement {
    if (!col?.mergeKey || (td.rowSpan || 1) <= 1) return td;
    // 只有**被重锚**的段才需要这层：primary 被抬到窗口起点，格子的视口位置每前进一行
    // 就回跳一次（文字抖动 + 斑马纹奇偶翻转）。段首在窗口内时格子位置在文档流里是
    // 稳定的，不套内层，从而保住格子自身的 vAlign 居中。
    //
    // `_renderRowBegin > 0` 这个条件不能省：列表顶部（窗口起点就是第 0 行）时格子上沿
    // 恰好落在 sticky 阈值上，sticky 不会位移，而 translateY(-50%) 会把标签顶进表头里。
    if (rowIndex !== this._renderRowBegin || this._renderRowBegin === 0) return td;
    td.classList.add('vt-td--merge-sticky');
    // 必须压成 top：列上的 `vAlign` 是**内联样式**，CSS 类压不过它；而只要标签被垂直
    // 居中，它的自然位置就永远停在视口中部、够不到 sticky 的 top 阈值 —— sticky 一次
    // 都不会触发（这正是第一版没生效的原因）。
    td.style.verticalAlign = 'top';
    const label = document.createElement('div');
    label.className = 'vt-merge-label';
    td.appendChild(label);
    return label;
  }

  /**
   * 懒创建溢出文本 tooltip：只有真出现 `textOverflow: 'tooltip'` 的单元格才装。
   *
   * 监听是 tbody 上的一次委托，不随单元格数量增长；因此这里只需要做一次，
   * 后续渲染命中的都是同一个 controller（`internal/tooltip.ts` 里有取舍说明）。
   */
  private _ensureTooltip(): void {
    if (this._tooltip) return;
    this._tooltip = createTooltip({
      root: this._rootEl,
      delegate: this._tbodyEl,
      scroller: this._clientEl,
      selector: '.vt-td-text--tooltip',
      delay: this._options.tooltip?.delay,
    });
  }

  /**
   * Build the center section (left pad + visible center tds + right pad)
   * as a DocumentFragment. Does NOT include fixed cols or height td.
   */
  private _buildCenterFragment(item: T, rowIndex: number): DocumentFragment {
    const frag = document.createDocumentFragment();
    const plan = planRowCells(
      this._renderMerges,
      rowIndex,
      this._renderColBegin,
      this._renderColEnd,
      this._centerCols.length,
    );

    for (const cell of plan) {
      const td = document.createElement('td');
      if (cell.type === 'pad') {
        td.className = 'vt-cell-pad';
        td.colSpan = cell.colSpan;
      } else {
        td.className = 'vt-td';
        (td as any)._ci = cell.colIndex;
        if (cell.rowSpan > 1) td.rowSpan = cell.rowSpan;
        if (cell.colSpan > 1) td.colSpan = cell.colSpan;
        this._applyCellContent(td, this._centerCols[cell.colIndex], item, rowIndex);
      }
      frag.appendChild(td);
    }

    return frag;
  }

  /**
   * Full build of all td cells for a row (initial creation).
   * Structure: leftFixed → centerFragment → rightFixed → heightTd
   */
  private _fillRowCells(
    tr: HTMLTableRowElement,
    item: T,
    rowIndex: number,
  ): void {
    tr.innerHTML = '';
    const rowH = this._core.getItemSize(
      String(item[this._options.itemKey]),
    );

    for (let i = 0; i < this._leftFixedCols.length; i++) {
      const col = this._leftFixedCols[i];
      const td = document.createElement('td');
      td.className = 'vt-td vt-fixed-left';
      td.style.left = `${this._leftFixedOffsets[i]}px`;
      this._applyCellContent(td, col, item, rowIndex);
      tr.appendChild(td);
    }

    tr.appendChild(this._buildCenterFragment(item, rowIndex));

    for (let i = 0; i < this._rightFixedCols.length; i++) {
      const col = this._rightFixedCols[i];
      const td = document.createElement('td');
      td.className = 'vt-td vt-fixed-right';
      td.style.right = `${this._rightFixedOffsets[i]}px`;
      this._applyCellContent(td, col, item, rowIndex);
      tr.appendChild(td);
    }

    const hTd = document.createElement('td');
    hTd.className = 'vt-cell-h';
    hTd.style.height = `${rowH}px`;
    tr.appendChild(hTd);
  }

  /**
   * Replace only the center section of a row, keeping fixed cols and
   * height td stable. Used during horizontal scrolling for DOM reuse.
   *
   * Row DOM layout: [leftFixed * L] [center section] [rightFixed * R] [heightTd]
   */
  private _updateCenterCells(
    tr: HTMLTableRowElement,
    item: T,
    rowIndex: number,
  ): void {
    const L = this._leftFixedCols.length;
    const R = this._rightFixedCols.length;
    const centerCount = tr.children.length - L - R - 1;

    const pool = new Map<number, HTMLTableCellElement>();
    for (let i = 0; i < centerCount; i++) {
      const td = tr.children[L + i] as HTMLTableCellElement;
      const ci = (td as any)._ci as number | undefined;
      if (ci !== undefined) {
        pool.set(ci, td);
      }
    }

    const plan = planRowCells(
      this._renderMerges,
      rowIndex,
      this._renderColBegin,
      this._renderColEnd,
      this._centerCols.length,
    );

    const neededCols = new Set<number>();
    for (const cell of plan) {
      if (cell.type !== 'pad') neededCols.add(cell.colIndex);
    }

    for (let i = centerCount - 1; i >= 0; i--) {
      const td = tr.children[L + i] as HTMLTableCellElement;
      const ci = (td as any)._ci as number | undefined;
      if (ci === undefined || !neededCols.has(ci)) {
        td.remove();
        if (ci !== undefined) pool.delete(ci);
      }
    }

    let prevNode: ChildNode | null = L > 0 ? tr.children[L - 1] : null;
    for (const cell of plan) {
      let td: HTMLTableCellElement;

      if (cell.type === 'pad') {
        td = document.createElement('td');
        td.className = 'vt-cell-pad';
        td.colSpan = cell.colSpan;
      } else {
        const existing = pool.get(cell.colIndex);
        if (existing) {
          td = existing;
          td.rowSpan = cell.rowSpan;
          td.colSpan = cell.colSpan;
        } else {
          td = document.createElement('td');
          td.className = 'vt-td';
          (td as any)._ci = cell.colIndex;
          if (cell.rowSpan > 1) td.rowSpan = cell.rowSpan;
          if (cell.colSpan > 1) td.colSpan = cell.colSpan;
          this._applyCellContent(
            td,
            this._centerCols[cell.colIndex],
            item,
            rowIndex,
          );
        }
      }

      const next = prevNode ? prevNode.nextSibling : tr.firstChild;
      if (td !== next) {
        tr.insertBefore(td, next);
      }
      prevNode = td;
    }

    const hTd = tr.lastElementChild as HTMLElement;
    if (hTd?.classList.contains('vt-cell-h')) {
      const rowH = this._core.getItemSize(
        String(item[this._options.itemKey]),
      );
      hTd.style.height = `${rowH}px`;
    }
  }

  private _fillExpandRow(tr: HTMLTableRowElement, item: T): void {
    tr.innerHTML = '';
    const totalCols =
      this._leftFixedCols.length +
      this._centerCols.length +
      this._rightFixedCols.length +
      1; // +1 for height placeholder
    const td = document.createElement('td');
    td.className = 'vt-td vt-expand-content';
    td.colSpan = totalCols;

    const parentId = (item as any)._parentId as string;
    const expandCol = this._getExpandCol();
    let parent: T | undefined;
    const findItem = (items: T[]): T | undefined => {
      for (const it of items) {
        if (String(it[this._options.itemKey]) === parentId) return it;
        const ch = (it as any).children as T[] | undefined;
        if (ch) { const r = findItem(ch); if (r) return r; }
      }
      return undefined;
    };
    parent = findItem(this._originList);
    if (expandCol?.renderExpandRow && parent) {
      const content = expandCol.renderExpandRow({ column: expandCol, row: parent });
      if (typeof content === 'string') {
        td.innerHTML = content;
      } else {
        td.appendChild(content);
      }
    }
    tr.appendChild(td);
  }

  private _fillGroupRow(tr: HTMLTableRowElement, item: T): void {
    tr.innerHTML = '';
    const totalCols =
      this._leftFixedCols.length +
      this._centerCols.length +
      this._rightFixedCols.length +
      1;
    const groupLevel = ((item as any)._groupLevel as number) || 1;
    const hasKids = !!(item as any)._hasChildren;
    const key = String(item[this._options.itemKey]);
    const isFolded = !!this._foldMap[key];
    const groupName = (item as any)._groupName as string ?? key;
    const groupField = (item as any)._groupField as string | undefined;
    const groupCount = (item as any)._groupCount as number | undefined;

    // 层级类：便于按层级区分底色/字号（lv1 最强，越深越弱）
    tr.classList.add(`vt-tr--group-lv${Math.min(groupLevel, 3)}`);

    const td = document.createElement('td');
    td.className = 'vt-td vt-group-cell';
    td.colSpan = totalCols;
    td.setAttribute('aria-expanded', String(!isFolded));

    // 内容包一层 sticky 容器：横向滚动时分组标题始终停在左侧可见
    const content = document.createElement('div');
    content.className = 'vt-group-content';
    // 层级缩进用 padding（而非占位 span），避免 flex gap 把缩进放大
    content.style.setProperty('--vt-group-depth', String(Math.max(groupLevel - 1, 0)));

    if (hasKids) {
      const toggle = document.createElement('span');
      toggle.className = 'vt-group-toggle' + (isFolded ? '' : ' vt-group-toggle--open');
      toggle.innerHTML = CHEVRON_SVG;
      content.appendChild(toggle);
    }

    // 分组字段名（取同 key 列的标题，取不到则不展示）
    const fieldTitle = groupField
      ? (this._allColumns.find((c) => c.key === groupField)?.title ??
         this._options.columns.find((c) => c.key === groupField)?.title)
      : undefined;
    if (fieldTitle) {
      const fieldEl = document.createElement('span');
      fieldEl.className = 'vt-group-field';
      fieldEl.textContent = fieldTitle;
      content.appendChild(fieldEl);
    }

    const label = document.createElement('span');
    label.className = 'vt-group-label';
    label.textContent = groupName;
    content.appendChild(label);

    if (groupCount !== undefined) {
      const badge = document.createElement('span');
      badge.className = 'vt-group-count';
      badge.textContent = String(groupCount);
      content.appendChild(badge);
    }

    // 整行可点击折叠/展开
    if (hasKids) {
      td.classList.add('vt-group-cell--clickable');
      td.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFold(key);
      });
    }

    td.appendChild(content);
    tr.appendChild(td);
  }

  // --------------- highlight selection ---------------

  private _onBodyClick(e: MouseEvent): void {
    const td = (e.target as HTMLElement).closest('td.vt-td') as HTMLElement | null;
    const tr = td?.closest('tr.vt-tr') as HTMLElement | null;
    if (!tr) return;

    this._setCurrentCell(tr.dataset.rowKey ?? null, td?.dataset.colKey ?? null);
  }

  /**
   * 落地「当前行 / 当前列 / 当前单元格」三件事。
   *
   * 从 `_onBodyClick` 里抽出来，因为点击不再是唯一入口：`vtCellEditor` 打开编辑器时
   * 也要把那一格标成当前单元格（见 `setActiveCell`）。行/列的两个 class 由
   * `.vt-client--highlight-select-*` 在 CSS 里门控，没开对应选项时写了也不显形，
   * 所以这里无条件维护 —— 状态只有一份，谁开了哪个开关是渲染的事。
   */
  private _setCurrentCell(rowKey: string | null, colKey: string | null): void {
    if (this._selectRowKey !== rowKey) {
      if (this._selectRowKey) {
        const prev = this._tbodyEl.querySelector(`tr[data-row-key="${this._selectRowKey}"]`);
        prev?.classList.remove('current-row');
      }
      this._selectRowKey = rowKey;
      // 按 key 重查而不是复用调用方手上的 `<tr>`：程序化入口（`setActiveCell`）没有那个元素，
      // 而行 DOM 是池化复用的，缓存元素就是 §7.15 那个坑
      if (rowKey) {
        this._tbodyEl
          .querySelector(`tr[data-row-key="${rowKey}"]`)
          ?.classList.add('current-row');
      }
    }

    if (this._selectColKey !== colKey) {
      this._tbodyEl.querySelectorAll('.current-column').forEach((el) =>
        el.classList.remove('current-column'),
      );
      this._selectColKey = colKey;
      if (colKey) {
        this._tbodyEl.querySelectorAll(`td[data-col-key="${colKey}"]`).forEach((el) =>
          el.classList.add('current-column'),
        );
      }
    }

    this._updateActiveCellOverlay();
  }

  /**
   * 设置 / 清除**激活态**（当前单元格描边，`.vt-active-cell-overlay`）。
   *
   * 与 `highlightSelectCell` 是同一份状态、同一个浮层 —— 那个选项只是「点击也算一次
   * 设置」的开关。区别在于本方法**自己保证浮层存在**（没开选项时按需创建），因为它的
   * 主要调用方是 `vtCellEditor`：点开一格的编辑器就该同时看到激活态，不该再要求使用方
   * 记得多配一个 `highlightSelectCell: true`。
   *
   * 传 `null` 清除。描边的跟随（滚动、排序、列窗口变化）已由核心统一处理。
   */
  setActiveCell(rowKey: string | null, colKey: string | null): void {
    if (rowKey && colKey) this._ensureActiveCellOverlay();
    this._setCurrentCell(rowKey, colKey);
  }

  /** 当前激活的单元格；未激活（或只有行没有列）时返回 null */
  getActiveCell(): { rowKey: string; colKey: string } | null {
    if (!this._selectRowKey || !this._selectColKey) return null;
    return { rowKey: this._selectRowKey, colKey: this._selectColKey };
  }

  /**
   * 描边浮层按需创建。
   *
   * `highlightSelectCell` 走的是构建期创建（`_buildDOM`），保持原样；程序化入口可能在
   * 任何时候第一次用到它。挂在 `.vt-client` 上、`z-index: 6`，所以晚于编辑浮层
   * （`.vt-cell-cover`，`z-index: 5`）插入也仍然画在它之上。
   */
  private _ensureActiveCellOverlay(): void {
    if (this._activeCellOverlayEl || !this._clientEl) return;
    this._activeCellOverlayEl = document.createElement('div');
    this._activeCellOverlayEl.className = 'vt-active-cell-overlay';
    this._activeCellOverlayEl.style.display = 'none';
    this._clientEl.appendChild(this._activeCellOverlayEl);
  }

  private _updateActiveCellOverlay(): void {
    if (!this._activeCellOverlayEl) return;
    if (!this._selectRowKey || !this._selectColKey) {
      this._activeCellOverlayEl.style.display = 'none';
      return;
    }

    const td = this._tbodyEl.querySelector(
      `tr[data-row-key="${this._selectRowKey}"] td[data-col-key="${this._selectColKey}"]`,
    ) as HTMLElement | null;
    if (!td) {
      this._activeCellOverlayEl.style.display = 'none';
      return;
    }

    const clientRect = this._clientEl.getBoundingClientRect();
    const tdRect = td.getBoundingClientRect();
    /**
     * 纵向不再加 `scrollTop`：容器的 overflow-y 是 hidden，`scrollTop` 恒为 0
     * （浏览器偶尔因 focus 造成的漂移由 `InputController` 读走并归零）。
     * 两个 rect 之差本来就是「相对容器可视区上缘」的距离，正是浮层需要的值。
     *
     * 横向仍要加 `scrollLeft`：那边保留了原生 scrollport，浮层作为 `.vt-client`
     * 的绝对定位子节点会随内容一起横向滚动，所以 `left` 必须是**内容坐标**。
     */
    this._activeCellOverlayEl.style.top = `${tdRect.top - clientRect.top}px`;
    this._activeCellOverlayEl.style.left = `${tdRect.left - clientRect.left + this._clientEl.scrollLeft}px`;
    this._activeCellOverlayEl.style.width = `${tdRect.width}px`;
    this._activeCellOverlayEl.style.height = `${tdRect.height}px`;
    this._activeCellOverlayEl.style.display = '';
  }

  // --------------- checkbox helpers ---------------

  private _updateHeaderCheckbox(): void {
    if (!this._headerCheckbox) return;
    const total = this._options.list?.length ?? 0;
    const checked = this._checkedRows.size;
    this._headerCheckbox.checked = total > 0 && checked === total;
    this._headerCheckbox.indeterminate = checked > 0 && checked < total;
  }

  private _refreshCheckboxes(): void {
    this._itemPool.forEach((tr, key) => {
      const cb = tr.querySelector<HTMLInputElement>('input.vt-checkbox');
      if (cb) cb.checked = this._checkedRows.has(key);
    });
  }

  private _refreshRadios(): void {
    this._itemPool.forEach((tr, key) => {
      const rd = tr.querySelector<HTMLInputElement>('input.vt-radio');
      if (rd) rd.checked = this._selectedRadioKey === key;
    });
  }

  /** 获取当前单选行数据 */
  getSelectedRadio(): T | null {
    if (this._selectedRadioKey == null) return null;
    const key = this._options.itemKey;
    return (this._options.list ?? []).find((r) => String(r[key]) === this._selectedRadioKey) ?? null;
  }

  /** 设置当前单选行 */
  setSelectedRadio(rowKey: string | null): void {
    this._selectedRadioKey = rowKey;
    this._refreshRadios();
  }

  /** 校验所有数据行，返回未通过项（用于保存前校验） */
  validateAll(): Array<{ row: T; colKey: string; message: string }> {
    const errors: Array<{ row: T; colKey: string; message: string }> = [];
    for (const row of this._options.list ?? []) {
      if ((row as any)._rowType) continue; // 跳过合成行
      for (const col of this._columns) {
        if (!col.validator) continue;
        const r = col.validator(row[col.key], row);
        if (r !== true) errors.push({ row, colKey: col.key, message: r });
      }
    }
    return errors;
  }

  // --------------- column resize ---------------

  private _startResize(e: PointerEvent, col: VirtTableColumn<T>, th: HTMLElement): void {
    const startX = e.clientX;
    const startWidth = th.getBoundingClientRect().width;
    const rootRect = this._rootEl.getBoundingClientRect();
    const colLeft = th.getBoundingClientRect().left - rootRect.left + this._clientEl.scrollLeft;

    this._resizeLine = document.createElement('div');
    this._resizeLine.className = 'vt-resize-line';
    /**
     * 不再写 `top = scrollTop`。指示线挂在 `.vt-root` 上（那一层从不滚动），
     * 而 `scrollTop` 现在恒为 0 —— 这行只剩把线往下推的作用。
     * 可视区上缘就是 `top: 0`，交给 `.vt-resize-line` 自己的 CSS（`top: 0; bottom: 0`）。
     */
    this._resizeLine.style.transform = `translateX(${colLeft + startWidth}px)`;
    this._rootEl.appendChild(this._resizeLine);

    // 走共享的 startDrag：鼠标 / 触屏 / 手写笔一套代码（`.vt-resize-trigger` 上有
    // `touch-action: none`）。threshold 0 = 第一次 move 就跟手，与原来的手感一致。
    startDrag(e, {
      threshold: 0,
      onMove: (ev) => {
        const newW = this._clampWidth(col, startWidth + (ev.clientX - startX));
        if (this._resizeLine) {
          this._resizeLine.style.transform = `translateX(${colLeft + newW}px)`;
        }
      },
      onDrop: (ev) => {
        this._removeResizeLine();
        const newW = this._clampWidth(col, startWidth + (ev.clientX - startX));
        // 处于拉伸状态时先把当前渲染宽度固化为列宽，避免拖拽后再次等比拉伸使列宽偏离落点
        if (this._widthScale !== 1) {
          for (const c of this._columns) c.width = this._colWidth(c);
          this._widthScale = 1;
        }
        col.width = newW;
        this.setColumns([...this._allColumns]);
      },
      // 只是点了一下手柄没拖动，或手势被系统取消：把指示线撤掉，不改列宽
      onCancel: () => this._removeResizeLine(),
    });
  }

  private _clampWidth(col: VirtTableColumn<T>, w: number): number {
    const min = col.minWidth ?? 40;
    const max = col.maxWidth ?? Infinity;
    return Math.max(min, Math.min(max, w));
  }

  private _removeResizeLine(): void {
    if (this._resizeLine) {
      this._resizeLine.remove();
      this._resizeLine = null;
    }
  }

  // --------------- drag reorder ---------------

  /**
   * 通用拖拽：mousedown 后监听 document 的 move/up；超过阈值才判定为拖拽（区分点击）。
   * 复用列宽拖拽的交互骨架，供列/行拖拽排序共用。
   */
  /**
   * 把列移到目标列的前/后。**只允许同一父分组内换位**——跨分组会改变表头结构，
   * 语义不清，直接忽略。成功移动返回 true。
   *
   * 留在核心：依赖 `_allColumns` 列树与 `setColumns` 的重建流程；
   * `vtColumnDrag` 插件只负责拖拽手势与指示线。
   */
  moveColumn(fromKey: string, toKey: string, insertAfter: boolean): boolean {
    if (fromKey === toKey) return false;
    const col = this._findColumnByKey(fromKey);
    const target = this._findColumnByKey(toKey);
    if (!col || !target) return false;

    const siblings = this._findColumnSiblings(col);
    if (!siblings || this._findColumnSiblings(target) !== siblings) return false;

    const from = siblings.indexOf(col);
    const to = siblings.indexOf(target);
    if (from < 0 || to < 0) return false;

    let insertIdx = insertAfter ? to + 1 : to;
    if (from < insertIdx) insertIdx -= 1; // 删除后索引左移
    if (insertIdx === from) return false; // 落点即原位置

    siblings.splice(from, 1);
    siblings.splice(insertIdx, 0, col);
    const next = [...this._allColumns];
    this.setColumns(next);
    this._options.onColumnOrderChange?.(next);
    return true;
  }

  /**
   * 当前行序是否可拖拽重排。排序/筛选/树形/分组下都不行——
   * 那些情况下「视图顺序」与「原始数据顺序」不是一回事，拖拽结果无法预期。
   */
  canReorderRows(): boolean {
    return !(
      this._sortState.length > 0 ||
      this.hasActiveFilters() ||
      this._hasTreeCol ||
      !!this._options.groupConfig ||
      // 自动合并下把一行拖出所属段没有语义
      this._hasAutoMerge()
    );
  }

  /**
   * 把行移到目标行的前/后（作用于 `_originList` 原始顺序）。成功返回 true。
   *
   * 留在核心：依赖 `_originList` 与 `_rebuildData` 管线；
   * `vtRowDrag` 插件只负责手柄、ghost 与指示线。
   */
  moveRow(fromKey: string, toKey: string, insertAfter: boolean): boolean {
    if (fromKey === toKey || !this.canReorderRows()) return false;
    const key = this._options.itemKey;
    const from = this._originList.findIndex((r) => String(r[key]) === fromKey);
    const to = this._originList.findIndex((r) => String(r[key]) === toKey);
    if (from < 0 || to < 0) return false;

    let insertIdx = insertAfter ? to + 1 : to;
    if (from < insertIdx) insertIdx -= 1;
    if (insertIdx === from) return false;

    const next = [...this._originList];
    const [moved] = next.splice(from, 1);
    next.splice(insertIdx, 0, moved);
    this._originList = next;
    this._rebuildData();
    this._options.onRowOrderChange?.(next, from, insertIdx);
    return true;
  }

  private _initFiltersFromChecked(): void {
    let hasInitial = false;
    for (const col of this._columns) {
      if (!col.filters) continue;
      const checkedVals = col.filters.filter((f) => f.checked).map((f) => f.value);
      if (checkedVals.length > 0) {
        this._activeFilters.set(col.key, checkedVals);
        hasInitial = true;
      }
    }
    if (hasInitial) {
      this._rebuildData();
      this._rebuildThead();
    }
  }

  private _syncFilterChecked(col: VirtTableColumn<T>, values: any[]): void {
    if (!col.filters) return;
    const valSet = new Set(values);
    for (const f of col.filters) {
      f.checked = valSet.has(f.value);
    }
  }

  setColumnFilter(colKey: string, values: unknown[]): void {
    const col = this._columns.find((c) => c.key === colKey);
    if (!col) return;
    this._syncFilterChecked(col, values);
    if (values.length === 0) {
      this._activeFilters.delete(colKey);
    } else {
      this._activeFilters.set(colKey, values as any[]);
    }
    this._commitQueryChange('filter', { resetPage: true });
    this._rebuildThead();
    this._options.onFilterChange?.(this.getActiveFilters());
  }

  clearAllFilters(): void {
    for (const col of this._columns) {
      if (col.filters) {
        for (const f of col.filters) f.checked = false;
      }
    }
    this._activeFilters.clear();
    this._commitQueryChange('filter', { resetPage: true });
    this._rebuildThead();
    this._options.onFilterChange?.(this.getActiveFilters());
  }

  getActiveFilters(): Record<string, unknown[]> {
    const result: Record<string, unknown[]> = {};
    for (const [key, values] of this._activeFilters) {
      if (values.length > 0) result[key] = [...values];
    }
    return result;
  }

  // --------------- advanced filter (AND/OR 条件树) ---------------

  /**
   * 设置高级筛选模型（筛选管理器的数据源）。
   * 与列头筛选各自独立，最终 AND 组合；传 null 等于清空高级筛选。
   */
  setFilterModel(model: FilterModel): void {
    this._filterModel = model ? cloneFilterModel(model) : null;
    this._commitQueryChange('filter', { resetPage: true });
    this._rebuildThead();
    this._options.onFilterModelChange?.(this.getFilterModel());
  }

  /** 当前高级筛选模型（深拷贝，改动不影响表格内部状态） */
  getFilterModel(): FilterModel {
    return cloneFilterModel(this._filterModel);
  }

  /** 清空高级筛选（不影响列头筛选） */
  clearFilterModel(): void {
    if (!this._filterModel) return;
    this._filterModel = null;
    this._commitQueryChange('filter', { resetPage: true });
    this._rebuildThead();
    this._options.onFilterModelChange?.(null);
  }

  /** 是否存在任何生效的筛选（列头筛选或高级筛选） */
  hasActiveFilters(): boolean {
    return this._activeFilters.size > 0 || isFilterModelActive(this._filterModel);
  }

  // --------------- cell range selection ---------------

  /**
   * 屏幕坐标 → 单元格坐标。留在核心：依赖 `_rowDataMap` 与列可选判定。
   */
  cellFromPoint(clientX: number, clientY: number): { row: number; col: number } | null {
    const td = document.elementFromPoint(clientX, clientY)?.closest('td.vt-td') as HTMLElement | null;
    if (!td) return null;
    const tr = td.closest('tr.vt-tr') as HTMLElement | null;
    if (!tr) return null;
    const rowKey = tr.dataset.rowKey;
    const colKey = td.dataset.colKey;
    if (rowKey == null || colKey == null) return null;
    const rowData = this._rowDataMap.get(rowKey);
    if (!rowData) return null;
    const col = this._columns.findIndex((c) => c.key === colKey);
    if (col < 0) return null;
    if (!this._isSelectableColumnIndex(col)) return null;
    return { row: rowData.rowIndex, col };
  }

  /**
   * 选区在 `.vt-client` 内的像素矩形。留在核心：横向靠列宽前缀和与固定列偏移
   * （不受占位 merge 影响），纵向靠已渲染行的 DOM 位置。
   *
   * 选区的行都不在当前渲染窗口内时返回 null（调用方应据此隐藏浮层）。
   */
  getSelectionRect(sel: CellSelectionRange): SelectionRect | null {
    const { startRow: r0, endRow: r1, startCol: c0, endCol: c1 } = sel;

    const clientRect = this._clientEl.getBoundingClientRect();
    const scrollLeft = this._clientEl.scrollLeft;
    const leftFixedCount = this._leftFixedCols.length;

    // ── 横向：由列几何算出（免受占位 merge 干扰） ──
    const cCenter0 = c0 - leftFixedCount;
    const cCenter1 = c1 - leftFixedCount;

    let contentLeft: number;
    let contentRight: number;

    if (cCenter0 >= 0) {
      contentLeft = this._leftFixedWidth + (this._colPrefixSums[cCenter0] ?? 0);
    } else {
      contentLeft = scrollLeft + (this._leftFixedOffsets[c0] ?? 0);
    }

    if (cCenter1 >= 0) {
      const nextSum = this._colPrefixSums[cCenter1 + 1]
        ?? this._colPrefixSums[this._colPrefixSums.length - 1]
        ?? 0;
      contentRight = this._leftFixedWidth + nextSum;
    } else {
      const fixedCol = this._leftFixedCols[c1];
      contentRight =
        scrollLeft + (this._leftFixedOffsets[c1] ?? 0) + (fixedCol ? this._colWidth(fixedCol) : 0);
    }

    // ── 纵向：由已渲染行的 DOM 位置算出 ──
    let topPx = Infinity;
    let bottomPx = -Infinity;
    let found = false;

    const trs = this._tbodyEl.querySelectorAll<HTMLElement>('tr.vt-tr');
    for (const tr of trs) {
      const rowKey = tr.dataset.rowKey;
      if (!rowKey) continue;
      const rd = this._rowDataMap.get(rowKey);
      if (!rd || rd.rowIndex < r0 || rd.rowIndex > r1) continue;

      const trRect = tr.getBoundingClientRect();
      topPx = Math.min(topPx, trRect.top);
      bottomPx = Math.max(bottomPx, trRect.bottom);
      found = true;
    }

    if (!found) return null;

    const width = contentRight - contentLeft;
    const height = bottomPx - topPx;
    if (width <= 0 || height <= 0) return null;

    return {
      // 不再加 `scrollTop`（overflow-y: hidden，恒为 0）：两个 rect 之差就是
      // 相对容器可视区上缘的距离，而框选浮层正是按这个定位的
      top: topPx - clientRect.top,
      left: contentLeft,
      width,
      height,
    };
  }

  /**
   * 把选区按合并单元格向外扩张成完整矩形。留在核心：依赖 `_merges` 与固定列偏移。
   */
  expandSelectionForMerges(sel: CellSelectionRange): CellSelectionRange {
    const hasAuto = this._hasAutoMerge();
    if (this._merges.length === 0 && !hasAuto) return sel;
    const offset = this._leftFixedCols.length;
    let sr = sel.startRow;
    let sc = sel.startCol - offset;
    let er = sel.endRow;
    let ec = sel.endCol - offset;
    let changed = true;
    while (changed) {
      changed = false;
      for (const m of this._merges) {
        const mr = m.rowIndex + m.rowspan - 1;
        const mc = m.colIndex + m.colspan - 1;
        if (sr <= mr && er >= m.rowIndex && sc <= mc && ec >= m.colIndex) {
          if (m.rowIndex < sr) { sr = m.rowIndex; changed = true; }
          if (mr > er) { er = mr; changed = true; }
          if (m.colIndex < sc) { sc = m.colIndex; changed = true; }
          if (mc > ec) { ec = mc; changed = true; }
        }
      }
      if (!hasAuto) continue;
      // 自动合并查**真实段**而不是渲染窗口的裁剪结果：选区可以远超窗口，
      // 用裁剪结果会把选区截在窗口边界上。
      for (const runs of this._mergeRuns) {
        if (runs.colIndex < sc || runs.colIndex > ec) continue;
        const top = findMergeRun(runs, sr);
        if (top && top.start < sr) { sr = top.start; changed = true; }
        const bottom = findMergeRun(runs, er);
        if (bottom && bottom.end > er) { er = bottom.end; changed = true; }
      }
    }
    return { startRow: sr, startCol: sc + offset, endRow: er, endCol: ec + offset };
  }

  /**
   * 静态合并配置（`options.merges` / `setMerges()` 传入的那份），返回副本。
   *
   * **不含**列 `mergeKey` 产出的自动合并 —— 那部分是派生状态、跨度随数据变，
   * 要拿真实合并块用 `getEffectiveMerges()`。
   */
  getMerges(): MergeCell[] {
    return this._merges.slice();
  }

  /**
   * 指定行区间内**实际生效**的合并块：静态 `merges` + 自动合并解析出的真实段。
   *
   * 与渲染内部用的裁剪结果不同，这里给的是段的**真实起止**，不受渲染窗口影响，
   * 适合导出、自定义复制等需要还原合并结构的场景。
   *
   * 不传区间则覆盖整份显示列表 —— 自动合并的段数与行数同阶，百万行会产出十万级
   * 数组，按需传区间。
   */
  getEffectiveMerges(rowBegin = 0, rowEnd?: number): MergeCell[] {
    const listLen = (this._options.list ?? []).length;
    const end = rowEnd ?? (listLen > 0 ? listLen - 1 : 0);
    const out = this._merges.filter(
      (m) => m.rowIndex <= end && m.rowIndex + m.rowspan - 1 >= rowBegin,
    );
    if (this._hasAutoMerge()) {
      out.push(...mergeRunsInRange(this._mergeRuns, rowBegin, end));
    }
    return out;
  }

  private _isSelectableColumnIndex(colIndex: number): boolean {
    const col = this._columns[colIndex];
    if (!col) return false;
    return col.type !== 'index';
  }

  /** 可参与框选/复制的列索引（跳过序号列等功能列） */
  getSelectableColumnIndexes(): number[] {
    const result: number[] = [];
    for (let i = 0; i < this._columns.length; i++) {
      if (this._isSelectableColumnIndex(i)) result.push(i);
    }
    return result;
  }

  // --------------- 查询状态：搜索词 ---------------

  /**
   * 设置搜索词。它是查询状态（进 `RemoteQuery.search` 参与服务端取数），
   * 由 `vtSearch` 插件在输入时写入。不会自动触发重新取数。
   */
  setSearchTerm(term: string): void {
    this._searchTerm = term;
  }

  getSearchTerm(): string {
    return this._searchTerm;
  }

  // --------------- keyboard navigation ---------------

  // --------------- search ---------------

  /**
   * 创建无限滚动状态条：与分页条同款，作为 `_rootEl` 的 flow 子节点贴在滚动容器上下沿
   * （`.vt-root--infinite` 开 flex 列布局）。
   *
   * 不能放进 `.vt-client` 内：那里 `.vt-table` 的底边是「当前渲染窗口末尾」而非
   * 「数据末尾」（真实高度由 float 的 `.vt-skeleton` 撑开），状态条会在中途滚动时露出来。
   */
  private _buildInfiniteBars(): void {
    this._rootEl.classList.add('vt-root--infinite');
    if (this._infiniteUp) {
      const bar = document.createElement('div');
      bar.className = 'vt-infinite-bar vt-infinite-bar--top';
      bar.style.visibility = 'hidden';
      this._rootEl.insertBefore(bar, this._clientEl);
      this._infiniteHeaderEl = bar;
    }
    if (this._infiniteDown) {
      const bar = document.createElement('div');
      bar.className = 'vt-infinite-bar vt-infinite-bar--bottom';
      bar.style.visibility = 'hidden';
      // 分页条永远在最下面，故底部状态条插在它之前
      if (this._paginationEl) this._rootEl.insertBefore(bar, this._paginationEl);
      else this._rootEl.appendChild(bar);
      this._infiniteFooterEl = bar;
    }
  }

  /** 重绘上下状态条：loading / 加载更多按钮 / 没有更多 / 错误+重试 四态 */
  private _renderInfiniteBars(): void {
    if (!this._remote) return;
    const st = this._remote.getState();
    const loc = this._locale.infinite;
    const inf = this._options.infinite;
    const manual = !!inf?.manual;
    const showNoMore = inf?.showNoMore !== false;

    if (this._infiniteFooterEl) {
      this._paintInfiniteBar(this._infiniteFooterEl, {
        loading: st.loadingMore,
        hasMore: st.hasMore,
        // 首屏空数据时不显示「没有更多」（空态由 .vt-empty 表达）
        empty: st.loadedCount === 0,
        error: !!st.error && !st.loadingMore && !st.loading,
        manual,
        showNoMore,
        loc,
        onLoad: () => this.loadMore(),
        onRetry: () => this.retryLoad(),
      });
    }
    if (this._infiniteHeaderEl) {
      this._paintInfiniteBar(this._infiniteHeaderEl, {
        loading: st.loadingPrev,
        hasMore: st.hasPrev,
        empty: st.loadedCount === 0,
        error: !!st.error && !st.loadingPrev && !st.loading,
        manual,
        showNoMore,
        loc,
        onLoad: () => this.loadPrev(),
        onRetry: () => this.retryLoad(),
      });
    }
  }

  /** 单条状态条的内容渲染：形态由 `infiniteBarView` 纯函数决定，这里只搬运 DOM */
  private _paintInfiniteBar(
    bar: HTMLDivElement,
    o: {
      loading: boolean;
      hasMore: boolean;
      empty: boolean;
      error: boolean;
      manual: boolean;
      showNoMore: boolean;
      loc: VirtTableLocale['infinite'];
      onLoad: () => void;
      onRetry: () => void;
    },
  ): void {
    const view = infiniteBarView(o);
    bar.innerHTML = '';
    bar.classList.remove(
      'vt-infinite-bar--loading',
      'vt-infinite-bar--error',
      'vt-infinite-bar--done',
    );
    bar.removeAttribute('aria-busy');

    // 用 visibility 而非 display 隐藏：状态条常驻占位，出现/消失不会改变滚动容器
    // 高度（否则每次加载都挤压 .vt-client，虚拟滚动会跟着抖一下）
    if (view === 'hidden') {
      bar.style.visibility = 'hidden';
      return;
    }
    bar.style.visibility = '';

    const addText = (text: string): void => {
      const el = document.createElement('span');
      el.className = 'vt-infinite-text';
      el.textContent = text;
      bar.appendChild(el);
    };
    const addBtn = (text: string, onClick: () => void): void => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vt-infinite-btn';
      btn.textContent = text;
      btn.addEventListener('click', onClick);
      bar.appendChild(btn);
    };

    switch (view) {
      case 'loading': {
        bar.classList.add('vt-infinite-bar--loading');
        bar.setAttribute('aria-busy', 'true');
        const spinner = document.createElement('span');
        spinner.className = 'vt-spinner vt-spinner--sm';
        bar.appendChild(spinner);
        addText(o.loc.loading);
        break;
      }
      case 'error':
        bar.classList.add('vt-infinite-bar--error');
        addText(o.loc.error);
        addBtn(o.loc.retry, o.onRetry);
        break;
      case 'button':
        addBtn(o.loc.loadMore, o.onLoad);
        break;
      case 'done':
        bar.classList.add('vt-infinite-bar--done');
        addText(o.loc.noMore);
        break;
    }
  }

  /** 创建分页条骨架（仅服务端 UI 模式；作为 _rootEl 最后一个 flow 子节点） */
  private _buildPagination(): void {
    const bar = document.createElement('div');
    bar.className = 'vt-pagination';
    this._rootEl.classList.add('vt-root--paginated');
    this._rootEl.appendChild(bar);
    this._paginationEl = bar;
    this._renderPagination();
  }

  /**
   * 全量重绘分页条内容：总数、每页条数选择器、上/下页、页码(带省略号)、跳页输入。
   * 每次重建内部元素并重新绑定事件，无需追踪单个控件引用，也不会泄漏监听。
   */
  private _renderPagination(): void {
    const bar = this._paginationEl;
    if (!bar) return;
    const loc = this._locale.pagination;
    const count = pageCount(this._total, this._pageSize);
    bar.innerHTML = '';

    // 总数
    const total = document.createElement('span');
    total.className = 'vt-pagination-total';
    total.textContent = loc.total(this._total);
    bar.appendChild(total);

    // 每页条数选择器
    const sizeSel = document.createElement('select');
    sizeSel.className = 'vt-pagination-size';
    const sizes = this._pageSizes.includes(this._pageSize)
      ? this._pageSizes
      : [...this._pageSizes, this._pageSize].sort((a, b) => a - b);
    for (const s of sizes) {
      const opt = document.createElement('option');
      opt.value = String(s);
      opt.textContent = loc.pageSizeUnit(s);
      if (s === this._pageSize) opt.selected = true;
      sizeSel.appendChild(opt);
    }
    sizeSel.addEventListener('change', () => {
      this.setPageSize(Number(sizeSel.value));
    });
    bar.appendChild(sizeSel);

    // 上一页
    const prev = document.createElement('button');
    prev.className = 'vt-pagination-btn vt-pagination-prev';
    prev.textContent = loc.prev;
    prev.disabled = this._page <= 1;
    prev.addEventListener('click', () => this._goToPage(this._page - 1));
    bar.appendChild(prev);

    // 页码（带省略号）
    for (const item of buildPagerItems(this._page, count)) {
      if (item === 'ellipsis') {
        const el = document.createElement('span');
        el.className = 'vt-pagination-ellipsis';
        el.textContent = '···';
        bar.appendChild(el);
      } else {
        const btn = document.createElement('button');
        btn.className = 'vt-pagination-btn';
        if (item === this._page) btn.classList.add('vt-pagination-btn--active');
        btn.textContent = String(item);
        btn.addEventListener('click', () => this._goToPage(item));
        bar.appendChild(btn);
      }
    }

    // 下一页
    const next = document.createElement('button');
    next.className = 'vt-pagination-btn vt-pagination-next';
    next.textContent = loc.next;
    next.disabled = this._page >= count;
    next.addEventListener('click', () => this._goToPage(this._page + 1));
    bar.appendChild(next);

    // 跳至指定页
    const jumpLabel = document.createElement('span');
    jumpLabel.className = 'vt-pagination-jump-label';
    jumpLabel.textContent = loc.jumpTo;
    bar.appendChild(jumpLabel);

    const jumpInput = document.createElement('input');
    jumpInput.type = 'number';
    jumpInput.min = '1';
    jumpInput.max = String(count);
    jumpInput.className = 'vt-pagination-jump';
    jumpInput.value = String(this._page);
    jumpInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this._goToPage(Number(jumpInput.value));
      }
    });
    bar.appendChild(jumpInput);

    if (loc.jumpUnit) {
      const jumpUnit = document.createElement('span');
      jumpUnit.className = 'vt-pagination-jump-unit';
      jumpUnit.textContent = loc.jumpUnit;
      bar.appendChild(jumpUnit);
    }
  }

  /** 内部跳页：clamp 后若页码变化则重绘并派发 onPageChange，否则仅重绘同步输入框 */
  private _goToPage(page: number): void {
    const target = clampPage(page, this._total, this._pageSize);
    if (target === this._page) {
      this._renderPagination();
      return;
    }
    this._page = target;
    this._renderPagination();
    // 客户端分页：换页就是换切片，走本地管线
    if (this._clientPage) {
      this._rebuildData();
      this.scrollToTop();
    }
    // 有取数实现时由表格取数（replace 语义）；否则维持「派发事件、用户自行取数」
    if (this._hasFetcher && this._serverPage) this._remote?.goToPage(target);
    this._options.onPageChange?.(this._page, this._pageSize);
  }

}

/**
 * 插件注入的命令式 API 的类型扩展位。
 *
 * 这些方法在运行时由 `PluginHandle.api` 合并到实例上（未装载对应插件时不存在），
 * 通过 class / interface 声明合并让它们在类型上可见。
 *
 * 自定义插件可以这样补声明：
 * ```ts
 * declare module '@virt-table/vanilla' {
 *   interface VirtTablePluginApi { myPluginDoSomething(): void }
 * }
 * ```
 */
export interface VirtTablePluginApi {
  /** 关闭右键菜单（`vtContextMenu`） */
  hideContextMenu(): void;

  /** 导出为 CSV（`vtExport`） */
  exportCsv(opts?: ExportOptions): void;
  /** 导出为 Excel（HTML 表格 .xls）（`vtExport`） */
  exportExcel(opts?: ExportOptions): void;
  /** 打印全表（`vtExport`） */
  print(opts?: { title?: string }): void;

  /** 打开搜索框并聚焦（`vtSearch`） */
  openSearch(): void;
  /** 关闭搜索框并清空命中态与搜索词（`vtSearch`） */
  closeSearch(): void;
  /** 直接以某个词搜索（`vtSearch`） */
  search(term: string): void;
  /** 跳到下一个命中项（`vtSearch`） */
  nextMatch(): void;
  /** 跳到上一个命中项（`vtSearch`） */
  prevMatch(): void;
  /** 当前全部命中项（`vtSearch`） */
  getSearchMatches(): SearchMatch[];

  /** 打开/关闭列设置面板（`vtColumnPanel`） */
  toggleColumnPanel(anchor?: HTMLElement): void;
  /** 打开列设置面板（`vtColumnPanel`） */
  openColumnPanel(anchor?: HTMLElement): void;
  /** 关闭列设置面板（`vtColumnPanel`） */
  closeColumnPanel(): void;
  /** 列设置面板是否打开（`vtColumnPanel`） */
  isColumnPanelOpen(): boolean;

  /** 当前框选区域（`vtCellSelection`） */
  getCellSelection(): CellSelectionRange | null;
  /** 程序化设置选区（`vtCellSelection`） */
  setCellSelection(range: CellSelectionRange | null): void;
  /** 清除选区（`vtCellSelection`） */
  clearCellSelection(): void;

  /** 打开某单元格的编辑器（`vtCellEditor`） */
  openCellEditor(rowIndex: number, colIndex: number): void;
  /** 关闭编辑浮层（`vtCellEditor`） */
  closeCellEditor(): void;
  /** 是否有单元格处于编辑态（`vtCellEditor`） */
  isCellEditing(): boolean;

  /** 打开某列的筛选面板（`vtColumnFilter`） */
  openColumnFilter(colKey: string): void;
  /** 关闭筛选面板（`vtColumnFilter`） */
  closeColumnFilter(): void;

  /**
   * 用一句自然语言查询表格（`vtAIQuery`）：交给 `resolve` 回调拿到模型产物，
   * 校验纠错后经 `setState()` 落地。`resolve` 抛错时本方法一并 reject。
   */
  askAITable(text: string): Promise<AIQueryResult>;
  /** 跳过模型，直接应用一个查询（同样走校验）（`vtAIQuery`） */
  applyAIQuery(query: AIQuery): AIQueryResult;
  /** 撤销上一次 AI 应用，恢复到应用前的视图状态（`vtAIQuery`） */
  undoAIQuery(): boolean;
  /** 当前表格对模型的结构化描述（`vtAIQuery`） */
  getAITableSchema(): AITableSchema;
  /** 拼好的 prompt 上下文，可直接塞进 system message（`vtAIQuery`） */
  getAIPromptContext(): string;
  /** 可直接用作 tool / function calling `input_schema` 的 JSON Schema（`vtAIQuery`） */
  getAIToolSchema(): Record<string, unknown>;
  /** 打开自然语言查询条（`vtAIQuery`） */
  openAIQueryBar(): void;
  /** 关闭查询条，并作废在途请求（`vtAIQuery`） */
  closeAIQueryBar(): void;
  /** 开关查询条（`vtAIQuery`） */
  toggleAIQueryBar(): void;

  /**
   * 消费一个流并逐帧落进表格（`vtAIStream`）。吃任何 `AsyncIterable`：
   * SSE、`ReadableStream`、异步生成器都行，每个 yield 是一行或一批。
   */
  consumeAIStream<R = any>(
    source: AsyncIterable<AIStreamChunk<R>> | Iterable<AIStreamChunk<R>>,
    opts?: AIStreamConsumeOptions,
  ): Promise<void>;
  /** 开始新一轮流式接收，重置计数与跟随态（`vtAIStream`） */
  startAIStream(): void;
  /** 推入一行或一批，攒到下一帧统一落地（`vtAIStream`） */
  pushAIStreamRows<R = any>(rows: AIStreamChunk<R>): void;
  /** 结束接收，落掉缓冲里的尾巴（`vtAIStream`） */
  endAIStream(): void;
  /** 中断接收；已收到的行保留（`vtAIStream`） */
  abortAIStream(err?: unknown): void;
  /** 当前流式状态（`vtAIStream`） */
  getAIStreamState(): AIStreamState;
  /** 是否正跟随底部（`vtAIStream`） */
  isAIStreamFollowingBottom(): boolean;
  /** 手动开关底部跟随（`vtAIStream`） */
  setAIStreamFollowBottom(on: boolean): void;

  /** 手动为指定行（默认当前渲染窗口内的行）计算 AI 列（`vtAIColumn`） */
  computeAIColumn(rowKeys?: string[]): void;
  /** 忽略缓存强制重算一格（`vtAIColumn`） */
  recomputeAIColumn(rowKey: string): void;
  /** 清缓存；不传 rowKey 则清全部并中止在途请求（`vtAIColumn`） */
  clearAIColumn(rowKey?: string): void;
  /** 某格的计算状态（`vtAIColumn`） */
  getAIColumnState(rowKey: string): AIColumnCellState | undefined;
  /** 已算出的值（rowKey → 文本），只含成功的格子（`vtAIColumn`） */
  getAIColumnValues(): Record<string, string>;
  /** 计数：已完成 / 失败 / 在途 / 排队（`vtAIColumn`） */
  getAIColumnStats(): { done: number; error: number; inflight: number; queued: number };
}

// 与上面的 class 同名声明合并：插件 API 在类型上挂到实例，运行时由 _setupPlugins 注入
export interface VirtTable<T extends Record<string, any>> extends VirtTablePluginApi {}
