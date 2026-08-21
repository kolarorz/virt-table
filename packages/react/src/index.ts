import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import {
  VirtTable,
  type MergeCell,
  type VirtTableColumn,
  type VirtTableOptions,
  type CellRenderConfig,
  type CellRenderContext,
  type CellEditContext,
  type CellContentType,
  type HeaderRenderContext,
  type ExpandRenderContext,
  type FooterRenderContext,
  type SortOrder,
  type SortSpec,
  type FilterModel,
  type VirtTableLocale,
  type DeepPartial,
  type RemoteState,
  type DataRequest,
  type DataResponse,
  type VirtTablePlugin,
  type VirtTablePluginApi,
  type VirtTableState,
} from '@virt-table/vanilla';

export type { VirtTableOptions, VirtTableColumn, MergeCell, CellRenderConfig, CellContentType, VirtTableRowExtras, RowDropTarget, RowMoveDetail, CellRenderContext, CellEditContext, HeaderRenderContext, ExpandRenderContext, FooterRenderContext, SortOrder, SortSpec, FilterType, VirtTableLocale } from '@virt-table/vanilla';
export type { ExportOptions } from '@virt-table/vanilla/plugins';
export { zhCN, enUS } from '@virt-table/vanilla';
export type { VirtTableState, VirtTableColumnState } from '@virt-table/vanilla';
// 插件机制：插件本身与框架无关，直接透传 vanilla 的实现与类型
export {
  vtContextMenu,
  vtExport,
  vtClipboard,
  vtSearch,
  vtFieldConfig,
  vtFilterConfig,
  vtGroupConfig,
  vtSortConfig,
  vtToolbarPanels,
  vtRowHeightConfig,
  vtToolbar,
  vtCellSelection,
  vtKeyboardNav,
  vtCellEditor,
  vtColumnFilter,
  vtColumnDrag,
  vtRowDrag,
  vtAIQuery,
  vtAIStream,
  vtAIColumn,
} from '@virt-table/vanilla/plugins';
export type {
  VirtTablePlugin,
  VirtTablePluginApi,
  PluginContext,
  PluginHandle,
  PluginHooks,
  CellSelectionRange,
  SelectionRows,
  CellSelectionService,
  SelectionRect,
} from '@virt-table/vanilla';
export type {
  ContextMenuProvider,
  ContextMenuContext,
  ContextMenuItem,
  ClipboardOptions,
  ClipboardSelectionRange,
  ClipboardCopyContext,
  ClipboardCopyResult,
  ClipboardPasteContext,
  SearchOptions,
  SearchMatch,
  FieldConfigOptions,
  FilterConfigOptions,
  GroupConfigOptions,
  SortConfigOptions,
  ToolbarPanelsOptions,
  RowHeightConfigOptions,
  RowHeightLevel,
  CellSelectionOptions,
  CellEditorOptions,
  CellEditorService,
  ColumnFilterOptions,
  ColumnDragOptions,
  RowDragOptions,
  AIQueryOptions,
  AIQueryResolveInput,
  AIQueryResult,
  AIStreamOptions,
  AIStreamState,
  AIStreamStatus,
  AIStreamChunk,
  AIStreamConsumeOptions,
  AIColumnOptions,
  AIColumnCellState,
  AIColumnCellStatus,
  AIColumnComputeContext,
} from '@virt-table/vanilla/plugins';
export type {
  DataRequest,
  DataResponse,
  LoadMoreContext,
  RemoteState,
  RemoteReason,
  RemoteChannel,
  RemoteQuery,
} from '@virt-table/vanilla';
export type {
  FilterModel,
  FilterNode,
  FilterGroup,
  FilterCondition,
  FilterOperator,
  FilterValueKind,
} from '@virt-table/vanilla';
export type {
  VtFilterBuilderOptions,
  VtFilterBuilderTexts,
} from '@virt-table/vanilla/components';

export interface ReactTableColumn<T = Record<string, unknown>>
  extends Omit<
    VirtTableColumn<T>,
    'render' | 'renderHeader' | 'renderEditor' | 'renderExpandRow' | 'renderFooter' | 'children'
  > {
  render?: (ctx: CellRenderContext<T>) => React.ReactNode | string | HTMLElement;
  renderHeader?: (ctx: HeaderRenderContext<T>) => React.ReactNode | string | HTMLElement;
  renderEditor?: (ctx: CellEditContext<T>) => React.ReactNode | HTMLElement | null | void;
  renderExpandRow?: (ctx: ExpandRenderContext<T>) => React.ReactNode | string | HTMLElement;
  renderFooter?: (ctx: FooterRenderContext<T>) => React.ReactNode | string | HTMLElement;
  /** 子列：配置它即成为多级分组表头的分组节点（数据列写在叶子上） */
  children?: ReactTableColumn<T>[];
}

