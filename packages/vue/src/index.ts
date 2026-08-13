import {
  defineComponent,
  h,
  Fragment,
  ref,
  shallowRef,
  onMounted,
  onBeforeUnmount,
  watch,
  render as vueRender,
  type PropType,
  type ShallowRef,
  type VNode,
} from 'vue';
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
  type FilterModel,
  type VirtTableLocale,
  type DeepPartial,
  type VirtTablePlugin,
  type VirtTablePluginApi,
  type VirtTableState,
} from '@virt-table/vanilla';

export type { VirtTableOptions, VirtTableColumn, MergeCell, CellRenderConfig, CellContentType, VirtTableRowExtras, CellRenderContext, CellEditContext, HeaderRenderContext, ExpandRenderContext, FooterRenderContext, SortOrder, SortSpec, FilterType, VirtTableLocale } from '@virt-table/vanilla';
export type { ExportOptions } from '@virt-table/vanilla/plugins';
export { zhCN, enUS } from '@virt-table/vanilla';
export type { VirtTableState, VirtTableColumnState } from '@virt-table/vanilla';
// 插件机制：插件本身与框架无关，直接透传 vanilla 的实现与类型
export {
  vtContextMenu,
  vtExport,
  vtClipboard,
  vtSearch,
  vtColumnPanel,
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
  ColumnPanelOptions,
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
  FilterModel,
  FilterNode,
  FilterGroup,
  FilterCondition,
  FilterOperator,
  FilterValueKind,
  DataRequest,
  DataResponse,
  LoadMoreContext,
  RemoteState,
  RemoteReason,
  RemoteChannel,
  RemoteQuery,
} from '@virt-table/vanilla';
export type {
  VtFilterBuilderOptions,
  VtFilterBuilderTexts,
} from '@virt-table/vanilla/components';

/**
 * 组件 options 类型。
 *
 * `plugins` 单独放宽成 `VirtTablePlugin<any>[]`：插件的 `setup(ctx)` 把行类型放在
 * **逆变位置**，若沿用 `Record<string, unknown>`，用户写 `vtContextMenu<Row>(fn)`
 * 会赋值失败。与 `VueTableColumn` 在 App 里用 `any` 同理。
 */
export type VirtTableComponentOptions = Omit<
  VirtTableOptions<Record<string, unknown>>,
  'columns' | 'plugins'
> & { plugins?: VirtTablePlugin<any>[] };

export interface VueTableColumn<T = Record<string, unknown>>
  extends Omit<
    VirtTableColumn<T>,
    'render' | 'renderHeader' | 'renderEditor' | 'renderExpandRow' | 'renderFooter' | 'children'
  > {
  render?: (ctx: CellRenderContext<T>) => VNode | string | HTMLElement;
  renderHeader?: (ctx: HeaderRenderContext<T>) => VNode | string | HTMLElement;
  renderEditor?: (ctx: CellEditContext<T>) => VNode | HTMLElement | null | void;
  renderExpandRow?: (ctx: ExpandRenderContext<T>) => VNode | string | HTMLElement;
  renderFooter?: (ctx: FooterRenderContext<T>) => VNode | string | HTMLElement;
  /** 子列：配置它即成为多级分组表头的分组节点（数据列写在叶子上） */
  children?: VueTableColumn<T>[];
}

type MountSlotFn = (mountKey: string, vNodes: VNode[], el: HTMLElement) => void;
type SetEditTriggerFn = (trigger: ShallowRef<number>) => void;
type CleanupEditElFn = (el: HTMLElement) => void;

/** Vue 侧的单元格级渲染配置：render / renderEditor 可以直接返回 VNode */
export interface VueCellRenderConfig<T extends Record<string, unknown> = any> {
  render?: (ctx: CellRenderContext<T>) => VNode | HTMLElement | string;
  /** 这一格的内容类型，与列上的 `cellType` 同义；不经包装，原样交给核心 */
  cellType?: CellContentType;
  renderEditor?: (ctx: CellEditContext<T>) => VNode | HTMLElement | null | void;
}

