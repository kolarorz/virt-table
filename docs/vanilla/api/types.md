# 类型定义

对外导出的类型。三端共用同一份（React / Vue 只改渲染函数的返回类型）。

```ts
interface CellRenderContext<T> {
  value: T[keyof T];
  row: T;
  rowIndex: number;
  column: VirtTableColumn<T>;
}

interface CellEditContext<T> extends CellRenderContext<T> {
  el: HTMLElement;
}

interface HeaderRenderContext<T> {
  column: VirtTableColumn<T>;
}

interface ExpandRenderContext<T> {
  column: VirtTableColumn<T>;
  row: T;
}

interface VirtTableColumn<T = any> {
  key: string;
  title: string;
  /** 列宽（px）；分组节点可填 0，宽度恒等于可见子列之和 */
  width: number;
  /** 子列 —— 配置它即成为多级分组表头的分组节点，叶子才是数据列 */
  children?: VirtTableColumn<T>[];
  /** 多级分组表尾：该节点表尾格的静态内容 */
  footerValue?: string | number;
  /** 多级分组表尾：该节点表尾格的自定义渲染 */
  renderFooter?: (ctx: FooterRenderContext<T>) => string | HTMLElement;
  fixed?: 'left' | 'right';
  type?: 'index' | 'checkbox' | 'expand' | 'tree' | 'radio' | 'drag';
  /** 内容类型；优先级低于同级 render，高于表级兜底与默认取值 */
  cellType?: CellContentType;
  render?: (ctx: CellRenderContext<T>) => string | HTMLElement;
  renderEditor?: (ctx: CellEditContext<T>) => HTMLElement | null | void;
  /** 编辑浮层是否替这一列画外观，默认 true；第三方组件自带外观时设 false */
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
  resizable?: boolean;
  minWidth?: number;
  maxWidth?: number;
  filters?: Array<{ label: string; value: unknown; checked?: boolean }>;
  filterMultiple?: boolean;
  filterMethod?: (value: unknown, row: T) => boolean;
}

interface VirtTableOptions<T extends Record<string, any>> extends Omit<
  VirtListOptions<T>,
  'horizontal'
> {
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
  /** 表级内容类型兜底（内容层最低一级；刻意没有表级 render） */
  cellType?: CellContentType;
  textOverflow?: 'ellipsis' | 'tooltip';
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
  onCellSelectionChange?: (
    range: {
      startRow: number;
      startCol: number;
      endRow: number;
      endCol: number;
    } | null,
  ) => void;
  plugins?: VirtTablePlugin<T>[];
  onFilterChange?: (filters: Record<string, unknown[]>) => void;
  filterModel?: FilterModel;
  onFilterModelChange?: (model: FilterModel) => void;
  onCheckChange?: (checked: boolean, row: T) => void;
  onCheckAll?: (checked: boolean) => void;
  onExpandChange?: (row: T, expandedKeys: string[]) => void;
  onTreeToggle?: (row: T, expanded: boolean) => void;
  onGroupToggle?: (row: T, expanded: boolean) => void;
  onRowRemoved?: (tr: HTMLTableRowElement) => void;
}

type CellContentType = 'text' | 'number' | 'rich-text' | 'image' | 'option' | 'checkbox';

/**
 * 单元格级渲染配置（`setCellRender` 的入参）。与列级**同形**：内容层的每个粒度都
 * 接受 `render` 与 `cellType` 两种来源。`render` / `cellType` 走同一条链，
 * `resolveCellRender()` 返回时两者最多只有一个有值。
 */
interface CellRenderConfig<T = any> {
  render?: (ctx: CellRenderContext<T>) => string | HTMLElement;
  cellType?: CellContentType;
  renderEditor?: (ctx: CellEditContext<T>) => HTMLElement | null | void;
}

interface MergeCell {
  rowIndex: number;
  colIndex: number;
  rowspan: number;
  colspan: number;
}

interface ContextMenuItem {
  label: string;
  action: () => void;
  disabled?: boolean;
  divider?: boolean;
}

interface ContextMenuContext<T = any> {
  rowIndex: number;
  colIndex: number;
  row: T;
  column: VirtTableColumn<T>;
  selection: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null;
}

interface ClipboardCopyContext<T = any> {
  selection: ClipboardSelectionRange;
  rows: string[][];
  columnIndexes: number[];
  list: T[];
}

interface ClipboardCopyResult {
  text: string;
  payload?: unknown;
}

interface ClipboardPasteContext<T = any> {
  selection: ClipboardSelectionRange;
  text: string;
  rows: string[][];
  payload: unknown | null;
  columnIndexes: number[];
  list: T[];
  setList: (list: T[]) => void;
}

interface VirtTableEvents<
  T extends Record<string, any>,
> extends VirtListEvents<T> {}

// ---- 服务端数据 / 无限滚动 ----

interface DataRequest {
  page: number;          // 目标页码（1 基）
  pageSize: number;
  offset: number;        // main 为 (page-1)*pageSize；追加时为已加载条数
  cursor: string | null;      // 向下游标
  prevCursor: string | null;  // 向上游标
  loadedCount: number;
  sort: SortSpec[];
  filters: Record<string, unknown[]>;
  filterModel: FilterModel;
  search: string;
  reason: 'init' | 'reload' | 'refresh' | 'page' | 'sort' | 'filter'
        | 'append' | 'prepend' | 'retry';
  channel: 'main' | 'more' | 'prev';
  signal: AbortSignal;
}

interface DataResponse<T> {
  rows: T[];
  total?: number;
  cursor?: string | null;
  prevCursor?: string | null;
  hasMore?: boolean;
  hasPrev?: boolean;
  footerData?: string[][];   // 服务端聚合行，直接接管表尾
}

// 受控层上下文 = DataRequest + 交付回调
interface LoadMoreContext<T> extends DataRequest {
  done: (rows?: T[], meta?: Omit<DataResponse<T>, 'rows'>) => void;
  fail: (err?: unknown) => void;
}

interface RemoteState {
  page: number;
  pageSize: number;
  total: number;         // 未知时为 -1（TOTAL_UNKNOWN）
  cursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
  hasPrev: boolean;
  loading: boolean;      // 首屏/换参/翻页（全屏遮罩）
  loadingMore: boolean;  // 向下追加（底部状态条）
  loadingPrev: boolean;  // 向上追加（顶部状态条）
  error: unknown | null;
  loadedCount: number;
  initialized: boolean;
}
```
