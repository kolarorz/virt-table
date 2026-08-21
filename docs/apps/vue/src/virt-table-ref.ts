/**
 * `VirtTableVue` 通过 `expose()` 暴露的实例方法（含插件注入的命令式 API）。
 *
 * 为什么要手写一份：Vue 的 `expose()` 类型推不到 `ref<T>` 上，demo 里 `tableRef.value?.xxx()`
 * 拿不到任何提示。React 侧由包直接导出 `VirtTableRef`，这里是它的对位物 ——
 * 新增能力时两边一起补，避免 demo 里到处 `as any`。
 *
 * 与 `packages/vue/src/index.ts` 的 `expose(withPluginApi(...))` 一一对应；
 * 插件 API（搜索/导出/框选/列面板/AI/流式…）未装载对应插件时运行时为 undefined，
 * 所以调用处照常用可选链。
 */
export type VirtTableVueInstance = {
  getTable: () => any;
  // ---- 滚动 ----
  scrollToIndex: (index: number) => void;
  scrollIntoView: (index: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  scrollToOffset: (offset: number) => void;
  scrollToCell: (row: number, col: number) => void;
  // ---- 数据 / 渲染 ----
  reset: () => void;
  setList: (list: any[]) => void;
  setCellRender: (rowKey: string, colKey: string, config: any | null) => void;
  setCellRenders: (
    entries: Array<{ rowKey: string; colKey: string; config: any | null }>,
  ) => void;
  forceUpdate: () => void;
  // ---- 列 ----
  setColumns: (columns: any[]) => void;
  setColumnVisible: (colKey: string, visible: boolean) => void;
  getVisibleColumns: () => any[];
  getLeafColumns: () => any[];
  getHeaderDepth: () => number;
  // ---- 合并 ----
  setMerges: (merges: any[]) => void;
  getMerges: () => any[] | undefined;
  getEffectiveMerges: (rowBegin?: number, rowEnd?: number) => any[] | undefined;
  setHeaderMerges: (merges: any[], headerData?: string[][]) => void;
  setFooterData: (data: string[][], merges?: any[]) => void;
  // ---- 选择 ----
  getCheckedRows: () => any[];
  getCheckedKeys: () => string[];
  setCheckedRows: (keys: string[]) => void;
  clearCheckedRows: () => void;
  getSelectedRadio: () => any | null;
  setSelectedRadio: (rowKey: string | null) => void;
  // ---- 激活态 / 视图状态 ----
  setActiveCell: (rowKey: string | null, colKey: string | null) => void;
  getActiveCell: () => { rowKey: string; colKey: string } | null;
  getState: () => any;
  setState: (state: any) => boolean | undefined;
  // ---- 展开 / 树形 ----
  toggleExpand: (rowKey: string) => void;
  toggleFold: (rowKey: string) => void;
  isFolded: (rowKey: string) => boolean | undefined;
  expandAll: () => void;
  collapseAll: () => void;
  // ---- 筛选 ----
  setColumnFilter: (key: string, vals: any[]) => void;
  clearAllFilters: () => void;
  getActiveFilters: () => Record<string, any[]>;
  setFilterModel: (model: any) => void;
  getFilterModel: () => any;
  clearFilterModel: () => void;
  hasActiveFilters: () => boolean;
  // ---- 排序 ----
  sort: (colKey: string, order: 'asc' | 'desc' | null) => void;
  clearSort: () => void;
  getSortState: () => any[];
  // ---- 加载态 / 主题 / 国际化 / 校验 ----
  setLoading: (loading: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLocale: (locale: any) => void;
  getLocale: () => any;
  validateAll: () => Array<{ row: any; colKey: string; message: string }>;
  // ---- 固定行 / 分页 ----
  setPinnedRows: (top?: any[], bottom?: any[]) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setTotal: (total: number) => void;
  getPagination: () => { page: number; pageSize: number; total: number };
  // ---- 服务端数据 / 无限滚动 ----
  reload: () => void;
  refresh: () => void;
  loadMore: () => void;
  loadPrev: () => void;
  retryLoad: () => void;
  getRemoteState: () => any;
  setLoadData: (loadData: any) => void;
  appendRows: (rows: any[]) => void;
  prependRows: (rows: any[]) => void;
  setHasMore: (hasMore: boolean, direction?: 'down' | 'up') => void;
  setCursor: (cursor: string | null, direction?: 'down' | 'up') => void;
  // ---- 树形子节点懒加载 ----
  loadChildrenFor: (rowKey: string) => void;
  resetLazyNode: (rowKey: string, clearChildren?: boolean) => void;
  // ---- 插件注入（未装载对应插件时为 undefined） ----
  hideContextMenu: () => void;
  exportCsv: (opts?: any) => void;
  exportExcel: (opts?: any) => void;
  print: (opts?: { title?: string }) => void;
  openSearch: () => void;
  closeSearch: () => void;
  search: (term: string) => void;
  nextMatch: () => void;
  prevMatch: () => void;
  getSearchMatches: () => any[];
  toggleFieldConfig: (anchor?: HTMLElement) => void;
  openFieldConfig: (anchor?: HTMLElement) => void;
  closeFieldConfig: () => void;
  isFieldConfigOpen: () => boolean;
  // ---- 工具栏（vtToolbar）----
  toggleToolbarPanel: (key: string, anchor?: HTMLElement) => void;
  openToolbarPanel: (key: string, anchor?: HTMLElement) => void;
  closeToolbarPanel: () => void;
  isToolbarPanelOpen: (key?: string) => boolean;
  /** 返回反注册函数 —— 组件卸载时要调，否则热更新会越加越多 */
  registerToolbarItem: (item: any) => () => void;
  refreshToolbar: () => void;
  getCellSelection: () => { startRow: number; startCol: number; endRow: number; endCol: number } | null;
  setCellSelection: (range: any | null) => void;
  clearCellSelection: () => void;
  openCellEditor: (rowIndex: number, colIndex: number) => void;
  closeCellEditor: () => void;
  isCellEditing: () => boolean;
  openColumnFilter: (colKey: string) => void;
  closeColumnFilter: () => void;
  // vtAIQuery
  askAITable: (text: string) => Promise<any>;
  applyAIQuery: (query: any) => any;
  undoAIQuery: () => boolean;
  getAITableSchema: () => any;
  getAIPromptContext: () => string;
  getAIToolSchema: () => Record<string, unknown>;
  openAIQueryBar: () => void;
  closeAIQueryBar: () => void;
  toggleAIQueryBar: () => void;
  // vtAIStream
  consumeAIStream: (source: any, opts?: any) => Promise<void>;
  startAIStream: () => void;
  pushAIStreamRows: (rows: any) => void;
  endAIStream: () => void;
  abortAIStream: (err?: unknown) => void;
  getAIStreamState: () => any;
  isAIStreamFollowingBottom: () => boolean;
  setAIStreamFollowBottom: (on: boolean) => void;
  // vtAIColumn
  computeAIColumn: (rowKeys?: string[]) => void;
  recomputeAIColumn: (rowKey: string) => void;
  clearAIColumn: (rowKey?: string) => void;
  getAIColumnState: (rowKey: string) => any;
  getAIColumnValues: () => Record<string, string>;
  getAIColumnStats: () => { done: number; error: number; inflight: number; queued: number };
};