/**
 * 把返回 VNode 的 render 包装成核心要的 `string | HTMLElement`。
 *
 * 列级 `col.render` 与单元格级 `setCellRender()` 共用这一份 —— 单元格级以前没有这层
 * 包装（只能去写行数据 `_cellRenders`，返回 VNode 直接失败）。`mountKey` 前缀区分挂载点：
 * `r:` 列级、`c:` 单元格级。
 */
function wrapRender<T extends Record<string, unknown>>(
  userRender: (ctx: CellRenderContext<T>) => VNode | HTMLElement | string,
  colKey: string,
  mountSlot: MountSlotFn,
  keyPrefix: 'r' | 'c',
): (ctx: CellRenderContext<T>) => string | HTMLElement {
  return (ctx) => {
    const result = userRender(ctx);
    if (typeof result === 'string') return result;
    if (result instanceof HTMLElement) return result;
    const el = document.createElement('div');
    mountSlot(`${keyPrefix}:${ctx.rowIndex}:${colKey}`, [result], el);
    return el;
  };
}

/** 同上，编辑器版：多了值变化触发重渲染与复用浮层前的 Vue 卸载 */
function wrapRenderEditor<T extends Record<string, unknown>>(
  userRenderEditor: (ctx: CellEditContext<T>) => VNode | HTMLElement | null | void,
  colKey: string,
  mountSlot: MountSlotFn,
  setEditTrigger: SetEditTriggerFn,
  cleanupEditEl: CleanupEditElFn,
  keyPrefix: 'e' | 'ce',
): (ctx: CellEditContext<T>) => HTMLElement | void {
  return (ctx) => {
    const result = userRenderEditor(ctx);
    if (result === null) return;
    if (result instanceof HTMLElement) return result;

    // 核心会复用 _coverOverlayEl 并用 innerHTML='' 清空，绕过 Vue 卸载会留下失效的 _vnode
    cleanupEditEl(ctx.el);

    const trigger = shallowRef(0);
    setEditTrigger(trigger);

    const EditWrapper = defineComponent({
      setup() {
        return () => {
          trigger.value;
          const freshValue = ctx.row[colKey as keyof T];
          return userRenderEditor({ ...ctx, value: freshValue });
        };
      },
    });

    mountSlot(`${keyPrefix}:${ctx.rowIndex}:${colKey}`, [h(EditWrapper)], ctx.el);
  };
}

/** 把一份单元格级配置里的两个 render 都套上 VNode → DOM 的包装 */
function wrapCellConfig<T extends Record<string, unknown>>(
  config: VueCellRenderConfig<T>,
  colKey: string,
  mountSlot: MountSlotFn,
  setEditTrigger: SetEditTriggerFn,
  cleanupEditEl: CleanupEditElFn,
): CellRenderConfig<T> {
  return {
    render: config.render ? wrapRender(config.render, colKey, mountSlot, 'c') : undefined,
    // 内容类型没有 VNode 可包，直接透传 —— 漏了它这里就会静默吃掉整个 cellType 配置
    cellType: config.cellType,
    renderEditor: config.renderEditor
      ? wrapRenderEditor(config.renderEditor, colKey, mountSlot, setEditTrigger, cleanupEditEl, 'ce')
      : undefined,
  };
}

function convertColumns<T extends Record<string, unknown>>(
  columns: VueTableColumn<T>[],
  mountSlot: MountSlotFn,
  setEditTrigger: SetEditTriggerFn,
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
      jsCol.children = convertColumns(col.children, mountSlot, setEditTrigger, cleanupEditEl, itemKey);
    }

    if (col.render) {
      jsCol.render = wrapRender(col.render, colKey, mountSlot, 'r');
    }

    if (col.renderHeader) {
      const userRenderHeader = col.renderHeader;
      jsCol.renderHeader = (ctx: HeaderRenderContext<T>): string | HTMLElement => {
        const result = userRenderHeader(ctx);
        if (typeof result === 'string') return result;
        if (result instanceof HTMLElement) return result;
        const el = document.createElement('div');
        mountSlot(`h:${colKey}`, [result], el);
        return el;
      };
    }

    if (col.renderEditor) {
      jsCol.renderEditor = wrapRenderEditor(
        col.renderEditor, colKey, mountSlot, setEditTrigger, cleanupEditEl, 'e',
      );
    }

    if (col.renderFooter) {
      const userRenderFooter = col.renderFooter;
      jsCol.renderFooter = (ctx: FooterRenderContext<T>): string | HTMLElement => {
        const result = userRenderFooter(ctx);
        if (typeof result === 'string') return result;
        if (result instanceof HTMLElement) return result;
        const el = document.createElement('div');
        mountSlot(`f:${ctx.footerRow}:${colKey}`, [result], el);
        return el;
      };
    }

    if (col.renderExpandRow) {
      const userRenderExpandRow = col.renderExpandRow;
      jsCol.renderExpandRow = (ctx: ExpandRenderContext<T>): string | HTMLElement => {
        const result = userRenderExpandRow(ctx);
        if (typeof result === 'string') return result;
        if (result instanceof HTMLElement) return result;
        const rowId = String((ctx.row as Record<string, unknown>)[itemKey] ?? '');
        const el = document.createElement('div');
        mountSlot(`x:${rowId}:${colKey}`, [result], el);
        return el;
      };
    }

    return jsCol;
  });
}