type MountReactFn = (mountKey: string, node: React.ReactNode, el: HTMLElement) => void;
type SetEditForceRenderFn = (fn: (() => void) | null) => void;
type CleanupEditElFn = (el: HTMLElement) => void;

/**
 * 把返回 JSX 的 render 包装成核心要的 `string | HTMLElement`。
 *
 * 列级 `col.render` 与单元格级 `setCellRender()` 共用这一份 —— 单元格级以前完全没有
 * 这层包装（使用方只能去写行数据 `_cellRenders`，返回 JSX 直接失败），补齐时如果再复制
 * 一份包装逻辑，就又回到了「同一件事两处实现」的老问题。
 *
 * `mountKey` 前缀区分挂载点：`r:` 列级、`c:` 单元格级，避免同一格的两级互相顶掉。
 */
function wrapRender<T extends Record<string, unknown>>(
  userRender: (ctx: CellRenderContext<T>) => React.ReactNode | HTMLElement,
  colKey: string,
  mountReact: MountReactFn,
  keyPrefix: 'r' | 'c',
): (ctx: CellRenderContext<T>) => string | HTMLElement {
  return (ctx) => {
    const result = userRender(ctx);
    if (typeof result === 'string') return result;
    if (result instanceof HTMLElement) return result;
    const el = document.createElement('div');
    el.style.display = 'contents';
    mountReact(`${keyPrefix}:${ctx.rowIndex}:${colKey}`, result as React.ReactNode, el);
    return el;
  };
}

/** 同上，编辑器版：多了「值变化后强制重渲染」与复用浮层前的 React root 清理 */
function wrapRenderEditor<T extends Record<string, unknown>>(
  userRenderEditor: (ctx: CellEditContext<T>) => React.ReactNode | HTMLElement | null | void,
  colKey: string,
  mountReact: MountReactFn,
  setEditForceRender: SetEditForceRenderFn,
  cleanupEditEl: CleanupEditElFn,
  keyPrefix: 'e' | 'ce',
): (ctx: CellEditContext<T>) => HTMLElement | null | void {
  return (ctx) => {
    const result = userRenderEditor(ctx);
    if (result === null) return null;
    if (result instanceof HTMLElement) return result;

    // 核心会复用 _coverOverlayEl 并用 innerHTML='' 清空，绕过了 React 的卸载
    cleanupEditEl(ctx.el);

    function EditWrapper() {
      const [, dispatch] = React.useReducer((x: number) => x + 1, 0);
      React.useEffect(() => {
        setEditForceRender(dispatch);
        return () => setEditForceRender(null);
      }, []);
      const freshValue = ctx.row[colKey as keyof T];
      const editResult = userRenderEditor({ ...ctx, value: freshValue });
      if (editResult === null || editResult === undefined) return null;
      if (editResult instanceof HTMLElement) return null;
      return React.createElement(React.Fragment, null, editResult);
    }

    mountReact(`${keyPrefix}:${ctx.rowIndex}:${colKey}`, React.createElement(EditWrapper), ctx.el);
  };
}

/** React 侧的单元格级渲染配置：render / renderEditor 可以直接返回 JSX */
export interface ReactCellRenderConfig<T extends Record<string, unknown> = any> {
  render?: (ctx: CellRenderContext<T>) => React.ReactNode | HTMLElement;
  /** 这一格的内容类型，与列上的 `cellType` 同义；不经包装，原样交给核心 */
  cellType?: CellContentType;
  renderEditor?: (ctx: CellEditContext<T>) => React.ReactNode | HTMLElement | null | void;
}

/** 把一份单元格级配置里的两个 render 都套上 VNode → DOM 的包装 */
function wrapCellConfig<T extends Record<string, unknown>>(
  config: ReactCellRenderConfig<T>,
  colKey: string,
  mountReact: MountReactFn,
  setEditForceRender: SetEditForceRenderFn,
  cleanupEditEl: CleanupEditElFn,
): CellRenderConfig<T> {
  return {
    render: config.render
      ? wrapRender(config.render, colKey, mountReact, 'c')
      : undefined,
    // 内容类型没有 VNode 可包，直接透传 —— 漏了它这里就会静默吃掉整个 cellType 配置
    cellType: config.cellType,
    renderEditor: config.renderEditor
      ? wrapRenderEditor(config.renderEditor, colKey, mountReact, setEditForceRender, cleanupEditEl, 'ce')
      : undefined,
  };
}

function convertColumns<T extends Record<string, unknown>>(
  columns: ReactTableColumn<T>[],
  mountReact: MountReactFn,
  setEditForceRender: SetEditForceRenderFn,
  cleanupEditEl: CleanupEditElFn,
  itemKey: string,
): VirtTableColumn<T>[] {
  return columns.map((col) => {
    const {
      render: _r,
      renderHeader: _rh,
      renderEditor: _re,
      renderExpandRow: _er,
      renderFooter: _rf,
      children: _ch,
      ...baseCol
    } = col;
    const jsCol = baseCol as VirtTableColumn<T>;
    const colKey = col.key;

    // 多级分组表头：递归转换子列（分组节点只需要 title/renderHeader）
    if (col.children && col.children.length > 0) {
      jsCol.children = convertColumns(
        col.children,
        mountReact,
        setEditForceRender,
        cleanupEditEl,
        itemKey,
      );
    }

    if (col.render) {
      jsCol.render = wrapRender(col.render, colKey, mountReact, 'r');
    }

    if (col.renderHeader) {
      const userHeaderRender = col.renderHeader;
      jsCol.renderHeader = (ctx: HeaderRenderContext<T>): string | HTMLElement => {
        const result = userHeaderRender(ctx);
        if (typeof result === 'string') return result;
        if (result instanceof HTMLElement) return result;
        const el = document.createElement('div');
        el.style.display = 'contents';
        mountReact(`h:${colKey}`, result as React.ReactNode, el);
        return el;
      };
    }

    if (col.renderEditor) {
      jsCol.renderEditor = wrapRenderEditor(
        col.renderEditor, colKey, mountReact, setEditForceRender, cleanupEditEl, 'e',
      );
    }

    if (col.renderFooter) {
      const userFooterRender = col.renderFooter;
      jsCol.renderFooter = (ctx: FooterRenderContext<T>): string | HTMLElement => {
        const result = userFooterRender(ctx);
        if (typeof result === 'string') return result;
        if (result instanceof HTMLElement) return result;
        const el = document.createElement('div');
        el.style.display = 'contents';
        mountReact(`f:${ctx.footerRow}:${colKey}`, result as React.ReactNode, el);
        return el;
      };
    }

    if (col.renderExpandRow) {
      const userExpandRender = col.renderExpandRow;
      jsCol.renderExpandRow = (ctx: ExpandRenderContext<T>): string | HTMLElement => {
        const result = userExpandRender(ctx);
        if (typeof result === 'string') return result;
        if (result instanceof HTMLElement) return result;
        const rowId = String((ctx.row as Record<string, unknown>)[itemKey] ?? '');
        const el = document.createElement('div');
        el.style.display = 'contents';
        mountReact(`x:${rowId}:${colKey}`, result as React.ReactNode, el);
        return el;
      };
    }

    return jsCol;
  });
}