/**
 * 让 expose 出去的 ref 自动透出插件注入的命令式 API：显式声明的方法优先，
 * 其余属性回落到 `table.getPluginApi()`。
 *
 * 用 Proxy 而不是枚举 key，是因为 setup 阶段表格实例还没创建（建表在 onMounted），
 * 那一刻插件尚未装载，枚举必然得到空集。
 */
function withPluginApi<H extends object>(
  getTable: () => VirtTable<Record<string, unknown>> | null,
  handle: H,
): H & VirtTablePluginApi {
  return new Proxy(handle, {
    get(target, prop, receiver) {
      if (Reflect.has(target, prop)) return Reflect.get(target, prop, receiver);
      const fn = getTable()?.getPluginApi()[prop as string];
      return typeof fn === 'function' ? fn : undefined;
    },
    has(target, prop) {
      if (Reflect.has(target, prop)) return true;
      return typeof getTable()?.getPluginApi()[prop as string] === 'function';
    },
  }) as H & VirtTablePluginApi;
}

export const VirtTableVue = defineComponent({
  name: 'VirtTable',
  props: {
    columns: {
      type: Array as PropType<VueTableColumn<any>[]>,
      required: true,
    },
    options: {
      type: Object as PropType<VirtTableComponentOptions>,
      required: true,
    },
  },
  setup(props, { expose }) {
    const containerRef = ref<HTMLElement | null>(null);
    let table: VirtTable<Record<string, unknown>> | null = null;
    const _slotContainers = new Map<string, HTMLElement>();
    let _activeEditTrigger: ShallowRef<number> | null = null;

    function _setEditTrigger(trigger: ShallowRef<number>): void {
      _activeEditTrigger = trigger;
    }

    function _mountSlot(mountKey: string, vNodes: VNode[], el: HTMLElement): void {
      const old = _slotContainers.get(mountKey);
      if (old && old !== el) vueRender(null, old);
      vueRender(h(Fragment, null, vNodes), el);
      _slotContainers.set(mountKey, el);
    }

    function _cleanupRow(tr: HTMLElement): void {
      for (const [key, el] of _slotContainers) {
        if (tr.contains(el)) {
          vueRender(null, el);
          _slotContainers.delete(key);
        }
      }
    }

    function _cleanupEditEl(el: HTMLElement): void {
      // Vanilla core already destroyed the DOM via innerHTML = ''.
      // Calling vueRender(null, el) would crash because Vue tries to walk
      // the now-missing DOM tree. Instead, just reset Vue's internal vnode
      // tracking so the next render starts fresh.
      (el as any)._vnode = null;
      for (const [key, container] of _slotContainers) {
        if (container === el) {
          _slotContainers.delete(key);
        }
      }
    }

    function buildOptions(): VirtTableOptions<Record<string, unknown>> {
      const jsColumns = convertColumns(props.columns, _mountSlot, _setEditTrigger, _cleanupEditEl, props.options.itemKey ?? 'id');
      const o = props.options;
      return {
        ...o,
        columns: jsColumns,
        // 取数回调包一层读 props：options 对象被父组件整体替换后依然拿到最新实现，
        // 不会因为函数身份变化而重建表格或重新取数
        loadData: o.loadData ? (req) => props.options.loadData!(req) : undefined,
        onLoadMore: o.onLoadMore ? (ctx) => props.options.onLoadMore!(ctx) : undefined,
        onLoadPrev: o.onLoadPrev ? (ctx) => props.options.onLoadPrev!(ctx) : undefined,
        onLoad: o.onLoad ? (res, req) => props.options.onLoad!(res, req) : undefined,
        onLoadError: o.onLoadError ? (err, req) => props.options.onLoadError!(err, req) : undefined,
        onRemoteStateChange: o.onRemoteStateChange
          ? (state) => props.options.onRemoteStateChange!(state)
          : undefined,
        loadChildren: o.loadChildren
          ? (row, ctx) => props.options.loadChildren!(row, ctx)
          : undefined,
        onRowRemoved: (tr) => {
          _cleanupRow(tr);
          props.options.onRowRemoved?.(tr);
        },
      };
    }

    onMounted(() => {
      if (!containerRef.value) return;
      table = new VirtTable(containerRef.value, buildOptions());
    });

    onBeforeUnmount(() => {
      if (table) {
        table.destroy();
        table = null;
      }
      for (const [, el] of _slotContainers) {
        vueRender(null, el);
      }
      _slotContainers.clear();
    });

    watch(
      () => props.options.list,
      (newList) => {
        if (!table || !newList) return;
        // 数据由表格远程累积时（给了 loadData / onLoadMore）不接管 list：
        // 父组件重建 options 对象（含新的 `list: []` 字面量）会把已追加的数据清空。
        // 远程模式下 list 只作为初始值使用。
        if (props.options.loadData || props.options.onLoadMore) return;
        table.setList(newList);
      },
    );

    watch(
      () => props.options.loading,
      (loading) => {
        table?.setLoading(!!loading);
      },
    );

    expose(withPluginApi(() => table, {
      getTable: () => table,
      scrollToIndex: (index: number) => table?.scrollToIndex(index),
      scrollIntoView: (index: number) => table?.scrollIntoView(index),
      scrollToTop: () => table?.scrollToTop(),
      scrollToBottom: () => table?.scrollToBottom(),
      scrollToOffset: (offset: number) => table?.scrollToOffset(offset),
      scrollToCell: (row: number, col: number) => table?.scrollToCell(row, col),
      /**
       * 单元格级渲染：把 VNode 返回值包装成核心要的 DOM，并接上行回收时的 Vue 卸载。
       * 不覆写的话 Proxy 会把调用直接透给 vanilla，使用方返回的 VNode 到不了 DOM。
       */
      setCellRender: (
        rowKey: string,
        colKey: string,
        config: VueCellRenderConfig | null,
      ) => table?.setCellRender(
        rowKey, colKey, config && wrapCellConfig(config, colKey, _mountSlot, _setEditTrigger, _cleanupEditEl),
      ),
      setCellRenders: (
        entries: Array<{ rowKey: string; colKey: string; config: VueCellRenderConfig | null }>,
      ) => table?.setCellRenders(
        entries.map((e) => ({
          ...e,
          config: e.config && wrapCellConfig(e.config, e.colKey, _mountSlot, _setEditTrigger, _cleanupEditEl),
        })),
      ),
      reset: () => table?.reset(),
      setList: (list: Record<string, unknown>[]) => table?.setList(list),
      setColumns: (columns: VueTableColumn[]) => {
        if (table) table.setColumns(convertColumns(columns, _mountSlot, _setEditTrigger, _cleanupEditEl, props.options.itemKey ?? 'id'));
      },
      setMerges: (merges: MergeCell[]) => table?.setMerges(merges),
      getMerges: () => table?.getMerges(),
      getEffectiveMerges: (rowBegin?: number, rowEnd?: number) =>
        table?.getEffectiveMerges(rowBegin, rowEnd),
      setHeaderMerges: (merges: MergeCell[], headerData?: string[][]) => table?.setHeaderMerges(merges, headerData),
      setFooterData: (data: string[][], merges?: MergeCell[]) => table?.setFooterData(data, merges),
      forceUpdate: () => {
        if (_activeEditTrigger) _activeEditTrigger.value++;
        table?.forceUpdate();
      },
      getCheckedRows: () => table?.getCheckedRows(),
      getCheckedKeys: () => table?.getCheckedKeys(),
      // 激活态（当前单元格描边）。传 null 清除；与 `highlightSelectCell` 同一份状态
      setActiveCell: (rowKey: string | null, colKey: string | null) =>
        table?.setActiveCell(rowKey, colKey),
      getActiveCell: () => table?.getActiveCell(),
      getState: () => table?.getState(),
      setState: (state: VirtTableState | null | undefined) => table?.setState(state),
      setCheckedRows: (keys: string[]) => table?.setCheckedRows(keys),
      clearCheckedRows: () => table?.clearCheckedRows(),
      toggleExpand: (rowKey: string) => table?.toggleExpand(rowKey),
      toggleFold: (rowKey: string) => table?.toggleFold(rowKey),
      expandAll: () => table?.expandAll(),
      collapseAll: () => table?.collapseAll(),
      setColumnFilter: (key: string, vals: unknown[]) => table?.setColumnFilter(key, vals),
      clearAllFilters: () => table?.clearAllFilters(),
      getActiveFilters: () => table?.getActiveFilters(),
      setFilterModel: (model: FilterModel) => table?.setFilterModel(model),
      getFilterModel: () => table?.getFilterModel(),
      clearFilterModel: () => table?.clearFilterModel(),
      hasActiveFilters: () => table?.hasActiveFilters(),
      // hideContextMenu 等插件 API 不在这里转发：withPluginApi 的 Proxy 会自动回落到
      // table.getPluginApi()。
      sort: (colKey: string, order: SortOrder | null) => table?.sort(colKey, order),
      clearSort: () => table?.clearSort(),
      getSortState: () => table?.getSortState(),
      setLoading: (loading: boolean) => table?.setLoading(loading),
      getSelectedRadio: () => table?.getSelectedRadio(),
      setSelectedRadio: (rowKey: string | null) => table?.setSelectedRadio(rowKey),
      setTheme: (theme: 'light' | 'dark') => table?.setTheme(theme),
      setLocale: (locale: DeepPartial<VirtTableLocale>) => table?.setLocale(locale),
      getLocale: () => table?.getLocale(),
      validateAll: () => table?.validateAll(),
      setColumnVisible: (colKey: string, visible: boolean) => table?.setColumnVisible(colKey, visible),
      getVisibleColumns: () => table?.getVisibleColumns(),
      getLeafColumns: () => table?.getLeafColumns(),
      getHeaderDepth: () => table?.getHeaderDepth(),
      setPinnedRows: (top?: Record<string, unknown>[], bottom?: Record<string, unknown>[]) => table?.setPinnedRows(top, bottom),
      setPage: (page: number) => table?.setPage(page),
      setPageSize: (pageSize: number) => table?.setPageSize(pageSize),
      setTotal: (total: number) => table?.setTotal(total),
      getPagination: () => table?.getPagination(),
      // 服务端数据 / 无限滚动
      reload: () => table?.reload(),
      refresh: () => table?.refresh(),
      loadMore: () => table?.loadMore(),
      loadPrev: () => table?.loadPrev(),
      retryLoad: () => table?.retryLoad(),
      getRemoteState: () => table?.getRemoteState() ?? null,
      setLoadData: (loadData: VirtTableOptions<Record<string, unknown>>['loadData']) =>
        table?.setLoadData(loadData),
      appendRows: (rows: Record<string, unknown>[]) => table?.appendRows(rows),
      prependRows: (rows: Record<string, unknown>[]) => table?.prependRows(rows),
      setHasMore: (hasMore: boolean, direction?: 'down' | 'up') =>
        table?.setHasMore(hasMore, direction),
      setCursor: (cursor: string | null, direction?: 'down' | 'up') =>
        table?.setCursor(cursor, direction),
      // 树形子节点懒加载
      loadChildrenFor: (rowKey: string) => table?.loadChildrenFor(rowKey),
      resetLazyNode: (rowKey: string, clearChildren?: boolean) =>
        table?.resetLazyNode(rowKey, clearChildren),
    }));

    return () =>
      h('div', {
        ref: containerRef,
        style: { width: '100%', height: '100%' },
      });
  },
});

export { VirtFilterBuilderVue } from './filter-builder';

export default VirtTableVue;