export interface VirtTableRef extends VirtTablePluginApi {
  getTable: () => VirtTable<Record<string, unknown>> | null;
  scrollToIndex: (index: number) => void;
  scrollIntoView: (index: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  scrollToOffset: (offset: number) => void;
  scrollToCell: (row: number, col: number) => void;
  reset: () => void;
  setList: (list: Record<string, unknown>[]) => void;
  /** 单元格级渲染：render / renderEditor 可直接返回 JSX（适配层负责挂载与回收） */
  setCellRender: (rowKey: string, colKey: string, config: ReactCellRenderConfig | null) => void;
  /** 批量版，整批写完只刷新一次 */
  setCellRenders: (
    entries: Array<{ rowKey: string; colKey: string; config: ReactCellRenderConfig | null }>,
  ) => void;
  setColumns: (columns: ReactTableColumn[]) => void;
  setMerges: (merges: MergeCell[]) => void;
  getMerges: () => MergeCell[] | undefined;
  getEffectiveMerges: (rowBegin?: number, rowEnd?: number) => MergeCell[] | undefined;
  setHeaderMerges: (merges: MergeCell[], headerData?: string[][]) => void;
  setFooterData: (data: string[][], merges?: MergeCell[]) => void;
  forceUpdate: () => void;
  getCheckedRows: () => Record<string, unknown>[] | undefined;
  getCheckedKeys: () => string[] | undefined;
  /** 激活态（当前单元格描边）。传 null 清除；与 `highlightSelectCell` 同一份状态 */
  setActiveCell: (rowKey: string | null, colKey: string | null) => void;
  getActiveCell: () => { rowKey: string; colKey: string } | null | undefined;
  getState: () => VirtTableState | undefined;
  setState: (state: VirtTableState | null | undefined) => boolean | undefined;
  setCheckedRows: (keys: string[]) => void;
  clearCheckedRows: () => void;
  toggleExpand: (rowKey: string) => void;
  toggleFold: (rowKey: string) => void;
  /** 该树 / 分组节点是否折叠（叶子行恒为 false） */
  isFolded: (rowKey: string) => boolean | undefined;
  expandAll: () => void;
  collapseAll: () => void;
  setColumnFilter: (key: string, vals: unknown[]) => void;
  clearAllFilters: () => void;
  getActiveFilters: () => Record<string, unknown[]> | undefined;
  setFilterModel: (model: FilterModel) => void;
  getFilterModel: () => FilterModel | undefined;
  clearFilterModel: () => void;
  hasActiveFilters: () => boolean | undefined;
  sort: (colKey: string, order: SortOrder | null) => void;
  clearSort: () => void;
  getSortState: () => SortSpec[] | undefined;
  setLoading: (loading: boolean) => void;
  getSelectedRadio: () => Record<string, unknown> | null | undefined;
  setSelectedRadio: (rowKey: string | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLocale: (locale: DeepPartial<VirtTableLocale>) => void;
  getLocale: () => VirtTableLocale | undefined;
  validateAll: () => Array<{ row: Record<string, unknown>; colKey: string; message: string }> | undefined;
  setColumnVisible: (colKey: string, visible: boolean) => void;
  getVisibleColumns: () => ReactTableColumn[] | undefined;
  getLeafColumns: () => ReactTableColumn[] | undefined;
  getHeaderDepth: () => number | undefined;
  setPinnedRows: (top?: Record<string, unknown>[], bottom?: Record<string, unknown>[]) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setTotal: (total: number) => void;
  getPagination: () => { page: number; pageSize: number; total: number } | undefined;
  // 服务端数据 / 无限滚动
  reload: () => void;
  refresh: () => void;
  loadMore: () => void;
  loadPrev: () => void;
  retryLoad: () => void;
  getRemoteState: () => RemoteState | null | undefined;
  setLoadData: (
    loadData: (req: DataRequest) => Promise<DataResponse<Record<string, unknown>>> | DataResponse<Record<string, unknown>>,
  ) => void;
  appendRows: (rows: Record<string, unknown>[]) => void;
  prependRows: (rows: Record<string, unknown>[]) => void;
  setHasMore: (hasMore: boolean, direction?: 'down' | 'up') => void;
  setCursor: (cursor: string | null, direction?: 'down' | 'up') => void;
  // 树形子节点懒加载
  loadChildrenFor: (rowKey: string) => void;
  resetLazyNode: (rowKey: string, clearChildren?: boolean) => void;
}

/**
 * 让 ref 自动透出插件注入的命令式 API：显式声明的方法优先，其余属性回落到
 * `table.getPluginApi()`。
 *
 * 用 Proxy 而不是在这里枚举 key，是因为 useImperativeHandle 的工厂在表格实例
 * 创建（useEffect）之前就跑了——那一刻插件还没装载，枚举必然得到空集。
 */
function withPluginApi<H extends object>(
  tableRef: React.RefObject<VirtTable<Record<string, unknown>> | null>,
  handle: H,
): H & VirtTablePluginApi {
  return new Proxy(handle, {
    get(target, prop, receiver) {
      if (Reflect.has(target, prop)) return Reflect.get(target, prop, receiver);
      const fn = tableRef.current?.getPluginApi()[prop as string];
      return typeof fn === 'function' ? fn : undefined;
    },
    has(target, prop) {
      if (Reflect.has(target, prop)) return true;
      return typeof tableRef.current?.getPluginApi()[prop as string] === 'function';
    },
  }) as H & VirtTablePluginApi;
}

/**
 * 组件 options 类型。
 *
 * `plugins` 单独放宽成 `VirtTablePlugin<any>[]`：插件的 `setup(ctx)` 把行类型放在
 * **逆变位置**，若沿用 `Record<string, unknown>`，用户写 `vtContextMenu<Row>(fn)`
 * 会赋值失败。与 `columns: ReactTableColumn<any>[]` 同理。
 */
export type VirtTableComponentOptions = Omit<
  VirtTableOptions<Record<string, unknown>>,
  'columns' | 'plugins'
> & { plugins?: VirtTablePlugin<any>[] };

export interface VirtTableProps {
  columns: ReactTableColumn<any>[];
  options: VirtTableComponentOptions;
  style?: React.CSSProperties;
  className?: string;
}

export const VirtTableReact = React.forwardRef<VirtTableRef, VirtTableProps>(
  function VirtTableReact(props, ref) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const tableRef = React.useRef<VirtTable<Record<string, unknown>> | null>(null);
    const reactMountsRef = React.useRef(new Map<string, { root: Root; el: HTMLElement }>());
    const editForceRenderRef = React.useRef<(() => void) | null>(null);
    // 表格只在 mount 时创建一次，因此取数回调不能直接交给它（会闭包捕获首屏的 state）。
    // 这里始终指向最新一次渲染的 options，建表时传入的是读 ref 的稳定包装函数：
    // 用户无需 useCallback，函数身份变化也不会重建表格或触发重新取数。
    const optionsRef = React.useRef(props.options);
    optionsRef.current = props.options;

    function setEditForceRender(fn: (() => void) | null): void {
      editForceRenderRef.current = fn;
    }

    function mountReact(mountKey: string, node: React.ReactNode, el: HTMLElement): void {
      const mounts = reactMountsRef.current;
      const old = mounts.get(mountKey);
      if (old) {
        queueMicrotask(() => old.root.unmount());
      }
      const root = createRoot(el);
      queueMicrotask(() => flushSync(() => root.render(node)));
      mounts.set(mountKey, { root, el });
    }

    function cleanupRowMounts(tr: HTMLElement): void {
      const mounts = reactMountsRef.current;
      for (const [key, { root, el }] of mounts) {
        if (tr.contains(el)) {
          root.unmount();
          mounts.delete(key);
        }
      }
    }

    function cleanupEditEl(el: HTMLElement): void {
      const mounts = reactMountsRef.current;
      for (const [key, entry] of mounts) {
        if (entry.el === el) {
          entry.root.unmount();
          mounts.delete(key);
        }
      }
    }

    React.useImperativeHandle(ref, () => withPluginApi(tableRef, {
      getTable: () => tableRef.current,
      scrollToIndex: (index: number) => tableRef.current?.scrollToIndex(index),
      scrollIntoView: (index: number) => tableRef.current?.scrollIntoView(index),
      scrollToTop: () => tableRef.current?.scrollToTop(),
      scrollToBottom: () => tableRef.current?.scrollToBottom(),
      scrollToOffset: (offset: number) => tableRef.current?.scrollToOffset(offset),
      scrollToCell: (row: number, col: number) => tableRef.current?.scrollToCell(row, col),
      /**
       * 单元格级渲染：把 JSX 返回值包装成核心要的 DOM，并接上行回收时的 React 卸载。
       * 不覆写的话 Proxy 会把调用直接透给 vanilla，使用方返回的 JSX 到不了 DOM。
       */
      setCellRender: (
        rowKey: string,
        colKey: string,
        config: ReactCellRenderConfig | null,
      ) => tableRef.current?.setCellRender(
        rowKey, colKey, config && wrapCellConfig(config, colKey, mountReact, setEditForceRender, cleanupEditEl),
      ),
      setCellRenders: (
        entries: Array<{ rowKey: string; colKey: string; config: ReactCellRenderConfig | null }>,
      ) => tableRef.current?.setCellRenders(
        entries.map((e) => ({
          ...e,
          config: e.config && wrapCellConfig(e.config, e.colKey, mountReact, setEditForceRender, cleanupEditEl),
        })),
      ),
      reset: () => tableRef.current?.reset(),
      setList: (list: Record<string, unknown>[]) => tableRef.current?.setList(list),
      setColumns: (columns: ReactTableColumn[]) => {
        if (tableRef.current) {
          tableRef.current.setColumns(
            convertColumns(columns, mountReact, setEditForceRender, cleanupEditEl, props.options.itemKey ?? 'id'),
          );
        }
      },
      setMerges: (merges: MergeCell[]) => tableRef.current?.setMerges(merges),
      getMerges: () => tableRef.current?.getMerges(),
      getEffectiveMerges: (rowBegin?: number, rowEnd?: number) =>
        tableRef.current?.getEffectiveMerges(rowBegin, rowEnd),
      setHeaderMerges: (merges: MergeCell[], headerData?: string[][]) => tableRef.current?.setHeaderMerges(merges, headerData),
      setFooterData: (data: string[][], merges?: MergeCell[]) => tableRef.current?.setFooterData(data, merges),
      forceUpdate: () => {
        editForceRenderRef.current?.();
        tableRef.current?.forceUpdate();
      },
      getCheckedRows: () => tableRef.current?.getCheckedRows(),
      getCheckedKeys: () => tableRef.current?.getCheckedKeys(),
      setActiveCell: (rowKey: string | null, colKey: string | null) =>
        tableRef.current?.setActiveCell(rowKey, colKey),
      getActiveCell: () => tableRef.current?.getActiveCell(),
      getState: () => tableRef.current?.getState(),
      setState: (state: VirtTableState | null | undefined) => tableRef.current?.setState(state),
      setCheckedRows: (keys: string[]) => tableRef.current?.setCheckedRows(keys),
      clearCheckedRows: () => tableRef.current?.clearCheckedRows(),
      toggleExpand: (rowKey: string) => tableRef.current?.toggleExpand(rowKey),
      toggleFold: (rowKey: string) => tableRef.current?.toggleFold(rowKey),
      isFolded: (rowKey: string) => tableRef.current?.isFolded(rowKey),
      expandAll: () => tableRef.current?.expandAll(),
      collapseAll: () => tableRef.current?.collapseAll(),
      setColumnFilter: (key: string, vals: unknown[]) => tableRef.current?.setColumnFilter(key, vals),
      clearAllFilters: () => tableRef.current?.clearAllFilters(),
      getActiveFilters: () => tableRef.current?.getActiveFilters(),
      setFilterModel: (model: FilterModel) => tableRef.current?.setFilterModel(model),
      getFilterModel: () => tableRef.current?.getFilterModel(),
      clearFilterModel: () => tableRef.current?.clearFilterModel(),
      hasActiveFilters: () => tableRef.current?.hasActiveFilters(),
      // hideContextMenu 等插件 API 不在这里转发：withPluginApi 的 Proxy 会自动回落到
      // table.getPluginApi()，类型由 VirtTablePluginApi 声明。
      sort: (colKey: string, order: SortOrder | null) => tableRef.current?.sort(colKey, order),
      clearSort: () => tableRef.current?.clearSort(),
      getSortState: () => tableRef.current?.getSortState(),
      setLoading: (loading: boolean) => tableRef.current?.setLoading(loading),
      getSelectedRadio: () => tableRef.current?.getSelectedRadio(),
      setSelectedRadio: (rowKey: string | null) => tableRef.current?.setSelectedRadio(rowKey),
      setTheme: (theme: 'light' | 'dark') => tableRef.current?.setTheme(theme),
      setLocale: (locale: DeepPartial<VirtTableLocale>) => tableRef.current?.setLocale(locale),
      getLocale: () => tableRef.current?.getLocale(),
      validateAll: () => tableRef.current?.validateAll(),
      setColumnVisible: (colKey: string, visible: boolean) => tableRef.current?.setColumnVisible(colKey, visible),
      getVisibleColumns: () => tableRef.current?.getVisibleColumns() as ReactTableColumn[] | undefined,
      getLeafColumns: () => tableRef.current?.getLeafColumns() as ReactTableColumn[] | undefined,
      getHeaderDepth: () => tableRef.current?.getHeaderDepth(),
      setPinnedRows: (top?: Record<string, unknown>[], bottom?: Record<string, unknown>[]) => tableRef.current?.setPinnedRows(top, bottom),
      setPage: (page: number) => tableRef.current?.setPage(page),
      setPageSize: (pageSize: number) => tableRef.current?.setPageSize(pageSize),
      setTotal: (total: number) => tableRef.current?.setTotal(total),
      getPagination: () => tableRef.current?.getPagination(),
      reload: () => tableRef.current?.reload(),
      refresh: () => tableRef.current?.refresh(),
      loadMore: () => tableRef.current?.loadMore(),
      loadPrev: () => tableRef.current?.loadPrev(),
      retryLoad: () => tableRef.current?.retryLoad(),
      getRemoteState: () => tableRef.current?.getRemoteState(),
      setLoadData: (loadData) => tableRef.current?.setLoadData(loadData),
      appendRows: (rows: Record<string, unknown>[]) => tableRef.current?.appendRows(rows),
      prependRows: (rows: Record<string, unknown>[]) => tableRef.current?.prependRows(rows),
      setHasMore: (hasMore: boolean, direction?: 'down' | 'up') =>
        tableRef.current?.setHasMore(hasMore, direction),
      setCursor: (cursor: string | null, direction?: 'down' | 'up') =>
        tableRef.current?.setCursor(cursor, direction),
      loadChildrenFor: (rowKey: string) => tableRef.current?.loadChildrenFor(rowKey),
      resetLazyNode: (rowKey: string, clearChildren?: boolean) =>
        tableRef.current?.resetLazyNode(rowKey, clearChildren),
    }));

    React.useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const jsColumns = convertColumns(props.columns, mountReact, setEditForceRender, cleanupEditEl, props.options.itemKey ?? 'id');

      // 取数相关回调走 optionsRef，避免 stale closure；是否启用由首屏是否提供决定
      const o = props.options;
      const table = new VirtTable(container, {
        ...o,
        columns: jsColumns,
        loadData: o.loadData ? (req) => optionsRef.current.loadData!(req) : undefined,
        onLoadMore: o.onLoadMore ? (ctx) => optionsRef.current.onLoadMore!(ctx) : undefined,
        onLoadPrev: o.onLoadPrev ? (ctx) => optionsRef.current.onLoadPrev!(ctx) : undefined,
        onLoad: o.onLoad ? (res, req) => optionsRef.current.onLoad!(res, req) : undefined,
        onLoadError: o.onLoadError ? (err, req) => optionsRef.current.onLoadError!(err, req) : undefined,
        onRemoteStateChange: o.onRemoteStateChange
          ? (state) => optionsRef.current.onRemoteStateChange!(state)
          : undefined,
        loadChildren: o.loadChildren
          ? (row, ctx) => optionsRef.current.loadChildren!(row, ctx)
          : undefined,
        onRowRemoved: (tr) => {
          cleanupRowMounts(tr);
          optionsRef.current.onRowRemoved?.(tr);
        },
      });

      tableRef.current = table;

      return () => {
        table.destroy();
        tableRef.current = null;
        const mounts = reactMountsRef.current;
        const roots = [...mounts.values()].map((m) => m.root);
        mounts.clear();
        /*
         * 子 root 的卸载必须**延后到微任务**。
         *
         * 这个 cleanup 跑在 React 的 commit 阶段，同步 `root.unmount()` 会撞上
         * 「Attempted to synchronously unmount a root while React was already rendering」——
         * 只要使用方用 `key` 重挂载 `<VirtTableReact>`（换数据源、换表级 cellType、换主题都
         * 是这么写的）就必然触发。`mountReact` 里替换旧挂载点时早就这么处理了，这里漏了一处。
         */
        queueMicrotask(() => {
          for (const root of roots) root.unmount();
        });
      };
    }, []);

    React.useEffect(() => {
      if (!tableRef.current || !props.options.list) return;
      // 数据由表格远程累积时（给了 loadData / onLoadMore）不接管 list：
      // `options={{ list: [] }}` 这种内联字面量每次渲染都是新引用，若照常 setList
      // 会把刚追加进来的数据清空。远程模式下 list 只作为初始值使用。
      if (props.options.loadData || props.options.onLoadMore) return;
      tableRef.current.setList(props.options.list);
    }, [props.options.list, props.options.loadData, props.options.onLoadMore]);

    React.useEffect(() => {
      tableRef.current?.setLoading(!!props.options.loading);
    }, [props.options.loading]);

    return React.createElement('div', {
      ref: containerRef,
      style: { width: '100%', height: '100%', ...props.style },
      className: props.className,
    });
  },
);

export {
  VirtFilterBuilderReact,
  type VirtFilterBuilderProps,
  type VirtFilterBuilderHandle,
} from './filter-builder';

export default VirtTableReact;
